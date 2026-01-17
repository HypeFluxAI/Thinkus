package care

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/go-redis/redis/v8"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/thinkus/go-ai-care/internal/models"
)

// Config 服务配置
type Config struct {
	MongoURI      string
	MongoDB       string
	RedisURL      string
	CheckInterval time.Duration
	BatchSize     int
}

// Service AI关怀服务
type Service struct {
	config      *Config
	mongoClient *mongo.Client
	redisClient *redis.Client
	db          *mongo.Database
	rules       []models.CareRule
	rulesMu     sync.RWMutex
	stopChan    chan struct{}
	running     bool
}

// NewService 创建服务
func NewService(config *Config) *Service {
	return &Service{
		config:   config,
		rules:    models.DefaultCareRules,
		stopChan: make(chan struct{}),
	}
}

// Connect 连接数据库
func (s *Service) Connect(ctx context.Context) error {
	// 连接 MongoDB
	client, err := mongo.Connect(ctx, options.Client().ApplyURI(s.config.MongoURI))
	if err != nil {
		return fmt.Errorf("failed to connect to MongoDB: %w", err)
	}
	s.mongoClient = client
	s.db = client.Database(s.config.MongoDB)

	// 连接 Redis
	opt, err := redis.ParseURL(s.config.RedisURL)
	if err != nil {
		return fmt.Errorf("failed to parse Redis URL: %w", err)
	}
	s.redisClient = redis.NewClient(opt)

	// 测试连接
	if err := s.redisClient.Ping(ctx).Err(); err != nil {
		return fmt.Errorf("failed to connect to Redis: %w", err)
	}

	// 加载自定义规则
	if err := s.loadCustomRules(ctx); err != nil {
		log.Printf("Warning: failed to load custom rules: %v", err)
	}

	return nil
}

// Disconnect 断开连接
func (s *Service) Disconnect(ctx context.Context) error {
	s.Stop()
	if s.mongoClient != nil {
		return s.mongoClient.Disconnect(ctx)
	}
	if s.redisClient != nil {
		return s.redisClient.Close()
	}
	return nil
}

// Start 启动定时检查
func (s *Service) Start() {
	if s.running {
		return
	}
	s.running = true

	go func() {
		ticker := time.NewTicker(s.config.CheckInterval)
		defer ticker.Stop()

		// 启动时立即执行一次
		s.runCareCheck()

		for {
			select {
			case <-ticker.C:
				s.runCareCheck()
			case <-s.stopChan:
				return
			}
		}
	}()

	log.Printf("AI Care service started, checking every %v", s.config.CheckInterval)
}

// Stop 停止服务
func (s *Service) Stop() {
	if s.running {
		close(s.stopChan)
		s.running = false
	}
}

// runCareCheck 执行关怀检查
func (s *Service) runCareCheck() {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	log.Println("Running care check...")

	// 获取需要检查的用户
	users, err := s.getUsersToCheck(ctx)
	if err != nil {
		log.Printf("Error getting users to check: %v", err)
		return
	}

	log.Printf("Found %d users to check", len(users))

	// 对每个用户检查规则
	for _, user := range users {
		if err := s.checkUserRules(ctx, &user); err != nil {
			log.Printf("Error checking rules for user %s: %v", user.UserID, err)
		}
	}
}

// getUsersToCheck 获取需要检查的用户
func (s *Service) getUsersToCheck(ctx context.Context) ([]models.UserActivity, error) {
	collection := s.db.Collection("user_activities")

	// 获取最近活跃或有风险的用户
	filter := bson.M{
		"$or": []bson.M{
			{"updated_at": bson.M{"$gte": time.Now().Add(-24 * time.Hour)}},
			{"churn_risk": bson.M{"$gte": 0.5}},
			{"days_since_active": bson.M{"$gte": 3}},
		},
	}

	opts := options.Find().SetLimit(int64(s.config.BatchSize))
	cursor, err := collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var users []models.UserActivity
	if err := cursor.All(ctx, &users); err != nil {
		return nil, err
	}

	return users, nil
}

// checkUserRules 检查用户规则
func (s *Service) checkUserRules(ctx context.Context, user *models.UserActivity) error {
	s.rulesMu.RLock()
	rules := s.rules
	s.rulesMu.RUnlock()

	for _, rule := range rules {
		if !rule.Enabled {
			continue
		}

		// 检查冷却时间
		if s.isInCooldown(ctx, user.UserID, rule.ID) {
			continue
		}

		// 检查条件
		if s.checkConditions(user, rule.Conditions) {
			// 执行动作
			if err := s.executeActions(ctx, user, &rule); err != nil {
				log.Printf("Error executing actions for rule %s: %v", rule.ID, err)
				continue
			}

			// 设置冷却时间
			s.setCooldown(ctx, user.UserID, rule.ID, rule.Cooldown)
		}
	}

	return nil
}

// checkConditions 检查条件
func (s *Service) checkConditions(user *models.UserActivity, conditions []models.CareCondition) bool {
	for _, cond := range conditions {
		if !s.checkCondition(user, cond) {
			return false
		}
	}
	return true
}

// checkCondition 检查单个条件
func (s *Service) checkCondition(user *models.UserActivity, cond models.CareCondition) bool {
	var fieldValue interface{}

	switch cond.Field {
	case "days_since_active":
		fieldValue = user.DaysSinceActive
	case "login_count_7d":
		fieldValue = user.LoginCount7d
	case "action_count_7d":
		fieldValue = user.ActionCount7d
	case "churn_risk":
		fieldValue = user.ChurnRisk
	case "activity_level":
		fieldValue = string(user.ActivityLevel)
	case "stuck_points":
		return len(user.StuckPoints) > 0
	default:
		return false
	}

	// 比较
	switch cond.Operator {
	case "eq":
		return fieldValue == cond.Value
	case "gt":
		return compareNumeric(fieldValue, cond.Value) > 0
	case "lt":
		return compareNumeric(fieldValue, cond.Value) < 0
	case "gte":
		return compareNumeric(fieldValue, cond.Value) >= 0
	case "lte":
		return compareNumeric(fieldValue, cond.Value) <= 0
	case "not_empty":
		return fieldValue != nil
	default:
		return false
	}
}

// compareNumeric 数值比较
func compareNumeric(a, b interface{}) int {
	aFloat := toFloat64(a)
	bFloat := toFloat64(b)
	if aFloat > bFloat {
		return 1
	} else if aFloat < bFloat {
		return -1
	}
	return 0
}

// toFloat64 转换为float64
func toFloat64(v interface{}) float64 {
	switch val := v.(type) {
	case int:
		return float64(val)
	case int64:
		return float64(val)
	case float64:
		return val
	case float32:
		return float64(val)
	default:
		return 0
	}
}

// executeActions 执行动作
func (s *Service) executeActions(ctx context.Context, user *models.UserActivity, rule *models.CareRule) error {
	for _, action := range rule.Actions {
		if err := s.executeAction(ctx, user, rule, &action); err != nil {
			log.Printf("Error executing action %s: %v", action.Type, err)
		}
	}
	return nil
}

// executeAction 执行单个动作
func (s *Service) executeAction(ctx context.Context, user *models.UserActivity, rule *models.CareRule, action *models.CareAction) error {
	switch action.Type {
	case "send_message":
		return s.sendCareMessage(ctx, user, rule, action)
	case "start_guide":
		return s.triggerGuide(ctx, user, rule.Type)
	case "trigger_support":
		return s.triggerSupport(ctx, user, rule.Type)
	default:
		return fmt.Errorf("unknown action type: %s", action.Type)
	}
}

// sendCareMessage 发送关怀消息
func (s *Service) sendCareMessage(ctx context.Context, user *models.UserActivity, rule *models.CareRule, action *models.CareAction) error {
	// 获取消息模板
	template, ok := models.CareMessages[rule.Type]
	if !ok {
		return fmt.Errorf("template not found for type: %s", rule.Type)
	}

	// 格式化消息内容
	content := template.Content
	switch rule.Type {
	case models.CareInactivity:
		content = fmt.Sprintf(template.Content, user.DaysSinceActive)
	case models.CareStuck:
		if len(user.StuckPoints) > 0 {
			content = fmt.Sprintf(template.Content, user.StuckPoints[0].Feature)
		}
	}

	// 创建关怀记录
	record := models.CareRecord{
		ID:        fmt.Sprintf("%s-%s-%d", user.UserID, rule.ID, time.Now().Unix()),
		UserID:    user.UserID,
		ProjectID: user.ProjectID,
		RuleID:    rule.ID,
		Type:      rule.Type,
		Channel:   action.Channel,
		Message:   content,
		SentAt:    time.Now(),
	}

	// 保存记录
	collection := s.db.Collection("care_records")
	_, err := collection.InsertOne(ctx, record)
	if err != nil {
		return err
	}

	// 根据渠道发送
	switch action.Channel {
	case models.ChannelInApp:
		return s.sendInAppNotification(ctx, user, template, content)
	case models.ChannelEmail:
		return s.sendEmailNotification(ctx, user, template, content)
	case models.ChannelSMS:
		return s.sendSMSNotification(ctx, user, template, content)
	default:
		log.Printf("Unsupported channel: %s", action.Channel)
	}

	return nil
}

// sendInAppNotification 发送应用内通知
func (s *Service) sendInAppNotification(ctx context.Context, user *models.UserActivity, template models.CareMessage, content string) error {
	// 将通知推送到 Redis，由前端轮询获取
	notification := map[string]interface{}{
		"user_id":     user.UserID,
		"project_id":  user.ProjectID,
		"type":        template.Type,
		"title":       template.Title,
		"content":     content,
		"emoji":       template.Emoji,
		"action_text": template.ActionText,
		"action_url":  template.ActionURL,
		"created_at":  time.Now().Unix(),
	}

	key := fmt.Sprintf("notifications:%s", user.UserID)
	return s.redisClient.LPush(ctx, key, notification).Err()
}

// sendEmailNotification 发送邮件通知
func (s *Service) sendEmailNotification(ctx context.Context, user *models.UserActivity, template models.CareMessage, content string) error {
	// 将邮件任务推送到队列
	emailTask := map[string]interface{}{
		"user_id":     user.UserID,
		"project_id":  user.ProjectID,
		"type":        "care_email",
		"template":    template.Type,
		"title":       template.Title,
		"content":     content,
		"action_text": template.ActionText,
		"action_url":  template.ActionURL,
		"created_at":  time.Now().Unix(),
	}

	return s.redisClient.LPush(ctx, "email_queue", emailTask).Err()
}

// sendSMSNotification 发送短信通知
func (s *Service) sendSMSNotification(ctx context.Context, user *models.UserActivity, template models.CareMessage, content string) error {
	// 将短信任务推送到队列
	smsTask := map[string]interface{}{
		"user_id":    user.UserID,
		"project_id": user.ProjectID,
		"type":       "care_sms",
		"content":    content,
		"created_at": time.Now().Unix(),
	}

	return s.redisClient.LPush(ctx, "sms_queue", smsTask).Err()
}

// triggerGuide 触发引导
func (s *Service) triggerGuide(ctx context.Context, user *models.UserActivity, careType models.CareType) error {
	// 调用 AI Guide 服务
	guideTask := map[string]interface{}{
		"user_id":    user.UserID,
		"project_id": user.ProjectID,
		"type":       "care_guide",
		"care_type":  careType,
		"created_at": time.Now().Unix(),
	}

	return s.redisClient.LPush(ctx, "guide_queue", guideTask).Err()
}

// triggerSupport 触发客服
func (s *Service) triggerSupport(ctx context.Context, user *models.UserActivity, careType models.CareType) error {
	// 调用 AI Support 服务
	supportTask := map[string]interface{}{
		"user_id":    user.UserID,
		"project_id": user.ProjectID,
		"type":       "care_support",
		"care_type":  careType,
		"priority":   "high",
		"created_at": time.Now().Unix(),
	}

	return s.redisClient.LPush(ctx, "support_queue", supportTask).Err()
}

// isInCooldown 检查是否在冷却期
func (s *Service) isInCooldown(ctx context.Context, userID, ruleID string) bool {
	key := fmt.Sprintf("care_cooldown:%s:%s", userID, ruleID)
	exists, _ := s.redisClient.Exists(ctx, key).Result()
	return exists > 0
}

// setCooldown 设置冷却期
func (s *Service) setCooldown(ctx context.Context, userID, ruleID string, hours int) {
	if hours <= 0 {
		return
	}
	key := fmt.Sprintf("care_cooldown:%s:%s", userID, ruleID)
	s.redisClient.Set(ctx, key, "1", time.Duration(hours)*time.Hour)
}

// loadCustomRules 加载自定义规则
func (s *Service) loadCustomRules(ctx context.Context) error {
	collection := s.db.Collection("care_rules")
	cursor, err := collection.Find(ctx, bson.M{"enabled": true})
	if err != nil {
		return err
	}
	defer cursor.Close(ctx)

	var customRules []models.CareRule
	if err := cursor.All(ctx, &customRules); err != nil {
		return err
	}

	// 合并规则
	s.rulesMu.Lock()
	s.rules = append(models.DefaultCareRules, customRules...)
	s.rulesMu.Unlock()

	return nil
}

// UpdateUserActivity 更新用户活动
func (s *Service) UpdateUserActivity(ctx context.Context, activity *models.UserActivity) error {
	collection := s.db.Collection("user_activities")

	// 计算活跃度等级
	activity.ActivityLevel = s.calculateActivityLevel(activity)

	// 计算流失风险
	activity.ChurnRisk = s.calculateChurnRisk(activity)

	activity.UpdatedAt = time.Now()

	_, err := collection.UpdateOne(
		ctx,
		bson.M{"user_id": activity.UserID, "project_id": activity.ProjectID},
		bson.M{"$set": activity},
		options.Update().SetUpsert(true),
	)

	return err
}

// calculateActivityLevel 计算活跃度等级
func (s *Service) calculateActivityLevel(activity *models.UserActivity) models.ActivityLevel {
	if activity.DaysSinceActive >= 30 {
		return models.ActivityChurned
	}
	if activity.DaysSinceActive >= 14 {
		return models.ActivityInactive
	}
	if activity.DaysSinceActive >= 7 {
		return models.ActivityLow
	}
	if activity.LoginCount7d >= 5 && activity.ActionCount7d >= 20 {
		return models.ActivityHighlyActive
	}
	if activity.LoginCount7d >= 3 && activity.ActionCount7d >= 10 {
		return models.ActivityActive
	}
	if activity.LoginCount7d >= 1 {
		return models.ActivityModerate
	}
	return models.ActivityLow
}

// calculateChurnRisk 计算流失风险
func (s *Service) calculateChurnRisk(activity *models.UserActivity) float64 {
	risk := 0.0

	// 不活跃天数
	if activity.DaysSinceActive >= 14 {
		risk += 0.4
	} else if activity.DaysSinceActive >= 7 {
		risk += 0.2
	} else if activity.DaysSinceActive >= 3 {
		risk += 0.1
	}

	// 登录频率
	if activity.LoginCount7d == 0 {
		risk += 0.3
	} else if activity.LoginCount7d <= 1 {
		risk += 0.1
	}

	// 功能使用
	if len(activity.FeaturesUsed) <= 2 {
		risk += 0.2
	}

	// 卡住点
	unresolvedStuck := 0
	for _, sp := range activity.StuckPoints {
		if !sp.Resolved {
			unresolvedStuck++
		}
	}
	if unresolvedStuck > 0 {
		risk += float64(unresolvedStuck) * 0.1
	}

	// 限制在0-1之间
	if risk > 1.0 {
		risk = 1.0
	}

	return risk
}

// RecordStuckPoint 记录卡住点
func (s *Service) RecordStuckPoint(ctx context.Context, userID, projectID, feature string, timeSpent int) error {
	collection := s.db.Collection("user_activities")

	stuckPoint := models.StuckPoint{
		Feature:    feature,
		DetectedAt: time.Now(),
		TimeSpent:  timeSpent,
		Resolved:   false,
	}

	_, err := collection.UpdateOne(
		ctx,
		bson.M{"user_id": userID, "project_id": projectID},
		bson.M{"$push": bson.M{"stuck_points": stuckPoint}},
	)

	return err
}

// GetUserActivity 获取用户活动
func (s *Service) GetUserActivity(ctx context.Context, userID, projectID string) (*models.UserActivity, error) {
	collection := s.db.Collection("user_activities")

	var activity models.UserActivity
	err := collection.FindOne(ctx, bson.M{"user_id": userID, "project_id": projectID}).Decode(&activity)
	if err != nil {
		return nil, err
	}

	return &activity, nil
}

// GetCareRecords 获取关怀记录
func (s *Service) GetCareRecords(ctx context.Context, userID string, limit int) ([]models.CareRecord, error) {
	collection := s.db.Collection("care_records")

	opts := options.Find().
		SetSort(bson.M{"sent_at": -1}).
		SetLimit(int64(limit))

	cursor, err := collection.Find(ctx, bson.M{"user_id": userID}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var records []models.CareRecord
	if err := cursor.All(ctx, &records); err != nil {
		return nil, err
	}

	return records, nil
}

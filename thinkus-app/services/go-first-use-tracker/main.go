package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

// ============================================================================
// 配置和常量
// ============================================================================

const (
	// 卡住检测阈值
	StuckThresholdMinutes = 5  // 5分钟无操作视为卡住
	IdleThresholdMinutes  = 15 // 15分钟无操作视为离开

	// 里程碑检测周期
	CheckIntervalSeconds = 30

	// WebSocket 配置
	WriteWait      = 10 * time.Second
	PongWait       = 60 * time.Second
	PingPeriod     = 50 * time.Second
	MaxMessageSize = 512
)

// 用户行为类型
type ActionType string

const (
	ActionPageView    ActionType = "page_view"
	ActionClick       ActionType = "click"
	ActionInput       ActionType = "input"
	ActionScroll      ActionType = "scroll"
	ActionLogin       ActionType = "login"
	ActionDataCreate  ActionType = "data_create"
	ActionFeatureUse  ActionType = "feature_use"
	ActionError       ActionType = "error"
	ActionHelp        ActionType = "help_click"
)

// 首次使用里程碑
type Milestone string

const (
	MilestoneFirstLogin      Milestone = "first_login"
	MilestoneProfileComplete Milestone = "profile_complete"
	MilestoneFirstDataCreate Milestone = "first_data_create"
	MilestoneCoreFeaturesUsed Milestone = "core_feature_used"
	MilestoneInviteMember    Milestone = "invite_member"
	MilestoneFirstWeekActive Milestone = "first_week_active"
)

// 用户状态
type UserStatus string

const (
	StatusActive    UserStatus = "active"
	StatusIdle      UserStatus = "idle"
	StatusStuck     UserStatus = "stuck"
	StatusCompleted UserStatus = "completed"
	StatusLeft      UserStatus = "left"
)

// 介入类型
type InterventionType string

const (
	InterventionTooltip   InterventionType = "tooltip"    // 工具提示
	InterventionGuide     InterventionType = "guide"      // 引导步骤
	InterventionVideo     InterventionType = "video"      // 视频教程
	InterventionChat      InterventionType = "chat"       // 打开客服
	InterventionCall      InterventionType = "call"       // 主动回电
)

// ============================================================================
// 数据结构
// ============================================================================

// UserAction 用户行为记录
type UserAction struct {
	UserID    string     `json:"userId"`
	ProjectID string     `json:"projectId"`
	Action    ActionType `json:"action"`
	Page      string     `json:"page"`
	Element   string     `json:"element,omitempty"`
	Value     string     `json:"value,omitempty"`
	Timestamp time.Time  `json:"timestamp"`
	SessionID string     `json:"sessionId"`
	Metadata  map[string]interface{} `json:"metadata,omitempty"`
}

// UserSession 用户会话状态
type UserSession struct {
	UserID           string            `json:"userId"`
	ProjectID        string            `json:"projectId"`
	SessionID        string            `json:"sessionId"`
	Status           UserStatus        `json:"status"`
	CurrentPage      string            `json:"currentPage"`
	LastAction       *UserAction       `json:"lastAction"`
	LastActiveAt     time.Time         `json:"lastActiveAt"`
	SessionStartAt   time.Time         `json:"sessionStartAt"`
	Milestones       map[Milestone]bool `json:"milestones"`
	StuckCount       int               `json:"stuckCount"`      // 卡住次数
	InterventionsSent int              `json:"interventionsSent"`
	PagesVisited     []string          `json:"pagesVisited"`
	ActionsCount     int               `json:"actionsCount"`
	ErrorsCount      int               `json:"errorsCount"`
	mu               sync.RWMutex
}

// StuckDetection 卡住检测结果
type StuckDetection struct {
	IsStuck          bool             `json:"isStuck"`
	StuckDuration    int              `json:"stuckDurationMinutes"`
	StuckPage        string           `json:"stuckPage"`
	PossibleReasons  []string         `json:"possibleReasons"`
	RecommendedHelp  InterventionType `json:"recommendedHelp"`
	HelpMessage      string           `json:"helpMessage"`
}

// Intervention 介入动作
type Intervention struct {
	Type        InterventionType `json:"type"`
	Title       string           `json:"title"`
	Message     string           `json:"message"`
	ActionText  string           `json:"actionText,omitempty"`
	ActionURL   string           `json:"actionUrl,omitempty"`
	VideoURL    string           `json:"videoUrl,omitempty"`
	Priority    int              `json:"priority"`
	AutoDismiss int              `json:"autoDismissSeconds,omitempty"`
}

// MilestoneConfig 里程碑配置
type MilestoneConfig struct {
	ID          Milestone `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	TargetDays  int       `json:"targetDays"`
	Priority    int       `json:"priority"`
	Triggers    []string  `json:"triggers"` // 触发条件
}

// ============================================================================
// 首次使用追踪服务
// ============================================================================

type FirstUseTracker struct {
	sessions       map[string]*UserSession // sessionID -> session
	userSessions   map[string]string       // userID -> sessionID
	milestones     []MilestoneConfig
	wsClients      map[string]*websocket.Conn // sessionID -> ws connection
	mu             sync.RWMutex
	interventionCh chan *InterventionRequest
}

type InterventionRequest struct {
	Session      *UserSession
	Detection    *StuckDetection
	Intervention *Intervention
}

func NewFirstUseTracker() *FirstUseTracker {
	tracker := &FirstUseTracker{
		sessions:       make(map[string]*UserSession),
		userSessions:   make(map[string]string),
		wsClients:      make(map[string]*websocket.Conn),
		interventionCh: make(chan *InterventionRequest, 100),
		milestones: []MilestoneConfig{
			{
				ID:          MilestoneFirstLogin,
				Name:        "首次登录",
				Description: "成功登录系统",
				TargetDays:  0,
				Priority:    1,
				Triggers:    []string{"login"},
			},
			{
				ID:          MilestoneProfileComplete,
				Name:        "完善资料",
				Description: "完成基本信息填写",
				TargetDays:  1,
				Priority:    2,
				Triggers:    []string{"profile_update", "avatar_upload"},
			},
			{
				ID:          MilestoneFirstDataCreate,
				Name:        "创建首条数据",
				Description: "创建了第一条业务数据",
				TargetDays:  1,
				Priority:    3,
				Triggers:    []string{"data_create", "item_create", "post_create"},
			},
			{
				ID:          MilestoneCoreFeaturesUsed,
				Name:        "使用核心功能",
				Description: "使用了产品的核心功能",
				TargetDays:  3,
				Priority:    4,
				Triggers:    []string{"core_feature_use"},
			},
			{
				ID:          MilestoneInviteMember,
				Name:        "邀请成员",
				Description: "邀请了团队成员",
				TargetDays:  7,
				Priority:    5,
				Triggers:    []string{"invite_send", "member_add"},
			},
		},
	}

	// 启动后台检测
	go tracker.runStuckDetection()
	go tracker.processInterventions()

	return tracker
}

// RecordAction 记录用户行为
func (t *FirstUseTracker) RecordAction(action *UserAction) error {
	t.mu.Lock()
	defer t.mu.Unlock()

	sessionID := action.SessionID
	if sessionID == "" {
		sessionID = action.UserID + "_" + action.ProjectID
	}

	session, exists := t.sessions[sessionID]
	if !exists {
		session = &UserSession{
			UserID:         action.UserID,
			ProjectID:      action.ProjectID,
			SessionID:      sessionID,
			Status:         StatusActive,
			SessionStartAt: time.Now(),
			Milestones:     make(map[Milestone]bool),
			PagesVisited:   []string{},
		}
		t.sessions[sessionID] = session
		t.userSessions[action.UserID] = sessionID
	}

	session.mu.Lock()
	defer session.mu.Unlock()

	// 更新会话状态
	session.LastAction = action
	session.LastActiveAt = action.Timestamp
	session.ActionsCount++
	session.Status = StatusActive

	// 记录页面访问
	if action.Action == ActionPageView {
		session.CurrentPage = action.Page
		if !contains(session.PagesVisited, action.Page) {
			session.PagesVisited = append(session.PagesVisited, action.Page)
		}
	}

	// 记录错误
	if action.Action == ActionError {
		session.ErrorsCount++
	}

	// 检测里程碑
	t.checkMilestones(session, action)

	return nil
}

// checkMilestones 检测里程碑完成
func (t *FirstUseTracker) checkMilestones(session *UserSession, action *UserAction) {
	actionStr := string(action.Action)

	for _, milestone := range t.milestones {
		if session.Milestones[milestone.ID] {
			continue // 已完成
		}

		for _, trigger := range milestone.Triggers {
			if trigger == actionStr || (action.Element != "" && action.Element == trigger) {
				session.Milestones[milestone.ID] = true
				log.Printf("[MILESTONE] User %s completed milestone: %s", session.UserID, milestone.Name)

				// 发送庆祝通知
				t.sendCelebration(session, milestone)
				break
			}
		}
	}
}

// sendCelebration 发送庆祝通知
func (t *FirstUseTracker) sendCelebration(session *UserSession, milestone MilestoneConfig) {
	intervention := &Intervention{
		Type:        InterventionTooltip,
		Title:       fmt.Sprintf("🎉 %s", milestone.Name),
		Message:     fmt.Sprintf("太棒了！您已完成「%s」。继续探索更多功能吧！", milestone.Description),
		Priority:    1,
		AutoDismiss: 5,
	}

	t.interventionCh <- &InterventionRequest{
		Session:      session,
		Intervention: intervention,
	}
}

// runStuckDetection 运行卡住检测
func (t *FirstUseTracker) runStuckDetection() {
	ticker := time.NewTicker(time.Duration(CheckIntervalSeconds) * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		t.mu.RLock()
		sessions := make([]*UserSession, 0, len(t.sessions))
		for _, s := range t.sessions {
			sessions = append(sessions, s)
		}
		t.mu.RUnlock()

		for _, session := range sessions {
			detection := t.detectStuck(session)
			if detection.IsStuck {
				t.handleStuckUser(session, detection)
			}
		}
	}
}

// detectStuck 检测用户是否卡住
func (t *FirstUseTracker) detectStuck(session *UserSession) *StuckDetection {
	session.mu.RLock()
	defer session.mu.RUnlock()

	// 已完成或已离开的不检测
	if session.Status == StatusCompleted || session.Status == StatusLeft {
		return &StuckDetection{IsStuck: false}
	}

	idleMinutes := int(time.Since(session.LastActiveAt).Minutes())

	// 检查是否离开
	if idleMinutes >= IdleThresholdMinutes {
		session.mu.RUnlock()
		session.mu.Lock()
		session.Status = StatusLeft
		session.mu.Unlock()
		session.mu.RLock()
		return &StuckDetection{IsStuck: false}
	}

	// 检查是否卡住
	if idleMinutes >= StuckThresholdMinutes {
		detection := &StuckDetection{
			IsStuck:       true,
			StuckDuration: idleMinutes,
			StuckPage:     session.CurrentPage,
		}

		// 分析可能的原因
		detection.PossibleReasons = t.analyzePossibleReasons(session)
		detection.RecommendedHelp, detection.HelpMessage = t.recommendHelp(session, detection)

		return detection
	}

	return &StuckDetection{IsStuck: false}
}

// analyzePossibleReasons 分析卡住原因
func (t *FirstUseTracker) analyzePossibleReasons(session *UserSession) []string {
	reasons := []string{}

	// 刚登录就卡住
	if session.ActionsCount < 5 {
		reasons = append(reasons, "刚开始使用，可能不知道从哪开始")
	}

	// 在设置页面卡住
	if contains([]string{"/settings", "/profile", "/config"}, session.CurrentPage) {
		reasons = append(reasons, "可能在配置时遇到困难")
	}

	// 在创建/编辑页面卡住
	if contains([]string{"/create", "/edit", "/new"}, session.CurrentPage) {
		reasons = append(reasons, "可能在创建内容时遇到问题")
	}

	// 有错误记录
	if session.ErrorsCount > 0 {
		reasons = append(reasons, "可能遇到了技术问题")
	}

	// 点击了帮助
	if session.LastAction != nil && session.LastAction.Action == ActionHelp {
		reasons = append(reasons, "正在寻求帮助")
	}

	if len(reasons) == 0 {
		reasons = append(reasons, "可能在思考或查看内容")
	}

	return reasons
}

// recommendHelp 推荐帮助方式
func (t *FirstUseTracker) recommendHelp(session *UserSession, detection *StuckDetection) (InterventionType, string) {
	// 第一次卡住：显示提示
	if session.StuckCount == 0 {
		return InterventionTooltip, t.generateHelpMessage(session, detection)
	}

	// 第二次卡住：引导教程
	if session.StuckCount == 1 {
		return InterventionGuide, "看起来您可能需要一些帮助，要不要看看快速入门教程？"
	}

	// 第三次卡住：视频教程
	if session.StuckCount == 2 {
		return InterventionVideo, "我们准备了详细的视频教程，可以帮助您快速上手"
	}

	// 多次卡住：人工客服
	return InterventionChat, "需要帮助吗？我们的客服小姐姐随时为您服务"
}

// generateHelpMessage 生成帮助消息
func (t *FirstUseTracker) generateHelpMessage(session *UserSession, detection *StuckDetection) string {
	page := session.CurrentPage

	messages := map[string]string{
		"/dashboard":  "这里是您的工作台，可以看到所有数据概览。试试点击左侧菜单探索更多功能~",
		"/products":   "在这里可以管理您的商品。点击「添加商品」开始创建第一个商品吧！",
		"/orders":     "订单管理页面会显示所有客户订单。目前还没有订单，商品上架后就会有啦~",
		"/settings":   "设置页面可以配置您的店铺信息。如果不确定怎么填，可以先跳过~",
		"/articles":   "这里可以发布文章。点击「写文章」开始您的第一篇内容创作！",
		"/users":      "用户管理页面。作为管理员，您可以在这里管理所有用户。",
		"/analytics":  "数据分析页面。等有了更多数据后，这里会显示详细的统计图表。",
	}

	if msg, ok := messages[page]; ok {
		return msg
	}

	return "遇到问题了吗？点击右下角的「帮助」按钮，我们随时为您解答~"
}

// handleStuckUser 处理卡住的用户
func (t *FirstUseTracker) handleStuckUser(session *UserSession, detection *StuckDetection) {
	session.mu.Lock()
	session.Status = StatusStuck
	session.StuckCount++
	session.mu.Unlock()

	log.Printf("[STUCK] User %s stuck on page %s for %d minutes",
		session.UserID, detection.StuckPage, detection.StuckDuration)

	intervention := &Intervention{
		Type:        detection.RecommendedHelp,
		Title:       "需要帮助吗？",
		Message:     detection.HelpMessage,
		ActionText:  t.getActionText(detection.RecommendedHelp),
		Priority:    2,
		AutoDismiss: 30,
	}

	t.interventionCh <- &InterventionRequest{
		Session:      session,
		Detection:    detection,
		Intervention: intervention,
	}
}

// getActionText 获取行动按钮文本
func (t *FirstUseTracker) getActionText(interventionType InterventionType) string {
	texts := map[InterventionType]string{
		InterventionTooltip: "知道了",
		InterventionGuide:   "开始教程",
		InterventionVideo:   "观看视频",
		InterventionChat:    "联系客服",
		InterventionCall:    "预约回电",
	}
	return texts[interventionType]
}

// processInterventions 处理介入请求
func (t *FirstUseTracker) processInterventions() {
	for req := range t.interventionCh {
		t.mu.RLock()
		conn, exists := t.wsClients[req.Session.SessionID]
		t.mu.RUnlock()

		if exists && conn != nil {
			msg, _ := json.Marshal(map[string]interface{}{
				"type":         "intervention",
				"intervention": req.Intervention,
			})
			conn.WriteMessage(websocket.TextMessage, msg)
		}

		// 记录已发送
		req.Session.mu.Lock()
		req.Session.InterventionsSent++
		req.Session.mu.Unlock()

		// 如果是需要人工的，触发通知
		if req.Intervention.Type == InterventionCall {
			t.notifySupport(req.Session, req.Detection)
		}
	}
}

// notifySupport 通知客服
func (t *FirstUseTracker) notifySupport(session *UserSession, detection *StuckDetection) {
	log.Printf("[SUPPORT] User %s needs human support. Stuck on %s for %d minutes. Reasons: %v",
		session.UserID, detection.StuckPage, detection.StuckDuration, detection.PossibleReasons)

	// TODO: 发送钉钉/企微通知
	// TODO: 创建客服工单
}

// GetUserProgress 获取用户进度
func (t *FirstUseTracker) GetUserProgress(userID string) map[string]interface{} {
	t.mu.RLock()
	sessionID, exists := t.userSessions[userID]
	if !exists {
		t.mu.RUnlock()
		return nil
	}
	session := t.sessions[sessionID]
	t.mu.RUnlock()

	if session == nil {
		return nil
	}

	session.mu.RLock()
	defer session.mu.RUnlock()

	// 计算完成的里程碑
	completedMilestones := 0
	for _, completed := range session.Milestones {
		if completed {
			completedMilestones++
		}
	}

	return map[string]interface{}{
		"userId":              userID,
		"status":              session.Status,
		"milestonesCompleted": completedMilestones,
		"milestonesTotal":     len(t.milestones),
		"progress":            float64(completedMilestones) / float64(len(t.milestones)) * 100,
		"pagesVisited":        len(session.PagesVisited),
		"actionsCount":        session.ActionsCount,
		"sessionDuration":     int(time.Since(session.SessionStartAt).Minutes()),
		"lastActiveAt":        session.LastActiveAt,
	}
}

// ============================================================================
// WebSocket 处理
// ============================================================================

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // 允许所有来源
	},
}

func (t *FirstUseTracker) HandleWebSocket(c *gin.Context) {
	sessionID := c.Query("sessionId")
	if sessionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "sessionId required"})
		return
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

	t.mu.Lock()
	t.wsClients[sessionID] = conn
	t.mu.Unlock()

	defer func() {
		t.mu.Lock()
		delete(t.wsClients, sessionID)
		t.mu.Unlock()
		conn.Close()
	}()

	// 读取消息
	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			break
		}

		var action UserAction
		if err := json.Unmarshal(message, &action); err == nil {
			action.SessionID = sessionID
			if action.Timestamp.IsZero() {
				action.Timestamp = time.Now()
			}
			t.RecordAction(&action)
		}
	}
}

// ============================================================================
// 辅助函数
// ============================================================================

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

// ============================================================================
// HTTP 服务
// ============================================================================

func main() {
	r := gin.Default()

	tracker := NewFirstUseTracker()

	// 健康检查
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "healthy",
			"service": "first-use-tracker",
		})
	})

	// WebSocket 连接
	r.GET("/ws", tracker.HandleWebSocket)

	// 记录行为
	r.POST("/action", func(c *gin.Context) {
		var action UserAction
		if err := c.ShouldBindJSON(&action); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		if action.Timestamp.IsZero() {
			action.Timestamp = time.Now()
		}

		if err := tracker.RecordAction(&action); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"success": true})
	})

	// 获取用户进度
	r.GET("/progress/:userId", func(c *gin.Context) {
		userID := c.Param("userId")
		progress := tracker.GetUserProgress(userID)

		if progress == nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
			return
		}

		c.JSON(http.StatusOK, progress)
	})

	// 获取里程碑配置
	r.GET("/milestones", func(c *gin.Context) {
		c.JSON(http.StatusOK, tracker.milestones)
	})

	// 手动触发介入（用于测试）
	r.POST("/intervene/:sessionId", func(c *gin.Context) {
		var intervention Intervention
		if err := c.ShouldBindJSON(&intervention); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		sessionID := c.Param("sessionId")

		tracker.mu.RLock()
		session, exists := tracker.sessions[sessionID]
		tracker.mu.RUnlock()

		if !exists {
			c.JSON(http.StatusNotFound, gin.H{"error": "session not found"})
			return
		}

		tracker.interventionCh <- &InterventionRequest{
			Session:      session,
			Intervention: &intervention,
		}

		c.JSON(http.StatusOK, gin.H{"success": true})
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8002"
	}

	log.Printf("First Use Tracker Service starting on port %s", port)
	r.Run(":" + port)
}

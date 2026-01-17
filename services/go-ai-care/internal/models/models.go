package models

import (
	"time"
)

// ActivityLevel 活跃度等级
type ActivityLevel string

const (
	ActivityHighlyActive ActivityLevel = "highly_active"
	ActivityActive       ActivityLevel = "active"
	ActivityModerate     ActivityLevel = "moderate"
	ActivityLow          ActivityLevel = "low"
	ActivityInactive     ActivityLevel = "inactive"
	ActivityChurned      ActivityLevel = "churned"
)

// CareType 关怀类型
type CareType string

const (
	CareWelcome         CareType = "welcome"           // 欢迎关怀
	CareFirstWeek       CareType = "first_week"        // 首周检查
	CareInactivity      CareType = "inactivity"        // 不活跃提醒
	CareStuck           CareType = "stuck"             // 卡住帮助
	CareFeatureUnused   CareType = "feature_unused"    // 功能未用
	CareActivityDrop    CareType = "activity_drop"     // 活跃度下降
	CareMilestone       CareType = "milestone"         // 里程碑祝贺
	CarePeriodicCheckin CareType = "periodic_checkin"  // 定期回访
	CareChurnRisk       CareType = "churn_risk"        // 流失风险
)

// ChannelType 渠道类型
type ChannelType string

const (
	ChannelInApp  ChannelType = "in_app"
	ChannelEmail  ChannelType = "email"
	ChannelSMS    ChannelType = "sms"
	ChannelWechat ChannelType = "wechat"
	ChannelPush   ChannelType = "push"
)

// UserActivity 用户活动
type UserActivity struct {
	UserID          string        `json:"user_id" bson:"user_id"`
	ProjectID       string        `json:"project_id" bson:"project_id"`
	LastActiveAt    time.Time     `json:"last_active_at" bson:"last_active_at"`
	ActivityLevel   ActivityLevel `json:"activity_level" bson:"activity_level"`
	DaysSinceActive int           `json:"days_since_active" bson:"days_since_active"`
	LoginCount7d    int           `json:"login_count_7d" bson:"login_count_7d"`
	ActionCount7d   int           `json:"action_count_7d" bson:"action_count_7d"`
	FeaturesUsed    []string      `json:"features_used" bson:"features_used"`
	StuckPoints     []StuckPoint  `json:"stuck_points" bson:"stuck_points"`
	ChurnRisk       float64       `json:"churn_risk" bson:"churn_risk"` // 0-1
	UpdatedAt       time.Time     `json:"updated_at" bson:"updated_at"`
}

// StuckPoint 卡住点
type StuckPoint struct {
	Feature     string    `json:"feature" bson:"feature"`
	DetectedAt  time.Time `json:"detected_at" bson:"detected_at"`
	TimeSpent   int       `json:"time_spent" bson:"time_spent"` // 秒
	Resolved    bool      `json:"resolved" bson:"resolved"`
	Resolution  string    `json:"resolution" bson:"resolution"`
}

// CareRule 关怀规则
type CareRule struct {
	ID          string            `json:"id" bson:"_id"`
	Name        string            `json:"name" bson:"name"`
	Type        CareType          `json:"type" bson:"type"`
	Enabled     bool              `json:"enabled" bson:"enabled"`
	Conditions  []CareCondition   `json:"conditions" bson:"conditions"`
	Actions     []CareAction      `json:"actions" bson:"actions"`
	Cooldown    int               `json:"cooldown" bson:"cooldown"` // 冷却时间(小时)
	Priority    int               `json:"priority" bson:"priority"`
	CreatedAt   time.Time         `json:"created_at" bson:"created_at"`
}

// CareCondition 关怀条件
type CareCondition struct {
	Field    string      `json:"field" bson:"field"`
	Operator string      `json:"operator" bson:"operator"` // eq, gt, lt, gte, lte, contains
	Value    interface{} `json:"value" bson:"value"`
}

// CareAction 关怀动作
type CareAction struct {
	Type        string                 `json:"type" bson:"type"` // send_message, start_guide, trigger_support
	Channel     ChannelType            `json:"channel" bson:"channel"`
	Template    string                 `json:"template" bson:"template"`
	Params      map[string]interface{} `json:"params" bson:"params"`
}

// CareRecord 关怀记录
type CareRecord struct {
	ID          string      `json:"id" bson:"_id"`
	UserID      string      `json:"user_id" bson:"user_id"`
	ProjectID   string      `json:"project_id" bson:"project_id"`
	RuleID      string      `json:"rule_id" bson:"rule_id"`
	Type        CareType    `json:"type" bson:"type"`
	Channel     ChannelType `json:"channel" bson:"channel"`
	Message     string      `json:"message" bson:"message"`
	SentAt      time.Time   `json:"sent_at" bson:"sent_at"`
	Opened      bool        `json:"opened" bson:"opened"`
	OpenedAt    *time.Time  `json:"opened_at" bson:"opened_at"`
	Responded   bool        `json:"responded" bson:"responded"`
	RespondedAt *time.Time  `json:"responded_at" bson:"responded_at"`
	Response    string      `json:"response" bson:"response"`
}

// CareMessage 关怀消息模板
type CareMessage struct {
	Type        CareType `json:"type"`
	Title       string   `json:"title"`
	Content     string   `json:"content"`
	Emoji       string   `json:"emoji"`
	ActionText  string   `json:"action_text"`
	ActionURL   string   `json:"action_url"`
}

// 预定义关怀消息
var CareMessages = map[CareType]CareMessage{
	CareWelcome: {
		Type:       CareWelcome,
		Title:      "欢迎使用！",
		Content:    "您好！您的产品已经上线了。有任何问题随时问我，我24小时都在！",
		Emoji:      "👋",
		ActionText: "开始体验",
		ActionURL:  "/guide/start",
	},
	CareFirstWeek: {
		Type:       CareFirstWeek,
		Title:      "使用一周了，感觉怎么样？",
		Content:    "您使用产品已经一周了！有遇到什么问题吗？我可以帮您解答。",
		Emoji:      "📅",
		ActionText: "反馈意见",
		ActionURL:  "/feedback",
	},
	CareInactivity: {
		Type:       CareInactivity,
		Title:      "好久不见，想您了！",
		Content:    "您已经 %d 天没有登录了，是不是遇到了什么问题？有什么我可以帮忙的吗？",
		Emoji:      "💭",
		ActionText: "看看有什么新变化",
		ActionURL:  "/dashboard",
	},
	CareStuck: {
		Type:       CareStuck,
		Title:      "需要帮忙吗？",
		Content:    "我注意到您在 %s 这个功能上停留了很久，是不是遇到了困难？我来帮您！",
		Emoji:      "🤔",
		ActionText: "获取帮助",
		ActionURL:  "/support",
	},
	CareFeatureUnused: {
		Type:       CareFeatureUnused,
		Title:      "发现一个您可能感兴趣的功能",
		Content:    "您知道吗？%s 功能可以帮您 %s。要不要了解一下？",
		Emoji:      "💡",
		ActionText: "了解详情",
		ActionURL:  "/guide/feature",
	},
	CareActivityDrop: {
		Type:       CareActivityDrop,
		Title:      "最近使用得少了",
		Content:    "您最近使用产品的频率有所下降，是遇到什么问题了吗？或者是太忙了？",
		Emoji:      "📉",
		ActionText: "告诉我原因",
		ActionURL:  "/feedback",
	},
	CareMilestone: {
		Type:       CareMilestone,
		Title:      "恭喜达成里程碑！",
		Content:    "太棒了！您已经 %s，继续加油！",
		Emoji:      "🎉",
		ActionText: "分享喜悦",
		ActionURL:  "/share",
	},
	CarePeriodicCheckin: {
		Type:       CarePeriodicCheckin,
		Title:      "定期回访",
		Content:    "又是新的一周，您的产品运行良好。有什么新需求或者改进建议吗？",
		Emoji:      "👀",
		ActionText: "提交建议",
		ActionURL:  "/feedback",
	},
	CareChurnRisk: {
		Type:       CareChurnRisk,
		Title:      "真心想帮到您",
		Content:    "我们注意到您可能遇到了一些困难。作为您的专属顾问，我想亲自了解一下情况，看看能不能帮到您。",
		Emoji:      "❤️",
		ActionText: "和我聊聊",
		ActionURL:  "/support/priority",
	},
}

// DefaultCareRules 默认关怀规则
var DefaultCareRules = []CareRule{
	{
		ID:       "welcome",
		Name:     "新用户欢迎",
		Type:     CareWelcome,
		Enabled:  true,
		Conditions: []CareCondition{
			{Field: "days_since_active", Operator: "eq", Value: 0},
			{Field: "login_count_7d", Operator: "eq", Value: 1},
		},
		Actions: []CareAction{
			{Type: "send_message", Channel: ChannelInApp, Template: "welcome"},
			{Type: "send_message", Channel: ChannelEmail, Template: "welcome"},
		},
		Cooldown: 0,
		Priority: 100,
	},
	{
		ID:       "first_week_checkin",
		Name:     "首周检查",
		Type:     CareFirstWeek,
		Enabled:  true,
		Conditions: []CareCondition{
			{Field: "days_since_created", Operator: "eq", Value: 7},
		},
		Actions: []CareAction{
			{Type: "send_message", Channel: ChannelEmail, Template: "first_week"},
		},
		Cooldown: 168, // 7天
		Priority: 80,
	},
	{
		ID:       "inactivity_3d",
		Name:     "3天不活跃提醒",
		Type:     CareInactivity,
		Enabled:  true,
		Conditions: []CareCondition{
			{Field: "days_since_active", Operator: "gte", Value: 3},
			{Field: "days_since_active", Operator: "lt", Value: 7},
		},
		Actions: []CareAction{
			{Type: "send_message", Channel: ChannelInApp, Template: "inactivity"},
		},
		Cooldown: 72, // 3天
		Priority: 70,
	},
	{
		ID:       "inactivity_7d",
		Name:     "7天不活跃提醒",
		Type:     CareInactivity,
		Enabled:  true,
		Conditions: []CareCondition{
			{Field: "days_since_active", Operator: "gte", Value: 7},
		},
		Actions: []CareAction{
			{Type: "send_message", Channel: ChannelEmail, Template: "inactivity"},
			{Type: "send_message", Channel: ChannelInApp, Template: "inactivity"},
		},
		Cooldown: 168, // 7天
		Priority: 90,
	},
	{
		ID:       "stuck_detection",
		Name:     "卡住检测",
		Type:     CareStuck,
		Enabled:  true,
		Conditions: []CareCondition{
			{Field: "stuck_points", Operator: "not_empty", Value: nil},
		},
		Actions: []CareAction{
			{Type: "start_guide", Channel: ChannelInApp, Template: "stuck"},
			{Type: "trigger_support", Channel: ChannelInApp, Template: "stuck"},
		},
		Cooldown: 24,
		Priority: 95,
	},
	{
		ID:       "churn_risk_high",
		Name:     "高流失风险",
		Type:     CareChurnRisk,
		Enabled:  true,
		Conditions: []CareCondition{
			{Field: "churn_risk", Operator: "gte", Value: 0.7},
		},
		Actions: []CareAction{
			{Type: "send_message", Channel: ChannelEmail, Template: "churn_risk"},
			{Type: "trigger_support", Channel: ChannelInApp, Template: "priority_support"},
		},
		Cooldown: 168,
		Priority: 100,
	},
}

"""数据模型"""
from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class GuideType(str, Enum):
    """引导类型"""
    FIRST_TIME = "first_time"  # 首次使用
    FEATURE_TOUR = "feature_tour"  # 功能介绍
    TASK_GUIDE = "task_guide"  # 任务引导
    TROUBLESHOOT = "troubleshoot"  # 问题解决
    CUSTOMIZATION = "customization"  # 个性化设置


class StepType(str, Enum):
    """步骤类型"""
    WELCOME = "welcome"  # 欢迎
    HIGHLIGHT = "highlight"  # 高亮元素
    CLICK = "click"  # 点击引导
    INPUT = "input"  # 输入引导
    EXPLAIN = "explain"  # 说明
    VIDEO = "video"  # 视频
    QUIZ = "quiz"  # 小测验
    CELEBRATION = "celebration"  # 庆祝


class UserLevel(str, Enum):
    """用户水平"""
    BEGINNER = "beginner"  # 小白
    INTERMEDIATE = "intermediate"  # 中级
    ADVANCED = "advanced"  # 高级


class GuideStep(BaseModel):
    """引导步骤"""
    id: str
    order: int
    type: StepType
    title: str  # 简短标题
    content: str  # 详细说明（人话）
    target_element: Optional[str] = None  # CSS选择器
    action_hint: Optional[str] = None  # 操作提示
    expected_action: Optional[str] = None  # 期望的用户操作
    fallback_content: Optional[str] = None  # 用户卡住时的备选说明
    tips: List[str] = Field(default_factory=list)  # 小贴士
    faq: List[Dict[str, str]] = Field(default_factory=list)  # 常见问题
    duration_seconds: int = 30  # 预计耗时
    can_skip: bool = True  # 是否可跳过
    auto_advance: bool = False  # 是否自动进入下一步


class GuideSession(BaseModel):
    """引导会话"""
    id: str
    user_id: str
    project_id: str
    guide_type: GuideType
    user_level: UserLevel = UserLevel.BEGINNER
    current_step_index: int = 0
    steps: List[GuideStep] = Field(default_factory=list)
    completed_steps: List[str] = Field(default_factory=list)
    skipped_steps: List[str] = Field(default_factory=list)
    stuck_points: List[Dict[str, Any]] = Field(default_factory=list)  # 卡住的点
    started_at: datetime = Field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None
    total_time_seconds: int = 0
    progress_percent: float = 0.0
    is_active: bool = True
    metadata: Dict[str, Any] = Field(default_factory=dict)


class UserContext(BaseModel):
    """用户上下文"""
    user_id: str
    project_id: str
    product_type: str  # 产品类型（如 web-app, ecommerce）
    product_name: str
    product_url: str
    admin_url: Optional[str] = None
    features: List[str] = Field(default_factory=list)  # 产品功能列表
    user_level: UserLevel = UserLevel.BEGINNER
    language: str = "zh-CN"
    previous_sessions: int = 0  # 之前的引导会话数
    completed_guides: List[str] = Field(default_factory=list)  # 已完成的引导
    stuck_history: List[Dict[str, Any]] = Field(default_factory=list)


class StuckReport(BaseModel):
    """卡住报告"""
    session_id: str
    step_id: str
    time_stuck_seconds: int
    user_action: Optional[str] = None  # 用户尝试的操作
    error_message: Optional[str] = None
    screenshot_url: Optional[str] = None
    resolved: bool = False
    resolution: Optional[str] = None


class GuideRequest(BaseModel):
    """引导请求"""
    user_id: str
    project_id: str
    guide_type: GuideType = GuideType.FIRST_TIME
    target_feature: Optional[str] = None  # 要引导的特定功能
    user_question: Optional[str] = None  # 用户的问题


class GuideResponse(BaseModel):
    """引导响应"""
    session_id: str
    current_step: GuideStep
    total_steps: int
    progress_percent: float
    estimated_time_remaining: int  # 剩余预计时间（秒）
    can_go_back: bool
    can_skip: bool
    encouragement: str  # 鼓励话语


class StepActionRequest(BaseModel):
    """步骤操作请求"""
    session_id: str
    action: str  # next, back, skip, stuck, complete
    user_input: Optional[str] = None
    screenshot_url: Optional[str] = None


class AIResponse(BaseModel):
    """AI响应"""
    message: str
    suggestions: List[str] = Field(default_factory=list)
    next_step: Optional[GuideStep] = None
    confidence: float = 1.0

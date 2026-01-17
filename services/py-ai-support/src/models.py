"""数据模型"""
from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class IssueCategory(str, Enum):
    """问题类别"""
    CANNOT_ACCESS = "cannot_access"  # 打不开
    LOGIN_FAILED = "login_failed"  # 登不上
    FEATURE_BROKEN = "feature_broken"  # 功能坏了
    SLOW_PERFORMANCE = "slow_performance"  # 太慢了
    DATA_LOST = "data_lost"  # 数据丢了
    DISPLAY_ERROR = "display_error"  # 显示有问题
    PAYMENT_ISSUE = "payment_issue"  # 支付问题
    DONT_KNOW_HOW = "dont_know_how"  # 不会用
    OTHER = "other"  # 其他


class IssueUrgency(str, Enum):
    """问题紧急程度"""
    LOW = "low"  # 不着急
    NORMAL = "normal"  # 一般
    HIGH = "high"  # 比较急
    CRITICAL = "critical"  # 非常紧急


class DiagnosisResult(str, Enum):
    """诊断结果"""
    IDENTIFIED = "identified"  # 已识别问题
    PARTIAL = "partial"  # 部分识别
    UNKNOWN = "unknown"  # 未知问题
    NEED_MORE_INFO = "need_more_info"  # 需要更多信息


class FixStatus(str, Enum):
    """修复状态"""
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    FIXED = "fixed"
    FAILED = "failed"
    NEED_HUMAN = "need_human"


class MessageRole(str, Enum):
    """消息角色"""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class Message(BaseModel):
    """聊天消息"""
    id: str
    role: MessageRole
    content: str
    timestamp: datetime = Field(default_factory=datetime.now)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class SupportSession(BaseModel):
    """客服会话"""
    id: str
    user_id: str
    project_id: str
    category: Optional[IssueCategory] = None
    urgency: IssueUrgency = IssueUrgency.NORMAL
    messages: List[Message] = Field(default_factory=list)
    diagnosis: Optional[Dict[str, Any]] = None
    fix_attempts: List[Dict[str, Any]] = Field(default_factory=list)
    fix_status: FixStatus = FixStatus.NOT_STARTED
    resolved: bool = False
    resolution: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    escalated: bool = False
    escalation_reason: Optional[str] = None
    satisfaction_score: Optional[int] = None


class AutoDiagnosis(BaseModel):
    """自动诊断结果"""
    result: DiagnosisResult
    category: IssueCategory
    confidence: float  # 0-1
    possible_causes: List[str]
    recommended_fixes: List[Dict[str, Any]]
    need_screenshot: bool = False
    need_more_info: bool = False
    questions_to_ask: List[str] = Field(default_factory=list)


class AutoFix(BaseModel):
    """自动修复"""
    id: str
    name: str
    description: str  # 人话描述
    steps: List[str]  # 执行步骤
    risk_level: str  # low/medium/high
    estimated_time: int  # 预计耗时（秒）
    requires_confirmation: bool = True
    rollback_available: bool = True


class FixAttempt(BaseModel):
    """修复尝试"""
    fix_id: str
    fix_name: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    success: bool = False
    error: Optional[str] = None
    user_feedback: Optional[str] = None


class ScreenshotAnalysis(BaseModel):
    """截图分析结果"""
    has_error: bool
    error_type: Optional[str] = None
    error_message: Optional[str] = None
    visible_elements: List[str] = Field(default_factory=list)
    suggestions: List[str] = Field(default_factory=list)
    description: str  # 人话描述看到了什么


class SupportRequest(BaseModel):
    """客服请求"""
    user_id: str
    project_id: str
    message: str
    screenshot_base64: Optional[str] = None
    category: Optional[IssueCategory] = None
    session_id: Optional[str] = None  # 继续已有会话


class SupportResponse(BaseModel):
    """客服响应"""
    session_id: str
    message: str  # AI 回复
    diagnosis: Optional[AutoDiagnosis] = None
    suggested_fixes: List[AutoFix] = Field(default_factory=list)
    quick_replies: List[str] = Field(default_factory=list)  # 快捷回复选项
    need_human: bool = False
    escalation_reason: Optional[str] = None


class FixRequest(BaseModel):
    """修复请求"""
    session_id: str
    fix_id: str
    confirmed: bool = True


class FixResponse(BaseModel):
    """修复响应"""
    success: bool
    message: str
    details: Optional[str] = None
    next_steps: List[str] = Field(default_factory=list)

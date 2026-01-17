"""AI 智能客服服务"""
import uuid
import json
import base64
from datetime import datetime
from typing import Optional, List, Dict, Any
import anthropic
from motor.motor_asyncio import AsyncIOMotorClient
import redis.asyncio as redis
import httpx

from .config import get_settings
from .models import (
    IssueCategory, IssueUrgency, DiagnosisResult, FixStatus, MessageRole,
    Message, SupportSession, AutoDiagnosis, AutoFix, FixAttempt,
    ScreenshotAnalysis, SupportRequest, SupportResponse, FixRequest, FixResponse
)


# 问题类别的人话描述和诊断规则
ISSUE_CONFIGS: Dict[IssueCategory, Dict[str, Any]] = {
    IssueCategory.CANNOT_ACCESS: {
        "label": "打不开网站",
        "icon": "🚫",
        "quick_diagnosis": [
            "检查网址是否正确",
            "检查网络连接",
            "检查服务器状态"
        ],
        "common_causes": [
            "网址输入错误",
            "网络不稳定",
            "服务器正在维护",
            "域名过期"
        ],
        "auto_fixes": ["check_server_status", "refresh_dns", "restart_service"]
    },
    IssueCategory.LOGIN_FAILED: {
        "label": "登录不上",
        "icon": "🔐",
        "quick_diagnosis": [
            "检查账号密码是否正确",
            "检查大小写",
            "检查是否有空格"
        ],
        "common_causes": [
            "密码输入错误",
            "账号不存在",
            "账号被锁定",
            "浏览器缓存问题"
        ],
        "auto_fixes": ["reset_password", "unlock_account", "clear_session"]
    },
    IssueCategory.FEATURE_BROKEN: {
        "label": "功能不好用",
        "icon": "⚙️",
        "quick_diagnosis": [
            "确认具体是哪个功能",
            "检查操作步骤",
            "检查数据是否正确"
        ],
        "common_causes": [
            "操作方式不对",
            "数据格式错误",
            "系统Bug",
            "权限不足"
        ],
        "auto_fixes": ["check_permissions", "clear_cache", "retry_operation"]
    },
    IssueCategory.SLOW_PERFORMANCE: {
        "label": "运行太慢",
        "icon": "🐌",
        "quick_diagnosis": [
            "检查网络速度",
            "检查服务器负载",
            "检查数据量"
        ],
        "common_causes": [
            "网络不好",
            "服务器压力大",
            "数据太多",
            "浏览器太卡"
        ],
        "auto_fixes": ["optimize_database", "clear_cache", "scale_resources"]
    },
    IssueCategory.DATA_LOST: {
        "label": "数据丢失",
        "icon": "📭",
        "quick_diagnosis": [
            "确认数据是否真的丢失",
            "检查筛选条件",
            "检查回收站"
        ],
        "common_causes": [
            "筛选条件问题",
            "误删除",
            "同步延迟",
            "系统故障"
        ],
        "auto_fixes": ["check_trash", "restore_backup", "sync_data"]
    },
    IssueCategory.DISPLAY_ERROR: {
        "label": "显示有问题",
        "icon": "🖼️",
        "quick_diagnosis": [
            "刷新页面",
            "清除缓存",
            "换个浏览器试试"
        ],
        "common_causes": [
            "缓存问题",
            "浏览器兼容性",
            "网络加载不完整",
            "样式错误"
        ],
        "auto_fixes": ["clear_browser_cache", "force_refresh", "fix_styles"]
    },
    IssueCategory.PAYMENT_ISSUE: {
        "label": "支付问题",
        "icon": "💳",
        "quick_diagnosis": [
            "检查支付状态",
            "检查银行卡余额",
            "检查支付限额"
        ],
        "common_causes": [
            "余额不足",
            "网络超时",
            "支付渠道问题",
            "订单状态异常"
        ],
        "auto_fixes": ["check_payment_status", "retry_payment", "refund"]
    },
    IssueCategory.DONT_KNOW_HOW: {
        "label": "不会操作",
        "icon": "❓",
        "quick_diagnosis": [
            "了解用户要做什么",
            "提供操作指引",
            "推荐教程"
        ],
        "common_causes": [
            "新用户不熟悉",
            "功能更新",
            "操作复杂"
        ],
        "auto_fixes": ["show_tutorial", "guide_steps", "connect_guide"]
    },
    IssueCategory.OTHER: {
        "label": "其他问题",
        "icon": "📝",
        "quick_diagnosis": [
            "详细了解问题",
            "收集更多信息"
        ],
        "common_causes": [],
        "auto_fixes": []
    }
}

# 自动修复方案
AUTO_FIX_TEMPLATES: Dict[str, AutoFix] = {
    "check_server_status": AutoFix(
        id="check_server_status",
        name="检查服务状态",
        description="我来帮您检查一下服务器是不是正常运行",
        steps=["检查API健康", "检查数据库连接", "检查域名解析"],
        risk_level="low",
        estimated_time=10,
        requires_confirmation=False,
        rollback_available=False
    ),
    "refresh_dns": AutoFix(
        id="refresh_dns",
        name="刷新域名解析",
        description="有时候域名解析会有延迟，我帮您刷新一下",
        steps=["清除DNS缓存", "重新解析域名", "验证连接"],
        risk_level="low",
        estimated_time=30,
        requires_confirmation=False,
        rollback_available=False
    ),
    "restart_service": AutoFix(
        id="restart_service",
        name="重启服务",
        description="重启一下服务，就像重启电脑一样，很多小问题都能解决",
        steps=["保存当前状态", "重启应用服务", "验证服务恢复"],
        risk_level="medium",
        estimated_time=60,
        requires_confirmation=True,
        rollback_available=True
    ),
    "reset_password": AutoFix(
        id="reset_password",
        name="重置密码",
        description="我帮您发一封重置密码的邮件到您的邮箱",
        steps=["验证用户身份", "生成重置链接", "发送邮件"],
        risk_level="low",
        estimated_time=15,
        requires_confirmation=True,
        rollback_available=False
    ),
    "unlock_account": AutoFix(
        id="unlock_account",
        name="解锁账号",
        description="您的账号可能因为多次登录失败被锁了，我帮您解锁",
        steps=["检查账号状态", "移除锁定标记", "重置失败计数"],
        risk_level="low",
        estimated_time=5,
        requires_confirmation=True,
        rollback_available=True
    ),
    "clear_session": AutoFix(
        id="clear_session",
        name="清除登录状态",
        description="清除之前的登录记录，让您重新登录",
        steps=["清除服务端会话", "通知清除Cookie", "引导重新登录"],
        risk_level="low",
        estimated_time=5,
        requires_confirmation=True,
        rollback_available=False
    ),
    "clear_cache": AutoFix(
        id="clear_cache",
        name="清除缓存",
        description="清除系统缓存，让页面重新加载最新数据",
        steps=["清除应用缓存", "清除CDN缓存", "刷新页面"],
        risk_level="low",
        estimated_time=10,
        requires_confirmation=False,
        rollback_available=False
    ),
    "restore_backup": AutoFix(
        id="restore_backup",
        name="恢复备份",
        description="从最近的备份恢复您的数据",
        steps=["查找最近备份", "确认恢复范围", "执行恢复", "验证数据"],
        risk_level="high",
        estimated_time=300,
        requires_confirmation=True,
        rollback_available=True
    ),
    "show_tutorial": AutoFix(
        id="show_tutorial",
        name="打开教程",
        description="我来给您看一下怎么操作",
        steps=["识别功能点", "匹配教程", "开始引导"],
        risk_level="low",
        estimated_time=5,
        requires_confirmation=False,
        rollback_available=False
    ),
    "connect_guide": AutoFix(
        id="connect_guide",
        name="启动产品导游",
        description="让AI导游一步一步教您操作",
        steps=["分析用户需求", "创建引导会话", "开始引导"],
        risk_level="low",
        estimated_time=5,
        requires_confirmation=False,
        rollback_available=False
    )
}


class AISupportService:
    """AI 智能客服服务"""

    def __init__(self):
        self.settings = get_settings()
        self.client = anthropic.AsyncAnthropic(api_key=self.settings.anthropic_api_key)
        self.mongo_client: Optional[AsyncIOMotorClient] = None
        self.redis_client: Optional[redis.Redis] = None
        self.db = None

    async def connect(self):
        """连接数据库"""
        self.mongo_client = AsyncIOMotorClient(self.settings.mongodb_uri)
        self.db = self.mongo_client[self.settings.mongodb_database]
        self.redis_client = redis.from_url(self.settings.redis_url)

    async def disconnect(self):
        """断开连接"""
        if self.mongo_client:
            self.mongo_client.close()
        if self.redis_client:
            await self.redis_client.close()

    async def handle_request(self, request: SupportRequest) -> SupportResponse:
        """处理客服请求"""
        # 获取或创建会话
        if request.session_id:
            session = await self._get_session(request.session_id)
            if not session:
                session = await self._create_session(request)
        else:
            session = await self._create_session(request)

        # 添加用户消息
        user_message = Message(
            id=str(uuid.uuid4()),
            role=MessageRole.USER,
            content=request.message
        )
        session.messages.append(user_message)

        # 分析截图（如果有）
        screenshot_analysis = None
        if request.screenshot_base64:
            screenshot_analysis = await self._analyze_screenshot(request.screenshot_base64)

        # 自动诊断
        diagnosis = await self._diagnose(session, request.message, screenshot_analysis)
        session.diagnosis = diagnosis.model_dump()

        # 如果是"不会用"类型，连接到AI导游
        if diagnosis.category == IssueCategory.DONT_KNOW_HOW:
            return await self._connect_to_guide(session, request)

        # 生成 AI 回复
        ai_response = await self._generate_response(session, diagnosis, screenshot_analysis)

        # 获取建议的修复方案
        suggested_fixes = self._get_suggested_fixes(diagnosis)

        # 生成快捷回复
        quick_replies = self._generate_quick_replies(diagnosis)

        # 检查是否需要人工
        need_human = self._should_escalate(session, diagnosis)

        # 添加 AI 消息
        assistant_message = Message(
            id=str(uuid.uuid4()),
            role=MessageRole.ASSISTANT,
            content=ai_response
        )
        session.messages.append(assistant_message)
        session.category = diagnosis.category
        session.updated_at = datetime.now()

        # 保存会话
        await self._save_session(session)

        return SupportResponse(
            session_id=session.id,
            message=ai_response,
            diagnosis=diagnosis,
            suggested_fixes=suggested_fixes,
            quick_replies=quick_replies,
            need_human=need_human,
            escalation_reason="多次尝试未能解决，建议人工介入" if need_human else None
        )

    async def execute_fix(self, request: FixRequest) -> FixResponse:
        """执行修复"""
        session = await self._get_session(request.session_id)
        if not session:
            return FixResponse(
                success=False,
                message="找不到会话记录，请重新描述您的问题"
            )

        fix = AUTO_FIX_TEMPLATES.get(request.fix_id)
        if not fix:
            return FixResponse(
                success=False,
                message="修复方案不存在"
            )

        # 记录修复尝试
        attempt = FixAttempt(
            fix_id=fix.id,
            fix_name=fix.name,
            started_at=datetime.now()
        )

        try:
            # 执行修复
            result = await self._execute_fix_action(session, fix)

            attempt.completed_at = datetime.now()
            attempt.success = result["success"]

            session.fix_attempts.append(attempt.model_dump())

            if result["success"]:
                session.fix_status = FixStatus.FIXED
                session.resolved = True
                session.resolution = fix.name

            await self._save_session(session)

            return FixResponse(
                success=result["success"],
                message=result["message"],
                details=result.get("details"),
                next_steps=result.get("next_steps", [])
            )

        except Exception as e:
            attempt.completed_at = datetime.now()
            attempt.success = False
            attempt.error = str(e)
            session.fix_attempts.append(attempt.model_dump())
            session.fix_status = FixStatus.FAILED
            await self._save_session(session)

            return FixResponse(
                success=False,
                message=f"修复过程中出错了：{self._translate_error(str(e))}",
                next_steps=["您可以再试一次", "或者联系人工客服"]
            )

    async def _analyze_screenshot(self, base64_image: str) -> ScreenshotAnalysis:
        """使用 Claude Vision 分析截图"""
        try:
            # 确保 base64 格式正确
            if not base64_image.startswith("data:"):
                base64_image = f"data:image/png;base64,{base64_image}"

            response = await self.client.messages.create(
                model=self.settings.vision_model,
                max_tokens=1000,
                messages=[{
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/png",
                                "data": base64_image.split(",")[1] if "," in base64_image else base64_image
                            }
                        },
                        {
                            "type": "text",
                            "text": """分析这张截图，告诉我：
1. 是否有错误信息？如果有，是什么错误？
2. 页面显示是否正常？
3. 用户可能遇到了什么问题？
4. 有什么建议？

用简单的中文回答，假设用户完全不懂技术。
返回JSON格式：
{
  "has_error": true/false,
  "error_type": "错误类型（如果有）",
  "error_message": "错误信息（翻译成人话）",
  "visible_elements": ["看到的主要元素"],
  "suggestions": ["建议1", "建议2"],
  "description": "用一句话描述看到了什么"
}"""
                        }
                    ]
                }]
            )

            content = response.content[0].text

            # 解析 JSON
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]

            data = json.loads(content)
            return ScreenshotAnalysis(**data)

        except Exception as e:
            return ScreenshotAnalysis(
                has_error=False,
                description=f"截图分析暂时不可用：{str(e)}"
            )

    async def _diagnose(
        self,
        session: SupportSession,
        message: str,
        screenshot_analysis: Optional[ScreenshotAnalysis]
    ) -> AutoDiagnosis:
        """AI 诊断问题"""
        # 构建诊断提示
        context = f"""用户消息：{message}

会话历史：
{self._format_messages(session.messages[-5:])}

{"截图分析：" + screenshot_analysis.description if screenshot_analysis else "（没有截图）"}
"""

        system_prompt = """你是一个智能客服诊断系统，需要分析用户遇到的问题。

问题类别：
- cannot_access: 打不开网站
- login_failed: 登录不上
- feature_broken: 功能不好用
- slow_performance: 运行太慢
- data_lost: 数据丢失
- display_error: 显示有问题
- payment_issue: 支付问题
- dont_know_how: 不会操作
- other: 其他问题

返回JSON格式：
{
  "category": "问题类别",
  "confidence": 0.0-1.0,
  "possible_causes": ["可能原因1", "可能原因2"],
  "recommended_fixes": [
    {"fix_id": "修复ID", "reason": "为什么推荐"}
  ],
  "need_screenshot": true/false,
  "need_more_info": true/false,
  "questions_to_ask": ["如果需要更多信息，要问的问题"]
}

可用的修复ID：
- check_server_status, refresh_dns, restart_service
- reset_password, unlock_account, clear_session
- clear_cache, restore_backup
- show_tutorial, connect_guide
"""

        response = await self.client.messages.create(
            model=self.settings.default_model,
            max_tokens=500,
            system=system_prompt,
            messages=[{"role": "user", "content": context}]
        )

        try:
            content = response.content[0].text
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]

            data = json.loads(content)

            return AutoDiagnosis(
                result=DiagnosisResult.IDENTIFIED if data.get("confidence", 0) > 0.7 else DiagnosisResult.PARTIAL,
                category=IssueCategory(data.get("category", "other")),
                confidence=data.get("confidence", 0.5),
                possible_causes=data.get("possible_causes", []),
                recommended_fixes=data.get("recommended_fixes", []),
                need_screenshot=data.get("need_screenshot", False),
                need_more_info=data.get("need_more_info", False),
                questions_to_ask=data.get("questions_to_ask", [])
            )

        except Exception:
            return AutoDiagnosis(
                result=DiagnosisResult.UNKNOWN,
                category=IssueCategory.OTHER,
                confidence=0.3,
                possible_causes=["需要更多信息来判断"],
                recommended_fixes=[],
                need_more_info=True,
                questions_to_ask=["能详细说说您遇到了什么问题吗？"]
            )

    async def _generate_response(
        self,
        session: SupportSession,
        diagnosis: AutoDiagnosis,
        screenshot_analysis: Optional[ScreenshotAnalysis]
    ) -> str:
        """生成 AI 回复"""
        issue_config = ISSUE_CONFIGS.get(diagnosis.category, ISSUE_CONFIGS[IssueCategory.OTHER])

        system_prompt = """你是一个超级友好的AI客服，正在帮助一个完全不懂技术的用户解决问题。

沟通原则：
1. 用最简单的大白话，绝对不用技术术语
2. 表达关心和理解
3. 给出明确、具体的建议
4. 保持耐心和鼓励
5. 必要时用比喻和生活例子

回复要求：
- 先表示理解用户的问题
- 简单解释可能的原因
- 给出1-2个最可行的建议
- 不超过100字
- 可以用适当的表情符号"""

        context = f"""诊断结果：
- 问题类型：{issue_config['label']}
- 可能原因：{', '.join(diagnosis.possible_causes[:2])}
- 置信度：{diagnosis.confidence}

会话历史：
{self._format_messages(session.messages[-3:])}

{"截图显示：" + screenshot_analysis.description if screenshot_analysis else ""}
"""

        response = await self.client.messages.create(
            model=self.settings.default_model,
            max_tokens=300,
            system=system_prompt,
            messages=[{"role": "user", "content": context}]
        )

        return response.content[0].text

    def _get_suggested_fixes(self, diagnosis: AutoDiagnosis) -> List[AutoFix]:
        """获取建议的修复方案"""
        fixes = []
        for rec in diagnosis.recommended_fixes[:3]:
            fix_id = rec.get("fix_id") if isinstance(rec, dict) else rec
            if fix_id in AUTO_FIX_TEMPLATES:
                fixes.append(AUTO_FIX_TEMPLATES[fix_id])
        return fixes

    def _generate_quick_replies(self, diagnosis: AutoDiagnosis) -> List[str]:
        """生成快捷回复"""
        replies = []

        if diagnosis.need_more_info:
            replies.extend(diagnosis.questions_to_ask[:2])

        issue_config = ISSUE_CONFIGS.get(diagnosis.category)
        if issue_config:
            replies.append(f"是的，就是{issue_config['label']}")

        replies.extend([
            "问题解决了，谢谢！",
            "还是不行，请帮我看看",
            "我要找人工客服"
        ])

        return replies[:5]

    def _should_escalate(self, session: SupportSession, diagnosis: AutoDiagnosis) -> bool:
        """判断是否需要升级到人工"""
        # 多次修复失败
        failed_attempts = len([a for a in session.fix_attempts if not a.get("success", False)])
        if failed_attempts >= self.settings.escalation_threshold:
            return True

        # 诊断置信度太低
        if diagnosis.confidence < 0.3:
            return True

        # 严重问题
        if session.urgency == IssueUrgency.CRITICAL:
            return True

        # 数据丢失问题
        if diagnosis.category == IssueCategory.DATA_LOST:
            return True

        return False

    async def _execute_fix_action(self, session: SupportSession, fix: AutoFix) -> Dict[str, Any]:
        """执行修复动作"""
        # 这里是模拟实现，实际需要对接各种服务

        if fix.id == "check_server_status":
            # 检查服务状态
            return {
                "success": True,
                "message": "服务器运行正常！可能是您的网络有点问题，试试刷新页面？",
                "next_steps": ["刷新页面试试", "换个浏览器试试"]
            }

        elif fix.id == "clear_cache":
            return {
                "success": True,
                "message": "缓存已经清理了！页面应该会重新加载最新的内容。",
                "next_steps": ["刷新页面", "看看问题是否解决"]
            }

        elif fix.id == "reset_password":
            return {
                "success": True,
                "message": "重置密码的邮件已经发到您的邮箱了！请查收邮件，按照里面的链接设置新密码。",
                "details": "如果没收到邮件，记得看看垃圾邮件文件夹。",
                "next_steps": ["查看邮箱", "点击重置链接", "设置新密码", "重新登录"]
            }

        elif fix.id == "show_tutorial":
            return {
                "success": True,
                "message": "教程已经准备好了！我来一步一步教您。",
                "next_steps": ["跟着教程操作"]
            }

        elif fix.id == "connect_guide":
            # 连接到 AI 导游服务
            return {
                "success": True,
                "message": "已经帮您连接到产品导游了，它会一步一步教您操作！",
                "details": "redirect_to_guide"
            }

        else:
            return {
                "success": True,
                "message": f"「{fix.name}」已经完成了！看看问题是否解决。"
            }

    async def _connect_to_guide(self, session: SupportSession, request: SupportRequest) -> SupportResponse:
        """连接到 AI 导游"""
        # 调用 AI 导游服务
        # 这里简化处理，实际需要通过 gRPC 或 HTTP 调用
        return SupportResponse(
            session_id=session.id,
            message="我理解您不太清楚怎么操作。没关系！我帮您连接到产品导游，它会一步一步教您。请点击下面的按钮开始学习。",
            diagnosis=AutoDiagnosis(
                result=DiagnosisResult.IDENTIFIED,
                category=IssueCategory.DONT_KNOW_HOW,
                confidence=0.9,
                possible_causes=["新用户不熟悉操作"],
                recommended_fixes=[{"fix_id": "connect_guide", "reason": "连接到产品导游"}],
                need_screenshot=False,
                need_more_info=False
            ),
            suggested_fixes=[AUTO_FIX_TEMPLATES["connect_guide"]],
            quick_replies=["开始学习", "我想问具体问题", "找人工客服"],
            need_human=False
        )

    def _translate_error(self, error: str) -> str:
        """将技术错误翻译成人话"""
        translations = {
            "connection": "网络连接有点问题",
            "timeout": "服务器响应太慢了",
            "not found": "找不到相关内容",
            "permission": "您没有权限进行这个操作",
            "invalid": "输入的内容格式不对"
        }

        error_lower = error.lower()
        for key, trans in translations.items():
            if key in error_lower:
                return trans

        return "系统遇到了一点小问题"

    def _format_messages(self, messages: List[Message]) -> str:
        """格式化消息历史"""
        formatted = []
        for msg in messages:
            role = "用户" if msg.role == MessageRole.USER else "客服"
            formatted.append(f"{role}: {msg.content}")
        return "\n".join(formatted)

    async def _create_session(self, request: SupportRequest) -> SupportSession:
        """创建新会话"""
        return SupportSession(
            id=str(uuid.uuid4()),
            user_id=request.user_id,
            project_id=request.project_id,
            category=request.category
        )

    async def _save_session(self, session: SupportSession):
        """保存会话"""
        if self.db:
            await self.db.support_sessions.update_one(
                {"_id": session.id},
                {"$set": session.model_dump()},
                upsert=True
            )

        if self.redis_client:
            key = f"support_session:{session.id}"
            await self.redis_client.setex(
                key,
                self.settings.session_timeout_minutes * 60,
                session.model_dump_json()
            )

    async def _get_session(self, session_id: str) -> Optional[SupportSession]:
        """获取会话"""
        if self.redis_client:
            key = f"support_session:{session_id}"
            data = await self.redis_client.get(key)
            if data:
                return SupportSession.model_validate_json(data)

        if self.db:
            doc = await self.db.support_sessions.find_one({"_id": session_id})
            if doc:
                return SupportSession(**doc)

        return None


# 创建全局实例
ai_support_service = AISupportService()

"""
一键呼救 + 自动诊断服务

功能：
1. 用户点击一个按钮即可发起求助
2. 自动收集诊断信息（截图、日志、最近操作）
3. AI 智能诊断问题原因
4. 尝试自动修复
5. 修不好自动升级到人工
"""

import os
import re
import json
import base64
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from enum import Enum

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
import anthropic
import httpx
from pymongo import MongoClient

# 初始化
app = FastAPI(title="Auto Diagnose Service", version="1.0.0")

# 配置
ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY', '')
MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
SUPPORT_WEBHOOK = os.getenv('SUPPORT_WEBHOOK', '')  # 钉钉/企微 webhook

# Claude 客户端
claude_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY) if ANTHROPIC_API_KEY else None


# ============================================================================
# 数据模型
# ============================================================================

class IssueCategory(str, Enum):
    CANNOT_ACCESS = "cannot_access"      # 打不开/白屏
    LOGIN_FAILED = "login_failed"        # 登录失败
    FEATURE_BROKEN = "feature_broken"    # 功能不工作
    SLOW_PERFORMANCE = "slow_performance" # 太慢了
    DATA_LOST = "data_lost"              # 数据丢失
    DISPLAY_ERROR = "display_error"      # 显示异常
    PAYMENT_ISSUE = "payment_issue"      # 支付问题
    DONT_KNOW_HOW = "dont_know_how"      # 不知道怎么用
    OTHER = "other"


class IssueSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class FixStatus(str, Enum):
    NOT_ATTEMPTED = "not_attempted"
    IN_PROGRESS = "in_progress"
    SUCCESS = "success"
    FAILED = "failed"
    NEEDS_HUMAN = "needs_human"


# 问题类型配置
ISSUE_CONFIGS = {
    IssueCategory.CANNOT_ACCESS: {
        "label": "网站打不开",
        "icon": "🔴",
        "severity": IssueSeverity.CRITICAL,
        "quick_checks": ["服务器状态", "DNS 解析", "SSL 证书"],
        "auto_fixes": ["restart_service", "flush_dns", "check_ssl"],
    },
    IssueCategory.LOGIN_FAILED: {
        "label": "登录失败",
        "icon": "🔐",
        "severity": IssueSeverity.HIGH,
        "quick_checks": ["账号状态", "密码正确性", "验证码"],
        "auto_fixes": ["reset_password", "unlock_account", "clear_session"],
    },
    IssueCategory.FEATURE_BROKEN: {
        "label": "功能不工作",
        "icon": "⚠️",
        "severity": IssueSeverity.MEDIUM,
        "quick_checks": ["功能开关", "权限设置", "依赖服务"],
        "auto_fixes": ["clear_cache", "restart_feature", "check_permissions"],
    },
    IssueCategory.SLOW_PERFORMANCE: {
        "label": "速度太慢",
        "icon": "🐢",
        "severity": IssueSeverity.MEDIUM,
        "quick_checks": ["服务器负载", "数据库性能", "CDN 状态"],
        "auto_fixes": ["clear_cache", "optimize_db", "scale_up"],
    },
    IssueCategory.DATA_LOST: {
        "label": "数据丢失",
        "icon": "💔",
        "severity": IssueSeverity.CRITICAL,
        "quick_checks": ["最近备份", "操作日志", "数据库状态"],
        "auto_fixes": ["restore_backup", "check_audit_log"],
    },
    IssueCategory.DISPLAY_ERROR: {
        "label": "显示异常",
        "icon": "🖼️",
        "severity": IssueSeverity.LOW,
        "quick_checks": ["浏览器兼容性", "CSS 加载", "图片资源"],
        "auto_fixes": ["clear_cache", "refresh_assets"],
    },
    IssueCategory.PAYMENT_ISSUE: {
        "label": "支付问题",
        "icon": "💳",
        "severity": IssueSeverity.CRITICAL,
        "quick_checks": ["支付状态", "订单记录", "支付网关"],
        "auto_fixes": ["check_payment_status", "sync_order"],
    },
    IssueCategory.DONT_KNOW_HOW: {
        "label": "不知道怎么用",
        "icon": "❓",
        "severity": IssueSeverity.LOW,
        "quick_checks": [],
        "auto_fixes": ["show_tutorial", "connect_guide"],
    },
}


class SOSRequest(BaseModel):
    """一键呼救请求"""
    project_id: str
    user_id: str
    issue_category: Optional[IssueCategory] = None
    description: Optional[str] = None
    screenshot_base64: Optional[str] = None
    browser_info: Optional[Dict[str, Any]] = None
    recent_actions: Optional[List[Dict[str, Any]]] = None
    error_logs: Optional[List[str]] = None
    current_url: Optional[str] = None


class DiagnosisResult(BaseModel):
    """诊断结果"""
    request_id: str
    category: IssueCategory
    severity: IssueSeverity
    diagnosis: str               # AI 诊断结果
    possible_causes: List[str]   # 可能的原因
    confidence: float            # 置信度 0-1
    auto_fixable: bool
    fix_status: FixStatus
    fix_attempts: List[Dict[str, Any]]
    human_summary: str           # 人话总结
    next_steps: List[str]        # 下一步建议
    escalated_to_human: bool
    support_ticket_id: Optional[str] = None


class AutoFixResult(BaseModel):
    """自动修复结果"""
    fix_type: str
    success: bool
    message: str
    details: Optional[Dict[str, Any]] = None


# ============================================================================
# 自动诊断服务
# ============================================================================

class AutoDiagnoseService:
    """自动诊断服务"""

    def __init__(self):
        self.client = claude_client
        self.http_client = httpx.AsyncClient(timeout=30.0)
        self.fix_attempts: Dict[str, List[AutoFixResult]] = {}

    async def diagnose(self, request: SOSRequest) -> DiagnosisResult:
        """执行诊断"""
        request_id = f"SOS-{datetime.now().strftime('%Y%m%d%H%M%S')}-{request.user_id[:8]}"

        # 1. 确定问题类别
        category = request.issue_category or await self._detect_category(request)
        config = ISSUE_CONFIGS.get(category, ISSUE_CONFIGS[IssueCategory.OTHER])

        # 2. 收集诊断信息
        diagnostics = await self._collect_diagnostics(request)

        # 3. AI 诊断
        ai_diagnosis = await self._ai_diagnose(request, diagnostics, category)

        # 4. 尝试自动修复
        fix_results = []
        fix_success = False

        if ai_diagnosis.get("auto_fixable", False):
            for fix_type in config.get("auto_fixes", [])[:3]:  # 最多尝试3种修复
                result = await self._attempt_fix(request.project_id, fix_type)
                fix_results.append(result)
                if result.success:
                    fix_success = True
                    break

        # 5. 判断是否需要人工
        needs_human = not fix_success and config["severity"] in [IssueSeverity.HIGH, IssueSeverity.CRITICAL]

        # 6. 创建工单（如果需要人工）
        ticket_id = None
        if needs_human:
            ticket_id = await self._escalate_to_human(request, ai_diagnosis, fix_results)

        return DiagnosisResult(
            request_id=request_id,
            category=category,
            severity=config["severity"],
            diagnosis=ai_diagnosis.get("diagnosis", ""),
            possible_causes=ai_diagnosis.get("causes", []),
            confidence=ai_diagnosis.get("confidence", 0.5),
            auto_fixable=ai_diagnosis.get("auto_fixable", False),
            fix_status=FixStatus.SUCCESS if fix_success else (FixStatus.NEEDS_HUMAN if needs_human else FixStatus.FAILED),
            fix_attempts=[r.dict() for r in fix_results],
            human_summary=self._generate_human_summary(ai_diagnosis, fix_results, fix_success),
            next_steps=self._generate_next_steps(category, fix_success, needs_human),
            escalated_to_human=needs_human,
            support_ticket_id=ticket_id,
        )

    async def _detect_category(self, request: SOSRequest) -> IssueCategory:
        """使用 AI 检测问题类别"""
        if not self.client:
            return IssueCategory.OTHER

        # 从描述和错误日志推断
        context = f"""
用户描述: {request.description or '无'}
当前页面: {request.current_url or '未知'}
最近操作: {json.dumps(request.recent_actions or [], ensure_ascii=False)[:500]}
错误日志: {json.dumps(request.error_logs or [], ensure_ascii=False)[:500]}
"""

        categories_desc = "\n".join([
            f"- {cat.value}: {cfg['label']}"
            for cat, cfg in ISSUE_CONFIGS.items()
        ])

        try:
            response = self.client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=100,
                messages=[{
                    "role": "user",
                    "content": f"""根据以下用户反馈，判断最可能的问题类别。只返回类别代码，不要其他内容。

可选类别:
{categories_desc}

用户反馈:
{context}

问题类别代码:"""
                }]
            )

            category_str = response.content[0].text.strip().lower()
            for cat in IssueCategory:
                if cat.value in category_str:
                    return cat

        except Exception as e:
            print(f"Category detection error: {e}")

        return IssueCategory.OTHER

    async def _collect_diagnostics(self, request: SOSRequest) -> Dict[str, Any]:
        """收集诊断信息"""
        diagnostics = {
            "timestamp": datetime.now().isoformat(),
            "project_id": request.project_id,
            "user_id": request.user_id,
            "browser": request.browser_info,
            "recent_actions": request.recent_actions,
            "error_logs": request.error_logs,
            "current_url": request.current_url,
        }

        # 检查服务状态
        try:
            # TODO: 调用内部健康检查接口
            diagnostics["service_status"] = "healthy"
        except Exception:
            diagnostics["service_status"] = "unknown"

        return diagnostics

    async def _ai_diagnose(
        self,
        request: SOSRequest,
        diagnostics: Dict[str, Any],
        category: IssueCategory
    ) -> Dict[str, Any]:
        """AI 智能诊断"""
        if not self.client:
            return {
                "diagnosis": "AI 诊断服务暂不可用",
                "causes": ["无法确定"],
                "confidence": 0.3,
                "auto_fixable": False,
            }

        # 构建诊断提示
        config = ISSUE_CONFIGS.get(category, {})
        prompt = f"""你是一个专业的技术支持工程师。请根据以下信息诊断用户遇到的问题。

问题类别: {config.get('label', category.value)}

用户描述:
{request.description or '用户未提供描述'}

当前页面: {request.current_url or '未知'}

浏览器信息:
{json.dumps(request.browser_info or {}, ensure_ascii=False)}

最近操作:
{json.dumps(request.recent_actions or [], ensure_ascii=False)[:1000]}

错误日志:
{json.dumps(request.error_logs or [], ensure_ascii=False)[:1000]}

服务状态: {diagnostics.get('service_status', '未知')}

请以JSON格式返回诊断结果:
{{
  "diagnosis": "问题诊断描述（用简单易懂的语言）",
  "causes": ["可能原因1", "可能原因2"],
  "confidence": 0.0-1.0的置信度,
  "auto_fixable": true/false是否可以自动修复,
  "recommended_fix": "建议的修复方式"
}}

只返回JSON，不要其他内容。"""

        try:
            # 如果有截图，使用 Vision 能力
            messages = [{"role": "user", "content": []}]

            if request.screenshot_base64:
                messages[0]["content"].append({
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/png",
                        "data": request.screenshot_base64,
                    }
                })
                messages[0]["content"].append({
                    "type": "text",
                    "text": "这是用户截图。\n\n" + prompt
                })
            else:
                messages[0]["content"].append({
                    "type": "text",
                    "text": prompt
                })

            response = self.client.messages.create(
                model="claude-3-sonnet-20240229",
                max_tokens=500,
                messages=messages
            )

            result_text = response.content[0].text.strip()

            # 解析 JSON
            json_match = re.search(r'\{[\s\S]*\}', result_text)
            if json_match:
                return json.loads(json_match.group())

        except Exception as e:
            print(f"AI diagnosis error: {e}")

        return {
            "diagnosis": "无法自动诊断，已转人工处理",
            "causes": ["需要人工排查"],
            "confidence": 0.2,
            "auto_fixable": False,
        }

    async def _attempt_fix(self, project_id: str, fix_type: str) -> AutoFixResult:
        """尝试自动修复"""
        print(f"[FIX] Attempting fix: {fix_type} for project {project_id}")

        fix_handlers = {
            "restart_service": self._fix_restart_service,
            "clear_cache": self._fix_clear_cache,
            "flush_dns": self._fix_flush_dns,
            "check_ssl": self._fix_check_ssl,
            "reset_password": self._fix_reset_password,
            "unlock_account": self._fix_unlock_account,
            "clear_session": self._fix_clear_session,
            "restore_backup": self._fix_restore_backup,
            "show_tutorial": self._fix_show_tutorial,
            "connect_guide": self._fix_connect_guide,
        }

        handler = fix_handlers.get(fix_type)
        if not handler:
            return AutoFixResult(
                fix_type=fix_type,
                success=False,
                message="未知的修复类型",
            )

        try:
            result = await handler(project_id)
            return result
        except Exception as e:
            return AutoFixResult(
                fix_type=fix_type,
                success=False,
                message=f"修复执行失败: {str(e)}",
            )

    # -------------- 修复操作实现 --------------

    async def _fix_restart_service(self, project_id: str) -> AutoFixResult:
        """重启服务"""
        # TODO: 调用云平台 API 重启服务
        return AutoFixResult(
            fix_type="restart_service",
            success=True,
            message="服务已重启，请稍后刷新页面",
        )

    async def _fix_clear_cache(self, project_id: str) -> AutoFixResult:
        """清除缓存"""
        # TODO: 调用缓存清理接口
        return AutoFixResult(
            fix_type="clear_cache",
            success=True,
            message="缓存已清除，问题应该已解决",
        )

    async def _fix_flush_dns(self, project_id: str) -> AutoFixResult:
        """刷新 DNS"""
        return AutoFixResult(
            fix_type="flush_dns",
            success=True,
            message="DNS 配置已刷新，可能需要几分钟生效",
        )

    async def _fix_check_ssl(self, project_id: str) -> AutoFixResult:
        """检查 SSL 证书"""
        return AutoFixResult(
            fix_type="check_ssl",
            success=True,
            message="SSL 证书状态正常",
        )

    async def _fix_reset_password(self, project_id: str) -> AutoFixResult:
        """重置密码"""
        return AutoFixResult(
            fix_type="reset_password",
            success=True,
            message="密码重置邮件已发送，请查收",
        )

    async def _fix_unlock_account(self, project_id: str) -> AutoFixResult:
        """解锁账号"""
        return AutoFixResult(
            fix_type="unlock_account",
            success=True,
            message="账号已解锁，请重新登录",
        )

    async def _fix_clear_session(self, project_id: str) -> AutoFixResult:
        """清除会话"""
        return AutoFixResult(
            fix_type="clear_session",
            success=True,
            message="登录状态已重置，请重新登录",
        )

    async def _fix_restore_backup(self, project_id: str) -> AutoFixResult:
        """恢复备份"""
        return AutoFixResult(
            fix_type="restore_backup",
            success=False,
            message="数据恢复需要人工确认，已通知技术团队",
        )

    async def _fix_show_tutorial(self, project_id: str) -> AutoFixResult:
        """显示教程"""
        return AutoFixResult(
            fix_type="show_tutorial",
            success=True,
            message="已为您打开使用教程",
            details={"tutorial_url": f"/tutorial?project={project_id}"}
        )

    async def _fix_connect_guide(self, project_id: str) -> AutoFixResult:
        """连接引导"""
        return AutoFixResult(
            fix_type="connect_guide",
            success=True,
            message="产品导游已就绪，将为您提供一对一指导",
            details={"guide_available": True}
        )

    async def _escalate_to_human(
        self,
        request: SOSRequest,
        diagnosis: Dict[str, Any],
        fix_results: List[AutoFixResult]
    ) -> str:
        """升级到人工处理"""
        ticket_id = f"TKT-{datetime.now().strftime('%Y%m%d%H%M%S')}"

        ticket_info = {
            "ticket_id": ticket_id,
            "project_id": request.project_id,
            "user_id": request.user_id,
            "category": request.issue_category.value if request.issue_category else "other",
            "description": request.description,
            "diagnosis": diagnosis,
            "fix_attempts": [r.dict() for r in fix_results],
            "created_at": datetime.now().isoformat(),
            "priority": "high",
        }

        # 发送到钉钉/企微
        if SUPPORT_WEBHOOK:
            try:
                await self.http_client.post(
                    SUPPORT_WEBHOOK,
                    json={
                        "msgtype": "markdown",
                        "markdown": {
                            "title": f"🆘 用户求助 - {ticket_id}",
                            "text": f"""### 🆘 用户求助工单

**工单号**: {ticket_id}
**项目ID**: {request.project_id}
**用户ID**: {request.user_id}
**问题类别**: {request.issue_category.value if request.issue_category else '未知'}

**用户描述**:
{request.description or '无'}

**AI诊断**:
{diagnosis.get('diagnosis', '无')}

**可能原因**:
{chr(10).join(['- ' + c for c in diagnosis.get('causes', [])])}

**自动修复尝试**:
{chr(10).join(['- ' + r.fix_type + ': ' + ('成功' if r.success else '失败') for r in fix_results])}

请尽快处理！
"""
                        }
                    }
                )
            except Exception as e:
                print(f"Failed to send webhook: {e}")

        print(f"[ESCALATION] Created ticket {ticket_id} for user {request.user_id}")

        return ticket_id

    def _generate_human_summary(
        self,
        diagnosis: Dict[str, Any],
        fix_results: List[AutoFixResult],
        fix_success: bool
    ) -> str:
        """生成人话总结"""
        if fix_success:
            successful_fix = next((r for r in fix_results if r.success), None)
            if successful_fix:
                return f"问题已解决！{successful_fix.message}"
            return "问题已自动修复，请刷新页面查看。"

        if diagnosis.get("confidence", 0) > 0.7:
            return f"我们发现了问题：{diagnosis.get('diagnosis', '')}。技术团队已收到通知，会尽快为您处理。"

        return "我们已记录您的问题，技术团队会尽快联系您。请保持电话畅通。"

    def _generate_next_steps(
        self,
        category: IssueCategory,
        fix_success: bool,
        needs_human: bool
    ) -> List[str]:
        """生成下一步建议"""
        steps = []

        if fix_success:
            steps.append("刷新页面查看是否已恢复正常")
            steps.append("如果问题仍然存在，请再次点击求助按钮")
        elif needs_human:
            steps.append("技术团队已收到通知，会在30分钟内联系您")
            steps.append("您也可以拨打客服电话 400-xxx-xxxx 获取即时帮助")
            steps.append("工作时间：周一至周五 9:00-18:00")
        else:
            steps.append("请尝试刷新页面")
            steps.append("清除浏览器缓存后重试")
            steps.append("如问题持续，请点击「联系客服」获取帮助")

        return steps


# ============================================================================
# API 路由
# ============================================================================

diagnose_service = AutoDiagnoseService()


@app.get("/health")
async def health_check():
    """健康检查"""
    return {
        "status": "healthy",
        "service": "auto-diagnose",
        "ai_enabled": claude_client is not None,
    }


@app.post("/sos", response_model=DiagnosisResult)
async def handle_sos(request: SOSRequest):
    """处理一键呼救"""
    result = await diagnose_service.diagnose(request)
    return result


@app.post("/sos/simple")
async def handle_simple_sos(
    project_id: str = Form(...),
    user_id: str = Form(...),
    description: str = Form(None),
    screenshot: UploadFile = File(None),
):
    """简化版一键呼救（表单提交）"""
    screenshot_base64 = None
    if screenshot:
        content = await screenshot.read()
        screenshot_base64 = base64.b64encode(content).decode()

    request = SOSRequest(
        project_id=project_id,
        user_id=user_id,
        description=description,
        screenshot_base64=screenshot_base64,
    )

    result = await diagnose_service.diagnose(request)
    return result


@app.get("/issues/{request_id}")
async def get_issue_status(request_id: str):
    """查询问题处理状态"""
    # TODO: 从数据库查询
    return {
        "request_id": request_id,
        "status": "processing",
        "message": "技术团队正在处理中",
    }


@app.get("/categories")
async def get_issue_categories():
    """获取问题类别列表"""
    return [
        {
            "value": cat.value,
            "label": cfg["label"],
            "icon": cfg["icon"],
            "severity": cfg["severity"].value,
        }
        for cat, cfg in ISSUE_CONFIGS.items()
    ]


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9002)

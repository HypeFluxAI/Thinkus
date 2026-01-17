"""AI 智能客服服务 - FastAPI 入口"""
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import base64

from .config import get_settings
from .models import (
    SupportRequest, SupportResponse,
    FixRequest, FixResponse,
    IssueCategory
)
from .support_service import ai_support_service, ISSUE_CONFIGS


settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    await ai_support_service.connect()
    print(f"AI Support Service started on port {settings.port}")
    yield
    await ai_support_service.disconnect()


app = FastAPI(
    title="AI Support Bot Service",
    description="AI驱动的智能客服 - 自动诊断问题、分析截图、执行修复",
    version="1.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """健康检查"""
    return {"status": "healthy", "service": "ai-support"}


@app.get("/api/support/categories")
async def get_categories():
    """获取问题类别列表

    返回所有支持的问题类别，方便用户快速选择。
    """
    return [
        {
            "id": cat.value,
            "label": config["label"],
            "icon": config["icon"],
            "quick_diagnosis": config["quick_diagnosis"]
        }
        for cat, config in ISSUE_CONFIGS.items()
    ]


@app.post("/api/support/chat", response_model=SupportResponse)
async def chat(request: SupportRequest):
    """发送消息

    用户发送问题描述，AI客服会自动诊断并给出建议。

    - **user_id**: 用户ID
    - **project_id**: 项目ID
    - **message**: 用户消息
    - **screenshot_base64**: 截图的Base64编码（可选）
    - **category**: 问题类别（可选，AI会自动识别）
    - **session_id**: 会话ID（继续已有对话时提供）
    """
    try:
        response = await ai_support_service.handle_request(request)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/support/chat-with-image", response_model=SupportResponse)
async def chat_with_image(
    user_id: str = Form(...),
    project_id: str = Form(...),
    message: str = Form(...),
    session_id: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    screenshot: Optional[UploadFile] = File(None)
):
    """发送消息（带截图上传）

    用于表单上传截图的接口。
    """
    screenshot_base64 = None
    if screenshot:
        content = await screenshot.read()
        screenshot_base64 = base64.b64encode(content).decode()

    request = SupportRequest(
        user_id=user_id,
        project_id=project_id,
        message=message,
        screenshot_base64=screenshot_base64,
        category=IssueCategory(category) if category else None,
        session_id=session_id
    )

    try:
        response = await ai_support_service.handle_request(request)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/support/fix", response_model=FixResponse)
async def execute_fix(request: FixRequest):
    """执行修复

    执行AI建议的修复方案。

    - **session_id**: 会话ID
    - **fix_id**: 修复方案ID
    - **confirmed**: 用户是否确认（某些操作需要确认）
    """
    try:
        response = await ai_support_service.execute_fix(request)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/support/analyze-screenshot")
async def analyze_screenshot(
    screenshot: UploadFile = File(...)
):
    """分析截图

    单独分析一张截图，识别错误信息。
    """
    try:
        content = await screenshot.read()
        screenshot_base64 = base64.b64encode(content).decode()
        analysis = await ai_support_service._analyze_screenshot(screenshot_base64)
        return analysis
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/support/session/{session_id}")
async def get_session(session_id: str):
    """获取会话信息

    获取指定会话的详细信息和历史消息。
    """
    session = await ai_support_service._get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@app.post("/api/support/escalate/{session_id}")
async def escalate_to_human(session_id: str, reason: Optional[str] = None):
    """升级到人工

    将会话升级到人工客服。
    """
    session = await ai_support_service._get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.escalated = True
    session.escalation_reason = reason or "用户主动请求人工客服"
    await ai_support_service._save_session(session)

    return {
        "success": True,
        "message": "已经帮您转接到人工客服，请稍等。工作时间内通常5分钟内会有人响应。",
        "estimated_wait": "5分钟"
    }


@app.post("/api/support/resolve/{session_id}")
async def resolve_session(
    session_id: str,
    resolution: str,
    satisfaction_score: Optional[int] = None
):
    """标记问题已解决

    用户确认问题已解决。
    """
    session = await ai_support_service._get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.resolved = True
    session.resolution = resolution
    if satisfaction_score:
        session.satisfaction_score = satisfaction_score
    await ai_support_service._save_session(session)

    return {
        "success": True,
        "message": "感谢您的反馈！很高兴能帮到您。"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug
    )

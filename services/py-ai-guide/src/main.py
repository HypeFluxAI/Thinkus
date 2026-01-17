"""AI 产品导游服务 - FastAPI 入口"""
import asyncio
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .models import GuideRequest, GuideResponse, StepActionRequest, AIResponse
from .guide_service import ai_guide_service


settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时连接数据库
    await ai_guide_service.connect()
    print(f"AI Guide Service started on port {settings.port}")
    yield
    # 关闭时断开连接
    await ai_guide_service.disconnect()


app = FastAPI(
    title="AI Product Guide Service",
    description="AI驱动的产品导游服务 - 帮助零技术背景用户学会使用产品",
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
    return {"status": "healthy", "service": "ai-guide"}


@app.post("/api/guide/start", response_model=GuideResponse)
async def start_guide(request: GuideRequest):
    """开始引导会话

    为用户启动一个新的产品引导会话。

    - **user_id**: 用户ID
    - **project_id**: 项目ID
    - **guide_type**: 引导类型 (first_time/feature_tour/task_guide/troubleshoot/customization)
    - **target_feature**: 要引导的特定功能（可选）
    - **user_question**: 用户的问题（可选）
    """
    try:
        response = await ai_guide_service.start_guide(request)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/guide/action", response_model=GuideResponse)
async def process_action(request: StepActionRequest):
    """处理用户操作

    处理用户在引导过程中的操作。

    - **session_id**: 会话ID
    - **action**: 操作类型 (next/back/skip/stuck/complete)
    - **user_input**: 用户输入（可选）
    - **screenshot_url**: 截图URL（可选）
    """
    try:
        response = await ai_guide_service.process_action(request)
        return response
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/guide/ask", response_model=AIResponse)
async def ask_ai(
    session_id: str,
    question: str,
    screenshot_url: Optional[str] = Query(None, description="截图URL")
):
    """AI 问答

    用户在引导过程中向 AI 提问。

    - **session_id**: 会话ID
    - **question**: 用户的问题
    - **screenshot_url**: 截图URL（可选，AI可以分析截图）
    """
    try:
        response = await ai_guide_service.ask_ai(session_id, question, screenshot_url)
        return response
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/guide/session/{session_id}")
async def get_session(session_id: str):
    """获取会话信息

    获取指定会话的详细信息。
    """
    session = await ai_guide_service._get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@app.post("/api/guide/stuck")
async def report_stuck(
    session_id: str,
    step_id: str,
    description: Optional[str] = None,
    screenshot_url: Optional[str] = None
):
    """报告卡住

    用户报告在某一步卡住了，AI会提供更简单的解释。
    """
    try:
        request = StepActionRequest(
            session_id=session_id,
            action="stuck",
            user_input=description,
            screenshot_url=screenshot_url
        )
        response = await ai_guide_service.process_action(request)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug
    )

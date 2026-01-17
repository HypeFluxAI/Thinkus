"""
AI Engine Service - Main entry point
Provides AI Employee functionality via FastAPI (HTTP) and gRPC
"""

import asyncio
import logging
import os
from contextlib import asynccontextmanager

# Load environment variables from .env file
from pathlib import Path
from dotenv import load_dotenv
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Import gRPC server (will be available after proto generation)
grpc_server = None
try:
    from src.grpc_server import serve_grpc
    grpc_server = serve_grpc
except ImportError:
    logger.warning("gRPC modules not available, running HTTP only")

# Import employees
from src.employees import get_employee, list_employees, EmployeeRegistry
from src.employees.base import ChatContext


# Pydantic models for HTTP API
class ChatRequest(BaseModel):
    employee_id: str
    project_id: str
    user_id: str
    message: str
    context: Optional[List[Dict[str, Any]]] = None
    metadata: Optional[Dict[str, str]] = None


class ChatResponse(BaseModel):
    employee_id: str
    message: str
    suggestions: List[str] = []
    artifacts: List[Dict[str, Any]] = []
    confidence: float = 0.9
    tokens_used: int = 0


class EmployeeInfo(BaseModel):
    id: str
    name: str
    title: str
    department: str
    avatar: str
    description: str
    capabilities: List[str]
    specialties: List[str]
    personality: str
    is_available: bool = True


class DiscussionRequest(BaseModel):
    project_id: str
    user_id: str
    topic: str
    employee_ids: List[str]
    initial_message: str


# Lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting AI Engine Service...")

    # Initialize employee registry
    EmployeeRegistry.initialize()
    logger.info(f"Loaded {len(EmployeeRegistry.list_all())} AI employees")

    # Start gRPC server if available
    grpc_task = None
    if grpc_server:
        grpc_port = int(os.getenv("GRPC_PORT", "50054"))
        grpc_task = asyncio.create_task(grpc_server(grpc_port))
        logger.info(f"gRPC server starting on port {grpc_port}")

    yield

    # Shutdown
    logger.info("Shutting down AI Engine Service...")
    if grpc_task:
        grpc_task.cancel()
        try:
            await grpc_task
        except asyncio.CancelledError:
            pass


# Create FastAPI app
app = FastAPI(
    title="AI Engine Service",
    description="AI Employee Engine for Thinkus Platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check
@app.get("/health")
async def health_check():
    api_key = os.getenv("ANTHROPIC_API_KEY")
    return {
        "status": "healthy",
        "service": "ai-engine",
        "employees_loaded": len(EmployeeRegistry.list_all()),
        "api_key_set": bool(api_key),
        "api_key_prefix": api_key[:10] + "..." if api_key else None
    }


# List all employees
@app.get("/api/v1/employees", response_model=List[EmployeeInfo])
async def api_list_employees(department: Optional[str] = None):
    employees = list_employees(department)
    return [
        EmployeeInfo(
            id=e.id,
            name=e.name,
            title=e.title,
            department=e.department,
            avatar=e.avatar,
            description=e.description,
            capabilities=e.capabilities,
            specialties=e.specialties,
            personality=e.personality,
            is_available=True
        )
        for e in employees
    ]


# Get employee by ID
@app.get("/api/v1/employees/{employee_id}", response_model=EmployeeInfo)
async def api_get_employee(employee_id: str):
    employee = get_employee(employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail=f"Employee {employee_id} not found")

    return EmployeeInfo(
        id=employee.id,
        name=employee.name,
        title=employee.title,
        department=employee.department,
        avatar=employee.avatar,
        description=employee.description,
        capabilities=employee.capabilities,
        specialties=employee.specialties,
        personality=employee.personality,
        is_available=True
    )


# Chat with employee
@app.post("/api/v1/chat", response_model=ChatResponse)
async def api_chat(request: ChatRequest):
    employee = get_employee(request.employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail=f"Employee {request.employee_id} not found")

    # Build context
    context = ChatContext(
        project_id=request.project_id,
        user_id=request.user_id,
        messages=request.context or [],
        metadata=request.metadata or {}
    )

    # Get response from employee
    try:
        response = await employee.chat(request.message, context)
        return ChatResponse(
            employee_id=employee.id,
            message=response.message,
            suggestions=response.suggestions,
            artifacts=[a.model_dump() for a in response.artifacts],
            confidence=response.confidence,
            tokens_used=response.tokens_used
        )
    except Exception as e:
        logger.error(f"Error in chat with {employee.id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Chat with streaming (SSE)
@app.post("/api/v1/chat/stream")
async def api_chat_stream(request: ChatRequest):
    from fastapi.responses import StreamingResponse

    employee = get_employee(request.employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail=f"Employee {request.employee_id} not found")

    context = ChatContext(
        project_id=request.project_id,
        user_id=request.user_id,
        messages=request.context or [],
        metadata=request.metadata or {}
    )

    async def generate():
        import json
        try:
            async for chunk in employee.chat_stream(request.message, context):
                # JSON encode to preserve newlines in SSE format
                yield f"data: {json.dumps({'text': chunk})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            logger.error(f"Error in streaming chat: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream"
    )


# Start discussion
@app.post("/api/v1/discussions")
async def api_start_discussion(request: DiscussionRequest):
    # Validate employees
    employees = []
    for eid in request.employee_ids:
        emp = get_employee(eid)
        if not emp:
            raise HTTPException(status_code=404, detail=f"Employee {eid} not found")
        employees.append(emp)

    # For now, return a simple discussion structure
    # TODO: Implement full discussion orchestration
    discussion_id = f"disc_{request.project_id}_{int(asyncio.get_event_loop().time())}"

    return {
        "id": discussion_id,
        "project_id": request.project_id,
        "topic": request.topic,
        "participant_ids": request.employee_ids,
        "status": "active",
        "messages": []
    }


# Run the app
if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=port,
        reload=os.getenv("ENV", "development") == "development"
    )

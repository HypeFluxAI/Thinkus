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

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import csv
import io

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

# Import memory system
from src.memory.manager import MemoryManager
from src.memory.metrics import get_metrics
from src.memory.models import MemoryTier


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


# Memory API models
class MemoryResponse(BaseModel):
    memory_id: str
    content: str
    summary: Optional[str] = None
    type: str
    tier: str
    status: str
    confidence: float
    created_at: str
    last_seen: str
    access_count: int
    keywords: List[str] = []
    project_id: str


class MemoryListResponse(BaseModel):
    memories: List[MemoryResponse]
    total: int
    stats: Dict[str, Any]


class MemoryStatsResponse(BaseModel):
    total_count: int
    by_tier: Dict[str, int]
    by_type: Dict[str, int]
    avg_confidence: float
    employee_id: str
    project_id: Optional[str] = None


class MemorySearchRequest(BaseModel):
    query: str
    employee_id: str
    project_id: str
    tenant_id: str = "default"
    filters: Optional[Dict[str, Any]] = None
    limit: int = 20


class MemorySearchResponse(BaseModel):
    results: List[MemoryResponse]
    total: int
    query: str


class BatchDeleteRequest(BaseModel):
    before_date: Optional[str] = None
    tier: Optional[str] = None


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


# ===================
# Memory Manager Cache
# ===================

_memory_managers: Dict[str, MemoryManager] = {}


def get_memory_manager(employee_id: str, tenant_id: str = "default") -> MemoryManager:
    """Get or create a memory manager for an employee with optional tenant isolation"""
    # Include tenant_id in cache key for multi-tenant support
    cache_key = f"{tenant_id}:{employee_id}"
    if cache_key not in _memory_managers:
        _memory_managers[cache_key] = MemoryManager(employee_id, tenant_id)
    return _memory_managers[cache_key]


# ===================
# Memory Management API
# ===================

# Get memories for an employee
@app.get("/api/v1/memory/{employee_id}", response_model=MemoryListResponse)
async def api_get_memories(
    employee_id: str,
    project_id: Optional[str] = Query(None),
    tier: Optional[str] = Query(None),
    tenant_id: str = Query("default", description="Tenant ID for multi-tenant isolation"),
    limit: int = Query(50, ge=1, le=200)
):
    """Get memories for an employee, optionally filtered by project and tier"""
    try:
        manager = get_memory_manager(employee_id, tenant_id)
        memories_data = await manager.retrieve("", project_id, top_k=limit)

        # Filter by tier if specified
        if tier:
            memories_data = [m for m in memories_data if m.get("tier") == tier]

        # Get stats
        stats = await manager.get_stats(project_id)

        # Format memories
        memories = []
        for m in memories_data:
            memories.append(MemoryResponse(
                memory_id=m.get("id", ""),
                content=m.get("content", ""),
                summary=m.get("message", "")[:100] if m.get("message") else None,
                type=m.get("type", "fact"),
                tier=m.get("tier", "relevant"),
                status="active",
                confidence=m.get("score", 0.8),
                created_at=m.get("timestamp", datetime.utcnow().isoformat()),
                last_seen=m.get("timestamp", datetime.utcnow().isoformat()),
                access_count=0,
                keywords=[],
                project_id=m.get("project_id", project_id or "")
            ))

        return MemoryListResponse(
            memories=memories,
            total=len(memories),
            stats={
                "by_tier": stats.get("tiers", {}),
                "by_type": stats.get("types", {}),
            }
        )

    except Exception as e:
        logger.error(f"Error getting memories: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Delete a specific memory
@app.delete("/api/v1/memory/{employee_id}/{memory_id}")
async def api_delete_memory(
    employee_id: str,
    memory_id: str,
    tenant_id: str = Query("default", description="Tenant ID for multi-tenant isolation")
):
    """Delete a specific memory"""
    try:
        manager = get_memory_manager(employee_id, tenant_id)

        # For now, we can't directly delete by ID without Pinecone
        # This would need to be implemented in the manager
        if not manager.index:
            raise HTTPException(status_code=503, detail="Memory storage not available")

        manager.index.delete(ids=[memory_id], namespace=manager.namespace)

        return {"status": "deleted", "memory_id": memory_id}

    except Exception as e:
        logger.error(f"Error deleting memory: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Batch delete memories
@app.delete("/api/v1/memory/{employee_id}")
async def api_batch_delete_memories(
    employee_id: str,
    project_id: Optional[str] = Query(None),
    before_date: Optional[str] = Query(None),
    tier: Optional[str] = Query(None),
    tenant_id: str = Query("default", description="Tenant ID for multi-tenant isolation")
):
    """Batch delete memories based on criteria"""
    try:
        manager = get_memory_manager(employee_id, tenant_id)

        if project_id:
            result = await manager.delete_project_memories(project_id)
            return {"status": "deleted", "project_id": project_id}

        # For other criteria, we would need to implement filter-based deletion
        raise HTTPException(
            status_code=400,
            detail="Please specify project_id for batch deletion"
        )

    except Exception as e:
        logger.error(f"Error batch deleting memories: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Export memories
@app.get("/api/v1/memory/{employee_id}/export")
async def api_export_memories(
    employee_id: str,
    project_id: Optional[str] = Query(None),
    format: str = Query("json", regex="^(json|csv)$"),
    tenant_id: str = Query("default", description="Tenant ID for multi-tenant isolation")
):
    """Export memories in JSON or CSV format"""
    try:
        manager = get_memory_manager(employee_id, tenant_id)
        memories_data = await manager.retrieve("", project_id, top_k=200)

        if format == "csv":
            # Create CSV
            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow([
                "id", "content", "type", "tier", "confidence", "created_at", "project_id"
            ])
            for m in memories_data:
                writer.writerow([
                    m.get("id", ""),
                    m.get("content", ""),
                    m.get("type", ""),
                    m.get("tier", ""),
                    m.get("score", 0),
                    m.get("timestamp", ""),
                    m.get("project_id", "")
                ])

            return Response(
                content=output.getvalue(),
                media_type="text/csv",
                headers={
                    "Content-Disposition": f"attachment; filename=memories_{employee_id}.csv"
                }
            )
        else:
            # Return JSON
            return {
                "employee_id": employee_id,
                "project_id": project_id,
                "exported_at": datetime.utcnow().isoformat(),
                "count": len(memories_data),
                "memories": memories_data
            }

    except Exception as e:
        logger.error(f"Error exporting memories: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Get memory statistics
@app.get("/api/v1/memory/{employee_id}/stats", response_model=MemoryStatsResponse)
async def api_get_memory_stats(
    employee_id: str,
    project_id: Optional[str] = Query(None),
    tenant_id: str = Query("default", description="Tenant ID for multi-tenant isolation")
):
    """Get memory statistics for an employee"""
    try:
        manager = get_memory_manager(employee_id, tenant_id)
        stats = await manager.get_stats(project_id)

        # Calculate average confidence
        memories = await manager.retrieve("", project_id, top_k=100)
        avg_conf = 0.8
        if memories:
            confidences = [m.get("score", 0.8) for m in memories]
            avg_conf = sum(confidences) / len(confidences) if confidences else 0.8

        return MemoryStatsResponse(
            total_count=stats.get("count", len(memories)),
            by_tier=stats.get("tiers", {}),
            by_type=stats.get("types", {}),
            avg_confidence=avg_conf,
            employee_id=employee_id,
            project_id=project_id
        )

    except Exception as e:
        logger.error(f"Error getting memory stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Search memories
@app.post("/api/v1/memory/search", response_model=MemorySearchResponse)
async def api_search_memories(request: MemorySearchRequest):
    """Search memories with query and filters"""
    try:
        manager = get_memory_manager(request.employee_id, request.tenant_id)
        memories_data = await manager.retrieve(
            request.query,
            request.project_id,
            top_k=request.limit
        )

        # Apply filters if provided
        if request.filters:
            if "tier" in request.filters:
                allowed_tiers = request.filters["tier"]
                if isinstance(allowed_tiers, list):
                    memories_data = [
                        m for m in memories_data
                        if m.get("tier") in allowed_tiers
                    ]

            if "type" in request.filters:
                allowed_types = request.filters["type"]
                if isinstance(allowed_types, list):
                    memories_data = [
                        m for m in memories_data
                        if m.get("type") in allowed_types
                    ]

        # Format results
        results = []
        for m in memories_data:
            results.append(MemoryResponse(
                memory_id=m.get("id", ""),
                content=m.get("content", ""),
                summary=m.get("message", "")[:100] if m.get("message") else None,
                type=m.get("type", "fact"),
                tier=m.get("tier", "relevant"),
                status="active",
                confidence=m.get("score", 0.8),
                created_at=m.get("timestamp", datetime.utcnow().isoformat()),
                last_seen=m.get("timestamp", datetime.utcnow().isoformat()),
                access_count=0,
                keywords=[],
                project_id=m.get("project_id", request.project_id)
            ))

        return MemorySearchResponse(
            results=results,
            total=len(results),
            query=request.query
        )

    except Exception as e:
        logger.error(f"Error searching memories: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Run maintenance
@app.post("/api/v1/memory/{employee_id}/maintenance")
async def api_run_maintenance(
    employee_id: str,
    project_id: Optional[str] = Query(None),
    tenant_id: str = Query("default", description="Tenant ID for multi-tenant isolation")
):
    """Run maintenance on memories (decay, merge, cleanup)"""
    try:
        manager = get_memory_manager(employee_id, tenant_id)
        stats = await manager.run_maintenance(project_id)

        return {
            "status": "completed",
            "employee_id": employee_id,
            "project_id": project_id,
            "stats": stats
        }

    except Exception as e:
        logger.error(f"Error running maintenance: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Update memory tier
class TierUpdateRequest(BaseModel):
    tier: str  # CORE, RELEVANT, or COLD


@app.patch("/api/v1/memory/{employee_id}/{memory_id}/tier")
async def api_update_memory_tier(
    employee_id: str,
    memory_id: str,
    request: TierUpdateRequest,
    tenant_id: str = Query("default", description="Tenant ID for multi-tenant isolation")
):
    """Update the tier of a specific memory"""
    try:
        # Validate tier
        valid_tiers = ["CORE", "RELEVANT", "COLD"]
        if request.tier.upper() not in valid_tiers:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid tier. Must be one of: {valid_tiers}"
            )

        manager = get_memory_manager(employee_id, tenant_id)

        if not manager.index:
            raise HTTPException(status_code=503, detail="Memory storage not available")

        # Fetch the existing memory
        result = manager.index.fetch(ids=[memory_id], namespace=manager.namespace)

        if not result.vectors or memory_id not in result.vectors:
            raise HTTPException(status_code=404, detail=f"Memory {memory_id} not found")

        vector = result.vectors[memory_id]
        metadata = dict(vector.metadata) if vector.metadata else {}

        # Update tier
        metadata["tier"] = request.tier.upper()

        # Upsert with updated metadata
        manager.index.upsert(
            vectors=[{
                "id": memory_id,
                "values": vector.values,
                "metadata": metadata
            }],
            namespace=manager.namespace
        )

        return {
            "status": "updated",
            "memory_id": memory_id,
            "new_tier": request.tier.upper()
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating memory tier: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ===================
# Prometheus Metrics
# ===================

@app.get("/metrics")
async def prometheus_metrics():
    """Expose Prometheus metrics"""
    metrics = get_metrics()
    return Response(
        content=metrics.get_metrics(),
        media_type=metrics.get_content_type()
    )


# ===================
# Cache Management
# ===================

@app.get("/api/v1/memory/{employee_id}/cache/stats")
async def api_get_cache_stats(
    employee_id: str,
    tenant_id: str = Query("default", description="Tenant ID for multi-tenant isolation")
):
    """Get cache statistics for an employee"""
    try:
        manager = get_memory_manager(employee_id, tenant_id)
        stats = await manager.cache.get_stats()
        return stats
    except Exception as e:
        logger.error(f"Error getting cache stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/v1/memory/{employee_id}/cache")
async def api_clear_cache(
    employee_id: str,
    tenant_id: str = Query("default", description="Tenant ID for multi-tenant isolation")
):
    """Clear cache for an employee"""
    try:
        manager = get_memory_manager(employee_id, tenant_id)
        result = await manager.cache.clear_all()
        return {"status": "cleared" if result else "failed", "employee_id": employee_id}
    except Exception as e:
        logger.error(f"Error clearing cache: {e}")
        raise HTTPException(status_code=500, detail=str(e))


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

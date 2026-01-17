"""
gRPC Server for AI Employee Service
"""

import logging
import asyncio
from typing import AsyncIterator

import grpc
from grpc import aio

logger = logging.getLogger(__name__)

# Try to import proto modules
try:
    from src.proto import ai_employee_pb2, ai_employee_pb2_grpc
    PROTO_AVAILABLE = True
except ImportError:
    logger.warning("Proto modules not available")
    PROTO_AVAILABLE = False
    ai_employee_pb2 = None
    ai_employee_pb2_grpc = None

from src.employees import get_employee, list_employees, EmployeeRegistry
from src.employees.base import ChatContext


class AIEmployeeServicer(ai_employee_pb2_grpc.AIEmployeeServiceServicer if PROTO_AVAILABLE else object):
    """Implements the AIEmployeeService gRPC interface"""

    async def Chat(self, request, context):
        """Handle chat request"""
        employee = get_employee(request.employee_id)
        if not employee:
            context.set_code(grpc.StatusCode.NOT_FOUND)
            context.set_details(f"Employee {request.employee_id} not found")
            return ai_employee_pb2.ChatResponse()

        # Build context
        chat_context = ChatContext(
            project_id=request.project_id,
            user_id=request.user_id,
            messages=[
                {"role": m.role, "content": m.content, "employee_id": m.employee_id}
                for m in request.context
            ],
            metadata=dict(request.metadata)
        )

        try:
            response = await employee.chat(request.message, chat_context)
            return ai_employee_pb2.ChatResponse(
                employee_id=employee.id,
                message=response.message,
                suggestions=response.suggestions,
                artifacts=[
                    ai_employee_pb2.Artifact(
                        type=a.type,
                        title=a.title,
                        content=a.content,
                        language=a.language or ""
                    )
                    for a in response.artifacts
                ],
                confidence=response.confidence,
                tokens_used=response.tokens_used
            )
        except Exception as e:
            logger.error(f"Error in Chat: {e}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return ai_employee_pb2.ChatResponse()

    async def ChatStream(self, request, context) -> AsyncIterator:
        """Handle streaming chat request"""
        employee = get_employee(request.employee_id)
        if not employee:
            context.set_code(grpc.StatusCode.NOT_FOUND)
            context.set_details(f"Employee {request.employee_id} not found")
            return

        chat_context = ChatContext(
            project_id=request.project_id,
            user_id=request.user_id,
            messages=[
                {"role": m.role, "content": m.content, "employee_id": m.employee_id}
                for m in request.context
            ],
            metadata=dict(request.metadata)
        )

        try:
            async for chunk in employee.chat_stream(request.message, chat_context):
                yield ai_employee_pb2.ChatChunk(
                    content=chunk,
                    is_done=False
                )
            # Send final chunk
            yield ai_employee_pb2.ChatChunk(
                content="",
                is_done=True
            )
        except Exception as e:
            logger.error(f"Error in ChatStream: {e}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))

    async def GetEmployee(self, request, context):
        """Get employee information"""
        employee = get_employee(request.employee_id)
        if not employee:
            context.set_code(grpc.StatusCode.NOT_FOUND)
            context.set_details(f"Employee {request.employee_id} not found")
            return ai_employee_pb2.Employee()

        return ai_employee_pb2.Employee(
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

    async def ListEmployees(self, request, context):
        """List all employees"""
        department = request.department if request.HasField("department") else None
        employees = list_employees(department)

        return ai_employee_pb2.ListEmployeesResponse(
            employees=[
                ai_employee_pb2.Employee(
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
        )

    async def StartDiscussion(self, request, context):
        """Start a discussion with multiple employees"""
        # Validate all employees exist
        employees = []
        for eid in request.employee_ids:
            emp = get_employee(eid)
            if not emp:
                context.set_code(grpc.StatusCode.NOT_FOUND)
                context.set_details(f"Employee {eid} not found")
                return ai_employee_pb2.DiscussionResponse()
            employees.append(emp)

        # Create discussion ID
        import time
        discussion_id = f"disc_{request.project_id}_{int(time.time())}"

        # TODO: Store discussion in database
        discussion = ai_employee_pb2.Discussion(
            id=discussion_id,
            project_id=request.project_id,
            topic=request.topic,
            participant_ids=list(request.employee_ids),
            status="active",
            created_at=int(time.time()),
            updated_at=int(time.time())
        )

        return ai_employee_pb2.DiscussionResponse(
            discussion=discussion,
            new_messages=[]
        )

    async def AddToDiscussion(self, request, context):
        """Add a message to discussion"""
        # TODO: Implement discussion management
        context.set_code(grpc.StatusCode.UNIMPLEMENTED)
        context.set_details("Not yet implemented")
        return ai_employee_pb2.DiscussionResponse()

    async def GetDiscussion(self, request, context):
        """Get discussion by ID"""
        # TODO: Implement discussion retrieval
        context.set_code(grpc.StatusCode.UNIMPLEMENTED)
        context.set_details("Not yet implemented")
        return ai_employee_pb2.Discussion()


async def serve_grpc(port: int = 50054):
    """Start the gRPC server"""
    if not PROTO_AVAILABLE:
        logger.error("Proto modules not available, cannot start gRPC server")
        return

    server = aio.server()
    ai_employee_pb2_grpc.add_AIEmployeeServiceServicer_to_server(
        AIEmployeeServicer(), server
    )

    listen_addr = f"[::]:{port}"
    server.add_insecure_port(listen_addr)

    logger.info(f"Starting gRPC server on {listen_addr}")
    await server.start()

    try:
        await server.wait_for_termination()
    except asyncio.CancelledError:
        logger.info("gRPC server shutting down...")
        await server.stop(5)

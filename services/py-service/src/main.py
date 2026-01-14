"""
Thinkus Python Microservice
FastAPI HTTP + gRPC Server
"""
import asyncio
import os
from concurrent import futures

import grpc
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.grpc_server import DocumentServicer
from src.utils.mongodb import init_mongodb, close_mongodb

# Import generated proto (will be generated at build time)
try:
    from src.proto import document_pb2_grpc
except ImportError:
    document_pb2_grpc = None

app = FastAPI(
    title="Thinkus Python Service",
    description="Document Processing, AI Analysis, Growth Advisor",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Initialize connections on startup"""
    await init_mongodb()
    # Start gRPC server in background
    asyncio.create_task(start_grpc_server())


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    await close_mongodb()


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "py-service"}


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "thinkus-py-service",
        "version": "1.0.0",
        "endpoints": {
            "grpc": f":{os.getenv('GRPC_PORT', '50051')}",
            "http": "/health",
        },
    }


async def start_grpc_server():
    """Start gRPC server"""
    if document_pb2_grpc is None:
        print("Warning: Proto files not generated, skipping gRPC server")
        return

    port = os.getenv("GRPC_PORT", "50051")
    server = grpc.aio.server(futures.ThreadPoolExecutor(max_workers=10))

    # Add service
    document_pb2_grpc.add_DocumentServiceServicer_to_server(
        DocumentServicer(), server
    )

    server.add_insecure_port(f"[::]:{port}")
    await server.start()
    print(f"gRPC server started on port {port}")
    await server.wait_for_termination()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

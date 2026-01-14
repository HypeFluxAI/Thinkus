"""
Configuration management
"""
import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings"""

    # MongoDB
    mongodb_uri: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017/thinkus")

    # Anthropic Claude
    anthropic_api_key: str = os.getenv("ANTHROPIC_API_KEY", "")

    # OpenAI (for embeddings)
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")

    # Pinecone
    pinecone_api_key: str = os.getenv("PINECONE_API_KEY", "")
    pinecone_index_name: str = os.getenv("PINECONE_INDEX_NAME", "thinkus")

    # Redis
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379")

    # gRPC
    grpc_port: int = int(os.getenv("GRPC_PORT", "50051"))

    class Config:
        env_file = ".env"


settings = Settings()

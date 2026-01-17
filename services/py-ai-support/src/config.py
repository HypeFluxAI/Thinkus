"""配置管理"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """应用配置"""
    # 服务配置
    app_name: str = "AI Support Bot"
    debug: bool = False
    host: str = "0.0.0.0"
    port: int = 8002
    grpc_port: int = 50052

    # AI 配置
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    default_model: str = "claude-3-haiku-20240307"
    vision_model: str = "claude-3-sonnet-20240229"

    # 数据库配置
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_database: str = "thinkus"
    redis_url: str = "redis://localhost:6379"

    # 客服配置
    auto_fix_enabled: bool = True
    max_auto_fix_attempts: int = 3
    escalation_threshold: int = 3  # 多少次无法解决后升级
    session_timeout_minutes: int = 60

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()

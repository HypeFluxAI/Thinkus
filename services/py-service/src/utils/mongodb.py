"""
MongoDB connection management
"""
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient

from src.utils.config import settings

# Async client for FastAPI
_async_client: Optional[AsyncIOMotorClient] = None
_async_db = None

# Sync client for gRPC (running in thread pool)
_sync_client: Optional[MongoClient] = None
_sync_db = None


async def init_mongodb():
    """Initialize async MongoDB connection"""
    global _async_client, _async_db
    _async_client = AsyncIOMotorClient(settings.mongodb_uri)
    _async_db = _async_client.get_default_database()
    print("MongoDB async connection initialized")


async def close_mongodb():
    """Close async MongoDB connection"""
    global _async_client
    if _async_client:
        _async_client.close()
        print("MongoDB async connection closed")


def get_async_db():
    """Get async database instance"""
    return _async_db


def get_sync_db():
    """Get sync database instance (for gRPC thread pool)"""
    global _sync_client, _sync_db
    if _sync_client is None:
        _sync_client = MongoClient(settings.mongodb_uri)
        _sync_db = _sync_client.get_default_database()
    return _sync_db


def get_collection(name: str, sync: bool = False):
    """Get a collection by name"""
    if sync:
        return get_sync_db()[name]
    return get_async_db()[name]

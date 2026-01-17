"""
Memory Cache Layer
Redis-based caching for memory retrieval with:
- Cache-aside pattern
- TTL-based expiration
- Automatic invalidation on updates
- Batch operations support
"""

import os
import json
import logging
import hashlib
from typing import List, Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

# Try to import Redis
try:
    import redis.asyncio as redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    logger.warning("Redis not available for caching")


# Configuration
CACHE_TTL_SECONDS = 300  # 5 minutes default TTL
CACHE_PREFIX = "thinkus:memory:"
MAX_CACHE_ENTRIES = 1000


class MemoryCache:
    """
    Redis-based cache for memory system
    Implements cache-aside pattern with automatic invalidation
    """

    def __init__(self, employee_id: str):
        self.employee_id = employee_id
        self.prefix = f"{CACHE_PREFIX}{employee_id}:"
        self._client: Optional[redis.Redis] = None
        self._connected = False

    async def connect(self) -> bool:
        """Initialize Redis connection"""
        if not REDIS_AVAILABLE:
            logger.debug("Redis not available, caching disabled")
            return False

        if self._connected and self._client:
            return True

        try:
            redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
            self._client = redis.from_url(
                redis_url,
                encoding="utf-8",
                decode_responses=True
            )
            # Test connection
            await self._client.ping()
            self._connected = True
            logger.info(f"Redis cache connected for employee {self.employee_id}")
            return True
        except Exception as e:
            logger.warning(f"Redis connection failed: {e}")
            self._connected = False
            return False

    async def close(self):
        """Close Redis connection"""
        if self._client:
            await self._client.close()
            self._connected = False

    def _make_key(self, key_type: str, identifier: str) -> str:
        """Generate cache key with prefix"""
        return f"{self.prefix}{key_type}:{identifier}"

    def _hash_query(self, query: str, project_id: Optional[str] = None) -> str:
        """Create hash for query-based cache key"""
        key_str = f"{query}:{project_id or 'all'}"
        return hashlib.md5(key_str.encode()).hexdigest()[:16]

    # ===================
    # Memory Caching
    # ===================

    async def get_memory(self, memory_id: str) -> Optional[Dict[str, Any]]:
        """Get cached memory by ID"""
        if not self._connected:
            return None

        try:
            key = self._make_key("mem", memory_id)
            data = await self._client.get(key)
            if data:
                logger.debug(f"Cache hit: memory {memory_id}")
                return json.loads(data)
            return None
        except Exception as e:
            logger.warning(f"Cache get failed: {e}")
            return None

    async def set_memory(
        self,
        memory_id: str,
        memory_data: Dict[str, Any],
        ttl: int = CACHE_TTL_SECONDS
    ) -> bool:
        """Cache a memory"""
        if not self._connected:
            return False

        try:
            key = self._make_key("mem", memory_id)
            await self._client.setex(key, ttl, json.dumps(memory_data))
            logger.debug(f"Cached memory: {memory_id}")
            return True
        except Exception as e:
            logger.warning(f"Cache set failed: {e}")
            return False

    async def get_memories_batch(
        self,
        memory_ids: List[str]
    ) -> Dict[str, Dict[str, Any]]:
        """Get multiple memories from cache"""
        if not self._connected or not memory_ids:
            return {}

        try:
            keys = [self._make_key("mem", mid) for mid in memory_ids]
            values = await self._client.mget(keys)

            result = {}
            for mid, val in zip(memory_ids, values):
                if val:
                    result[mid] = json.loads(val)
                    logger.debug(f"Cache hit: memory {mid}")

            return result
        except Exception as e:
            logger.warning(f"Batch cache get failed: {e}")
            return {}

    async def set_memories_batch(
        self,
        memories: Dict[str, Dict[str, Any]],
        ttl: int = CACHE_TTL_SECONDS
    ) -> bool:
        """Cache multiple memories"""
        if not self._connected or not memories:
            return False

        try:
            pipe = self._client.pipeline()
            for memory_id, data in memories.items():
                key = self._make_key("mem", memory_id)
                pipe.setex(key, ttl, json.dumps(data))
            await pipe.execute()
            logger.debug(f"Batch cached {len(memories)} memories")
            return True
        except Exception as e:
            logger.warning(f"Batch cache set failed: {e}")
            return False

    async def invalidate_memory(self, memory_id: str) -> bool:
        """Invalidate a cached memory"""
        if not self._connected:
            return False

        try:
            key = self._make_key("mem", memory_id)
            await self._client.delete(key)
            # Also invalidate related query caches
            await self._invalidate_query_caches()
            logger.debug(f"Invalidated memory cache: {memory_id}")
            return True
        except Exception as e:
            logger.warning(f"Cache invalidation failed: {e}")
            return False

    # ===================
    # Query Result Caching
    # ===================

    async def get_query_result(
        self,
        query: str,
        project_id: Optional[str] = None
    ) -> Optional[List[Dict[str, Any]]]:
        """Get cached query result"""
        if not self._connected:
            return None

        try:
            query_hash = self._hash_query(query, project_id)
            key = self._make_key("query", query_hash)
            data = await self._client.get(key)
            if data:
                logger.debug(f"Cache hit: query '{query[:30]}...'")
                return json.loads(data)
            return None
        except Exception as e:
            logger.warning(f"Query cache get failed: {e}")
            return None

    async def set_query_result(
        self,
        query: str,
        project_id: Optional[str],
        results: List[Dict[str, Any]],
        ttl: int = 60  # Shorter TTL for query results
    ) -> bool:
        """Cache query result"""
        if not self._connected:
            return False

        try:
            query_hash = self._hash_query(query, project_id)
            key = self._make_key("query", query_hash)
            await self._client.setex(key, ttl, json.dumps(results))

            # Track query cache key for invalidation
            index_key = self._make_key("query_index", "all")
            await self._client.sadd(index_key, key)
            await self._client.expire(index_key, CACHE_TTL_SECONDS)

            logger.debug(f"Cached query result: '{query[:30]}...'")
            return True
        except Exception as e:
            logger.warning(f"Query cache set failed: {e}")
            return False

    async def _invalidate_query_caches(self) -> bool:
        """Invalidate all query caches for this employee"""
        if not self._connected:
            return False

        try:
            index_key = self._make_key("query_index", "all")
            query_keys = await self._client.smembers(index_key)
            if query_keys:
                await self._client.delete(*query_keys)
                await self._client.delete(index_key)
            logger.debug(f"Invalidated {len(query_keys)} query caches")
            return True
        except Exception as e:
            logger.warning(f"Query cache invalidation failed: {e}")
            return False

    # ===================
    # Core Memory Caching
    # ===================

    async def get_core_memories(
        self,
        project_id: str
    ) -> Optional[List[Dict[str, Any]]]:
        """Get cached core memories for a project"""
        if not self._connected:
            return None

        try:
            key = self._make_key("core", project_id)
            data = await self._client.get(key)
            if data:
                logger.debug(f"Cache hit: core memories for {project_id}")
                return json.loads(data)
            return None
        except Exception as e:
            logger.warning(f"Core cache get failed: {e}")
            return None

    async def set_core_memories(
        self,
        project_id: str,
        memories: List[Dict[str, Any]],
        ttl: int = 600  # 10 minutes for core memories
    ) -> bool:
        """Cache core memories for a project"""
        if not self._connected:
            return False

        try:
            key = self._make_key("core", project_id)
            await self._client.setex(key, ttl, json.dumps(memories))
            logger.debug(f"Cached core memories for {project_id}")
            return True
        except Exception as e:
            logger.warning(f"Core cache set failed: {e}")
            return False

    async def invalidate_core_memories(self, project_id: str) -> bool:
        """Invalidate core memories cache"""
        if not self._connected:
            return False

        try:
            key = self._make_key("core", project_id)
            await self._client.delete(key)
            return True
        except Exception as e:
            logger.warning(f"Core cache invalidation failed: {e}")
            return False

    # ===================
    # Statistics
    # ===================

    async def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        if not self._connected:
            return {"connected": False}

        try:
            # Count keys by type
            mem_pattern = self._make_key("mem", "*")
            query_pattern = self._make_key("query", "*")
            core_pattern = self._make_key("core", "*")

            mem_keys = []
            query_keys = []
            core_keys = []

            async for key in self._client.scan_iter(mem_pattern):
                mem_keys.append(key)
            async for key in self._client.scan_iter(query_pattern):
                query_keys.append(key)
            async for key in self._client.scan_iter(core_pattern):
                core_keys.append(key)

            return {
                "connected": True,
                "employee_id": self.employee_id,
                "memory_entries": len(mem_keys),
                "query_entries": len(query_keys),
                "core_entries": len(core_keys),
                "total_entries": len(mem_keys) + len(query_keys) + len(core_keys),
            }
        except Exception as e:
            logger.warning(f"Failed to get cache stats: {e}")
            return {"connected": True, "error": str(e)}

    async def clear_all(self) -> bool:
        """Clear all cache entries for this employee"""
        if not self._connected:
            return False

        try:
            pattern = f"{self.prefix}*"
            keys = []
            async for key in self._client.scan_iter(pattern):
                keys.append(key)

            if keys:
                await self._client.delete(*keys)
            logger.info(f"Cleared {len(keys)} cache entries for {self.employee_id}")
            return True
        except Exception as e:
            logger.warning(f"Cache clear failed: {e}")
            return False


# ===================
# Shared Cache Instance
# ===================

_cache_instances: Dict[str, MemoryCache] = {}


async def get_cache(employee_id: str) -> MemoryCache:
    """Get or create cache instance for an employee"""
    if employee_id not in _cache_instances:
        cache = MemoryCache(employee_id)
        await cache.connect()
        _cache_instances[employee_id] = cache
    return _cache_instances[employee_id]


async def close_all_caches():
    """Close all cache instances"""
    for cache in _cache_instances.values():
        await cache.close()
    _cache_instances.clear()

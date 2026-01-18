"""
Unit Tests for Memory Cache
Tests Redis-based caching functionality
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import json

from memory.cache import MemoryCache, CACHE_TTL_SECONDS, CACHE_PREFIX


class TestMemoryCacheInit:
    """Tests for cache initialization"""

    def test_cache_initialization(self):
        """Test cache initializes with employee ID"""
        cache = MemoryCache("test_employee")
        assert cache.employee_id == "test_employee"
        assert cache.prefix == f"{CACHE_PREFIX}test_employee:"

    def test_cache_key_generation(self, memory_cache):
        """Test cache key generation"""
        key = memory_cache._make_key("mem", "memory-123")
        assert memory_cache.prefix in key
        assert "mem:memory-123" in key

    def test_query_hash_generation(self, memory_cache):
        """Test query hash is deterministic"""
        hash1 = memory_cache._hash_query("test query", "project-1")
        hash2 = memory_cache._hash_query("test query", "project-1")
        hash3 = memory_cache._hash_query("different query", "project-1")

        assert hash1 == hash2  # Same inputs = same hash
        assert hash1 != hash3  # Different inputs = different hash


class TestMemoryCacheConnection:
    """Tests for cache connection"""

    @pytest.mark.asyncio
    async def test_connect_success(self, memory_cache, mock_redis_client):
        """Test successful Redis connection"""
        with patch('memory.cache.redis.from_url', return_value=mock_redis_client):
            with patch('memory.cache.REDIS_AVAILABLE', True):
                result = await memory_cache.connect()
                assert result is True
                assert memory_cache._connected is True

    @pytest.mark.asyncio
    async def test_connect_failure(self, memory_cache):
        """Test handling connection failure"""
        failing_client = AsyncMock()
        failing_client.ping = AsyncMock(side_effect=Exception("Connection failed"))

        with patch('memory.cache.redis.from_url', return_value=failing_client):
            with patch('memory.cache.REDIS_AVAILABLE', True):
                result = await memory_cache.connect()
                assert result is False
                assert memory_cache._connected is False

    @pytest.mark.asyncio
    async def test_connect_redis_unavailable(self, memory_cache):
        """Test when Redis is not available"""
        with patch('memory.cache.REDIS_AVAILABLE', False):
            result = await memory_cache.connect()
            assert result is False

    @pytest.mark.asyncio
    async def test_close_connection(self, memory_cache, mock_redis_client):
        """Test closing connection"""
        memory_cache._client = mock_redis_client
        memory_cache._connected = True

        await memory_cache.close()

        mock_redis_client.close.assert_called_once()
        assert memory_cache._connected is False


class TestMemoryCaching:
    """Tests for individual memory caching"""

    @pytest.mark.asyncio
    async def test_get_memory_cache_hit(self, memory_cache, mock_redis_client):
        """Test cache hit for memory"""
        test_data = {"memory_id": "mem-001", "content": "Test content"}
        mock_redis_client.get = AsyncMock(return_value=json.dumps(test_data))
        memory_cache._client = mock_redis_client
        memory_cache._connected = True

        result = await memory_cache.get_memory("mem-001")

        assert result == test_data

    @pytest.mark.asyncio
    async def test_get_memory_cache_miss(self, memory_cache, mock_redis_client):
        """Test cache miss for memory"""
        mock_redis_client.get = AsyncMock(return_value=None)
        memory_cache._client = mock_redis_client
        memory_cache._connected = True

        result = await memory_cache.get_memory("mem-001")

        assert result is None

    @pytest.mark.asyncio
    async def test_set_memory(self, memory_cache, mock_redis_client):
        """Test setting memory in cache"""
        memory_cache._client = mock_redis_client
        memory_cache._connected = True

        test_data = {"memory_id": "mem-001", "content": "Test content"}
        result = await memory_cache.set_memory("mem-001", test_data)

        assert result is True
        mock_redis_client.setex.assert_called_once()

    @pytest.mark.asyncio
    async def test_set_memory_custom_ttl(self, memory_cache, mock_redis_client):
        """Test setting memory with custom TTL"""
        memory_cache._client = mock_redis_client
        memory_cache._connected = True

        test_data = {"memory_id": "mem-001", "content": "Test content"}
        await memory_cache.set_memory("mem-001", test_data, ttl=600)

        # Verify setex was called with custom TTL
        call_args = mock_redis_client.setex.call_args
        assert call_args[0][1] == 600  # TTL argument

    @pytest.mark.asyncio
    async def test_invalidate_memory(self, memory_cache, mock_redis_client):
        """Test memory invalidation"""
        mock_redis_client.smembers = AsyncMock(return_value=set())
        memory_cache._client = mock_redis_client
        memory_cache._connected = True

        result = await memory_cache.invalidate_memory("mem-001")

        assert result is True
        mock_redis_client.delete.assert_called()


class TestBatchOperations:
    """Tests for batch cache operations"""

    @pytest.mark.asyncio
    async def test_get_memories_batch(self, memory_cache, mock_redis_client):
        """Test batch memory retrieval"""
        test_data = [
            json.dumps({"memory_id": "mem-001", "content": "Content 1"}),
            json.dumps({"memory_id": "mem-002", "content": "Content 2"}),
        ]
        mock_redis_client.mget = AsyncMock(return_value=test_data)
        memory_cache._client = mock_redis_client
        memory_cache._connected = True

        result = await memory_cache.get_memories_batch(["mem-001", "mem-002"])

        assert len(result) == 2
        assert "mem-001" in result
        assert "mem-002" in result

    @pytest.mark.asyncio
    async def test_get_memories_batch_partial_hit(self, memory_cache, mock_redis_client):
        """Test batch retrieval with partial cache hits"""
        test_data = [
            json.dumps({"memory_id": "mem-001", "content": "Content 1"}),
            None,  # Cache miss
        ]
        mock_redis_client.mget = AsyncMock(return_value=test_data)
        memory_cache._client = mock_redis_client
        memory_cache._connected = True

        result = await memory_cache.get_memories_batch(["mem-001", "mem-002"])

        assert len(result) == 1
        assert "mem-001" in result
        assert "mem-002" not in result

    @pytest.mark.asyncio
    async def test_set_memories_batch(self, memory_cache, mock_redis_client):
        """Test batch memory setting"""
        mock_pipeline = AsyncMock()
        mock_pipeline.execute = AsyncMock()
        mock_redis_client.pipeline = MagicMock(return_value=mock_pipeline)
        memory_cache._client = mock_redis_client
        memory_cache._connected = True

        memories = {
            "mem-001": {"content": "Content 1"},
            "mem-002": {"content": "Content 2"},
        }
        result = await memory_cache.set_memories_batch(memories)

        assert result is True
        mock_pipeline.execute.assert_called_once()


class TestQueryCaching:
    """Tests for query result caching"""

    @pytest.mark.asyncio
    async def test_get_query_result_hit(self, memory_cache, mock_redis_client):
        """Test query cache hit"""
        test_results = [{"memory_id": "mem-001", "content": "Test"}]
        mock_redis_client.get = AsyncMock(return_value=json.dumps(test_results))
        memory_cache._client = mock_redis_client
        memory_cache._connected = True

        result = await memory_cache.get_query_result("test query", "project-1")

        assert result == test_results

    @pytest.mark.asyncio
    async def test_get_query_result_miss(self, memory_cache, mock_redis_client):
        """Test query cache miss"""
        mock_redis_client.get = AsyncMock(return_value=None)
        memory_cache._client = mock_redis_client
        memory_cache._connected = True

        result = await memory_cache.get_query_result("test query", "project-1")

        assert result is None

    @pytest.mark.asyncio
    async def test_set_query_result(self, memory_cache, mock_redis_client):
        """Test setting query result"""
        memory_cache._client = mock_redis_client
        memory_cache._connected = True

        results = [{"memory_id": "mem-001", "content": "Test"}]
        result = await memory_cache.set_query_result("test query", "project-1", results)

        assert result is True
        mock_redis_client.setex.assert_called()
        mock_redis_client.sadd.assert_called()  # Should track query key

    @pytest.mark.asyncio
    async def test_invalidate_query_caches(self, memory_cache, mock_redis_client):
        """Test invalidating all query caches"""
        mock_redis_client.smembers = AsyncMock(return_value={"key1", "key2"})
        memory_cache._client = mock_redis_client
        memory_cache._connected = True

        result = await memory_cache._invalidate_query_caches()

        assert result is True
        mock_redis_client.delete.assert_called()


class TestCoreMemoryCaching:
    """Tests for core memory caching"""

    @pytest.mark.asyncio
    async def test_get_core_memories_hit(self, memory_cache, mock_redis_client):
        """Test core memories cache hit"""
        test_data = [{"memory_id": "core-001", "tier": "core"}]
        mock_redis_client.get = AsyncMock(return_value=json.dumps(test_data))
        memory_cache._client = mock_redis_client
        memory_cache._connected = True

        result = await memory_cache.get_core_memories("project-1")

        assert result == test_data

    @pytest.mark.asyncio
    async def test_set_core_memories(self, memory_cache, mock_redis_client):
        """Test setting core memories"""
        memory_cache._client = mock_redis_client
        memory_cache._connected = True

        memories = [{"memory_id": "core-001", "tier": "core"}]
        result = await memory_cache.set_core_memories("project-1", memories)

        assert result is True
        # Core memories have longer TTL (600 seconds)
        call_args = mock_redis_client.setex.call_args
        assert call_args[0][1] == 600

    @pytest.mark.asyncio
    async def test_invalidate_core_memories(self, memory_cache, mock_redis_client):
        """Test invalidating core memories cache"""
        memory_cache._client = mock_redis_client
        memory_cache._connected = True

        result = await memory_cache.invalidate_core_memories("project-1")

        assert result is True
        mock_redis_client.delete.assert_called()


class TestCacheStatistics:
    """Tests for cache statistics"""

    @pytest.mark.asyncio
    async def test_get_stats_connected(self, memory_cache, mock_redis_client):
        """Test getting cache statistics"""
        async def mock_scan_iter(pattern):
            if "mem" in pattern:
                for key in ["key1", "key2"]:
                    yield key
            else:
                return

        mock_redis_client.scan_iter = mock_scan_iter
        memory_cache._client = mock_redis_client
        memory_cache._connected = True

        stats = await memory_cache.get_stats()

        assert stats["connected"] is True
        assert "memory_entries" in stats
        assert "employee_id" in stats

    @pytest.mark.asyncio
    async def test_get_stats_not_connected(self, memory_cache):
        """Test stats when not connected"""
        memory_cache._connected = False

        stats = await memory_cache.get_stats()

        assert stats["connected"] is False


class TestCacheClear:
    """Tests for cache clearing"""

    @pytest.mark.asyncio
    async def test_clear_all(self, memory_cache, mock_redis_client):
        """Test clearing all cache entries"""
        async def mock_scan_iter(pattern):
            for key in ["key1", "key2", "key3"]:
                yield key

        mock_redis_client.scan_iter = mock_scan_iter
        memory_cache._client = mock_redis_client
        memory_cache._connected = True

        result = await memory_cache.clear_all()

        assert result is True
        mock_redis_client.delete.assert_called()

    @pytest.mark.asyncio
    async def test_clear_all_empty_cache(self, memory_cache, mock_redis_client):
        """Test clearing when cache is empty"""
        async def mock_scan_iter(pattern):
            return
            yield  # Make it a generator

        mock_redis_client.scan_iter = mock_scan_iter
        memory_cache._client = mock_redis_client
        memory_cache._connected = True

        result = await memory_cache.clear_all()

        # Should succeed even with no keys
        assert result is True


class TestDisconnectedOperations:
    """Tests for operations when not connected"""

    @pytest.mark.asyncio
    async def test_get_memory_not_connected(self, memory_cache):
        """Test get_memory returns None when not connected"""
        memory_cache._connected = False
        result = await memory_cache.get_memory("mem-001")
        assert result is None

    @pytest.mark.asyncio
    async def test_set_memory_not_connected(self, memory_cache):
        """Test set_memory returns False when not connected"""
        memory_cache._connected = False
        result = await memory_cache.set_memory("mem-001", {})
        assert result is False

    @pytest.mark.asyncio
    async def test_get_memories_batch_not_connected(self, memory_cache):
        """Test get_memories_batch returns empty when not connected"""
        memory_cache._connected = False
        result = await memory_cache.get_memories_batch(["mem-001"])
        assert result == {}

    @pytest.mark.asyncio
    async def test_clear_all_not_connected(self, memory_cache):
        """Test clear_all returns False when not connected"""
        memory_cache._connected = False
        result = await memory_cache.clear_all()
        assert result is False

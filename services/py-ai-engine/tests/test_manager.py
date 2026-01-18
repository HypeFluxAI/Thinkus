"""
Unit Tests for Memory Manager
Tests the unified memory management system
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime

from memory.manager import MemoryManager
from memory.models import Memory, MemoryCandidate, MemoryType, MemoryTier, MemoryStatus


class TestMemoryManagerInit:
    """Tests for manager initialization"""

    def test_manager_initialization(self):
        """Test manager initializes with employee ID"""
        manager = MemoryManager("mike_pm")
        assert manager.employee_id == "mike_pm"
        assert manager.namespace == "employee_mike_pm"

    def test_manager_initializes_subsystems(self):
        """Test that all subsystems are initialized"""
        manager = MemoryManager("test_employee")

        assert manager.scorer is not None
        assert manager.corrector is not None
        assert manager.decay_manager is not None
        assert manager.merger is not None
        assert manager.injector is not None
        assert manager.retriever is not None
        assert manager.budget_manager is not None
        assert manager.summarizer is not None
        assert manager.cache is not None


class TestMemoryManagerSave:
    """Tests for saving memories"""

    @pytest.mark.asyncio
    async def test_save_without_index(self):
        """Test save returns False without Pinecone index"""
        manager = MemoryManager("test_employee")
        manager.index = None

        result = await manager.save(
            "Test message",
            "Test response",
            "test-project"
        )

        assert result is False

    @pytest.mark.asyncio
    async def test_save_with_no_candidates(self, mock_pinecone_index, mock_openai_client):
        """Test save when no high-value candidates extracted"""
        manager = MemoryManager("test_employee")
        manager.index = mock_pinecone_index
        manager.openai = mock_openai_client

        # Mock scorer to return no candidates
        with patch.object(manager.scorer, 'filter_and_score', AsyncMock(return_value=[])):
            with patch.object(manager.retriever, 'retrieve_directory_only', AsyncMock(return_value=[])):
                result = await manager.save(
                    "Hello",
                    "Hi there",
                    "test-project"
                )

                # Should return True (not an error, just nothing to save)
                assert result is True


class TestMemoryManagerRetrieve:
    """Tests for retrieving memories"""

    @pytest.mark.asyncio
    async def test_retrieve_uses_cache(self, mock_redis_client):
        """Test that retrieve checks cache first"""
        manager = MemoryManager("test_employee")
        manager.cache._client = mock_redis_client
        manager.cache._connected = True

        cached_result = [{"memory_id": "mem-001", "content": "Cached"}]
        mock_redis_client.get = AsyncMock(return_value='[{"memory_id": "mem-001", "content": "Cached"}]')

        with patch.object(manager.cache, 'get_query_result', AsyncMock(return_value=cached_result)):
            result = await manager.retrieve("test query", "test-project")

            assert result == cached_result

    @pytest.mark.asyncio
    async def test_retrieve_formats_response(self, mock_pinecone_index, mock_openai_client):
        """Test that retrieve formats memories correctly"""
        manager = MemoryManager("test_employee")
        manager.index = mock_pinecone_index
        manager.openai = mock_openai_client

        # Create mock memory
        mock_memory = Memory(
            memory_id="mem-001",
            content="Test content",
            type=MemoryType.FACT,
            tier=MemoryTier.RELEVANT,
            status=MemoryStatus.ACTIVE,
            confidence=0.9,
            decay_factor=1.0,
        )

        with patch.object(manager.retriever, 'retrieve', AsyncMock(return_value=[mock_memory])):
            with patch.object(manager.cache, 'get_query_result', AsyncMock(return_value=None)):
                with patch.object(manager.cache, 'set_query_result', AsyncMock(return_value=True)):
                    with patch.object(manager, '_ensure_cache', AsyncMock(return_value=True)):
                        result = await manager.retrieve("test query", "test-project")

                        assert len(result) >= 1
                        assert "id" in result[0]
                        assert "content" in result[0]
                        assert "type" in result[0]


class TestMemoryManagerContextForChat:
    """Tests for getting context for chat"""

    @pytest.mark.asyncio
    async def test_get_context_for_chat(self, mock_pinecone_index, mock_openai_client):
        """Test getting formatted context for chat"""
        manager = MemoryManager("test_employee")
        manager.index = mock_pinecone_index
        manager.openai = mock_openai_client

        mock_memories = [
            Memory(
                memory_id="mem-001",
                content="User prefers TypeScript",
                type=MemoryType.PREFERENCE,
                tier=MemoryTier.CORE,
                status=MemoryStatus.ACTIVE,
            )
        ]

        with patch.object(manager.retriever, 'get_core_memories', AsyncMock(return_value=mock_memories)):
            with patch.object(manager.retriever, 'retrieve', AsyncMock(return_value=[])):
                with patch('memory.manager.get_shared_manager') as mock_shared:
                    mock_shared.return_value.get_shared_memories = AsyncMock(return_value=[])

                    context = await manager.get_context_for_chat(
                        "What tech should I use?",
                        "test-project"
                    )

                    # Context should be a string
                    assert isinstance(context, str)


class TestMemoryManagerCorrection:
    """Tests for memory correction"""

    @pytest.mark.asyncio
    async def test_correct_memories_returns_count(self, mock_pinecone_index, mock_openai_client):
        """Test that correction returns count of modified memories"""
        manager = MemoryManager("test_employee")
        manager.index = mock_pinecone_index
        manager.openai = mock_openai_client

        mock_memories = [
            Memory(
                memory_id="mem-001",
                content="User uses React",
                embedding=[0.1] * 1536,
            )
        ]

        with patch.object(manager.retriever, 'retrieve', AsyncMock(return_value=mock_memories)):
            with patch.object(manager.corrector, 'check_and_correct', AsyncMock(return_value=[])):
                count = await manager.correct_memories(
                    "We switched to Vue",
                    "Vue is great!",
                    "test-project"
                )

                assert isinstance(count, int)


class TestMemoryManagerMaintenance:
    """Tests for memory maintenance"""

    @pytest.mark.asyncio
    async def test_run_maintenance_returns_stats(self, mock_pinecone_index):
        """Test that maintenance returns statistics"""
        manager = MemoryManager("test_employee")
        manager.index = mock_pinecone_index

        mock_memories = [
            Memory(memory_id="mem-001", content="Test", embedding=[0.1] * 1536)
        ]

        with patch.object(manager.retriever, 'retrieve', AsyncMock(return_value=mock_memories)):
            stats = await manager.run_maintenance("test-project")

            assert "processed" in stats
            assert "decayed" in stats
            assert "merged" in stats
            assert "expired" in stats

    @pytest.mark.asyncio
    async def test_run_maintenance_empty_memories(self, mock_pinecone_index):
        """Test maintenance with no memories"""
        manager = MemoryManager("test_employee")
        manager.index = mock_pinecone_index

        with patch.object(manager.retriever, 'retrieve', AsyncMock(return_value=[])):
            stats = await manager.run_maintenance("test-project")

            assert stats["processed"] == 0


class TestMemoryManagerDeleteProject:
    """Tests for deleting project memories"""

    @pytest.mark.asyncio
    async def test_delete_project_memories(self, mock_pinecone_index):
        """Test deleting all memories for a project"""
        manager = MemoryManager("test_employee")
        manager.index = mock_pinecone_index

        result = await manager.delete_project_memories("test-project")

        assert result is True
        mock_pinecone_index.delete.assert_called_once()

    @pytest.mark.asyncio
    async def test_delete_project_memories_without_index(self):
        """Test delete returns False without index"""
        manager = MemoryManager("test_employee")
        manager.index = None

        result = await manager.delete_project_memories("test-project")

        assert result is False


class TestMemoryManagerStats:
    """Tests for statistics retrieval"""

    @pytest.mark.asyncio
    async def test_get_stats(self, mock_pinecone_index):
        """Test getting memory statistics"""
        manager = MemoryManager("test_employee")
        manager.index = mock_pinecone_index

        mock_memories = [
            Memory(
                memory_id="mem-001",
                type=MemoryType.FACT,
                tier=MemoryTier.CORE,
                confidence=0.9,
            ),
            Memory(
                memory_id="mem-002",
                type=MemoryType.PREFERENCE,
                tier=MemoryTier.RELEVANT,
                confidence=0.8,
            ),
        ]

        with patch.object(manager.retriever, 'retrieve', AsyncMock(return_value=mock_memories)):
            stats = await manager.get_stats("test-project")

            assert "tiers" in stats
            assert "types" in stats
            assert "employee_id" in stats

    @pytest.mark.asyncio
    async def test_get_stats_empty_memories(self, mock_pinecone_index):
        """Test stats with no memories"""
        manager = MemoryManager("test_employee")
        manager.index = mock_pinecone_index

        with patch.object(manager.retriever, 'retrieve', AsyncMock(return_value=[])):
            stats = await manager.get_stats("test-project")

            assert stats["count"] == 0


class TestMemoryManagerEmbedding:
    """Tests for embedding generation"""

    @pytest.mark.asyncio
    async def test_get_embedding(self, mock_openai_client):
        """Test embedding generation"""
        manager = MemoryManager("test_employee")
        manager.openai = mock_openai_client

        embedding = await manager._get_embedding("test text")

        assert embedding is not None
        assert len(embedding) == 1536

    @pytest.mark.asyncio
    async def test_get_embedding_without_client(self):
        """Test embedding returns None without client"""
        manager = MemoryManager("test_employee")
        manager.openai = None

        embedding = await manager._get_embedding("test text")

        assert embedding is None


class TestMemoryManagerContentSimilarity:
    """Tests for content similarity calculation"""

    def test_content_similarity_identical(self):
        """Test similarity of identical content"""
        manager = MemoryManager("test_employee")

        similarity = manager._content_similarity("hello world", "hello world")

        assert similarity == 1.0

    def test_content_similarity_different(self):
        """Test similarity of different content"""
        manager = MemoryManager("test_employee")

        similarity = manager._content_similarity("hello world", "python java")

        assert similarity == 0.0

    def test_content_similarity_partial(self):
        """Test partial similarity"""
        manager = MemoryManager("test_employee")

        similarity = manager._content_similarity("hello world foo", "hello world bar")

        # 2 words in common out of 4 total
        assert 0.3 < similarity < 0.7


class TestMemoryManagerSessionSummarize:
    """Tests for session summarization"""

    @pytest.mark.asyncio
    async def test_summarize_session(self, mock_pinecone_index, mock_openai_client):
        """Test session summarization"""
        manager = MemoryManager("test_employee")
        manager.index = mock_pinecone_index
        manager.openai = mock_openai_client

        messages = [
            {"role": "user", "content": "I'm building an app"},
            {"role": "assistant", "content": "Great! What kind of app?"},
        ]

        with patch.object(manager.summarizer, 'should_summarize', AsyncMock(return_value=True)):
            with patch.object(manager.summarizer, 'summarize_session', AsyncMock(return_value="Session summary")):
                with patch.object(manager.summarizer, 'extract_memories_from_summary', AsyncMock(return_value=[])):
                    result = await manager.summarize_session(
                        messages,
                        "test-project",
                        "test-user"
                    )

                    assert result is True


class TestMemoryManagerCache:
    """Tests for cache integration"""

    @pytest.mark.asyncio
    async def test_ensure_cache_connects(self, mock_redis_client):
        """Test cache initialization"""
        manager = MemoryManager("test_employee")

        with patch.object(manager.cache, 'connect', AsyncMock(return_value=True)):
            result = await manager._ensure_cache()

            assert result is True
            assert manager._cache_initialized is True

    @pytest.mark.asyncio
    async def test_ensure_cache_only_connects_once(self, mock_redis_client):
        """Test that cache only connects once"""
        manager = MemoryManager("test_employee")
        manager._cache_initialized = True

        # Should not call connect again
        with patch.object(manager.cache, 'connect', AsyncMock(return_value=True)) as mock_connect:
            await manager._ensure_cache()

            mock_connect.assert_not_called()

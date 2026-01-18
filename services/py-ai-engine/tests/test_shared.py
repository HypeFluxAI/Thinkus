"""
Unit Tests for Shared Memory Manager
Tests cross-employee memory sharing
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime

from memory.shared import (
    SharedMemoryManager, SharedMemoryScope, SHAREABLE_TYPES
)
from memory.models import Memory, MemoryType, MemoryTier, MemoryStatus


class TestSharedMemoryScope:
    """Tests for SharedMemoryScope enum"""

    def test_scope_values(self):
        """Test scope enum values"""
        assert SharedMemoryScope.PROJECT.value == "project"
        assert SharedMemoryScope.GLOBAL.value == "global"
        assert SharedMemoryScope.ORGANIZATION.value == "org"


class TestShareableTypes:
    """Tests for shareable memory types"""

    def test_shareable_types_include_fact(self):
        """Test that FACT is shareable"""
        assert MemoryType.FACT in SHAREABLE_TYPES

    def test_shareable_types_include_preference(self):
        """Test that PREFERENCE is shareable"""
        assert MemoryType.PREFERENCE in SHAREABLE_TYPES

    def test_shareable_types_include_decision(self):
        """Test that DECISION is shareable"""
        assert MemoryType.DECISION in SHAREABLE_TYPES

    def test_shareable_types_exclude_context(self):
        """Test that CONTEXT is not shareable"""
        assert MemoryType.CONTEXT not in SHAREABLE_TYPES


class TestIsShareable:
    """Tests for shareability checks"""

    def test_is_shareable_fact_with_indicators(self, shared_memory_manager):
        """Test that project facts are shareable"""
        memory = Memory(
            type=MemoryType.FACT,
            content="Our project uses React for the frontend",
            confidence=0.9,
            status=MemoryStatus.ACTIVE
        )
        assert shared_memory_manager.is_shareable(memory) is True

    def test_is_shareable_low_confidence(self, shared_memory_manager):
        """Test that low confidence memories are not shareable"""
        memory = Memory(
            type=MemoryType.FACT,
            content="Our project might use React",
            confidence=0.5,  # Below 0.7 threshold
            status=MemoryStatus.ACTIVE
        )
        assert shared_memory_manager.is_shareable(memory) is False

    def test_is_shareable_non_active(self, shared_memory_manager):
        """Test that non-active memories are not shareable"""
        memory = Memory(
            type=MemoryType.FACT,
            content="Our project uses React",
            confidence=0.9,
            status=MemoryStatus.DOWNWEIGHTED
        )
        assert shared_memory_manager.is_shareable(memory) is False

    def test_is_shareable_without_indicators(self, shared_memory_manager):
        """Test that memories without sharing indicators are not shareable"""
        memory = Memory(
            type=MemoryType.FACT,
            content="Hello there",  # No sharing indicators
            confidence=0.9,
            status=MemoryStatus.ACTIVE
        )
        assert shared_memory_manager.is_shareable(memory) is False

    def test_is_shareable_with_tech_stack(self, shared_memory_manager):
        """Test that tech stack memories are shareable"""
        memory = Memory(
            type=MemoryType.DECISION,
            content="Our tech stack includes Node.js and MongoDB",
            confidence=0.9,
            status=MemoryStatus.ACTIVE
        )
        assert shared_memory_manager.is_shareable(memory) is True

    def test_is_shareable_with_team_mention(self, shared_memory_manager):
        """Test that team-related memories are shareable"""
        memory = Memory(
            type=MemoryType.PREFERENCE,
            content="Our team prefers daily standups",
            confidence=0.8,
            status=MemoryStatus.ACTIVE
        )
        assert shared_memory_manager.is_shareable(memory) is True

    def test_is_shareable_context_type(self, shared_memory_manager):
        """Test that CONTEXT type is not shareable"""
        memory = Memory(
            type=MemoryType.CONTEXT,
            content="Our project meeting notes",
            confidence=0.9,
            status=MemoryStatus.ACTIVE
        )
        assert shared_memory_manager.is_shareable(memory) is False


class TestShareMemory:
    """Tests for sharing memories"""

    @pytest.mark.asyncio
    async def test_share_memory_success(self, shared_memory_manager, mock_pinecone_index, mock_openai_client, sample_embedding):
        """Test successfully sharing a memory"""
        memory = Memory(
            memory_id="mem-001",
            type=MemoryType.FACT,
            content="Our project uses React for the frontend",
            confidence=0.9,
            status=MemoryStatus.ACTIVE,
            embedding=sample_embedding
        )

        with patch.object(shared_memory_manager, 'index', mock_pinecone_index):
            with patch.object(shared_memory_manager, 'openai', mock_openai_client):
                result = await shared_memory_manager.share_memory(
                    memory, SharedMemoryScope.PROJECT
                )

                assert result is True
                mock_pinecone_index.upsert.assert_called_once()

    @pytest.mark.asyncio
    async def test_share_memory_not_shareable(self, shared_memory_manager):
        """Test that non-shareable memories are rejected"""
        memory = Memory(
            type=MemoryType.CONTEXT,  # Not shareable
            content="Random context",
            confidence=0.9,
            status=MemoryStatus.ACTIVE
        )

        result = await shared_memory_manager.share_memory(memory)
        assert result is False

    @pytest.mark.asyncio
    async def test_share_memory_without_index(self, shared_memory_manager):
        """Test sharing fails without Pinecone index"""
        shared_memory_manager.index = None

        memory = Memory(
            type=MemoryType.FACT,
            content="Our project uses React",
            confidence=0.9,
            status=MemoryStatus.ACTIVE
        )

        result = await shared_memory_manager.share_memory(memory)
        assert result is False

    @pytest.mark.asyncio
    async def test_share_memory_generates_embedding(self, shared_memory_manager, mock_pinecone_index, mock_openai_client):
        """Test that embedding is generated if not present"""
        memory = Memory(
            memory_id="mem-001",
            type=MemoryType.FACT,
            content="Our project uses React",
            confidence=0.9,
            status=MemoryStatus.ACTIVE,
            embedding=None  # No embedding
        )

        with patch.object(shared_memory_manager, 'index', mock_pinecone_index):
            with patch.object(shared_memory_manager, 'openai', mock_openai_client):
                result = await shared_memory_manager.share_memory(memory)

                assert result is True
                mock_openai_client.embeddings.create.assert_called_once()


class TestGetSharedMemories:
    """Tests for retrieving shared memories"""

    @pytest.mark.asyncio
    async def test_get_shared_memories(self, shared_memory_manager, mock_pinecone_index, mock_openai_client):
        """Test retrieving shared memories"""
        mock_pinecone_index.query = MagicMock(return_value=MagicMock(
            matches=[
                MagicMock(
                    id="shared-001",
                    score=0.85,
                    metadata={
                        "memory_id": "shared-001",
                        "content": "Project uses React",
                        "type": "fact",
                        "confidence": 0.9,
                    }
                )
            ]
        ))

        with patch.object(shared_memory_manager, 'index', mock_pinecone_index):
            with patch.object(shared_memory_manager, 'openai', mock_openai_client):
                memories = await shared_memory_manager.get_shared_memories(
                    "frontend framework",
                    "test-project",
                    SharedMemoryScope.PROJECT
                )

                assert len(memories) >= 1
                for memory in memories:
                    assert isinstance(memory, Memory)

    @pytest.mark.asyncio
    async def test_get_shared_memories_filters_low_score(self, shared_memory_manager, mock_openai_client):
        """Test that low score matches are filtered"""
        low_score_index = MagicMock()
        low_score_index.query = MagicMock(return_value=MagicMock(
            matches=[
                MagicMock(
                    id="shared-001",
                    score=0.2,  # Below 0.3 threshold
                    metadata={"content": "test"}
                )
            ]
        ))

        with patch.object(shared_memory_manager, 'index', low_score_index):
            with patch.object(shared_memory_manager, 'openai', mock_openai_client):
                memories = await shared_memory_manager.get_shared_memories(
                    "test query",
                    "test-project"
                )

                assert len(memories) == 0

    @pytest.mark.asyncio
    async def test_get_shared_memories_without_index(self, shared_memory_manager):
        """Test retrieval without Pinecone index"""
        shared_memory_manager.index = None

        memories = await shared_memory_manager.get_shared_memories(
            "test query",
            "test-project"
        )

        assert memories == []


class TestSyncToShared:
    """Tests for syncing memories to shared pool"""

    @pytest.mark.asyncio
    async def test_sync_to_shared(self, shared_memory_manager, mock_pinecone_index, mock_openai_client, sample_embedding):
        """Test syncing employee memories to shared pool"""
        memories = [
            Memory(
                memory_id="mem-001",
                type=MemoryType.FACT,
                content="Our project uses React",
                confidence=0.9,
                status=MemoryStatus.ACTIVE,
                embedding=sample_embedding
            ),
            Memory(
                memory_id="mem-002",
                type=MemoryType.CONTEXT,  # Not shareable
                content="Session notes",
                confidence=0.9,
                status=MemoryStatus.ACTIVE
            ),
        ]

        with patch.object(shared_memory_manager, 'index', mock_pinecone_index):
            with patch.object(shared_memory_manager, 'openai', mock_openai_client):
                count = await shared_memory_manager.sync_to_shared(
                    "mike_pm",
                    "test-project",
                    memories
                )

                # Only the FACT memory should be shared
                assert count == 1


class TestGetProjectContext:
    """Tests for getting project context"""

    @pytest.mark.asyncio
    async def test_get_project_context(self, shared_memory_manager, mock_pinecone_index):
        """Test getting all shared context for a project"""
        mock_pinecone_index.query = MagicMock(return_value=MagicMock(
            matches=[
                MagicMock(
                    id="ctx-001",
                    metadata={
                        "memory_id": "ctx-001",
                        "content": "Project context",
                        "confidence": 0.9,
                    }
                )
            ]
        ))

        with patch.object(shared_memory_manager, 'index', mock_pinecone_index):
            memories = await shared_memory_manager.get_project_context("test-project")

            assert len(memories) >= 1

    @pytest.mark.asyncio
    async def test_get_project_context_sorted_by_confidence(self, shared_memory_manager):
        """Test that project context is sorted by confidence"""
        multi_result_index = MagicMock()
        multi_result_index.query = MagicMock(return_value=MagicMock(
            matches=[
                MagicMock(id="ctx-001", metadata={
                    "memory_id": "ctx-001", "content": "low conf", "confidence": 0.5
                }),
                MagicMock(id="ctx-002", metadata={
                    "memory_id": "ctx-002", "content": "high conf", "confidence": 0.9
                }),
            ]
        ))

        with patch.object(shared_memory_manager, 'index', multi_result_index):
            memories = await shared_memory_manager.get_project_context("test-project")

            if len(memories) >= 2:
                # Higher confidence should come first
                assert memories[0].confidence >= memories[-1].confidence


class TestInvalidateShared:
    """Tests for invalidating shared memories"""

    @pytest.mark.asyncio
    async def test_invalidate_shared(self, shared_memory_manager, mock_pinecone_index):
        """Test invalidating a shared memory"""
        with patch.object(shared_memory_manager, 'index', mock_pinecone_index):
            result = await shared_memory_manager.invalidate_shared(
                "mem-001",
                "test-project"
            )

            assert result is True
            mock_pinecone_index.delete.assert_called_once()

    @pytest.mark.asyncio
    async def test_invalidate_shared_without_index(self, shared_memory_manager):
        """Test invalidation fails without index"""
        shared_memory_manager.index = None

        result = await shared_memory_manager.invalidate_shared(
            "mem-001",
            "test-project"
        )

        assert result is False


class TestEmbedding:
    """Tests for embedding functionality"""

    @pytest.mark.asyncio
    async def test_get_embedding(self, shared_memory_manager, mock_openai_client):
        """Test embedding generation"""
        with patch.object(shared_memory_manager, 'openai', mock_openai_client):
            embedding = await shared_memory_manager._get_embedding("test text")

            assert embedding is not None
            assert len(embedding) == 1536

    @pytest.mark.asyncio
    async def test_get_embedding_without_client(self, shared_memory_manager):
        """Test embedding returns None without client"""
        shared_memory_manager.openai = None

        embedding = await shared_memory_manager._get_embedding("test text")

        assert embedding is None

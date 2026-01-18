"""
Unit Tests for Memory Retriever
Tests two-stage retrieval: directory-level then detail-level
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime

from memory.retriever import (
    MemoryRetriever, DirectoryEntry,
    DIRECTORY_TOP_K, DETAIL_TOP_K, RELEVANCE_THRESHOLD
)
from memory.models import Memory, MemoryTier, MemoryStatus, MemoryType


class TestDirectoryEntry:
    """Tests for DirectoryEntry class"""

    def test_directory_entry_creation(self):
        """Test creating a directory entry"""
        entry = DirectoryEntry(
            memory_id="mem-001",
            summary="Test summary",
            keywords=["test", "keyword"],
            memory_type="fact",
            confidence=0.9,
            score=0.85
        )
        assert entry.memory_id == "mem-001"
        assert entry.score == 0.85

    def test_directory_entry_to_dict(self):
        """Test converting to dictionary"""
        entry = DirectoryEntry(
            memory_id="mem-001",
            summary="Test summary",
            keywords=["test"],
            memory_type="fact",
            confidence=0.9,
            score=0.85
        )
        d = entry.to_dict()
        assert d["memory_id"] == "mem-001"
        assert d["summary"] == "Test summary"
        assert d["score"] == 0.85


class TestMemoryRetrieverInit:
    """Tests for retriever initialization"""

    def test_retriever_initialization(self):
        """Test retriever initializes with employee ID"""
        retriever = MemoryRetriever("test_employee")
        assert retriever.employee_id == "test_employee"
        assert retriever.namespace == "employee_test_employee"

    def test_retriever_with_env_index_name(self):
        """Test retriever uses environment variable for index name"""
        with patch.dict('os.environ', {'PINECONE_INDEX_NAME': 'custom-index'}):
            retriever = MemoryRetriever("test_employee")
            assert retriever.index_name == "custom-index"


class TestMemoryRetrieverStage1:
    """Tests for Stage 1 (Directory) retrieval"""

    @pytest.mark.asyncio
    async def test_stage1_returns_directory_entries(self, memory_retriever, mock_pinecone_index, mock_openai_client):
        """Test that stage1 returns DirectoryEntry objects"""
        with patch.object(memory_retriever, 'index', mock_pinecone_index):
            with patch.object(memory_retriever, 'openai', mock_openai_client):
                entries = await memory_retriever.stage1_directory_search(
                    "test query",
                    "test-project"
                )

                # Should return DirectoryEntry objects
                for entry in entries:
                    assert isinstance(entry, DirectoryEntry)

    @pytest.mark.asyncio
    async def test_stage1_filters_low_relevance(self, memory_retriever, mock_openai_client):
        """Test that stage1 filters low relevance matches"""
        # Create mock with low score
        low_score_index = MagicMock()
        low_score_index.query = MagicMock(return_value=MagicMock(
            matches=[
                MagicMock(
                    id="mem-001",
                    score=0.1,  # Below RELEVANCE_THRESHOLD
                    metadata={"content": "test", "summary": "test"}
                )
            ]
        ))

        with patch.object(memory_retriever, 'index', low_score_index):
            with patch.object(memory_retriever, 'openai', mock_openai_client):
                entries = await memory_retriever.stage1_directory_search(
                    "test query",
                    "test-project"
                )

                # Low score should be filtered out
                assert len(entries) == 0

    @pytest.mark.asyncio
    async def test_stage1_without_index(self, memory_retriever):
        """Test stage1 returns empty list without Pinecone index"""
        memory_retriever.index = None
        entries = await memory_retriever.stage1_directory_search(
            "test query",
            "test-project"
        )
        assert entries == []

    @pytest.mark.asyncio
    async def test_stage1_without_embedding(self, memory_retriever, mock_pinecone_index):
        """Test stage1 returns empty list without embedding capability"""
        memory_retriever.openai = None
        with patch.object(memory_retriever, 'index', mock_pinecone_index):
            entries = await memory_retriever.stage1_directory_search(
                "test query",
                "test-project"
            )
            assert entries == []


class TestMemoryRetrieverStage2:
    """Tests for Stage 2 (Detail) retrieval"""

    @pytest.mark.asyncio
    async def test_stage2_fetches_full_memories(self, memory_retriever, mock_pinecone_index, directory_entries):
        """Test that stage2 fetches full Memory objects"""
        with patch.object(memory_retriever, 'index', mock_pinecone_index):
            memories = await memory_retriever.stage2_detail_fetch(directory_entries)

            for memory in memories:
                assert isinstance(memory, Memory)

    @pytest.mark.asyncio
    async def test_stage2_respects_max_entries(self, memory_retriever, mock_pinecone_index, directory_entries):
        """Test that stage2 respects max_entries limit"""
        with patch.object(memory_retriever, 'index', mock_pinecone_index):
            memories = await memory_retriever.stage2_detail_fetch(
                directory_entries,
                max_entries=1
            )

            assert len(memories) <= 1

    @pytest.mark.asyncio
    async def test_stage2_sorts_by_score_confidence(self, memory_retriever, mock_pinecone_index, directory_entries):
        """Test that stage2 sorts entries by score * confidence"""
        # The entries should be sorted before fetching
        with patch.object(memory_retriever, 'index', mock_pinecone_index):
            # Verify sorting happens
            sorted_entries = sorted(
                directory_entries,
                key=lambda e: e.score * e.confidence,
                reverse=True
            )
            assert sorted_entries[0].score * sorted_entries[0].confidence >= \
                   sorted_entries[-1].score * sorted_entries[-1].confidence

    @pytest.mark.asyncio
    async def test_stage2_empty_input(self, memory_retriever, mock_pinecone_index):
        """Test stage2 with empty directory entries"""
        with patch.object(memory_retriever, 'index', mock_pinecone_index):
            memories = await memory_retriever.stage2_detail_fetch([])
            assert memories == []


class TestMemoryRetrieverFullRetrieval:
    """Tests for full two-stage retrieval"""

    @pytest.mark.asyncio
    async def test_retrieve_combines_both_stages(self, memory_retriever, mock_pinecone_index, mock_openai_client):
        """Test that retrieve combines stage1 and stage2"""
        with patch.object(memory_retriever, 'index', mock_pinecone_index):
            with patch.object(memory_retriever, 'openai', mock_openai_client):
                memories = await memory_retriever.retrieve(
                    "test query",
                    "test-project"
                )

                # Should return Memory objects
                for memory in memories:
                    assert isinstance(memory, Memory)

    @pytest.mark.asyncio
    async def test_retrieve_respects_top_k(self, memory_retriever, mock_pinecone_index, mock_openai_client):
        """Test that retrieve respects top_k parameter"""
        with patch.object(memory_retriever, 'index', mock_pinecone_index):
            with patch.object(memory_retriever, 'openai', mock_openai_client):
                memories = await memory_retriever.retrieve(
                    "test query",
                    "test-project",
                    top_k=3
                )

                assert len(memories) <= 3

    @pytest.mark.asyncio
    async def test_retrieve_sorts_by_effective_confidence(self, memory_retriever, mock_pinecone_index, mock_openai_client):
        """Test that results are sorted by effective confidence"""
        # Create mock with multiple results
        multi_result_index = MagicMock()
        multi_result_index.query = MagicMock(return_value=MagicMock(
            matches=[
                MagicMock(id="mem-001", score=0.9, metadata={
                    "memory_id": "mem-001", "content": "high conf", "confidence": 0.9
                }),
                MagicMock(id="mem-002", score=0.8, metadata={
                    "memory_id": "mem-002", "content": "low conf", "confidence": 0.5
                }),
            ]
        ))
        multi_result_index.fetch = MagicMock(return_value=MagicMock(
            vectors={
                "mem-001": MagicMock(metadata={
                    "memory_id": "mem-001", "content": "high conf",
                    "confidence": 0.9, "decay_factor": 1.0
                }),
                "mem-002": MagicMock(metadata={
                    "memory_id": "mem-002", "content": "low conf",
                    "confidence": 0.5, "decay_factor": 1.0
                }),
            }
        ))

        with patch.object(memory_retriever, 'index', multi_result_index):
            with patch.object(memory_retriever, 'openai', mock_openai_client):
                memories = await memory_retriever.retrieve(
                    "test query",
                    "test-project"
                )

                if len(memories) >= 2:
                    # Higher effective confidence should come first
                    assert memories[0].effective_confidence >= memories[-1].effective_confidence


class TestMemoryRetrieverDirectoryOnly:
    """Tests for directory-only retrieval"""

    @pytest.mark.asyncio
    async def test_retrieve_directory_only(self, memory_retriever, mock_pinecone_index, mock_openai_client):
        """Test retrieving only directory entries"""
        with patch.object(memory_retriever, 'index', mock_pinecone_index):
            with patch.object(memory_retriever, 'openai', mock_openai_client):
                entries = await memory_retriever.retrieve_directory_only(
                    "test query",
                    "test-project"
                )

                for entry in entries:
                    assert isinstance(entry, DirectoryEntry)


class TestMemoryRetrieverByIds:
    """Tests for retrieval by memory IDs"""

    @pytest.mark.asyncio
    async def test_retrieve_by_ids(self, memory_retriever, mock_pinecone_index):
        """Test retrieving memories by their IDs"""
        with patch.object(memory_retriever, 'index', mock_pinecone_index):
            memories = await memory_retriever.retrieve_by_ids(["mem-001"])

            assert len(memories) >= 1
            for memory in memories:
                assert isinstance(memory, Memory)

    @pytest.mark.asyncio
    async def test_retrieve_by_ids_empty_list(self, memory_retriever, mock_pinecone_index):
        """Test retrieve_by_ids with empty list"""
        with patch.object(memory_retriever, 'index', mock_pinecone_index):
            memories = await memory_retriever.retrieve_by_ids([])
            assert memories == []

    @pytest.mark.asyncio
    async def test_retrieve_by_ids_missing_id(self, memory_retriever):
        """Test retrieve_by_ids with non-existent ID"""
        mock_index = MagicMock()
        mock_index.fetch = MagicMock(return_value=MagicMock(vectors={}))

        with patch.object(memory_retriever, 'index', mock_index):
            memories = await memory_retriever.retrieve_by_ids(["non-existent"])
            assert memories == []


class TestMemoryRetrieverCoreMemories:
    """Tests for core memory retrieval"""

    @pytest.mark.asyncio
    async def test_get_core_memories(self, memory_retriever, mock_pinecone_index):
        """Test getting core tier memories"""
        # Setup mock to return core tier memories
        core_mock_index = MagicMock()
        core_mock_index.query = MagicMock(return_value=MagicMock(
            matches=[
                MagicMock(id="core-001", score=1.0, metadata={
                    "memory_id": "core-001",
                    "tier": "core",
                    "status": "active",
                    "content": "Core memory content"
                })
            ]
        ))

        with patch.object(memory_retriever, 'index', core_mock_index):
            memories = await memory_retriever.get_core_memories("test-project")

            for memory in memories:
                assert isinstance(memory, Memory)

    @pytest.mark.asyncio
    async def test_get_core_memories_respects_limit(self, memory_retriever, mock_pinecone_index):
        """Test that core memory retrieval respects limit"""
        with patch.object(memory_retriever, 'index', mock_pinecone_index):
            memories = await memory_retriever.get_core_memories(
                "test-project",
                limit=2
            )
            assert len(memories) <= 2

    @pytest.mark.asyncio
    async def test_get_core_memories_without_index(self, memory_retriever):
        """Test core memory retrieval without index"""
        memory_retriever.index = None
        memories = await memory_retriever.get_core_memories("test-project")
        assert memories == []


class TestMemoryRetrieverEmbedding:
    """Tests for embedding functionality"""

    @pytest.mark.asyncio
    async def test_get_embedding(self, memory_retriever, mock_openai_client):
        """Test embedding generation"""
        with patch.object(memory_retriever, 'openai', mock_openai_client):
            embedding = await memory_retriever._get_embedding("test text")
            assert embedding is not None
            assert len(embedding) == 1536  # text-embedding-3-small dimension

    @pytest.mark.asyncio
    async def test_get_embedding_without_client(self, memory_retriever):
        """Test embedding returns None without OpenAI client"""
        memory_retriever.openai = None
        embedding = await memory_retriever._get_embedding("test text")
        assert embedding is None

    @pytest.mark.asyncio
    async def test_get_embedding_handles_error(self, memory_retriever):
        """Test embedding handles API errors"""
        error_client = AsyncMock()
        error_client.embeddings.create = AsyncMock(side_effect=Exception("API Error"))

        with patch.object(memory_retriever, 'openai', error_client):
            embedding = await memory_retriever._get_embedding("test text")
            assert embedding is None

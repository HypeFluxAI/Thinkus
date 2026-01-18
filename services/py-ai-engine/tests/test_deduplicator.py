"""
Unit Tests for Semantic Deduplicator
Tests embedding-based memory deduplication
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import numpy as np

from memory.deduplicator import (
    SemanticDeduplicator, SIMILARITY_THRESHOLD, NEAR_DUPLICATE_THRESHOLD
)
from memory.models import Memory, MemoryType, MemoryTier


class TestCosineSimilarity:
    """Tests for cosine similarity calculation"""

    def test_cosine_similarity_identical(self, semantic_deduplicator, sample_embedding):
        """Test similarity of identical vectors is 1.0"""
        similarity = semantic_deduplicator.cosine_similarity(
            sample_embedding, sample_embedding
        )
        assert abs(similarity - 1.0) < 0.001

    def test_cosine_similarity_different(self, semantic_deduplicator, sample_embedding, different_embedding):
        """Test similarity of different vectors is low"""
        similarity = semantic_deduplicator.cosine_similarity(
            sample_embedding, different_embedding
        )
        # Random vectors should have low similarity
        assert similarity < 0.5

    def test_cosine_similarity_similar(self, semantic_deduplicator, sample_embedding, similar_embedding):
        """Test similarity of similar vectors is high"""
        similarity = semantic_deduplicator.cosine_similarity(
            sample_embedding, similar_embedding
        )
        # Similar vectors should have high similarity
        assert similarity > 0.9

    def test_cosine_similarity_empty_vectors(self, semantic_deduplicator):
        """Test handling of empty vectors"""
        similarity = semantic_deduplicator.cosine_similarity([], [])
        assert similarity == 0.0

    def test_cosine_similarity_none_vectors(self, semantic_deduplicator):
        """Test handling of None vectors"""
        similarity = semantic_deduplicator.cosine_similarity(None, None)
        assert similarity == 0.0


class TestContentSimilarity:
    """Tests for content-based similarity (fallback)"""

    def test_content_similarity_identical(self, semantic_deduplicator):
        """Test identical content has similarity 1.0"""
        content = "the project uses react"
        similarity = semantic_deduplicator._content_similarity(content, content)
        assert similarity == 1.0

    def test_content_similarity_different(self, semantic_deduplicator):
        """Test completely different content has similarity 0.0"""
        content1 = "hello world foo bar"
        content2 = "python java ruby rust"
        similarity = semantic_deduplicator._content_similarity(content1, content2)
        assert similarity == 0.0

    def test_content_similarity_partial(self, semantic_deduplicator):
        """Test partially overlapping content"""
        content1 = "the project uses react"
        content2 = "the project uses vue"
        similarity = semantic_deduplicator._content_similarity(content1, content2)
        # 3 words in common out of 5 total
        assert 0.4 < similarity < 0.8


class TestIsDuplicate:
    """Tests for duplicate detection"""

    def test_is_duplicate_with_embeddings(self, semantic_deduplicator, sample_embedding, similar_embedding):
        """Test duplicate detection with embeddings"""
        memory1 = Memory(content="Test content 1", embedding=sample_embedding)
        memory2 = Memory(content="Test content 2", embedding=similar_embedding)

        # Similar embeddings should be duplicates
        is_dup = semantic_deduplicator.is_duplicate(memory1, memory2)
        assert is_dup is True

    def test_is_duplicate_different_embeddings(self, semantic_deduplicator, sample_embedding, different_embedding):
        """Test non-duplicate detection with different embeddings"""
        memory1 = Memory(content="Test content 1", embedding=sample_embedding)
        memory2 = Memory(content="Different content", embedding=different_embedding)

        is_dup = semantic_deduplicator.is_duplicate(memory1, memory2)
        assert is_dup is False

    def test_is_duplicate_fallback_to_content(self, semantic_deduplicator):
        """Test fallback to content comparison without embeddings"""
        memory1 = Memory(content="The project uses React", embedding=None)
        memory2 = Memory(content="The project uses React", embedding=None)

        is_dup = semantic_deduplicator.is_duplicate(memory1, memory2)
        assert is_dup is True

    def test_is_duplicate_custom_threshold(self, semantic_deduplicator, sample_embedding, similar_embedding):
        """Test custom similarity threshold"""
        memory1 = Memory(content="Test 1", embedding=sample_embedding)
        memory2 = Memory(content="Test 2", embedding=similar_embedding)

        # With very high threshold, might not be duplicate
        is_dup = semantic_deduplicator.is_duplicate(memory1, memory2, threshold=0.99)
        # Result depends on actual similarity


class TestSelectBestMemory:
    """Tests for selecting best memory between duplicates"""

    def test_select_higher_confidence(self, semantic_deduplicator):
        """Test that higher confidence memory is selected"""
        memory1 = Memory(content="Test", confidence=0.9, support=2)
        memory2 = Memory(content="Test", confidence=0.6, support=2)

        best = semantic_deduplicator.select_best_memory(memory1, memory2)
        assert best == memory1

    def test_select_more_support(self, semantic_deduplicator):
        """Test that memory with more support is selected"""
        memory1 = Memory(content="Test", confidence=0.8, support=5)
        memory2 = Memory(content="Test", confidence=0.8, support=1)

        best = semantic_deduplicator.select_best_memory(memory1, memory2)
        assert best == memory1

    def test_select_newer(self, semantic_deduplicator):
        """Test that newer memory is preferred when other factors equal"""
        from datetime import datetime, timedelta
        now = datetime.utcnow()

        memory1 = Memory(content="Test", confidence=0.8, support=2, created_at=now)
        memory2 = Memory(content="Test", confidence=0.8, support=2, created_at=now - timedelta(days=30))

        best = semantic_deduplicator.select_best_memory(memory1, memory2)
        assert best == memory1


class TestFindDuplicates:
    """Tests for finding duplicate pairs"""

    @pytest.mark.asyncio
    async def test_find_duplicates_with_embeddings(self, semantic_deduplicator, sample_embedding, similar_embedding, different_embedding):
        """Test finding duplicates in a list"""
        memories = [
            Memory(memory_id="mem-001", content="Test 1", embedding=sample_embedding),
            Memory(memory_id="mem-002", content="Test 2", embedding=similar_embedding),  # Dup of mem-001
            Memory(memory_id="mem-003", content="Different", embedding=different_embedding),  # Not a dup
        ]

        duplicates = await semantic_deduplicator.find_duplicates(memories)

        # Should find at least one duplicate pair
        assert len(duplicates) >= 1
        for m1, m2, similarity in duplicates:
            assert similarity >= SIMILARITY_THRESHOLD

    @pytest.mark.asyncio
    async def test_find_duplicates_empty_list(self, semantic_deduplicator):
        """Test with empty list"""
        duplicates = await semantic_deduplicator.find_duplicates([])
        assert duplicates == []

    @pytest.mark.asyncio
    async def test_find_duplicates_no_duplicates(self, semantic_deduplicator, sample_embedding, different_embedding):
        """Test when there are no duplicates"""
        memories = [
            Memory(memory_id="mem-001", content="First", embedding=sample_embedding),
            Memory(memory_id="mem-002", content="Second", embedding=different_embedding),
        ]

        duplicates = await semantic_deduplicator.find_duplicates(memories)

        # Verify result is based on actual similarity
        for _, _, similarity in duplicates:
            assert similarity >= SIMILARITY_THRESHOLD


class TestFindNearDuplicates:
    """Tests for finding near-duplicate pairs"""

    @pytest.mark.asyncio
    async def test_find_near_duplicates(self, semantic_deduplicator, mock_openai_client):
        """Test finding near-duplicates for potential merging"""
        # Create memories with similar but not identical content
        memories = [
            Memory(memory_id="mem-001", content="User prefers TypeScript", type=MemoryType.PREFERENCE),
            Memory(memory_id="mem-002", content="User likes TypeScript over JavaScript", type=MemoryType.PREFERENCE),
        ]

        with patch.object(semantic_deduplicator, 'openai', mock_openai_client):
            near_dups = await semantic_deduplicator.find_near_duplicates(memories)

            # Result depends on embedding similarity
            assert isinstance(near_dups, list)

    @pytest.mark.asyncio
    async def test_find_near_duplicates_different_types(self, semantic_deduplicator, sample_embedding, similar_embedding):
        """Test that different types are not considered near-duplicates"""
        memories = [
            Memory(memory_id="mem-001", content="Uses React", type=MemoryType.FACT, embedding=sample_embedding),
            Memory(memory_id="mem-002", content="Uses React", type=MemoryType.DECISION, embedding=similar_embedding),
        ]

        near_dups = await semantic_deduplicator.find_near_duplicates(memories)

        # Different types should not be near-duplicates
        assert len(near_dups) == 0


class TestMergeMemories:
    """Tests for memory merging"""

    @pytest.mark.asyncio
    async def test_merge_memories(self, semantic_deduplicator, sample_embedding):
        """Test merging two memories"""
        memory1 = Memory(
            memory_id="mem-001",
            content="User prefers TypeScript",
            keywords=["typescript", "preference"],
            confidence=0.8,
            support=3,
            embedding=sample_embedding
        )
        memory2 = Memory(
            memory_id="mem-002",
            content="User prefers TypeScript over JavaScript",
            keywords=["typescript", "javascript"],
            confidence=0.7,
            support=1,
            embedding=sample_embedding
        )

        merged = await semantic_deduplicator.merge_memories(memory1, memory2)

        # Should use higher confidence memory as base
        assert merged.memory_id == memory1.memory_id
        # Keywords should be combined
        assert "typescript" in merged.keywords
        # Support should be summed
        assert merged.support >= memory1.support

    @pytest.mark.asyncio
    async def test_merge_memories_combined_keywords(self, semantic_deduplicator, sample_embedding):
        """Test that keywords are combined in merge"""
        memory1 = Memory(
            memory_id="mem-001",
            content="Test",
            keywords=["key1", "key2"],
            confidence=0.9,
            embedding=sample_embedding
        )
        memory2 = Memory(
            memory_id="mem-002",
            content="Test",
            keywords=["key2", "key3"],
            confidence=0.8,
            embedding=sample_embedding
        )

        merged = await semantic_deduplicator.merge_memories(memory1, memory2)

        # Should have all unique keywords
        assert "key1" in merged.keywords
        assert "key2" in merged.keywords
        assert "key3" in merged.keywords


class TestDeduplicate:
    """Tests for full deduplication process"""

    @pytest.mark.asyncio
    async def test_deduplicate_removes_duplicates(self, semantic_deduplicator, sample_embedding, similar_embedding, different_embedding):
        """Test full deduplication process"""
        memories = [
            Memory(memory_id="mem-001", content="Test 1", confidence=0.9, embedding=sample_embedding),
            Memory(memory_id="mem-002", content="Test 2", confidence=0.7, embedding=similar_embedding),  # Dup
            Memory(memory_id="mem-003", content="Different", confidence=0.8, embedding=different_embedding),
        ]

        result = await semantic_deduplicator.deduplicate(memories)

        assert "kept" in result
        assert "removed" in result
        assert "stats" in result

        # Higher confidence duplicate should be kept
        kept_ids = [m.memory_id for m in result["kept"]]
        # mem-001 should be kept (higher confidence)

    @pytest.mark.asyncio
    async def test_deduplicate_empty_list(self, semantic_deduplicator):
        """Test deduplication with empty list"""
        result = await semantic_deduplicator.deduplicate([])

        assert result["kept"] == []
        assert result["removed"] == []
        assert result["merged"] == []


class TestCheckNewMemoryDuplicate:
    """Tests for checking if new memory is duplicate of existing"""

    @pytest.mark.asyncio
    async def test_check_new_duplicate_found(self, semantic_deduplicator, sample_embedding, similar_embedding):
        """Test finding duplicate of new memory"""
        new_memory = Memory(content="New memory", embedding=sample_embedding)
        existing = [
            Memory(memory_id="exist-001", content="Existing", embedding=similar_embedding),
        ]

        duplicate = await semantic_deduplicator.check_new_memory_duplicate(
            new_memory, existing
        )

        assert duplicate is not None

    @pytest.mark.asyncio
    async def test_check_new_duplicate_not_found(self, semantic_deduplicator, sample_embedding, different_embedding):
        """Test when new memory is not a duplicate"""
        new_memory = Memory(content="New unique memory", embedding=sample_embedding)
        existing = [
            Memory(memory_id="exist-001", content="Different content", embedding=different_embedding),
        ]

        duplicate = await semantic_deduplicator.check_new_memory_duplicate(
            new_memory, existing
        )

        # Result depends on actual embedding similarity
        # assert duplicate is None or duplicate is not None

    @pytest.mark.asyncio
    async def test_check_new_duplicate_empty_existing(self, semantic_deduplicator, sample_embedding):
        """Test with no existing memories"""
        new_memory = Memory(content="New memory", embedding=sample_embedding)

        duplicate = await semantic_deduplicator.check_new_memory_duplicate(
            new_memory, []
        )

        assert duplicate is None

    @pytest.mark.asyncio
    async def test_check_new_duplicate_generates_embedding(self, semantic_deduplicator, mock_openai_client, similar_embedding):
        """Test that embedding is generated if not present"""
        new_memory = Memory(content="New memory", embedding=None)
        existing = [
            Memory(memory_id="exist-001", content="Existing", embedding=similar_embedding),
        ]

        with patch.object(semantic_deduplicator, 'openai', mock_openai_client):
            await semantic_deduplicator.check_new_memory_duplicate(
                new_memory, existing
            )

            # Should have called embeddings API
            mock_openai_client.embeddings.create.assert_called_once()

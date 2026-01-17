"""
Semantic Deduplicator
Uses embedding similarity for intelligent memory deduplication
Features:
- Cosine similarity calculation
- Clustering similar memories
- Smart merging of duplicates
- Preserving highest confidence version
"""

import os
import logging
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime

from .models import Memory, MemoryType, MemoryTier, MemoryStatus

logger = logging.getLogger(__name__)

# Try to import OpenAI for embeddings
try:
    from openai import AsyncOpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False


# Configuration
SIMILARITY_THRESHOLD = 0.85  # Cosine similarity threshold for duplicates
NEAR_DUPLICATE_THRESHOLD = 0.75  # Threshold for near-duplicates (candidates for merging)
BATCH_SIZE = 50  # Max memories to process at once


class SemanticDeduplicator:
    """
    Semantic deduplication using embedding similarity
    """

    def __init__(self):
        self.openai = None
        if OPENAI_AVAILABLE:
            api_key = os.getenv("OPENAI_API_KEY")
            if api_key:
                self.openai = AsyncOpenAI(api_key=api_key)

    async def _get_embedding(self, text: str) -> Optional[List[float]]:
        """Get embedding vector for text"""
        if not self.openai:
            return None

        try:
            response = await self.openai.embeddings.create(
                model="text-embedding-3-small",
                input=text
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Embedding failed: {e}")
            return None

    async def _get_embeddings_batch(self, texts: List[str]) -> List[Optional[List[float]]]:
        """Get embeddings for multiple texts"""
        if not self.openai:
            return [None] * len(texts)

        try:
            response = await self.openai.embeddings.create(
                model="text-embedding-3-small",
                input=texts
            )
            return [item.embedding for item in response.data]
        except Exception as e:
            logger.error(f"Batch embedding failed: {e}")
            return [None] * len(texts)

    def cosine_similarity(
        self,
        vec1: List[float],
        vec2: List[float]
    ) -> float:
        """Calculate cosine similarity between two vectors"""
        if not vec1 or not vec2:
            return 0.0

        try:
            a = np.array(vec1)
            b = np.array(vec2)
            return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))
        except Exception as e:
            logger.warning(f"Similarity calculation failed: {e}")
            return 0.0

    def is_duplicate(
        self,
        memory1: Memory,
        memory2: Memory,
        threshold: float = SIMILARITY_THRESHOLD
    ) -> bool:
        """Check if two memories are duplicates based on embedding similarity"""
        if not memory1.embedding or not memory2.embedding:
            # Fall back to content comparison
            return self._content_similarity(
                memory1.content.lower(),
                memory2.content.lower()
            ) > 0.8

        similarity = self.cosine_similarity(memory1.embedding, memory2.embedding)
        return similarity >= threshold

    def _content_similarity(self, content1: str, content2: str) -> float:
        """Calculate Jaccard similarity for content"""
        words1 = set(content1.split())
        words2 = set(content2.split())
        if not words1 or not words2:
            return 0.0
        intersection = words1 & words2
        union = words1 | words2
        return len(intersection) / len(union)

    async def find_duplicates(
        self,
        memories: List[Memory]
    ) -> List[Tuple[Memory, Memory, float]]:
        """
        Find duplicate pairs in a list of memories
        Returns list of (memory1, memory2, similarity) tuples
        """
        duplicates = []

        # Ensure all memories have embeddings
        memories_without_embedding = [m for m in memories if not m.embedding]
        if memories_without_embedding:
            texts = [m.content for m in memories_without_embedding]
            embeddings = await self._get_embeddings_batch(texts)
            for memory, embedding in zip(memories_without_embedding, embeddings):
                memory.embedding = embedding

        # Compare all pairs
        for i in range(len(memories)):
            for j in range(i + 1, len(memories)):
                m1, m2 = memories[i], memories[j]

                if not m1.embedding or not m2.embedding:
                    continue

                similarity = self.cosine_similarity(m1.embedding, m2.embedding)

                if similarity >= SIMILARITY_THRESHOLD:
                    duplicates.append((m1, m2, similarity))
                    logger.debug(
                        f"Found duplicate: '{m1.content[:50]}...' <-> "
                        f"'{m2.content[:50]}...' (similarity: {similarity:.3f})"
                    )

        return duplicates

    async def find_near_duplicates(
        self,
        memories: List[Memory]
    ) -> List[Tuple[Memory, Memory, float]]:
        """
        Find near-duplicate pairs that could be merged
        """
        near_duplicates = []

        # Ensure embeddings
        memories_without_embedding = [m for m in memories if not m.embedding]
        if memories_without_embedding:
            texts = [m.content for m in memories_without_embedding]
            embeddings = await self._get_embeddings_batch(texts)
            for memory, embedding in zip(memories_without_embedding, embeddings):
                memory.embedding = embedding

        # Compare all pairs
        for i in range(len(memories)):
            for j in range(i + 1, len(memories)):
                m1, m2 = memories[i], memories[j]

                if not m1.embedding or not m2.embedding:
                    continue

                # Must be same type
                if m1.type != m2.type:
                    continue

                similarity = self.cosine_similarity(m1.embedding, m2.embedding)

                if NEAR_DUPLICATE_THRESHOLD <= similarity < SIMILARITY_THRESHOLD:
                    near_duplicates.append((m1, m2, similarity))

        return near_duplicates

    def select_best_memory(
        self,
        memory1: Memory,
        memory2: Memory
    ) -> Memory:
        """
        Select the better memory to keep between two duplicates
        Criteria: confidence, recency, support count
        """
        # Calculate scores
        score1 = (
            memory1.confidence * 0.4 +
            memory1.support * 0.3 +
            (1.0 if memory1.created_at > memory2.created_at else 0.0) * 0.3
        )
        score2 = (
            memory2.confidence * 0.4 +
            memory2.support * 0.3 +
            (1.0 if memory2.created_at > memory1.created_at else 0.0) * 0.3
        )

        return memory1 if score1 >= score2 else memory2

    async def merge_memories(
        self,
        memory1: Memory,
        memory2: Memory
    ) -> Memory:
        """
        Merge two similar memories into one
        Combines content and metadata intelligently
        """
        # Select base memory (higher confidence)
        base = self.select_best_memory(memory1, memory2)
        other = memory2 if base == memory1 else memory1

        # Merge keywords
        merged_keywords = list(set(
            (base.keywords or []) + (other.keywords or [])
        ))

        # Combine content if significantly different
        content_similarity = self._content_similarity(
            base.content.lower(),
            other.content.lower()
        )

        if content_similarity < 0.9:
            # Append unique information from other
            other_words = set(other.content.lower().split())
            base_words = set(base.content.lower().split())
            unique_words = other_words - base_words

            if unique_words and len(unique_words) > 3:
                # Other has significant unique content, note it
                merged_content = f"{base.content} (Also noted: {other.content})"
            else:
                merged_content = base.content
        else:
            merged_content = base.content

        # Create merged memory
        merged = Memory(
            memory_id=base.memory_id,
            owner_id=base.owner_id,
            employee_id=base.employee_id,
            project_id=base.project_id,
            type=base.type,
            content=merged_content,
            summary=base.summary or other.summary,
            keywords=merged_keywords,
            source_message=base.source_message,
            source_response=base.source_response,
            confidence=max(base.confidence, other.confidence),
            support=base.support + other.support,
            contradict=min(base.contradict, other.contradict),
            status=base.status,
            tier=base.tier,
            created_at=min(base.created_at, other.created_at),
            last_seen=max(base.last_seen, other.last_seen),
            access_count=base.access_count + other.access_count,
            decay_factor=max(base.decay_factor, other.decay_factor),
            embedding=base.embedding,
        )

        logger.info(f"Merged memories: {base.memory_id} + {other.memory_id}")
        return merged

    async def deduplicate(
        self,
        memories: List[Memory]
    ) -> Dict[str, Any]:
        """
        Deduplicate a list of memories
        Returns:
            - kept: memories to keep
            - removed: duplicate IDs to remove
            - merged: merged memory pairs
        """
        if not memories:
            return {"kept": [], "removed": [], "merged": []}

        # Find exact duplicates
        duplicates = await self.find_duplicates(memories)

        # Track which memories to remove
        to_remove = set()

        for m1, m2, similarity in duplicates:
            if m1.memory_id in to_remove or m2.memory_id in to_remove:
                continue

            # Keep the better one
            best = self.select_best_memory(m1, m2)
            remove = m2 if best == m1 else m1
            to_remove.add(remove.memory_id)

            logger.info(
                f"Dedup: keeping {best.memory_id}, removing {remove.memory_id} "
                f"(similarity: {similarity:.3f})"
            )

        # Find near-duplicates for potential merging
        remaining = [m for m in memories if m.memory_id not in to_remove]
        near_duplicates = await self.find_near_duplicates(remaining)

        merged = []
        for m1, m2, similarity in near_duplicates:
            if m1.memory_id in to_remove or m2.memory_id in to_remove:
                continue

            # Merge the pair
            merged_memory = await self.merge_memories(m1, m2)
            merged.append({
                "original_ids": [m1.memory_id, m2.memory_id],
                "merged": merged_memory,
                "similarity": similarity
            })

            # Mark original as removed (merged becomes the kept one)
            to_remove.add(m2.memory_id)

        # Final kept list
        kept = [m for m in memories if m.memory_id not in to_remove]

        return {
            "kept": kept,
            "removed": list(to_remove),
            "merged": merged,
            "stats": {
                "original_count": len(memories),
                "kept_count": len(kept),
                "removed_count": len(to_remove),
                "merged_count": len(merged),
            }
        }

    async def check_new_memory_duplicate(
        self,
        new_memory: Memory,
        existing_memories: List[Memory]
    ) -> Optional[Memory]:
        """
        Check if a new memory is a duplicate of existing ones
        Returns the existing memory if duplicate found, None otherwise
        """
        if not existing_memories:
            return None

        # Ensure new memory has embedding
        if not new_memory.embedding:
            new_memory.embedding = await self._get_embedding(new_memory.content)

        if not new_memory.embedding:
            return None

        for existing in existing_memories:
            if not existing.embedding:
                continue

            similarity = self.cosine_similarity(
                new_memory.embedding,
                existing.embedding
            )

            if similarity >= SIMILARITY_THRESHOLD:
                logger.info(
                    f"New memory is duplicate of {existing.memory_id} "
                    f"(similarity: {similarity:.3f})"
                )
                return existing

        return None


# Singleton instance
_deduplicator: Optional[SemanticDeduplicator] = None


def get_deduplicator() -> SemanticDeduplicator:
    """Get or create deduplicator instance"""
    global _deduplicator
    if _deduplicator is None:
        _deduplicator = SemanticDeduplicator()
    return _deduplicator

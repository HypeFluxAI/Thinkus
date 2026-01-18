"""
Memory Compressor
Long-term memory compression and summarization
Features:
- Compress old COLD memories into summaries
- Cluster similar memories
- Generate AI-powered summaries
- Maintain memory chains
"""

import os
import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
import uuid

from anthropic import AsyncAnthropic

from .models import Memory, MemoryType, MemoryTier, MemoryStatus, MemoryScore

logger = logging.getLogger(__name__)


# Configuration
COMPRESSION_THRESHOLD_DAYS = 30  # Compress memories older than this
CLUSTER_SIMILARITY_THRESHOLD = 0.7  # Similarity for clustering
TARGET_COMPRESSION_RATIO = 10  # 10:1 compression


class MemoryCluster:
    """A cluster of similar memories for compression"""

    def __init__(self, cluster_id: str):
        self.cluster_id = cluster_id
        self.memories: List[Memory] = []
        self.centroid: Optional[List[float]] = None
        self.topic: str = ""

    def add_memory(self, memory: Memory):
        """Add a memory to this cluster"""
        self.memories.append(memory)

    @property
    def size(self) -> int:
        return len(self.memories)

    def get_all_content(self) -> str:
        """Get all memory content for summarization"""
        return "\n".join([m.content for m in self.memories])

    def get_keywords(self) -> List[str]:
        """Get combined keywords from all memories"""
        keywords = set()
        for m in self.memories:
            keywords.update(m.keywords)
        return list(keywords)[:10]

    def get_earliest_date(self) -> datetime:
        """Get the earliest created_at date"""
        return min(m.created_at for m in self.memories)

    def get_highest_confidence(self) -> float:
        """Get the highest confidence value"""
        return max(m.confidence for m in self.memories)


class MemoryCompressor:
    """
    Compresses old memories into summaries
    """

    def __init__(self):
        self._client: Optional[AsyncAnthropic] = None

    @property
    def client(self) -> AsyncAnthropic:
        """Lazy initialization of Anthropic client"""
        if self._client is None:
            api_key = os.getenv("ANTHROPIC_API_KEY")
            if not api_key:
                raise ValueError("ANTHROPIC_API_KEY not set")
            self._client = AsyncAnthropic(api_key=api_key)
        return self._client

    def _calculate_centroid(self, embeddings: List[List[float]]) -> List[float]:
        """Calculate centroid of embeddings"""
        if not embeddings:
            return []

        import numpy as np
        embeddings_array = np.array(embeddings)
        centroid = np.mean(embeddings_array, axis=0)
        return centroid.tolist()

    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity"""
        if not vec1 or not vec2:
            return 0.0

        import numpy as np
        a = np.array(vec1)
        b = np.array(vec2)
        return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))

    async def get_compressible_memories(
        self,
        memories: List[Memory],
        threshold_days: int = COMPRESSION_THRESHOLD_DAYS
    ) -> List[Memory]:
        """
        Get memories that are eligible for compression
        """
        cutoff_date = datetime.utcnow() - timedelta(days=threshold_days)

        compressible = []
        for memory in memories:
            # Only compress COLD tier memories
            if memory.tier != MemoryTier.COLD:
                continue

            # Only compress memories older than threshold
            if memory.last_seen > cutoff_date:
                continue

            # Don't compress already compressed summaries
            if "[COMPRESSED]" in memory.content:
                continue

            compressible.append(memory)

        logger.info(f"Found {len(compressible)} compressible memories")
        return compressible

    async def cluster_memories(
        self,
        memories: List[Memory]
    ) -> List[MemoryCluster]:
        """
        Cluster memories by similarity for compression
        """
        if not memories:
            return []

        clusters: List[MemoryCluster] = []

        # Simple greedy clustering
        assigned = set()

        for memory in memories:
            if memory.memory_id in assigned:
                continue

            if not memory.embedding:
                continue

            # Start new cluster
            cluster = MemoryCluster(str(uuid.uuid4()))
            cluster.add_memory(memory)
            assigned.add(memory.memory_id)

            # Find similar memories
            for other in memories:
                if other.memory_id in assigned:
                    continue

                if not other.embedding:
                    continue

                similarity = self._cosine_similarity(
                    memory.embedding, other.embedding
                )

                if similarity >= CLUSTER_SIMILARITY_THRESHOLD:
                    cluster.add_memory(other)
                    assigned.add(other.memory_id)

            # Calculate centroid
            embeddings = [m.embedding for m in cluster.memories if m.embedding]
            cluster.centroid = self._calculate_centroid(embeddings)

            clusters.append(cluster)

        logger.info(f"Created {len(clusters)} memory clusters")
        return clusters

    async def generate_summary(
        self,
        cluster: MemoryCluster
    ) -> str:
        """
        Generate a summary of a memory cluster using AI
        """
        try:
            content = cluster.get_all_content()

            prompt = f"""Summarize the following related memories into a single, concise summary.
The summary should preserve the key information and be useful for future reference.

MEMORIES TO SUMMARIZE:
{content}

Generate a summary that:
1. Captures the essential information from all memories
2. Is concise (2-4 sentences)
3. Preserves any specific facts, decisions, or preferences
4. Can stand alone without the original memories

Summary:"""

            result = await self.client.messages.create(
                model="claude-3-5-haiku-20241022",
                max_tokens=300,
                messages=[{"role": "user", "content": prompt}]
            )

            summary = result.content[0].text.strip()
            logger.debug(f"Generated summary for cluster {cluster.cluster_id}")
            return summary

        except Exception as e:
            logger.error(f"Summary generation failed: {e}")
            # Fallback: combine first sentences
            sentences = []
            for m in cluster.memories[:3]:
                first_sentence = m.content.split(".")[0]
                sentences.append(first_sentence)
            return ". ".join(sentences) + "."

    async def compress_cluster(
        self,
        cluster: MemoryCluster,
        project_id: str,
        owner_id: str,
        employee_id: str
    ) -> Tuple[Memory, List[str]]:
        """
        Compress a cluster into a single summary memory
        Returns (compressed_memory, original_ids_to_delete)
        """
        # Generate summary
        summary = await self.generate_summary(cluster)

        # Create compressed memory
        compressed = Memory(
            memory_id=f"compressed_{cluster.cluster_id}",
            owner_id=owner_id,
            employee_id=employee_id,
            project_id=project_id,
            type=MemoryType.FACT,  # Summaries are treated as facts
            content=f"[COMPRESSED] {summary}",
            summary=summary[:100],
            keywords=cluster.get_keywords(),
            confidence=cluster.get_highest_confidence() * 0.9,  # Slight reduction
            initial_confidence=cluster.get_highest_confidence() * 0.9,
            status=MemoryStatus.ACTIVE,
            tier=MemoryTier.COLD,  # Keep in cold tier
            created_at=cluster.get_earliest_date(),
            merged_from=[m.memory_id for m in cluster.memories],
            embedding=cluster.centroid,  # Use centroid as embedding
        )

        # Get IDs of original memories to delete
        original_ids = [m.memory_id for m in cluster.memories]

        logger.info(
            f"Compressed {len(original_ids)} memories into 1 "
            f"(ratio: {len(original_ids)}:1)"
        )

        return compressed, original_ids

    async def compress_cold_memories(
        self,
        memories: List[Memory],
        project_id: str,
        owner_id: str,
        employee_id: str,
        threshold_days: int = COMPRESSION_THRESHOLD_DAYS
    ) -> Dict[str, Any]:
        """
        Compress all eligible cold memories
        Returns compression statistics
        """
        stats = {
            "original_count": 0,
            "compressed_count": 0,
            "clusters_created": 0,
            "compression_ratio": 0.0,
            "compressed_memories": [],
            "deleted_ids": [],
        }

        # Get compressible memories
        compressible = await self.get_compressible_memories(
            memories, threshold_days
        )

        if not compressible:
            return stats

        stats["original_count"] = len(compressible)

        # Cluster memories
        clusters = await self.cluster_memories(compressible)
        stats["clusters_created"] = len(clusters)

        # Compress each cluster
        for cluster in clusters:
            if cluster.size < 2:
                # Don't compress single memories
                continue

            try:
                compressed, original_ids = await self.compress_cluster(
                    cluster, project_id, owner_id, employee_id
                )

                stats["compressed_memories"].append(compressed)
                stats["deleted_ids"].extend(original_ids)

            except Exception as e:
                logger.error(f"Failed to compress cluster: {e}")

        stats["compressed_count"] = len(stats["compressed_memories"])

        if stats["compressed_count"] > 0:
            stats["compression_ratio"] = (
                len(stats["deleted_ids"]) / stats["compressed_count"]
            )

        logger.info(
            f"Compression complete: {stats['original_count']} -> "
            f"{stats['compressed_count']} (ratio: {stats['compression_ratio']:.1f}:1)"
        )

        return stats

    async def should_compress(
        self,
        memories: List[Memory],
        threshold_days: int = COMPRESSION_THRESHOLD_DAYS
    ) -> bool:
        """
        Check if compression should be triggered
        """
        compressible = await self.get_compressible_memories(
            memories, threshold_days
        )

        # Trigger compression if we have enough compressible memories
        return len(compressible) >= 10


# Singleton instance
_compressor: Optional[MemoryCompressor] = None


def get_compressor() -> MemoryCompressor:
    """Get or create compressor instance"""
    global _compressor
    if _compressor is None:
        _compressor = MemoryCompressor()
    return _compressor

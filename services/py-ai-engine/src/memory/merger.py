"""
Memory Merger
Detects and merges similar memories to reduce redundancy
Upgrades frequently-mentioned memories to core status
"""

import os
import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from collections import defaultdict

from anthropic import AsyncAnthropic

from .models import Memory, MemoryTier, MemoryStatus, MemoryType

logger = logging.getLogger(__name__)


# Configuration
SIMILARITY_THRESHOLD = 0.85  # Minimum similarity for merge consideration
MIN_MENTIONS_FOR_UPGRADE = 3  # Mentions needed to upgrade to core


class MemoryMerger:
    """
    Merges similar memories and upgrades frequently-mentioned ones
    """

    def __init__(self, similarity_threshold: float = SIMILARITY_THRESHOLD):
        self.similarity_threshold = similarity_threshold
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

    def calculate_text_similarity(self, text1: str, text2: str) -> float:
        """
        Calculate text similarity using word overlap (Jaccard)
        Fast but approximate
        """
        words1 = set(text1.lower().split())
        words2 = set(text2.lower().split())

        if not words1 or not words2:
            return 0.0

        intersection = words1 & words2
        union = words1 | words2

        return len(intersection) / len(union)

    async def calculate_semantic_similarity(
        self,
        text1: str,
        text2: str
    ) -> float:
        """
        Calculate semantic similarity using LLM
        More accurate but slower and costs API calls
        """
        try:
            prompt = f"""Rate the semantic similarity between these two statements on a scale of 0.0 to 1.0.

Statement 1: "{text1}"
Statement 2: "{text2}"

Consider:
- Are they about the same topic?
- Do they convey the same information?
- Could they be merged without losing meaning?

Respond with just a number between 0.0 and 1.0."""

            result = await self.client.messages.create(
                model="claude-3-5-haiku-20241022",
                max_tokens=50,
                messages=[{"role": "user", "content": prompt}]
            )

            text = result.content[0].text.strip()
            return float(text)

        except Exception as e:
            logger.warning(f"Semantic similarity failed: {e}")
            # Fallback to text similarity
            return self.calculate_text_similarity(text1, text2)

    def find_similar_pairs(
        self,
        memories: List[Memory],
        use_semantic: bool = False
    ) -> List[Tuple[Memory, Memory, float]]:
        """
        Find pairs of similar memories
        Returns list of (memory1, memory2, similarity_score)
        """
        pairs = []

        for i, mem1 in enumerate(memories):
            for mem2 in memories[i + 1:]:
                # Skip if different types (usually shouldn't merge)
                if mem1.type != mem2.type:
                    continue

                # Skip if different projects (strict isolation)
                if mem1.project_id != mem2.project_id:
                    continue

                # Calculate similarity
                similarity = self.calculate_text_similarity(
                    mem1.content, mem2.content
                )

                if similarity >= self.similarity_threshold:
                    pairs.append((mem1, mem2, similarity))

        # Sort by similarity (highest first)
        pairs.sort(key=lambda x: x[2], reverse=True)

        return pairs

    def merge_memories(self, primary: Memory, secondary: Memory) -> Memory:
        """
        Merge two memories, keeping the primary as the base
        """
        # Keep the higher confidence memory as primary
        if secondary.confidence > primary.confidence:
            primary, secondary = secondary, primary

        # Merge statistics
        primary.support += secondary.support
        primary.contradict += secondary.contradict
        primary.access_count += secondary.access_count

        # Merge relationships
        if secondary.memory_id not in primary.merged_from:
            primary.merged_from.append(secondary.memory_id)
        primary.merged_from.extend(
            [m for m in secondary.merged_from if m not in primary.merged_from]
        )

        # Merge related memories
        primary.related_memories.extend(
            [m for m in secondary.related_memories if m not in primary.related_memories]
        )

        # Merge keywords
        all_keywords = list(set(primary.keywords + secondary.keywords))
        primary.keywords = all_keywords[:10]  # Limit

        # Update timestamps (keep earliest created, latest seen)
        if secondary.created_at < primary.created_at:
            primary.created_at = secondary.created_at
        if secondary.last_seen > primary.last_seen:
            primary.last_seen = secondary.last_seen

        # Boost confidence slightly for merged memories
        primary.confidence = min(1.0, primary.confidence + 0.05)

        # Update content if secondary has more detail
        if len(secondary.content) > len(primary.content):
            primary.content = secondary.content
            primary.summary = secondary.summary or primary.summary

        primary.updated_at = datetime.utcnow()

        # Mark secondary as replaced
        secondary.status = MemoryStatus.REPLACED
        secondary.replaced_by = primary.memory_id

        logger.info(f"Merged memory {secondary.memory_id} into {primary.memory_id}")

        return primary

    async def merge_similar_content(
        self,
        primary: Memory,
        secondary: Memory
    ) -> str:
        """
        Use LLM to create merged content from two similar memories
        """
        try:
            prompt = f"""Merge these two similar memories into one concise statement.

Memory 1: "{primary.content}"
Memory 2: "{secondary.content}"

Create a single merged statement that:
- Captures all important information from both
- Is concise (1-2 sentences)
- Doesn't lose any key details

Respond with just the merged statement."""

            result = await self.client.messages.create(
                model="claude-3-5-haiku-20241022",
                max_tokens=200,
                messages=[{"role": "user", "content": prompt}]
            )

            return result.content[0].text.strip()

        except Exception as e:
            logger.warning(f"Content merge failed: {e}")
            # Keep primary content
            return primary.content

    def should_upgrade_to_core(self, memory: Memory) -> bool:
        """
        Check if memory should be upgraded to core tier
        """
        if memory.tier == MemoryTier.CORE:
            return False

        # Upgrade if frequently supported
        if memory.support >= MIN_MENTIONS_FOR_UPGRADE:
            return True

        # Upgrade if high confidence and frequent access
        if memory.confidence >= 0.9 and memory.access_count >= 10:
            return True

        # Upgrade preferences that are repeatedly mentioned
        if memory.type == MemoryType.PREFERENCE and memory.support >= 2:
            return True

        return False

    def upgrade_memory(self, memory: Memory) -> Memory:
        """
        Upgrade memory to core tier
        """
        if memory.tier != MemoryTier.CORE:
            memory.tier = MemoryTier.CORE
            memory.half_life_days = 90.0  # Core memories decay slower
            logger.info(f"Memory upgraded to CORE: {memory.memory_id}")

        return memory

    def process_batch(
        self,
        memories: List[Memory]
    ) -> Dict[str, List[Memory]]:
        """
        Process a batch of memories for merging and upgrading
        Returns categorized results
        """
        results = {
            "merged": [],      # Memories that were merged into others
            "upgraded": [],    # Memories upgraded to core
            "unchanged": [],   # No changes
        }

        # Find similar pairs
        similar_pairs = self.find_similar_pairs(memories)

        # Track which memories have been merged
        merged_ids = set()

        for mem1, mem2, similarity in similar_pairs:
            if mem1.memory_id in merged_ids or mem2.memory_id in merged_ids:
                continue

            # Merge
            merged = self.merge_memories(mem1, mem2)
            results["merged"].append(mem2)
            merged_ids.add(mem2.memory_id)

        # Check for upgrades
        for memory in memories:
            if memory.memory_id in merged_ids:
                continue

            if self.should_upgrade_to_core(memory):
                self.upgrade_memory(memory)
                results["upgraded"].append(memory)
            else:
                results["unchanged"].append(memory)

        logger.info(
            f"Batch processed: {len(results['merged'])} merged, "
            f"{len(results['upgraded'])} upgraded, {len(results['unchanged'])} unchanged"
        )

        return results

    def cluster_by_topic(
        self,
        memories: List[Memory]
    ) -> Dict[str, List[Memory]]:
        """
        Cluster memories by topic/keywords
        """
        clusters = defaultdict(list)

        for memory in memories:
            # Use first keyword as cluster key
            if memory.keywords:
                key = memory.keywords[0].lower()
            else:
                # Extract first significant word from content
                words = memory.content.lower().split()
                key = next(
                    (w for w in words if len(w) > 3 and w not in {'this', 'that', 'with', 'from'}),
                    "other"
                )

            clusters[key].append(memory)

        return dict(clusters)

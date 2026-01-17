"""
Memory Decay
Implements time-based decay for memories
Frequently accessed memories decay slower, cold memories decay faster
"""

import math
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any

from .models import Memory, MemoryStatus, MemoryTier

logger = logging.getLogger(__name__)


# Decay configuration
DEFAULT_HALF_LIFE_DAYS = 30.0  # Days until decay reaches 0.5
MIN_DECAY_THRESHOLD = 0.1     # Below this, memory expires
CORE_MEMORY_HALF_LIFE = 90.0  # Core memories decay slower
COLD_MEMORY_HALF_LIFE = 14.0  # Cold memories decay faster


class MemoryDecayManager:
    """
    Manages time-based decay for memories
    """

    def __init__(
        self,
        default_half_life: float = DEFAULT_HALF_LIFE_DAYS,
        min_threshold: float = MIN_DECAY_THRESHOLD
    ):
        self.default_half_life = default_half_life
        self.min_threshold = min_threshold

    def get_half_life(self, memory: Memory) -> float:
        """
        Get half-life for a memory based on its tier and access frequency
        """
        # Base half-life by tier
        tier_half_life = {
            MemoryTier.CORE: CORE_MEMORY_HALF_LIFE,
            MemoryTier.RELEVANT: DEFAULT_HALF_LIFE_DAYS,
            MemoryTier.COLD: COLD_MEMORY_HALF_LIFE,
        }
        base_half_life = tier_half_life.get(memory.tier, self.default_half_life)

        # Boost for frequently accessed memories
        # Each 5 accesses adds 10 days to half-life (capped at 2x)
        access_boost = min(base_half_life, (memory.access_count // 5) * 10)

        # Boost for high-confidence memories
        confidence_boost = memory.confidence * 10  # Up to 10 days extra

        return base_half_life + access_boost + confidence_boost

    def calculate_decay(self, memory: Memory, reference_time: datetime = None) -> float:
        """
        Calculate current decay factor for a memory
        decay = 0.5 ^ (days_since_last_seen / half_life)
        """
        if reference_time is None:
            reference_time = datetime.utcnow()

        days_since_seen = (reference_time - memory.last_seen).total_seconds() / 86400
        half_life = self.get_half_life(memory)

        # Exponential decay
        decay = math.pow(0.5, days_since_seen / half_life)

        return max(0.0, min(1.0, decay))

    def apply_decay(self, memory: Memory, reference_time: datetime = None) -> Memory:
        """
        Apply decay to a memory and update its status
        """
        if reference_time is None:
            reference_time = datetime.utcnow()

        # Calculate new decay factor
        memory.decay_factor = self.calculate_decay(memory, reference_time)

        # Update half-life based on current stats
        memory.half_life_days = self.get_half_life(memory)

        # Check effective confidence
        effective_confidence = memory.effective_confidence

        # Update status based on decay
        if effective_confidence < self.min_threshold:
            memory.status = MemoryStatus.EXPIRED
            logger.debug(f"Memory expired: {memory.memory_id} (effective: {effective_confidence:.3f})")
        elif effective_confidence < 0.3:
            if memory.status not in [MemoryStatus.FROZEN, MemoryStatus.REPLACED]:
                memory.status = MemoryStatus.FROZEN
                logger.debug(f"Memory frozen: {memory.memory_id} (effective: {effective_confidence:.3f})")

        return memory

    def refresh_memory(self, memory: Memory) -> Memory:
        """
        Refresh a memory (called when accessed)
        Resets decay factor and updates timestamps
        """
        memory.last_accessed = datetime.utcnow()
        memory.last_seen = datetime.utcnow()
        memory.decay_factor = 1.0
        memory.access_count += 1

        # Potentially upgrade tier if frequently accessed
        if memory.access_count >= 10 and memory.tier == MemoryTier.COLD:
            memory.tier = MemoryTier.RELEVANT
            logger.info(f"Memory upgraded to RELEVANT: {memory.memory_id}")
        elif memory.access_count >= 20 and memory.tier == MemoryTier.RELEVANT:
            memory.tier = MemoryTier.CORE
            logger.info(f"Memory upgraded to CORE: {memory.memory_id}")

        return memory

    def batch_apply_decay(
        self,
        memories: List[Memory],
        reference_time: datetime = None
    ) -> Dict[str, List[Memory]]:
        """
        Apply decay to a batch of memories
        Returns categorized results
        """
        if reference_time is None:
            reference_time = datetime.utcnow()

        results = {
            "active": [],
            "decayed": [],
            "expired": [],
        }

        for memory in memories:
            self.apply_decay(memory, reference_time)

            if memory.status == MemoryStatus.EXPIRED:
                results["expired"].append(memory)
            elif memory.decay_factor < 0.5:
                results["decayed"].append(memory)
            else:
                results["active"].append(memory)

        logger.info(
            f"Decay applied: {len(results['active'])} active, "
            f"{len(results['decayed'])} decayed, {len(results['expired'])} expired"
        )

        return results

    def estimate_expiry(self, memory: Memory) -> datetime:
        """
        Estimate when a memory will expire
        """
        half_life = self.get_half_life(memory)

        # Solve for days when decay * confidence < threshold
        # 0.5^(days/half_life) * confidence < threshold
        # days = half_life * log2(confidence / threshold)

        if memory.confidence <= self.min_threshold:
            return datetime.utcnow()

        import math
        days_until_expire = half_life * math.log2(memory.confidence / self.min_threshold)

        return memory.last_seen + timedelta(days=days_until_expire)

    def get_decay_stats(self, memories: List[Memory]) -> Dict[str, Any]:
        """
        Get statistics about memory decay
        """
        if not memories:
            return {"count": 0}

        decay_factors = [m.decay_factor for m in memories]
        effective_confidences = [m.effective_confidence for m in memories]

        active_count = sum(1 for m in memories if m.status == MemoryStatus.ACTIVE)
        decayed_count = sum(1 for m in memories if m.decay_factor < 0.5)
        frozen_count = sum(1 for m in memories if m.status == MemoryStatus.FROZEN)
        expired_count = sum(1 for m in memories if m.status == MemoryStatus.EXPIRED)

        return {
            "count": len(memories),
            "active": active_count,
            "decayed": decayed_count,
            "frozen": frozen_count,
            "expired": expired_count,
            "avg_decay": sum(decay_factors) / len(decay_factors),
            "min_decay": min(decay_factors),
            "max_decay": max(decay_factors),
            "avg_effective_confidence": sum(effective_confidences) / len(effective_confidences),
        }

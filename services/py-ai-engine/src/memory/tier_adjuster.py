"""
Dynamic Tier Adjuster
Automatically adjusts memory tiers based on:
- Access frequency
- Recency of use
- Confidence levels
- User feedback signals
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta

from .models import Memory, MemoryTier, MemoryStatus

logger = logging.getLogger(__name__)


# Configuration
PROMOTE_TO_CORE_THRESHOLD = 5       # Access count to promote to core
DEMOTE_FROM_CORE_THRESHOLD = 30     # Days without access to demote from core
COLD_THRESHOLD_DAYS = 60            # Days without access to move to cold
REACTIVATE_THRESHOLD = 3            # Access count to reactivate from cold

HIGH_CONFIDENCE_THRESHOLD = 0.85    # Confidence to auto-promote
LOW_CONFIDENCE_THRESHOLD = 0.4      # Confidence to auto-demote


class TierAdjuster:
    """
    Automatically adjusts memory tiers based on usage patterns
    """

    def __init__(self):
        pass

    def calculate_tier_score(self, memory: Memory) -> float:
        """
        Calculate a score for tier placement
        Higher score = higher tier priority
        """
        now = datetime.utcnow()
        days_since_created = (now - memory.created_at).days
        days_since_seen = (now - memory.last_seen).days

        # Access frequency score (0-1)
        frequency_score = min(memory.access_count / 10, 1.0)

        # Recency score (0-1)
        recency_score = max(0, 1 - (days_since_seen / 30))

        # Confidence score (0-1)
        confidence_score = memory.confidence

        # Age penalty (newer memories get slight boost)
        age_boost = max(0, 1 - (days_since_created / 90)) * 0.2

        # Support vs contradict ratio
        if memory.support + memory.contradict > 0:
            support_ratio = memory.support / (memory.support + memory.contradict)
        else:
            support_ratio = 0.5

        # Calculate weighted score
        score = (
            frequency_score * 0.25 +
            recency_score * 0.25 +
            confidence_score * 0.30 +
            support_ratio * 0.15 +
            age_boost * 0.05
        )

        return score

    def suggest_tier(self, memory: Memory) -> MemoryTier:
        """
        Suggest the appropriate tier for a memory
        """
        score = self.calculate_tier_score(memory)

        # High score or high confidence -> Core
        if score >= 0.7 or memory.confidence >= HIGH_CONFIDENCE_THRESHOLD:
            return MemoryTier.CORE

        # Medium score -> Relevant
        if score >= 0.4:
            return MemoryTier.RELEVANT

        # Low score -> Cold
        return MemoryTier.COLD

    def should_promote_to_core(self, memory: Memory) -> bool:
        """
        Check if a memory should be promoted to core tier
        """
        # Already core
        if memory.tier == MemoryTier.CORE:
            return False

        # High access count
        if memory.access_count >= PROMOTE_TO_CORE_THRESHOLD:
            return True

        # High confidence with recent use
        days_since_seen = (datetime.utcnow() - memory.last_seen).days
        if memory.confidence >= HIGH_CONFIDENCE_THRESHOLD and days_since_seen < 7:
            return True

        # Strong support
        if memory.support >= 3 and memory.contradict == 0:
            return True

        return False

    def should_demote_from_core(self, memory: Memory) -> bool:
        """
        Check if a memory should be demoted from core tier
        """
        # Not core
        if memory.tier != MemoryTier.CORE:
            return False

        days_since_seen = (datetime.utcnow() - memory.last_seen).days

        # Not accessed for a long time
        if days_since_seen > DEMOTE_FROM_CORE_THRESHOLD:
            return True

        # Low confidence
        if memory.confidence < LOW_CONFIDENCE_THRESHOLD:
            return True

        # High contradiction rate
        if memory.contradict >= 2 and memory.support < memory.contradict:
            return True

        return False

    def should_move_to_cold(self, memory: Memory) -> bool:
        """
        Check if a memory should be moved to cold storage
        """
        # Already cold
        if memory.tier == MemoryTier.COLD:
            return False

        days_since_seen = (datetime.utcnow() - memory.last_seen).days

        # Not accessed for a very long time
        if days_since_seen > COLD_THRESHOLD_DAYS:
            return True

        # Low confidence and low access
        if memory.confidence < 0.3 and memory.access_count < 2:
            return True

        return False

    def should_reactivate(self, memory: Memory) -> bool:
        """
        Check if a cold memory should be reactivated
        """
        # Not cold
        if memory.tier != MemoryTier.COLD:
            return False

        # Recent access after being cold
        days_since_seen = (datetime.utcnow() - memory.last_seen).days
        if days_since_seen < 7 and memory.access_count >= REACTIVATE_THRESHOLD:
            return True

        return False

    def adjust_tier(self, memory: Memory) -> Optional[MemoryTier]:
        """
        Determine if a memory's tier should be adjusted
        Returns new tier if adjustment needed, None otherwise
        """
        current_tier = memory.tier

        # Check for promotion to core
        if self.should_promote_to_core(memory):
            if current_tier != MemoryTier.CORE:
                logger.info(f"Promoting memory {memory.memory_id} to CORE")
                return MemoryTier.CORE

        # Check for demotion from core
        if self.should_demote_from_core(memory):
            logger.info(f"Demoting memory {memory.memory_id} from CORE")
            return MemoryTier.RELEVANT

        # Check for cold storage
        if self.should_move_to_cold(memory):
            logger.info(f"Moving memory {memory.memory_id} to COLD")
            return MemoryTier.COLD

        # Check for reactivation
        if self.should_reactivate(memory):
            logger.info(f"Reactivating memory {memory.memory_id} from COLD")
            return MemoryTier.RELEVANT

        return None

    def batch_adjust(self, memories: List[Memory]) -> Dict[str, Any]:
        """
        Adjust tiers for a batch of memories
        Returns statistics and list of adjusted memories
        """
        adjusted = []
        promotions = 0
        demotions = 0
        cold_moves = 0
        reactivations = 0

        for memory in memories:
            new_tier = self.adjust_tier(memory)

            if new_tier is not None:
                old_tier = memory.tier
                memory.tier = new_tier
                adjusted.append(memory)

                # Track statistics
                if new_tier == MemoryTier.CORE:
                    promotions += 1
                elif old_tier == MemoryTier.CORE:
                    demotions += 1
                elif new_tier == MemoryTier.COLD:
                    cold_moves += 1
                elif old_tier == MemoryTier.COLD:
                    reactivations += 1

        stats = {
            "total_processed": len(memories),
            "total_adjusted": len(adjusted),
            "promotions_to_core": promotions,
            "demotions_from_core": demotions,
            "moves_to_cold": cold_moves,
            "reactivations": reactivations,
        }

        logger.info(f"Tier adjustment complete: {stats}")
        return {
            "adjusted": adjusted,
            "stats": stats
        }

    def on_memory_accessed(self, memory: Memory) -> Optional[MemoryTier]:
        """
        Called when a memory is accessed
        Updates access count and checks for tier adjustment
        """
        memory.access_count += 1
        memory.last_seen = datetime.utcnow()

        # Check if tier should change due to access
        return self.adjust_tier(memory)

    def get_tier_distribution(self, memories: List[Memory]) -> Dict[str, int]:
        """
        Get the current tier distribution
        """
        distribution = {
            "core": 0,
            "relevant": 0,
            "cold": 0
        }

        for memory in memories:
            if memory.tier == MemoryTier.CORE:
                distribution["core"] += 1
            elif memory.tier == MemoryTier.RELEVANT:
                distribution["relevant"] += 1
            else:
                distribution["cold"] += 1

        return distribution

    def suggest_optimal_distribution(
        self,
        total_memories: int
    ) -> Dict[str, int]:
        """
        Suggest optimal tier distribution based on total count
        Follows 10-30-60 rule: 10% core, 30% relevant, 60% cold
        """
        return {
            "core": max(1, int(total_memories * 0.10)),
            "relevant": max(1, int(total_memories * 0.30)),
            "cold": int(total_memories * 0.60)
        }


# Singleton instance
_adjuster: Optional[TierAdjuster] = None


def get_tier_adjuster() -> TierAdjuster:
    """Get or create tier adjuster instance"""
    global _adjuster
    if _adjuster is None:
        _adjuster = TierAdjuster()
    return _adjuster

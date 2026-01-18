"""
Unit Tests for Tier Adjuster
Tests dynamic memory tier adjustment
"""

import pytest
from datetime import datetime, timedelta

from memory.tier_adjuster import (
    TierAdjuster,
    PROMOTE_TO_CORE_THRESHOLD,
    DEMOTE_FROM_CORE_THRESHOLD,
    COLD_THRESHOLD_DAYS,
    REACTIVATE_THRESHOLD,
    HIGH_CONFIDENCE_THRESHOLD,
    LOW_CONFIDENCE_THRESHOLD,
)
from memory.models import Memory, MemoryTier, MemoryStatus


class TestTierScore:
    """Tests for tier score calculation"""

    def test_calculate_tier_score_high_usage(self, tier_adjuster):
        """Test score for high-usage memory"""
        memory = Memory(
            confidence=0.9,
            access_count=15,
            support=5,
            contradict=0,
            last_seen=datetime.utcnow(),
            created_at=datetime.utcnow() - timedelta(days=7)
        )

        score = tier_adjuster.calculate_tier_score(memory)

        assert score > 0.7  # Should have high score

    def test_calculate_tier_score_low_usage(self, tier_adjuster):
        """Test score for low-usage memory"""
        now = datetime.utcnow()
        memory = Memory(
            confidence=0.4,
            access_count=1,
            support=0,
            contradict=2,
            last_seen=now - timedelta(days=60),
            created_at=now - timedelta(days=120)
        )

        score = tier_adjuster.calculate_tier_score(memory)

        assert score < 0.4  # Should have low score

    def test_calculate_tier_score_factors(self, tier_adjuster):
        """Test that all factors affect score"""
        base_memory = Memory(
            confidence=0.5,
            access_count=5,
            support=2,
            contradict=1,
            last_seen=datetime.utcnow() - timedelta(days=15),
            created_at=datetime.utcnow() - timedelta(days=45)
        )

        # Higher confidence should increase score
        high_conf_memory = Memory(
            confidence=0.9,
            access_count=5,
            support=2,
            contradict=1,
            last_seen=datetime.utcnow() - timedelta(days=15),
            created_at=datetime.utcnow() - timedelta(days=45)
        )

        base_score = tier_adjuster.calculate_tier_score(base_memory)
        high_conf_score = tier_adjuster.calculate_tier_score(high_conf_memory)

        assert high_conf_score > base_score


class TestSuggestTier:
    """Tests for tier suggestion"""

    def test_suggest_core_high_score(self, tier_adjuster):
        """Test suggesting core tier for high score"""
        memory = Memory(
            confidence=0.9,
            access_count=10,
            last_seen=datetime.utcnow(),
        )

        suggested = tier_adjuster.suggest_tier(memory)

        assert suggested == MemoryTier.CORE

    def test_suggest_core_high_confidence(self, tier_adjuster):
        """Test suggesting core tier for high confidence"""
        memory = Memory(
            confidence=HIGH_CONFIDENCE_THRESHOLD + 0.01,
            access_count=1,
            last_seen=datetime.utcnow() - timedelta(days=10),
        )

        suggested = tier_adjuster.suggest_tier(memory)

        assert suggested == MemoryTier.CORE

    def test_suggest_relevant_medium_score(self, tier_adjuster):
        """Test suggesting relevant tier for medium score"""
        memory = Memory(
            confidence=0.6,
            access_count=3,
            last_seen=datetime.utcnow() - timedelta(days=10),
        )

        suggested = tier_adjuster.suggest_tier(memory)

        assert suggested in [MemoryTier.RELEVANT, MemoryTier.CORE]

    def test_suggest_cold_low_score(self, tier_adjuster):
        """Test suggesting cold tier for low score"""
        now = datetime.utcnow()
        memory = Memory(
            confidence=0.3,
            access_count=0,
            last_seen=now - timedelta(days=90),
            created_at=now - timedelta(days=120),
        )

        suggested = tier_adjuster.suggest_tier(memory)

        assert suggested == MemoryTier.COLD


class TestPromoteToCore:
    """Tests for core tier promotion"""

    def test_should_promote_high_access(self, tier_adjuster):
        """Test promotion based on high access count"""
        memory = Memory(
            tier=MemoryTier.RELEVANT,
            access_count=PROMOTE_TO_CORE_THRESHOLD + 1,
        )

        assert tier_adjuster.should_promote_to_core(memory) is True

    def test_should_promote_high_confidence_recent(self, tier_adjuster):
        """Test promotion based on high confidence and recent use"""
        memory = Memory(
            tier=MemoryTier.RELEVANT,
            confidence=HIGH_CONFIDENCE_THRESHOLD + 0.01,
            access_count=1,
            last_seen=datetime.utcnow() - timedelta(days=3),
        )

        assert tier_adjuster.should_promote_to_core(memory) is True

    def test_should_promote_strong_support(self, tier_adjuster):
        """Test promotion based on strong support"""
        memory = Memory(
            tier=MemoryTier.RELEVANT,
            support=3,
            contradict=0,
        )

        assert tier_adjuster.should_promote_to_core(memory) is True

    def test_should_not_promote_already_core(self, tier_adjuster):
        """Test that core memories don't get promoted"""
        memory = Memory(
            tier=MemoryTier.CORE,
            access_count=100,
        )

        assert tier_adjuster.should_promote_to_core(memory) is False

    def test_should_not_promote_low_access(self, tier_adjuster):
        """Test that low access memories don't get promoted"""
        memory = Memory(
            tier=MemoryTier.RELEVANT,
            access_count=1,
            confidence=0.6,
            support=0,
        )

        assert tier_adjuster.should_promote_to_core(memory) is False


class TestDemoteFromCore:
    """Tests for core tier demotion"""

    def test_should_demote_old_access(self, tier_adjuster):
        """Test demotion based on old access"""
        memory = Memory(
            tier=MemoryTier.CORE,
            last_seen=datetime.utcnow() - timedelta(days=DEMOTE_FROM_CORE_THRESHOLD + 1),
        )

        assert tier_adjuster.should_demote_from_core(memory) is True

    def test_should_demote_low_confidence(self, tier_adjuster):
        """Test demotion based on low confidence"""
        memory = Memory(
            tier=MemoryTier.CORE,
            confidence=LOW_CONFIDENCE_THRESHOLD - 0.1,
            last_seen=datetime.utcnow(),
        )

        assert tier_adjuster.should_demote_from_core(memory) is True

    def test_should_demote_high_contradiction(self, tier_adjuster):
        """Test demotion based on high contradiction rate"""
        memory = Memory(
            tier=MemoryTier.CORE,
            support=1,
            contradict=3,
            confidence=0.6,
            last_seen=datetime.utcnow(),
        )

        assert tier_adjuster.should_demote_from_core(memory) is True

    def test_should_not_demote_non_core(self, tier_adjuster):
        """Test that non-core memories don't get demoted"""
        memory = Memory(
            tier=MemoryTier.RELEVANT,
            last_seen=datetime.utcnow() - timedelta(days=100),
        )

        assert tier_adjuster.should_demote_from_core(memory) is False

    def test_should_not_demote_active_core(self, tier_adjuster):
        """Test that active core memories don't get demoted"""
        memory = Memory(
            tier=MemoryTier.CORE,
            confidence=0.8,
            support=5,
            contradict=0,
            last_seen=datetime.utcnow() - timedelta(days=5),
        )

        assert tier_adjuster.should_demote_from_core(memory) is False


class TestMoveToCold:
    """Tests for cold storage movement"""

    def test_should_move_to_cold_old(self, tier_adjuster):
        """Test moving old memories to cold"""
        memory = Memory(
            tier=MemoryTier.RELEVANT,
            last_seen=datetime.utcnow() - timedelta(days=COLD_THRESHOLD_DAYS + 1),
        )

        assert tier_adjuster.should_move_to_cold(memory) is True

    def test_should_move_to_cold_low_usage(self, tier_adjuster):
        """Test moving low usage memories to cold"""
        memory = Memory(
            tier=MemoryTier.RELEVANT,
            confidence=0.2,
            access_count=1,
            last_seen=datetime.utcnow() - timedelta(days=30),
        )

        assert tier_adjuster.should_move_to_cold(memory) is True

    def test_should_not_move_already_cold(self, tier_adjuster):
        """Test that cold memories don't get moved to cold"""
        memory = Memory(
            tier=MemoryTier.COLD,
            last_seen=datetime.utcnow() - timedelta(days=100),
        )

        assert tier_adjuster.should_move_to_cold(memory) is False

    def test_should_not_move_active(self, tier_adjuster):
        """Test that active memories don't get moved to cold"""
        memory = Memory(
            tier=MemoryTier.RELEVANT,
            confidence=0.8,
            access_count=5,
            last_seen=datetime.utcnow() - timedelta(days=10),
        )

        assert tier_adjuster.should_move_to_cold(memory) is False


class TestReactivate:
    """Tests for reactivation from cold"""

    def test_should_reactivate(self, tier_adjuster):
        """Test reactivation of cold memory"""
        memory = Memory(
            tier=MemoryTier.COLD,
            access_count=REACTIVATE_THRESHOLD + 1,
            last_seen=datetime.utcnow() - timedelta(days=3),
        )

        assert tier_adjuster.should_reactivate(memory) is True

    def test_should_not_reactivate_non_cold(self, tier_adjuster):
        """Test that non-cold memories don't get reactivated"""
        memory = Memory(
            tier=MemoryTier.RELEVANT,
            access_count=10,
            last_seen=datetime.utcnow(),
        )

        assert tier_adjuster.should_reactivate(memory) is False

    def test_should_not_reactivate_old_access(self, tier_adjuster):
        """Test that old cold memories don't get reactivated"""
        memory = Memory(
            tier=MemoryTier.COLD,
            access_count=10,
            last_seen=datetime.utcnow() - timedelta(days=30),
        )

        assert tier_adjuster.should_reactivate(memory) is False


class TestAdjustTier:
    """Tests for overall tier adjustment"""

    def test_adjust_tier_promote(self, tier_adjuster):
        """Test tier adjustment for promotion"""
        memory = Memory(
            tier=MemoryTier.RELEVANT,
            access_count=PROMOTE_TO_CORE_THRESHOLD + 1,
            confidence=0.9,
        )

        new_tier = tier_adjuster.adjust_tier(memory)

        assert new_tier == MemoryTier.CORE

    def test_adjust_tier_demote(self, tier_adjuster):
        """Test tier adjustment for demotion"""
        memory = Memory(
            tier=MemoryTier.CORE,
            confidence=LOW_CONFIDENCE_THRESHOLD - 0.1,
            last_seen=datetime.utcnow(),
        )

        new_tier = tier_adjuster.adjust_tier(memory)

        assert new_tier == MemoryTier.RELEVANT

    def test_adjust_tier_to_cold(self, tier_adjuster):
        """Test tier adjustment to cold"""
        memory = Memory(
            tier=MemoryTier.RELEVANT,
            last_seen=datetime.utcnow() - timedelta(days=COLD_THRESHOLD_DAYS + 1),
        )

        new_tier = tier_adjuster.adjust_tier(memory)

        assert new_tier == MemoryTier.COLD

    def test_adjust_tier_no_change(self, tier_adjuster):
        """Test tier adjustment when no change needed"""
        memory = Memory(
            tier=MemoryTier.RELEVANT,
            confidence=0.7,
            access_count=3,
            last_seen=datetime.utcnow() - timedelta(days=10),
        )

        new_tier = tier_adjuster.adjust_tier(memory)

        assert new_tier is None


class TestBatchAdjust:
    """Tests for batch tier adjustment"""

    def test_batch_adjust(self, tier_adjuster, sample_memory_list):
        """Test batch adjustment of multiple memories"""
        result = tier_adjuster.batch_adjust(sample_memory_list)

        assert "adjusted" in result
        assert "stats" in result
        assert "total_processed" in result["stats"]

    def test_batch_adjust_empty_list(self, tier_adjuster):
        """Test batch adjustment with empty list"""
        result = tier_adjuster.batch_adjust([])

        assert result["adjusted"] == []
        assert result["stats"]["total_processed"] == 0

    def test_batch_adjust_tracks_statistics(self, tier_adjuster):
        """Test that batch adjustment tracks all statistics"""
        # Create memories that will trigger different adjustments
        now = datetime.utcnow()
        memories = [
            # Should promote to core (high access)
            Memory(tier=MemoryTier.RELEVANT, access_count=10, confidence=0.9),
            # Should demote from core (low confidence)
            Memory(tier=MemoryTier.CORE, confidence=0.3, last_seen=now),
            # Should move to cold (old)
            Memory(tier=MemoryTier.RELEVANT, last_seen=now - timedelta(days=90)),
            # Should reactivate (recent access from cold)
            Memory(tier=MemoryTier.COLD, access_count=5, last_seen=now - timedelta(days=3)),
        ]

        result = tier_adjuster.batch_adjust(memories)
        stats = result["stats"]

        assert "promotions_to_core" in stats
        assert "demotions_from_core" in stats
        assert "moves_to_cold" in stats
        assert "reactivations" in stats


class TestOnMemoryAccessed:
    """Tests for access event handling"""

    def test_on_memory_accessed_updates_count(self, tier_adjuster):
        """Test that access updates access count"""
        memory = Memory(access_count=3)
        tier_adjuster.on_memory_accessed(memory)

        assert memory.access_count == 4

    def test_on_memory_accessed_updates_last_seen(self, tier_adjuster):
        """Test that access updates last_seen"""
        old_time = datetime.utcnow() - timedelta(days=30)
        memory = Memory(last_seen=old_time)

        tier_adjuster.on_memory_accessed(memory)

        # last_seen should be updated to recent time
        assert (datetime.utcnow() - memory.last_seen).days == 0

    def test_on_memory_accessed_may_promote(self, tier_adjuster):
        """Test that access may trigger promotion"""
        memory = Memory(
            tier=MemoryTier.RELEVANT,
            access_count=PROMOTE_TO_CORE_THRESHOLD - 1,
            confidence=0.8,
        )

        new_tier = tier_adjuster.on_memory_accessed(memory)

        assert new_tier == MemoryTier.CORE


class TestTierDistribution:
    """Tests for tier distribution analysis"""

    def test_get_tier_distribution(self, tier_adjuster, sample_memory_list):
        """Test getting tier distribution"""
        distribution = tier_adjuster.get_tier_distribution(sample_memory_list)

        assert "core" in distribution
        assert "relevant" in distribution
        assert "cold" in distribution

        # Sum should equal total
        total = distribution["core"] + distribution["relevant"] + distribution["cold"]
        assert total == len(sample_memory_list)

    def test_suggest_optimal_distribution(self, tier_adjuster):
        """Test suggesting optimal distribution"""
        optimal = tier_adjuster.suggest_optimal_distribution(100)

        # Should follow 10-30-60 rule
        assert optimal["core"] == 10
        assert optimal["relevant"] == 30
        assert optimal["cold"] == 60

    def test_suggest_optimal_distribution_small(self, tier_adjuster):
        """Test optimal distribution for small memory count"""
        optimal = tier_adjuster.suggest_optimal_distribution(5)

        # Should have at least 1 for core and relevant
        assert optimal["core"] >= 1
        assert optimal["relevant"] >= 1

"""
Unit Tests for Memory Models
Tests data structures and their methods
"""

import pytest
from datetime import datetime, timedelta
import uuid

from memory.models import (
    Memory, MemoryCandidate, MemoryScore, MemoryType,
    MemoryTier, MemoryStatus, TokenBudget
)


class TestMemoryScore:
    """Tests for MemoryScore class"""

    def test_total_score_calculation(self, high_score):
        """Test that total score is sum of all dimensions"""
        expected = (
            high_score.repeatability +
            high_score.persistence +
            high_score.relevance +
            high_score.decision_value
        )
        assert high_score.total == expected

    def test_high_dimensions_count(self, high_score):
        """Test counting of high-scoring dimensions"""
        # All dimensions > 0.6 in high_score
        assert high_score.high_dimensions >= 3

    def test_high_dimensions_with_low_score(self, low_score):
        """Test high_dimensions with low scores"""
        # Most dimensions < 0.6 in low_score
        assert low_score.high_dimensions <= 1

    def test_should_write_with_high_score(self, high_score):
        """Test that high scores pass the write threshold"""
        assert high_score.should_write() is True

    def test_should_write_with_low_score(self, low_score):
        """Test that low scores don't pass the write threshold"""
        assert low_score.should_write() is False

    def test_should_write_borderline(self):
        """Test borderline case where exactly 2 dimensions are high"""
        score = MemoryScore(
            repeatability=0.7,
            persistence=0.7,
            relevance=0.5,
            decision_value=0.5
        )
        assert score.high_dimensions == 2
        assert score.should_write() is True

    def test_to_dict(self, high_score):
        """Test conversion to dictionary"""
        d = high_score.to_dict()
        assert "repeatability" in d
        assert "persistence" in d
        assert "relevance" in d
        assert "decision_value" in d
        assert "total" in d
        assert "high_dimensions" in d


class TestMemory:
    """Tests for Memory class"""

    def test_memory_creation_with_defaults(self):
        """Test memory creation with default values"""
        memory = Memory()
        assert memory.memory_id is not None
        assert memory.confidence == 0.8
        assert memory.status == MemoryStatus.ACTIVE
        assert memory.tier == MemoryTier.RELEVANT
        assert memory.decay_factor == 1.0

    def test_memory_creation_with_values(self, sample_memory):
        """Test memory creation with specific values"""
        assert sample_memory.type == MemoryType.FACT
        assert sample_memory.confidence == 0.85
        assert sample_memory.tier == MemoryTier.RELEVANT

    def test_update_access(self, sample_memory):
        """Test access tracking update"""
        initial_count = sample_memory.access_count
        sample_memory.update_access()
        assert sample_memory.access_count == initial_count + 1
        assert sample_memory.decay_factor == 1.0  # Reset on access

    def test_add_support(self, sample_memory):
        """Test adding supporting evidence"""
        initial_confidence = sample_memory.confidence
        initial_support = sample_memory.support
        sample_memory.add_support()
        assert sample_memory.support == initial_support + 1
        assert sample_memory.confidence > initial_confidence

    def test_add_contradiction(self, sample_memory):
        """Test adding contradicting evidence"""
        initial_confidence = sample_memory.confidence
        initial_contradict = sample_memory.contradict
        sample_memory.add_contradiction()
        assert sample_memory.contradict == initial_contradict + 1
        assert sample_memory.confidence < initial_confidence

    def test_status_update_on_low_confidence(self):
        """Test that status changes when confidence drops"""
        memory = Memory(confidence=0.4)
        memory.add_contradiction()  # Should drop confidence
        # After multiple contradictions, status should change
        for _ in range(5):
            memory.add_contradiction()
        assert memory.status in [MemoryStatus.DOWNWEIGHTED, MemoryStatus.FROZEN]

    def test_apply_decay(self, sample_memory):
        """Test time-based decay application"""
        initial_decay = sample_memory.decay_factor
        sample_memory.apply_decay(15)  # 15 days
        assert sample_memory.decay_factor < initial_decay

    def test_effective_confidence(self, sample_memory):
        """Test effective confidence calculation"""
        sample_memory.decay_factor = 0.5
        expected = sample_memory.confidence * 0.5
        assert sample_memory.effective_confidence == expected

    def test_priority_score(self, core_memory, cold_memory):
        """Test priority score calculation favors core memories"""
        assert core_memory.priority_score > cold_memory.priority_score

    def test_to_dict(self, sample_memory):
        """Test conversion to dictionary"""
        d = sample_memory.to_dict()
        assert d["memory_id"] == sample_memory.memory_id
        assert d["content"] == sample_memory.content
        assert d["type"] == sample_memory.type.value
        assert d["tier"] == sample_memory.tier.value

    def test_to_pinecone_metadata(self, sample_memory):
        """Test Pinecone metadata conversion"""
        metadata = sample_memory.to_pinecone_metadata()
        assert len(metadata["content"]) <= 1000  # Truncation limit
        assert metadata["tier"] == sample_memory.tier.value
        assert "priority_score" in metadata

    def test_from_dict(self, sample_memory):
        """Test reconstruction from dictionary"""
        d = sample_memory.to_dict()
        reconstructed = Memory.from_dict(d)
        assert reconstructed.memory_id == sample_memory.memory_id
        assert reconstructed.content == sample_memory.content
        assert reconstructed.type == sample_memory.type

    def test_expire_on_heavy_decay(self):
        """Test that memory expires with heavy decay"""
        memory = Memory(confidence=0.2)
        memory.apply_decay(180)  # 180 days = 6 half-lives
        assert memory.status == MemoryStatus.EXPIRED


class TestMemoryCandidate:
    """Tests for MemoryCandidate class"""

    def test_candidate_creation(self, sample_candidate):
        """Test candidate creation"""
        assert sample_candidate.content is not None
        assert sample_candidate.memory_type == MemoryType.FACT

    def test_to_memory_conversion(self, sample_candidate):
        """Test conversion to full Memory"""
        memory = sample_candidate.to_memory(
            owner_id="test-user",
            employee_id="test-employee",
            project_id="test-project",
            embedding=[0.1] * 1536
        )
        assert isinstance(memory, Memory)
        assert memory.owner_id == "test-user"
        assert memory.content == sample_candidate.content
        assert memory.type == sample_candidate.memory_type

    def test_to_memory_uses_score(self, high_score_candidate):
        """Test that score is preserved in conversion"""
        memory = high_score_candidate.to_memory(
            owner_id="test-user",
            employee_id="test-employee",
            project_id="test-project"
        )
        assert memory.score.total == high_score_candidate.score.total


class TestTokenBudget:
    """Tests for TokenBudget class"""

    def test_default_budget(self, default_budget):
        """Test default budget values"""
        assert default_budget.core_budget == 200
        assert default_budget.relevant_budget == 400
        assert default_budget.reserve_budget == 200

    def test_total_calculation(self, default_budget):
        """Test total budget calculation"""
        expected = (
            default_budget.core_budget +
            default_budget.relevant_budget +
            default_budget.reserve_budget
        )
        assert default_budget.total == expected

    def test_allocate_tokens(self, default_budget):
        """Test token allocation per memory"""
        allocation = default_budget.allocate(core_count=5, relevant_count=10)
        assert allocation["core_per_memory"] == 200 // 5
        assert allocation["relevant_per_memory"] == 400 // 10

    def test_allocate_with_zero_counts(self, default_budget):
        """Test allocation doesn't divide by zero"""
        allocation = default_budget.allocate(core_count=0, relevant_count=0)
        assert allocation["core_per_memory"] == 200
        assert allocation["relevant_per_memory"] == 400


class TestMemoryEnums:
    """Tests for memory enums"""

    def test_memory_type_values(self):
        """Test MemoryType enum values"""
        assert MemoryType.FACT.value == "fact"
        assert MemoryType.PREFERENCE.value == "preference"
        assert MemoryType.DECISION.value == "decision"
        assert MemoryType.EXPERIENCE.value == "experience"
        assert MemoryType.CONTEXT.value == "context"

    def test_memory_status_values(self):
        """Test MemoryStatus enum values"""
        assert MemoryStatus.ACTIVE.value == "active"
        assert MemoryStatus.DOWNWEIGHTED.value == "downweighted"
        assert MemoryStatus.FROZEN.value == "frozen"
        assert MemoryStatus.REPLACED.value == "replaced"
        assert MemoryStatus.EXPIRED.value == "expired"

    def test_memory_tier_values(self):
        """Test MemoryTier enum values"""
        assert MemoryTier.CORE.value == "core"
        assert MemoryTier.RELEVANT.value == "relevant"
        assert MemoryTier.COLD.value == "cold"

"""
Pytest Configuration and Fixtures
Provides common fixtures for all memory system tests
"""

import pytest
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from unittest.mock import AsyncMock, MagicMock, patch
import uuid

# Import memory system modules
import sys
from pathlib import Path

# Add src to path
src_path = Path(__file__).parent.parent / "src"
sys.path.insert(0, str(src_path))

from memory.models import (
    Memory, MemoryCandidate, MemoryScore, MemoryType,
    MemoryTier, MemoryStatus, TokenBudget
)
from memory.scorer import MemoryScorer
from memory.retriever import MemoryRetriever, DirectoryEntry
from memory.corrector import MemoryCorrector, EvidenceType, EvidenceResult
from memory.cache import MemoryCache
from memory.shared import SharedMemoryManager, SharedMemoryScope
from memory.deduplicator import SemanticDeduplicator
from memory.tier_adjuster import TierAdjuster
from memory.manager import MemoryManager


# ===================
# Event Loop Fixture
# ===================

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


# ===================
# Memory Fixtures
# ===================

@pytest.fixture
def sample_memory() -> Memory:
    """Create a sample memory for testing"""
    return Memory(
        memory_id=str(uuid.uuid4()),
        owner_id="test-user-001",
        employee_id="mike_pm",
        project_id="test-proj-001",
        type=MemoryType.FACT,
        content="The user prefers TypeScript for frontend development",
        summary="User prefers TypeScript",
        keywords=["typescript", "frontend", "preference"],
        confidence=0.85,
        initial_confidence=0.85,
        support=2,
        contradict=0,
        status=MemoryStatus.ACTIVE,
        tier=MemoryTier.RELEVANT,
        created_at=datetime.utcnow() - timedelta(days=5),
        updated_at=datetime.utcnow(),
        last_seen=datetime.utcnow() - timedelta(hours=2),
        last_accessed=datetime.utcnow() - timedelta(hours=2),
        access_count=5,
        decay_factor=0.95,
        half_life_days=30.0,
    )


@pytest.fixture
def sample_memory_list() -> List[Memory]:
    """Create a list of sample memories for testing"""
    now = datetime.utcnow()
    return [
        Memory(
            memory_id=str(uuid.uuid4()),
            owner_id="test-user-001",
            employee_id="mike_pm",
            project_id="test-proj-001",
            type=MemoryType.FACT,
            content="The project uses React for frontend",
            summary="Project uses React",
            keywords=["react", "frontend", "framework"],
            confidence=0.9,
            tier=MemoryTier.CORE,
            created_at=now - timedelta(days=10),
            last_seen=now - timedelta(hours=1),
            access_count=10,
        ),
        Memory(
            memory_id=str(uuid.uuid4()),
            owner_id="test-user-001",
            employee_id="mike_pm",
            project_id="test-proj-001",
            type=MemoryType.PREFERENCE,
            content="User prefers detailed explanations over brief summaries",
            summary="User prefers detailed explanations",
            keywords=["preference", "communication", "detailed"],
            confidence=0.8,
            tier=MemoryTier.RELEVANT,
            created_at=now - timedelta(days=7),
            last_seen=now - timedelta(days=1),
            access_count=3,
        ),
        Memory(
            memory_id=str(uuid.uuid4()),
            owner_id="test-user-001",
            employee_id="mike_pm",
            project_id="test-proj-001",
            type=MemoryType.DECISION,
            content="Team decided to use PostgreSQL for the database",
            summary="Using PostgreSQL",
            keywords=["postgresql", "database", "decision"],
            confidence=0.95,
            tier=MemoryTier.CORE,
            created_at=now - timedelta(days=14),
            last_seen=now - timedelta(days=2),
            access_count=8,
        ),
        Memory(
            memory_id=str(uuid.uuid4()),
            owner_id="test-user-001",
            employee_id="mike_pm",
            project_id="test-proj-001",
            type=MemoryType.EXPERIENCE,
            content="Previous sprint showed that daily standups work better than async updates",
            summary="Daily standups preferred",
            keywords=["standup", "agile", "communication"],
            confidence=0.6,
            tier=MemoryTier.COLD,
            created_at=now - timedelta(days=30),
            last_seen=now - timedelta(days=20),
            access_count=1,
        ),
    ]


@pytest.fixture
def core_memory() -> Memory:
    """Create a core tier memory"""
    return Memory(
        memory_id=str(uuid.uuid4()),
        owner_id="test-user-001",
        employee_id="mike_pm",
        project_id="test-proj-001",
        type=MemoryType.FACT,
        content="The project is called ThinkUS, an AI-powered startup platform",
        summary="Project is ThinkUS",
        keywords=["thinkus", "ai", "startup"],
        confidence=0.95,
        tier=MemoryTier.CORE,
        access_count=15,
    )


@pytest.fixture
def cold_memory() -> Memory:
    """Create a cold tier memory"""
    now = datetime.utcnow()
    return Memory(
        memory_id=str(uuid.uuid4()),
        owner_id="test-user-001",
        employee_id="mike_pm",
        project_id="test-proj-001",
        type=MemoryType.CONTEXT,
        content="Meeting notes from Q1 planning session",
        summary="Q1 planning notes",
        keywords=["meeting", "planning", "q1"],
        confidence=0.5,
        tier=MemoryTier.COLD,
        created_at=now - timedelta(days=90),
        last_seen=now - timedelta(days=60),
        access_count=1,
    )


# ===================
# Memory Candidate Fixtures
# ===================

@pytest.fixture
def sample_candidate() -> MemoryCandidate:
    """Create a sample memory candidate"""
    return MemoryCandidate(
        content="User mentioned they are building an e-commerce platform",
        summary="Building e-commerce platform",
        keywords=["e-commerce", "platform", "project"],
        memory_type=MemoryType.FACT,
        source_message="We are building an e-commerce platform for small businesses",
        source_response="That sounds like an interesting project! What tech stack are you considering?",
    )


@pytest.fixture
def high_score_candidate() -> MemoryCandidate:
    """Create a candidate with a high score"""
    candidate = MemoryCandidate(
        content="User always prefers to use TypeScript over JavaScript",
        summary="User prefers TypeScript",
        keywords=["typescript", "javascript", "preference"],
        memory_type=MemoryType.PREFERENCE,
        source_message="I always prefer TypeScript, never use plain JavaScript",
        source_response="TypeScript is a great choice for type safety",
    )
    candidate.score = MemoryScore(
        repeatability=0.8,
        persistence=0.9,
        relevance=0.8,
        decision_value=0.8
    )
    return candidate


# ===================
# Score Fixtures
# ===================

@pytest.fixture
def high_score() -> MemoryScore:
    """Create a high score (should pass threshold)"""
    return MemoryScore(
        repeatability=0.8,
        persistence=0.9,
        relevance=0.7,
        decision_value=0.8
    )


@pytest.fixture
def low_score() -> MemoryScore:
    """Create a low score (should not pass threshold)"""
    return MemoryScore(
        repeatability=0.3,
        persistence=0.4,
        relevance=0.2,
        decision_value=0.3
    )


@pytest.fixture
def borderline_score() -> MemoryScore:
    """Create a borderline score (exactly at threshold)"""
    return MemoryScore(
        repeatability=0.6,
        persistence=0.7,
        relevance=0.5,
        decision_value=0.6
    )


# ===================
# Mock Fixtures
# ===================

@pytest.fixture
def mock_anthropic_client():
    """Create a mock Anthropic client"""
    mock = AsyncMock()
    mock.messages.create = AsyncMock(return_value=MagicMock(
        content=[MagicMock(text='[{"content": "Test memory", "type": "fact", "keywords": ["test"]}]')]
    ))
    return mock


@pytest.fixture
def mock_openai_client():
    """Create a mock OpenAI client for embeddings"""
    mock = AsyncMock()
    # Return a 1536-dimensional embedding (text-embedding-3-small)
    mock_embedding = [0.1] * 1536
    mock.embeddings.create = AsyncMock(return_value=MagicMock(
        data=[MagicMock(embedding=mock_embedding)]
    ))
    return mock


@pytest.fixture
def mock_pinecone_index():
    """Create a mock Pinecone index"""
    mock = MagicMock()
    mock.query = MagicMock(return_value=MagicMock(
        matches=[
            MagicMock(
                id="mem-001",
                score=0.85,
                metadata={
                    "memory_id": "mem-001",
                    "content": "Test memory content",
                    "summary": "Test summary",
                    "type": "fact",
                    "confidence": 0.9,
                    "tier": "relevant",
                    "status": "active",
                    "keywords": "test,memory",
                }
            )
        ]
    ))
    mock.fetch = MagicMock(return_value=MagicMock(
        vectors={
            "mem-001": MagicMock(
                metadata={
                    "memory_id": "mem-001",
                    "content": "Test memory content",
                    "type": "fact",
                    "confidence": 0.9,
                }
            )
        }
    ))
    mock.upsert = MagicMock()
    mock.delete = MagicMock()
    return mock


@pytest.fixture
def mock_redis_client():
    """Create a mock Redis client"""
    mock = AsyncMock()
    mock.ping = AsyncMock(return_value=True)
    mock.get = AsyncMock(return_value=None)
    mock.set = AsyncMock(return_value=True)
    mock.setex = AsyncMock(return_value=True)
    mock.delete = AsyncMock(return_value=1)
    mock.mget = AsyncMock(return_value=[])
    mock.pipeline = MagicMock(return_value=AsyncMock())
    mock.sadd = AsyncMock(return_value=1)
    mock.smembers = AsyncMock(return_value=set())
    mock.expire = AsyncMock(return_value=True)
    mock.scan_iter = AsyncMock(return_value=iter([]))
    mock.close = AsyncMock()
    return mock


# ===================
# Component Fixtures
# ===================

@pytest.fixture
def memory_scorer():
    """Create a MemoryScorer instance"""
    scorer = MemoryScorer()
    return scorer


@pytest.fixture
def memory_corrector():
    """Create a MemoryCorrector instance"""
    return MemoryCorrector()


@pytest.fixture
def memory_retriever():
    """Create a MemoryRetriever instance"""
    return MemoryRetriever("test_employee")


@pytest.fixture
def memory_cache():
    """Create a MemoryCache instance"""
    return MemoryCache("test_employee")


@pytest.fixture
def shared_memory_manager():
    """Create a SharedMemoryManager instance"""
    return SharedMemoryManager()


@pytest.fixture
def semantic_deduplicator():
    """Create a SemanticDeduplicator instance"""
    return SemanticDeduplicator()


@pytest.fixture
def tier_adjuster():
    """Create a TierAdjuster instance"""
    return TierAdjuster()


# ===================
# Token Budget Fixtures
# ===================

@pytest.fixture
def default_budget() -> TokenBudget:
    """Create a default token budget"""
    return TokenBudget(
        core_budget=200,
        relevant_budget=400,
        reserve_budget=200
    )


@pytest.fixture
def limited_budget() -> TokenBudget:
    """Create a limited token budget for testing constraints"""
    return TokenBudget(
        core_budget=50,
        relevant_budget=100,
        reserve_budget=50
    )


# ===================
# Directory Entry Fixtures
# ===================

@pytest.fixture
def directory_entries() -> List[DirectoryEntry]:
    """Create sample directory entries for retriever tests"""
    return [
        DirectoryEntry(
            memory_id="mem-001",
            summary="User prefers TypeScript",
            keywords=["typescript", "preference"],
            memory_type="preference",
            confidence=0.9,
            score=0.85
        ),
        DirectoryEntry(
            memory_id="mem-002",
            summary="Project uses React",
            keywords=["react", "frontend"],
            memory_type="fact",
            confidence=0.85,
            score=0.78
        ),
        DirectoryEntry(
            memory_id="mem-003",
            summary="Using PostgreSQL database",
            keywords=["postgresql", "database"],
            memory_type="decision",
            confidence=0.95,
            score=0.72
        ),
    ]


# ===================
# Test Data Fixtures
# ===================

@pytest.fixture
def conversation_data() -> Dict[str, str]:
    """Sample conversation data for testing"""
    return {
        "message": "We've decided to use MongoDB instead of PostgreSQL for better flexibility",
        "response": "That's a significant change. MongoDB will give you more flexibility with schema design.",
        "project_id": "test-proj-001",
        "user_id": "test-user-001",
    }


@pytest.fixture
def correction_conversation() -> Dict[str, str]:
    """Conversation data that corrects previous information"""
    return {
        "message": "Actually, we switched from React to Vue for the frontend",
        "response": "Vue is a great choice! It has a gentler learning curve.",
        "project_id": "test-proj-001",
    }


# ===================
# Embedding Fixtures
# ===================

@pytest.fixture
def sample_embedding() -> List[float]:
    """Create a sample 1536-dimensional embedding"""
    import random
    random.seed(42)  # For reproducibility
    return [random.uniform(-1, 1) for _ in range(1536)]


@pytest.fixture
def similar_embedding(sample_embedding) -> List[float]:
    """Create an embedding similar to sample_embedding"""
    # Add small noise to create a similar but not identical embedding
    import random
    random.seed(43)
    return [v + random.uniform(-0.1, 0.1) for v in sample_embedding]


@pytest.fixture
def different_embedding() -> List[float]:
    """Create an embedding different from sample_embedding"""
    import random
    random.seed(99)
    return [random.uniform(-1, 1) for _ in range(1536)]

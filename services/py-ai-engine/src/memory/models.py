"""
Memory Data Models
Complete data structures for the AI Employee Memory System
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any, List
import uuid
import json


class MemoryType(Enum):
    """Types of memories"""
    FACT = "fact"           # Factual information (e.g., "User's company is TechCorp")
    PREFERENCE = "preference"  # User preferences (e.g., "User prefers TypeScript")
    EXPERIENCE = "experience"  # Past experiences/lessons (e.g., "React worked well for this project")
    DECISION = "decision"      # Important decisions made (e.g., "Decided to use MongoDB")
    CONTEXT = "context"        # Project/session context


class MemoryStatus(Enum):
    """Memory lifecycle status"""
    ACTIVE = "active"       # Normal, active memory
    DOWNWEIGHTED = "downweighted"  # Low confidence, reduced usage
    FROZEN = "frozen"       # Not retrieved, kept for history
    REPLACED = "replaced"   # Replaced by newer memory
    EXPIRED = "expired"     # Decayed beyond threshold


class MemoryTier(Enum):
    """Memory injection tier"""
    CORE = "core"           # Always injected (≤5 items)
    RELEVANT = "relevant"   # Injected when relevant (3-8 items)
    COLD = "cold"           # Never injected, only for explicit retrieval


@dataclass
class MemoryScore:
    """4-dimension scoring for memory write decision"""
    repeatability: float = 0.0   # How often this is mentioned (0-1)
    persistence: float = 0.0     # How long-lasting (0-1)
    relevance: float = 0.0       # Individual/project relevance (0-1)
    decision_value: float = 0.0  # Future decision impact (0-1)

    @property
    def total(self) -> float:
        """Total score (0-4)"""
        return self.repeatability + self.persistence + self.relevance + self.decision_value

    @property
    def high_dimensions(self) -> int:
        """Count of high-scoring dimensions (>0.6)"""
        threshold = 0.6
        count = 0
        if self.repeatability > threshold:
            count += 1
        if self.persistence > threshold:
            count += 1
        if self.relevance > threshold:
            count += 1
        if self.decision_value > threshold:
            count += 1
        return count

    def should_write(self) -> bool:
        """Whether this memory should be written to long-term storage"""
        # Require at least 2 high dimensions
        return self.high_dimensions >= 2

    def to_dict(self) -> Dict[str, float]:
        return {
            "repeatability": self.repeatability,
            "persistence": self.persistence,
            "relevance": self.relevance,
            "decision_value": self.decision_value,
            "total": self.total,
            "high_dimensions": self.high_dimensions
        }


@dataclass
class Memory:
    """
    Complete memory data structure for AI Employee Memory System
    """
    # Identity
    memory_id: str = field(default_factory=lambda: str(uuid.uuid4()))

    # Ownership & Isolation
    owner_id: str = ""          # User ID
    employee_id: str = ""       # AI Employee ID
    project_id: str = ""        # Project ID

    # Content
    type: MemoryType = MemoryType.FACT
    content: str = ""           # Main memory content
    summary: str = ""           # Short summary for directory-level retrieval
    keywords: List[str] = field(default_factory=list)  # For fast filtering

    # Confidence & Evidence
    confidence: float = 0.8     # Current confidence (0-1)
    initial_confidence: float = 0.8  # Initial confidence when created
    support: int = 0            # Positive evidence count
    contradict: int = 0         # Negative evidence count

    # Scoring
    score: MemoryScore = field(default_factory=MemoryScore)

    # Lifecycle
    status: MemoryStatus = MemoryStatus.ACTIVE
    tier: MemoryTier = MemoryTier.RELEVANT

    # Timestamps
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    last_seen: datetime = field(default_factory=datetime.utcnow)
    last_accessed: datetime = field(default_factory=datetime.utcnow)

    # Usage Stats
    access_count: int = 0

    # Decay
    decay_factor: float = 1.0   # Current decay (1.0 = no decay)
    half_life_days: float = 30.0  # Days until decay reaches 0.5

    # Relationships
    related_memories: List[str] = field(default_factory=list)  # IDs of related memories
    replaced_by: Optional[str] = None  # ID of memory that replaced this one
    merged_from: List[str] = field(default_factory=list)  # IDs of memories merged into this

    # Source
    source_message: str = ""    # Original user message
    source_response: str = ""   # Original AI response

    # Vector
    embedding: Optional[List[float]] = None  # Vector embedding for similarity search

    def update_access(self):
        """Update access statistics"""
        self.access_count += 1
        self.last_accessed = datetime.utcnow()
        self.last_seen = datetime.utcnow()
        # Reset decay on access
        self.decay_factor = 1.0

    def add_support(self, amount: float = 1.0):
        """Add positive evidence"""
        self.support += 1
        # Increase confidence (diminishing returns)
        boost = 0.05 * (1 / (1 + self.support * 0.1))
        self.confidence = min(1.0, self.confidence + boost)
        self.updated_at = datetime.utcnow()
        self.last_seen = datetime.utcnow()

    def add_contradiction(self, amount: float = 1.0):
        """Add negative evidence"""
        self.contradict += 1
        # Decrease confidence
        penalty = 0.1 * (1 + self.contradict * 0.1)
        self.confidence = max(0.0, self.confidence - penalty)
        self.updated_at = datetime.utcnow()
        self._update_status()

    def _update_status(self):
        """Update status based on confidence"""
        if self.confidence < 0.3:
            self.status = MemoryStatus.FROZEN
        elif self.confidence < 0.5:
            self.status = MemoryStatus.DOWNWEIGHTED
        else:
            self.status = MemoryStatus.ACTIVE

    def apply_decay(self, days_passed: float):
        """Apply time-based decay"""
        import math
        # Exponential decay: decay = 0.5 ^ (days / half_life)
        self.decay_factor = math.pow(0.5, days_passed / self.half_life_days)

        # Check if should expire
        effective_confidence = self.confidence * self.decay_factor
        if effective_confidence < 0.1:
            self.status = MemoryStatus.EXPIRED

    @property
    def effective_confidence(self) -> float:
        """Confidence adjusted for decay"""
        return self.confidence * self.decay_factor

    @property
    def priority_score(self) -> float:
        """Score for injection priority"""
        # Weights: tier > confidence > recency > frequency
        tier_weight = {
            MemoryTier.CORE: 1000,
            MemoryTier.RELEVANT: 100,
            MemoryTier.COLD: 0
        }

        days_since_access = (datetime.utcnow() - self.last_accessed).days
        recency_score = 1.0 / (1 + days_since_access * 0.1)

        frequency_score = min(1.0, self.access_count / 10)

        return (
            tier_weight.get(self.tier, 0) +
            self.effective_confidence * 10 +
            recency_score * 5 +
            frequency_score * 3
        )

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage"""
        return {
            "memory_id": self.memory_id,
            "owner_id": self.owner_id,
            "employee_id": self.employee_id,
            "project_id": self.project_id,
            "type": self.type.value,
            "content": self.content,
            "summary": self.summary,
            "keywords": self.keywords,
            "confidence": self.confidence,
            "initial_confidence": self.initial_confidence,
            "support": self.support,
            "contradict": self.contradict,
            "score": self.score.to_dict(),
            "status": self.status.value,
            "tier": self.tier.value,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "last_seen": self.last_seen.isoformat(),
            "last_accessed": self.last_accessed.isoformat(),
            "access_count": self.access_count,
            "decay_factor": self.decay_factor,
            "half_life_days": self.half_life_days,
            "related_memories": self.related_memories,
            "replaced_by": self.replaced_by,
            "merged_from": self.merged_from,
            "source_message": self.source_message[:500],  # Truncate for metadata
            "source_response": self.source_response[:500],
        }

    def to_pinecone_metadata(self) -> Dict[str, Any]:
        """Convert to Pinecone-compatible metadata (limited to basic types)"""
        return {
            "memory_id": self.memory_id,
            "owner_id": self.owner_id,
            "employee_id": self.employee_id,
            "project_id": self.project_id,
            "type": self.type.value,
            "content": self.content[:1000],  # Pinecone metadata limit
            "summary": self.summary[:200],
            "keywords": ",".join(self.keywords[:10]),
            "confidence": self.confidence,
            "support": self.support,
            "contradict": self.contradict,
            "status": self.status.value,
            "tier": self.tier.value,
            "created_at": self.created_at.isoformat(),
            "last_seen": self.last_seen.isoformat(),
            "access_count": self.access_count,
            "decay_factor": self.decay_factor,
            "priority_score": self.priority_score,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Memory":
        """Create Memory from dictionary"""
        memory = cls(
            memory_id=data.get("memory_id", str(uuid.uuid4())),
            owner_id=data.get("owner_id", ""),
            employee_id=data.get("employee_id", ""),
            project_id=data.get("project_id", ""),
            content=data.get("content", ""),
            summary=data.get("summary", ""),
            keywords=data.get("keywords", []),
            confidence=data.get("confidence", 0.8),
            initial_confidence=data.get("initial_confidence", 0.8),
            support=data.get("support", 0),
            contradict=data.get("contradict", 0),
            access_count=data.get("access_count", 0),
            decay_factor=data.get("decay_factor", 1.0),
            half_life_days=data.get("half_life_days", 30.0),
            source_message=data.get("source_message", ""),
            source_response=data.get("source_response", ""),
        )

        # Enums
        if "type" in data:
            memory.type = MemoryType(data["type"])
        if "status" in data:
            memory.status = MemoryStatus(data["status"])
        if "tier" in data:
            memory.tier = MemoryTier(data["tier"])

        # Timestamps
        if "created_at" in data:
            memory.created_at = datetime.fromisoformat(data["created_at"])
        if "updated_at" in data:
            memory.updated_at = datetime.fromisoformat(data["updated_at"])
        if "last_seen" in data:
            memory.last_seen = datetime.fromisoformat(data["last_seen"])
        if "last_accessed" in data:
            memory.last_accessed = datetime.fromisoformat(data["last_accessed"])

        # Score
        if "score" in data and isinstance(data["score"], dict):
            memory.score = MemoryScore(
                repeatability=data["score"].get("repeatability", 0),
                persistence=data["score"].get("persistence", 0),
                relevance=data["score"].get("relevance", 0),
                decision_value=data["score"].get("decision_value", 0),
            )

        # Lists
        memory.related_memories = data.get("related_memories", [])
        memory.replaced_by = data.get("replaced_by")
        memory.merged_from = data.get("merged_from", [])

        return memory


@dataclass
class MemoryCandidate:
    """
    Candidate memory extracted from conversation,
    pending scoring and potential write
    """
    content: str
    summary: str = ""
    keywords: List[str] = field(default_factory=list)
    memory_type: MemoryType = MemoryType.FACT
    source_message: str = ""
    source_response: str = ""
    score: Optional[MemoryScore] = None

    def to_memory(
        self,
        owner_id: str,
        employee_id: str,
        project_id: str,
        embedding: Optional[List[float]] = None
    ) -> Memory:
        """Convert candidate to full Memory"""
        return Memory(
            owner_id=owner_id,
            employee_id=employee_id,
            project_id=project_id,
            type=self.memory_type,
            content=self.content,
            summary=self.summary or self.content[:100],
            keywords=self.keywords,
            score=self.score or MemoryScore(),
            initial_confidence=0.8,
            confidence=0.8,
            source_message=self.source_message,
            source_response=self.source_response,
            embedding=embedding,
        )


@dataclass
class TokenBudget:
    """Token budget for memory injection"""
    core_budget: int = 200      # Tokens for core memories
    relevant_budget: int = 400  # Tokens for relevant memories
    reserve_budget: int = 200   # Reserve for unexpected needs

    @property
    def total(self) -> int:
        return self.core_budget + self.relevant_budget + self.reserve_budget

    def allocate(self, core_count: int, relevant_count: int) -> Dict[str, int]:
        """Calculate token allocation per memory"""
        return {
            "core_per_memory": self.core_budget // max(1, core_count),
            "relevant_per_memory": self.relevant_budget // max(1, relevant_count),
        }

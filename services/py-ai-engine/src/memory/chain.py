"""
Memory Chain Tracking
Tracks memory evolution, supersession, and relationships
Features:
- Track memory lineage (supersedes relationships)
- Record memory modifications history
- Support memory rollback
- Visualize memory evolution
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from enum import Enum
from dataclasses import dataclass, field
import uuid

from .models import Memory, MemoryStatus

logger = logging.getLogger(__name__)


class ChainEventType(Enum):
    """Types of events in memory chain"""
    CREATED = "created"           # New memory created
    UPDATED = "updated"           # Memory content updated
    SUPERSEDED = "superseded"     # Memory replaced by new one
    MERGED = "merged"             # Memories merged together
    CORRECTED = "corrected"       # Memory corrected based on evidence
    DOWNWEIGHTED = "downweighted" # Confidence reduced
    PROMOTED = "promoted"         # Tier upgraded
    DEMOTED = "demoted"           # Tier downgraded
    EXPIRED = "expired"           # Memory expired
    DELETED = "deleted"           # Memory deleted


@dataclass
class ChainEvent:
    """A single event in memory chain"""
    event_id: str
    memory_id: str
    event_type: ChainEventType
    timestamp: datetime
    details: Dict[str, Any] = field(default_factory=dict)
    related_memory_ids: List[str] = field(default_factory=list)
    previous_state: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "event_id": self.event_id,
            "memory_id": self.memory_id,
            "event_type": self.event_type.value,
            "timestamp": self.timestamp.isoformat(),
            "details": self.details,
            "related_memory_ids": self.related_memory_ids,
            "previous_state": self.previous_state,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ChainEvent":
        return cls(
            event_id=data.get("event_id", str(uuid.uuid4())),
            memory_id=data["memory_id"],
            event_type=ChainEventType(data["event_type"]),
            timestamp=datetime.fromisoformat(data["timestamp"]),
            details=data.get("details", {}),
            related_memory_ids=data.get("related_memory_ids", []),
            previous_state=data.get("previous_state"),
        )


@dataclass
class MemoryChain:
    """Complete chain history for a memory"""
    memory_id: str
    events: List[ChainEvent] = field(default_factory=list)
    superseded_by: Optional[str] = None
    supersedes: Optional[str] = None
    merged_from: List[str] = field(default_factory=list)
    merged_into: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "memory_id": self.memory_id,
            "events": [e.to_dict() for e in self.events],
            "superseded_by": self.superseded_by,
            "supersedes": self.supersedes,
            "merged_from": self.merged_from,
            "merged_into": self.merged_into,
        }


class MemoryChainTracker:
    """
    Tracks memory evolution and relationships
    """

    def __init__(self):
        # In-memory storage for chains (could be persisted to Redis/DB)
        self._chains: Dict[str, MemoryChain] = {}
        self._events: List[ChainEvent] = []

    def _get_or_create_chain(self, memory_id: str) -> MemoryChain:
        """Get or create a chain for a memory"""
        if memory_id not in self._chains:
            self._chains[memory_id] = MemoryChain(memory_id=memory_id)
        return self._chains[memory_id]

    def _create_event(
        self,
        memory_id: str,
        event_type: ChainEventType,
        details: Dict[str, Any] = None,
        related_ids: List[str] = None,
        previous_state: Dict[str, Any] = None
    ) -> ChainEvent:
        """Create and record a chain event"""
        event = ChainEvent(
            event_id=str(uuid.uuid4()),
            memory_id=memory_id,
            event_type=event_type,
            timestamp=datetime.utcnow(),
            details=details or {},
            related_memory_ids=related_ids or [],
            previous_state=previous_state,
        )

        # Add to memory's chain
        chain = self._get_or_create_chain(memory_id)
        chain.events.append(event)

        # Add to global event log
        self._events.append(event)

        logger.debug(f"Chain event: {event_type.value} for {memory_id}")
        return event

    def on_memory_created(self, memory: Memory) -> ChainEvent:
        """Record memory creation"""
        return self._create_event(
            memory_id=memory.memory_id,
            event_type=ChainEventType.CREATED,
            details={
                "type": memory.type.value,
                "content": memory.content[:100],
                "confidence": memory.confidence,
                "tier": memory.tier.value,
            }
        )

    def on_memory_updated(
        self,
        memory: Memory,
        changes: Dict[str, Any],
        previous_state: Dict[str, Any] = None
    ) -> ChainEvent:
        """Record memory update"""
        return self._create_event(
            memory_id=memory.memory_id,
            event_type=ChainEventType.UPDATED,
            details={"changes": changes},
            previous_state=previous_state,
        )

    def on_memory_superseded(
        self,
        old_memory: Memory,
        new_memory: Memory,
        reason: str = ""
    ) -> ChainEvent:
        """Record when one memory supersedes another"""
        # Update chains
        old_chain = self._get_or_create_chain(old_memory.memory_id)
        new_chain = self._get_or_create_chain(new_memory.memory_id)

        old_chain.superseded_by = new_memory.memory_id
        new_chain.supersedes = old_memory.memory_id

        return self._create_event(
            memory_id=old_memory.memory_id,
            event_type=ChainEventType.SUPERSEDED,
            details={
                "reason": reason,
                "old_content": old_memory.content[:100],
                "new_content": new_memory.content[:100],
            },
            related_ids=[new_memory.memory_id],
        )

    def on_memories_merged(
        self,
        source_memories: List[Memory],
        merged_memory: Memory
    ) -> ChainEvent:
        """Record when memories are merged"""
        source_ids = [m.memory_id for m in source_memories]

        # Update chains
        merged_chain = self._get_or_create_chain(merged_memory.memory_id)
        merged_chain.merged_from = source_ids

        for source in source_memories:
            source_chain = self._get_or_create_chain(source.memory_id)
            source_chain.merged_into = merged_memory.memory_id

        return self._create_event(
            memory_id=merged_memory.memory_id,
            event_type=ChainEventType.MERGED,
            details={
                "source_count": len(source_memories),
                "merged_content": merged_memory.content[:100],
            },
            related_ids=source_ids,
        )

    def on_memory_corrected(
        self,
        memory: Memory,
        correction_type: str,
        confidence_change: float,
        previous_confidence: float
    ) -> ChainEvent:
        """Record memory correction"""
        return self._create_event(
            memory_id=memory.memory_id,
            event_type=ChainEventType.CORRECTED,
            details={
                "correction_type": correction_type,
                "confidence_change": confidence_change,
                "new_confidence": memory.confidence,
            },
            previous_state={"confidence": previous_confidence},
        )

    def on_memory_downweighted(
        self,
        memory: Memory,
        reason: str,
        previous_confidence: float
    ) -> ChainEvent:
        """Record memory downweight"""
        return self._create_event(
            memory_id=memory.memory_id,
            event_type=ChainEventType.DOWNWEIGHTED,
            details={
                "reason": reason,
                "new_confidence": memory.confidence,
            },
            previous_state={"confidence": previous_confidence},
        )

    def on_tier_changed(
        self,
        memory: Memory,
        old_tier: str,
        new_tier: str
    ) -> ChainEvent:
        """Record tier change"""
        event_type = ChainEventType.PROMOTED if new_tier == "core" else ChainEventType.DEMOTED

        return self._create_event(
            memory_id=memory.memory_id,
            event_type=event_type,
            details={
                "old_tier": old_tier,
                "new_tier": new_tier,
            },
        )

    def on_memory_expired(self, memory: Memory) -> ChainEvent:
        """Record memory expiration"""
        return self._create_event(
            memory_id=memory.memory_id,
            event_type=ChainEventType.EXPIRED,
            details={
                "final_confidence": memory.confidence,
                "age_days": (datetime.utcnow() - memory.created_at).days,
            },
        )

    def on_memory_deleted(self, memory_id: str, reason: str = "") -> ChainEvent:
        """Record memory deletion"""
        return self._create_event(
            memory_id=memory_id,
            event_type=ChainEventType.DELETED,
            details={"reason": reason},
        )

    def get_chain(self, memory_id: str) -> Optional[MemoryChain]:
        """Get the chain for a memory"""
        return self._chains.get(memory_id)

    def get_lineage(self, memory_id: str) -> List[str]:
        """
        Get the full lineage of a memory (supersession chain)
        Returns list from oldest to newest
        """
        lineage = []
        current_id = memory_id

        # Go backwards to find original
        while True:
            chain = self._chains.get(current_id)
            if not chain or not chain.supersedes:
                break
            current_id = chain.supersedes

        # Now go forward from original
        while current_id:
            lineage.append(current_id)
            chain = self._chains.get(current_id)
            if not chain or not chain.superseded_by:
                break
            current_id = chain.superseded_by

        return lineage

    def get_merge_tree(self, memory_id: str) -> Dict[str, Any]:
        """
        Get the merge tree for a memory
        Shows what memories were merged to create this one
        """
        chain = self._chains.get(memory_id)
        if not chain:
            return {"memory_id": memory_id, "merged_from": []}

        result = {
            "memory_id": memory_id,
            "merged_from": []
        }

        for source_id in chain.merged_from:
            # Recursively get merge tree for sources
            result["merged_from"].append(self.get_merge_tree(source_id))

        return result

    def get_recent_events(
        self,
        limit: int = 50,
        event_types: List[ChainEventType] = None
    ) -> List[ChainEvent]:
        """Get recent chain events"""
        events = self._events[-limit:]

        if event_types:
            events = [e for e in events if e.event_type in event_types]

        return events

    def get_memory_history(self, memory_id: str) -> List[ChainEvent]:
        """Get all events for a specific memory"""
        chain = self._chains.get(memory_id)
        if not chain:
            return []
        return chain.events

    def can_rollback(self, memory_id: str) -> bool:
        """Check if memory can be rolled back"""
        chain = self._chains.get(memory_id)
        if not chain:
            return False

        # Can rollback if there's a previous state in any event
        for event in reversed(chain.events):
            if event.previous_state:
                return True
        return False

    def get_rollback_point(self, memory_id: str) -> Optional[Dict[str, Any]]:
        """Get the most recent rollback point for a memory"""
        chain = self._chains.get(memory_id)
        if not chain:
            return None

        for event in reversed(chain.events):
            if event.previous_state:
                return event.previous_state
        return None

    def get_stats(self) -> Dict[str, Any]:
        """Get chain tracking statistics"""
        event_counts = {}
        for event_type in ChainEventType:
            event_counts[event_type.value] = sum(
                1 for e in self._events if e.event_type == event_type
            )

        supersession_count = sum(
            1 for chain in self._chains.values() if chain.superseded_by
        )

        merge_count = sum(
            1 for chain in self._chains.values() if chain.merged_from
        )

        return {
            "total_chains": len(self._chains),
            "total_events": len(self._events),
            "event_counts": event_counts,
            "supersessions": supersession_count,
            "merges": merge_count,
        }


# Singleton instance
_tracker: Optional[MemoryChainTracker] = None


def get_chain_tracker() -> MemoryChainTracker:
    """Get or create chain tracker instance"""
    global _tracker
    if _tracker is None:
        _tracker = MemoryChainTracker()
    return _tracker

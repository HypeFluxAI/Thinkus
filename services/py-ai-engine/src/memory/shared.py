"""
Shared Memory System
Enables cross-employee memory sharing for project-level facts
Types of shared memories:
- Project facts (tech stack, domain, goals)
- User preferences (name, communication style)
- Decisions (architectural choices, tool selections)
"""

import os
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from enum import Enum

from .models import Memory, MemoryType, MemoryTier, MemoryStatus

logger = logging.getLogger(__name__)

# Try to import Pinecone
try:
    from pinecone import Pinecone
    PINECONE_AVAILABLE = True
except ImportError:
    PINECONE_AVAILABLE = False

# Try to import OpenAI for embeddings
try:
    from openai import AsyncOpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False


class SharedMemoryScope(Enum):
    """Scope of shared memory"""
    PROJECT = "project"      # Shared within a project across employees
    GLOBAL = "global"        # Shared across all projects for a user
    ORGANIZATION = "org"     # Shared across organization (future)


# Memory types that are shareable
SHAREABLE_TYPES = [
    MemoryType.FACT,         # Project facts
    MemoryType.PREFERENCE,   # User preferences
    MemoryType.DECISION,     # Key decisions
]


class SharedMemoryManager:
    """
    Manages shared memories across employees
    Uses a separate namespace for shared memories
    """

    def __init__(self):
        self.index_name = os.getenv("PINECONE_INDEX_NAME", "thinkus-memory")
        self.shared_namespace = "shared_memories"

        # Initialize Pinecone
        self.pc = None
        self.index = None
        if PINECONE_AVAILABLE:
            api_key = os.getenv("PINECONE_API_KEY")
            if api_key:
                try:
                    self.pc = Pinecone(api_key=api_key)
                    self.index = self.pc.Index(self.index_name)
                    logger.info("SharedMemoryManager initialized with Pinecone")
                except Exception as e:
                    logger.error(f"Failed to initialize Pinecone: {e}")

        # Initialize OpenAI for embeddings
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

    def is_shareable(self, memory: Memory) -> bool:
        """Check if a memory should be shared"""
        # Only share certain types
        if memory.type not in SHAREABLE_TYPES:
            return False

        # Only share high-confidence memories
        if memory.confidence < 0.7:
            return False

        # Only share active memories
        if memory.status not in [MemoryStatus.ACTIVE]:
            return False

        # Check for sharing indicators in content
        sharing_indicators = [
            "project", "team", "we", "our", "company",
            "tech stack", "architecture", "database",
            "framework", "language", "tool", "service"
        ]
        content_lower = memory.content.lower()
        has_sharing_indicator = any(ind in content_lower for ind in sharing_indicators)

        return has_sharing_indicator

    async def share_memory(
        self,
        memory: Memory,
        scope: SharedMemoryScope = SharedMemoryScope.PROJECT
    ) -> bool:
        """
        Share a memory across employees
        Creates a copy in the shared namespace
        """
        if not self.index:
            return False

        if not self.is_shareable(memory):
            logger.debug(f"Memory {memory.memory_id} is not shareable")
            return False

        try:
            # Create shared memory ID
            shared_id = f"shared_{scope.value}_{memory.memory_id}"

            # Get embedding
            embedding = memory.embedding
            if not embedding:
                embedding = await self._get_embedding(memory.content)
                if not embedding:
                    return False

            # Build metadata for shared memory
            metadata = {
                "memory_id": shared_id,
                "original_id": memory.memory_id,
                "source_employee": memory.employee_id,
                "project_id": memory.project_id,
                "owner_id": memory.owner_id,
                "scope": scope.value,
                "type": memory.type.value,
                "content": memory.content,
                "summary": memory.summary or memory.content[:100],
                "keywords": ",".join(memory.keywords) if memory.keywords else "",
                "confidence": memory.confidence,
                "tier": MemoryTier.CORE.value,  # Shared memories are core
                "status": MemoryStatus.ACTIVE.value,
                "created_at": memory.created_at.isoformat(),
                "shared_at": datetime.utcnow().isoformat(),
            }

            # Upsert to shared namespace
            self.index.upsert(
                vectors=[{
                    "id": shared_id,
                    "values": embedding,
                    "metadata": metadata
                }],
                namespace=self.shared_namespace
            )

            logger.info(f"Shared memory: {memory.memory_id} -> {shared_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to share memory: {e}")
            return False

    async def get_shared_memories(
        self,
        query: str,
        project_id: str,
        scope: SharedMemoryScope = SharedMemoryScope.PROJECT,
        top_k: int = 5
    ) -> List[Memory]:
        """
        Retrieve shared memories for a project
        """
        if not self.index:
            return []

        try:
            embedding = await self._get_embedding(query)
            if not embedding:
                return []

            # Build filter
            filter_dict = {
                "status": MemoryStatus.ACTIVE.value,
                "scope": scope.value,
            }
            if project_id:
                filter_dict["project_id"] = project_id

            # Query shared namespace
            results = self.index.query(
                vector=embedding,
                top_k=top_k,
                namespace=self.shared_namespace,
                filter=filter_dict,
                include_metadata=True
            )

            memories = []
            for match in results.matches:
                if match.score < 0.3:  # Relevance threshold
                    continue

                metadata = match.metadata or {}
                memory = Memory.from_dict({
                    "memory_id": metadata.get("memory_id", match.id),
                    "owner_id": metadata.get("owner_id", ""),
                    "employee_id": metadata.get("source_employee", "shared"),
                    "project_id": metadata.get("project_id", ""),
                    "type": metadata.get("type", "fact"),
                    "content": metadata.get("content", ""),
                    "summary": metadata.get("summary", ""),
                    "keywords": metadata.get("keywords", "").split(",") if metadata.get("keywords") else [],
                    "confidence": metadata.get("confidence", 0.8),
                    "tier": metadata.get("tier", "core"),
                    "status": metadata.get("status", "active"),
                    "created_at": metadata.get("created_at", datetime.utcnow().isoformat()),
                })
                memories.append(memory)

            logger.info(f"Retrieved {len(memories)} shared memories for project {project_id}")
            return memories

        except Exception as e:
            logger.error(f"Failed to get shared memories: {e}")
            return []

    async def sync_to_shared(
        self,
        employee_id: str,
        project_id: str,
        memories: List[Memory]
    ) -> int:
        """
        Sync employee's shareable memories to shared pool
        Returns number of memories shared
        """
        shared_count = 0
        for memory in memories:
            if await self.share_memory(memory, SharedMemoryScope.PROJECT):
                shared_count += 1

        logger.info(f"Synced {shared_count} memories from {employee_id} to shared pool")
        return shared_count

    async def get_project_context(
        self,
        project_id: str,
        limit: int = 10
    ) -> List[Memory]:
        """
        Get all shared context for a project
        Used for onboarding new employees to a project
        """
        if not self.index:
            return []

        try:
            # Use dummy vector for metadata-only query
            dummy_vector = [0.0] * 1536

            filter_dict = {
                "project_id": project_id,
                "status": MemoryStatus.ACTIVE.value,
                "scope": SharedMemoryScope.PROJECT.value,
            }

            results = self.index.query(
                vector=dummy_vector,
                top_k=limit,
                namespace=self.shared_namespace,
                filter=filter_dict,
                include_metadata=True
            )

            memories = []
            for match in results.matches:
                metadata = match.metadata or {}
                memory = Memory.from_dict({
                    "memory_id": metadata.get("memory_id", match.id),
                    **metadata
                })
                memories.append(memory)

            # Sort by confidence
            memories.sort(key=lambda m: m.confidence, reverse=True)

            logger.info(f"Got {len(memories)} project context memories for {project_id}")
            return memories

        except Exception as e:
            logger.error(f"Failed to get project context: {e}")
            return []

    async def invalidate_shared(
        self,
        original_memory_id: str,
        project_id: str
    ) -> bool:
        """
        Invalidate a shared memory when original is updated/deleted
        """
        if not self.index:
            return False

        try:
            # Find shared memory by original ID
            shared_id = f"shared_{SharedMemoryScope.PROJECT.value}_{original_memory_id}"

            # Delete from shared namespace
            self.index.delete(
                ids=[shared_id],
                namespace=self.shared_namespace
            )

            logger.info(f"Invalidated shared memory: {shared_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to invalidate shared memory: {e}")
            return False


# Singleton instance
_shared_manager: Optional[SharedMemoryManager] = None


def get_shared_manager() -> SharedMemoryManager:
    """Get or create shared memory manager"""
    global _shared_manager
    if _shared_manager is None:
        _shared_manager = SharedMemoryManager()
    return _shared_manager

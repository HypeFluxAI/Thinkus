"""
Memory Retriever
Implements two-stage retrieval: directory-level then detail-level
Optimizes for minimal token usage while maintaining relevance
"""

import os
import logging
import asyncio
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime

from .models import Memory, MemoryTier, MemoryStatus

logger = logging.getLogger(__name__)


# Try to import Pinecone and OpenAI
try:
    from pinecone import Pinecone
    PINECONE_AVAILABLE = True
except ImportError:
    PINECONE_AVAILABLE = False

try:
    from openai import AsyncOpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False


# Configuration
DIRECTORY_TOP_K = 20     # Retrieve more at directory level
DETAIL_TOP_K = 8         # Fewer for detailed retrieval
RELEVANCE_THRESHOLD = 0.2   # Lowered for better recall
MAX_RETRY_ATTEMPTS = 3   # Retry attempts for retrieval
RETRY_DELAY_SECONDS = 2.0  # Increased delay for Pinecone propagation


class DirectoryEntry:
    """
    Lightweight directory entry for stage 1 retrieval
    Contains only summary/keywords, not full content
    """
    def __init__(
        self,
        memory_id: str,
        summary: str,
        keywords: List[str],
        memory_type: str,
        confidence: float,
        score: float
    ):
        self.memory_id = memory_id
        self.summary = summary
        self.keywords = keywords
        self.memory_type = memory_type
        self.confidence = confidence
        self.score = score  # Similarity score from vector search

    def to_dict(self) -> Dict[str, Any]:
        return {
            "memory_id": self.memory_id,
            "summary": self.summary,
            "keywords": self.keywords,
            "type": self.memory_type,
            "confidence": self.confidence,
            "score": self.score,
        }


class MemoryRetriever:
    """
    Two-stage memory retrieval system
    Stage 1: Directory-level (summaries only, ~10-20 tokens each)
    Stage 2: Detail-level (full content for relevant memories)
    """

    def __init__(self, employee_id: str):
        self.employee_id = employee_id
        self.index_name = os.getenv("PINECONE_INDEX_NAME", "thinkus-memory")
        self.namespace = f"employee_{employee_id}"

        # Initialize Pinecone
        self.pc = None
        self.index = None
        if PINECONE_AVAILABLE:
            api_key = os.getenv("PINECONE_API_KEY")
            if api_key:
                try:
                    self.pc = Pinecone(api_key=api_key)
                    self.index = self.pc.Index(self.index_name)
                except Exception as e:
                    logger.error(f"Failed to init Pinecone: {e}")

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

    async def stage1_directory_search(
        self,
        query: str,
        project_id: Optional[str] = None,
        top_k: int = DIRECTORY_TOP_K,
        retry: bool = True
    ) -> List[DirectoryEntry]:
        """
        Stage 1: Directory-level search
        Returns lightweight entries with summaries only
        Includes retry logic for Pinecone eventual consistency
        """
        if not self.index:
            return []

        embedding = await self._get_embedding(query)
        if not embedding:
            return []

        # Build filter
        filter_dict = {"status": {"$ne": "expired"}}
        if project_id:
            filter_dict["project_id"] = project_id

        # Retry logic for Pinecone eventual consistency
        attempts = MAX_RETRY_ATTEMPTS if retry else 1

        for attempt in range(attempts):
            try:
                # Query Pinecone
                results = self.index.query(
                    vector=embedding,
                    top_k=top_k,
                    namespace=self.namespace,
                    filter=filter_dict,
                    include_metadata=True
                )

                # Convert to directory entries
                entries = []
                for match in results.matches:
                    if match.score < RELEVANCE_THRESHOLD:
                        continue

                    metadata = match.metadata or {}

                    entry = DirectoryEntry(
                        memory_id=metadata.get("memory_id", match.id),
                        summary=metadata.get("summary", metadata.get("content", "")[:100]),
                        keywords=metadata.get("keywords", "").split(",") if metadata.get("keywords") else [],
                        memory_type=metadata.get("type", "fact"),
                        confidence=metadata.get("confidence", 0.8),
                        score=match.score,
                    )
                    entries.append(entry)

                logger.info(f"Stage 1: Found {len(entries)} directory entries for query (attempt {attempt + 1})")

                # If we found entries or this is the last attempt, return
                if entries or attempt == attempts - 1:
                    return entries

                # No entries found, wait and retry
                logger.debug(f"No entries found, retrying in {RETRY_DELAY_SECONDS}s...")
                await asyncio.sleep(RETRY_DELAY_SECONDS)

            except Exception as e:
                logger.error(f"Directory search failed (attempt {attempt + 1}): {e}")
                if attempt < attempts - 1:
                    await asyncio.sleep(RETRY_DELAY_SECONDS)

        return []

    async def stage2_detail_fetch(
        self,
        directory_entries: List[DirectoryEntry],
        max_entries: int = DETAIL_TOP_K
    ) -> List[Memory]:
        """
        Stage 2: Fetch full details for selected directory entries
        """
        if not self.index or not directory_entries:
            return []

        # Sort by score and take top entries
        sorted_entries = sorted(
            directory_entries,
            key=lambda e: e.score * e.confidence,
            reverse=True
        )[:max_entries]

        memories = []
        memory_ids = [e.memory_id for e in sorted_entries]

        try:
            # Fetch vectors by ID
            fetch_result = self.index.fetch(
                ids=memory_ids,
                namespace=self.namespace
            )

            for memory_id in memory_ids:
                if memory_id in fetch_result.vectors:
                    vector_data = fetch_result.vectors[memory_id]
                    metadata = vector_data.metadata or {}

                    # Find corresponding directory entry for score
                    entry = next((e for e in sorted_entries if e.memory_id == memory_id), None)
                    score = entry.score if entry else 0.5

                    memory = Memory.from_dict({
                        "memory_id": memory_id,
                        "owner_id": metadata.get("owner_id", ""),
                        "employee_id": metadata.get("employee_id", self.employee_id),
                        "project_id": metadata.get("project_id", ""),
                        "type": metadata.get("type", "fact"),
                        "content": metadata.get("content", ""),
                        "summary": metadata.get("summary", ""),
                        "keywords": metadata.get("keywords", "").split(",") if metadata.get("keywords") else [],
                        "confidence": metadata.get("confidence", 0.8),
                        "support": metadata.get("support", 0),
                        "contradict": metadata.get("contradict", 0),
                        "status": metadata.get("status", "active"),
                        "tier": metadata.get("tier", "relevant"),
                        "created_at": metadata.get("created_at", datetime.utcnow().isoformat()),
                        "last_seen": metadata.get("last_seen", datetime.utcnow().isoformat()),
                        "access_count": metadata.get("access_count", 0),
                        "decay_factor": metadata.get("decay_factor", 1.0),
                    })

                    memories.append(memory)

            logger.info(f"Stage 2: Fetched {len(memories)} full memories")
            return memories

        except Exception as e:
            logger.error(f"Detail fetch failed: {e}")
            return []

    async def retrieve(
        self,
        query: str,
        project_id: Optional[str] = None,
        top_k: int = DETAIL_TOP_K
    ) -> List[Memory]:
        """
        Full two-stage retrieval
        Stage 1: Get directory entries
        Stage 2: Fetch details for relevant ones
        """
        # Stage 1: Directory search
        directory_entries = await self.stage1_directory_search(
            query, project_id, top_k=DIRECTORY_TOP_K
        )

        if not directory_entries:
            return []

        # Stage 2: Fetch details
        memories = await self.stage2_detail_fetch(
            directory_entries, max_entries=top_k
        )

        # Sort by relevance and effective confidence
        memories.sort(
            key=lambda m: m.effective_confidence,
            reverse=True
        )

        return memories

    async def retrieve_directory_only(
        self,
        query: str,
        project_id: Optional[str] = None,
        top_k: int = DIRECTORY_TOP_K
    ) -> List[DirectoryEntry]:
        """
        Retrieve directory entries only (for preview/selection)
        Much cheaper on tokens
        """
        return await self.stage1_directory_search(query, project_id, top_k)

    async def retrieve_by_ids(
        self,
        memory_ids: List[str]
    ) -> List[Memory]:
        """
        Directly retrieve memories by their IDs
        """
        if not self.index or not memory_ids:
            return []

        try:
            fetch_result = self.index.fetch(
                ids=memory_ids,
                namespace=self.namespace
            )

            memories = []
            for memory_id in memory_ids:
                if memory_id in fetch_result.vectors:
                    metadata = fetch_result.vectors[memory_id].metadata or {}
                    memories.append(Memory.from_dict({
                        "memory_id": memory_id,
                        **metadata
                    }))

            return memories

        except Exception as e:
            logger.error(f"Fetch by IDs failed: {e}")
            return []

    async def get_core_memories(
        self,
        project_id: str,
        limit: int = 5
    ) -> List[Memory]:
        """
        Get core (always-injected) memories for a project
        """
        if not self.index:
            return []

        try:
            # Query for core tier memories
            # Use a dummy vector or metadata-only filter if supported
            # For now, use a common query that should match core memories

            # Build filter for core tier
            filter_dict = {
                "tier": "core",
                "status": "active",
            }
            if project_id:
                filter_dict["project_id"] = project_id

            # Pinecone requires a vector for query, use zeros as placeholder
            dummy_vector = [0.0] * 1536

            results = self.index.query(
                vector=dummy_vector,
                top_k=limit,
                namespace=self.namespace,
                filter=filter_dict,
                include_metadata=True
            )

            memories = []
            for match in results.matches:
                metadata = match.metadata or {}
                memories.append(Memory.from_dict({
                    "memory_id": metadata.get("memory_id", match.id),
                    **metadata
                }))

            return memories

        except Exception as e:
            logger.error(f"Get core memories failed: {e}")
            return []

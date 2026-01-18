"""
Memory Manager for AI Employees
Comprehensive memory system with:
- 4-dimension write filtering
- Confidence correction
- Time-based decay
- Memory merging
- Tiered injection
- Two-stage retrieval
- Token budget control
- Session summarization
"""

import os
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

from .models import (
    Memory, MemoryCandidate, MemoryType, MemoryTier,
    MemoryStatus, MemoryScore, TokenBudget
)
from .scorer import MemoryScorer
from .corrector import MemoryCorrector
from .decay import MemoryDecayManager
from .merger import MemoryMerger
from .injector import MemoryInjector
from .retriever import MemoryRetriever
from .budget import MemoryBudgetManager
from .summarizer import SessionSummarizer
from .cache import MemoryCache
from .shared import SharedMemoryManager, SharedMemoryScope, get_shared_manager
from .deduplicator import SemanticDeduplicator, get_deduplicator
from .tier_adjuster import TierAdjuster, get_tier_adjuster

logger = logging.getLogger(__name__)

# Try to import Pinecone
try:
    from pinecone import Pinecone
    PINECONE_AVAILABLE = True
except ImportError:
    PINECONE_AVAILABLE = False
    logger.warning("Pinecone not available")

# Try to import OpenAI for embeddings
try:
    from openai import AsyncOpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    logger.warning("OpenAI not available for embeddings")


class MemoryManager:
    """
    Unified Memory Manager for AI Employees
    Integrates all memory subsystems
    Supports multi-tenant isolation via MULTI_TENANT_ENABLED env var
    """

    def __init__(self, employee_id: str, tenant_id: str = "default"):
        self.employee_id = employee_id
        self.tenant_id = tenant_id
        self.multi_tenant_enabled = os.getenv("MULTI_TENANT_ENABLED", "false").lower() == "true"
        self.index_name = os.getenv("PINECONE_INDEX_NAME", "thinkus-memory")

        # Build namespace with optional tenant isolation
        if self.multi_tenant_enabled and tenant_id:
            self.namespace = f"tenant_{tenant_id}_employee_{employee_id}"
        else:
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
                    logger.info(f"Pinecone initialized for {employee_id}")
                except Exception as e:
                    logger.error(f"Failed to initialize Pinecone: {e}")

        # Initialize OpenAI for embeddings
        self.openai = None
        if OPENAI_AVAILABLE:
            api_key = os.getenv("OPENAI_API_KEY")
            if api_key:
                self.openai = AsyncOpenAI(api_key=api_key)

        # Initialize subsystems
        self.scorer = MemoryScorer()
        self.corrector = MemoryCorrector()
        self.decay_manager = MemoryDecayManager()
        self.merger = MemoryMerger()
        self.injector = MemoryInjector()
        self.retriever = MemoryRetriever(employee_id)
        self.budget_manager = MemoryBudgetManager()
        self.summarizer = SessionSummarizer()

        # Memory cache for session
        self._session_memories: List[Memory] = []
        self._last_summary_at: Optional[datetime] = None

        # Redis cache layer with tenant isolation
        self.cache = MemoryCache(employee_id, tenant_id if self.multi_tenant_enabled else None)
        self._cache_initialized = False

    async def _ensure_cache(self) -> bool:
        """Ensure cache is initialized"""
        if not self._cache_initialized:
            self._cache_initialized = await self.cache.connect()
        return self._cache_initialized

    async def _get_embedding(self, text: str) -> Optional[List[float]]:
        """Get embedding vector for text using OpenAI"""
        if not self.openai:
            return None

        try:
            response = await self.openai.embeddings.create(
                model="text-embedding-3-small",
                input=text
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Failed to get embedding: {e}")
            return None

    async def save(
        self,
        message: str,
        response: str,
        project_id: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Save a conversation exchange using intelligent filtering
        Only saves high-value memories based on 4-dimension scoring
        Includes deduplication to avoid storing redundant information
        """
        if not self.index:
            logger.debug("Pinecone not available, skipping save")
            return False

        try:
            # Get existing memory contents for deduplication check
            existing = await self.retriever.retrieve_directory_only(
                message, project_id, top_k=10
            )
            existing_contents = [e.summary for e in existing]

            # Extract and score memory candidates
            candidates = await self.scorer.filter_and_score(
                message, response, project_id, existing_contents
            )

            if not candidates:
                logger.debug("No high-value memories extracted")
                return True  # Not an error, just nothing worth saving

            # Semantic deduplication using embedding similarity
            deduplicator = get_deduplicator()
            existing_memories = await self.retriever.retrieve(message, project_id, top_k=10)

            unique_candidates = []
            for candidate in candidates:
                # Create temporary memory for dedup check
                temp_memory = candidate.to_memory(
                    owner_id=metadata.get("user_id", "") if metadata else "",
                    employee_id=self.employee_id,
                    project_id=project_id,
                )

                # Check against existing memories with semantic similarity
                duplicate = await deduplicator.check_new_memory_duplicate(
                    temp_memory, existing_memories
                )

                if duplicate:
                    logger.debug(f"Semantic duplicate found: {candidate.content[:50]}...")
                else:
                    unique_candidates.append(candidate)

            if not unique_candidates:
                logger.debug("All candidates were duplicates")
                return True

            # Check for contradicting memories and downweight them
            # (existing_memories already retrieved above for deduplication)
            for candidate in unique_candidates:
                # Use enhanced correction that detects both explicit and implicit contradictions
                modified = await self.corrector.apply_correction_on_save(
                    candidate.content, message, existing_memories
                )
                for mem in modified:
                    # Update in Pinecone
                    if mem.embedding:
                        self.index.upsert(
                            vectors=[{
                                "id": mem.memory_id,
                                "values": mem.embedding,
                                "metadata": mem.to_pinecone_metadata()
                            }],
                            namespace=self.namespace
                        )
                        logger.info(f"Updated contradicting memory in Pinecone: {mem.memory_id}, confidence: {mem.confidence:.2f}")

            # Save each unique candidate
            saved_count = 0
            for candidate in unique_candidates:
                memory = await self._save_candidate(candidate, project_id, metadata)
                if memory:
                    saved_count += 1
                    self._session_memories.append(memory)

            logger.info(f"Saved {saved_count}/{len(unique_candidates)} memories (filtered {len(candidates) - len(unique_candidates)} duplicates)")

            # Invalidate cache after saving new memories
            await self._ensure_cache()
            await self.cache._invalidate_query_caches()
            await self.cache.invalidate_core_memories(project_id)

            # Share shareable memories across employees
            shared_manager = get_shared_manager()
            shared_count = 0
            for memory in self._session_memories[-saved_count:]:
                if shared_manager.is_shareable(memory):
                    if await shared_manager.share_memory(memory, SharedMemoryScope.PROJECT):
                        shared_count += 1
            if shared_count > 0:
                logger.info(f"Shared {shared_count} memories across employees")

            return saved_count > 0

        except Exception as e:
            logger.error(f"Failed to save memory: {e}")
            return False

    def _content_similarity(self, content1: str, content2: str) -> float:
        """Calculate similarity ratio between two content strings"""
        words1 = set(content1.split())
        words2 = set(content2.split())
        if not words1 or not words2:
            return 0.0
        intersection = words1 & words2
        union = words1 | words2
        return len(intersection) / len(union)

    async def _save_candidate(
        self,
        candidate: MemoryCandidate,
        project_id: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Optional[Memory]:
        """Save a single memory candidate to Pinecone"""
        try:
            # Create Memory from candidate
            memory = candidate.to_memory(
                owner_id=metadata.get("user_id", "") if metadata else "",
                employee_id=self.employee_id,
                project_id=project_id,
            )

            # Generate embedding
            embedding = await self._get_embedding(memory.content)
            if not embedding:
                return None

            memory.embedding = embedding

            # Upsert to Pinecone
            self.index.upsert(
                vectors=[{
                    "id": memory.memory_id,
                    "values": embedding,
                    "metadata": memory.to_pinecone_metadata()
                }],
                namespace=self.namespace
            )

            logger.debug(f"Saved memory: {memory.memory_id}")
            return memory

        except Exception as e:
            logger.error(f"Failed to save candidate: {e}")
            return None

    async def retrieve(
        self,
        query: str,
        project_id: Optional[str] = None,
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Retrieve relevant memories using two-stage retrieval with caching
        """
        # Try cache first
        await self._ensure_cache()
        cached = await self.cache.get_query_result(query, project_id)
        if cached:
            logger.debug(f"Cache hit for query retrieval")
            return cached

        memories = await self.retriever.retrieve(query, project_id, top_k)

        # Apply decay to retrieved memories
        for memory in memories:
            self.decay_manager.apply_decay(memory)

        # Filter out expired/frozen
        active_memories = [
            m for m in memories
            if m.status in [MemoryStatus.ACTIVE, MemoryStatus.DOWNWEIGHTED]
        ]

        # Format for return
        result = [
            {
                "id": m.memory_id,
                "score": m.effective_confidence,
                "message": m.source_message,
                "response": m.source_response,
                "content": m.content,
                "type": m.type.value,
                "tier": m.tier.value,
                "timestamp": m.created_at.isoformat(),
                "project_id": m.project_id
            }
            for m in active_memories
        ]

        # Cache the result
        await self.cache.set_query_result(query, project_id, result)

        return result

    async def get_context_for_chat(
        self,
        message: str,
        project_id: str,
        max_memories: int = 8
    ) -> str:
        """
        Get formatted context from relevant memories for a chat
        Uses tiered injection and budget control
        Includes shared memories from other employees
        """
        try:
            # Stage 0: Get shared memories from other employees
            shared_manager = get_shared_manager()
            shared_memories = await shared_manager.get_shared_memories(
                message, project_id, SharedMemoryScope.PROJECT, top_k=3
            )

            # Stage 1: Get core memories
            core_memories = await self.retriever.get_core_memories(project_id, limit=5)

            # Stage 2: Get query-relevant memories
            relevant_memories = await self.retriever.retrieve(message, project_id, top_k=max_memories)

            # Combine all memories, avoiding duplicates
            seen_ids = set()
            all_memories = []

            # Add shared first (highest priority)
            for m in shared_memories:
                if m.memory_id not in seen_ids:
                    seen_ids.add(m.memory_id)
                    all_memories.append(m)

            # Add core memories
            for m in core_memories:
                if m.memory_id not in seen_ids:
                    seen_ids.add(m.memory_id)
                    all_memories.append(m)

            # Add relevant memories
            for m in relevant_memories:
                if m.memory_id not in seen_ids:
                    seen_ids.add(m.memory_id)
                    all_memories.append(m)

            # Apply decay
            for memory in all_memories:
                self.decay_manager.apply_decay(memory)

            # Filter inactive
            active_memories = [
                m for m in all_memories
                if m.status in [MemoryStatus.ACTIVE, MemoryStatus.DOWNWEIGHTED]
            ]

            if not active_memories:
                return ""

            # Budget allocation
            categorized = self.injector.categorize_by_tier(active_memories)
            allocation = self.budget_manager.allocate_budget(
                core_memories=categorized.get(MemoryTier.CORE, []),
                relevant_memories=categorized.get(MemoryTier.RELEVANT, [])
            )

            # Build injection context
            selected = allocation.core_memories + allocation.relevant_memories
            context = self.injector.build_injection(selected)

            logger.info(
                f"Memory context: {allocation.core_tokens + allocation.relevant_tokens} tokens, "
                f"{len(selected)} memories (including {len(shared_memories)} shared)"
            )

            return context

        except Exception as e:
            logger.error(f"Failed to get memory context: {e}")
            return ""

    async def correct_memories(
        self,
        message: str,
        response: str,
        project_id: str
    ) -> int:
        """
        Check and correct memories based on conversation evidence
        Returns number of memories corrected
        """
        try:
            # Get recently used memories
            recent_memories = await self.retriever.retrieve(message, project_id, top_k=10)

            if not recent_memories:
                return 0

            # Check for evidence
            modified = await self.corrector.check_and_correct(
                message, response, recent_memories
            )

            # Update modified memories in Pinecone
            for memory in modified:
                if memory.embedding:
                    self.index.upsert(
                        vectors=[{
                            "id": memory.memory_id,
                            "values": memory.embedding,
                            "metadata": memory.to_pinecone_metadata()
                        }],
                        namespace=self.namespace
                    )

            return len(modified)

        except Exception as e:
            logger.error(f"Failed to correct memories: {e}")
            return 0

    async def summarize_session(
        self,
        messages: List[Dict[str, str]],
        project_id: str,
        user_id: str
    ) -> bool:
        """
        Summarize current session and extract memories
        """
        try:
            # Check if should summarize
            if not await self.summarizer.should_summarize(messages, self._last_summary_at):
                return False

            # Generate summary
            summary = await self.summarizer.summarize_session(messages, project_id)

            # Extract memory candidates from summary
            candidates = await self.summarizer.extract_memories_from_summary(
                summary, project_id, user_id
            )

            # Save candidates
            for candidate in candidates:
                await self._save_candidate(
                    candidate, project_id, {"user_id": user_id}
                )

            self._last_summary_at = datetime.utcnow()
            logger.info(f"Session summarized: {len(candidates)} memories extracted")
            return True

        except Exception as e:
            logger.error(f"Session summarization failed: {e}")
            return False

    async def run_maintenance(self, project_id: Optional[str] = None) -> Dict[str, int]:
        """
        Run memory maintenance:
        - Apply decay to all memories
        - Adjust tiers dynamically
        - Merge similar memories
        - Clean up expired memories
        """
        try:
            # Get all memories for maintenance
            all_memories = await self.retriever.retrieve("", project_id, top_k=100)

            if not all_memories:
                return {"processed": 0, "decayed": 0, "merged": 0, "expired": 0, "tier_adjusted": 0}

            # Apply decay
            decay_results = self.decay_manager.batch_apply_decay(all_memories)

            # Dynamic tier adjustment
            tier_adjuster = get_tier_adjuster()
            tier_results = tier_adjuster.batch_adjust(
                decay_results["active"] + decay_results["decayed"]
            )

            # Merge similar memories
            merge_results = self.merger.process_batch(
                decay_results["active"] + decay_results["decayed"]
            )

            # Update all modified memories
            updated_memories = (
                decay_results["active"] +
                decay_results["decayed"] +
                merge_results["merged"] +
                merge_results["upgraded"] +
                tier_results["adjusted"]
            )

            for memory in updated_memories:
                if memory.embedding:
                    self.index.upsert(
                        vectors=[{
                            "id": memory.memory_id,
                            "values": memory.embedding,
                            "metadata": memory.to_pinecone_metadata()
                        }],
                        namespace=self.namespace
                    )

            # Delete expired memories
            expired_ids = [m.memory_id for m in decay_results["expired"]]
            if expired_ids:
                self.index.delete(ids=expired_ids, namespace=self.namespace)

            stats = {
                "processed": len(all_memories),
                "decayed": len(decay_results["decayed"]),
                "merged": len(merge_results["merged"]),
                "upgraded": len(merge_results["upgraded"]),
                "expired": len(decay_results["expired"]),
                "tier_adjusted": tier_results["stats"]["total_adjusted"],
                "tier_promotions": tier_results["stats"]["promotions_to_core"],
                "tier_demotions": tier_results["stats"]["demotions_from_core"],
            }

            logger.info(f"Maintenance complete: {stats}")
            return stats

        except Exception as e:
            logger.error(f"Maintenance failed: {e}")
            return {"error": str(e)}

    async def delete_project_memories(self, project_id: str) -> bool:
        """Delete all memories for a project"""
        if not self.index:
            return False

        try:
            self.index.delete(
                filter={"project_id": project_id},
                namespace=self.namespace
            )
            logger.info(f"Deleted memories for project: {project_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete memories: {e}")
            return False

    async def get_stats(self, project_id: Optional[str] = None) -> Dict[str, Any]:
        """Get memory system statistics"""
        try:
            memories = await self.retriever.retrieve("", project_id, top_k=100)

            if not memories:
                return {"count": 0}

            decay_stats = self.decay_manager.get_decay_stats(memories)

            tier_counts = {
                "core": sum(1 for m in memories if m.tier == MemoryTier.CORE),
                "relevant": sum(1 for m in memories if m.tier == MemoryTier.RELEVANT),
                "cold": sum(1 for m in memories if m.tier == MemoryTier.COLD),
            }

            type_counts = {}
            for m in memories:
                type_key = m.type.value
                type_counts[type_key] = type_counts.get(type_key, 0) + 1

            return {
                **decay_stats,
                "tiers": tier_counts,
                "types": type_counts,
                "employee_id": self.employee_id,
                "project_id": project_id,
            }

        except Exception as e:
            logger.error(f"Failed to get stats: {e}")
            return {"error": str(e)}

    # ===================
    # Batch Operations
    # ===================

    async def batch_save(
        self,
        candidates: List[MemoryCandidate],
        project_id: str,
        metadata: Optional[Dict[str, Any]] = None,
        batch_size: int = 100
    ) -> Dict[str, Any]:
        """
        Save multiple memory candidates in batches
        Returns statistics about the operation
        """
        if not self.index or not candidates:
            return {"saved": 0, "failed": 0, "skipped": 0}

        saved = 0
        failed = 0
        skipped = 0

        # Process in batches
        for i in range(0, len(candidates), batch_size):
            batch = candidates[i:i + batch_size]
            vectors_to_upsert = []

            for candidate in batch:
                try:
                    memory = candidate.to_memory(
                        owner_id=metadata.get("user_id", "") if metadata else "",
                        employee_id=self.employee_id,
                        project_id=project_id,
                    )

                    # Generate embedding
                    embedding = await self._get_embedding(memory.content)
                    if not embedding:
                        skipped += 1
                        continue

                    memory.embedding = embedding

                    vectors_to_upsert.append({
                        "id": memory.memory_id,
                        "values": embedding,
                        "metadata": memory.to_pinecone_metadata()
                    })

                except Exception as e:
                    logger.error(f"Failed to process candidate: {e}")
                    failed += 1

            # Batch upsert to Pinecone
            if vectors_to_upsert:
                try:
                    self.index.upsert(
                        vectors=vectors_to_upsert,
                        namespace=self.namespace
                    )
                    saved += len(vectors_to_upsert)
                    logger.info(f"Batch upserted {len(vectors_to_upsert)} memories")
                except Exception as e:
                    logger.error(f"Batch upsert failed: {e}")
                    failed += len(vectors_to_upsert)

        return {"saved": saved, "failed": failed, "skipped": skipped}

    async def batch_delete(self, memory_ids: List[str]) -> Dict[str, Any]:
        """
        Delete multiple memories by their IDs
        """
        if not self.index or not memory_ids:
            return {"deleted": 0, "failed": 0}

        deleted = 0
        failed = 0

        # Pinecone supports batch delete
        try:
            self.index.delete(
                ids=memory_ids,
                namespace=self.namespace
            )
            deleted = len(memory_ids)
            logger.info(f"Batch deleted {deleted} memories")
        except Exception as e:
            logger.error(f"Batch delete failed: {e}")
            failed = len(memory_ids)

        # Invalidate cache
        await self._ensure_cache()
        await self.cache._invalidate_query_caches()

        return {"deleted": deleted, "failed": failed}

    async def batch_update_tier(
        self,
        memory_ids: List[str],
        new_tier: MemoryTier
    ) -> Dict[str, Any]:
        """
        Update the tier for multiple memories
        """
        if not self.index or not memory_ids:
            return {"updated": 0, "failed": 0}

        updated = 0
        failed = 0

        # Fetch existing memories
        memories = await self.retriever.retrieve_by_ids(memory_ids)

        vectors_to_upsert = []
        for memory in memories:
            try:
                memory.tier = new_tier
                if memory.embedding:
                    vectors_to_upsert.append({
                        "id": memory.memory_id,
                        "values": memory.embedding,
                        "metadata": memory.to_pinecone_metadata()
                    })
            except Exception as e:
                logger.error(f"Failed to update memory {memory.memory_id}: {e}")
                failed += 1

        # Batch upsert
        if vectors_to_upsert:
            try:
                self.index.upsert(
                    vectors=vectors_to_upsert,
                    namespace=self.namespace
                )
                updated = len(vectors_to_upsert)
            except Exception as e:
                logger.error(f"Batch tier update failed: {e}")
                failed += len(vectors_to_upsert)

        return {"updated": updated, "failed": failed}

    async def batch_retrieve_parallel(
        self,
        queries: List[str],
        project_id: Optional[str] = None,
        top_k: int = 5
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        Retrieve memories for multiple queries in parallel
        """
        import asyncio

        async def retrieve_single(query: str) -> tuple:
            results = await self.retrieve(query, project_id, top_k)
            return query, results

        # Run all retrievals in parallel
        tasks = [retrieve_single(q) for q in queries]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Organize results
        output = {}
        for result in results:
            if isinstance(result, Exception):
                logger.error(f"Parallel retrieval failed: {result}")
                continue
            query, memories = result
            output[query] = memories

        return output

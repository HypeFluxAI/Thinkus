"""
Memory Budget Manager
Implements token budget control for memory injection
Ensures memory context doesn't exceed allocated tokens
"""

import logging
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass

from .models import Memory, MemoryTier, TokenBudget

logger = logging.getLogger(__name__)


# Default budgets
DEFAULT_TOTAL_BUDGET = 800    # Total tokens for memory context
DEFAULT_CORE_BUDGET = 200     # Reserved for core memories
DEFAULT_RELEVANT_BUDGET = 400  # For relevant memories
DEFAULT_RESERVE_BUDGET = 200   # Reserve/buffer

# Token estimation
CHARS_PER_TOKEN = 4
OVERHEAD_PER_MEMORY = 10  # Formatting overhead per memory


@dataclass
class BudgetAllocation:
    """Result of budget allocation"""
    core_memories: List[Memory]
    relevant_memories: List[Memory]
    total_tokens: int
    core_tokens: int
    relevant_tokens: int
    budget_remaining: int
    truncated_count: int


class MemoryBudgetManager:
    """
    Manages token budget for memory injection
    """

    def __init__(
        self,
        total_budget: int = DEFAULT_TOTAL_BUDGET,
        core_budget: int = DEFAULT_CORE_BUDGET,
        relevant_budget: int = DEFAULT_RELEVANT_BUDGET
    ):
        self.total_budget = total_budget
        self.core_budget = core_budget
        self.relevant_budget = relevant_budget

    def estimate_tokens(self, text: str) -> int:
        """Estimate token count for text"""
        if not text:
            return 0
        return len(text) // CHARS_PER_TOKEN + 1

    def estimate_memory_tokens(self, memory: Memory, use_summary: bool = False) -> int:
        """Estimate tokens for a memory including formatting overhead"""
        if use_summary and memory.summary:
            content_tokens = self.estimate_tokens(memory.summary)
        else:
            content_tokens = self.estimate_tokens(memory.content)

        return content_tokens + OVERHEAD_PER_MEMORY

    def truncate_content(self, content: str, max_tokens: int) -> str:
        """Truncate content to fit within token limit"""
        max_chars = (max_tokens - 1) * CHARS_PER_TOKEN
        if len(content) <= max_chars:
            return content

        # Truncate and add ellipsis
        truncated = content[:max_chars - 3] + "..."
        return truncated

    def allocate_budget(
        self,
        core_memories: List[Memory],
        relevant_memories: List[Memory]
    ) -> BudgetAllocation:
        """
        Allocate token budget across memories
        Prioritizes core memories, then fills with relevant
        """
        allocated_core = []
        allocated_relevant = []
        core_tokens_used = 0
        relevant_tokens_used = 0
        truncated_count = 0

        # Allocate core memories first
        for memory in core_memories:
            tokens = self.estimate_memory_tokens(memory)

            if core_tokens_used + tokens <= self.core_budget:
                allocated_core.append(memory)
                core_tokens_used += tokens
            elif core_tokens_used < self.core_budget:
                # Try with summary
                summary_tokens = self.estimate_memory_tokens(memory, use_summary=True)
                if core_tokens_used + summary_tokens <= self.core_budget:
                    # Use summary instead
                    memory.content = memory.summary or self.truncate_content(
                        memory.content,
                        self.core_budget - core_tokens_used - OVERHEAD_PER_MEMORY
                    )
                    allocated_core.append(memory)
                    core_tokens_used += summary_tokens
                    truncated_count += 1

        # Allocate relevant memories
        for memory in relevant_memories:
            tokens = self.estimate_memory_tokens(memory)

            if relevant_tokens_used + tokens <= self.relevant_budget:
                allocated_relevant.append(memory)
                relevant_tokens_used += tokens
            elif relevant_tokens_used < self.relevant_budget:
                # Try with summary or truncation
                remaining = self.relevant_budget - relevant_tokens_used
                if remaining > OVERHEAD_PER_MEMORY + 10:  # Minimum viable size
                    truncated_content = self.truncate_content(
                        memory.content,
                        remaining - OVERHEAD_PER_MEMORY
                    )
                    memory.content = truncated_content
                    allocated_relevant.append(memory)
                    relevant_tokens_used += self.estimate_memory_tokens(memory)
                    truncated_count += 1

        total_tokens = core_tokens_used + relevant_tokens_used

        return BudgetAllocation(
            core_memories=allocated_core,
            relevant_memories=allocated_relevant,
            total_tokens=total_tokens,
            core_tokens=core_tokens_used,
            relevant_tokens=relevant_tokens_used,
            budget_remaining=self.total_budget - total_tokens,
            truncated_count=truncated_count,
        )

    def check_budget(
        self,
        memories: List[Memory]
    ) -> Tuple[bool, int, int]:
        """
        Check if memories fit within budget
        Returns (fits, total_tokens, overflow)
        """
        total_tokens = sum(
            self.estimate_memory_tokens(m) for m in memories
        )

        fits = total_tokens <= self.total_budget
        overflow = max(0, total_tokens - self.total_budget)

        return fits, total_tokens, overflow

    def optimize_for_budget(
        self,
        memories: List[Memory],
        budget: Optional[int] = None
    ) -> List[Memory]:
        """
        Optimize memory list to fit within budget
        Prioritizes by effective confidence and tier
        """
        if budget is None:
            budget = self.total_budget

        # Sort by priority
        sorted_memories = sorted(
            memories,
            key=lambda m: m.priority_score,
            reverse=True
        )

        optimized = []
        used_tokens = 0

        for memory in sorted_memories:
            tokens = self.estimate_memory_tokens(memory)

            if used_tokens + tokens <= budget:
                optimized.append(memory)
                used_tokens += tokens
            else:
                # Try with summary
                summary_tokens = self.estimate_memory_tokens(memory, use_summary=True)
                if used_tokens + summary_tokens <= budget:
                    memory.content = memory.summary or memory.content[:200]
                    optimized.append(memory)
                    used_tokens += summary_tokens

        return optimized

    def compress_memories(
        self,
        memories: List[Memory],
        target_tokens: int
    ) -> List[Memory]:
        """
        Compress memories to fit target token count
        Uses progressive compression strategies
        """
        current_tokens = sum(
            self.estimate_memory_tokens(m) for m in memories
        )

        if current_tokens <= target_tokens:
            return memories

        # Strategy 1: Use summaries for lower-priority memories
        sorted_memories = sorted(
            memories,
            key=lambda m: m.priority_score,
            reverse=True
        )

        # Keep top 1/3 as full, rest as summaries
        split_point = len(sorted_memories) // 3
        compressed = []

        for i, memory in enumerate(sorted_memories):
            if i < split_point:
                compressed.append(memory)
            else:
                memory.content = memory.summary or memory.content[:100]
                compressed.append(memory)

        current_tokens = sum(
            self.estimate_memory_tokens(m) for m in compressed
        )

        if current_tokens <= target_tokens:
            return compressed

        # Strategy 2: Truncate all to fit
        avg_tokens = target_tokens // len(compressed)
        for memory in compressed:
            memory.content = self.truncate_content(memory.content, avg_tokens)

        return compressed

    def get_budget_stats(
        self,
        allocation: BudgetAllocation
    ) -> Dict[str, Any]:
        """Get statistics about budget allocation"""
        return {
            "total_budget": self.total_budget,
            "core_budget": self.core_budget,
            "relevant_budget": self.relevant_budget,
            "total_used": allocation.total_tokens,
            "core_used": allocation.core_tokens,
            "relevant_used": allocation.relevant_tokens,
            "remaining": allocation.budget_remaining,
            "core_count": len(allocation.core_memories),
            "relevant_count": len(allocation.relevant_memories),
            "truncated": allocation.truncated_count,
            "utilization_percent": (
                allocation.total_tokens / self.total_budget * 100
                if self.total_budget > 0 else 0
            ),
        }

    def adjust_budget(
        self,
        new_total: Optional[int] = None,
        new_core: Optional[int] = None,
        new_relevant: Optional[int] = None
    ):
        """Dynamically adjust budgets"""
        if new_total is not None:
            self.total_budget = new_total
        if new_core is not None:
            self.core_budget = new_core
        if new_relevant is not None:
            self.relevant_budget = new_relevant

        # Ensure budgets are consistent
        if self.core_budget + self.relevant_budget > self.total_budget:
            # Scale down proportionally
            total_allocated = self.core_budget + self.relevant_budget
            scale = self.total_budget / total_allocated
            self.core_budget = int(self.core_budget * scale)
            self.relevant_budget = int(self.relevant_budget * scale)

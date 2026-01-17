"""
Memory Injector
Implements tiered memory injection with priority-based selection
Ensures token budget is respected while maximizing useful context
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

from .models import Memory, MemoryTier, MemoryStatus, TokenBudget

logger = logging.getLogger(__name__)


# Default token budgets
DEFAULT_CORE_BUDGET = 200
DEFAULT_RELEVANT_BUDGET = 400
DEFAULT_RESERVE_BUDGET = 200

# Estimated tokens per character (approximate for English)
CHARS_PER_TOKEN = 4


class MemoryInjector:
    """
    Manages tiered memory injection into prompts
    """

    def __init__(
        self,
        core_budget: int = DEFAULT_CORE_BUDGET,
        relevant_budget: int = DEFAULT_RELEVANT_BUDGET,
        reserve_budget: int = DEFAULT_RESERVE_BUDGET
    ):
        self.budget = TokenBudget(
            core_budget=core_budget,
            relevant_budget=relevant_budget,
            reserve_budget=reserve_budget
        )

    def estimate_tokens(self, text: str) -> int:
        """Estimate token count for text"""
        return len(text) // CHARS_PER_TOKEN + 1

    def sort_by_priority(self, memories: List[Memory]) -> List[Memory]:
        """
        Sort memories by injection priority
        Priority: tier > effective_confidence > recency > frequency
        """
        return sorted(
            memories,
            key=lambda m: m.priority_score,
            reverse=True
        )

    def filter_injectable(self, memories: List[Memory]) -> List[Memory]:
        """
        Filter memories that can be injected
        Excludes frozen, expired, and replaced memories
        """
        return [
            m for m in memories
            if m.status == MemoryStatus.ACTIVE or m.status == MemoryStatus.DOWNWEIGHTED
        ]

    def categorize_by_tier(
        self,
        memories: List[Memory]
    ) -> Dict[MemoryTier, List[Memory]]:
        """
        Categorize memories by their tier
        """
        result = {
            MemoryTier.CORE: [],
            MemoryTier.RELEVANT: [],
            MemoryTier.COLD: [],
        }

        for memory in memories:
            result[memory.tier].append(memory)

        return result

    def select_within_budget(
        self,
        memories: List[Memory],
        token_budget: int
    ) -> List[Memory]:
        """
        Select memories that fit within token budget
        Prioritizes higher-priority memories
        """
        selected = []
        used_tokens = 0

        for memory in self.sort_by_priority(memories):
            memory_tokens = self.estimate_tokens(memory.content)

            if used_tokens + memory_tokens <= token_budget:
                selected.append(memory)
                used_tokens += memory_tokens
            else:
                # Try with summary instead
                summary_tokens = self.estimate_tokens(memory.summary or memory.content[:100])
                if used_tokens + summary_tokens <= token_budget:
                    selected.append(memory)
                    used_tokens += summary_tokens

        return selected

    def build_injection(
        self,
        memories: List[Memory],
        include_metadata: bool = False
    ) -> str:
        """
        Build the injection string for selected memories
        Uses explicit formatting to encourage AI to use the context
        Marks outdated/corrected memories explicitly
        """
        if not memories:
            return ""

        lines = [
            "=== IMPORTANT: USER CONTEXT FROM PREVIOUS CONVERSATIONS ===",
            "The following information was shared by this user previously.",
            "You MUST use this context when responding to the user's question.",
            "CRITICAL: If an item is marked [OUTDATED], DO NOT use that information - use the newer information instead.",
            ""
        ]

        # Separate current and outdated memories
        current_memories = [m for m in memories if m.status != MemoryStatus.DOWNWEIGHTED]
        outdated_memories = [m for m in memories if m.status == MemoryStatus.DOWNWEIGHTED]

        # Group current memories by type
        by_type = {}
        for memory in current_memories:
            type_name = memory.type.value.title()
            if type_name not in by_type:
                by_type[type_name] = []
            by_type[type_name].append(memory)

        # Add current memories first
        if by_type:
            lines.append("[CURRENT INFORMATION - Use this]")
            for type_name, type_memories in by_type.items():
                for memory in type_memories:
                    if memory.tier == MemoryTier.CORE:
                        prefix = "* "  # Important marker
                    else:
                        prefix = "- "

                    if include_metadata:
                        lines.append(f"{prefix}{memory.content} [{memory.effective_confidence:.0%}]")
                    else:
                        lines.append(f"{prefix}{memory.content}")
            lines.append("")

        # Add outdated memories with clear warning
        if outdated_memories:
            lines.append("[OUTDATED - DO NOT USE, has been corrected/superseded]")
            for memory in outdated_memories:
                lines.append(f"  [OUTDATED] {memory.content}")
            lines.append("")

        lines.append("=== END USER CONTEXT ===")
        lines.append("REMINDER: Ignore any [OUTDATED] information above. Only use [CURRENT INFORMATION].")
        lines.append("Now respond to the user's current message:")
        lines.append("")

        return "\n".join(lines)

    def inject(
        self,
        all_memories: List[Memory],
        query: str = ""
    ) -> Dict[str, Any]:
        """
        Main injection method
        Returns injection context and metadata
        """
        # Filter injectable memories
        injectable = self.filter_injectable(all_memories)

        if not injectable:
            return {
                "context": "",
                "core_count": 0,
                "relevant_count": 0,
                "total_tokens": 0,
            }

        # Categorize by tier
        by_tier = self.categorize_by_tier(injectable)

        # Select core memories (always included, up to budget)
        core_memories = self.select_within_budget(
            by_tier[MemoryTier.CORE],
            self.budget.core_budget
        )

        # Select relevant memories (based on query relevance)
        relevant_memories = self.select_within_budget(
            by_tier[MemoryTier.RELEVANT],
            self.budget.relevant_budget
        )

        # Combine selected memories
        selected = core_memories + relevant_memories

        # Sort by priority for final output
        selected = self.sort_by_priority(selected)

        # Build injection context
        context = self.build_injection(selected)

        # Calculate token usage
        total_tokens = self.estimate_tokens(context)

        # Mark memories as accessed
        for memory in selected:
            memory.update_access()

        logger.info(
            f"Injection: {len(core_memories)} core, {len(relevant_memories)} relevant, "
            f"~{total_tokens} tokens"
        )

        return {
            "context": context,
            "core_count": len(core_memories),
            "relevant_count": len(relevant_memories),
            "total_tokens": total_tokens,
            "selected_memories": selected,
        }

    def inject_with_query_relevance(
        self,
        all_memories: List[Memory],
        query: str,
        query_relevant_memories: List[Memory]
    ) -> Dict[str, Any]:
        """
        Injection with additional query-relevant memories
        Uses two-stage retrieval results
        """
        # Get core memories
        by_tier = self.categorize_by_tier(self.filter_injectable(all_memories))
        core_memories = self.select_within_budget(
            by_tier[MemoryTier.CORE],
            self.budget.core_budget
        )

        # Add query-relevant memories (from retriever)
        relevant = [m for m in query_relevant_memories if m not in core_memories]
        relevant_memories = self.select_within_budget(
            relevant,
            self.budget.relevant_budget
        )

        selected = core_memories + relevant_memories
        context = self.build_injection(self.sort_by_priority(selected))

        return {
            "context": context,
            "core_count": len(core_memories),
            "relevant_count": len(relevant_memories),
            "total_tokens": self.estimate_tokens(context),
            "selected_memories": selected,
        }

    def compress_if_needed(
        self,
        context: str,
        max_tokens: int
    ) -> str:
        """
        Compress context if it exceeds max tokens
        """
        current_tokens = self.estimate_tokens(context)

        if current_tokens <= max_tokens:
            return context

        # Split into lines and truncate
        lines = context.split('\n')
        compressed_lines = [lines[0]]  # Keep header
        used_tokens = self.estimate_tokens(lines[0])

        for line in lines[1:]:
            line_tokens = self.estimate_tokens(line)
            if used_tokens + line_tokens < max_tokens - 20:  # Reserve for ellipsis
                compressed_lines.append(line)
                used_tokens += line_tokens
            else:
                break

        compressed_lines.append("... (additional context truncated)")

        return '\n'.join(compressed_lines)

    def get_injection_stats(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Get statistics about an injection
        """
        return {
            "core_count": result.get("core_count", 0),
            "relevant_count": result.get("relevant_count", 0),
            "total_tokens": result.get("total_tokens", 0),
            "budget_used_percent": (
                result.get("total_tokens", 0) / self.budget.total * 100
                if self.budget.total > 0 else 0
            ),
            "memories_injected": len(result.get("selected_memories", [])),
        }

"""
Memory Corrector
Handles evidence detection and confidence adjustment for memories
Implements three-stage correction: Downweight → Freeze → Replace
"""

import os
import re
import logging
from typing import List, Dict, Any, Optional, Tuple
from enum import Enum

from anthropic import AsyncAnthropic

from .models import Memory, MemoryStatus

logger = logging.getLogger(__name__)

# Patterns that indicate correction/update of information
CORRECTION_PATTERNS = [
    r"actually[,\s]+(?:we|i|it|the|our)\s+(?:use|chose|switched|changed|moved|migrated)",
    r"(?:we|i)\s+(?:switched|changed|moved|migrated)\s+(?:to|from)",
    r"(?:no|not)\s+(?:anymore|any\s*more|longer)",
    r"(?:used\s+to|previously|before|formerly)\s+(?:use|be|have)",
    r"(?:now|currently|these\s+days)\s+(?:we|i|it)\s+(?:use|have|prefer)",
    r"(?:instead|rather)\s+(?:of|than)",
    r"(?:correction|update|actually|in\s+fact)[:\s]",
]


class EvidenceType(Enum):
    """Type of evidence detected"""
    SUPPORT = "support"       # Confirms the memory
    CONTRADICT = "contradict"  # Contradicts the memory
    NEUTRAL = "neutral"        # No effect on memory


class EvidenceResult:
    """Result of evidence detection"""
    def __init__(
        self,
        evidence_type: EvidenceType,
        confidence_delta: float = 0.0,
        reason: str = "",
        replacement_content: Optional[str] = None
    ):
        self.evidence_type = evidence_type
        self.confidence_delta = confidence_delta
        self.reason = reason
        self.replacement_content = replacement_content


class MemoryCorrector:
    """
    Detects evidence in conversations and corrects memory confidence
    """

    def __init__(self):
        self._client: Optional[AsyncAnthropic] = None

    def _has_correction_signal(self, message: str) -> bool:
        """Quick check if message contains correction patterns"""
        message_lower = message.lower()
        for pattern in CORRECTION_PATTERNS:
            if re.search(pattern, message_lower):
                return True
        return False

    def _extract_old_new_values(self, message: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Try to extract old and new values from correction statements
        e.g., "We switched from React to Vue" -> ("React", "Vue")
        """
        # Pattern: switched/changed/moved from X to Y
        match = re.search(
            r"(?:switched|changed|moved|migrated)\s+from\s+(\w+(?:\s+\w+)?)\s+to\s+(\w+(?:\s+\w+)?)",
            message, re.IGNORECASE
        )
        if match:
            return match.group(1).strip(), match.group(2).strip()

        # Pattern: used to use X, now use Y
        match = re.search(
            r"used\s+to\s+(?:use|have|be)\s+(\w+(?:\s+\w+)?)[,.\s]+(?:now|but\s+now)\s+(?:use|have|be|it's)\s+(\w+(?:\s+\w+)?)",
            message, re.IGNORECASE
        )
        if match:
            return match.group(1).strip(), match.group(2).strip()

        # Pattern: Actually, we use Y (not X)
        match = re.search(
            r"actually[,\s]+(?:we|i)\s+(?:use|chose|prefer)\s+(\w+(?:\s+\w+)?)",
            message, re.IGNORECASE
        )
        if match:
            return None, match.group(1).strip()

        return None, None

    @property
    def client(self) -> AsyncAnthropic:
        """Lazy initialization of Anthropic client"""
        if self._client is None:
            api_key = os.getenv("ANTHROPIC_API_KEY")
            if not api_key:
                raise ValueError("ANTHROPIC_API_KEY not set")
            self._client = AsyncAnthropic(api_key=api_key)
        return self._client

    async def detect_evidence(
        self,
        message: str,
        response: str,
        memory: Memory
    ) -> EvidenceResult:
        """
        Detect if conversation contains evidence for/against a memory
        """
        try:
            prompt = f"""Analyze if this conversation provides evidence about a stored memory.

STORED MEMORY:
"{memory.content}"
(Type: {memory.type.value}, Confidence: {memory.confidence:.2f})

CURRENT CONVERSATION:
User: {message}
AI: {response}

Determine if the conversation:
1. SUPPORTS the memory (user confirms or reinforces it)
2. CONTRADICTS the memory (user corrects or denies it)
3. NEUTRAL (no evidence either way)

If CONTRADICTS, also provide the corrected information.

Respond in JSON format:
{{
  "evidence_type": "support|contradict|neutral",
  "reason": "brief explanation",
  "replacement_content": "corrected information if contradicts, otherwise null"
}}"""

            result = await self.client.messages.create(
                model="claude-3-5-haiku-20241022",
                max_tokens=500,
                messages=[{"role": "user", "content": prompt}]
            )

            text = result.content[0].text.strip()

            # Parse JSON response
            import json
            json_match = re.search(r'\{.*\}', text, re.DOTALL)
            if not json_match:
                return EvidenceResult(EvidenceType.NEUTRAL)

            data = json.loads(json_match.group())

            evidence_type_str = data.get("evidence_type", "neutral").lower()
            if evidence_type_str == "support":
                evidence_type = EvidenceType.SUPPORT
                confidence_delta = 0.05
            elif evidence_type_str == "contradict":
                evidence_type = EvidenceType.CONTRADICT
                confidence_delta = -0.15
            else:
                evidence_type = EvidenceType.NEUTRAL
                confidence_delta = 0.0

            return EvidenceResult(
                evidence_type=evidence_type,
                confidence_delta=confidence_delta,
                reason=data.get("reason", ""),
                replacement_content=data.get("replacement_content"),
            )

        except Exception as e:
            logger.warning(f"Evidence detection failed: {e}")
            return EvidenceResult(EvidenceType.NEUTRAL)

    async def detect_evidence_batch(
        self,
        message: str,
        response: str,
        memories: List[Memory]
    ) -> Dict[str, EvidenceResult]:
        """
        Detect evidence for multiple memories at once (more efficient)
        """
        if not memories:
            return {}

        # For small batches, process individually
        if len(memories) <= 3:
            results = {}
            for memory in memories:
                result = await self.detect_evidence(message, response, memory)
                results[memory.memory_id] = result
            return results

        # For larger batches, use batch processing
        try:
            memories_text = "\n".join([
                f"[{i+1}] ({m.type.value}) {m.content}"
                for i, m in enumerate(memories[:10])  # Limit to 10
            ])

            prompt = f"""Analyze if this conversation provides evidence about any of these stored memories.

STORED MEMORIES:
{memories_text}

CURRENT CONVERSATION:
User: {message}
AI: {response}

For each memory that has evidence (support or contradict), respond in JSON:
[
  {{"index": 1, "evidence_type": "support|contradict", "reason": "..."}},
  ...
]

Only include memories with clear evidence. Skip neutral ones."""

            result = await self.client.messages.create(
                model="claude-3-5-haiku-20241022",
                max_tokens=1000,
                messages=[{"role": "user", "content": prompt}]
            )

            text = result.content[0].text.strip()

            import json
            json_match = re.search(r'\[.*\]', text, re.DOTALL)
            if not json_match:
                return {}

            data = json.loads(json_match.group())

            results = {}
            for item in data:
                idx = item.get("index", 0) - 1
                if 0 <= idx < len(memories):
                    memory = memories[idx]
                    evidence_type_str = item.get("evidence_type", "neutral").lower()

                    if evidence_type_str == "support":
                        evidence_type = EvidenceType.SUPPORT
                        confidence_delta = 0.05
                    elif evidence_type_str == "contradict":
                        evidence_type = EvidenceType.CONTRADICT
                        confidence_delta = -0.15
                    else:
                        continue  # Skip neutral

                    results[memory.memory_id] = EvidenceResult(
                        evidence_type=evidence_type,
                        confidence_delta=confidence_delta,
                        reason=item.get("reason", ""),
                    )

            return results

        except Exception as e:
            logger.warning(f"Batch evidence detection failed: {e}")
            return {}

    def apply_evidence(self, memory: Memory, evidence: EvidenceResult) -> Memory:
        """
        Apply evidence to update memory confidence and status
        """
        if evidence.evidence_type == EvidenceType.SUPPORT:
            memory.add_support()
            logger.info(f"Memory supported: {memory.memory_id} -> confidence: {memory.confidence:.2f}")

        elif evidence.evidence_type == EvidenceType.CONTRADICT:
            memory.add_contradiction()
            logger.info(f"Memory contradicted: {memory.memory_id} -> confidence: {memory.confidence:.2f}")

            # Check if should be replaced
            if evidence.replacement_content and memory.confidence < 0.3:
                memory.status = MemoryStatus.REPLACED
                logger.info(f"Memory marked for replacement: {memory.memory_id}")

        return memory

    def should_freeze(self, memory: Memory) -> bool:
        """Check if memory should be frozen (not retrieved)"""
        return memory.confidence < 0.3 or memory.status == MemoryStatus.FROZEN

    def should_downweight(self, memory: Memory) -> bool:
        """Check if memory should be downweighted (reduced usage)"""
        return 0.3 <= memory.confidence < 0.5

    def get_retrieval_probability(self, memory: Memory) -> float:
        """
        Get probability of retrieving this memory
        Used for probabilistic downweighting
        """
        if self.should_freeze(memory):
            return 0.0
        elif self.should_downweight(memory):
            # Linear probability based on confidence
            return memory.confidence
        else:
            return 1.0

    async def check_and_correct(
        self,
        message: str,
        response: str,
        relevant_memories: List[Memory]
    ) -> List[Memory]:
        """
        Check all relevant memories for evidence and apply corrections
        Returns list of modified memories
        """
        if not relevant_memories:
            return []

        modified_memories = []

        # Quick pattern-based correction detection first
        if self._has_correction_signal(message):
            old_value, new_value = self._extract_old_new_values(message)
            logger.info(f"Correction signal detected: old='{old_value}', new='{new_value}'")

            if old_value:
                # Find memories that contain the old value and contradict them
                old_lower = old_value.lower()
                for memory in relevant_memories:
                    if old_lower in memory.content.lower():
                        # Apply strong contradiction
                        evidence = EvidenceResult(
                            evidence_type=EvidenceType.CONTRADICT,
                            confidence_delta=-0.25,  # Strong penalty
                            reason=f"User corrected: changed from {old_value} to {new_value}",
                            replacement_content=new_value,
                        )
                        self.apply_evidence(memory, evidence)
                        modified_memories.append(memory)
                        logger.info(f"Auto-contradicted memory containing '{old_value}': {memory.memory_id}")

        # Then use LLM for more nuanced detection on remaining memories
        uncorrected_memories = [m for m in relevant_memories if m not in modified_memories]
        if uncorrected_memories:
            evidence_results = await self.detect_evidence_batch(
                message, response, uncorrected_memories
            )

            for memory in uncorrected_memories:
                if memory.memory_id in evidence_results:
                    evidence = evidence_results[memory.memory_id]
                    self.apply_evidence(memory, evidence)
                    modified_memories.append(memory)

        return modified_memories

    async def find_contradicting_memories(
        self,
        new_content: str,
        existing_memories: List[Memory]
    ) -> List[Memory]:
        """
        Find existing memories that might contradict new content
        Used during save to detect conflicts
        """
        if not existing_memories:
            return []

        contradicting = []
        new_lower = new_content.lower()

        # Comprehensive tech keyword conflicts
        tech_conflicts = {
            # Frontend frameworks
            "react": ["vue", "angular", "svelte", "solid"],
            "vue": ["react", "angular", "svelte", "solid"],
            "angular": ["react", "vue", "svelte", "solid"],
            "svelte": ["react", "vue", "angular", "solid"],
            # Databases
            "mongodb": ["postgresql", "mysql", "sqlite", "mariadb", "oracle"],
            "postgresql": ["mongodb", "mysql", "sqlite", "mariadb", "oracle"],
            "mysql": ["mongodb", "postgresql", "sqlite", "mariadb", "oracle"],
            "sqlite": ["mongodb", "postgresql", "mysql", "mariadb", "oracle"],
            "redis": ["memcached"],
            # Languages
            "python": ["javascript", "go", "rust", "java", "c#"],
            "javascript": ["python", "go", "rust", "java", "c#"],
            "typescript": ["javascript"],  # TS replaces JS
            "go": ["python", "javascript", "rust", "java"],
            "rust": ["python", "javascript", "go", "java", "c++"],
            # Backend frameworks
            "express": ["fastapi", "django", "flask", "spring"],
            "fastapi": ["express", "django", "flask", "spring"],
            "django": ["express", "fastapi", "flask", "spring"],
            "next.js": ["nuxt", "remix", "gatsby"],
            "nuxt": ["next.js", "remix", "gatsby"],
        }

        for memory in existing_memories:
            mem_lower = memory.content.lower()

            # Check for tech keyword conflicts
            for old_tech, conflicting_techs in tech_conflicts.items():
                if old_tech in mem_lower:
                    for new_tech in conflicting_techs:
                        if new_tech in new_lower:
                            if memory not in contradicting:
                                contradicting.append(memory)
                                logger.info(f"Tech conflict: memory has '{old_tech}', new has '{new_tech}'")
                            break

            # Also check for same-topic different-value conflicts
            # e.g., "database is X" vs "database is Y"
            # Only check when the topic context is the same (e.g., both mention "database" or "frontend")
            topic_context_patterns = [
                # Same context: both mention database
                (r"(?:database|db)\s+(?:is|uses?)\s+(\w+)", r"(?:database|db)\s+(?:is|uses?)\s+(\w+)"),
                # Same context: both mention frontend
                (r"(?:frontend|front-end)\s+(?:is|uses?|framework)\s+(\w+)", r"(?:frontend|front-end)\s+(?:is|uses?|framework)\s+(\w+)"),
                # Same context: both mention backend
                (r"(?:backend|back-end)\s+(?:is|uses?|framework)\s+(\w+)", r"(?:backend|back-end)\s+(?:is|uses?|framework)\s+(\w+)"),
                # Tech stack declarations
                (r"(?:tech\s*stack|stack)\s+(?:is|includes?)\s+(\w+)",
                 r"(?:tech\s*stack|stack)\s+(?:is|includes?)\s+(\w+)"),
            ]

            for mem_pattern, new_pattern in topic_context_patterns:
                mem_match = re.search(mem_pattern, mem_lower)
                new_match = re.search(new_pattern, new_lower)
                if mem_match and new_match:
                    mem_value = mem_match.group(1)
                    new_value = new_match.group(1)
                    if mem_value != new_value and memory not in contradicting:
                        contradicting.append(memory)
                        logger.info(f"Value conflict: memory has '{mem_value}', new has '{new_value}'")

        return contradicting

    async def apply_correction_on_save(
        self,
        new_content: str,
        message: str,
        existing_memories: List[Memory]
    ) -> List[Memory]:
        """
        Apply corrections when saving new memory that contradicts existing ones
        Returns list of memories that were downweighted
        """
        modified = []

        # Check if the message indicates a correction
        if self._has_correction_signal(message):
            old_value, new_value = self._extract_old_new_values(message)
            logger.info(f"Correction during save: old='{old_value}', new='{new_value}'")

            if old_value:
                old_lower = old_value.lower()
                for memory in existing_memories:
                    if old_lower in memory.content.lower():
                        # Strong penalty for explicit corrections
                        memory.add_contradiction()
                        memory.add_contradiction()  # Double penalty
                        modified.append(memory)
                        logger.info(f"Strong downweight on correction: {memory.memory_id}")

        # Also check for implicit contradictions
        contradicting = await self.find_contradicting_memories(new_content, existing_memories)
        for memory in contradicting:
            if memory not in modified:
                memory.add_contradiction()
                modified.append(memory)
                logger.info(f"Downweighted contradicting memory: {memory.memory_id}")

        return modified

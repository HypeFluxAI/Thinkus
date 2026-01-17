"""
Memory Scorer
Extracts memory candidates and scores them using 4-dimension evaluation
"""

import os
import re
import logging
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass

from anthropic import AsyncAnthropic

from .models import MemoryCandidate, MemoryScore, MemoryType

logger = logging.getLogger(__name__)


# Patterns for detecting important information
FACT_PATTERNS = [
    r"(?:my|our)\s+(?:company|startup|business|project)\s+(?:is|called|named)\s+(.+)",
    r"(?:we|i)\s+(?:are|am)\s+(?:building|developing|creating)\s+(.+)",
    r"(?:the|our)\s+(?:tech stack|technology|framework)\s+(?:is|uses)\s+(.+)",
    r"(?:we|i)\s+(?:use|prefer|work with)\s+(.+)",
]

PREFERENCE_PATTERNS = [
    r"(?:i|we)\s+(?:prefer|like|want|need)\s+(.+)",
    r"(?:please|always)\s+(?:use|do|avoid)\s+(.+)",
    r"(?:don't|never)\s+(?:use|do|suggest)\s+(.+)",
]

DECISION_PATTERNS = [
    r"(?:we|i)\s+(?:decided|chose|selected|picked)\s+(.+)",
    r"(?:let's|we'll|i'll)\s+(?:go with|use|implement)\s+(.+)",
    r"(?:the decision|our choice)\s+(?:is|was)\s+(.+)",
]


class MemoryScorer:
    """
    Scores memory candidates using 4-dimension evaluation:
    1. Repeatability - How often this is mentioned
    2. Persistence - How long-lasting is this information
    3. Relevance - How relevant to this user/project
    4. Decision Value - How much will this affect future decisions
    """

    def __init__(self):
        self._client: Optional[AsyncAnthropic] = None
        self._mention_cache: Dict[str, int] = {}  # Track mentions for repeatability

    @property
    def client(self) -> AsyncAnthropic:
        """Lazy initialization of Anthropic client"""
        if self._client is None:
            api_key = os.getenv("ANTHROPIC_API_KEY")
            if not api_key:
                raise ValueError("ANTHROPIC_API_KEY not set")
            self._client = AsyncAnthropic(api_key=api_key)
        return self._client

    async def extract_candidates(
        self,
        message: str,
        response: str,
        project_id: str
    ) -> List[MemoryCandidate]:
        """
        Extract memory candidates from a conversation exchange
        Uses Haiku for fast, cheap extraction
        """
        try:
            prompt = f"""Analyze this conversation and extract any information worth remembering for future conversations.

USER MESSAGE:
{message}

AI RESPONSE:
{response}

Extract memory candidates in JSON format. For each candidate, provide:
- content: The key information to remember (1-2 sentences)
- type: One of "fact", "preference", "experience", "decision"
- keywords: 2-4 keywords for this memory

Only extract information that would be useful in future conversations. Skip:
- Generic greetings or pleasantries
- Temporary or session-specific details
- Information that will likely change soon

Respond with a JSON array:
[{{"content": "...", "type": "...", "keywords": ["...", "..."]}}]

If nothing worth remembering, respond with: []"""

            result = await self.client.messages.create(
                model="claude-3-5-haiku-20241022",
                max_tokens=1000,
                messages=[{"role": "user", "content": prompt}]
            )

            # Parse response
            text = result.content[0].text.strip()

            # Extract JSON array
            json_match = re.search(r'\[.*\]', text, re.DOTALL)
            if not json_match:
                return []

            import json
            candidates_data = json.loads(json_match.group())

            candidates = []
            for item in candidates_data:
                memory_type = MemoryType.FACT
                type_str = item.get("type", "fact").lower()
                if type_str == "preference":
                    memory_type = MemoryType.PREFERENCE
                elif type_str == "experience":
                    memory_type = MemoryType.EXPERIENCE
                elif type_str == "decision":
                    memory_type = MemoryType.DECISION

                candidate = MemoryCandidate(
                    content=item.get("content", ""),
                    keywords=item.get("keywords", []),
                    memory_type=memory_type,
                    source_message=message[:500],
                    source_response=response[:500],
                )
                candidates.append(candidate)

            logger.info(f"Extracted {len(candidates)} memory candidates")
            return candidates

        except Exception as e:
            logger.error(f"Failed to extract memory candidates: {e}")
            # Fallback: use pattern matching
            return self._extract_with_patterns(message, response)

    def _extract_with_patterns(
        self,
        message: str,
        response: str
    ) -> List[MemoryCandidate]:
        """Fallback extraction using regex patterns"""
        candidates = []
        combined = f"{message} {response}"

        # Check fact patterns
        for pattern in FACT_PATTERNS:
            matches = re.findall(pattern, combined, re.IGNORECASE)
            for match in matches:
                candidates.append(MemoryCandidate(
                    content=match.strip()[:200],
                    memory_type=MemoryType.FACT,
                    source_message=message[:500],
                    source_response=response[:500],
                ))

        # Check preference patterns
        for pattern in PREFERENCE_PATTERNS:
            matches = re.findall(pattern, combined, re.IGNORECASE)
            for match in matches:
                candidates.append(MemoryCandidate(
                    content=match.strip()[:200],
                    memory_type=MemoryType.PREFERENCE,
                    source_message=message[:500],
                    source_response=response[:500],
                ))

        # Check decision patterns
        for pattern in DECISION_PATTERNS:
            matches = re.findall(pattern, combined, re.IGNORECASE)
            for match in matches:
                candidates.append(MemoryCandidate(
                    content=match.strip()[:200],
                    memory_type=MemoryType.DECISION,
                    source_message=message[:500],
                    source_response=response[:500],
                ))

        return candidates[:5]  # Limit fallback results

    async def score_candidate(
        self,
        candidate: MemoryCandidate,
        project_id: str,
        existing_memories: List[str] = None
    ) -> MemoryScore:
        """
        Score a memory candidate using 4 dimensions
        """
        existing_memories = existing_memories or []

        # 1. Repeatability - check mention cache
        content_key = candidate.content.lower()[:50]
        self._mention_cache[content_key] = self._mention_cache.get(content_key, 0) + 1
        mention_count = self._mention_cache[content_key]
        repeatability = min(1.0, mention_count * 0.3)  # 3+ mentions = 1.0

        # 2. Persistence - based on memory type
        persistence_map = {
            MemoryType.FACT: 0.8,        # Facts tend to persist
            MemoryType.PREFERENCE: 0.9,   # Preferences are very persistent
            MemoryType.EXPERIENCE: 0.7,   # Experiences are fairly persistent
            MemoryType.DECISION: 0.6,     # Decisions may change
            MemoryType.CONTEXT: 0.3,      # Context is temporary
        }
        persistence = persistence_map.get(candidate.memory_type, 0.5)

        # 3. Relevance - use LLM for nuanced evaluation
        relevance = await self._evaluate_relevance(candidate, existing_memories)

        # 4. Decision Value - use LLM
        decision_value = await self._evaluate_decision_value(candidate)

        score = MemoryScore(
            repeatability=repeatability,
            persistence=persistence,
            relevance=relevance,
            decision_value=decision_value,
        )

        candidate.score = score
        logger.debug(f"Scored candidate: {score.to_dict()}")

        return score

    async def _evaluate_relevance(
        self,
        candidate: MemoryCandidate,
        existing_memories: List[str]
    ) -> float:
        """Evaluate how relevant this memory is to the user/project"""
        try:
            # Check for overlap with existing memories
            if existing_memories:
                for mem in existing_memories[:10]:
                    if self._content_overlap(candidate.content, mem) > 0.5:
                        return 0.3  # Low relevance if duplicate

            # Use keywords to estimate relevance
            important_keywords = [
                "project", "company", "product", "user", "customer",
                "tech", "stack", "framework", "prefer", "always", "never"
            ]

            content_lower = candidate.content.lower()
            keyword_hits = sum(1 for kw in important_keywords if kw in content_lower)
            keyword_score = min(1.0, keyword_hits * 0.15)

            # Type-based relevance boost
            type_boost = {
                MemoryType.PREFERENCE: 0.2,
                MemoryType.FACT: 0.1,
                MemoryType.DECISION: 0.15,
            }
            boost = type_boost.get(candidate.memory_type, 0)

            return min(1.0, keyword_score + boost + 0.3)  # Base of 0.3

        except Exception as e:
            logger.warning(f"Relevance evaluation failed: {e}")
            return 0.5  # Default middle score

    async def _evaluate_decision_value(self, candidate: MemoryCandidate) -> float:
        """Evaluate how much this will affect future decisions"""
        try:
            content_lower = candidate.content.lower()

            # Decision-impacting patterns
            decision_keywords = [
                "use", "prefer", "choose", "avoid", "always", "never",
                "requirement", "must", "should", "need", "want"
            ]

            hits = sum(1 for kw in decision_keywords if kw in content_lower)
            keyword_score = min(1.0, hits * 0.15)

            # Type-based decision value
            type_value = {
                MemoryType.PREFERENCE: 0.8,  # Preferences highly affect decisions
                MemoryType.DECISION: 0.7,     # Past decisions inform future ones
                MemoryType.FACT: 0.5,         # Facts provide context
                MemoryType.EXPERIENCE: 0.6,   # Experience guides choices
            }
            base_value = type_value.get(candidate.memory_type, 0.4)

            return min(1.0, (keyword_score + base_value) / 2 + 0.2)

        except Exception as e:
            logger.warning(f"Decision value evaluation failed: {e}")
            return 0.5

    def _content_overlap(self, content1: str, content2: str) -> float:
        """Calculate content overlap ratio"""
        words1 = set(content1.lower().split())
        words2 = set(content2.lower().split())
        if not words1 or not words2:
            return 0.0
        intersection = words1 & words2
        union = words1 | words2
        return len(intersection) / len(union)

    async def filter_and_score(
        self,
        message: str,
        response: str,
        project_id: str,
        existing_memories: List[str] = None
    ) -> List[MemoryCandidate]:
        """
        Extract candidates, score them, and filter to only high-value ones
        """
        # Extract candidates
        candidates = await self.extract_candidates(message, response, project_id)

        if not candidates:
            return []

        # Score each candidate
        scored_candidates = []
        for candidate in candidates:
            score = await self.score_candidate(candidate, project_id, existing_memories)
            if score.should_write():
                scored_candidates.append(candidate)
                logger.info(f"Candidate passed filter: {candidate.content[:50]}... (score: {score.total:.2f})")
            else:
                logger.debug(f"Candidate filtered out: {candidate.content[:50]}... (score: {score.total:.2f})")

        return scored_candidates

    def clear_mention_cache(self, older_than_hours: int = 24):
        """Clear old entries from mention cache"""
        # Simple clear for now - could add timestamp tracking
        if len(self._mention_cache) > 1000:
            self._mention_cache.clear()

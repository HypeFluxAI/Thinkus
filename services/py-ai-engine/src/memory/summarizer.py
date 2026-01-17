"""
Session Summarizer
Generates summaries at end of sessions/conversations
Extracts key decisions, learnings, and preference changes
"""

import os
import re
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from dataclasses import dataclass

from anthropic import AsyncAnthropic

from .models import Memory, MemoryCandidate, MemoryType, MemoryScore, MemoryTier

logger = logging.getLogger(__name__)


@dataclass
class SessionSummary:
    """Summary of a conversation session"""
    decisions: List[str]
    learnings: List[str]
    preferences: List[str]
    action_items: List[str]
    overall_summary: str


class SessionSummarizer:
    """
    Summarizes conversation sessions and extracts memorable information
    """

    def __init__(self):
        self._client: Optional[AsyncAnthropic] = None

    @property
    def client(self) -> AsyncAnthropic:
        """Lazy initialization of Anthropic client"""
        if self._client is None:
            api_key = os.getenv("ANTHROPIC_API_KEY")
            if not api_key:
                raise ValueError("ANTHROPIC_API_KEY not set")
            self._client = AsyncAnthropic(api_key=api_key)
        return self._client

    async def summarize_session(
        self,
        messages: List[Dict[str, str]],
        project_id: str
    ) -> SessionSummary:
        """
        Generate a summary of a conversation session
        """
        if not messages:
            return SessionSummary(
                decisions=[],
                learnings=[],
                preferences=[],
                action_items=[],
                overall_summary=""
            )

        # Format conversation for summary
        conversation_text = self._format_conversation(messages)

        try:
            prompt = f"""Analyze this conversation and extract key information for future reference.

CONVERSATION:
{conversation_text}

Extract the following in JSON format:
{{
  "decisions": ["list of key decisions made"],
  "learnings": ["list of new facts/information learned about the user or project"],
  "preferences": ["list of user preferences expressed or implied"],
  "action_items": ["list of next steps or tasks mentioned"],
  "overall_summary": "brief 1-2 sentence summary of the conversation"
}}

Focus on information that would be valuable in future conversations.
Skip generic pleasantries or temporary details."""

            result = await self.client.messages.create(
                model="claude-3-5-haiku-20241022",
                max_tokens=1000,
                messages=[{"role": "user", "content": prompt}]
            )

            text = result.content[0].text.strip()

            # Parse JSON response
            import json
            json_match = re.search(r'\{.*\}', text, re.DOTALL)
            if not json_match:
                return SessionSummary(
                    decisions=[],
                    learnings=[],
                    preferences=[],
                    action_items=[],
                    overall_summary=""
                )

            data = json.loads(json_match.group())

            return SessionSummary(
                decisions=data.get("decisions", []),
                learnings=data.get("learnings", []),
                preferences=data.get("preferences", []),
                action_items=data.get("action_items", []),
                overall_summary=data.get("overall_summary", ""),
            )

        except Exception as e:
            logger.error(f"Session summarization failed: {e}")
            return SessionSummary(
                decisions=[],
                learnings=[],
                preferences=[],
                action_items=[],
                overall_summary=""
            )

    def _format_conversation(self, messages: List[Dict[str, str]]) -> str:
        """Format messages for summarization"""
        lines = []
        for msg in messages[-20:]:  # Limit to last 20 messages
            role = msg.get("role", "user").upper()
            content = msg.get("content", "")[:500]  # Truncate long messages
            lines.append(f"{role}: {content}")
        return "\n\n".join(lines)

    async def extract_memories_from_summary(
        self,
        summary: SessionSummary,
        project_id: str,
        user_id: str
    ) -> List[MemoryCandidate]:
        """
        Convert session summary into memory candidates
        """
        candidates = []

        # Decisions become decision memories
        for decision in summary.decisions:
            candidates.append(MemoryCandidate(
                content=decision,
                summary=decision[:100],
                keywords=self._extract_keywords(decision),
                memory_type=MemoryType.DECISION,
            ))

        # Learnings become fact memories
        for learning in summary.learnings:
            candidates.append(MemoryCandidate(
                content=learning,
                summary=learning[:100],
                keywords=self._extract_keywords(learning),
                memory_type=MemoryType.FACT,
            ))

        # Preferences become preference memories (high priority)
        for preference in summary.preferences:
            candidate = MemoryCandidate(
                content=preference,
                summary=preference[:100],
                keywords=self._extract_keywords(preference),
                memory_type=MemoryType.PREFERENCE,
            )
            # Pre-score preferences as high value
            candidate.score = MemoryScore(
                repeatability=0.5,
                persistence=0.9,
                relevance=0.8,
                decision_value=0.8,
            )
            candidates.append(candidate)

        logger.info(f"Extracted {len(candidates)} memory candidates from session summary")
        return candidates

    def _extract_keywords(self, text: str) -> List[str]:
        """Extract keywords from text"""
        # Simple keyword extraction
        import re

        # Remove common words
        stop_words = {
            'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
            'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
            'would', 'could', 'should', 'may', 'might', 'must', 'can',
            'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
            'as', 'into', 'through', 'during', 'before', 'after', 'above',
            'below', 'between', 'under', 'again', 'further', 'then', 'once',
            'and', 'but', 'or', 'nor', 'so', 'yet', 'both', 'either',
            'neither', 'not', 'only', 'own', 'same', 'than', 'too', 'very',
            'just', 'also', 'now', 'here', 'there', 'when', 'where', 'why',
            'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
            'other', 'some', 'such', 'no', 'any', 'only', 'same', 'that',
            'this', 'these', 'those', 'what', 'which', 'who', 'whom',
            'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him',
            'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their',
            'user', 'prefers', 'wants', 'uses', 'like', 'need', 'want',
        }

        # Extract words
        words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())

        # Filter and count
        keywords = [w for w in words if w not in stop_words]

        # Return unique keywords (up to 5)
        seen = set()
        unique = []
        for kw in keywords:
            if kw not in seen:
                seen.add(kw)
                unique.append(kw)
                if len(unique) >= 5:
                    break

        return unique

    async def should_summarize(
        self,
        messages: List[Dict[str, str]],
        last_summary_at: Optional[datetime] = None
    ) -> bool:
        """
        Determine if session should be summarized
        """
        # Summarize if:
        # 1. At least 5 messages
        if len(messages) < 5:
            return False

        # 2. At least 30 minutes since last summary (if any)
        if last_summary_at:
            minutes_since = (datetime.utcnow() - last_summary_at).total_seconds() / 60
            if minutes_since < 30:
                return False

        return True

    async def incremental_summarize(
        self,
        new_messages: List[Dict[str, str]],
        existing_summary: Optional[str] = None,
        project_id: str = ""
    ) -> str:
        """
        Incrementally update an existing summary with new messages
        More efficient than full re-summarization
        """
        if not new_messages:
            return existing_summary or ""

        conversation_text = self._format_conversation(new_messages)

        try:
            prompt = f"""Update this conversation summary with new information.

EXISTING SUMMARY:
{existing_summary or "(No previous summary)"}

NEW MESSAGES:
{conversation_text}

Provide an updated summary that:
1. Incorporates new information
2. Removes outdated information if contradicted
3. Stays concise (2-3 sentences max)

Respond with just the updated summary."""

            result = await self.client.messages.create(
                model="claude-3-5-haiku-20241022",
                max_tokens=200,
                messages=[{"role": "user", "content": prompt}]
            )

            return result.content[0].text.strip()

        except Exception as e:
            logger.error(f"Incremental summarization failed: {e}")
            return existing_summary or ""

"""
Experience Service
Manages the experience library with vector search
"""
import json
import re
from datetime import datetime
from typing import Optional
from bson import ObjectId

from src.utils.claude import chat, get_sonnet_model
from src.utils.mongodb import get_collection
from src.utils.pinecone_client import (
    generate_embedding,
    search_vectors,
    upsert_vectors,
)


class ExperienceService:
    """Manage experience library with vector search"""

    async def match(
        self,
        query: str,
        category: str = "",
        complexity: str = "",
        limit: int = 10,
    ) -> list[dict]:
        """
        Match experiences based on query

        Args:
            query: Search query
            category: Filter by category
            complexity: Filter by complexity
            limit: Maximum results

        Returns:
            List of matching experiences with relevance scores
        """
        try:
            # Generate embedding for query
            query_embedding = await generate_embedding(query)

            # Build filter
            metadata_filter = {}
            if category:
                metadata_filter["category"] = category
            if complexity:
                metadata_filter["complexity"] = complexity

            # Search vectors
            matches = await search_vectors(
                query_embedding=query_embedding,
                namespace="experiences",
                top_k=limit,
                filter=metadata_filter if metadata_filter else None,
            )

            # Get full experience data from MongoDB
            experiences = []
            collection = get_collection("experiences", sync=True)

            for match in matches:
                exp_id = match.get("id", "")
                if exp_id:
                    try:
                        exp = collection.find_one({"_id": ObjectId(exp_id)})
                        if exp:
                            experiences.append({
                                "id": str(exp["_id"]),
                                "type": exp.get("type", ""),
                                "category": exp.get("category", ""),
                                "title": exp.get("title", ""),
                                "description": exp.get("description", ""),
                                "complexity": exp.get("complexity", ""),
                                "relevance_score": match.get("score", 0),
                            })
                    except Exception:
                        pass

            return experiences
        except Exception as e:
            print(f"Experience match error: {e}")
            # Fallback to MongoDB text search
            return await self._mongodb_fallback_search(query, category, complexity, limit)

    async def add(
        self,
        user_id: str,
        project_id: str,
        exp_type: str,
        category: str,
        title: str,
        description: str,
        content: str,
        code_files: list[dict],
    ) -> dict:
        """
        Add a new experience

        Args:
            user_id: User ID
            project_id: Project ID
            exp_type: Experience type
            category: Category
            title: Title
            description: Description
            content: Full content
            code_files: List of code files

        Returns:
            Created experience
        """
        try:
            collection = get_collection("experiences", sync=True)

            # Create experience document
            experience = {
                "userId": ObjectId(user_id),
                "projectId": ObjectId(project_id) if project_id else None,
                "type": exp_type,
                "category": category,
                "title": title,
                "description": description,
                "content": content,
                "codeFiles": code_files,
                "complexity": await self._estimate_complexity(content, code_files),
                "rating": 0,
                "usageCount": 0,
                "createdAt": datetime.utcnow(),
                "updatedAt": datetime.utcnow(),
            }

            # Insert to MongoDB
            result = collection.insert_one(experience)
            experience["_id"] = result.inserted_id

            # Generate embedding and add to Pinecone
            embedding_text = f"{title} {description} {content[:2000]}"
            embedding = await generate_embedding(embedding_text)

            await upsert_vectors(
                vectors=[{
                    "id": str(result.inserted_id),
                    "values": embedding,
                    "metadata": {
                        "type": exp_type,
                        "category": category,
                        "complexity": experience["complexity"],
                        "userId": user_id,
                    },
                }],
                namespace="experiences",
            )

            return {
                "id": str(experience["_id"]),
                "type": exp_type,
                "category": category,
                "title": title,
                "description": description,
                "complexity": experience["complexity"],
            }
        except Exception as e:
            print(f"Add experience error: {e}")
            raise

    async def _estimate_complexity(
        self, content: str, code_files: list[dict]
    ) -> str:
        """Estimate experience complexity"""
        # Simple heuristic
        total_lines = sum(
            len(cf.get("content", "").split("\n"))
            for cf in code_files
        )

        if total_lines > 1000:
            return "L5"
        elif total_lines > 500:
            return "L4"
        elif total_lines > 200:
            return "L3"
        elif total_lines > 50:
            return "L2"
        else:
            return "L1"

    async def _mongodb_fallback_search(
        self,
        query: str,
        category: str,
        complexity: str,
        limit: int,
    ) -> list[dict]:
        """Fallback search using MongoDB text search"""
        try:
            collection = get_collection("experiences", sync=True)

            filter_query = {}
            if category:
                filter_query["category"] = category
            if complexity:
                filter_query["complexity"] = complexity

            # Simple regex search on title and description
            if query:
                filter_query["$or"] = [
                    {"title": {"$regex": query, "$options": "i"}},
                    {"description": {"$regex": query, "$options": "i"}},
                ]

            cursor = collection.find(filter_query).limit(limit)
            experiences = []

            for exp in cursor:
                experiences.append({
                    "id": str(exp["_id"]),
                    "type": exp.get("type", ""),
                    "category": exp.get("category", ""),
                    "title": exp.get("title", ""),
                    "description": exp.get("description", ""),
                    "complexity": exp.get("complexity", ""),
                    "relevance_score": 0.5,  # Default score
                })

            return experiences
        except Exception as e:
            print(f"MongoDB fallback search error: {e}")
            return []

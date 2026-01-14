"""
Pinecone vector database client
"""
from typing import List, Optional

import openai
from pinecone import Pinecone

from src.utils.config import settings

# Initialize clients
_pinecone: Optional[Pinecone] = None
_index = None
_openai_client: Optional[openai.OpenAI] = None


def get_pinecone():
    """Get Pinecone client"""
    global _pinecone, _index
    if _pinecone is None:
        _pinecone = Pinecone(api_key=settings.pinecone_api_key)
        _index = _pinecone.Index(settings.pinecone_index_name)
    return _index


def get_openai():
    """Get OpenAI client"""
    global _openai_client
    if _openai_client is None:
        _openai_client = openai.OpenAI(api_key=settings.openai_api_key)
    return _openai_client


async def generate_embedding(text: str) -> List[float]:
    """
    Generate embedding for text using OpenAI

    Args:
        text: Text to embed

    Returns:
        Embedding vector (1536 dimensions)
    """
    client = get_openai()
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text,
    )
    return response.data[0].embedding


async def search_vectors(
    query_embedding: List[float],
    namespace: str,
    top_k: int = 10,
    filter: Optional[dict] = None,
) -> List[dict]:
    """
    Search for similar vectors in Pinecone

    Args:
        query_embedding: Query vector
        namespace: Pinecone namespace
        top_k: Number of results
        filter: Metadata filter

    Returns:
        List of matches with id, score, metadata
    """
    index = get_pinecone()
    results = index.query(
        vector=query_embedding,
        namespace=namespace,
        top_k=top_k,
        filter=filter,
        include_metadata=True,
    )

    return [
        {
            "id": match.id,
            "score": match.score,
            "metadata": match.metadata,
        }
        for match in results.matches
    ]


async def upsert_vectors(
    vectors: List[dict],
    namespace: str,
) -> int:
    """
    Upsert vectors to Pinecone

    Args:
        vectors: List of dicts with 'id', 'values', 'metadata'
        namespace: Pinecone namespace

    Returns:
        Number of vectors upserted
    """
    index = get_pinecone()
    index.upsert(vectors=vectors, namespace=namespace)
    return len(vectors)


async def delete_vectors(
    ids: List[str],
    namespace: str,
) -> None:
    """
    Delete vectors from Pinecone

    Args:
        ids: Vector IDs to delete
        namespace: Pinecone namespace
    """
    index = get_pinecone()
    index.delete(ids=ids, namespace=namespace)

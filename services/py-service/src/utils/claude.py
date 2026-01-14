"""
Claude API wrapper
"""
import base64
from typing import Optional

import anthropic

from src.utils.config import settings

# Initialize client
client = anthropic.Anthropic(api_key=settings.anthropic_api_key)


# Model constants
HAIKU_MODEL = "claude-3-5-haiku-20241022"
SONNET_MODEL = "claude-sonnet-4-20250514"
OPUS_MODEL = "claude-opus-4-20250514"


async def chat(
    messages: list[dict],
    system: str = "",
    model: str = SONNET_MODEL,
    max_tokens: int = 2000,
    temperature: float = 0.7,
) -> str:
    """
    Send a chat message to Claude

    Args:
        messages: List of message dicts with 'role' and 'content'
        system: System prompt
        model: Model to use
        max_tokens: Maximum tokens in response
        temperature: Sampling temperature

    Returns:
        Response text
    """
    try:
        response = client.messages.create(
            model=model,
            max_tokens=max_tokens,
            system=system,
            messages=messages,
            temperature=temperature,
        )

        # Extract text from response
        for block in response.content:
            if block.type == "text":
                return block.text

        return ""
    except Exception as e:
        print(f"Claude API error: {e}")
        raise


async def vision(
    image_data: bytes,
    mime_type: str,
    prompt: str,
    model: str = SONNET_MODEL,
    max_tokens: int = 2000,
) -> str:
    """
    Send an image to Claude for vision analysis

    Args:
        image_data: Raw image bytes
        mime_type: Image MIME type (e.g., 'image/png')
        prompt: Text prompt for analysis
        model: Model to use
        max_tokens: Maximum tokens in response

    Returns:
        Response text
    """
    try:
        # Encode image to base64
        image_base64 = base64.b64encode(image_data).decode("utf-8")

        response = client.messages.create(
            model=model,
            max_tokens=max_tokens,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": mime_type,
                                "data": image_base64,
                            },
                        },
                        {
                            "type": "text",
                            "text": prompt,
                        },
                    ],
                }
            ],
        )

        # Extract text from response
        for block in response.content:
            if block.type == "text":
                return block.text

        return ""
    except Exception as e:
        print(f"Claude Vision API error: {e}")
        raise


def get_haiku_model() -> str:
    """Get Haiku model ID"""
    return HAIKU_MODEL


def get_sonnet_model() -> str:
    """Get Sonnet model ID"""
    return SONNET_MODEL


def get_opus_model() -> str:
    """Get Opus model ID"""
    return OPUS_MODEL

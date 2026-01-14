"""
Pytest configuration and fixtures
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


@pytest.fixture
def mock_claude():
    """Mock Claude API responses"""
    # Patch where the functions are imported, not where they're defined
    with patch('src.services.document_processor.chat') as mock_chat_dp, \
         patch('src.services.document_processor.vision') as mock_vision_dp, \
         patch('src.services.growth_advisor.chat') as mock_chat_ga, \
         patch('src.services.requirement_integrator.chat') as mock_chat_ri, \
         patch('src.services.experience_service.chat') as mock_chat_es:

        # Set default return values
        default_response = '{"content_type": "requirement", "summary": "Test summary", "features": [], "ui_elements": [], "data_fields": [], "references": []}'

        mock_chat_dp.return_value = default_response
        mock_chat_ga.return_value = default_response
        mock_chat_ri.return_value = default_response
        mock_chat_es.return_value = default_response
        mock_vision_dp.return_value = "Image analysis result"

        yield {
            'chat': mock_chat_ri,  # Primary mock for most tests
            'chat_dp': mock_chat_dp,
            'chat_ga': mock_chat_ga,
            'chat_ri': mock_chat_ri,
            'chat_es': mock_chat_es,
            'vision': mock_vision_dp
        }


@pytest.fixture
def mock_mongodb():
    """Mock MongoDB connections"""
    with patch('src.utils.mongodb.get_async_db') as mock_async, \
         patch('src.utils.mongodb.get_sync_db') as mock_sync, \
         patch('src.services.experience_service.get_collection') as mock_get_coll:
        mock_async.return_value = MagicMock()
        mock_sync.return_value = MagicMock()
        mock_get_coll.return_value = MagicMock()
        yield {
            'async_db': mock_async,
            'sync_db': mock_sync,
            'get_collection': mock_get_coll
        }


@pytest.fixture
def mock_pinecone():
    """Mock Pinecone connections"""
    with patch('src.utils.pinecone_client.get_pinecone') as mock_pinecone_fn, \
         patch('src.utils.pinecone_client.get_openai') as mock_openai_fn, \
         patch('src.services.experience_service.generate_embedding') as mock_embed, \
         patch('src.services.experience_service.search_vectors') as mock_search, \
         patch('src.services.experience_service.upsert_vectors') as mock_upsert:

        mock_pinecone_fn.return_value = MagicMock()
        mock_openai_fn.return_value = MagicMock()
        mock_embed.return_value = [0.1] * 1536  # Mock embedding
        mock_search.return_value = []
        mock_upsert.return_value = 1

        yield {
            'pinecone': mock_pinecone_fn,
            'openai': mock_openai_fn,
            'generate_embedding': mock_embed,
            'search_vectors': mock_search,
            'upsert_vectors': mock_upsert
        }


@pytest.fixture
def sample_pdf_content():
    """Sample PDF content for testing"""
    # Minimal valid PDF
    return b'%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF'


@pytest.fixture
def sample_text_file():
    """Sample text file for testing"""
    return {
        'name': 'requirements.txt',
        'content': b'This is a test requirement document.\n\nFeature 1: User login\nFeature 2: Dashboard\n',
        'mime_type': 'text/plain'
    }


@pytest.fixture
def sample_image_file():
    """Sample image file info for testing"""
    return {
        'name': 'design.png',
        'content': b'\x89PNG\r\n\x1a\n',  # PNG header
        'mime_type': 'image/png'
    }

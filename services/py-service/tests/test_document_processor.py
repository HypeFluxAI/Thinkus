"""
Tests for Document Processor Service
"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
import json

from src.services.document_processor import DocumentProcessor, FILE_TYPE_MAP


class TestDocumentProcessor:
    """Test suite for DocumentProcessor"""

    @pytest.fixture
    def processor(self):
        return DocumentProcessor()

    # File type detection tests
    def test_detect_file_type_from_mime(self, processor):
        """Test file type detection from MIME type"""
        assert processor._detect_file_type("test.pdf", "application/pdf") == "pdf"
        assert processor._detect_file_type("test.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document") == "docx"
        assert processor._detect_file_type("test.png", "image/png") == "image"
        assert processor._detect_file_type("test.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") == "xlsx"

    def test_detect_file_type_from_extension(self, processor):
        """Test file type detection from file extension"""
        assert processor._detect_file_type("document.pdf", "") == "pdf"
        assert processor._detect_file_type("document.docx", "") == "docx"
        assert processor._detect_file_type("image.jpg", "") == "image"
        assert processor._detect_file_type("image.jpeg", "") == "image"
        assert processor._detect_file_type("data.csv", "") == "csv"
        assert processor._detect_file_type("readme.md", "") == "markdown"
        assert processor._detect_file_type("notes.txt", "") == "text"

    def test_detect_file_type_unknown(self, processor):
        """Test unknown file type detection"""
        assert processor._detect_file_type("file.xyz", "") == "unknown"
        assert processor._detect_file_type("noextension", "") == "unknown"

    # Content extraction tests
    @pytest.mark.asyncio
    async def test_extract_text_content(self, processor):
        """Test text file content extraction"""
        content = b"Hello, this is test content."
        result = await processor._extract_content(content, "text", "text/plain")
        assert result == "Hello, this is test content."

    @pytest.mark.asyncio
    async def test_extract_markdown_content(self, processor):
        """Test markdown file content extraction"""
        content = b"# Title\n\n- Item 1\n- Item 2"
        result = await processor._extract_content(content, "markdown", "text/markdown")
        assert "# Title" in result
        assert "Item 1" in result

    @pytest.mark.asyncio
    async def test_extract_csv_content(self, processor):
        """Test CSV file content extraction"""
        content = b"name,value\ntest1,100\ntest2,200"
        result = await processor._extract_content(content, "csv", "text/csv")
        assert "name" in result
        assert "test1" in result

    # Process file tests
    @pytest.mark.asyncio
    async def test_process_text_file(self, processor, mock_claude, sample_text_file):
        """Test processing a text file"""
        result = await processor.process_file(sample_text_file)

        assert result['file_name'] == 'requirements.txt'
        assert result['file_type'] == 'text'
        assert 'raw_content' in result
        assert 'structured' in result

    @pytest.mark.asyncio
    async def test_process_files_multiple(self, processor, mock_claude):
        """Test processing multiple files"""
        files = [
            {'name': 'file1.txt', 'content': b'Content 1', 'mime_type': 'text/plain'},
            {'name': 'file2.txt', 'content': b'Content 2', 'mime_type': 'text/plain'},
        ]

        results = await processor.process_files(files, 'user123')

        assert len(results) == 2
        assert results[0]['file_name'] == 'file1.txt'
        assert results[1]['file_name'] == 'file2.txt'

    @pytest.mark.asyncio
    async def test_process_file_error_handling(self, processor, mock_claude):
        """Test error handling during file processing"""
        # File with invalid content that might cause errors
        file = {'name': 'bad.pdf', 'content': b'invalid pdf content', 'mime_type': 'application/pdf'}

        result = await processor.process_file(file)

        assert result['file_name'] == 'bad.pdf'
        assert 'raw_content' in result or 'error' in result

    # URL processing tests
    @pytest.mark.asyncio
    async def test_process_url_success(self, processor, mock_claude):
        """Test URL processing with mocked HTTP response"""
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = MagicMock()
            mock_response.text = '<html><body><h1>Test Page</h1><p>Content</p></body></html>'
            mock_response.headers = {'content-type': 'text/html'}
            mock_response.raise_for_status = MagicMock()

            mock_client_instance = AsyncMock()
            mock_client_instance.get.return_value = mock_response
            mock_client_instance.__aenter__.return_value = mock_client_instance
            mock_client_instance.__aexit__.return_value = None
            mock_client.return_value = mock_client_instance

            result = await processor.process_url('https://example.com', 'user123')

            assert result['file_type'] == 'url'
            assert 'raw_content' in result

    @pytest.mark.asyncio
    async def test_process_url_error(self, processor, mock_claude):
        """Test URL processing error handling"""
        with patch('httpx.AsyncClient') as mock_client:
            mock_client_instance = AsyncMock()
            mock_client_instance.get.side_effect = Exception("Connection error")
            mock_client_instance.__aenter__.return_value = mock_client_instance
            mock_client_instance.__aexit__.return_value = None
            mock_client.return_value = mock_client_instance

            result = await processor.process_url('https://invalid-url.com', 'user123')

            assert 'error' in result
            assert 'Connection error' in result['error']

    # AI understanding tests
    @pytest.mark.asyncio
    async def test_understand_content_empty(self, processor):
        """Test AI understanding with empty content"""
        result = await processor._understand_content("", "text", "test.txt")

        assert result['content_type'] == 'unknown'
        assert result['features'] == []

    @pytest.mark.asyncio
    async def test_understand_content_with_ai(self, processor, mock_claude):
        """Test AI understanding with valid content"""
        content = "This is a product requirement for user authentication."
        result = await processor._understand_content(content, "text", "requirements.txt")

        assert 'content_type' in result
        assert 'summary' in result


class TestFileTypeMap:
    """Test the FILE_TYPE_MAP constant"""

    def test_common_mime_types(self):
        """Test common MIME types are mapped"""
        assert FILE_TYPE_MAP["application/pdf"] == "pdf"
        assert FILE_TYPE_MAP["image/png"] == "image"
        assert FILE_TYPE_MAP["image/jpeg"] == "image"
        assert FILE_TYPE_MAP["text/plain"] == "text"
        assert FILE_TYPE_MAP["text/csv"] == "csv"

    def test_office_mime_types(self):
        """Test Office document MIME types"""
        assert FILE_TYPE_MAP["application/vnd.openxmlformats-officedocument.wordprocessingml.document"] == "docx"
        assert FILE_TYPE_MAP["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"] == "xlsx"

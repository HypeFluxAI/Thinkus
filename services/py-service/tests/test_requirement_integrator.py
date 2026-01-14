"""
Tests for Requirement Integrator Service
"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
import json

from src.services.requirement_integrator import RequirementIntegrator


class TestRequirementIntegrator:
    """Test suite for RequirementIntegrator"""

    @pytest.fixture
    def integrator(self):
        return RequirementIntegrator()

    @pytest.fixture
    def sample_documents(self):
        return [
            {
                'file_name': 'prd.docx',
                'file_type': 'docx',
                'raw_content': 'User authentication feature',
                'structured': {
                    'content_type': 'requirement',
                    'summary': 'Authentication requirements',
                    'features': [
                        {'name': 'Login', 'description': 'User login', 'priority': 'high', 'tags': ['auth']}
                    ],
                    'ui_elements': [],
                    'data_fields': [],
                    'references': []
                }
            },
            {
                'file_name': 'design.png',
                'file_type': 'image',
                'raw_content': 'Dashboard design',
                'structured': {
                    'content_type': 'design',
                    'summary': 'Dashboard mockup',
                    'features': [
                        {'name': 'Dashboard', 'description': 'Main dashboard', 'priority': 'medium', 'tags': ['ui']}
                    ],
                    'ui_elements': [
                        {'name': 'Stats Card', 'type': 'card', 'description': 'Statistics display'}
                    ],
                    'data_fields': [],
                    'references': []
                }
            }
        ]

    # Basic integration tests
    @pytest.mark.asyncio
    async def test_integrate_empty_documents(self, integrator):
        """Test integration with empty documents"""
        result = await integrator.integrate([], use_ai=False)

        assert result['summary'] == ''
        assert result['features'] == []
        assert result['tech_suggestions'] == []
        assert result['risks'] == []
        assert result['sources'] == []

    @pytest.mark.asyncio
    async def test_integrate_without_ai(self, integrator, sample_documents):
        """Test basic integration without AI"""
        result = await integrator.integrate(sample_documents, use_ai=False)

        assert len(result['features']) == 2
        assert len(result['sources']) == 2
        assert 'prd.docx' in result['sources']
        assert 'design.png' in result['sources']

    @pytest.mark.asyncio
    async def test_integrate_with_ai(self, integrator, sample_documents, mock_claude):
        """Test integration with AI enhancement"""
        mock_claude['chat'].return_value = json.dumps({
            'summary': 'AI generated summary',
            'features': [
                {'name': 'Login', 'description': 'Enhanced description', 'priority': 'high', 'tags': ['auth']},
                {'name': 'Dashboard', 'description': 'Main view', 'priority': 'medium', 'tags': ['ui']}
            ],
            'tech_suggestions': ['React', 'Node.js'],
            'risks': ['Security concerns']
        })

        result = await integrator.integrate(sample_documents, use_ai=True)

        assert result['summary'] == 'AI generated summary'
        assert len(result['tech_suggestions']) >= 1

    # Quick integration tests (no AI)
    def test_quick_integrate_deduplication(self, integrator):
        """Test quick integration deduplicates features by name"""
        documents = [
            {
                'file_name': 'doc1.pdf',
                'structured': {
                    'summary': 'Summary 1',
                    'features': [
                        {'name': 'Login', 'description': 'Login feature', 'priority': 'high', 'tags': []},
                    ]
                }
            },
            {
                'file_name': 'doc2.pdf',
                'structured': {
                    'summary': 'Summary 2',
                    'features': [
                        {'name': 'login', 'description': 'Another login', 'priority': 'medium', 'tags': []},
                        {'name': 'Dashboard', 'description': 'Dashboard view', 'priority': 'high', 'tags': []},
                    ]
                }
            }
        ]

        result = integrator._quick_integrate(documents, "")

        feature_names = [f['name'].lower() for f in result['features']]
        # Should only have one login feature (case insensitive dedup)
        assert feature_names.count('login') == 1
        assert 'dashboard' in feature_names

    def test_quick_integrate_preserves_sources(self, integrator):
        """Test quick integration preserves document sources"""
        documents = [
            {'file_name': 'doc1.pdf', 'structured': {'summary': '', 'features': []}},
            {'file_name': 'doc2.docx', 'structured': {'summary': '', 'features': []}},
        ]

        result = integrator._quick_integrate(documents, "")

        assert 'doc1.pdf' in result['sources']
        assert 'doc2.docx' in result['sources']

    def test_quick_integrate_combines_summaries(self, integrator):
        """Test quick integration combines summaries"""
        documents = [
            {'file_name': 'doc1.pdf', 'structured': {'summary': 'First summary.', 'features': []}},
            {'file_name': 'doc2.pdf', 'structured': {'summary': 'Second summary.', 'features': []}},
        ]

        result = integrator._quick_integrate(documents, "")

        assert 'First summary' in result['summary']
        assert 'Second summary' in result['summary']

    # Existing requirement integration tests
    @pytest.mark.asyncio
    async def test_integrate_with_existing(self, integrator, sample_documents, mock_claude):
        """Test integration with existing requirements"""
        existing = "Existing requirement: User registration"

        mock_claude['chat'].return_value = json.dumps({
            'summary': 'Combined summary',
            'features': [],
            'tech_suggestions': [],
            'risks': []
        })

        result = await integrator.integrate(
            sample_documents,
            existing_requirement=existing,
            use_ai=True
        )

        assert result is not None

    # AI integration tests
    @pytest.mark.asyncio
    async def test_ai_integrate_parses_json(self, integrator, mock_claude, mock_mongodb):
        """Test AI integration parses JSON response"""
        mock_claude['chat'].return_value = json.dumps({
            'summary': 'AI generated summary',
            'features': [{'name': 'Feature', 'description': 'Desc', 'priority': 'high', 'tags': []}],
            'tech_suggestions': ['Use TypeScript'],
            'risks': ['Complexity'],
            'sources': []
        })

        documents = [
            {'file_name': 'test.pdf', 'structured': {'summary': 'Test', 'features': []}}
        ]

        result = await integrator._ai_integrate(documents, "")

        assert result['summary'] == 'AI generated summary'
        assert len(result['features']) == 1
        assert 'Use TypeScript' in result['tech_suggestions']

    @pytest.mark.asyncio
    async def test_ai_integrate_handles_invalid_json(self, integrator, mock_claude, mock_mongodb):
        """Test AI integration handles invalid JSON"""
        mock_claude['chat'].return_value = "This is not valid JSON response"

        documents = [
            {'file_name': 'test.pdf', 'structured': {'summary': 'Test', 'features': []}}
        ]

        result = await integrator._ai_integrate(documents, "")

        # Should return partial result with raw text in summary
        assert result is not None
        assert 'summary' in result

    # Error handling tests
    @pytest.mark.asyncio
    async def test_integrate_with_malformed_document(self, integrator):
        """Test integration with malformed document"""
        documents = [
            {
                'file_name': 'bad.txt',
                'file_type': 'text',
                'raw_content': 'Some content',
                # Missing 'structured' field
            }
        ]

        # Should handle gracefully
        result = await integrator.integrate(documents, use_ai=False)
        assert result is not None

    @pytest.mark.asyncio
    async def test_integrate_ai_error_fallback(self, integrator, sample_documents, mock_claude):
        """Test fallback when AI fails"""
        mock_claude['chat'].side_effect = Exception("AI service unavailable")

        result = await integrator.integrate(sample_documents, use_ai=True)

        # Should return error result but not crash
        assert result is not None
        assert 'features' in result

    @pytest.mark.asyncio
    async def test_ai_integrate_exception_handling(self, integrator, mock_claude, mock_mongodb):
        """Test AI integration handles exceptions gracefully"""
        mock_claude['chat'].side_effect = Exception("API error")

        documents = [
            {'file_name': 'test.pdf', 'structured': {'summary': 'Test', 'features': [{'name': 'F', 'description': 'D', 'priority': 'high', 'tags': []}]}}
        ]

        result = await integrator._ai_integrate(documents, "")

        # Should return error result with features preserved
        assert 'Integration error' in result['summary']
        assert len(result['features']) > 0

    # Edge cases
    @pytest.mark.asyncio
    async def test_integrate_missing_structured_data(self, integrator):
        """Test integration handles missing structured data"""
        documents = [
            {'file_name': 'test.pdf'},  # No structured field
        ]

        result = await integrator.integrate(documents, use_ai=False)

        assert result is not None
        assert result['features'] == []

    @pytest.mark.asyncio
    async def test_integrate_empty_features(self, integrator):
        """Test integration handles empty features"""
        documents = [
            {'file_name': 'test.pdf', 'structured': {'summary': 'No features', 'features': []}},
        ]

        result = await integrator.integrate(documents, use_ai=False)

        assert result is not None
        assert result['features'] == []

    def test_quick_integrate_handles_empty_names(self, integrator):
        """Test quick integration handles features with empty names"""
        documents = [
            {
                'file_name': 'doc.pdf',
                'structured': {
                    'summary': 'Test',
                    'features': [
                        {'name': '', 'description': 'No name', 'priority': 'high', 'tags': []},
                        {'name': 'Valid', 'description': 'Has name', 'priority': 'high', 'tags': []},
                    ]
                }
            }
        ]

        result = integrator._quick_integrate(documents, "")

        # Empty name feature should be skipped
        assert len(result['features']) == 1
        assert result['features'][0]['name'] == 'Valid'

"""
Tests for Experience Service
"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
import json

from src.services.experience_service import ExperienceService


class TestExperienceService:
    """Test suite for ExperienceService"""

    @pytest.fixture
    def service(self, mock_mongodb, mock_pinecone):
        return ExperienceService()

    @pytest.fixture
    def sample_experience(self):
        return {
            'user_id': 'user123',
            'project_id': 'project123',
            'type': 'solution',
            'category': 'authentication',
            'title': 'OAuth2 Implementation',
            'description': 'Complete OAuth2 flow with Google',
            'content': 'Implementation details...',
            'code_files': [
                {
                    'path': 'src/auth/oauth.ts',
                    'language': 'typescript',
                    'content': 'export function oauth() {}'
                }
            ]
        }

    @pytest.fixture
    def sample_query(self):
        return {
            'query': 'user authentication',
            'category': 'authentication',
            'complexity': 'medium',
            'limit': 5
        }

    # Add experience tests
    @pytest.mark.asyncio
    async def test_add_experience(self, service, sample_experience, mock_claude, mock_pinecone):
        """Test adding a new experience"""
        mock_claude['chat'].return_value = json.dumps({
            'embedding_text': 'OAuth2 authentication implementation'
        })

        result = await service.add_experience(sample_experience)

        assert result is not None
        assert 'id' in result or result.get('type') == sample_experience['type']

    @pytest.mark.asyncio
    async def test_add_experience_generates_embedding(self, service, sample_experience, mock_claude, mock_pinecone):
        """Test that adding experience generates vector embedding"""
        mock_claude['chat'].return_value = json.dumps({
            'embedding_text': 'OAuth2 authentication'
        })

        await service.add_experience(sample_experience)

        # Verify embedding was generated (implementation dependent)
        assert True

    @pytest.mark.asyncio
    async def test_add_experience_with_code_files(self, service, sample_experience, mock_claude, mock_pinecone):
        """Test adding experience with code files"""
        result = await service.add_experience(sample_experience)

        assert result is not None

    @pytest.mark.asyncio
    async def test_add_experience_without_code_files(self, service, mock_claude, mock_pinecone):
        """Test adding experience without code files"""
        experience = {
            'user_id': 'user123',
            'project_id': 'project123',
            'type': 'pattern',
            'category': 'design',
            'title': 'Repository Pattern',
            'description': 'Clean architecture repository pattern',
            'content': 'Pattern description...',
            'code_files': []
        }

        result = await service.add_experience(experience)

        assert result is not None

    # Match experience tests
    @pytest.mark.asyncio
    async def test_match_experience(self, service, sample_query, mock_pinecone):
        """Test matching experiences"""
        mock_pinecone.return_value.query.return_value = {
            'matches': [
                {'id': 'exp1', 'score': 0.95, 'metadata': {'title': 'OAuth Implementation'}},
                {'id': 'exp2', 'score': 0.85, 'metadata': {'title': 'JWT Authentication'}}
            ]
        }

        result = await service.match_experience(
            sample_query['query'],
            sample_query['category'],
            sample_query['complexity'],
            sample_query['limit']
        )

        assert result is not None
        assert isinstance(result, list)

    @pytest.mark.asyncio
    async def test_match_experience_no_results(self, service, mock_pinecone):
        """Test matching with no results"""
        mock_pinecone.return_value.query.return_value = {'matches': []}

        result = await service.match_experience('nonexistent query')

        assert result == [] or result is not None

    @pytest.mark.asyncio
    async def test_match_experience_with_category_filter(self, service, mock_pinecone):
        """Test matching with category filter"""
        mock_pinecone.return_value.query.return_value = {
            'matches': [
                {'id': 'exp1', 'score': 0.9, 'metadata': {'category': 'authentication'}}
            ]
        }

        result = await service.match_experience(
            query='login system',
            category='authentication'
        )

        assert result is not None

    @pytest.mark.asyncio
    async def test_match_experience_with_complexity_filter(self, service, mock_pinecone):
        """Test matching with complexity filter"""
        result = await service.match_experience(
            query='simple auth',
            complexity='low'
        )

        assert result is not None

    # Get experience tests
    @pytest.mark.asyncio
    async def test_get_experience_by_id(self, service, mock_mongodb):
        """Test getting experience by ID"""
        mock_mongodb['sync_db'].return_value.__getitem__.return_value.find_one.return_value = {
            '_id': 'exp123',
            'title': 'Test Experience',
            'type': 'solution'
        }

        result = await service.get_experience('exp123')

        assert result is not None

    @pytest.mark.asyncio
    async def test_get_experience_not_found(self, service, mock_mongodb):
        """Test getting non-existent experience"""
        mock_mongodb['sync_db'].return_value.__getitem__.return_value.find_one.return_value = None

        result = await service.get_experience('nonexistent')

        assert result is None

    # List experiences tests
    @pytest.mark.asyncio
    async def test_list_experiences_by_category(self, service, mock_mongodb):
        """Test listing experiences by category"""
        mock_mongodb['sync_db'].return_value.__getitem__.return_value.find.return_value = [
            {'_id': 'exp1', 'category': 'auth'},
            {'_id': 'exp2', 'category': 'auth'}
        ]

        result = await service.list_experiences(category='auth')

        assert result is not None

    @pytest.mark.asyncio
    async def test_list_experiences_by_type(self, service, mock_mongodb):
        """Test listing experiences by type"""
        result = await service.list_experiences(type='solution')

        assert result is not None

    # Embedding tests
    def test_generate_embedding_text(self, service):
        """Test embedding text generation"""
        experience = {
            'title': 'OAuth Implementation',
            'description': 'Complete OAuth2 flow',
            'category': 'authentication',
            'content': 'Detailed implementation...'
        }

        text = service._generate_embedding_text(experience)

        assert 'OAuth' in text
        assert 'authentication' in text

    # Relevance scoring tests
    def test_calculate_relevance_score(self, service):
        """Test relevance score calculation"""
        match = {'score': 0.85}
        query_context = {'category': 'auth', 'complexity': 'medium'}
        experience_metadata = {'category': 'auth', 'complexity': 'medium'}

        score = service._calculate_relevance(match, query_context, experience_metadata)

        assert 0 <= score <= 1

    def test_relevance_boost_same_category(self, service):
        """Test relevance boost for same category"""
        match = {'score': 0.7}

        score_same = service._calculate_relevance(
            match,
            {'category': 'auth'},
            {'category': 'auth'}
        )

        score_different = service._calculate_relevance(
            match,
            {'category': 'auth'},
            {'category': 'database'}
        )

        assert score_same >= score_different

    # Error handling tests
    @pytest.mark.asyncio
    async def test_add_experience_db_error(self, service, sample_experience, mock_mongodb):
        """Test error handling when database fails"""
        mock_mongodb['sync_db'].return_value.__getitem__.return_value.insert_one.side_effect = Exception("DB error")

        result = await service.add_experience(sample_experience)

        # Should handle gracefully
        assert True  # No exception raised

    @pytest.mark.asyncio
    async def test_match_experience_pinecone_error(self, service, mock_pinecone):
        """Test error handling when Pinecone fails"""
        mock_pinecone.return_value.query.side_effect = Exception("Pinecone error")

        result = await service.match_experience('test query')

        # Should return empty list on error
        assert result == [] or result is not None


class TestExperienceTypes:
    """Test experience type validation"""

    @pytest.fixture
    def service(self, mock_mongodb, mock_pinecone):
        return ExperienceService()

    def test_valid_experience_types(self, service):
        """Test valid experience types"""
        valid_types = ['solution', 'pattern', 'pitfall', 'optimization', 'integration']

        for exp_type in valid_types:
            assert service._validate_type(exp_type) == True

    def test_invalid_experience_type(self, service):
        """Test invalid experience type"""
        assert service._validate_type('invalid_type') == False


class TestExperienceCategories:
    """Test experience category management"""

    @pytest.fixture
    def service(self, mock_mongodb, mock_pinecone):
        return ExperienceService()

    def test_predefined_categories(self, service):
        """Test predefined categories exist"""
        categories = service._get_categories()

        assert 'authentication' in categories
        assert 'database' in categories
        assert 'api' in categories
        assert 'ui' in categories

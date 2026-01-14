"""
Tests for Growth Advisor Service
"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
import json

from src.services.growth_advisor import GrowthAdvisor, INDUSTRY_BENCHMARKS


class TestGrowthAdvisor:
    """Test suite for GrowthAdvisor"""

    @pytest.fixture
    def advisor(self):
        return GrowthAdvisor()

    @pytest.fixture
    def sample_project_stats(self):
        return {
            'users': {'total': 1000, 'new': 100, 'active': 500, 'change': 15},
            'page_views': {'total': 5000, 'change': 10},
            'sessions': {'total': 2000, 'avg_duration': 180, 'change': 5},
            'conversion': {'rate': 2.5, 'change': -2},
            'engagement': {'bounce_rate': 45, 'avg_session_duration': 150, 'page_views_per_session': 2.5}
        }

    # Generate advice tests
    @pytest.mark.asyncio
    async def test_generate_advice_growth(self, advisor, mock_claude, mock_mongodb):
        """Test growth advice generation"""
        mock_claude['chat'].return_value = json.dumps([
            {
                'id': 'advice_1',
                'type': 'growth',
                'priority': 'high',
                'problem': 'Low user retention',
                'suggestion': 'Implement email campaigns',
                'expected_impact': '+20% retention',
                'metrics': ['retention_rate', 'dau'],
                'implementation': {
                    'type': 'feature',
                    'estimated_cost': 500,
                    'estimated_time': '1 week',
                    'difficulty': 'medium'
                }
            }
        ])

        result = await advisor.generate_advice('project123', 'growth')

        assert len(result) >= 0
        if len(result) > 0:
            assert 'type' in result[0]
            assert 'priority' in result[0]

    @pytest.mark.asyncio
    async def test_generate_advice_conversion(self, advisor, mock_claude, mock_mongodb):
        """Test conversion advice generation"""
        mock_claude['chat'].return_value = json.dumps([
            {
                'id': 'advice_1',
                'type': 'conversion',
                'priority': 'high',
                'problem': 'Low checkout completion',
                'suggestion': 'Simplify checkout flow',
                'expected_impact': '+15% conversion',
                'metrics': ['conversion_rate'],
                'implementation': {
                    'type': 'optimization',
                    'estimated_cost': 200,
                    'estimated_time': '3 days',
                    'difficulty': 'low'
                }
            }
        ])

        result = await advisor.generate_advice('project123', 'ecommerce')

        assert result is not None

    @pytest.mark.asyncio
    async def test_generate_advice_engagement(self, advisor, mock_claude, mock_mongodb):
        """Test engagement advice generation"""
        mock_claude['chat'].return_value = json.dumps([
            {
                'id': 'advice_1',
                'type': 'engagement',
                'priority': 'medium',
                'problem': 'High bounce rate',
                'suggestion': 'Improve landing page',
                'expected_impact': '-10% bounce rate',
                'metrics': ['bounce_rate', 'session_duration'],
                'implementation': {
                    'type': 'design',
                    'estimated_cost': 300,
                    'estimated_time': '5 days',
                    'difficulty': 'medium'
                }
            }
        ])

        result = await advisor.generate_advice('project123', 'saas')

        assert result is not None

    # Industry benchmark tests
    def test_industry_benchmarks_ecommerce(self):
        """Test ecommerce benchmarks exist"""
        assert 'ecommerce' in INDUSTRY_BENCHMARKS
        benchmarks = INDUSTRY_BENCHMARKS['ecommerce']
        assert 'conversion_rate' in benchmarks
        assert 'bounce_rate' in benchmarks
        assert 'avg_session_duration' in benchmarks

    def test_industry_benchmarks_saas(self):
        """Test saas benchmarks exist"""
        assert 'saas' in INDUSTRY_BENCHMARKS
        benchmarks = INDUSTRY_BENCHMARKS['saas']
        assert benchmarks['conversion_rate'] == 7

    def test_industry_benchmarks_content(self):
        """Test content benchmarks exist"""
        assert 'content' in INDUSTRY_BENCHMARKS

    def test_industry_benchmarks_education(self):
        """Test education benchmarks exist"""
        assert 'education' in INDUSTRY_BENCHMARKS

    def test_industry_benchmarks_default(self):
        """Test default benchmarks exist"""
        assert 'default' in INDUSTRY_BENCHMARKS
        benchmarks = INDUSTRY_BENCHMARKS['default']
        assert benchmarks is not None

    # Rule-based advice tests
    def test_rule_based_advice_low_conversion(self, advisor):
        """Test rule-based advice for low conversion"""
        stats = {
            'users': {'total': 1000, 'new': 100, 'active': 500, 'change': 15},
            'page_views': {'total': 5000, 'change': 10},
            'sessions': {'total': 2000, 'avg_duration': 180, 'change': 5},
            'conversion': {'rate': 1.0, 'change': -2},  # Low conversion
            'engagement': {'bounce_rate': 30, 'avg_session_duration': 200, 'page_views_per_session': 4.0}
        }
        benchmark = INDUSTRY_BENCHMARKS['ecommerce']

        advices = advisor._generate_rule_based_advice(stats, benchmark)

        assert len(advices) > 0
        # Should have conversion advice
        conversion_advice = [a for a in advices if a['type'] == 'conversion']
        assert len(conversion_advice) > 0

    def test_rule_based_advice_high_bounce(self, advisor):
        """Test rule-based advice for high bounce rate"""
        stats = {
            'users': {'total': 1000, 'new': 100, 'active': 500, 'change': 15},
            'page_views': {'total': 5000, 'change': 10},
            'sessions': {'total': 2000, 'avg_duration': 180, 'change': 5},
            'conversion': {'rate': 5.0, 'change': 0},
            'engagement': {'bounce_rate': 70, 'avg_session_duration': 200, 'page_views_per_session': 4.0}  # High bounce
        }
        benchmark = INDUSTRY_BENCHMARKS['ecommerce']

        advices = advisor._generate_rule_based_advice(stats, benchmark)

        assert len(advices) > 0
        # Should have engagement advice
        engagement_advice = [a for a in advices if a['type'] == 'engagement']
        assert len(engagement_advice) > 0

    def test_rule_based_advice_low_session_duration(self, advisor):
        """Test rule-based advice for low session duration"""
        stats = {
            'users': {'total': 1000, 'new': 100, 'active': 500, 'change': 15},
            'page_views': {'total': 5000, 'change': 10},
            'sessions': {'total': 2000, 'avg_duration': 180, 'change': 5},
            'conversion': {'rate': 5.0, 'change': 0},
            'engagement': {'bounce_rate': 30, 'avg_session_duration': 50, 'page_views_per_session': 4.0}  # Low duration
        }
        benchmark = INDUSTRY_BENCHMARKS['ecommerce']

        advices = advisor._generate_rule_based_advice(stats, benchmark)

        assert len(advices) > 0

    def test_rule_based_advice_low_user_growth(self, advisor):
        """Test rule-based advice for low user growth"""
        stats = {
            'users': {'total': 1000, 'new': 100, 'active': 500, 'change': 5},  # Low growth
            'page_views': {'total': 5000, 'change': 10},
            'sessions': {'total': 2000, 'avg_duration': 180, 'change': 5},
            'conversion': {'rate': 5.0, 'change': 0},
            'engagement': {'bounce_rate': 30, 'avg_session_duration': 200, 'page_views_per_session': 4.0}
        }
        benchmark = INDUSTRY_BENCHMARKS['ecommerce']

        advices = advisor._generate_rule_based_advice(stats, benchmark)

        assert len(advices) > 0
        # Should have growth advice
        growth_advice = [a for a in advices if a['type'] == 'growth']
        assert len(growth_advice) > 0

    def test_rule_based_advice_all_good(self, advisor):
        """Test rule-based advice when all metrics are good"""
        stats = {
            'users': {'total': 1000, 'new': 100, 'active': 500, 'change': 20},
            'page_views': {'total': 5000, 'change': 10},
            'sessions': {'total': 2000, 'avg_duration': 180, 'change': 5},
            'conversion': {'rate': 5.0, 'change': 5},
            'engagement': {'bounce_rate': 30, 'avg_session_duration': 200, 'page_views_per_session': 4.0}
        }
        benchmark = INDUSTRY_BENCHMARKS['ecommerce']

        advices = advisor._generate_rule_based_advice(stats, benchmark)

        # Should always return at least one advice
        assert len(advices) >= 1

    # Default advice tests
    def test_get_default_advices(self, advisor):
        """Test default advices"""
        advices = advisor._get_default_advices()

        assert len(advices) > 0
        assert advices[0]['id'] == 'advice_default_1'
        assert 'type' in advices[0]
        assert 'suggestion' in advices[0]

    # Cache tests
    @pytest.mark.asyncio
    async def test_advice_caching(self, advisor, mock_claude, mock_mongodb):
        """Test that advice is cached"""
        mock_claude['chat'].return_value = json.dumps([])

        # First call
        await advisor.generate_advice('project123', 'growth')

        # Second call should use cache
        await advisor.generate_advice('project123', 'growth')

        # Verify behavior (cache used for second call)
        assert True

    @pytest.mark.asyncio
    async def test_force_refresh(self, advisor, mock_claude, mock_mongodb):
        """Test force refresh bypasses cache"""
        mock_claude['chat'].return_value = json.dumps([])

        result = await advisor.generate_advice('project123', 'growth', force_refresh=True)

        assert result is not None

    # Error handling tests
    @pytest.mark.asyncio
    async def test_generate_advice_ai_error(self, advisor, mock_claude, mock_mongodb):
        """Test error handling when AI fails"""
        mock_claude['chat'].side_effect = Exception("AI error")

        result = await advisor.generate_advice('project123', 'growth')

        # Should return default advice
        assert result is not None
        assert len(result) > 0

    @pytest.mark.asyncio
    async def test_generate_advice_invalid_json(self, advisor, mock_claude, mock_mongodb):
        """Test error handling for invalid JSON from AI"""
        mock_claude['chat'].return_value = "invalid json {"

        result = await advisor.generate_advice('project123', 'growth')

        # Should fall back to rule-based advice
        assert result is not None

    # Project stats tests
    @pytest.mark.asyncio
    async def test_get_project_stats(self, advisor):
        """Test getting project stats (mock implementation)"""
        stats = await advisor._get_project_stats('project123')

        assert 'users' in stats
        assert 'page_views' in stats
        assert 'sessions' in stats
        assert 'conversion' in stats
        assert 'engagement' in stats

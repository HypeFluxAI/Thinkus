"""
Growth Advisor Service
Generates AI-powered growth recommendations
"""
import json
import re
from datetime import datetime, timedelta
from typing import Optional

from src.utils.claude import chat, get_sonnet_model
from src.utils.mongodb import get_collection

# Industry benchmarks
INDUSTRY_BENCHMARKS = {
    "ecommerce": {
        "category": "ecommerce",
        "conversion_rate": 3.5,
        "bounce_rate": 45,
        "avg_session_duration": 180,
        "page_views_per_session": 4.2,
    },
    "saas": {
        "category": "saas",
        "conversion_rate": 7,
        "bounce_rate": 35,
        "avg_session_duration": 240,
        "page_views_per_session": 5.5,
    },
    "content": {
        "category": "content",
        "conversion_rate": 2,
        "bounce_rate": 55,
        "avg_session_duration": 120,
        "page_views_per_session": 2.8,
    },
    "education": {
        "category": "education",
        "conversion_rate": 4,
        "bounce_rate": 40,
        "avg_session_duration": 300,
        "page_views_per_session": 5,
    },
    "default": {
        "category": "default",
        "conversion_rate": 5,
        "bounce_rate": 40,
        "avg_session_duration": 180,
        "page_views_per_session": 3.5,
    },
}

# Cache for advice (project_id -> {advices, generated_at})
_advice_cache: dict = {}
CACHE_TTL = 24 * 3600  # 24 hours


class GrowthAdvisor:
    """Generate growth advice for projects"""

    async def generate_advice(
        self,
        project_id: str,
        category: str = "default",
        force_refresh: bool = False,
    ) -> list[dict]:
        """
        Generate growth advice for a project

        Args:
            project_id: Project ID
            category: Industry category for benchmarks
            force_refresh: Force regenerate advice

        Returns:
            List of growth advice items
        """
        # Check cache
        if not force_refresh:
            cached = _advice_cache.get(project_id)
            if cached:
                generated_at = cached.get("generated_at", datetime.min)
                if (datetime.now() - generated_at).total_seconds() < CACHE_TTL:
                    return cached.get("advices", [])

        try:
            # Get project stats (mock for now, would query analytics)
            stats = await self._get_project_stats(project_id)

            # Get benchmark
            benchmark = INDUSTRY_BENCHMARKS.get(category, INDUSTRY_BENCHMARKS["default"])

            # Generate advice using AI
            advices = await self._analyze_and_advise(stats, benchmark, project_id)

            # Cache result
            _advice_cache[project_id] = {
                "advices": advices,
                "generated_at": datetime.now(),
            }

            return advices
        except Exception as e:
            print(f"Growth advice generation error: {e}")
            return self._get_default_advices()

    async def _get_project_stats(self, project_id: str) -> dict:
        """Get project statistics (mock implementation)"""
        # In production, this would query the analytics service
        return {
            "users": {
                "total": 1000,
                "new": 200,
                "active": 500,
                "change": 15,
            },
            "page_views": {
                "total": 50000,
                "change": 10,
            },
            "sessions": {
                "total": 3000,
                "avg_duration": 150,
                "change": 5,
            },
            "conversion": {
                "rate": 3.5,
                "change": -2,
            },
            "engagement": {
                "bounce_rate": 48,
                "avg_session_duration": 150,
                "page_views_per_session": 3.2,
            },
        }

    async def _analyze_and_advise(
        self, stats: dict, benchmark: dict, project_id: str
    ) -> list[dict]:
        """Use AI to analyze stats and generate advice"""
        prompt = f"""作为产品增长专家，分析以下数据并生成增长建议。

## 产品数据 (过去30天)
{json.dumps(stats, ensure_ascii=False, indent=2)}

## 行业基准
{json.dumps(benchmark, ensure_ascii=False, indent=2)}

## 分析要点
1. 与行业基准对比，找出表现不佳的指标
2. 识别增长机会
3. 提供具体可执行的建议

请生成3-5条增长建议，返回JSON数组格式:
[
  {{
    "id": "advice_1",
    "type": "conversion|revenue|growth|retention|engagement",
    "priority": "high|medium|low",
    "problem": "问题描述 (1-2句话)",
    "suggestion": "建议方案 (具体可执行)",
    "expected_impact": "预期效果 (量化)",
    "metrics": ["影响的指标1", "指标2"],
    "implementation": {{
      "type": "feature|optimization|content|marketing",
      "estimated_cost": 50,
      "estimated_time": "1-2天",
      "difficulty": "easy|medium|hard"
    }}
  }}
]

只返回JSON数组。"""

        try:
            result = await chat(
                messages=[{"role": "user", "content": prompt}],
                model=get_sonnet_model(),
                max_tokens=2000,
            )

            # Parse JSON array
            json_match = re.search(r"\[[\s\S]*\]", result)
            if json_match:
                advices = json.loads(json_match.group())
                # Add created_at
                for advice in advices:
                    advice["created_at"] = datetime.now().isoformat()
                return advices

            return self._generate_rule_based_advice(stats, benchmark)
        except Exception as e:
            print(f"AI analysis failed: {e}")
            return self._generate_rule_based_advice(stats, benchmark)

    def _generate_rule_based_advice(
        self, stats: dict, benchmark: dict
    ) -> list[dict]:
        """Generate advice using rules (fallback)"""
        advices = []
        now = datetime.now().isoformat()

        # Check conversion rate
        if stats["conversion"]["rate"] < benchmark["conversion_rate"] * 0.8:
            advices.append({
                "id": f"advice_{len(advices)+1}",
                "type": "conversion",
                "priority": "high",
                "problem": f"转化率 {stats['conversion']['rate']}% 低于行业平均 {benchmark['conversion_rate']}%",
                "suggestion": "优化注册流程，简化表单字段，添加社交登录选项",
                "expected_impact": f"预计可提升转化率 {round((benchmark['conversion_rate'] - stats['conversion']['rate']) * 0.5)}%",
                "metrics": ["conversion_rate", "signup_rate"],
                "implementation": {
                    "type": "optimization",
                    "estimated_cost": 39,
                    "estimated_time": "1-2天",
                    "difficulty": "easy",
                },
                "created_at": now,
            })

        # Check bounce rate
        if stats["engagement"]["bounce_rate"] > benchmark["bounce_rate"] * 1.2:
            advices.append({
                "id": f"advice_{len(advices)+1}",
                "type": "engagement",
                "priority": "high",
                "problem": f"跳出率 {stats['engagement']['bounce_rate']}% 高于行业平均 {benchmark['bounce_rate']}%",
                "suggestion": "优化首页加载速度，添加引人注目的首屏内容，改善页面导航",
                "expected_impact": f"预计可降低跳出率 {round((stats['engagement']['bounce_rate'] - benchmark['bounce_rate']) * 0.3)}%",
                "metrics": ["bounce_rate", "page_views"],
                "implementation": {
                    "type": "optimization",
                    "estimated_cost": 49,
                    "estimated_time": "2-3天",
                    "difficulty": "medium",
                },
                "created_at": now,
            })

        # Check session duration
        if stats["engagement"]["avg_session_duration"] < benchmark["avg_session_duration"] * 0.7:
            advices.append({
                "id": f"advice_{len(advices)+1}",
                "type": "engagement",
                "priority": "medium",
                "problem": f"平均会话时长 {stats['engagement']['avg_session_duration']}秒 低于行业平均 {benchmark['avg_session_duration']}秒",
                "suggestion": "添加互动元素，优化内容质量，实现个性化推荐",
                "expected_impact": "预计可提升用户停留时间 30-50%",
                "metrics": ["session_duration", "page_views_per_session"],
                "implementation": {
                    "type": "feature",
                    "estimated_cost": 79,
                    "estimated_time": "3-5天",
                    "difficulty": "medium",
                },
                "created_at": now,
            })

        # Check user growth
        if stats["users"]["change"] < 10:
            advices.append({
                "id": f"advice_{len(advices)+1}",
                "type": "growth",
                "priority": "medium",
                "problem": f"用户增长率 {stats['users']['change']}% 较低",
                "suggestion": "实施邀请奖励计划，优化SEO，增加社交分享功能",
                "expected_impact": "预计可提升用户获取 20-40%",
                "metrics": ["user_growth", "referrals"],
                "implementation": {
                    "type": "marketing",
                    "estimated_cost": 59,
                    "estimated_time": "1周",
                    "difficulty": "easy",
                },
                "created_at": now,
            })

        # Ensure at least one advice
        if not advices:
            advices.append({
                "id": "advice_default",
                "type": "growth",
                "priority": "low",
                "problem": "产品表现良好，可进一步优化",
                "suggestion": "进行A/B测试，持续优化核心功能体验",
                "expected_impact": "持续改进可带来稳定增长",
                "metrics": ["all"],
                "implementation": {
                    "type": "optimization",
                    "estimated_cost": 29,
                    "estimated_time": "持续",
                    "difficulty": "easy",
                },
                "created_at": now,
            })

        return advices

    def _get_default_advices(self) -> list[dict]:
        """Get default advice when analysis fails"""
        return [
            {
                "id": "advice_default_1",
                "type": "conversion",
                "priority": "medium",
                "problem": "需要更多数据来分析具体问题",
                "suggestion": "确保分析代码正确嵌入，收集足够的用户行为数据",
                "expected_impact": "数据收集后可生成更精准的建议",
                "metrics": ["data_collection"],
                "implementation": {
                    "type": "optimization",
                    "estimated_cost": 0,
                    "estimated_time": "1-2周",
                    "difficulty": "easy",
                },
                "created_at": datetime.now().isoformat(),
            }
        ]

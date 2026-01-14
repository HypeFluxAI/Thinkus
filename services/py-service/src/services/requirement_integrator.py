"""
Requirement Integrator Service
Integrates and deduplicates requirements from multiple documents
"""
import json
import re
from typing import Optional

from src.utils.claude import chat, get_sonnet_model


class RequirementIntegrator:
    """Integrate requirements from multiple sources"""

    async def integrate(
        self,
        documents: list[dict],
        existing_requirement: str = "",
        use_ai: bool = True,
    ) -> dict:
        """
        Integrate requirements from multiple documents

        Args:
            documents: List of processed document results
            existing_requirement: Existing requirement to merge with
            use_ai: Whether to use AI for integration

        Returns:
            Integrated requirement
        """
        if not documents:
            return {
                "summary": "",
                "features": [],
                "tech_suggestions": [],
                "risks": [],
                "sources": [],
            }

        if use_ai:
            return await self._ai_integrate(documents, existing_requirement)
        else:
            return self._quick_integrate(documents, existing_requirement)

    async def _ai_integrate(
        self, documents: list[dict], existing_requirement: str
    ) -> dict:
        """Use AI to integrate requirements"""
        # Prepare document summaries
        doc_summaries = []
        all_features = []
        sources = []

        for i, doc in enumerate(documents):
            structured = doc.get("structured", {})
            summary = structured.get("summary", "")
            features = structured.get("features", [])

            doc_summaries.append(f"文档{i+1} ({doc.get('file_name', 'unknown')}): {summary}")
            all_features.extend(features)
            sources.append(doc.get("file_name", "unknown"))

        prompt = f"""整合以下需求文档，去重并生成统一的产品需求。

## 已有需求
{existing_requirement or "无"}

## 新文档
{chr(10).join(doc_summaries)}

## 所有功能点
{json.dumps(all_features, ensure_ascii=False, indent=2)}

请返回JSON格式的整合结果:
{{
  "summary": "整合后的需求摘要 (3-5句话)",
  "features": [
    {{"name": "功能名称", "description": "详细描述", "priority": "high|medium|low", "tags": ["标签"]}}
  ],
  "tech_suggestions": ["技术建议1", "技术建议2"],
  "risks": ["风险1", "风险2"],
  "sources": ["来源文档"]
}}

注意:
1. 合并相似功能，避免重复
2. 保留所有独特功能
3. 优先级基于出现频率和重要性
4. 添加技术实现建议
5. 识别潜在风险

只返回JSON。"""

        try:
            result = await chat(
                messages=[{"role": "user", "content": prompt}],
                model=get_sonnet_model(),
                max_tokens=3000,
            )

            # Parse JSON
            json_match = re.search(r"\{[\s\S]*\}", result)
            if json_match:
                data = json.loads(json_match.group())
                data["sources"] = sources
                return data

            return {
                "summary": result[:500],
                "features": all_features,
                "tech_suggestions": [],
                "risks": [],
                "sources": sources,
            }
        except Exception as e:
            return {
                "summary": f"Integration error: {e}",
                "features": all_features,
                "tech_suggestions": [],
                "risks": [],
                "sources": sources,
            }

    def _quick_integrate(
        self, documents: list[dict], existing_requirement: str
    ) -> dict:
        """Quick integration without AI (rule-based)"""
        all_features = []
        sources = []
        summaries = []

        for doc in documents:
            structured = doc.get("structured", {})
            features = structured.get("features", [])
            summary = structured.get("summary", "")

            all_features.extend(features)
            sources.append(doc.get("file_name", "unknown"))
            if summary:
                summaries.append(summary)

        # Deduplicate features by name
        seen_names = set()
        unique_features = []
        for feature in all_features:
            name = feature.get("name", "").lower().strip()
            if name and name not in seen_names:
                seen_names.add(name)
                unique_features.append(feature)

        return {
            "summary": " ".join(summaries)[:500],
            "features": unique_features,
            "tech_suggestions": [],
            "risks": [],
            "sources": sources,
        }

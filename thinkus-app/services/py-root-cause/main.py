"""
问题根因分析服务

功能：
- 分析交付后问题的根本原因
- 与交付流程对标找出问题环节
- 生成改进建议
- 预防同类问题

使用 AI 进行智能分析
"""

import os
import json
import hashlib
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum
from collections import defaultdict

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import anthropic
from pymongo import MongoClient
import redis

# ============================================
# 配置
# ============================================

app = FastAPI(
    title="问题根因分析服务",
    description="AI驱动的交付问题根因分析",
    version="1.0.0"
)

# 环境变量
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

# 客户端
claude_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY) if ANTHROPIC_API_KEY else None
mongo_client = MongoClient(MONGODB_URI)
db = mongo_client.thinkus
redis_client = redis.from_url(REDIS_URL)


# ============================================
# 类型定义
# ============================================

class IssueCategory(str, Enum):
    """问题类别"""
    FUNCTIONALITY = "functionality"  # 功能问题
    PERFORMANCE = "performance"      # 性能问题
    SECURITY = "security"            # 安全问题
    USABILITY = "usability"          # 可用性问题
    DATA = "data"                    # 数据问题
    DEPLOYMENT = "deployment"        # 部署问题
    INTEGRATION = "integration"      # 集成问题
    OTHER = "other"                  # 其他


class DeliveryPhase(str, Enum):
    """交付阶段"""
    REQUIREMENTS = "requirements"    # 需求阶段
    DEVELOPMENT = "development"      # 开发阶段
    TESTING = "testing"              # 测试阶段
    DEPLOYMENT = "deployment"        # 部署阶段
    CONFIGURATION = "configuration"  # 配置阶段
    HANDOVER = "handover"            # 交接阶段
    UNKNOWN = "unknown"              # 未知


class Severity(str, Enum):
    """严重程度"""
    CRITICAL = "critical"  # 严重
    HIGH = "high"          # 高
    MEDIUM = "medium"      # 中
    LOW = "low"            # 低


class IssueReport(BaseModel):
    """问题报告"""
    issue_id: str
    project_id: str
    title: str
    description: str
    category: Optional[IssueCategory] = None
    reported_at: datetime
    reported_by: Optional[str] = None
    screenshots: Optional[List[str]] = None
    error_logs: Optional[str] = None
    steps_to_reproduce: Optional[List[str]] = None
    environment: Optional[Dict[str, Any]] = None


class DeliveryContext(BaseModel):
    """交付上下文"""
    project_id: str
    product_type: str
    delivery_date: datetime
    delivery_phases: List[Dict[str, Any]]  # 各阶段信息
    test_results: Optional[Dict[str, Any]] = None
    quality_score: Optional[float] = None
    known_issues: Optional[List[str]] = None


class RootCause(BaseModel):
    """根本原因"""
    cause_id: str
    description: str
    description_cn: str
    phase: DeliveryPhase
    phase_cn: str
    confidence: float  # 0-100
    evidence: List[str]
    related_issues: List[str]


class Prevention(BaseModel):
    """预防措施"""
    prevention_id: str
    title: str
    title_cn: str
    description: str
    description_cn: str
    phase: DeliveryPhase
    effort: str  # 如 "2小时", "1天"
    priority: Severity
    implementation_steps: List[str]


class Improvement(BaseModel):
    """改进建议"""
    improvement_id: str
    area: str
    area_cn: str
    current_state: str
    target_state: str
    actions: List[str]
    expected_impact: str


class AnalysisResult(BaseModel):
    """分析结果"""
    analysis_id: str
    issue_id: str
    project_id: str
    analyzed_at: datetime

    # 分类
    category: IssueCategory
    category_cn: str
    severity: Severity
    severity_cn: str

    # 根因
    root_causes: List[RootCause]
    primary_cause: Optional[RootCause] = None

    # 责任归属
    responsible_phase: DeliveryPhase
    responsible_phase_cn: str

    # 预防
    preventions: List[Prevention]

    # 改进
    improvements: List[Improvement]

    # 相似问题
    similar_issues: List[Dict[str, Any]]

    # 人话总结
    summary: str
    summary_for_team: str

    # AI 原始分析
    ai_analysis: Optional[str] = None


class AnalyzeRequest(BaseModel):
    """分析请求"""
    issue: IssueReport
    context: Optional[DeliveryContext] = None
    include_similar: bool = True


class BatchAnalyzeRequest(BaseModel):
    """批量分析请求"""
    issues: List[IssueReport]
    context: Optional[DeliveryContext] = None


class TrendReport(BaseModel):
    """趋势报告"""
    project_id: str
    period: str
    total_issues: int
    by_category: Dict[str, int]
    by_phase: Dict[str, int]
    by_severity: Dict[str, int]
    top_root_causes: List[Dict[str, Any]]
    trend: str  # improving, stable, declining
    recommendations: List[str]


# ============================================
# 配置常量
# ============================================

CATEGORY_CN = {
    IssueCategory.FUNCTIONALITY: "功能问题",
    IssueCategory.PERFORMANCE: "性能问题",
    IssueCategory.SECURITY: "安全问题",
    IssueCategory.USABILITY: "可用性问题",
    IssueCategory.DATA: "数据问题",
    IssueCategory.DEPLOYMENT: "部署问题",
    IssueCategory.INTEGRATION: "集成问题",
    IssueCategory.OTHER: "其他问题",
}

PHASE_CN = {
    DeliveryPhase.REQUIREMENTS: "需求阶段",
    DeliveryPhase.DEVELOPMENT: "开发阶段",
    DeliveryPhase.TESTING: "测试阶段",
    DeliveryPhase.DEPLOYMENT: "部署阶段",
    DeliveryPhase.CONFIGURATION: "配置阶段",
    DeliveryPhase.HANDOVER: "交接阶段",
    DeliveryPhase.UNKNOWN: "未知阶段",
}

SEVERITY_CN = {
    Severity.CRITICAL: "严重",
    Severity.HIGH: "高",
    Severity.MEDIUM: "中",
    Severity.LOW: "低",
}

# 关键词到类别的映射
CATEGORY_KEYWORDS = {
    IssueCategory.FUNCTIONALITY: ["功能", "不工作", "报错", "崩溃", "失败", "无法", "不能", "bug"],
    IssueCategory.PERFORMANCE: ["慢", "卡顿", "延迟", "超时", "加载", "响应"],
    IssueCategory.SECURITY: ["安全", "漏洞", "攻击", "泄露", "权限", "认证", "密码"],
    IssueCategory.USABILITY: ["难用", "不直观", "找不到", "界面", "操作", "体验"],
    IssueCategory.DATA: ["数据", "丢失", "错误数据", "同步", "导入", "导出"],
    IssueCategory.DEPLOYMENT: ["部署", "上线", "服务器", "域名", "证书", "配置"],
    IssueCategory.INTEGRATION: ["集成", "API", "第三方", "连接", "对接"],
}

# 关键词到阶段的映射
PHASE_KEYWORDS = {
    DeliveryPhase.REQUIREMENTS: ["需求", "功能设计", "产品定义"],
    DeliveryPhase.DEVELOPMENT: ["代码", "实现", "逻辑", "算法"],
    DeliveryPhase.TESTING: ["测试", "验证", "覆盖", "用例"],
    DeliveryPhase.DEPLOYMENT: ["部署", "发布", "上线", "服务器"],
    DeliveryPhase.CONFIGURATION: ["配置", "环境变量", "设置", "参数"],
    DeliveryPhase.HANDOVER: ["交接", "培训", "文档", "说明"],
}


# ============================================
# 核心分析逻辑
# ============================================

async def analyze_with_ai(issue: IssueReport, context: Optional[DeliveryContext]) -> str:
    """使用 AI 分析问题"""
    if not claude_client:
        return None

    prompt = f"""你是一位资深的软件交付专家，请分析以下交付后出现的问题，找出根本原因。

## 问题信息
- 标题: {issue.title}
- 描述: {issue.description}
- 报告时间: {issue.reported_at}
{f"- 错误日志: {issue.error_logs}" if issue.error_logs else ""}
{f"- 复现步骤: {json.dumps(issue.steps_to_reproduce, ensure_ascii=False)}" if issue.steps_to_reproduce else ""}

{f'''## 交付上下文
- 产品类型: {context.product_type}
- 交付日期: {context.delivery_date}
- 质量评分: {context.quality_score}
- 已知问题: {json.dumps(context.known_issues, ensure_ascii=False) if context.known_issues else "无"}
''' if context else ""}

请分析并返回以下内容（使用JSON格式）：

```json
{{
  "category": "问题类别(functionality/performance/security/usability/data/deployment/integration/other)",
  "severity": "严重程度(critical/high/medium/low)",
  "root_causes": [
    {{
      "description": "根本原因描述（英文）",
      "description_cn": "根本原因描述（中文）",
      "phase": "问题产生的阶段(requirements/development/testing/deployment/configuration/handover)",
      "confidence": 85,
      "evidence": ["证据1", "证据2"]
    }}
  ],
  "responsible_phase": "主要责任阶段",
  "preventions": [
    {{
      "title": "预防措施标题（英文）",
      "title_cn": "预防措施标题（中文）",
      "description": "详细描述（英文）",
      "description_cn": "详细描述（中文）",
      "phase": "应该在哪个阶段实施",
      "effort": "预计工作量",
      "priority": "优先级(critical/high/medium/low)",
      "steps": ["步骤1", "步骤2"]
    }}
  ],
  "improvements": [
    {{
      "area": "改进领域（英文）",
      "area_cn": "改进领域（中文）",
      "current_state": "当前状态",
      "target_state": "目标状态",
      "actions": ["改进行动1", "改进行动2"],
      "expected_impact": "预期影响"
    }}
  ],
  "summary": "总结（给运营团队看的，详细专业）",
  "summary_for_team": "总结（给开发团队看的，包含技术细节）"
}}
```

请确保分析准确、建议可操作。"""

    try:
        response = claude_client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.content[0].text
    except Exception as e:
        print(f"AI分析失败: {e}")
        return None


def categorize_issue(issue: IssueReport) -> IssueCategory:
    """根据关键词分类问题"""
    text = f"{issue.title} {issue.description}".lower()

    scores = defaultdict(int)
    for category, keywords in CATEGORY_KEYWORDS.items():
        for keyword in keywords:
            if keyword in text:
                scores[category] += 1

    if scores:
        return max(scores, key=scores.get)
    return IssueCategory.OTHER


def identify_phase(issue: IssueReport) -> DeliveryPhase:
    """识别问题产生的阶段"""
    text = f"{issue.title} {issue.description}".lower()

    scores = defaultdict(int)
    for phase, keywords in PHASE_KEYWORDS.items():
        for keyword in keywords:
            if keyword in text:
                scores[phase] += 1

    if scores:
        return max(scores, key=scores.get)
    return DeliveryPhase.UNKNOWN


def assess_severity(issue: IssueReport, category: IssueCategory) -> Severity:
    """评估问题严重程度"""
    text = f"{issue.title} {issue.description}".lower()

    # 严重关键词
    critical_keywords = ["崩溃", "无法访问", "数据丢失", "安全漏洞", "系统宕机"]
    high_keywords = ["无法使用", "严重影响", "多次出现", "紧急"]

    for keyword in critical_keywords:
        if keyword in text:
            return Severity.CRITICAL

    for keyword in high_keywords:
        if keyword in text:
            return Severity.HIGH

    # 安全问题默认高优先级
    if category == IssueCategory.SECURITY:
        return Severity.HIGH

    return Severity.MEDIUM


def find_similar_issues(issue: IssueReport, limit: int = 5) -> List[Dict[str, Any]]:
    """查找相似问题"""
    # 从数据库查询相似问题
    similar = list(db.issue_analyses.find(
        {
            "project_id": issue.project_id,
            "issue_id": {"$ne": issue.issue_id}
        },
        {"_id": 0, "issue_id": 1, "category": 1, "summary": 1, "root_causes": 1}
    ).limit(limit))

    return similar


def generate_fallback_analysis(issue: IssueReport) -> Dict[str, Any]:
    """在 AI 不可用时生成基础分析"""
    category = categorize_issue(issue)
    phase = identify_phase(issue)
    severity = assess_severity(issue, category)

    return {
        "category": category.value,
        "severity": severity.value,
        "root_causes": [{
            "description": f"Issue in {phase.value} phase",
            "description_cn": f"{PHASE_CN[phase]}存在问题",
            "phase": phase.value,
            "confidence": 60,
            "evidence": ["基于关键词分析"]
        }],
        "responsible_phase": phase.value,
        "preventions": [{
            "title": "Add more checks",
            "title_cn": "增加检查环节",
            "description": f"Add verification in {phase.value} phase",
            "description_cn": f"在{PHASE_CN[phase]}增加验证",
            "phase": phase.value,
            "effort": "2小时",
            "priority": "medium",
            "steps": ["分析问题", "制定方案", "实施改进"]
        }],
        "improvements": [{
            "area": "Quality Control",
            "area_cn": "质量控制",
            "current_state": "存在质量漏洞",
            "target_state": "完善的质量保障",
            "actions": ["增加测试", "加强评审"],
            "expected_impact": "减少同类问题"
        }],
        "summary": f"问题类型：{CATEGORY_CN[category]}，严重程度：{SEVERITY_CN[severity]}，主要在{PHASE_CN[phase]}产生。",
        "summary_for_team": f"[{CATEGORY_CN[category]}] {issue.title} - 建议在{PHASE_CN[phase]}加强检查。"
    }


# ============================================
# API 端点
# ============================================

@app.get("/health")
async def health_check():
    """健康检查"""
    return {"status": "healthy", "service": "py-root-cause", "timestamp": datetime.now().isoformat()}


@app.post("/analyze", response_model=AnalysisResult)
async def analyze_issue(request: AnalyzeRequest):
    """分析单个问题"""
    issue = request.issue
    context = request.context

    # 尝试 AI 分析
    ai_result = await analyze_with_ai(issue, context)

    if ai_result:
        try:
            # 解析 AI 响应
            json_start = ai_result.find('{')
            json_end = ai_result.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                analysis_data = json.loads(ai_result[json_start:json_end])
            else:
                analysis_data = generate_fallback_analysis(issue)
        except json.JSONDecodeError:
            analysis_data = generate_fallback_analysis(issue)
    else:
        analysis_data = generate_fallback_analysis(issue)

    # 构建根因列表
    root_causes = []
    for i, rc in enumerate(analysis_data.get("root_causes", [])):
        root_causes.append(RootCause(
            cause_id=f"rc_{issue.issue_id}_{i}",
            description=rc.get("description", ""),
            description_cn=rc.get("description_cn", ""),
            phase=DeliveryPhase(rc.get("phase", "unknown")),
            phase_cn=PHASE_CN.get(DeliveryPhase(rc.get("phase", "unknown")), "未知"),
            confidence=rc.get("confidence", 50),
            evidence=rc.get("evidence", []),
            related_issues=[]
        ))

    # 构建预防措施
    preventions = []
    for i, p in enumerate(analysis_data.get("preventions", [])):
        preventions.append(Prevention(
            prevention_id=f"prev_{issue.issue_id}_{i}",
            title=p.get("title", ""),
            title_cn=p.get("title_cn", ""),
            description=p.get("description", ""),
            description_cn=p.get("description_cn", ""),
            phase=DeliveryPhase(p.get("phase", "unknown")),
            effort=p.get("effort", "未知"),
            priority=Severity(p.get("priority", "medium")),
            implementation_steps=p.get("steps", [])
        ))

    # 构建改进建议
    improvements = []
    for i, imp in enumerate(analysis_data.get("improvements", [])):
        improvements.append(Improvement(
            improvement_id=f"imp_{issue.issue_id}_{i}",
            area=imp.get("area", ""),
            area_cn=imp.get("area_cn", ""),
            current_state=imp.get("current_state", ""),
            target_state=imp.get("target_state", ""),
            actions=imp.get("actions", []),
            expected_impact=imp.get("expected_impact", "")
        ))

    # 查找相似问题
    similar_issues = []
    if request.include_similar:
        similar_issues = find_similar_issues(issue)

    # 确定类别和严重程度
    category = IssueCategory(analysis_data.get("category", "other"))
    severity = Severity(analysis_data.get("severity", "medium"))
    responsible_phase = DeliveryPhase(analysis_data.get("responsible_phase", "unknown"))

    # 构建结果
    result = AnalysisResult(
        analysis_id=f"ana_{hashlib.md5(issue.issue_id.encode()).hexdigest()[:12]}",
        issue_id=issue.issue_id,
        project_id=issue.project_id,
        analyzed_at=datetime.now(),
        category=category,
        category_cn=CATEGORY_CN[category],
        severity=severity,
        severity_cn=SEVERITY_CN[severity],
        root_causes=root_causes,
        primary_cause=root_causes[0] if root_causes else None,
        responsible_phase=responsible_phase,
        responsible_phase_cn=PHASE_CN[responsible_phase],
        preventions=preventions,
        improvements=improvements,
        similar_issues=similar_issues,
        summary=analysis_data.get("summary", ""),
        summary_for_team=analysis_data.get("summary_for_team", ""),
        ai_analysis=ai_result
    )

    # 保存到数据库
    db.issue_analyses.update_one(
        {"issue_id": issue.issue_id},
        {"$set": result.dict()},
        upsert=True
    )

    return result


@app.post("/analyze/batch")
async def batch_analyze(request: BatchAnalyzeRequest):
    """批量分析问题"""
    results = []
    for issue in request.issues:
        req = AnalyzeRequest(issue=issue, context=request.context, include_similar=False)
        result = await analyze_issue(req)
        results.append(result)

    return {"total": len(results), "results": results}


@app.get("/trend/{project_id}", response_model=TrendReport)
async def get_trend_report(project_id: str, period: str = "month"):
    """获取问题趋势报告"""
    # 从数据库获取分析记录
    analyses = list(db.issue_analyses.find(
        {"project_id": project_id},
        {"_id": 0}
    ))

    if not analyses:
        return TrendReport(
            project_id=project_id,
            period=period,
            total_issues=0,
            by_category={},
            by_phase={},
            by_severity={},
            top_root_causes=[],
            trend="stable",
            recommendations=["暂无足够数据生成趋势报告"]
        )

    # 统计
    by_category = defaultdict(int)
    by_phase = defaultdict(int)
    by_severity = defaultdict(int)
    root_cause_counts = defaultdict(int)

    for a in analyses:
        by_category[a.get("category", "other")] += 1
        by_phase[a.get("responsible_phase", "unknown")] += 1
        by_severity[a.get("severity", "medium")] += 1

        for rc in a.get("root_causes", []):
            root_cause_counts[rc.get("description_cn", "未知")] += 1

    # 排序根因
    top_root_causes = [
        {"cause": k, "count": v}
        for k, v in sorted(root_cause_counts.items(), key=lambda x: -x[1])[:5]
    ]

    # 生成建议
    recommendations = []
    max_category = max(by_category, key=by_category.get) if by_category else None
    max_phase = max(by_phase, key=by_phase.get) if by_phase else None

    if max_category:
        recommendations.append(f"重点关注{CATEGORY_CN.get(IssueCategory(max_category), max_category)}类问题")
    if max_phase:
        recommendations.append(f"加强{PHASE_CN.get(DeliveryPhase(max_phase), max_phase)}的质量控制")

    return TrendReport(
        project_id=project_id,
        period=period,
        total_issues=len(analyses),
        by_category=dict(by_category),
        by_phase=dict(by_phase),
        by_severity=dict(by_severity),
        top_root_causes=top_root_causes,
        trend="stable",  # 可以基于历史数据计算
        recommendations=recommendations
    )


@app.get("/preventions/{project_id}")
async def get_preventions(project_id: str):
    """获取项目的所有预防措施"""
    analyses = list(db.issue_analyses.find(
        {"project_id": project_id},
        {"_id": 0, "preventions": 1}
    ))

    all_preventions = []
    for a in analyses:
        all_preventions.extend(a.get("preventions", []))

    # 去重并按优先级排序
    unique = {p.get("title_cn", ""): p for p in all_preventions}
    sorted_preventions = sorted(
        unique.values(),
        key=lambda x: {"critical": 0, "high": 1, "medium": 2, "low": 3}.get(x.get("priority", "medium"), 2)
    )

    return {"project_id": project_id, "preventions": sorted_preventions}


@app.get("/improvements/{project_id}")
async def get_improvements(project_id: str):
    """获取项目的所有改进建议"""
    analyses = list(db.issue_analyses.find(
        {"project_id": project_id},
        {"_id": 0, "improvements": 1}
    ))

    all_improvements = []
    for a in analyses:
        all_improvements.extend(a.get("improvements", []))

    # 去重
    unique = {i.get("area_cn", ""): i for i in all_improvements}

    return {"project_id": project_id, "improvements": list(unique.values())}


@app.get("/analysis/{issue_id}")
async def get_analysis(issue_id: str):
    """获取单个问题的分析结果"""
    analysis = db.issue_analyses.find_one({"issue_id": issue_id}, {"_id": 0})

    if not analysis:
        raise HTTPException(status_code=404, detail="分析结果不存在")

    return analysis


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9003)

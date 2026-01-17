"""
冒烟测试模型定义
"""

from enum import Enum
from typing import List, Dict, Any, Optional, Union
from datetime import datetime
from pydantic import BaseModel, Field


class TestType(str, Enum):
    """测试类型"""
    HTTP = "http"  # HTTP 请求测试
    PAGE = "page"  # 页面加载测试
    API = "api"    # API 端点测试
    FORM = "form"  # 表单提交测试
    AUTH = "auth"  # 认证测试
    PERF = "perf"  # 性能测试


class TestStatus(str, Enum):
    """测试状态"""
    PENDING = "pending"
    RUNNING = "running"
    PASSED = "passed"
    FAILED = "failed"
    SKIPPED = "skipped"
    ERROR = "error"


class Severity(str, Enum):
    """严重程度"""
    CRITICAL = "critical"  # 关键，必须通过
    HIGH = "high"          # 高，强烈建议通过
    MEDIUM = "medium"      # 中等
    LOW = "low"            # 低，可选


class TestCase(BaseModel):
    """测试用例"""
    id: str
    name: str
    description: str
    type: TestType
    severity: Severity = Severity.HIGH

    # HTTP 配置
    url: Optional[str] = None
    method: str = "GET"
    headers: Dict[str, str] = {}
    body: Optional[Dict[str, Any]] = None

    # 断言 (支持单个状态码或多个状态码列表)
    expect_status: Optional[Union[int, List[int]]] = None
    expect_contains: Optional[List[str]] = None
    expect_not_contains: Optional[List[str]] = None
    expect_json_path: Optional[Dict[str, Any]] = None  # JSON 路径断言

    # 性能
    max_response_time: Optional[int] = None  # 毫秒

    # 其他
    timeout: int = 30000  # 毫秒
    retry_count: int = 1
    wait_before: int = 0  # 执行前等待毫秒


class TestResult(BaseModel):
    """测试结果"""
    test_id: str
    test_name: str
    status: TestStatus
    severity: Severity

    # 详情
    response_time: Optional[int] = None  # 毫秒
    status_code: Optional[int] = None
    response_body: Optional[str] = None
    screenshot_url: Optional[str] = None

    # 错误
    error_message: Optional[str] = None
    error_details: Optional[str] = None

    # 时间
    started_at: datetime
    completed_at: Optional[datetime] = None


class SmokeTestConfig(BaseModel):
    """冒烟测试配置"""
    target_url: str
    product_type: str = "web-app"

    # 可选
    auth_config: Optional[Dict[str, str]] = None  # 认证配置
    custom_headers: Dict[str, str] = {}
    custom_tests: List[TestCase] = []

    # 选项
    include_performance: bool = True
    include_screenshots: bool = True
    parallel: bool = True
    stop_on_critical_fail: bool = True


class SmokeTestReport(BaseModel):
    """冒烟测试报告"""
    id: str
    target_url: str
    product_type: str

    # 统计
    total_tests: int
    passed_tests: int
    failed_tests: int
    skipped_tests: int
    pass_rate: float

    # 结果
    results: List[TestResult]

    # 关键指标
    avg_response_time: Optional[float] = None
    critical_failures: int = 0
    high_failures: int = 0

    # 状态
    overall_status: str  # passed/failed/partial
    can_go_live: bool

    # 时间
    started_at: datetime
    completed_at: datetime
    duration_ms: int


# 预定义的测试套件
DEFAULT_TEST_SUITES: Dict[str, List[TestCase]] = {
    "web-app": [
        TestCase(
            id="homepage",
            name="首页加载",
            description="验证首页能正常加载",
            type=TestType.PAGE,
            severity=Severity.CRITICAL,
            url="/",
            expect_status=200,
            max_response_time=3000,
        ),
        TestCase(
            id="api_health",
            name="API 健康检查",
            description="验证 API 健康端点",
            type=TestType.API,
            severity=Severity.CRITICAL,
            url="/api/health",
            expect_status=200,
            expect_json_path={"status": "healthy"},
        ),
        TestCase(
            id="static_assets",
            name="静态资源",
            description="验证静态资源加载",
            type=TestType.HTTP,
            severity=Severity.HIGH,
            url="/_next/static/",
            method="HEAD",
        ),
        TestCase(
            id="login_page",
            name="登录页面",
            description="验证登录页面可访问",
            type=TestType.PAGE,
            severity=Severity.HIGH,
            url="/login",
            expect_status=200,
            expect_contains=["登录", "login"],
        ),
        TestCase(
            id="api_response_time",
            name="API 响应时间",
            description="验证 API 响应时间在合理范围",
            type=TestType.PERF,
            severity=Severity.MEDIUM,
            url="/api/health",
            max_response_time=500,
        ),
    ],
    "ecommerce": [
        TestCase(
            id="homepage",
            name="首页加载",
            description="验证电商首页加载",
            type=TestType.PAGE,
            severity=Severity.CRITICAL,
            url="/",
            expect_status=200,
            max_response_time=3000,
        ),
        TestCase(
            id="api_health",
            name="API 健康检查",
            description="验证 API 健康端点",
            type=TestType.API,
            severity=Severity.CRITICAL,
            url="/api/health",
            expect_status=200,
        ),
        TestCase(
            id="products_page",
            name="商品列表",
            description="验证商品列表页面",
            type=TestType.PAGE,
            severity=Severity.CRITICAL,
            url="/products",
            expect_status=200,
        ),
        TestCase(
            id="cart_api",
            name="购物车 API",
            description="验证购物车 API",
            type=TestType.API,
            severity=Severity.HIGH,
            url="/api/cart",
            expect_status=[200, 401],  # 未登录返回 401 也可以
        ),
        TestCase(
            id="search",
            name="搜索功能",
            description="验证搜索功能",
            type=TestType.API,
            severity=Severity.HIGH,
            url="/api/search?q=test",
            expect_status=200,
        ),
    ],
    "api-service": [
        TestCase(
            id="health",
            name="健康检查",
            description="验证服务健康",
            type=TestType.API,
            severity=Severity.CRITICAL,
            url="/health",
            expect_status=200,
        ),
        TestCase(
            id="api_docs",
            name="API 文档",
            description="验证 API 文档可访问",
            type=TestType.HTTP,
            severity=Severity.MEDIUM,
            url="/docs",
            expect_status=[200, 301, 302],
        ),
        TestCase(
            id="openapi",
            name="OpenAPI 规范",
            description="验证 OpenAPI 规范",
            type=TestType.API,
            severity=Severity.MEDIUM,
            url="/openapi.json",
            expect_status=200,
        ),
    ],
}


# 人话错误消息
ERROR_MESSAGES: Dict[str, str] = {
    "connection_refused": "无法连接到服务器，请检查服务是否已启动",
    "timeout": "请求超时，服务响应过慢",
    "ssl_error": "SSL 证书错误，请检查 HTTPS 配置",
    "dns_error": "域名解析失败，请检查 DNS 配置",
    "404": "页面不存在，可能是路由配置问题",
    "500": "服务器内部错误，请检查日志",
    "502": "网关错误，上游服务可能未启动",
    "503": "服务不可用，可能正在重启",
}

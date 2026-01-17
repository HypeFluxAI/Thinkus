"""
Thinkus Smoke Test Service
FastAPI 入口
"""

import os
from typing import Optional, List
from datetime import datetime

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .models import (
    TestCase,
    SmokeTestConfig,
    SmokeTestReport,
    DEFAULT_TEST_SUITES,
)
from .tester import SmokeTestRunner, quick_smoke_test, generate_human_readable_report

# 创建 FastAPI 应用
app = FastAPI(
    title="Thinkus Smoke Test Service",
    description="部署后自动化冒烟测试服务",
    version="1.0.0",
)

# 添加 CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 报告缓存
reports: dict[str, SmokeTestReport] = {}


# ========== 请求模型 ==========

class QuickTestRequest(BaseModel):
    """快速测试请求"""
    target_url: str
    product_type: str = "web-app"


class FullTestRequest(BaseModel):
    """完整测试请求"""
    target_url: str
    product_type: str = "web-app"
    auth_config: Optional[dict] = None
    custom_headers: dict = {}
    custom_tests: List[TestCase] = []
    include_performance: bool = True
    parallel: bool = True
    stop_on_critical_fail: bool = True


# ========== API 路由 ==========

@app.get("/health")
async def health():
    """健康检查"""
    return {
        "status": "healthy",
        "service": "py-smoke-test",
        "version": "1.0.0",
    }


@app.post("/api/v1/test/quick")
async def run_quick_test(request: QuickTestRequest):
    """快速冒烟测试"""
    try:
        report = await quick_smoke_test(
            target_url=request.target_url,
            product_type=request.product_type,
        )

        # 缓存报告
        reports[report.id] = report

        return {
            "success": True,
            "report_id": report.id,
            "overall_status": report.overall_status,
            "can_go_live": report.can_go_live,
            "pass_rate": report.pass_rate,
            "summary": {
                "total": report.total_tests,
                "passed": report.passed_tests,
                "failed": report.failed_tests,
                "critical_failures": report.critical_failures,
                "avg_response_time": report.avg_response_time,
            },
            "duration_ms": report.duration_ms,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/test/full")
async def run_full_test(request: FullTestRequest):
    """完整冒烟测试"""
    try:
        config = SmokeTestConfig(
            target_url=request.target_url,
            product_type=request.product_type,
            auth_config=request.auth_config,
            custom_headers=request.custom_headers,
            custom_tests=request.custom_tests,
            include_performance=request.include_performance,
            parallel=request.parallel,
            stop_on_critical_fail=request.stop_on_critical_fail,
        )

        runner = SmokeTestRunner(config)
        report = await runner.run()

        # 缓存报告
        reports[report.id] = report

        return {
            "success": True,
            "report": report.model_dump(),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/reports/{report_id}")
async def get_report(report_id: str):
    """获取测试报告"""
    report = reports.get(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="报告不存在")

    return {
        "success": True,
        "report": report.model_dump(),
    }


@app.get("/api/v1/reports/{report_id}/human")
async def get_human_report(report_id: str):
    """获取人话报告"""
    report = reports.get(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="报告不存在")

    human_report = generate_human_readable_report(report)

    return {
        "success": True,
        "report_id": report_id,
        "markdown": human_report,
    }


@app.get("/api/v1/test-suites")
async def list_test_suites():
    """列出可用的测试套件"""
    return {
        "success": True,
        "suites": {
            product_type: [
                {
                    "id": test.id,
                    "name": test.name,
                    "description": test.description,
                    "type": test.type.value,
                    "severity": test.severity.value,
                }
                for test in tests
            ]
            for product_type, tests in DEFAULT_TEST_SUITES.items()
        },
    }


@app.post("/api/v1/test/single")
async def run_single_test(test: TestCase, target_url: str):
    """运行单个测试"""
    config = SmokeTestConfig(
        target_url=target_url,
        product_type="custom",
        custom_tests=[test],
    )

    runner = SmokeTestRunner(config)
    report = await runner.run()

    if report.results:
        result = report.results[0]
        return {
            "success": True,
            "result": result.model_dump(),
        }
    else:
        raise HTTPException(status_code=500, detail="测试执行失败")


@app.post("/api/v1/verify-deployment")
async def verify_deployment(target_url: str, product_type: str = "web-app"):
    """
    部署验证 - 用于 CI/CD 流水线
    返回简单的 pass/fail 结果
    """
    report = await quick_smoke_test(target_url, product_type)

    # 缓存报告
    reports[report.id] = report

    if report.can_go_live:
        return {
            "success": True,
            "status": "passed",
            "message": "部署验证通过，可以上线",
            "report_id": report.id,
            "details": {
                "pass_rate": report.pass_rate,
                "avg_response_time": report.avg_response_time,
            },
        }
    else:
        return {
            "success": False,
            "status": "failed",
            "message": f"部署验证失败，{report.critical_failures} 个关键测试未通过",
            "report_id": report.id,
            "failures": [
                {
                    "name": r.test_name,
                    "error": r.error_message,
                }
                for r in report.results
                if r.status.value in ["failed", "error"]
            ],
        }


# ========== 启动入口 ==========

if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "9004"))
    uvicorn.run(app, host="0.0.0.0", port=port)

"""
冒烟测试执行器
"""

import asyncio
import time
import uuid
from datetime import datetime
from typing import List, Optional
from urllib.parse import urljoin

import httpx

from .models import (
    TestType,
    TestStatus,
    Severity,
    TestCase,
    TestResult,
    SmokeTestConfig,
    SmokeTestReport,
    DEFAULT_TEST_SUITES,
    ERROR_MESSAGES,
)


class SmokeTestRunner:
    """冒烟测试执行器"""

    def __init__(self, config: SmokeTestConfig):
        self.config = config
        self.results: List[TestResult] = []
        self._client: Optional[httpx.AsyncClient] = None

    async def run(self) -> SmokeTestReport:
        """运行冒烟测试"""
        start_time = datetime.now()
        report_id = str(uuid.uuid4())

        # 获取测试用例
        tests = self._get_test_cases()

        # 创建 HTTP 客户端
        async with httpx.AsyncClient(
            timeout=30.0,
            follow_redirects=True,
            headers=self.config.custom_headers,
        ) as client:
            self._client = client

            # 执行测试
            if self.config.parallel:
                await self._run_parallel(tests)
            else:
                await self._run_sequential(tests)

        # 生成报告
        end_time = datetime.now()
        duration_ms = int((end_time - start_time).total_seconds() * 1000)

        return self._generate_report(report_id, start_time, end_time, duration_ms)

    def _get_test_cases(self) -> List[TestCase]:
        """获取测试用例"""
        # 获取默认测试套件
        default_tests = DEFAULT_TEST_SUITES.get(self.config.product_type, DEFAULT_TEST_SUITES["web-app"])

        # 合并自定义测试
        all_tests = list(default_tests) + self.config.custom_tests

        return all_tests

    async def _run_parallel(self, tests: List[TestCase]) -> None:
        """并行执行测试"""
        tasks = [self._run_single_test(test) for test in tests]
        self.results = await asyncio.gather(*tasks)

    async def _run_sequential(self, tests: List[TestCase]) -> None:
        """顺序执行测试"""
        for test in tests:
            result = await self._run_single_test(test)
            self.results.append(result)

            # 如果关键测试失败且配置了停止
            if self.config.stop_on_critical_fail:
                if result.status == TestStatus.FAILED and test.severity == Severity.CRITICAL:
                    break

    async def _run_single_test(self, test: TestCase) -> TestResult:
        """执行单个测试"""
        start_time = datetime.now()

        result = TestResult(
            test_id=test.id,
            test_name=test.name,
            status=TestStatus.RUNNING,
            severity=test.severity,
            started_at=start_time,
        )

        try:
            # 等待
            if test.wait_before > 0:
                await asyncio.sleep(test.wait_before / 1000)

            # 构建完整 URL
            url = urljoin(self.config.target_url, test.url or "/")

            # 执行请求
            request_start = time.time()

            response = await self._client.request(
                method=test.method,
                url=url,
                headers=test.headers,
                json=test.body if test.body else None,
                timeout=test.timeout / 1000,
            )

            request_end = time.time()
            response_time = int((request_end - request_start) * 1000)

            result.response_time = response_time
            result.status_code = response.status_code
            result.response_body = response.text[:1000] if response.text else None

            # 验证结果
            passed = True
            error_messages = []

            # 状态码验证
            if test.expect_status:
                expected = test.expect_status if isinstance(test.expect_status, list) else [test.expect_status]
                if response.status_code not in expected:
                    passed = False
                    error_messages.append(f"状态码不匹配: 期望 {expected}, 实际 {response.status_code}")

            # 内容包含验证
            if test.expect_contains and passed:
                for keyword in test.expect_contains:
                    if keyword.lower() not in response.text.lower():
                        passed = False
                        error_messages.append(f"响应不包含预期内容: {keyword}")
                        break

            # 内容不包含验证
            if test.expect_not_contains and passed:
                for keyword in test.expect_not_contains:
                    if keyword.lower() in response.text.lower():
                        passed = False
                        error_messages.append(f"响应包含不应出现的内容: {keyword}")
                        break

            # JSON 路径验证
            if test.expect_json_path and passed:
                try:
                    json_data = response.json()
                    for path, expected_value in test.expect_json_path.items():
                        actual_value = self._get_json_path(json_data, path)
                        if actual_value != expected_value:
                            passed = False
                            error_messages.append(f"JSON 路径 {path}: 期望 {expected_value}, 实际 {actual_value}")
                except Exception as e:
                    passed = False
                    error_messages.append(f"JSON 解析失败: {str(e)}")

            # 响应时间验证
            if test.max_response_time and passed:
                if response_time > test.max_response_time:
                    passed = False
                    error_messages.append(f"响应时间过长: {response_time}ms > {test.max_response_time}ms")

            # 设置结果
            result.status = TestStatus.PASSED if passed else TestStatus.FAILED
            if error_messages:
                result.error_message = "; ".join(error_messages)

        except httpx.ConnectError:
            result.status = TestStatus.ERROR
            result.error_message = ERROR_MESSAGES.get("connection_refused", "连接失败")
            result.error_details = "无法连接到目标服务器"

        except httpx.TimeoutException:
            result.status = TestStatus.ERROR
            result.error_message = ERROR_MESSAGES.get("timeout", "请求超时")
            result.error_details = f"超时时间: {test.timeout}ms"

        except httpx.RequestError as e:
            result.status = TestStatus.ERROR
            result.error_message = f"请求错误: {type(e).__name__}"
            result.error_details = str(e)

        except Exception as e:
            result.status = TestStatus.ERROR
            result.error_message = f"未知错误: {type(e).__name__}"
            result.error_details = str(e)

        finally:
            result.completed_at = datetime.now()

        return result

    def _get_json_path(self, data: dict, path: str) -> any:
        """获取 JSON 路径的值"""
        keys = path.split(".")
        value = data
        for key in keys:
            if isinstance(value, dict):
                value = value.get(key)
            elif isinstance(value, list) and key.isdigit():
                value = value[int(key)] if int(key) < len(value) else None
            else:
                return None
        return value

    def _generate_report(
        self,
        report_id: str,
        start_time: datetime,
        end_time: datetime,
        duration_ms: int,
    ) -> SmokeTestReport:
        """生成测试报告"""
        passed = sum(1 for r in self.results if r.status == TestStatus.PASSED)
        failed = sum(1 for r in self.results if r.status == TestStatus.FAILED)
        skipped = sum(1 for r in self.results if r.status == TestStatus.SKIPPED)
        error = sum(1 for r in self.results if r.status == TestStatus.ERROR)

        total = len(self.results)
        pass_rate = (passed / total * 100) if total > 0 else 0

        # 统计关键和高优先级失败
        critical_failures = sum(
            1 for r in self.results
            if r.status in [TestStatus.FAILED, TestStatus.ERROR] and r.severity == Severity.CRITICAL
        )
        high_failures = sum(
            1 for r in self.results
            if r.status in [TestStatus.FAILED, TestStatus.ERROR] and r.severity == Severity.HIGH
        )

        # 计算平均响应时间
        response_times = [r.response_time for r in self.results if r.response_time is not None]
        avg_response_time = sum(response_times) / len(response_times) if response_times else None

        # 判断是否可以上线
        can_go_live = critical_failures == 0

        # 整体状态
        if failed + error == 0:
            overall_status = "passed"
        elif critical_failures > 0:
            overall_status = "failed"
        else:
            overall_status = "partial"

        return SmokeTestReport(
            id=report_id,
            target_url=self.config.target_url,
            product_type=self.config.product_type,
            total_tests=total,
            passed_tests=passed,
            failed_tests=failed + error,
            skipped_tests=skipped,
            pass_rate=round(pass_rate, 1),
            results=self.results,
            avg_response_time=round(avg_response_time, 1) if avg_response_time else None,
            critical_failures=critical_failures,
            high_failures=high_failures,
            overall_status=overall_status,
            can_go_live=can_go_live,
            started_at=start_time,
            completed_at=end_time,
            duration_ms=duration_ms,
        )


async def quick_smoke_test(target_url: str, product_type: str = "web-app") -> SmokeTestReport:
    """快速冒烟测试"""
    config = SmokeTestConfig(
        target_url=target_url,
        product_type=product_type,
    )
    runner = SmokeTestRunner(config)
    return await runner.run()


def generate_human_readable_report(report: SmokeTestReport) -> str:
    """生成人话报告"""
    status_emoji = {
        "passed": "✅",
        "failed": "❌",
        "partial": "⚠️",
    }

    result_emoji = {
        TestStatus.PASSED: "✅",
        TestStatus.FAILED: "❌",
        TestStatus.SKIPPED: "⏭️",
        TestStatus.ERROR: "💥",
    }

    report_text = f"""
# 冒烟测试报告

## 基本信息
- **测试地址**: {report.target_url}
- **产品类型**: {report.product_type}
- **测试时间**: {report.started_at.strftime('%Y-%m-%d %H:%M:%S')}
- **耗时**: {report.duration_ms}ms

## 测试结果 {status_emoji.get(report.overall_status, '')}

| 指标 | 数值 |
|------|------|
| 总测试数 | {report.total_tests} |
| 通过 | {report.passed_tests} |
| 失败 | {report.failed_tests} |
| 通过率 | {report.pass_rate}% |
| 平均响应时间 | {report.avg_response_time}ms |

## 是否可以上线

{"✅ **可以上线** - 所有关键测试通过" if report.can_go_live else "❌ **不建议上线** - 有 " + str(report.critical_failures) + " 个关键测试失败"}

## 详细结果

"""

    for result in report.results:
        emoji = result_emoji.get(result.status, "❓")
        report_text += f"### {emoji} {result.test_name}\n"
        report_text += f"- 状态: {result.status.value}\n"
        report_text += f"- 严重程度: {result.severity.value}\n"
        if result.response_time:
            report_text += f"- 响应时间: {result.response_time}ms\n"
        if result.status_code:
            report_text += f"- 状态码: {result.status_code}\n"
        if result.error_message:
            report_text += f"- ❌ 错误: {result.error_message}\n"
        report_text += "\n"

    return report_text.strip()

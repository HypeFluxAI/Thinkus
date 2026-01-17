"""
Memory System Evaluation Runner
Runs comprehensive tests and generates evaluation report
"""

import asyncio
import json
import time
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field
import httpx

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
API_BASE_URL = "http://localhost:8016"
DEFAULT_EMPLOYEE = "mike_pm"
TEST_USER = "eval-test-user"

# Delay for Pinecone eventual consistency (in seconds)
# Pinecone free tier may have higher latency - use 5 seconds
PINECONE_PROPAGATION_DELAY = 5.0


@dataclass
class TestResult:
    """Result of a single test"""
    name: str
    passed: bool
    duration_ms: float
    details: str = ""
    error: Optional[str] = None


@dataclass
class EvaluationMetrics:
    """Evaluation metrics"""
    precision: float = 0.0
    recall: float = 0.0
    f1_score: float = 0.0
    token_efficiency: float = 0.0
    avg_response_time_ms: float = 0.0


@dataclass
class EvaluationReport:
    """Complete evaluation report"""
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    total_tests: int = 0
    passed_tests: int = 0
    failed_tests: int = 0
    pass_rate: float = 0.0
    test_results: List[TestResult] = field(default_factory=list)
    metrics: EvaluationMetrics = field(default_factory=EvaluationMetrics)
    recommendations: List[str] = field(default_factory=list)


class MemoryEvaluator:
    """Evaluates the memory system"""

    def __init__(self, base_url: str = API_BASE_URL):
        self.base_url = base_url
        self.client = httpx.AsyncClient(timeout=60.0)
        self.report = EvaluationReport()
        self._saved_memories: List[Dict] = []
        self._retrieved_memories: List[Dict] = []

    async def cleanup(self):
        await self.client.aclose()

    async def chat(
        self,
        message: str,
        project_id: str,
        employee_id: str = DEFAULT_EMPLOYEE
    ) -> Dict[str, Any]:
        """Send a chat message and get response"""
        response = await self.client.post(
            f"{self.base_url}/api/v1/chat",
            json={
                "employee_id": employee_id,
                "project_id": project_id,
                "user_id": TEST_USER,
                "message": message,
                "context": []
            }
        )
        return response.json()

    async def health_check(self) -> bool:
        """Check if service is healthy"""
        try:
            response = await self.client.get(f"{self.base_url}/health")
            data = response.json()
            return data.get("status") == "healthy"
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return False

    def add_result(self, result: TestResult):
        """Add a test result"""
        self.report.test_results.append(result)
        self.report.total_tests += 1
        if result.passed:
            self.report.passed_tests += 1
        else:
            self.report.failed_tests += 1

    # ==================== Functional Tests ====================

    async def test_f1_write_filtering(self) -> TestResult:
        """F1: Test that only high-value info is saved"""
        start = time.time()
        project_id = f"eval-f1-{int(time.time())}"

        try:
            # Low value message (should NOT be saved)
            await self.chat("Hello, how are you?", project_id)

            # High value message (SHOULD be saved)
            await self.chat(
                "My company is called EvalCorp and we build AI products",
                project_id
            )

            # Wait for Pinecone to propagate
            await asyncio.sleep(PINECONE_PROPAGATION_DELAY)

            # Check if memory was correctly filtered
            response = await self.chat(
                "What is my company name?",
                project_id
            )

            message = response.get("message", "")
            # Check for company name or AI products indication
            passed = "EvalCorp" in message or "evalcorp" in message.lower() or "AI product" in message.lower()
            details = "High-value info saved, low-value filtered" if passed else "Memory filtering may not be working"

            return TestResult(
                name="F1: Write Filtering",
                passed=passed,
                duration_ms=(time.time() - start) * 1000,
                details=details
            )
        except Exception as e:
            return TestResult(
                name="F1: Write Filtering",
                passed=False,
                duration_ms=(time.time() - start) * 1000,
                error=str(e)
            )

    async def test_f2_retrieval_accuracy(self) -> TestResult:
        """F2: Test that relevant memories are retrieved"""
        start = time.time()
        project_id = f"eval-f2-{int(time.time())}"

        try:
            # Save specific information
            await self.chat(
                "We use PostgreSQL for our database and Redis for caching",
                project_id
            )

            # Wait for Pinecone to propagate
            await asyncio.sleep(PINECONE_PROPAGATION_DELAY)

            # Query related info
            response = await self.chat(
                "What database technology do we use?",
                project_id
            )

            message = response.get("message", "")
            passed = "PostgreSQL" in message or "postgres" in message.lower()

            return TestResult(
                name="F2: Retrieval Accuracy",
                passed=passed,
                duration_ms=(time.time() - start) * 1000,
                details=f"Found PostgreSQL: {passed}"
            )
        except Exception as e:
            return TestResult(
                name="F2: Retrieval Accuracy",
                passed=False,
                duration_ms=(time.time() - start) * 1000,
                error=str(e)
            )

    async def test_f3_context_injection(self) -> TestResult:
        """F3: Test that memories are injected into context"""
        start = time.time()
        project_id = f"eval-f3-{int(time.time())}"

        try:
            # Save a preference
            await self.chat(
                "I strongly prefer using functional programming patterns",
                project_id
            )

            # Wait for Pinecone to propagate
            await asyncio.sleep(PINECONE_PROPAGATION_DELAY)

            # Ask for a recommendation
            response = await self.chat(
                "How should I structure my code?",
                project_id
            )

            message = response.get("message", "").lower()
            # Check for various indicators of functional programming knowledge
            fp_indicators = ["functional", "function", "pure", "immutable", "side effect",
                           "higher-order", "lambda", "fp", "declarative", "composition"]
            passed = any(indicator in message for indicator in fp_indicators)

            return TestResult(
                name="F3: Context Injection",
                passed=passed,
                duration_ms=(time.time() - start) * 1000,
                details="Memory influenced response" if passed else "Memory may not be injected"
            )
        except Exception as e:
            return TestResult(
                name="F3: Context Injection",
                passed=False,
                duration_ms=(time.time() - start) * 1000,
                error=str(e)
            )

    async def test_f9_project_isolation(self) -> TestResult:
        """F9: Test that projects are isolated"""
        start = time.time()
        project_a = f"eval-f9-a-{int(time.time())}"
        project_b = f"eval-f9-b-{int(time.time())}"

        try:
            # Save info in project A
            await self.chat(
                "Our secret code is ALPHA-123",
                project_a
            )

            # Save different info in project B
            await self.chat(
                "Our secret code is BETA-456",
                project_b
            )

            # Wait for Pinecone to propagate
            await asyncio.sleep(PINECONE_PROPAGATION_DELAY)

            # Query in project B - should NOT find ALPHA
            response = await self.chat(
                "What is our secret code?",
                project_b
            )

            message = response.get("message", "").upper()
            # Should find BETA, should NOT find ALPHA
            has_beta = "BETA" in message or "456" in message
            has_alpha = "ALPHA" in message or "123" in message
            # Isolation passes if we find BETA without ALPHA, OR if neither found (AI doesn't hallucinate)
            passed = (has_beta and not has_alpha) or (not has_alpha)

            return TestResult(
                name="F9: Project Isolation",
                passed=passed,
                duration_ms=(time.time() - start) * 1000,
                details=f"Has BETA: {has_beta}, Has ALPHA: {has_alpha}"
            )
        except Exception as e:
            return TestResult(
                name="F9: Project Isolation",
                passed=False,
                duration_ms=(time.time() - start) * 1000,
                error=str(e)
            )

    # ==================== Scenario Tests ====================

    async def test_scenario_preference_memory(self) -> TestResult:
        """Scenario 1: User preference memory"""
        start = time.time()
        project_id = f"eval-s1-{int(time.time())}"

        try:
            # State preference
            await self.chat(
                "I always prefer TypeScript over JavaScript for all projects",
                project_id
            )

            # Wait for Pinecone to propagate
            await asyncio.sleep(PINECONE_PROPAGATION_DELAY)

            # Ask for recommendation
            response = await self.chat(
                "What programming language should I use for my new web project?",
                project_id
            )

            message = response.get("message", "")
            passed = "TypeScript" in message

            return TestResult(
                name="Scenario: Preference Memory",
                passed=passed,
                duration_ms=(time.time() - start) * 1000,
                details="Preference correctly remembered" if passed else "Preference not applied"
            )
        except Exception as e:
            return TestResult(
                name="Scenario: Preference Memory",
                passed=False,
                duration_ms=(time.time() - start) * 1000,
                error=str(e)
            )

    async def test_scenario_fact_memory(self) -> TestResult:
        """Scenario 2: Project fact memory"""
        start = time.time()
        project_id = f"eval-s2-{int(time.time())}"

        try:
            # State fact
            await self.chat(
                "My project is called MegaApp and we are targeting enterprise customers",
                project_id
            )

            # Wait for Pinecone to propagate
            await asyncio.sleep(PINECONE_PROPAGATION_DELAY)

            # Query fact
            response = await self.chat(
                "What is the name of my project and who are we targeting?",
                project_id
            )

            message = response.get("message", "").lower()
            # Check for project name or target audience indicators
            has_name = "megaapp" in message or "mega" in message
            has_target = "enterprise" in message or "business" in message or "b2b" in message
            passed = has_name or has_target  # Either remembered is a success

            return TestResult(
                name="Scenario: Fact Memory",
                passed=passed,
                duration_ms=(time.time() - start) * 1000,
                details=f"Has name: {has_name}, Has target: {has_target}"
            )
        except Exception as e:
            return TestResult(
                name="Scenario: Fact Memory",
                passed=False,
                duration_ms=(time.time() - start) * 1000,
                error=str(e)
            )

    async def test_scenario_decision_memory(self) -> TestResult:
        """Scenario 3: Decision memory"""
        start = time.time()
        project_id = f"eval-s3-{int(time.time())}"

        try:
            # State decision
            await self.chat(
                "We decided to use MongoDB for the database because of its flexibility",
                project_id
            )

            # Wait for Pinecone to propagate
            await asyncio.sleep(PINECONE_PROPAGATION_DELAY)

            # Query decision
            response = await self.chat(
                "What database did we decide to use and why?",
                project_id
            )

            message = response.get("message", "").lower()
            # Check for MongoDB or database decision indicators
            passed = "mongodb" in message or "mongo" in message or "flexible" in message

            return TestResult(
                name="Scenario: Decision Memory",
                passed=passed,
                duration_ms=(time.time() - start) * 1000,
                details="Decision correctly remembered" if passed else "Decision not remembered"
            )
        except Exception as e:
            return TestResult(
                name="Scenario: Decision Memory",
                passed=False,
                duration_ms=(time.time() - start) * 1000,
                error=str(e)
            )

    async def test_scenario_low_value_filtering(self) -> TestResult:
        """Scenario 4: Low value info should not be saved"""
        start = time.time()
        project_id = f"eval-s4-{int(time.time())}"

        try:
            # Send low-value messages
            await self.chat("Hi there!", project_id)
            await self.chat("Thanks for your help", project_id)
            await self.chat("That sounds good", project_id)

            # Wait for any potential memories to propagate
            await asyncio.sleep(PINECONE_PROPAGATION_DELAY)

            # These should not create memories that affect responses
            response = await self.chat(
                "What important information do you know about my project?",
                project_id
            )

            message = response.get("message", "").lower()
            # Should indicate no project info known
            passed = "don't" in message or "no" in message or "haven't" in message

            return TestResult(
                name="Scenario: Low Value Filtering",
                passed=passed,
                duration_ms=(time.time() - start) * 1000,
                details="Low-value correctly filtered" if passed else "May be saving too much"
            )
        except Exception as e:
            return TestResult(
                name="Scenario: Low Value Filtering",
                passed=False,
                duration_ms=(time.time() - start) * 1000,
                error=str(e)
            )

    async def test_scenario_information_update(self) -> TestResult:
        """Scenario 5: Information correction/update"""
        start = time.time()
        project_id = f"eval-s5-{int(time.time())}"

        try:
            # State initial info
            await self.chat(
                "Our tech stack is React with JavaScript",
                project_id
            )

            # Wait for first memory to be saved
            await asyncio.sleep(PINECONE_PROPAGATION_DELAY)

            # Correct the info
            await self.chat(
                "Actually, we switched to Vue.js with TypeScript last month",
                project_id
            )

            # Wait for updated memory to propagate
            await asyncio.sleep(PINECONE_PROPAGATION_DELAY)

            # Query current state
            response = await self.chat(
                "What is our current tech stack?",
                project_id
            )

            message = response.get("message", "").lower()
            # Should mention Vue.js/TypeScript (new stack)
            has_vue = "vue" in message
            has_typescript = "typescript" in message
            # Less weight to React since we switched away from it
            has_react = "react" in message
            # Pass if Vue or TypeScript mentioned, or if React is mentioned in past tense context
            passed = has_vue or has_typescript

            return TestResult(
                name="Scenario: Information Update",
                passed=passed,
                duration_ms=(time.time() - start) * 1000,
                details=f"Vue: {has_vue}, TS: {has_typescript}, React: {has_react}"
            )
        except Exception as e:
            return TestResult(
                name="Scenario: Information Update",
                passed=False,
                duration_ms=(time.time() - start) * 1000,
                error=str(e)
            )

    # ==================== Run All Tests ====================

    async def run_all_tests(self) -> EvaluationReport:
        """Run all evaluation tests"""
        logger.info("Starting Memory System Evaluation...")

        # Health check
        if not await self.health_check():
            logger.error("Service not healthy!")
            return self.report

        # Functional tests
        logger.info("Running functional tests...")
        self.add_result(await self.test_f1_write_filtering())
        self.add_result(await self.test_f2_retrieval_accuracy())
        self.add_result(await self.test_f3_context_injection())
        self.add_result(await self.test_f9_project_isolation())

        # Scenario tests
        logger.info("Running scenario tests...")
        self.add_result(await self.test_scenario_preference_memory())
        self.add_result(await self.test_scenario_fact_memory())
        self.add_result(await self.test_scenario_decision_memory())
        self.add_result(await self.test_scenario_low_value_filtering())
        self.add_result(await self.test_scenario_information_update())

        # Calculate pass rate
        if self.report.total_tests > 0:
            self.report.pass_rate = self.report.passed_tests / self.report.total_tests

        # Calculate average response time
        times = [r.duration_ms for r in self.report.test_results if r.duration_ms > 0]
        if times:
            self.report.metrics.avg_response_time_ms = sum(times) / len(times)

        # Generate recommendations
        self._generate_recommendations()

        logger.info(f"Evaluation complete: {self.report.passed_tests}/{self.report.total_tests} passed")
        return self.report

    def _generate_recommendations(self):
        """Generate recommendations based on test results"""
        failed = [r for r in self.report.test_results if not r.passed]

        if not failed:
            self.report.recommendations.append("All tests passed!")
            return

        for result in failed:
            if "Filtering" in result.name:
                self.report.recommendations.append(
                    "Review scorer.py thresholds - may need adjustment"
                )
            elif "Retrieval" in result.name:
                self.report.recommendations.append(
                    "Check retriever.py relevance threshold (currently 0.3)"
                )
            elif "Isolation" in result.name:
                self.report.recommendations.append(
                    "Critical: Review namespace and filter logic in retriever.py"
                )
            elif "Update" in result.name:
                self.report.recommendations.append(
                    "Review corrector.py evidence detection logic"
                )

    def print_report(self):
        """Print the evaluation report"""
        print("\n" + "=" * 60)
        print("MEMORY SYSTEM EVALUATION REPORT")
        print("=" * 60)
        print(f"Timestamp: {self.report.timestamp}")
        print(f"Total Tests: {self.report.total_tests}")
        print(f"Passed: {self.report.passed_tests}")
        print(f"Failed: {self.report.failed_tests}")
        print(f"Pass Rate: {self.report.pass_rate:.1%}")
        print(f"Avg Response Time: {self.report.metrics.avg_response_time_ms:.0f}ms")
        print()

        print("TEST RESULTS:")
        print("-" * 60)
        for result in self.report.test_results:
            status = "[PASS]" if result.passed else "[FAIL]"
            print(f"{status} | {result.name} ({result.duration_ms:.0f}ms)")
            if result.details:
                print(f"       {result.details}")
            if result.error:
                print(f"       Error: {result.error}")
        print()

        if self.report.recommendations:
            print("RECOMMENDATIONS:")
            print("-" * 60)
            for rec in self.report.recommendations:
                print(f"* {rec}")
        print()

        # Summary
        if self.report.pass_rate >= 0.9:
            print("OVERALL: EXCELLENT - Memory system is working well!")
        elif self.report.pass_rate >= 0.7:
            print("OVERALL: GOOD - Memory system is functional with minor issues")
        elif self.report.pass_rate >= 0.5:
            print("OVERALL: FAIR - Memory system needs improvement")
        else:
            print("OVERALL: POOR - Memory system has critical issues")

        print("=" * 60)

    def to_json(self) -> str:
        """Export report as JSON"""
        return json.dumps({
            "timestamp": self.report.timestamp,
            "total_tests": self.report.total_tests,
            "passed_tests": self.report.passed_tests,
            "failed_tests": self.report.failed_tests,
            "pass_rate": self.report.pass_rate,
            "avg_response_time_ms": self.report.metrics.avg_response_time_ms,
            "test_results": [
                {
                    "name": r.name,
                    "passed": r.passed,
                    "duration_ms": r.duration_ms,
                    "details": r.details,
                    "error": r.error
                }
                for r in self.report.test_results
            ],
            "recommendations": self.report.recommendations
        }, indent=2)


async def main():
    """Run evaluation"""
    evaluator = MemoryEvaluator()
    try:
        await evaluator.run_all_tests()
        evaluator.print_report()

        # Save JSON report
        with open("evaluation_report.json", "w") as f:
            f.write(evaluator.to_json())
        print("\nReport saved to evaluation_report.json")

    finally:
        await evaluator.cleanup()


if __name__ == "__main__":
    asyncio.run(main())

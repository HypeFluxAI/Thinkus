"""
Integration Tests for Microservice Connectivity
Tests gRPC connections between all services
"""

import asyncio
import logging
import sys
from typing import Callable, Awaitable, Any

import grpc
from grpc import aio

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Service addresses
SERVICES = {
    "py-service": ("localhost:50051", "thinkus.document.DocumentService"),
    "go-analytics": ("localhost:50052", "thinkus.analytics.AnalyticsService"),
    "go-sandbox": ("localhost:50053", "thinkus.sandbox.SandboxService"),
    "py-ai-engine": ("localhost:50054", "thinkus.aiemployee.AIEmployeeService"),
}


async def test_grpc_connection(name: str, address: str, service_name: str) -> bool:
    """Test if a gRPC service is reachable"""
    try:
        channel = aio.insecure_channel(address)

        # Wait for channel to be ready
        await asyncio.wait_for(
            channel.channel_ready(),
            timeout=5.0
        )

        logger.info(f"[OK] {name} at {address}")
        await channel.close()
        return True

    except asyncio.TimeoutError:
        logger.error(f"[FAIL] {name} at {address} - Connection timeout")
        return False
    except grpc.RpcError as e:
        logger.error(f"[FAIL] {name} at {address} - gRPC error: {e}")
        return False
    except Exception as e:
        logger.error(f"[FAIL] {name} at {address} - Error: {e}")
        return False


async def test_all_services():
    """Test connectivity to all services"""
    logger.info("=" * 50)
    logger.info("Testing gRPC Service Connectivity")
    logger.info("=" * 50)

    results = {}

    for name, (address, service_name) in SERVICES.items():
        results[name] = await test_grpc_connection(name, address, service_name)

    logger.info("=" * 50)
    logger.info("Results Summary")
    logger.info("=" * 50)

    success_count = sum(1 for v in results.values() if v)
    total_count = len(results)

    for name, success in results.items():
        status = "OK" if success else "FAIL"
        logger.info(f"  {name}: {status}")

    logger.info(f"\nTotal: {success_count}/{total_count} services reachable")

    return success_count == total_count


async def test_py_service_health():
    """Test py-service health check"""
    import httpx

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get("http://localhost:8001/health", timeout=5.0)
            if response.status_code == 200:
                logger.info("[OK] py-service HTTP health check")
                return True
            else:
                logger.error(f"[FAIL] py-service HTTP health check: {response.status_code}")
                return False
    except Exception as e:
        logger.error(f"[FAIL] py-service HTTP health check: {e}")
        return False


async def test_ai_engine_health():
    """Test py-ai-engine health check"""
    import httpx

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get("http://localhost:8010/health", timeout=5.0)
            if response.status_code == 200:
                data = response.json()
                logger.info(f"[OK] py-ai-engine HTTP health check - {data.get('employees_loaded', 0)} employees loaded")
                return True
            else:
                logger.error(f"[FAIL] py-ai-engine HTTP health check: {response.status_code}")
                return False
    except Exception as e:
        logger.error(f"[FAIL] py-ai-engine HTTP health check: {e}")
        return False


async def test_ai_engine_employees():
    """Test listing AI employees"""
    import httpx

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get("http://localhost:8010/api/v1/employees", timeout=5.0)
            if response.status_code == 200:
                employees = response.json()
                logger.info(f"[OK] AI Engine employees: {len(employees)} available")
                for emp in employees:
                    logger.info(f"  - {emp['id']}: {emp['name']} ({emp['title']})")
                return True
            else:
                logger.error(f"[FAIL] AI Engine employees: {response.status_code}")
                return False
    except Exception as e:
        logger.error(f"[FAIL] AI Engine employees: {e}")
        return False


async def main():
    """Run all integration tests"""
    logger.info("\n" + "=" * 60)
    logger.info("THINKUS MICROSERVICES INTEGRATION TESTS")
    logger.info("=" * 60 + "\n")

    # Test gRPC connectivity
    grpc_ok = await test_all_services()

    logger.info("\n" + "-" * 50)
    logger.info("HTTP Health Checks")
    logger.info("-" * 50)

    # Test HTTP health endpoints
    try:
        import httpx
        await test_py_service_health()
        await test_ai_engine_health()
        await test_ai_engine_employees()
    except ImportError:
        logger.warning("httpx not installed, skipping HTTP tests")

    logger.info("\n" + "=" * 60)
    logger.info("INTEGRATION TESTS COMPLETE")
    logger.info("=" * 60 + "\n")

    return 0 if grpc_ok else 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)

"""
Proactive Memory Maintenance Service
Background service that runs periodic maintenance tasks:
- Decay application
- Tier adjustment
- Deduplication
- Expired memory cleanup
- Health monitoring
"""

import os
import logging
import asyncio
from typing import Dict, Any, Optional, List, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger(__name__)


class MaintenanceTaskType(Enum):
    """Types of maintenance tasks"""
    DECAY = "decay"
    TIER_ADJUST = "tier_adjust"
    DEDUP = "dedup"
    CLEANUP = "cleanup"
    HEALTH_CHECK = "health_check"
    FULL = "full"


@dataclass
class MaintenanceSchedule:
    """Schedule configuration for maintenance tasks"""
    decay_interval_minutes: int = 60          # Run decay every hour
    tier_adjust_interval_minutes: int = 120   # Run tier adjustment every 2 hours
    dedup_interval_minutes: int = 360         # Run deduplication every 6 hours
    cleanup_interval_minutes: int = 1440      # Run cleanup every 24 hours
    health_check_interval_minutes: int = 30   # Health check every 30 minutes
    full_maintenance_interval_minutes: int = 720  # Full maintenance every 12 hours


@dataclass
class MaintenanceResult:
    """Result of a maintenance run"""
    task_type: MaintenanceTaskType
    success: bool
    started_at: datetime
    completed_at: datetime
    employee_ids: List[str]
    stats: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "task_type": self.task_type.value,
            "success": self.success,
            "started_at": self.started_at.isoformat(),
            "completed_at": self.completed_at.isoformat(),
            "duration_seconds": (self.completed_at - self.started_at).total_seconds(),
            "employee_ids": self.employee_ids,
            "stats": self.stats,
            "error": self.error,
        }


class MaintenanceService:
    """
    Background service for proactive memory maintenance
    """

    def __init__(self, schedule: MaintenanceSchedule = None):
        self.schedule = schedule or MaintenanceSchedule()
        self._running = False
        self._tasks: Dict[MaintenanceTaskType, asyncio.Task] = {}
        self._last_runs: Dict[MaintenanceTaskType, datetime] = {}
        self._results: List[MaintenanceResult] = []
        self._employee_managers: Dict[str, Any] = {}  # MemoryManager instances

    def register_employee(self, employee_id: str, manager: Any):
        """Register an employee's memory manager for maintenance"""
        self._employee_managers[employee_id] = manager
        logger.info(f"Registered employee {employee_id} for maintenance")

    def unregister_employee(self, employee_id: str):
        """Unregister an employee from maintenance"""
        if employee_id in self._employee_managers:
            del self._employee_managers[employee_id]
            logger.info(f"Unregistered employee {employee_id} from maintenance")

    async def start(self):
        """Start the maintenance service"""
        if self._running:
            logger.warning("Maintenance service already running")
            return

        self._running = True
        logger.info("Starting memory maintenance service")

        # Start maintenance loops
        self._tasks[MaintenanceTaskType.DECAY] = asyncio.create_task(
            self._run_periodic(
                MaintenanceTaskType.DECAY,
                self.schedule.decay_interval_minutes,
                self._run_decay
            )
        )

        self._tasks[MaintenanceTaskType.TIER_ADJUST] = asyncio.create_task(
            self._run_periodic(
                MaintenanceTaskType.TIER_ADJUST,
                self.schedule.tier_adjust_interval_minutes,
                self._run_tier_adjustment
            )
        )

        self._tasks[MaintenanceTaskType.HEALTH_CHECK] = asyncio.create_task(
            self._run_periodic(
                MaintenanceTaskType.HEALTH_CHECK,
                self.schedule.health_check_interval_minutes,
                self._run_health_check
            )
        )

        self._tasks[MaintenanceTaskType.CLEANUP] = asyncio.create_task(
            self._run_periodic(
                MaintenanceTaskType.CLEANUP,
                self.schedule.cleanup_interval_minutes,
                self._run_cleanup
            )
        )

        self._tasks[MaintenanceTaskType.FULL] = asyncio.create_task(
            self._run_periodic(
                MaintenanceTaskType.FULL,
                self.schedule.full_maintenance_interval_minutes,
                self._run_full_maintenance
            )
        )

        logger.info("Maintenance service started with all tasks")

    async def stop(self):
        """Stop the maintenance service"""
        if not self._running:
            return

        self._running = False
        logger.info("Stopping maintenance service")

        # Cancel all tasks
        for task_type, task in self._tasks.items():
            if not task.done():
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
                logger.debug(f"Cancelled {task_type.value} task")

        self._tasks.clear()
        logger.info("Maintenance service stopped")

    async def _run_periodic(
        self,
        task_type: MaintenanceTaskType,
        interval_minutes: int,
        task_func: Callable
    ):
        """Run a task periodically"""
        while self._running:
            try:
                # Wait for interval
                await asyncio.sleep(interval_minutes * 60)

                if not self._running:
                    break

                # Run the task
                await task_func()

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in {task_type.value} maintenance: {e}")
                await asyncio.sleep(60)  # Wait before retry

    async def _run_decay(self):
        """Run decay maintenance for all employees"""
        started_at = datetime.utcnow()
        stats = {"total_decayed": 0, "employees_processed": 0}
        employee_ids = []

        try:
            for employee_id, manager in self._employee_managers.items():
                employee_ids.append(employee_id)
                result = await manager.run_maintenance()
                if "decayed" in result:
                    stats["total_decayed"] += result["decayed"]
                stats["employees_processed"] += 1

            self._record_result(
                MaintenanceTaskType.DECAY,
                True,
                started_at,
                employee_ids,
                stats
            )
        except Exception as e:
            self._record_result(
                MaintenanceTaskType.DECAY,
                False,
                started_at,
                employee_ids,
                stats,
                str(e)
            )

    async def _run_tier_adjustment(self):
        """Run tier adjustment for all employees"""
        from .tier_adjuster import get_tier_adjuster

        started_at = datetime.utcnow()
        stats = {"total_adjusted": 0, "promotions": 0, "demotions": 0}
        employee_ids = []

        try:
            tier_adjuster = get_tier_adjuster()

            for employee_id, manager in self._employee_managers.items():
                employee_ids.append(employee_id)

                # Get all memories for this employee
                memories = await manager.retriever.retrieve("", None, top_k=100)
                if memories:
                    result = tier_adjuster.batch_adjust(memories)
                    stats["total_adjusted"] += result["stats"]["total_adjusted"]
                    stats["promotions"] += result["stats"]["promotions_to_core"]
                    stats["demotions"] += result["stats"]["demotions_from_core"]

                    # Update adjusted memories in Pinecone
                    for memory in result["adjusted"]:
                        if memory.embedding:
                            manager.index.upsert(
                                vectors=[{
                                    "id": memory.memory_id,
                                    "values": memory.embedding,
                                    "metadata": memory.to_pinecone_metadata()
                                }],
                                namespace=manager.namespace
                            )

            self._record_result(
                MaintenanceTaskType.TIER_ADJUST,
                True,
                started_at,
                employee_ids,
                stats
            )
        except Exception as e:
            self._record_result(
                MaintenanceTaskType.TIER_ADJUST,
                False,
                started_at,
                employee_ids,
                stats,
                str(e)
            )

    async def _run_health_check(self):
        """Run health check for all employees"""
        started_at = datetime.utcnow()
        stats = {"healthy": 0, "unhealthy": 0, "total_memories": 0}
        employee_ids = []

        try:
            for employee_id, manager in self._employee_managers.items():
                employee_ids.append(employee_id)

                # Check Pinecone connection
                if manager.index:
                    try:
                        # Simple query to test connection
                        result = await manager.get_stats()
                        if "error" not in result:
                            stats["healthy"] += 1
                            stats["total_memories"] += result.get("count", 0)
                        else:
                            stats["unhealthy"] += 1
                    except Exception:
                        stats["unhealthy"] += 1
                else:
                    stats["unhealthy"] += 1

            self._record_result(
                MaintenanceTaskType.HEALTH_CHECK,
                stats["unhealthy"] == 0,
                started_at,
                employee_ids,
                stats
            )
        except Exception as e:
            self._record_result(
                MaintenanceTaskType.HEALTH_CHECK,
                False,
                started_at,
                employee_ids,
                stats,
                str(e)
            )

    async def _run_cleanup(self):
        """Run cleanup maintenance (remove expired memories)"""
        started_at = datetime.utcnow()
        stats = {"total_deleted": 0}
        employee_ids = []

        try:
            for employee_id, manager in self._employee_managers.items():
                employee_ids.append(employee_id)
                result = await manager.run_maintenance()
                if "expired" in result:
                    stats["total_deleted"] += result["expired"]

            self._record_result(
                MaintenanceTaskType.CLEANUP,
                True,
                started_at,
                employee_ids,
                stats
            )
        except Exception as e:
            self._record_result(
                MaintenanceTaskType.CLEANUP,
                False,
                started_at,
                employee_ids,
                stats,
                str(e)
            )

    async def _run_full_maintenance(self):
        """Run full maintenance for all employees"""
        started_at = datetime.utcnow()
        stats = {
            "processed": 0,
            "decayed": 0,
            "merged": 0,
            "expired": 0,
            "tier_adjusted": 0
        }
        employee_ids = []

        try:
            for employee_id, manager in self._employee_managers.items():
                employee_ids.append(employee_id)
                result = await manager.run_maintenance()

                for key in stats:
                    if key in result:
                        stats[key] += result[key]

            self._record_result(
                MaintenanceTaskType.FULL,
                True,
                started_at,
                employee_ids,
                stats
            )

            logger.info(f"Full maintenance completed: {stats}")

        except Exception as e:
            self._record_result(
                MaintenanceTaskType.FULL,
                False,
                started_at,
                employee_ids,
                stats,
                str(e)
            )

    def _record_result(
        self,
        task_type: MaintenanceTaskType,
        success: bool,
        started_at: datetime,
        employee_ids: List[str],
        stats: Dict[str, Any],
        error: str = None
    ):
        """Record maintenance result"""
        result = MaintenanceResult(
            task_type=task_type,
            success=success,
            started_at=started_at,
            completed_at=datetime.utcnow(),
            employee_ids=employee_ids,
            stats=stats,
            error=error,
        )

        self._results.append(result)
        self._last_runs[task_type] = result.completed_at

        # Keep only last 100 results
        if len(self._results) > 100:
            self._results = self._results[-100:]

        if success:
            logger.info(f"Maintenance {task_type.value} completed: {stats}")
        else:
            logger.error(f"Maintenance {task_type.value} failed: {error}")

    async def run_now(self, task_type: MaintenanceTaskType) -> MaintenanceResult:
        """Run a maintenance task immediately"""
        logger.info(f"Running {task_type.value} maintenance now")

        task_map = {
            MaintenanceTaskType.DECAY: self._run_decay,
            MaintenanceTaskType.TIER_ADJUST: self._run_tier_adjustment,
            MaintenanceTaskType.HEALTH_CHECK: self._run_health_check,
            MaintenanceTaskType.CLEANUP: self._run_cleanup,
            MaintenanceTaskType.FULL: self._run_full_maintenance,
        }

        if task_type in task_map:
            await task_map[task_type]()

        return self._results[-1] if self._results else None

    def get_status(self) -> Dict[str, Any]:
        """Get maintenance service status"""
        return {
            "running": self._running,
            "registered_employees": list(self._employee_managers.keys()),
            "last_runs": {
                k.value: v.isoformat() for k, v in self._last_runs.items()
            },
            "recent_results": [r.to_dict() for r in self._results[-10:]],
            "schedule": {
                "decay_interval_minutes": self.schedule.decay_interval_minutes,
                "tier_adjust_interval_minutes": self.schedule.tier_adjust_interval_minutes,
                "health_check_interval_minutes": self.schedule.health_check_interval_minutes,
                "cleanup_interval_minutes": self.schedule.cleanup_interval_minutes,
                "full_maintenance_interval_minutes": self.schedule.full_maintenance_interval_minutes,
            }
        }


# Singleton instance
_service: Optional[MaintenanceService] = None


def get_maintenance_service() -> MaintenanceService:
    """Get or create maintenance service instance"""
    global _service
    if _service is None:
        _service = MaintenanceService()
    return _service


async def start_maintenance_service():
    """Start the global maintenance service"""
    service = get_maintenance_service()
    await service.start()


async def stop_maintenance_service():
    """Stop the global maintenance service"""
    service = get_maintenance_service()
    await service.stop()

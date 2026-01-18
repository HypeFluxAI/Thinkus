"""
Memory Maintenance Scheduler
Background tasks for memory system health:
- Periodic cache cleanup
- Tier adjustment
- Memory deduplication and compression
- Decay application
"""

import os
import logging
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

logger = logging.getLogger(__name__)


class MemoryMaintenanceScheduler:
    """
    Scheduler for periodic memory maintenance tasks
    """

    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self._running = False
        self._managers: Dict[str, Any] = {}  # employee_id -> MemoryManager

    def register_manager(self, employee_id: str, manager: Any):
        """Register a memory manager for scheduled maintenance"""
        self._managers[employee_id] = manager
        logger.info(f"Registered manager for {employee_id}")

    def unregister_manager(self, employee_id: str):
        """Unregister a memory manager"""
        if employee_id in self._managers:
            del self._managers[employee_id]
            logger.info(f"Unregistered manager for {employee_id}")

    def start(self):
        """Start the scheduler"""
        if self._running:
            return

        # Schedule maintenance tasks
        self._schedule_tasks()

        self.scheduler.start()
        self._running = True
        logger.info("Memory maintenance scheduler started")

    def stop(self):
        """Stop the scheduler"""
        if not self._running:
            return

        self.scheduler.shutdown()
        self._running = False
        logger.info("Memory maintenance scheduler stopped")

    def _schedule_tasks(self):
        """Configure scheduled tasks"""

        # Every hour: Cache cleanup
        self.scheduler.add_job(
            self._cleanup_caches,
            trigger=IntervalTrigger(hours=1),
            id="cache_cleanup",
            name="Hourly cache cleanup",
            replace_existing=True
        )

        # Every 6 hours: Tier adjustment
        self.scheduler.add_job(
            self._adjust_tiers,
            trigger=IntervalTrigger(hours=6),
            id="tier_adjustment",
            name="Periodic tier adjustment",
            replace_existing=True
        )

        # Daily at 2 AM: Full maintenance
        self.scheduler.add_job(
            self._run_full_maintenance,
            trigger=CronTrigger(hour=2, minute=0),
            id="daily_maintenance",
            name="Daily full maintenance",
            replace_existing=True
        )

        # Weekly on Sunday at 3 AM: Deduplication
        self.scheduler.add_job(
            self._run_deduplication,
            trigger=CronTrigger(day_of_week="sun", hour=3, minute=0),
            id="weekly_deduplication",
            name="Weekly deduplication",
            replace_existing=True
        )

        logger.info("Scheduled maintenance tasks configured")

    async def _cleanup_caches(self):
        """Clean up expired cache entries"""
        logger.info("Running cache cleanup...")
        stats = {"cleaned": 0, "errors": 0}

        for employee_id, manager in self._managers.items():
            try:
                await manager._ensure_cache()
                # The cache has TTL-based expiration, but we can clear old query caches
                await manager.cache._invalidate_query_caches()
                stats["cleaned"] += 1
            except Exception as e:
                logger.error(f"Cache cleanup failed for {employee_id}: {e}")
                stats["errors"] += 1

        logger.info(f"Cache cleanup complete: {stats}")
        return stats

    async def _adjust_tiers(self):
        """Adjust memory tiers based on usage patterns"""
        logger.info("Running tier adjustment...")
        stats = {"adjusted": 0, "processed": 0, "errors": 0}

        from .tier_adjuster import get_tier_adjuster
        tier_adjuster = get_tier_adjuster()

        for employee_id, manager in self._managers.items():
            try:
                # Get all memories
                memories = await manager.retriever.retrieve("", None, top_k=100)

                if memories:
                    # Run tier adjustment
                    result = tier_adjuster.batch_adjust(memories)
                    stats["adjusted"] += result["stats"]["total_adjusted"]
                    stats["processed"] += result["stats"]["total_processed"]

                    # Update adjusted memories in storage
                    if result["adjusted"]:
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

            except Exception as e:
                logger.error(f"Tier adjustment failed for {employee_id}: {e}")
                stats["errors"] += 1

        logger.info(f"Tier adjustment complete: {stats}")
        return stats

    async def _run_full_maintenance(self):
        """Run full maintenance on all registered managers"""
        logger.info("Running daily full maintenance...")
        stats = {"success": 0, "failed": 0, "results": {}}

        for employee_id, manager in self._managers.items():
            try:
                result = await manager.run_maintenance(None)
                stats["results"][employee_id] = result
                stats["success"] += 1
            except Exception as e:
                logger.error(f"Full maintenance failed for {employee_id}: {e}")
                stats["failed"] += 1

        logger.info(f"Daily maintenance complete: success={stats['success']}, failed={stats['failed']}")
        return stats

    async def _run_deduplication(self):
        """Run deduplication across all managers"""
        logger.info("Running weekly deduplication...")
        stats = {"removed": 0, "merged": 0, "errors": 0}

        from .deduplicator import get_deduplicator
        deduplicator = get_deduplicator()

        for employee_id, manager in self._managers.items():
            try:
                # Get all memories
                memories = await manager.retriever.retrieve("", None, top_k=200)

                if memories:
                    # Run deduplication
                    result = await deduplicator.deduplicate(memories)

                    stats["removed"] += len(result["removed"])
                    stats["merged"] += len(result["merged"])

                    # Delete removed memories
                    if result["removed"]:
                        await manager.batch_delete(result["removed"])

            except Exception as e:
                logger.error(f"Deduplication failed for {employee_id}: {e}")
                stats["errors"] += 1

        logger.info(f"Weekly deduplication complete: {stats}")
        return stats

    async def run_maintenance_now(self, employee_id: Optional[str] = None) -> Dict[str, Any]:
        """Run maintenance immediately (for manual triggering)"""
        if employee_id and employee_id in self._managers:
            manager = self._managers[employee_id]
            return await manager.run_maintenance(None)
        elif not employee_id:
            return await self._run_full_maintenance()
        else:
            return {"error": f"Manager not found for {employee_id}"}

    def get_next_run_times(self) -> Dict[str, str]:
        """Get next scheduled run times for all jobs"""
        run_times = {}
        for job in self.scheduler.get_jobs():
            if job.next_run_time:
                run_times[job.id] = job.next_run_time.isoformat()
            else:
                run_times[job.id] = "Not scheduled"
        return run_times

    def get_job_status(self) -> List[Dict[str, Any]]:
        """Get status of all scheduled jobs"""
        jobs = []
        for job in self.scheduler.get_jobs():
            jobs.append({
                "id": job.id,
                "name": job.name,
                "next_run": job.next_run_time.isoformat() if job.next_run_time else None,
                "trigger": str(job.trigger),
            })
        return jobs


# Singleton instance
_scheduler: Optional[MemoryMaintenanceScheduler] = None


def get_scheduler() -> MemoryMaintenanceScheduler:
    """Get or create the scheduler instance"""
    global _scheduler
    if _scheduler is None:
        _scheduler = MemoryMaintenanceScheduler()
    return _scheduler


def start_scheduler():
    """Start the global scheduler"""
    scheduler = get_scheduler()
    scheduler.start()
    return scheduler


def stop_scheduler():
    """Stop the global scheduler"""
    global _scheduler
    if _scheduler:
        _scheduler.stop()
        _scheduler = None

"""
Prometheus Metrics for Memory System
Provides observability into memory operations
"""

import logging
from typing import Optional
from functools import wraps
import time

from prometheus_client import Counter, Histogram, Gauge, Info, generate_latest, CONTENT_TYPE_LATEST

logger = logging.getLogger(__name__)


# ===================
# Counters
# ===================

# Memory operation counters
memory_operations_total = Counter(
    'thinkus_memory_operations_total',
    'Total memory operations',
    ['operation', 'employee_id', 'status']
)

# Memory save metrics
memory_saves_total = Counter(
    'thinkus_memory_saves_total',
    'Total memory save attempts',
    ['employee_id', 'result']
)

# Memory retrieval metrics
memory_retrievals_total = Counter(
    'thinkus_memory_retrievals_total',
    'Total memory retrieval attempts',
    ['employee_id', 'cache_hit']
)

# Correction events
memory_corrections_total = Counter(
    'thinkus_memory_corrections_total',
    'Total memory corrections applied',
    ['employee_id', 'correction_type']
)

# Deduplication events
memory_deduplications_total = Counter(
    'thinkus_memory_deduplications_total',
    'Total deduplication operations',
    ['employee_id', 'action']
)


# ===================
# Histograms
# ===================

# Retrieval duration
memory_retrieval_duration = Histogram(
    'thinkus_memory_retrieval_duration_seconds',
    'Memory retrieval duration in seconds',
    ['stage', 'employee_id'],
    buckets=[0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0]
)

# Scoring duration
memory_scoring_duration = Histogram(
    'thinkus_memory_scoring_duration_seconds',
    'Memory scoring duration in seconds',
    ['employee_id'],
    buckets=[0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0]
)

# Save duration
memory_save_duration = Histogram(
    'thinkus_memory_save_duration_seconds',
    'Memory save duration in seconds',
    ['employee_id'],
    buckets=[0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
)

# Embedding generation duration
embedding_generation_duration = Histogram(
    'thinkus_embedding_generation_duration_seconds',
    'Embedding generation duration in seconds',
    buckets=[0.05, 0.1, 0.25, 0.5, 1.0, 2.0]
)

# Memory scores
memory_score_distribution = Histogram(
    'thinkus_memory_score',
    'Distribution of memory scores',
    ['dimension'],
    buckets=[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
)


# ===================
# Gauges
# ===================

# Cache size
memory_cache_size = Gauge(
    'thinkus_memory_cache_entries',
    'Current number of cache entries',
    ['employee_id', 'type']
)

# Memory count by tier
memory_count_by_tier = Gauge(
    'thinkus_memory_count_by_tier',
    'Memory count by tier',
    ['employee_id', 'project_id', 'tier']
)

# Memory count by type
memory_count_by_type = Gauge(
    'thinkus_memory_count_by_type',
    'Memory count by type',
    ['employee_id', 'project_id', 'type']
)

# Average confidence
memory_average_confidence = Gauge(
    'thinkus_memory_average_confidence',
    'Average confidence of memories',
    ['employee_id', 'project_id']
)

# Active employees
active_employees = Gauge(
    'thinkus_memory_active_employees',
    'Number of active employee memory managers'
)

# Shared memories count
shared_memories_count = Gauge(
    'thinkus_shared_memories_count',
    'Number of shared memories',
    ['project_id', 'scope']
)


# ===================
# Info Metrics
# ===================

memory_system_info = Info(
    'thinkus_memory_system',
    'Memory system information'
)


# ===================
# Helper Functions
# ===================

def track_operation(operation: str, employee_id: str, status: str = "success"):
    """Track a memory operation"""
    memory_operations_total.labels(
        operation=operation,
        employee_id=employee_id,
        status=status
    ).inc()


def track_save(employee_id: str, result: str):
    """Track a memory save operation"""
    memory_saves_total.labels(
        employee_id=employee_id,
        result=result
    ).inc()


def track_retrieval(employee_id: str, cache_hit: bool):
    """Track a memory retrieval operation"""
    memory_retrievals_total.labels(
        employee_id=employee_id,
        cache_hit=str(cache_hit).lower()
    ).inc()


def track_correction(employee_id: str, correction_type: str):
    """Track a memory correction"""
    memory_corrections_total.labels(
        employee_id=employee_id,
        correction_type=correction_type
    ).inc()


def track_deduplication(employee_id: str, action: str):
    """Track a deduplication action"""
    memory_deduplications_total.labels(
        employee_id=employee_id,
        action=action
    ).inc()


def update_tier_counts(employee_id: str, project_id: str, tier_counts: dict):
    """Update tier count gauges"""
    for tier, count in tier_counts.items():
        memory_count_by_tier.labels(
            employee_id=employee_id,
            project_id=project_id,
            tier=tier
        ).set(count)


def update_type_counts(employee_id: str, project_id: str, type_counts: dict):
    """Update type count gauges"""
    for mem_type, count in type_counts.items():
        memory_count_by_type.labels(
            employee_id=employee_id,
            project_id=project_id,
            type=mem_type
        ).set(count)


def update_cache_stats(employee_id: str, stats: dict):
    """Update cache statistics gauges"""
    for cache_type, count in stats.items():
        if cache_type in ["memory_entries", "query_entries", "core_entries"]:
            memory_cache_size.labels(
                employee_id=employee_id,
                type=cache_type.replace("_entries", "")
            ).set(count)


def record_score(dimension: str, value: float):
    """Record a memory score dimension"""
    memory_score_distribution.labels(dimension=dimension).observe(value)


# ===================
# Decorators
# ===================

def timed_operation(histogram, **labels):
    """Decorator to time an operation"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = await func(*args, **kwargs)
                return result
            finally:
                duration = time.time() - start_time
                histogram.labels(**labels).observe(duration)
        return wrapper
    return decorator


def count_operation(counter, success_label="success", failure_label="failure", **static_labels):
    """Decorator to count operations"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                result = await func(*args, **kwargs)
                counter.labels(**static_labels, status=success_label).inc()
                return result
            except Exception as e:
                counter.labels(**static_labels, status=failure_label).inc()
                raise
        return wrapper
    return decorator


# ===================
# Metrics Registry
# ===================

class MemoryMetrics:
    """
    Central metrics registry for memory system
    """

    def __init__(self):
        self._initialized = False

    def initialize(self, version: str = "1.0.0"):
        """Initialize metrics with system info"""
        if self._initialized:
            return

        memory_system_info.info({
            "version": version,
            "component": "memory_system",
            "service": "py-ai-engine"
        })
        self._initialized = True

    def get_metrics(self) -> bytes:
        """Get all metrics in Prometheus format"""
        return generate_latest()

    def get_content_type(self) -> str:
        """Get content type for Prometheus metrics"""
        return CONTENT_TYPE_LATEST

    def record_retrieval(
        self,
        employee_id: str,
        stage: str,
        duration: float,
        cache_hit: bool = False
    ):
        """Record a retrieval operation"""
        memory_retrieval_duration.labels(
            stage=stage,
            employee_id=employee_id
        ).observe(duration)
        track_retrieval(employee_id, cache_hit)

    def record_save(
        self,
        employee_id: str,
        duration: float,
        candidates_extracted: int,
        memories_saved: int
    ):
        """Record a save operation"""
        memory_save_duration.labels(employee_id=employee_id).observe(duration)

        if memories_saved > 0:
            track_save(employee_id, "saved")
        elif candidates_extracted > 0:
            track_save(employee_id, "filtered")
        else:
            track_save(employee_id, "no_candidates")

    def record_scoring(
        self,
        employee_id: str,
        duration: float,
        score: dict
    ):
        """Record a scoring operation"""
        memory_scoring_duration.labels(employee_id=employee_id).observe(duration)

        # Record individual score dimensions
        for dimension, value in score.items():
            if dimension in ["repeatability", "persistence", "relevance", "decision_value"]:
                record_score(dimension, value)

    def record_embedding(self, duration: float):
        """Record an embedding generation"""
        embedding_generation_duration.observe(duration)

    def update_stats(
        self,
        employee_id: str,
        project_id: str,
        stats: dict
    ):
        """Update gauge metrics from stats"""
        if "tiers" in stats:
            update_tier_counts(employee_id, project_id, stats["tiers"])

        if "types" in stats:
            update_type_counts(employee_id, project_id, stats["types"])

        if "avg_confidence" in stats:
            memory_average_confidence.labels(
                employee_id=employee_id,
                project_id=project_id
            ).set(stats["avg_confidence"])


# Global metrics instance
_metrics: Optional[MemoryMetrics] = None


def get_metrics() -> MemoryMetrics:
    """Get or create metrics instance"""
    global _metrics
    if _metrics is None:
        _metrics = MemoryMetrics()
        _metrics.initialize()
    return _metrics

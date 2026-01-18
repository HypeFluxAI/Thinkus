# Memory management module
# Comprehensive AI Employee Memory System

from .manager import MemoryManager
from .models import (
    Memory,
    MemoryCandidate,
    MemoryType,
    MemoryTier,
    MemoryStatus,
    MemoryScore,
    TokenBudget,
)
from .scorer import MemoryScorer
from .corrector import MemoryCorrector, EvidenceType, EvidenceResult
from .decay import MemoryDecayManager
from .merger import MemoryMerger
from .injector import MemoryInjector
from .retriever import MemoryRetriever, DirectoryEntry
from .budget import MemoryBudgetManager, BudgetAllocation
from .summarizer import SessionSummarizer, SessionSummary
from .cache import MemoryCache, get_cache, close_all_caches
from .shared import SharedMemoryManager, SharedMemoryScope, get_shared_manager
from .deduplicator import SemanticDeduplicator, get_deduplicator
from .tier_adjuster import TierAdjuster, get_tier_adjuster
from .chain import MemoryChainTracker, ChainEvent, ChainEventType, MemoryChain, get_chain_tracker
from .maintenance import (
    MaintenanceService, MaintenanceSchedule, MaintenanceResult, MaintenanceTaskType,
    get_maintenance_service, start_maintenance_service, stop_maintenance_service
)
from .metrics import (
    MemoryMetrics, get_metrics, track_operation, track_save,
    track_retrieval, track_correction
)
from .scheduler import (
    MemoryMaintenanceScheduler, get_scheduler, start_scheduler, stop_scheduler
)
from .compressor import MemoryCompressor, MemoryCluster, get_compressor

__all__ = [
    # Main manager
    "MemoryManager",

    # Data models
    "Memory",
    "MemoryCandidate",
    "MemoryType",
    "MemoryTier",
    "MemoryStatus",
    "MemoryScore",
    "TokenBudget",

    # Subsystems
    "MemoryScorer",
    "MemoryCorrector",
    "EvidenceType",
    "EvidenceResult",
    "MemoryDecayManager",
    "MemoryMerger",
    "MemoryInjector",
    "MemoryRetriever",
    "DirectoryEntry",
    "MemoryBudgetManager",
    "BudgetAllocation",
    "SessionSummarizer",
    "SessionSummary",

    # Cache
    "MemoryCache",
    "get_cache",
    "close_all_caches",

    # Shared Memory
    "SharedMemoryManager",
    "SharedMemoryScope",
    "get_shared_manager",

    # Deduplication
    "SemanticDeduplicator",
    "get_deduplicator",

    # Tier Adjustment
    "TierAdjuster",
    "get_tier_adjuster",

    # Chain Tracking
    "MemoryChainTracker",
    "ChainEvent",
    "ChainEventType",
    "MemoryChain",
    "get_chain_tracker",

    # Maintenance Service
    "MaintenanceService",
    "MaintenanceSchedule",
    "MaintenanceResult",
    "MaintenanceTaskType",
    "get_maintenance_service",
    "start_maintenance_service",
    "stop_maintenance_service",

    # Metrics
    "MemoryMetrics",
    "get_metrics",
    "track_operation",
    "track_save",
    "track_retrieval",
    "track_correction",

    # Scheduler
    "MemoryMaintenanceScheduler",
    "get_scheduler",
    "start_scheduler",
    "stop_scheduler",

    # Compressor
    "MemoryCompressor",
    "MemoryCluster",
    "get_compressor",
]

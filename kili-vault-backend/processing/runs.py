"""
Processing Runs Registry & Manager
Manages tracking, persistence, and lookup of Earth Observation detection runs.
"""

from datetime import datetime
from typing import Dict, Any, List, Optional

_runs_registry: Dict[str, Dict[str, Any]] = {}


def register_run(summary: Dict[str, Any]) -> Dict[str, Any]:
    """Stores a run summary in the memory registry (or database)."""
    run_id = summary["run_id"]
    _runs_registry[run_id] = summary
    return summary


def get_run(run_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves a processing run by ID."""
    return _runs_registry.get(run_id)


def list_runs() -> List[Dict[str, Any]]:
    """Lists all processing runs sorted by start time descending."""
    runs = list(_runs_registry.values())
    runs.sort(key=lambda r: r.get("start_time", ""), reverse=True)
    return runs

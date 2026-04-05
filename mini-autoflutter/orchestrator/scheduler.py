"""Scheduler for selecting the next executable task."""

from __future__ import annotations

from typing import Any, Dict, List, Optional


class Scheduler:
    """Sequential scheduler: picks first pending task with satisfied dependencies."""

    def next_task(self, tasks: List[Dict[str, Any]], state: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        completed = set(state.get("completed_tasks", []))
        failed = set(state.get("failed_tasks", []))

        for task in tasks:
            task_id = task.get("id")
            if not task_id or task_id in completed or task_id in failed:
                continue
            dependencies = set(task.get("depends_on", []))
            if dependencies.issubset(completed):
                return task

        return None

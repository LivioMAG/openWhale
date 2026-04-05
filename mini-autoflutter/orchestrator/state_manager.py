"""State management utilities for Mini-Autoflutter runs."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict


DEFAULT_STATE: Dict[str, Any] = {
    "run_status": "idle",
    "current_task_id": None,
    "completed_tasks": [],
    "failed_tasks": [],
    "task_attempts": {},
    "fix_attempts": {},
    "last_error": None,
    "history": [],
}


class StateManager:
    """Persistent state reader/writer with helper transitions."""

    def __init__(self, state_path: str) -> None:
        self.state_path = Path(state_path)

    def load_or_create(self) -> Dict[str, Any]:
        self.state_path.parent.mkdir(parents=True, exist_ok=True)
        if not self.state_path.exists():
            self.save(DEFAULT_STATE.copy())
            return DEFAULT_STATE.copy()

        with self.state_path.open("r", encoding="utf-8") as handle:
            raw = json.load(handle)
        if not isinstance(raw, dict):
            raw = {}

        merged = DEFAULT_STATE.copy()
        merged.update(raw)
        self.save(merged)
        return merged

    def save(self, state: Dict[str, Any]) -> None:
        with self.state_path.open("w", encoding="utf-8") as handle:
            json.dump(state, handle, indent=2, ensure_ascii=False)

    @staticmethod
    def set_run_status(state: Dict[str, Any], status: str) -> None:
        state["run_status"] = status

    @staticmethod
    def set_current_task(state: Dict[str, Any], task_id: str | None) -> None:
        state["current_task_id"] = task_id

    @staticmethod
    def increment_task_attempt(state: Dict[str, Any], task_id: str) -> int:
        attempts = state.setdefault("task_attempts", {})
        attempts[task_id] = int(attempts.get(task_id, 0)) + 1
        return attempts[task_id]

    @staticmethod
    def set_fix_attempts(state: Dict[str, Any], task_id: str, attempts: int) -> None:
        fix_attempts = state.setdefault("fix_attempts", {})
        fix_attempts[task_id] = attempts

    @staticmethod
    def mark_task_done(state: Dict[str, Any], task_id: str) -> None:
        completed = state.setdefault("completed_tasks", [])
        failed = state.setdefault("failed_tasks", [])
        if task_id not in completed:
            completed.append(task_id)
        if task_id in failed:
            failed.remove(task_id)

    @staticmethod
    def mark_task_failed(state: Dict[str, Any], task_id: str, error: str) -> None:
        failed = state.setdefault("failed_tasks", [])
        if task_id not in failed:
            failed.append(task_id)
        state["last_error"] = error

    @staticmethod
    def add_history_entry(state: Dict[str, Any], task_id: str, status: str, message: str) -> None:
        history = state.setdefault("history", [])
        history.append(
            {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "task_id": task_id,
                "status": status,
                "message": message,
            }
        )

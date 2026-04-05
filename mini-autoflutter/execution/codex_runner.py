"""Codex execution adapter (mock-first implementation target)."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict


@dataclass
class CodexRunResult:
    success: bool
    message: str


class CodexRunner:
    """Mock runner with adapter shape for a future real Codex integration."""

    def __init__(self, mode: str = "mock") -> None:
        self.mode = mode

    def run(self, prompt: str, task: Dict[str, Any], project_path: str) -> CodexRunResult:
        if self.mode != "mock":
            return CodexRunResult(False, f"Unsupported mode '{self.mode}'. Only 'mock' is implemented.")

        task_id = task.get("id", "unknown")
        log_file = Path(project_path) / ".mini_autoflutter_codex.log"
        log_file.parent.mkdir(parents=True, exist_ok=True)
        with log_file.open("a", encoding="utf-8") as handle:
            handle.write(f"[MOCK] task={task_id}\n")
            handle.write(prompt.strip() + "\n")
            handle.write("-" * 60 + "\n")

        return CodexRunResult(True, f"Mock Codex run completed for task {task_id}.")

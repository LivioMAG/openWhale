"""Prompt builder for fixing Flutter analyze/test errors."""

from __future__ import annotations

from typing import Any, Dict


class FixerAgent:
    """Creates prompts for deterministic bug fixing attempts."""

    def build_prompt(
        self,
        task: Dict[str, Any],
        analyze_error: str,
        test_error: str,
        project_path: str,
        attempt: int,
    ) -> str:
        task_id = task.get("id", "unknown")
        title = task.get("title", "Untitled Task")

        return (
            "You are fixing a Flutter project after failed checks.\n\n"
            f"Project path: {project_path}\n"
            f"Task ID: {task_id}\n"
            f"Task title: {title}\n"
            f"Fix attempt: {attempt}\n\n"
            "Goal:\n"
            "- Resolve root causes for flutter analyze and flutter test failures\n"
            "- Keep changes minimal\n"
            "- Do not add unrelated refactors\n\n"
            "Analyze output:\n"
            f"{analyze_error or '(no analyze errors)'}\n\n"
            "Test output:\n"
            f"{test_error or '(no test errors)'}\n"
        )

"""Prompt builder for Flutter implementation tasks."""

from __future__ import annotations

from typing import Any, Dict


class FlutterDevAgent:
    """Creates implementation prompts for a single Flutter task."""

    def build_prompt(self, task: Dict[str, Any], product_spec: Dict[str, Any], project_path: str) -> str:
        product = product_spec.get("product", {})
        task_id = task.get("id", "unknown")
        title = task.get("title", "Untitled Task")
        description = task.get("description", "")
        acceptance = task.get("acceptance_criteria", [])

        acceptance_text = "\n".join(f"- {item}" for item in acceptance) if acceptance else "- Keep implementation minimal and correct"

        return (
            "You are implementing a Flutter project task.\n\n"
            f"Project: {product.get('name', 'Unnamed Project')}\n"
            f"Project path: {project_path}\n"
            f"Task ID: {task_id}\n"
            f"Task title: {title}\n"
            f"Task description: {description}\n\n"
            "Constraints:\n"
            "- Keep code minimal and production-readable\n"
            "- No TODOs, no placeholders\n"
            "- Use Flutter for frontend and Supabase only if backend/auth is needed\n\n"
            "Acceptance criteria:\n"
            f"{acceptance_text}\n"
        )

"""Planner for generating a minimal task graph from product specs."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List

from orchestrator.io_utils import dump_yaml_like, load_yaml_like


class Planner:
    """Creates a deterministic 3-7 step task graph from product spec data."""

    def __init__(self, task_graph_path: str) -> None:
        self.task_graph_path = Path(task_graph_path)

    def ensure_task_graph(self, product_spec_path: str) -> Dict[str, List[Dict[str, Any]]]:
        if self.task_graph_path.exists():
            current = self._load_yaml(self.task_graph_path)
            tasks = current.get("tasks", []) if isinstance(current, dict) else []
            if tasks:
                return current

        product_spec = self._load_yaml(Path(product_spec_path))
        graph = {"tasks": self._generate_tasks(product_spec)}
        dump_yaml_like(self.task_graph_path, graph)
        return graph

    def load_product_spec(self, product_spec_path: str) -> Dict[str, Any]:
        return self._load_yaml(Path(product_spec_path))

    @staticmethod
    def _load_yaml(path: Path) -> Dict[str, Any]:
        if not path.exists():
            return {}
        loaded = load_yaml_like(path)
        return loaded if isinstance(loaded, dict) else {}

    def _generate_tasks(self, product_spec: Dict[str, Any]) -> List[Dict[str, Any]]:
        product = product_spec.get("product", {})
        backend = product.get("backend", {})
        use_supabase = backend.get("provider") == "supabase"

        tasks: List[Dict[str, Any]] = [
            {
                "id": "T1",
                "title": "Initialize Flutter app structure",
                "description": "Ensure base Flutter application structure and clean startup flow.",
                "depends_on": [],
                "acceptance_criteria": [
                    "App starts with a valid MaterialApp",
                    "Project compiles without structural errors",
                ],
            },
            {
                "id": "T2",
                "title": "Implement login UI",
                "description": "Create a minimal login screen with email/password inputs and login action.",
                "depends_on": ["T1"],
                "acceptance_criteria": [
                    "Login screen contains email and password fields",
                    "Login button triggers validation flow",
                ],
            },
            {
                "id": "T3",
                "title": "Connect navigation to home",
                "description": "After successful login flow, navigate to a simple home screen.",
                "depends_on": ["T2"],
                "acceptance_criteria": [
                    "Home screen exists",
                    "Login can route to home with valid inputs",
                ],
            },
        ]

        if use_supabase:
            tasks.append(
                {
                    "id": "T4",
                    "title": "Integrate optional Supabase auth",
                    "description": "Add optional Supabase auth wiring behind simple abstraction.",
                    "depends_on": ["T2"],
                    "acceptance_criteria": [
                        "Supabase auth service can be toggled",
                        "Login flow can call auth service",
                    ],
                }
            )
            tasks.append(
                {
                    "id": "T5",
                    "title": "Polish and stabilize",
                    "description": "Clean up code and verify analyze/test readiness.",
                    "depends_on": ["T3", "T4"],
                    "acceptance_criteria": [
                        "No dead code in modified files",
                        "Code is consistent and readable",
                    ],
                }
            )
        else:
            tasks.append(
                {
                    "id": "T4",
                    "title": "Polish and stabilize",
                    "description": "Clean up code and verify analyze/test readiness.",
                    "depends_on": ["T3"],
                    "acceptance_criteria": [
                        "No dead code in modified files",
                        "Code is consistent and readable",
                    ],
                }
            )

        return tasks

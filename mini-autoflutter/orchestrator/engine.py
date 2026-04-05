"""Core execution engine for Mini-Autoflutter."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List

from agents.fixer_agent import FixerAgent
from agents.flutter_dev_agent import FlutterDevAgent
from execution.codex_runner import CodexRunner
from execution.command_runner import CommandResult, CommandRunner
from orchestrator.planner import Planner
from orchestrator.scheduler import Scheduler
from orchestrator.state_manager import StateManager
from orchestrator.io_utils import load_yaml_like


@dataclass
class EngineConfig:
    project_name: str
    project_path: str
    spec_path: str
    task_graph_path: str
    state_path: str
    analyze_command: str
    test_command: str
    max_fix_attempts: int


class Engine:
    """Coordinates spec planning, task execution, checks, fixes, and state persistence."""

    def __init__(self, repo_root: str, config: EngineConfig) -> None:
        self.repo_root = Path(repo_root)
        self.config = config

        self.project_path = str(self.repo_root / config.project_path)
        self.spec_path = str(self.repo_root / config.spec_path)
        self.task_graph_path = str(self.repo_root / config.task_graph_path)
        self.state_path = str(self.repo_root / config.state_path)

        self.state_manager = StateManager(self.state_path)
        self.planner = Planner(self.task_graph_path)
        self.scheduler = Scheduler()
        self.dev_agent = FlutterDevAgent()
        self.fixer_agent = FixerAgent()
        self.codex_runner = CodexRunner(mode="mock")
        self.command_runner = CommandRunner(self.project_path)

    @classmethod
    def from_yaml(cls, repo_root: str, config_path: str) -> "Engine":
        cfg_path = Path(config_path)
        raw = load_yaml_like(cfg_path) or {}

        commands = raw.get("commands", {})
        config = EngineConfig(
            project_name=raw["project_name"],
            project_path=raw["project_path"],
            spec_path=raw["spec_path"],
            task_graph_path=raw["task_graph_path"],
            state_path=raw["state_path"],
            analyze_command=commands["analyze"],
            test_command=commands["test"],
            max_fix_attempts=int(raw.get("max_fix_attempts", 2)),
        )
        return cls(repo_root=repo_root, config=config)

    def run(self) -> Dict[str, Any]:
        state = self.state_manager.load_or_create()
        StateManager.set_run_status(state, "running")
        self.state_manager.save(state)

        task_graph = self.planner.ensure_task_graph(self.spec_path)
        product_spec = self.planner.load_product_spec(self.spec_path)
        tasks: List[Dict[str, Any]] = task_graph.get("tasks", [])

        task = self.scheduler.next_task(tasks, state)
        if task is None:
            known = set(state.get("completed_tasks", [])) | set(state.get("failed_tasks", []))
            has_unresolved = any(task_item.get("id") not in known for task_item in tasks if task_item.get("id"))
            StateManager.set_run_status(state, "failed" if has_unresolved else "completed")
            StateManager.set_current_task(state, None)
            self.state_manager.save(state)
            return state

        task_id = task["id"]
        StateManager.set_current_task(state, task_id)
        StateManager.increment_task_attempt(state, task_id)
        self.state_manager.save(state)

        prompt = self.dev_agent.build_prompt(task=task, product_spec=product_spec, project_path=self.project_path)
        codex_result = self.codex_runner.run(prompt=prompt, task=task, project_path=self.project_path)
        if not codex_result.success:
            StateManager.mark_task_failed(state, task_id, codex_result.message)
            StateManager.add_history_entry(state, task_id, "failed", codex_result.message)
            StateManager.set_run_status(state, "failed")
            StateManager.set_current_task(state, None)
            self.state_manager.save(state)
            return state

        analyze_result, test_result = self._run_quality_checks()
        if analyze_result.success and test_result.success:
            StateManager.mark_task_done(state, task_id)
            StateManager.set_fix_attempts(state, task_id, 0)
            StateManager.add_history_entry(state, task_id, "done", "Analyze and tests passed on first run.")
            StateManager.set_run_status(state, "running")
            StateManager.set_current_task(state, None)
            self.state_manager.save(state)
            return state

        last_error = self._format_check_errors(analyze_result, test_result)
        fixed = False
        for attempt in range(1, self.config.max_fix_attempts + 1):
            fix_prompt = self.fixer_agent.build_prompt(
                task=task,
                analyze_error=analyze_result.combined_output(),
                test_error=test_result.combined_output(),
                project_path=self.project_path,
                attempt=attempt,
            )
            fix_result = self.codex_runner.run(prompt=fix_prompt, task=task, project_path=self.project_path)
            if not fix_result.success:
                last_error = fix_result.message
                continue

            analyze_result, test_result = self._run_quality_checks()
            if analyze_result.success and test_result.success:
                fixed = True
                StateManager.set_fix_attempts(state, task_id, attempt)
                break

            last_error = self._format_check_errors(analyze_result, test_result)

        if fixed:
            StateManager.mark_task_done(state, task_id)
            StateManager.add_history_entry(state, task_id, "done", "Task passed after fix attempts.")
            StateManager.set_run_status(state, "running")
        else:
            StateManager.mark_task_failed(state, task_id, last_error)
            StateManager.set_fix_attempts(state, task_id, self.config.max_fix_attempts)
            StateManager.add_history_entry(state, task_id, "failed", last_error)
            StateManager.set_run_status(state, "failed")

        StateManager.set_current_task(state, None)
        self.state_manager.save(state)
        return state

    def _run_quality_checks(self) -> tuple[CommandResult, CommandResult]:
        analyze_result = self.command_runner.run(self.config.analyze_command)
        test_result = self.command_runner.run(self.config.test_command)
        return analyze_result, test_result

    @staticmethod
    def _format_check_errors(analyze_result: CommandResult, test_result: CommandResult) -> str:
        return (
            "Quality checks failed.\n"
            f"Analyze ({analyze_result.returncode}):\n{analyze_result.combined_output()}\n\n"
            f"Test ({test_result.returncode}):\n{test_result.combined_output()}"
        )

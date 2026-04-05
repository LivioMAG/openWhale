"""Command execution utilities for analysis and test commands."""

from __future__ import annotations

import subprocess
from dataclasses import dataclass
from pathlib import Path


@dataclass
class CommandResult:
    command: str
    returncode: int
    stdout: str
    stderr: str

    @property
    def success(self) -> bool:
        return self.returncode == 0

    def combined_output(self) -> str:
        text = (self.stdout + "\n" + self.stderr).strip()
        return text


class CommandRunner:
    """Runs shell commands sequentially in a target project directory."""

    def __init__(self, project_dir: str, timeout_seconds: int = 300) -> None:
        self.project_dir = Path(project_dir)
        self.timeout_seconds = timeout_seconds

    def run(self, command: str) -> CommandResult:
        completed = subprocess.run(
            command,
            cwd=self.project_dir,
            shell=True,
            text=True,
            capture_output=True,
            timeout=self.timeout_seconds,
            check=False,
        )
        return CommandResult(
            command=command,
            returncode=completed.returncode,
            stdout=completed.stdout,
            stderr=completed.stderr,
        )

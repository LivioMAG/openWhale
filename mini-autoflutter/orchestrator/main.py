"""Entry point for Mini-Autoflutter orchestration."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from orchestrator.engine import Engine


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Mini-Autoflutter orchestrator")
    parser.add_argument(
        "--config",
        default="configs/framework.yaml",
        help="Path to framework config file",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    repo_root = Path(__file__).resolve().parents[1]
    config_path = repo_root / args.config

    engine = Engine.from_yaml(repo_root=str(repo_root), config_path=str(config_path))
    state = engine.run()

    print(json.dumps(state, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

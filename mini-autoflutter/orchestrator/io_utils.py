"""Utilities for reading/writing YAML-like files with stdlib fallback.

The project stores JSON documents in `.yaml` files so no external dependency is required.
If PyYAML is installed, it is used transparently as well.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


try:
    import yaml  # type: ignore
except ModuleNotFoundError:  # pragma: no cover - optional dependency
    yaml = None


def load_yaml_like(path: Path) -> Any:
    if not path.exists():
        return {}
    text = path.read_text(encoding="utf-8").strip()
    if not text:
        return {}

    if yaml is not None:
        loaded = yaml.safe_load(text)
        return {} if loaded is None else loaded

    return json.loads(text)


def dump_yaml_like(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if yaml is not None:
        rendered = yaml.safe_dump(data, sort_keys=False, allow_unicode=True)
    else:
        rendered = json.dumps(data, indent=2, ensure_ascii=False)
    path.write_text(rendered, encoding="utf-8")

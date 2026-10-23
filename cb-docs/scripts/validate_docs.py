#!/usr/bin/env python3
"""Validate executable-looking documentation examples without running them."""

from __future__ import annotations

import json
import re
from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]
FENCE = re.compile(
    r"^```(?P<language>[A-Za-z0-9_-]+)[^\n]*\n(?P<body>.*?)^```[ \t]*$",
    re.MULTILINE | re.DOTALL,
)


def validate_markdown() -> tuple[int, int]:
    python_blocks = 0
    yaml_blocks = 0

    for path in sorted((ROOT / "docs").rglob("*.md")):
        text = path.read_text(encoding="utf-8")
        for index, match in enumerate(FENCE.finditer(text), start=1):
            language = match.group("language").lower()
            body = match.group("body")
            label = f"{path.relative_to(ROOT)} fenced block {index}"

            if language in {"python", "py"}:
                compile(body, label, "exec")
                python_blocks += 1
            elif language in {"yaml", "yml"}:
                list(yaml.safe_load_all(body))
                yaml_blocks += 1

    return python_blocks, yaml_blocks


def validate_notebooks() -> tuple[int, int]:
    notebooks = 0
    code_cells = 0

    for path in sorted((ROOT / "docs").rglob("*.ipynb")):
        notebook = json.loads(path.read_text(encoding="utf-8"))
        if notebook.get("nbformat") != 4 or not isinstance(notebook.get("cells"), list):
            raise ValueError(f"{path.relative_to(ROOT)} is not a valid v4 notebook")

        notebooks += 1
        for index, cell in enumerate(notebook["cells"], start=1):
            cell_type = cell.get("cell_type")
            if cell_type not in {"code", "markdown", "raw"}:
                raise ValueError(
                    f"{path.relative_to(ROOT)} cell {index} has an invalid type"
                )
            if not isinstance(cell.get("metadata"), dict):
                raise ValueError(
                    f"{path.relative_to(ROOT)} cell {index} has invalid metadata"
                )
            if not isinstance(cell.get("source"), (str, list)):
                raise ValueError(
                    f"{path.relative_to(ROOT)} cell {index} has invalid source"
                )

            if cell_type != "code":
                continue

            if "execution_count" not in cell or not isinstance(cell.get("outputs"), list):
                raise ValueError(
                    f"{path.relative_to(ROOT)} code cell {index} is incomplete"
                )

            source = "".join(cell.get("source", []))
            # IPython magics are valid notebook syntax but not Python syntax.
            python_source = "\n".join(
                f"# {line}" if line.lstrip().startswith(("%", "!")) else line
                for line in source.splitlines()
            )
            compile(
                python_source,
                f"{path.relative_to(ROOT)} code cell {index}",
                "exec",
            )
            code_cells += 1

    return notebooks, code_cells


def main() -> None:
    python_blocks, yaml_blocks = validate_markdown()
    notebooks, code_cells = validate_notebooks()
    print(
        "Validated "
        f"{python_blocks} Python blocks, {yaml_blocks} YAML blocks, "
        f"and {code_cells} code cells across {notebooks} notebook(s)."
    )


if __name__ == "__main__":
    main()

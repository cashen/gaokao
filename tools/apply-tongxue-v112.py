#!/usr/bin/env python3
"""Apply the v1.1.2 performance-only shell patch while preserving user-facing copy."""

from pathlib import Path
import re

path = Path("tongxue.html")
text = path.read_text(encoding="utf-8")

text = text.replace("同学你好 v1.1.1 · 更新于 2026-07-19", "同学你好 v1.1.2 · 更新于 2026-07-19")
if "content-visibility:auto;contain-intrinsic-size:320px" not in text:
    text = text.replace(
        ".review-card{display:flex;",
        ".review-card{content-visibility:auto;contain-intrinsic-size:320px;display:flex;",
        1,
    )

external_script = '<script type="module" src="/tongxue-performance-v112.js"></script>'
if external_script not in text:
    script_pattern = re.compile(r'<script type="module">[\s\S]*?</script>', re.I)
    text, replacements = script_pattern.subn(external_script, text, count=1)
    if replacements != 1:
        raise SystemExit(f"Expected one inline module script or existing external script, replaced {replacements}")

if "同学你好 v1.1.1" in text:
    raise SystemExit("Old page version remains")
if "同学你好 v1.1.2 · 更新于 2026-07-19" not in text:
    raise SystemExit("New page version missing")
if external_script not in text:
    raise SystemExit("External runtime reference missing")
if '<script type="module">' in text:
    raise SystemExit("Old inline runtime remains")
if "content-visibility:auto;contain-intrinsic-size:320px" not in text:
    raise SystemExit("Review layout optimization missing")

path.write_text(text, encoding="utf-8")
print("Tongxue v1.1.2 performance shell is current")

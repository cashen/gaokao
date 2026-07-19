#!/usr/bin/env python3
"""Apply the v1.1.2 performance-only shell patch while preserving user-facing copy."""

from pathlib import Path
import re

path = Path("tongxue.html")
text = path.read_text(encoding="utf-8")
original = text

text = text.replace("同学你好 v1.1.1 · 更新于 2026-07-19", "同学你好 v1.1.2 · 更新于 2026-07-19")
text = text.replace(
    ".review-card{display:flex;",
    ".review-card{content-visibility:auto;contain-intrinsic-size:320px;display:flex;",
    1,
)

script_pattern = re.compile(r'<script type="module">[\s\S]*?</script>', re.I)
text, replacements = script_pattern.subn(
    '<script type="module" src="/tongxue-performance-v112.js"></script>',
    text,
    count=1,
)

if replacements != 1:
    raise SystemExit(f"Expected one inline module script, replaced {replacements}")
if text == original:
    raise SystemExit("Tongxue shell was not changed")
if "同学你好 v1.1.1" in text:
    raise SystemExit("Old page version remains")
if '<script type="module" src="/tongxue-performance-v112.js"></script>' not in text:
    raise SystemExit("External runtime reference missing")

path.write_text(text, encoding="utf-8")
print("Applied Tongxue v1.1.2 performance shell patch")

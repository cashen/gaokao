#!/usr/bin/env python3
"""Apply the v1.1.2 performance-only shell and verifier migration idempotently."""

# This migration remains idempotent so generated-artifact commits can be verified again.
from pathlib import Path
import re

page_path = Path("tongxue.html")
text = page_path.read_text(encoding="utf-8")

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
page_path.write_text(text, encoding="utf-8")

verifier_path = Path("tools/verify-tongxue-live.mjs")
verifier = verifier_path.read_text(encoding="utf-8")
old_check = "hasAccessibilitySupport: html.includes('aria-activedescendant') && html.includes('liveStatus') && html.includes('prefers-reduced-motion'),"
new_check = "hasAccessibilitySupport: runtime.includes('aria-activedescendant') && html.includes('liveStatus') && html.includes('prefers-reduced-motion'),"
verifier = verifier.replace(old_check, new_check)
if new_check not in verifier:
    raise SystemExit("External-runtime accessibility verifier migration missing")
verifier_path.write_text(verifier, encoding="utf-8")

print("Tongxue v1.1.2 performance shell and verifier are current")

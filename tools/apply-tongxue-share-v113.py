#!/usr/bin/env python3
"""Apply the Tongxue v1.1.3 share shell migration idempotently."""
from pathlib import Path

path = Path("tongxue.html")
text = path.read_text(encoding="utf-8")
text = text.replace("同学你好 v1.1.2 · 更新于 2026-07-19", "同学你好 v1.1.3 · 更新于 2026-07-19")
text = text.replace(
    '<script type="module" src="/tongxue-performance-v112.js"></script>',
    '<script type="module" src="/tongxue-performance-v113.js"></script>',
)
if "同学你好 v1.1.2" in text:
    raise SystemExit("Old Tongxue page version remains")
if "同学你好 v1.1.3 · 更新于 2026-07-19" not in text:
    raise SystemExit("Tongxue v1.1.3 footer missing")
if '<script type="module" src="/tongxue-performance-v113.js"></script>' not in text:
    raise SystemExit("Tongxue v1.1.3 runtime reference missing")
path.write_text(text, encoding="utf-8")
print("Tongxue v1.1.3 share shell is current")

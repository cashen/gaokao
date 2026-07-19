#!/usr/bin/env python3
"""Apply the Tongxue v1.1.3 share shell and verifier migration idempotently."""
from pathlib import Path
import subprocess

page_path = Path("tongxue.html")
text = page_path.read_text(encoding="utf-8")
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
page_path.write_text(text, encoding="utf-8")

verifier_path = Path("tools/verify-tongxue-live.mjs")
verifier = verifier_path.read_text(encoding="utf-8")
verifier = verifier.replace(
    "const runtime = await readFile('tongxue-performance-v112.js', 'utf8');",
    "const runtime = await readFile('tongxue-performance-v112.js', 'utf8');\nconst runtime113 = await readFile('tongxue-performance-v113.js', 'utf8');\nconst shareRuntime = await readFile('tongxue-share-v113.js', 'utf8');",
)
verifier = verifier.replace(
    "version112: html.includes('同学你好 v1.1.2') && runtime.includes(\"const PAGE_VERSION='v1.1.2'\"),",
    "version113: html.includes('同学你好 v1.1.3') && runtime.includes(\"const PAGE_VERSION='v1.1.2'\") && runtime113.includes(\"pageVersion: 'v1.1.3'\"),",
)
verifier = verifier.replace(
    "externalRuntime: html.includes('<script type=\"module\" src=\"/tongxue-performance-v112.js\"></script>') && !html.includes('<script type=\"module\">'),",
    "externalRuntime: html.includes('<script type=\"module\" src=\"/tongxue-performance-v113.js\"></script>') && runtime113.includes('/tongxue-performance-v112.js?v=113') && !html.includes('<script type=\"module\">'),\n  hasShareWorkflow: shareRuntime.includes('生成分享图') && shareRuntime.includes('navigator.share') && shareRuntime.includes('完整评论长图'),",
)
required = [
    "const runtime113 = await readFile('tongxue-performance-v113.js', 'utf8');",
    "version113:",
    "hasShareWorkflow:",
]
if not all(item in verifier for item in required):
    raise SystemExit("Tongxue v1.1.3 verifier migration incomplete")
verifier_path.write_text(verifier, encoding="utf-8")
if Path('.git').exists():
    subprocess.run(['git', 'add', str(verifier_path)], check=True)
print("Tongxue v1.1.3 share shell and verifier are current")

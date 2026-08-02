#!/usr/bin/env python3
"""Run the preserved full LN release verifier against the current generation.

The historical verifier contains the complete data, algorithm, page and
resource-budget assertions. This adapter changes only the public/current
release identity and current-generation owner paths; stable business resource
versions remain unchanged in the repository contracts.
"""
from pathlib import Path

source_path = Path(__file__).with_name("verify-final-release-v3970.py")
source = source_path.read_text(encoding="utf-8")
replacements = (
    ("v3.9.72.5", "v3.9.72.6"),
    ("v3972_5", "v3972_6"),
    ("3972_5", "3972_6"),
)
for old, new in replacements:
    source = source.replace(old, new)

remaining = [token for token in ("v3.9.72.5", "v3972_5", "3972_5") if token in source]
if remaining:
    raise SystemExit(f"current release compatibility replacement incomplete: {remaining}")

namespace = {
    "__name__": "__main__",
    "__file__": str(source_path),
    "__package__": None,
}
exec(compile(source, str(source_path), "exec"), namespace)

#!/usr/bin/env python3
from pathlib import Path

path = Path(__file__).resolve().parents[2] / 'tools/ln-2026/build-release.py'
source = path.read_text(encoding='utf-8')

helper = r'''

def load_rank_population_from_module(year: int, score: int) -> int:
    """Read cumulative rank at a score from the canonical yearly JS module."""
    module = ROOT / f"functions/_lib/ln-{year}-physics-score-rank.js"
    text = module.read_text(encoding="utf-8")
    rows = []
    rows_match = re.search(r"const ROWS=(\[.*?\]);", text, re.S)
    if rows_match:
        rows = json.loads(rows_match.group(1))
    else:
        raw_match = re.search(r"const RAW_ROWS = `([\s\S]*?)`;", text)
        if raw_match:
            for line in raw_match.group(1).strip().splitlines():
                parts = [part.strip() for part in line.split(',')]
                if len(parts) == 3 and all(re.fullmatch(r"\d+", part) for part in parts):
                    rows.append([int(parts[0]), int(parts[1]), int(parts[2])])
    for row in rows:
        if int(row[0]) == int(score):
            return int(row[2])
    raise RuntimeError(f"rank population missing: {year} score {score}")
'''

if 'def load_rank_population_from_module' not in source:
    marker = '\n\ndef build_all():'
    if marker not in source:
        raise SystemExit('build_all marker missing')
    source = source.replace(marker, helper + marker)

old = '''    total2026 = rank_map[150]
    total2025 = max((int(r.get("rank2025") or 0) for r in old), default=0)
    total2024 = max((int(r.get("rank2024") or 0) for r in old), default=0)'''
new = '''    # One cross-year population definition: official cumulative position at
    # each year's undergraduate control line. Admission-record maximum rank is
    # never a population source.
    total2024 = load_rank_population_from_module(2024, 368)
    total2025 = load_rank_population_from_module(2025, 367)
    total2026 = rank_map[344]'''
if old in source:
    source = source.replace(old, new)
elif new not in source:
    raise SystemExit('three-year population block missing')

path.write_text(source, encoding='utf-8')
print('patched three-year undergraduate population policy')

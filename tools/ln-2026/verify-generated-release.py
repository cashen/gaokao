#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

ROOT = Path(os.environ['GITHUB_WORKSPACE']) if os.environ.get('GITHUB_WORKSPACE') else Path(__file__).resolve().parents[2]
errors = []


def check(condition, message):
    if not condition:
        errors.append(message)


rank = json.loads((ROOT / 'fenxi/data/rank_2026_physics.json').read_text(encoding='utf-8'))
for score, expected in {'708': 10, '700': 41, '600': 14235, '508': 49824, '344': 119069, '150': 141691}.items():
    check(rank.get(score) == expected, f'rank anchor {score}: {rank.get(score)} != {expected}')

manifest = json.loads((ROOT / 'fenxi/data/ln-rank-2026/manifest.json').read_text(encoding='utf-8'))
check(manifest.get('dataYear') == 2026, 'manifest dataYear')
check(manifest.get('audienceYear') == 2027, 'manifest audienceYear')
check(manifest.get('totalRecords') == 11628, 'manifest totalRecords')
check(manifest.get('schoolCount') == 956, 'manifest schoolCount')
check(manifest.get('historyMatch', {}).get('exact') == 8929, 'manifest exact history count')
check(manifest.get('historyMatch', {}).get('unmatched') == 2699, 'manifest unmatched history count')

count = 0
for chunk in manifest.get('chunks', []):
    path = ROOT / 'fenxi' / chunk['file']
    check(path.exists(), f'missing chunk {path}')
    if path.exists():
        payload = json.loads(path.read_text(encoding='utf-8'))
        rows = payload if isinstance(payload, list) else payload.get('records', [])
        check(len(rows) == chunk['recordCount'], f'chunk count mismatch {chunk["id"]}')
        count += len(rows)
check(count == 11628, f'chunk total {count}')

analysis = json.loads((ROOT / 'analysis/2026/overall-summary.json').read_text(encoding='utf-8'))
check(analysis.get('version') == 'three-year-2024-2026-centered-v1.0.0', 'centered analysis version')
check(analysis.get('strictCompleteCount') == 6553, 'three-year strict sample count')
check(sum(analysis.get('trendCounts', {}).values()) == 6553, 'three-year trend count sum')
policy = analysis.get('policy', {})
check(policy.get('rankComparison') == '累计位次比例扣除年度共同位移后的相对变化', 'centered rank comparison method')
check(0.5 <= float(policy.get('neutralThresholdPctPoint', 0)) <= 1.5, 'centered neutral threshold')

for page in ('ln2026.html', 'lngk2026.html'):
    page_text = (ROOT / page).read_text(encoding='utf-8')
    check('v3.9.51.0' in page_text, f'{page} product version missing')
    check('2024—2026' in page_text or '2024、2025、2026' in page_text, f'{page} three-year copy missing')
    check('年度共同位移' in page_text, f'{page} centered method copy missing')
    check('不承诺录取结果' in page_text, f'{page} result boundary missing')
    for bad in ('保证录取', '稳录', '必报', '一定上涨', '冷门捡漏', '就业一定更好'):
        check(bad not in page_text, f'{page} forbidden copy: {bad}')

rank_module = (ROOT / 'functions/_lib/ln-2026-physics-score-rank.js').read_text(encoding='utf-8')
check('lookupLn2026PhysicsScore' in rank_module, '2026 rank module export')
check('findLn2026PhysicsScoreByRank' in rank_module, '2026 rank reverse lookup export')

if errors:
    print('\n'.join('ERROR: ' + error for error in errors), file=sys.stderr)
    sys.exit(1)
print(json.dumps({'ok': True, 'records': count, 'strictCompleteCount': analysis['strictCompleteCount'], 'analysisVersion': analysis['version']}, ensure_ascii=False))

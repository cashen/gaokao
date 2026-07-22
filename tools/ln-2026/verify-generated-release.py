#!/usr/bin/env python3
import json, os, re, sys
from pathlib import Path
ROOT=Path(os.environ.get('GITHUB_WORKSPACE', Path(__file__).resolve().parents[2]))
errors=[]
def check(cond,msg):
    if not cond: errors.append(msg)
rank=json.loads((ROOT/'fenxi/data/rank_2026_physics.json').read_text(encoding='utf-8'))
for s,v in {'708':10,'700':41,'600':14235,'508':49824,'344':119069,'150':141691}.items(): check(rank.get(s)==v,f'rank anchor {s}: {rank.get(s)} != {v}')
manifest=json.loads((ROOT/'fenxi/data/ln-rank-2026/manifest.json').read_text(encoding='utf-8'))
check(manifest.get('totalRecords')==11628,'manifest totalRecords')
check(manifest.get('schoolCount')==956,'manifest schoolCount')
count=0
for c in manifest.get('chunks',[]):
    p=ROOT/'fenxi'/c['file']
    check(p.exists(),f'missing chunk {p}')
    if p.exists():
        data=json.loads(p.read_text(encoding='utf-8')); rows=data.get('records',data if isinstance(data,list) else [])
        check(len(rows)==c['recordCount'],f'chunk count mismatch {c["id"]}')
        count+=len(rows)
check(count==11628,f'chunk total {count}')
analysis=json.loads((ROOT/'analysis/2026/overall-summary.json').read_text(encoding='utf-8'))
check(analysis.get('strictCompleteCount',0)>=1000,'three-year strict sample too small')
for f,version in [('ln2026.html','ln2026-analysis-v1.0.0'),('lngk2026.html','lngk2026-heat-v1.0.0')]:
    text=(ROOT/f).read_text(encoding='utf-8')
    check(version in text,f'{f} footer version missing')
    check('2024—2026' in text or '2024、2025、2026' in text,f'{f} three-year copy missing')
    for bad in ['保证录取','稳录','必报','一定上涨','冷门捡漏','就业一定更好']:
        check(bad not in text,f'{f} forbidden copy: {bad}')
js=(ROOT/'functions/_lib/ln-2026-physics-score-rank.js').read_text(encoding='utf-8')
check('lookupLn2026PhysicsScore' in js,'2026 rank module export')
if errors:
    print('\n'.join('ERROR: '+e for e in errors),file=sys.stderr);sys.exit(1)
print(json.dumps({'ok':True,'records':count,'strictCompleteCount':analysis['strictCompleteCount']},ensure_ascii=False))

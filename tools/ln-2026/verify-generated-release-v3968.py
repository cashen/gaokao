#!/usr/bin/env python3
from __future__ import annotations
import json, os, sys
from pathlib import Path

ROOT = Path(os.environ['GITHUB_WORKSPACE']) if os.environ.get('GITHUB_WORKSPACE') else Path(__file__).resolve().parents[2]
errors=[]
def check(condition,message):
    if not condition: errors.append(message)

rank=json.loads((ROOT/'fenxi/data/rank_2026_physics.json').read_text(encoding='utf-8'))
for score,expected in {'708':10,'700':41,'600':14235,'508':49824,'344':119069,'150':141691}.items(): check(rank.get(score)==expected,f'rank anchor {score}: {rank.get(score)} != {expected}')
manifest=json.loads((ROOT/'fenxi/data/ln-rank-2026/manifest.json').read_text(encoding='utf-8'))
for key,value in {'dataYear':2026,'audienceYear':2027,'totalRecords':11628,'schoolCount':956}.items(): check(manifest.get(key)==value,f'manifest {key}')
check(manifest.get('historyMatch',{}).get('exact')==8929,'manifest exact history count')
check(manifest.get('historyMatch',{}).get('unmatched')==2699,'manifest unmatched history count')
count=0
for chunk in manifest.get('chunks',[]):
    path=ROOT/'fenxi'/chunk['file'];check(path.exists(),f'missing chunk {path}')
    if path.exists():
        payload=json.loads(path.read_text(encoding='utf-8'))
        rows=payload if isinstance(payload,list) else payload.get('records',[])
        check(len(rows)==chunk['recordCount'],f'chunk count mismatch {chunk["id"]}')
        count+=len(rows)
check(count==11628,f'chunk total {count}')

analysis=json.loads((ROOT/'analysis/2026/overall-summary.json').read_text(encoding='utf-8'))
check(analysis.get('version')=='three-year-2024-2026-centered-v1.0.0','centered analysis version')
check(analysis.get('strictCompleteCount')==6553,'three-year strict sample count')
check(sum(analysis.get('trendCounts',{}).values())==6553,'three-year trend count sum')
policy=analysis.get('policy',{})
check(policy.get('rankComparison')=='累计位次比例扣除年度共同位移后的相对变化','centered rank comparison method')
check(.5<=float(policy.get('neutralThresholdPctPoint',0))<=1.5,'centered neutral threshold')

unified=(ROOT/'ln2026.html').read_text(encoding='utf-8')
redirect=(ROOT/'lngk2026.html').read_text(encoding='utf-8')
check('data-current-release' in unified and '当前发布：' in unified,'unified page shared release presentation')
check('2024—2026' in unified,'unified page three-year copy')
check('相比多数专业，更难报了' in unified and '相比多数专业，更容易报了' in unified,'human difficulty copy')
check('不承诺录取结果' in unified,'result boundary')
check('/ln2026.html#score-band' in redirect,'legacy score-band redirect')
check('major-difficulty-2026.v3968_0.js' in unified,'difficulty current UI orchestration wrapper')
check('major-difficulty-2026.v3967_0.js' not in unified and 'major-difficulty-2026.v3966_0.js' not in unified and 'major-difficulty-2026.v3965_0.js' not in unified,'difficulty legacy wrapper must not remain active')

difficulty_wrapper=(ROOT/'ln-rank/js/major-difficulty-2026.v3968_0.js').read_text(encoding='utf-8')
check('major-difficulty-2026-core.v3967_0.js' in difficulty_wrapper,'governed score-band core behind current UI wrapper')
check('shared/resources/release/release-presenter.v3968_0.js?v=3968_0' in difficulty_wrapper,'difficulty shared release presenter')
check('shared/ui/shell/family-shell.v3965_0.js?v=3965_0' in difficulty_wrapper,'difficulty current shared UI shell')
release_presenter=(ROOT/'shared/resources/release/release-presenter.v3968_0.js').read_text(encoding='utf-8')
check('current-release.js?v=3968_0' in release_presenter,'difficulty current shared release owner')
check((ROOT/'ln-rank/js/major-difficulty-2026.v3967_0.js').exists(),'difficulty previous immutable wrapper preserved')
check((ROOT/'ln-rank/js/major-difficulty-2026.v3966_0.js').exists(),'difficulty older immutable wrapper preserved')
check((ROOT/'shared/ui/shell/family-shell.v3964_1.js').exists(),'difficulty previous immutable shell preserved')
for bad in ('保证录取','稳录','必报','一定上涨','冷门捡漏','就业一定更好','专业投档热度观察','相对全体前移','相对全体后移'):
    check(bad not in unified,f'unified page forbidden copy: {bad}')

zy=json.loads((ROOT/'data/zy2026/summary.json').read_text(encoding='utf-8'))
audit=json.loads((ROOT/'analysis/2026/zy2026-audit.json').read_text(encoding='utf-8'))
check(zy.get('productVersion')=='v3.9.53.0','zy2026 data product version')
check(zy.get('records2026')==11628,'zy2026 record count')
check(10000<=int(zy.get('records2025',0))<=12000,'zy2026 2025 count')
check(zy.get('recordDelta')==zy.get('records2026')-zy.get('records2025'),'zy2026 delta')
check(audit.get('coverage',{}).get('records2025')==audit.get('coverage',{}).get('assigned2025'),'zy2026 2025 coverage')
check(audit.get('coverage',{}).get('records2026')==audit.get('coverage',{}).get('assigned2026'),'zy2026 2026 coverage')

rank_module=(ROOT/'functions/_lib/ln-2026-physics-score-rank.js').read_text(encoding='utf-8')
for export in ('lookupLn2026PhysicsScore','lookupLn2026PhysicsRank','getLn2026PhysicsRows'):
    check(export in rank_module,f'2026 rank export {export}')

for page,scope in [('ln-rank/local-mainline.html','liaoning'),('ln-rank/211-mainline.html','211')]:
    text=(ROOT/page).read_text(encoding='utf-8')
    check('academic-background-app.v3968_0.js?v=3968_0' in text,f'{page} unified background runtime')
    check(f'data-background-scope="{scope}"' in text,f'{page} scope')
    check('2025' in text and '2024' in text,f'{page} three-year history copy')
    check('背景证据' in text and '来源年份' in text,f'{page} evidence year copy')
    check('local-mainline-app.v3967_0.js' not in text and '211-mainline-app.v3951_0.js' not in text,f'{page} legacy runtime')

if errors:
    print('\n'.join('ERROR: '+error for error in errors),file=sys.stderr)
    sys.exit(1)
print(json.dumps({
    'ok':True,
    'records':count,
    'strictCompleteCount':analysis['strictCompleteCount'],
    'analysisVersion':analysis['version'],
    'releasePresentation':'shared-current-release-v3968_0',
    'academicBackgroundScopes':['liaoning','211'],
    'zyRelations':zy.get('relations')
},ensure_ascii=False))

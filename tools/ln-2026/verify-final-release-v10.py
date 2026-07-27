#!/usr/bin/env python3
from pathlib import Path
import json,re,sys

ROOT=Path(__file__).resolve().parents[2]
errors=[]
def text(rel):
 p=ROOT/rel
 if not p.exists(): errors.append(f'missing {rel}'); return ''
 return p.read_text(encoding='utf-8')
def require(cond,msg):
 if not cond: errors.append(msg)

current=text('shared/resources/release/current-release.js')
for marker in ["display: 'v3.9.67.0'","assetVersion: 'v3967_0'","resourceExecutionVersion: 'resource-execution-v3967_0'","algorithmOrchestrationVersion: 'algorithm-orchestration-v3967'","historyEvidenceVersion: 'ln-physics-history-evidence-v3967_0'"]:
 require(marker in current,f'current release missing {marker}')

required=[
 'shared/governance/resource-execution-contract.v3967_0.js','shared/governance/derived-asset-trace.v3967_0.json',
 'shared/ui/component-registry.v3967_0.js','shared/resources/trends/liaoning-major-trend.v3967_0.js',
 'shared/algorithms/ranking/result-ranking.v3967_0.js','shared/algorithms/trend/trend-interpretation.v3967_0.js',
 'shared/algorithms/position/historical-rank-selection.v3967_0.js','shared/resources/auxiliary/liaoning-key-subjects.v3967_0.js',
 'shared/resources/release/runtime-cache-contract.v3967_0.js','shared/resources/release/release-presenter.v3967_0.js',
 'ln-rank/css/ln-rank-workspace.v3967_0.css','ln-rank/css/school-all-mode.v3967_0.css','ln-rank/css/history-evidence.v3967_0.css',
 'ln-rank/js/app.v3967_0.js','ln-rank/js/app-runtime.v3967_0.js',
 'ln-rank/js/workspace/selection-workspace-orchestrator.v3967_0.js','ln-rank/js/workspace/result-commit.v3967_0.js','ln-rank/js/workspace/family-card-presenter.v3967_0.js',
 'ln-rank/js/feature/major-pool/index.v3967_0.js',
 'ln-rank/js/feature/major-pool/render.v3967_0.js','ln-rank/js/feature/major-pool/history-score-render.v3967_0.js',
 'ln-rank/js/feature/school-majors/school-all-mode.v3967_0.js',
 'ln-rank/js/feature/selection-pool/index.v3967_0.js','ln-rank/js/feature/selection-pool/store.v3967_0.js','ln-rank/js/feature/selection-pool/analysis.v3967_0.js','ln-rank/js/feature/selection-pool/controller.v3967_0.js',
 'ln-rank/js/feature/report/payload-builder.v3967_0.js','ln-rank/js/feature/feishu/index.v3967_0.js','ln-rank/js/feature/feishu/report-controller.v3967_0.js',
 'ln-rank/js/feature/diagnose/api.v3967_0.js','ln-rank/js/feature/diagnose/controller.v3967_0.js','ln-rank/js/local-mainline/local-mainline-app.v3967_0.js',
 'ln-rank/js/selection-pool.v3967_0.js',
 'ln-rank/js/selection-pool-runtime.v3967_0.js','ln-rank/js/major-difficulty-2026.v3967_0.js',
 'ln-rank/js/major-difficulty-2026-core.v3967_0.js','tools/audit-resource-execution-v3967.mjs',
 'tools/audit-css-component-isolation-v3967.mjs','tools/audit-algorithm-parity-v3967.mjs',
 'tools/build-derived-asset-trace-v3967.mjs','tools/audit-derived-assets-v3967.mjs','tools/audit-report-execution-v3967.mjs','tools/browser-resource-execution-v3967.mjs',
 'tools/ln-2026/verify-generated-release-v3967.py'
]
for rel in required: require((ROOT/rel).exists(),f'missing required {rel}')

index=text('ln-rank/index.html'); selected=text('ln-rank/selection-pool.html'); trend=text('ln2026.html'); auxiliary=text('just_for_liaoning.html')
require('ln-rank-workspace.v3967_0.css?v=3967_0' in index,'main workspace css not active')
require('school-all-mode.v3967_0.css?v=3967_0' in index,'school component css not active')
require('history-evidence.v3967_0.css?v=3967_0' in index,'main history css not active')
require('app.v3967_0.js?v=3967_0' in index,'main bootstrap not active')
require('selection-pool.v3967_0.js?v=3967_0' in selected,'selection bootstrap not active')
require('major-difficulty-2026.v3967_0.js?v=3967_0' in trend,'trend wrapper not active')
require('liaoning-key-subjects.v3967_0.js?v=3967_0' in auxiliary,'auxiliary resource owner not active')
require('historical-rank-selection.v3967_0.js?v=3967_0' in auxiliary,'auxiliary algorithm owner not active')
require('<script type="module">' in auxiliary,'auxiliary page is not module-governed')
for rel,src in [('ln-rank/index.html',index),('ln-rank/selection-pool.html',selected),('index.html',text('index.html'))]:
 require('v3.9.67.0' in src,f'{rel} release display stale')

presenter=text('ln-rank/js/feature/major-pool/history-score-render.v3967_0.js')
for forbidden in ['history-score--appendix','class="history-score','class="history-evidence']:
 require(forbidden not in presenter,f'presenter legacy class {forbidden}')
require('class="ln-history-evidence' in presenter,'new history namespace missing')
css=text('ln-rank/css/history-evidence.v3967_0.css')
require('container-name:ln-history-evidence' in css,'history container owner missing')
require('@container ln-history-evidence' in css,'history container queries missing')
require('@container school-all-results' not in css,'stale container name remains')

major=text('functions/api/major-bands.js'); school=text('functions/api/school-majors.js')
require('result-ranking.v3967_0.js' in major and 'result-ranking.v3967_0.js' in school,'shared ranking owner not used by both APIs')
require('141691' not in major,'major API still hardcodes total population')
require('function compareRecords(' not in school,'school API still owns comparator')

active=json.loads(text('ln-rank/active-assets.json') or '{}')
require(active.get('version')=='v3.9.67.0','active version mismatch')
require(active.get('assetVersion')=='v3967_0','active asset mismatch')
require(active.get('resourceExecutionVersion')=='resource-execution-v3967_0','active execution mismatch')
for forbidden in ['js/workspace/result-commit.v3961_0.js','js/workspace/family-card-presenter.v3961_0.js','js/feature/selection-pool/store.v3963_1.js','js/feature/report/payload-builder.v3966_0.js','js/feature/feishu/index.v3966_0.js','js/local-mainline/local-mainline-app.v3951_0.js']:
 require(forbidden not in active.get('jsEntry',[]),f'legacy active owner {forbidden}')
for required_css in ['css/ln-rank-workspace.v3967_0.css','css/school-all-mode.v3967_0.css','css/history-evidence.v3967_0.css']:
 require(required_css in active.get('cssEntry',[]),f'active css missing owner {required_css}')
for rel in active.get('jsEntry',[]):
 path=(ROOT/rel[3:]) if rel.startswith('../') else ROOT/'ln-rank'/rel
 require(path.exists(),f'active js missing {rel}')
for rel in active.get('cssEntry',[]):
 path=(ROOT/rel[3:]) if rel.startswith('../') else ROOT/'ln-rank'/rel
 require(path.exists(),f'active css missing {rel}')

for stale in ['.github/workflows/bootstrap-release-v3966.yml','.github/workflows/bootstrap-v3966-snapshot.yml','.github/workflows/prepare-v3965.yml','tools/run-release-v3966.txt','tools/run-v3966-snapshot.txt']:
 require(not (ROOT/stale).exists(),f'stale self-mutating release mechanism {stale}')

contract=text('functions/_lib/release-contract.js')
require('export const LN_RANK_RELEASE_CONTRACT' in contract,'LN release export missing')
require('export const RELEASE_CONTRACT = LN_RANK_RELEASE_CONTRACT' in contract,'compat release export missing')
for flag in ['resourceExecutionCenterContract','exclusiveResourceConsumptionContract','derivedAssetTraceContract','resultRankingSingleOwnerContract','trendInterpretationSingleOwnerContract','cssComponentIsolationContract','componentGeometryRegressionContract','auxiliaryHistoricalRankSelectionSingleOwnerContract','standaloneAuxiliaryResourceAdapterContract','reportPayloadCanonicalHistoryContract','noSelfMutatingReleaseWorkflowContract']:
 require(f'{flag}: true' in contract,f'release flag missing {flag}')

if errors:
 print('\n'.join(f'ERROR: {e}' for e in errors),file=sys.stderr)
 sys.exit(1)
print(json.dumps({'ok':True,'version':'v3.9.67.0','requiredFiles':len(required),'activeJs':len(active.get('jsEntry',[])),'activeCss':len(active.get('cssEntry',[]))},ensure_ascii=False,indent=2))

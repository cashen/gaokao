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
for marker in [
 "display: 'v3.9.68.0'",
 "assetVersion: 'v3968_0'",
 "resourceExecutionVersion: 'resource-execution-v3968_0'",
 "algorithmOrchestrationVersion: 'algorithm-orchestration-v3968'",
 "historyEvidenceVersion: 'ln-physics-history-evidence-v3967_0'",
 "academicBackgroundVersion: 'academic-background-v3968_0'",
 "academicBackgroundProviderVersion: 'academic-background-provider-v3968_0'"
]: require(marker in current,f'current release missing {marker}')

required=[
 'shared/governance/resource-execution-contract.v3968_0.js','shared/governance/derived-asset-trace.v3968_0.json',
 'shared/ui/component-registry.v3967_0.js','shared/resources/trends/liaoning-major-trend.v3967_0.js',
 'shared/algorithms/ranking/result-ranking.v3967_0.js','shared/algorithms/trend/trend-interpretation.v3967_0.js',
 'shared/algorithms/position/historical-rank-selection.v3967_0.js','shared/resources/auxiliary/liaoning-key-subjects.v3967_0.js',
 'shared/algorithms/background/academic-background-matcher.v3968_0.js',
 'shared/resources/background/academic-background-contract.v3968_0.js',
 'shared/resources/background/academic-background-source-registry.v3968_0.js',
 'shared/resources/release/runtime-cache-contract.v3968_0.js','shared/resources/release/release-presenter.v3968_0.js',
 'ln-rank/css/ln-rank-workspace.v3967_0.css','ln-rank/css/school-all-mode.v3967_0.css','ln-rank/css/history-evidence.v3967_0.css','ln-rank/css/academic-background.v3968_0.css',
 'ln-rank/js/app.v3968_0.js','ln-rank/js/app-runtime.v3968_0.js','ln-rank/js/selection-pool.v3968_0.js',
 'ln-rank/js/workspace/selection-workspace-orchestrator.v3967_0.js','ln-rank/js/workspace/result-commit.v3967_0.js','ln-rank/js/workspace/family-card-presenter.v3967_0.js',
 'ln-rank/js/feature/major-pool/index.v3967_0.js','ln-rank/js/feature/major-pool/render.v3967_0.js','ln-rank/js/feature/major-pool/history-score-render.v3967_0.js',
 'ln-rank/js/feature/school-majors/school-all-mode.v3967_0.js',
 'ln-rank/js/feature/selection-pool/index.v3967_0.js','ln-rank/js/feature/selection-pool/store.v3967_0.js','ln-rank/js/feature/selection-pool/analysis.v3967_0.js','ln-rank/js/feature/selection-pool/controller.v3967_0.js',
 'ln-rank/js/feature/report/payload-builder.v3967_0.js','ln-rank/js/feature/feishu/index.v3967_0.js','ln-rank/js/feature/feishu/report-controller.v3967_0.js',
 'ln-rank/js/feature/diagnose/api.v3967_0.js','ln-rank/js/feature/diagnose/controller.v3967_0.js',
 'ln-rank/js/academic-background/academic-background-app.v3968_0.js',
 'ln-rank/js/selection-pool-runtime.v3967_0.js','ln-rank/js/major-difficulty-2026.v3968_0.js','ln-rank/js/major-difficulty-2026-core.v3967_0.js',
 'zy2026/assets/zy2026.v3968_0.js','tongxue/app/tongxue-runtime-v159-r3968.js',
 'functions/_lib/academic-background-provider.js','functions/_lib/academic-background-api.js',
 'functions/api/academic-background.js','functions/api/local-mainline.js','functions/api/211-mainline.js',
 'tools/audit-resource-execution-v3968.mjs','tools/audit-academic-background-v3968.mjs','tools/audit-three-year-rank-evidence-v3968.mjs',
 'tools/audit-css-component-isolation-v3967.mjs','tools/audit-algorithm-parity-v3967.mjs',
 'tools/build-derived-asset-trace-v3968.mjs','tools/audit-derived-assets-v3968.mjs','tools/audit-report-execution-v3967.mjs',
 'tools/browser-resource-execution-v3967.mjs','tools/browser-academic-background-v3968.mjs',
 'tools/ln-2026/verify-generated-release-v3968.py'
]
for rel in required: require((ROOT/rel).exists(),f'missing required {rel}')

index=text('ln-rank/index.html'); selected=text('ln-rank/selection-pool.html'); trend=text('ln2026.html'); auxiliary=text('just_for_liaoning.html')
require('ln-rank-workspace.v3967_0.css?v=3967_0' in index,'main workspace css not active')
require('school-all-mode.v3967_0.css?v=3967_0' in index,'school component css not active')
require('history-evidence.v3967_0.css?v=3967_0' in index,'main history css not active')
require('app.v3968_0.js?v=3968_0' in index,'main bootstrap not active')
require('selection-pool.v3968_0.js?v=3968_0' in selected,'selection bootstrap not active')
require('major-difficulty-2026.v3968_0.js?v=3968_0' in trend,'trend wrapper not active')
require('liaoning-key-subjects.v3967_0.js?v=3967_0' in auxiliary,'auxiliary resource owner not active')
require('historical-rank-selection.v3967_0.js?v=3967_0' in auxiliary,'auxiliary algorithm owner not active')
require('release-presenter.v3968_0.js?v=3968_0' in auxiliary,'auxiliary release owner not active')
require('<script type="module">' in auxiliary,'auxiliary page is not module-governed')
for rel,src in [('ln-rank/index.html',index),('ln-rank/selection-pool.html',selected),('index.html',text('index.html'))]:
 require('v3.9.68.0' in src,f'{rel} release display stale')

presenter=text('ln-rank/js/feature/major-pool/history-score-render.v3967_0.js')
for forbidden in ['history-score--appendix','class="history-score','class="history-evidence']:
 require(forbidden not in presenter,f'presenter legacy class {forbidden}')
require('class="ln-history-evidence' in presenter,'new history namespace missing')
css=text('ln-rank/css/history-evidence.v3967_0.css')
require('container-name:ln-history-evidence' in css,'history container owner missing')
require('@container ln-history-evidence' in css,'history container queries missing')
require('@container school-all-results' not in css,'stale container name remains')
background_css=text('ln-rank/css/academic-background.v3968_0.css')
require('container-name: academic-background-record' in background_css,'background container owner missing')
require('@container academic-background-record' in background_css,'background container query missing')

major=text('functions/api/major-bands.js'); school=text('functions/api/school-majors.js')
require('result-ranking.v3967_0.js' in major and 'result-ranking.v3967_0.js' in school,'shared ranking owner not used by both APIs')
require('141691' not in major,'major API still hardcodes total population')
require('function compareRecords(' not in school,'school API still owns comparator')

for page,scope in [('ln-rank/local-mainline.html','liaoning'),('ln-rank/211-mainline.html','211')]:
 src=text(page)
 require(f'data-background-scope="{scope}"' in src,f'{page} scope missing')
 require('academic-background-app.v3968_0.js?v=3968_0' in src,f'{page} shared runtime missing')
 require('academic-background.v3968_0.css?v=3968_0' in src,f'{page} shared CSS missing')
 require('release-presenter.v3968_0.js?v=3968_0' in src,f'{page} release presenter missing')
 require('2025' in src and '2024' in src,f'{page} three-year copy missing')
 require('背景证据' in src and '来源年份' in src,f'{page} evidence year distinction missing')
 require('local-mainline-app.v3967_0.js' not in src and '211-mainline-app.v3951_0.js' not in src,f'{page} legacy runtime active')

for rel,scope in [('functions/api/local-mainline.js','liaoning'),('functions/api/211-mainline.js','211')]:
 src=text(rel)
 require('handleAcademicBackgroundRequest' in src,f'{rel} does not delegate')
 require(f"'{scope}'" in src,f'{rel} scope adapter missing')
 require('score2025' not in src and 'loadBackgroundMatchedRecords' not in src,f'{rel} still owns old business logic')

active=json.loads(text('ln-rank/active-assets.json') or '{}')
require(active.get('version')=='v3.9.68.0','active version mismatch')
require(active.get('assetVersion')=='v3968_0','active asset mismatch')
require(active.get('resourceExecutionVersion')=='resource-execution-v3968_0','active execution mismatch')
require(active.get('academicBackgroundOfficialSourceGateContract') is True,'background official source gate missing')
require(active.get('academicBackgroundEvidenceYearSeparateContract') is True,'background evidence year separation missing')
require(active.get('academicBackgroundScopes')==['liaoning','211'],'background scopes mismatch')
for forbidden in [
 'js/app.v3967_0.js','js/app-runtime.v3967_0.js','js/selection-pool.v3967_0.js',
 'js/local-mainline/local-mainline-app.v3967_0.js','js/211-mainline/211-mainline-app.v3951_0.js',
 '../shared/governance/resource-execution-contract.v3967_0.js','../shared/resources/release/release-presenter.v3967_0.js','../shared/resources/release/runtime-cache-contract.v3967_0.js'
]: require(forbidden not in active.get('jsEntry',[]),f'legacy active owner {forbidden}')
for required_css in ['css/ln-rank-workspace.v3967_0.css','css/school-all-mode.v3967_0.css','css/history-evidence.v3967_0.css','css/academic-background.v3968_0.css']:
 require(required_css in active.get('cssEntry',[]),f'active css missing owner {required_css}')
for rel in active.get('jsEntry',[]):
 p=(ROOT/rel[3:]) if rel.startswith('../') else ROOT/'ln-rank'/rel
 require(p.exists(),f'active js missing {rel}')
for rel in active.get('cssEntry',[]):
 p=(ROOT/rel[3:]) if rel.startswith('../') else ROOT/'ln-rank'/rel
 require(p.exists(),f'active css missing {rel}')

for stale in [
 '.github/workflows/bootstrap-release-v3966.yml','.github/workflows/bootstrap-v3966-snapshot.yml','.github/workflows/prepare-v3965.yml',
 '.github/workflows/materialize-v3968-release.yml','.github/workflows/materialize-v3968-release-commit-first.yml',
 '.github/workflows/diagnose-v3968-audit.yml','.github/workflows/patch-v3968-background-year-copy.yml',
 '.github/workflows/patch-v3968-background-year-copy-commit-first.yml','.github/workflows/patch-v3968-three-year-gate.yml',
 '.github/workflows/write-v3968-derived-trace.yml','.github/workflows/verify-v3968-development.yml',
 'v3968-audit-diagnostic.txt','tools/run-release-v3966.txt','tools/run-v3966-snapshot.txt'
]: require(not (ROOT/stale).exists(),f'stale self-mutating release mechanism {stale}')

contract=text('functions/_lib/release-contract.js')
require('export const LN_RANK_RELEASE_CONTRACT' in contract,'LN release export missing')
require('export const RELEASE_CONTRACT = LN_RANK_RELEASE_CONTRACT' in contract,'compat release export missing')
for flag in [
 'resourceExecutionCenterContract','exclusiveResourceConsumptionContract','derivedAssetTraceContract','resultRankingSingleOwnerContract',
 'trendInterpretationSingleOwnerContract','cssComponentIsolationContract','componentGeometryRegressionContract',
 'auxiliaryHistoricalRankSelectionSingleOwnerContract','standaloneAuxiliaryResourceAdapterContract','reportPayloadCanonicalHistoryContract',
 'noSelfMutatingReleaseWorkflowContract','academicBackgroundSingleOwnerContract','academicBackgroundOfficialSourceGateContract',
 'academicBackgroundEvidenceYearSeparateContract','academicBackgroundLegacyInputOnlyContract','academicBackgroundUnifiedScopeContract',
 'academicBackgroundThreeYearAdmissionEvidenceContract','academicBackgroundRankDistancePrimaryContract'
]: require(f'{flag}: true' in contract,f'release flag missing {flag}')

if errors:
 print('\n'.join(f'ERROR: {e}' for e in errors),file=sys.stderr)
 sys.exit(1)
print(json.dumps({'ok':True,'version':'v3.9.68.0','requiredFiles':len(required),'activeJs':len(active.get('jsEntry',[])),'activeCss':len(active.get('cssEntry',[])),'backgroundScopes':active.get('academicBackgroundScopes')},ensure_ascii=False,indent=2))

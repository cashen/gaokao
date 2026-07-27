#!/usr/bin/env python3
from pathlib import Path
import json,sys,re
ROOT=Path(__file__).resolve().parents[2]
errors=[]
def text(rel):
 p=ROOT/rel
 if not p.exists(): errors.append(f'missing {rel}'); return ''
 return p.read_text(encoding='utf-8')
def require(condition,message):
 if not condition: errors.append(message)

current=text('shared/resources/release/current-release.js')
for marker in [
 "display: 'v3.9.70.0'", "assetVersion: 'v3970_0'", "resourceExecutionVersion: 'resource-execution-v3970_0'",
 "uiOrchestrationVersion: 'ui-orchestration-v3970_0'", "uiComponentExecutionVersion: 'ui-component-execution-v3970_0'",
 "familyActionVersion: 'family-action-v3970_0'", "schoolQueryVersion: 'school-query-contract-v3969_0'",
 "schoolAdmissionDirectoryVersion: 'liaoning-2026-admission-school-directory-v3969_0'"
]: require(marker in current,f'current release missing {marker}')

required=[
 'shared/governance/resource-execution-contract.v3970_0.js','shared/governance/derived-asset-trace.v3970_0.json',
 'shared/resources/release/runtime-cache-contract.v3970_0.js','shared/resources/release/release-presenter.v3970_0.js',
 'shared/ui/ui-registry.v3970_0.js','shared/ui/component-registry.v3970_0.js',
 'shared/ui/contracts/action-contract.v3970_0.js','shared/ui/contracts/copy-contract.v3970_0.js','shared/ui/contracts/state-contract.v3970_0.js',
 'shared/ui/shell/family-shell.v3970_0.js','shared/ui/shell/family-shell.v3970_0.css',
 'shared/ui/components/family-plan-entry.v3970_0.js','shared/ui/components/family-plan-entry.v3970_0.css',
 'ln-rank/js/app.v3970_0.js','ln-rank/js/app-runtime.v3970_0.js','ln-rank/js/selection-pool.v3970_0.js',
 'ln-rank/js/domain/family-decision-contract.v3970_0.js','ln-rank/js/domain/family-plan-copy-adapter.v3970_0.js',
 'tools/audit-family-action-v3970.mjs','tools/audit-school-query-v3970.mjs','tools/browser-family-action-v3970.mjs',
 'shared/resources/schools/school-query-contract.v3969_0.js','shared/resources/schools/school-query-engine.v3969_0.js',
 'shared/resources/schools/liaoning-2026-admission-school-directory.v3969_0.json'
]
for rel in required: require((ROOT/rel).exists(),f'missing required {rel}')

index=text('ln-rank/index.html'); selection=text('ln-rank/selection-pool.html')
for marker in ['data-release="v3.9.70.0"','app.v3970_0.js?v=3970_0','data-ui-family-plan-results-footer','data-ui-family-plan-live','加入家庭方案']:
 require(marker in index,f'main missing {marker}')
for marker in ['data-release="v3.9.70.0"','selection-pool.v3970_0.js?v=3970_0','生成家庭方案报告','知道链接的人可以查看']:
 require(marker in selection,f'selection missing {marker}')
for forbidden in ['data-ui-mobile-action-mount','selectionPoolShell','poolResultStickyMount','已选 0 个 · 去整理','还没选专业 · 回到结果继续看']:
 require(forbidden not in index,f'old mobile action remains in main: {forbidden}')

shell=text('shared/ui/shell/family-shell.v3970_0.js'); shell_css=text('shared/ui/shell/family-shell.v3970_0.css'); component_css=text('shared/ui/components/family-plan-entry.v3970_0.css')
for forbidden in ['ensureMobileAction','ui-mobile-context-visible','data-ui-mobile-selection']:
 require(forbidden not in shell+shell_css,f'old shell owner remains: {forbidden}')
for forbidden in ['position:fixed','position: fixed','position:sticky','position: sticky','bottom:','z-index:']:
 require(forbidden not in component_css,f'family plan entry overlays content: {forbidden}')

active=json.loads(text('ln-rank/active-assets.json') or '{}'); meta=json.loads(text('ln-rank/release-meta.json') or '{}')
for payload,name in [(active,'active'),(meta,'meta')]:
 require(payload.get('version')=='v3.9.70.0',f'{name} version mismatch')
 require(payload.get('assetVersion')=='v3970_0',f'{name} asset mismatch')
 require(payload.get('familyActionSingleOwnerContract') is True,f'{name} family owner')
 require(payload.get('familyPlanEntryDocumentFlowContract') is True,f'{name} document flow')
 require(payload.get('noFixedMobileFamilyPlanActionContract') is True,f'{name} fixed action')
 require(payload.get('feishuPublicSharePreservedContract') is True,f'{name} public share')
for rel in ['js/app.v3970_0.js','js/app-runtime.v3970_0.js','js/selection-pool.v3970_0.js','../shared/ui/components/family-plan-entry.v3970_0.js','js/domain/family-plan-copy-adapter.v3970_0.js']:
 require(rel in active.get('jsEntry',[]),f'active entry missing {rel}')
for rel in ['../shared/ui/shell/family-shell.v3970_0.css','../shared/ui/components/family-plan-entry.v3970_0.css']:
 require(rel in active.get('cssEntry',[]),f'active css missing {rel}')

contract=text('functions/_lib/release-contract.js')
for marker in ['familyActionSingleOwnerContract: true','familyPlanEntryDocumentFlowContract: true','noFixedMobileFamilyPlanActionContract: true','feishuPublicSharePreservedContract: true','export const LN_RANK_RELEASE_CONTRACT','export const RELEASE_CONTRACT = LN_RANK_RELEASE_CONTRACT']:
 require(marker in contract,f'release contract missing {marker}')

admission=json.loads(text('shared/resources/schools/liaoning-2026-admission-school-directory.v3969_0.json') or '{}')
require(admission.get('admissionRecordCount')==11628,'admission record count mismatch')
require(int(admission.get('schoolCount',0))>=900,'admission school count too small')

if errors:
 print('\n'.join('ERROR: '+error for error in errors),file=sys.stderr); sys.exit(1)
print(json.dumps({'ok':True,'version':'v3.9.70.0','requiredFiles':len(required),'admissionSchools':admission.get('schoolCount'),'admissionRecords':admission.get('admissionRecordCount')},ensure_ascii=False,indent=2))

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

def header_block(headers,path):
 match=re.search(rf'(?m)^{re.escape(path)}\n((?:  .*(?:\n|$))+)',headers)
 return match.group(1) if match else ''

current=text('shared/resources/release/current-release.js')
for marker in [
 "display: 'v3.9.71.0'", "version: 'v3.9.71.0'", "assetVersion: 'v3970_0'", "assetReleaseVersion: 'v3.9.70.0'",
 "homeEntryVersion: 'home-industry-map-entry-v3970_1'", "resourceExecutionVersion: 'resource-execution-v3970_0'",
 "uiOrchestrationVersion: 'ui-orchestration-v3970_0'", "uiComponentExecutionVersion: 'ui-component-execution-v3970_0'",
 "familyActionVersion: 'family-action-v3970_0'", "schoolQueryVersion: 'school-query-contract-v3969_0'",
 "schoolAdmissionDirectoryVersion: 'liaoning-2026-admission-school-directory-v3969_0'",
 "homeStructure: '/index.html'", "homeRuntime: '/ln-rank/js/ux/family-home.v3970_0.js'",
 "homeIndustryMapEntry: '/index.html#[data-home-industry-map-entry]'", "industryMap: '/Public_company/'",
 "localStrengthVersion: 'local-strength-v3971_0'", "localStrengthPage: '/ln-rank/local-mainline.html'"
]: require(marker in current,f'current release missing {marker}')

required=[
 'index.html','_headers','Public_company/index.html','ln-rank/js/ux/family-home.v3970_0.js',
 'shared/governance/resource-execution-contract.v3970_0.js','shared/governance/derived-asset-trace.v3970_0.json',
 'shared/resources/release/runtime-cache-contract.v3970_0.js','shared/resources/release/release-presenter.v3970_0.js',
 'shared/resources/release/release-presenter.v3971_0.js',
 'shared/ui/ui-registry.v3970_0.js','shared/ui/component-registry.v3970_0.js',
 'shared/ui/contracts/action-contract.v3970_0.js','shared/ui/contracts/copy-contract.v3970_0.js','shared/ui/contracts/state-contract.v3970_0.js',
 'shared/ui/shell/family-shell.v3970_0.js','shared/ui/shell/family-shell.v3970_0.css',
 'shared/ui/components/family-plan-entry.v3970_0.js','shared/ui/components/family-plan-entry.v3970_0.css',
 'ln-rank/js/app.v3970_0.js','ln-rank/js/app-runtime.v3970_0.js','ln-rank/js/selection-pool.v3970_0.js',
 'ln-rank/js/domain/family-decision-contract.v3970_0.js','ln-rank/js/domain/family-plan-copy-adapter.v3970_0.js',
 'ln-rank/local-mainline.html','ln-rank/js/local-strength/local-strength-app.v3971_0.js','ln-rank/css/local-strength.v3971_0.css',
 'functions/api/local-strength.js','functions/_lib/local-strength-api.js',
 'tools/audit-family-action-v3970.mjs','tools/audit-home-release-ownership-v3970.mjs','tools/audit-school-query-v3970.mjs',
 'tools/browser-family-action-v3970.mjs','tools/browser-home-release-v3970.mjs',
 'shared/resources/schools/school-query-contract.v3969_0.js','shared/resources/schools/school-query-engine.v3969_0.js',
 'shared/resources/schools/liaoning-2026-admission-school-directory.v3969_0.json',
 '.github/workflows/verify-home-release-v3970.yml','.github/workflows/verify-production-release-v3970.yml'
]
for rel in required: require((ROOT/rel).exists(),f'missing required {rel}')

home=text('index.html'); home_runtime=text('ln-rank/js/ux/family-home.v3970_0.js')
for marker in ['data-release="v3.9.71.0"','family-shell.v3970_0.css?v=3970_0','family-plan-entry.v3970_0.css?v=3970_0','family-home.v3970_0.js?v=3970_0','家庭方案与逐项复核','data-home-industry-map-entry','href="/Public_company/"','全国上市公司产业落地图']:
 require(marker in home,f'home missing {marker}')
require(home.count('data-home-industry-map-entry')==1,'home industry map entry must have one owner')
for forbidden in ['family-home.v3968_0.js','family-shell.v3965_0.js','data-release="v3.9.68.0"','v3.9.68.0']:
 require(forbidden not in home,f'stale home resource remains: {forbidden}')
for marker in ['release-presenter.v3970_0.js?v=3970_0','family-shell.v3970_0.js?v=3970_0','family-decision-contract.v3970_0.js?v=3970_0',"HOME_RUNTIME_VERSION = 'family-home-runtime-v3970_0'",'gaokao:selection-change']:
 require(marker in home_runtime,f'home runtime missing {marker}')
require('MutationObserver' not in home_runtime,'home runtime must not self-observe DOM')

local_strength=text('ln-rank/local-mainline.html')
for marker in ['data-release="v3.9.71.0"','local-strength.v3971_0.css?v=3971_0','local-strength-app.v3971_0.js?v=3971_0','release-presenter.v3971_0.js?v=3971_0','全部背景专业','按学校查询','按分数位置看']:
 require(marker in local_strength,f'local strength page missing {marker}')

headers=text('_headers')
for page in ['/','/index.html']:
 block=header_block(headers,page)
 require(block,f'headers missing {page}')
 require('Cache-Control: no-cache, max-age=0, must-revalidate' in block,f'{page} must revalidate')
home_header=header_block(headers,'/ln-rank/js/ux/family-home.v3970_0.js')
require(home_header,'headers missing v3970 home runtime')
require('Cache-Control: public, max-age=31536000, immutable' in home_header,'home runtime must be immutable')
for asset in ['/shared/ui/shell/family-shell.v3970_0.js','/shared/ui/shell/family-shell.v3970_0.css','/shared/ui/components/family-plan-entry.v3970_0.js','/shared/ui/components/family-plan-entry.v3970_0.css']:
 block=header_block(headers,asset)
 require(block,f'headers missing {asset}')
 require('immutable' in block,f'{asset} must be immutable')

index=text('ln-rank/index.html'); selection=text('ln-rank/selection-pool.html')
for marker in ['data-release="v3.9.70.0"','app.v3970_0.js?v=3970_0','data-ui-family-plan-results-footer','data-ui-family-plan-live','加入家庭方案']:
 require(marker in index,f'main asset shell missing {marker}')
for marker in ['data-release="v3.9.70.0"','selection-pool.v3970_0.js?v=3970_0','生成家庭方案报告','知道链接的人可以查看']:
 require(marker in selection,f'selection asset shell missing {marker}')
for forbidden in ['data-ui-mobile-action-mount','selectionPoolShell','poolResultStickyMount','已选 0 个 · 去整理','还没选专业 · 回到结果继续看']:
 require(forbidden not in index,f'old mobile action remains in main: {forbidden}')

shell=text('shared/ui/shell/family-shell.v3970_0.js'); shell_css=text('shared/ui/shell/family-shell.v3970_0.css'); component_css=text('shared/ui/components/family-plan-entry.v3970_0.css')
for forbidden in ['ensureMobileAction','ui-mobile-context-visible','data-ui-mobile-selection']:
 require(forbidden not in shell+shell_css,f'old shell owner remains: {forbidden}')
for forbidden in ['position:fixed','position: fixed','position:sticky','position: sticky','bottom:','z-index:']:
 require(forbidden not in component_css,f'family plan entry overlays content: {forbidden}')

active=json.loads(text('ln-rank/active-assets.json') or '{}'); meta=json.loads(text('ln-rank/release-meta.json') or '{}')
for payload,name in [(active,'active'),(meta,'meta')]:
 require(payload.get('version')=='v3.9.70.0',f'{name} asset-lineage version mismatch')
 require(payload.get('assetVersion')=='v3970_0',f'{name} asset mismatch')
 for flag in ['familyActionSingleOwnerContract','familyPlanEntryDocumentFlowContract','noFixedMobileFamilyPlanActionContract','feishuPublicSharePreservedContract','homeReleaseSingleOwnerContract','homeStaticRuntimeParityContract','homeCurrentShellContract','productionReleaseVerificationContract']:
  require(payload.get(flag) is True,f'{name} flag missing {flag}')
 require(payload.get('familyHomeJs')=='js/ux/family-home.v3970_0.js',f'{name} home owner mismatch')
 require('../index.html' in payload.get('html',[]),f'{name} root home missing')
for rel in ['js/ux/family-home.v3970_0.js','js/app.v3970_0.js','js/app-runtime.v3970_0.js','js/selection-pool.v3970_0.js','../shared/ui/components/family-plan-entry.v3970_0.js','js/domain/family-plan-copy-adapter.v3970_0.js']:
 require(rel in active.get('jsEntry',[]),f'active entry missing {rel}')
require('js/ux/family-home.v3968_0.js' not in active.get('jsEntry',[]),'old home remains active')
for rel in ['../shared/ui/shell/family-shell.v3970_0.css','../shared/ui/components/family-plan-entry.v3970_0.css']:
 require(rel in active.get('cssEntry',[]),f'active css missing {rel}')

cache=text('shared/resources/release/runtime-cache-contract.v3970_0.js')
for marker in ["home: '/ln-rank/js/ux/family-home.v3970_0.js?v=3970_0'","home: '/ln-rank/js/ux/family-home.v3970_0.js'",'/ln-rank/js/ux/family-home.v3970_0.js','homeReleaseOwnershipRequired: true','productionReleaseVerificationRequired: true']:
 require(marker in cache,f'cache contract missing {marker}')
require('/ln-rank/js/ux/family-home.v3968_0.js' not in cache,'old home remains in cache contract')

execution=text('shared/governance/resource-execution-contract.v3970_0.js')
for marker in ["home: entry({","owner: '/ln-rank/js/ux/family-home.v3970_0.js'","structureOwner: '/index.html'",'/tools/audit-home-release-ownership-v3970.mjs']:
 require(marker in execution,f'execution registry missing {marker}')

contract=text('functions/_lib/release-contract.js')
for marker in ['familyActionSingleOwnerContract: true','familyPlanEntryDocumentFlowContract: true','noFixedMobileFamilyPlanActionContract: true','feishuPublicSharePreservedContract: true','homeReleaseSingleOwnerContract: true','homeStaticRuntimeParityContract: true','homeCurrentShellContract: true','productionReleaseVerificationContract: true','export const LN_RANK_RELEASE_CONTRACT','export const RELEASE_CONTRACT = LN_RANK_RELEASE_CONTRACT']:
 require(marker in contract,f'release contract missing {marker}')

admission=json.loads(text('shared/resources/schools/liaoning-2026-admission-school-directory.v3969_0.json') or '{}')
require(admission.get('admissionRecordCount')==11628,'admission record count mismatch')
require(int(admission.get('schoolCount',0))>=900,'admission school count too small')

if errors:
 print('\n'.join('ERROR: '+error for error in errors),file=sys.stderr); sys.exit(1)
print(json.dumps({'ok':True,'version':'v3.9.71.0','assetReleaseVersion':'v3.9.70.0','requiredFiles':len(required),'homeRuntime':'family-home-runtime-v3970_0','localStrength':'local-strength-v3971_0','industryMap':'/Public_company/','homeHtmlCache':'revalidate','homeRuntimeCache':'immutable','admissionSchools':admission.get('schoolCount'),'admissionRecords':admission.get('admissionRecordCount')},ensure_ascii=False,indent=2))

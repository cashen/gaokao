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
 "display: 'v3.9.72.5'", "version: 'v3.9.72.5'", "assetVersion: 'v3972_5'",
 "assetReleaseVersion: 'v3.9.72.5'", "siteRuntimeGeneration: 'v3972_5'",
 "siteRuntimeContractVersion: 'site-runtime-coherence-v3972_5'",
 "resourceExecutionVersion: 'resource-execution-v3972_5'",
 "sharedResourceGraphVersion: 'site-resource-graph-v3972_5'",
 "uiResourceRegistryVersion: 'ui-resource-registry-v3972_5'",
 "cssResourceGraphVersion: 'css-resource-graph-v3972_5'",
 "dataResourceGraphVersion: 'data-resource-graph-v3972_5'",
 "resourceDecommissionPolicyVersion: 'resource-decommission-v3972_5'",
 "uiOrchestrationVersion: 'ui-orchestration-v3972_5'",
 "uiComponentExecutionVersion: 'ui-component-execution-v3972_5'",
 "familyActionVersion: 'family-action-v3972_5'",
 "interactionVersion: 'interaction-transaction-v3972_5'",
 "runtimeCacheVersion: 'runtime-cache-coherence-v3972_5'",
 "selectionWorkspaceVersion: 'selection-workspace-orchestration-v3972_5'",
 "localStrengthDataVersion: 'local-strength-static-v3971_2'",
 "all211DataVersion: 'all-211-static-v3972_0'",
 "majorBandsVersion: 'major-bands-static-v3972_2'",
 "resourceRegistry: '/shared/resources/resource-registry.js'",
 "uiResourceRegistry: '/shared/ui/ui-resource-registry.v3972_5.js'",
 "ui: '/shared/ui/ui-resource-registry.v3972_5.js'",
 "uiComponents: '/shared/ui/ui-resource-registry.v3972_5.js'",
 "homeRuntime: '/ln-rank/js/ux/family-home.v3972_5.js'",
 "runtimeBootstrap: '/ln-rank/js/app.v3972_5.js'",
 "runtimeSearch: '/ln-rank/js/app-runtime.v3972_5.js'",
 "searchIntentState: '/ln-rank/js/workspace/selection-workspace-orchestrator.v3972_5.js'",
 "interactionRuntime: '/shared/ui/interaction/interaction-transaction.v3972_5.js'",
 "selectionBootstrap: '/ln-rank/js/selection-pool.v3972_5.js'"
]: require(marker in current,f'current release missing {marker}')

required=[
 'AGENTS.md','docs/skills/unified-site-release/SKILL.md','index.html','_headers','Public_company/index.html',
 'shared/resources/resource-registry.js','shared/ui/ui-resource-registry.v3972_5.js',
 'shared/resources/release/site-runtime-contract.v3972_5.js',
 'shared/resources/release/runtime-cache-contract.v3972_5.js',
 'shared/resources/release/release-presenter.v3972_5.js',
 'shared/governance/resource-execution-contract.v3972_5.js',
 'shared/ui/shell/family-shell.v3972_5.js','shared/ui/shell/family-shell.v3972_5.css',
 'shared/ui/components/family-plan-entry.v3972_5.js','shared/ui/components/family-plan-entry.v3972_5.css',
 'shared/ui/interaction/interaction-transaction.v3972_5.js','shared/ui/interaction/interaction-transaction.v3972_5.css',
 'ln-rank/site-active-generation.v3972_5.json',
 'ln-rank/js/ux/family-home.v3972_5.js',
 'ln-rank/js/app.v3972_5.js','ln-rank/js/app-runtime.v3972_5.js',
 'ln-rank/js/workspace/selection-workspace-orchestrator.v3972_5.js',
 'ln-rank/js/selection-pool.v3972_5.js','ln-rank/js/selection-pool-runtime.v3972_5.js',
 'ln-rank/self-check.html','ln-rank/js/self-check.v3972_5.js',
 'tools/audit-site-runtime-generation-v3972_5.mjs','tools/audit-unified-resource-graph-v3972_5.mjs',
 'tools/browser-interaction-transaction-v3972_5.mjs',
 'tools/audit-family-action-v3970.mjs','tools/audit-home-release-ownership-v3970.mjs','tools/audit-school-query-v3970.mjs',
 'tools/browser-family-action-v3970.mjs','tools/browser-home-release-v3970.mjs',
 'shared/resources/schools/school-query-contract.v3969_0.js','shared/resources/schools/school-query-engine.v3969_0.js',
 'shared/resources/schools/liaoning-2026-admission-school-directory.v3969_0.json',
 'ln-rank/js/local-strength/local-strength-app.v3971_2.js',
 'ln-rank/data/local-strength/local-strength-index.v3971_2.json',
 'ln-rank/js/academic-background/all211-static-app.v3972_0.js',
 'ln-rank/data/211-static/211-static-index.v3972_0.json',
 '.github/workflows/verify-home-release-v3970.yml','.github/workflows/verify-production-release-v3970.yml'
]
for rel in required: require((ROOT/rel).exists(),f'missing required {rel}')
require(not (ROOT/'ln-rank/active-assets.json').exists(),'stale ln-rank/active-assets.json must be removed')

home=text('index.html')
for marker in [
 'data-release="v3.9.72.5"','data-site-runtime-generation="v3972_5"',
 'family-shell.v3972_5.css?v=3972_5','family-plan-entry.v3972_5.css?v=3972_5',
 'family-home.v3972_5.js?v=3972_5','家庭方案与逐项复核','data-home-industry-map-entry',
 'href="/Public_company/"','全国上市公司产业落地图'
]: require(marker in home,f'home missing {marker}')
require(home.count('data-home-industry-map-entry')==1,'home industry map entry must have one owner')
for forbidden in ['family-home.v3970_0.js?v=3970_0','family-shell.v3970_0.css?v=3970_0','data-release="v3.9.70.0"']:
 require(forbidden not in home,f'stale active home resource remains: {forbidden}')

headers=text('_headers')
for page in ['/','/index.html','/ln-rank/','/ln-rank/index.html','/ln-rank/selection-pool.html']:
 block=header_block(headers,page)
 require(block,f'headers missing {page}')
 require('Cache-Control: no-cache, max-age=0, must-revalidate' in block,f'{page} must revalidate')

index=text('ln-rank/index.html'); selection=text('ln-rank/selection-pool.html')
for marker in [
 'data-release="v3.9.72.5"','data-site-runtime-generation="v3972_5"',
 'interaction-transaction.v3972_5.css?v=3972_5','interaction-transaction.v3972_5.js?v=3972_5',
 'app.v3972_5.js?v=3972_5','data-ui-interaction-version="interaction-transaction-v3972_5"',
 'data-ui-family-plan-results-footer','data-ui-family-plan-live'
]: require(marker in index,f'main asset shell missing {marker}')
require('v3972_4' not in index,'main still mounts retired generation')
require(index.count('data-ui-navigation="auxiliary-background"')==2,'auxiliary navigation owner count mismatch')
require('href="/ln-rank/local-mainline.html"' not in index,'local background still uses native href')
require('href="/ln-rank/211-mainline.html"' not in index,'211 background still uses native href')
for marker in ['data-release="v3.9.72.5"','data-site-runtime-generation="v3972_5"','selection-pool.v3972_5.js?v=3972_5','生成家庭方案报告','知道链接的人可以查看']:
 require(marker in selection,f'selection asset shell missing {marker}')

interaction=text('shared/ui/interaction/interaction-transaction.v3972_5.js')
for marker in [
 "const VERSION = 'interaction-transaction-v3972_5'", "const DISCLOSURE_ID = 'familyConditionsDisclosure'",
 'native-chooser-stabilizing','REQUIRED_STABLE_FRAMES','visualViewport','MutationObserver',
 'navigation-without-owned-activation','location.assign'
]: require(marker in interaction,f'interaction transaction missing {marker}')
for forbidden in ['Android','Alook','navigator.userAgent']:
 require(forbidden not in interaction,f'interaction transaction contains device special case {forbidden}')

runtime=text('ln-rank/js/app-runtime.v3972_5.js')
for marker in [
 "const INTERACTION_VERSION = 'interaction-transaction-v3972_5'",
 "const RUNTIME_VERSION = 'resource-execution-v3972_5'",
 "selection-workspace-orchestrator.v3972_5.js?v=3972_5",
 "url.searchParams.set('siteRuntimeGeneration', CURRENT_RELEASE.siteRuntimeGeneration)"
]: require(marker in runtime,f'interaction runtime missing {marker}')
workspace=text('ln-rank/js/workspace/selection-workspace-orchestrator.v3972_5.js')
for marker in [
 "const VERSION = 'selection-workspace-orchestration-v3972_5'",
 "selection-workspace-orchestrator.v3969_0.js?v=3969_0",'delegateVersion','navigationOwner'
]: require(marker in workspace,f'workspace wrapper missing {marker}')

manifest=json.loads(text('ln-rank/site-active-generation.v3972_5.json') or '{}')
require(manifest.get('releaseVersion')=='v3.9.72.5','active manifest release mismatch')
require(manifest.get('generation')=='v3972_5','active manifest generation mismatch')
graph=manifest.get('resourceGraph',{})
require(graph.get('version')=='site-resource-graph-v3972_5','resource graph version mismatch')
require(graph.get('registry')=='/shared/resources/resource-registry.js','resource registry owner mismatch')
require(graph.get('uiRegistry')=='/shared/ui/ui-resource-registry.v3972_5.js','UI registry owner mismatch')
require(graph.get('cssVersion')=='css-resource-graph-v3972_5','CSS graph version mismatch')
require(graph.get('dataVersion')=='data-resource-graph-v3972_5','data graph version mismatch')
require(graph.get('decommissionPolicyVersion')=='resource-decommission-v3972_5','resource decommission policy mismatch')
require('legacyInventory' not in manifest,'active manifest must not point to legacy inventory')
require('legacyInventoryIsActiveOwner' not in manifest,'active manifest must not carry legacy owner flag')
require(manifest.get('preservedBusinessResources',{}).get('localStrength')=='local-strength-static-v3971_2','local strength contract changed')
require(manifest.get('preservedBusinessResources',{}).get('all211')=='all-211-static-v3972_0','211 contract changed')
require(manifest.get('preservedBusinessResources',{}).get('majorBands')=='major-bands-static-v3972_2','major bands contract changed')

self_check=text('ln-rank/self-check.html')
for marker in [
 'data-release="v3.9.72.5"','data-site-runtime-generation="v3972_5"',
 'self-check.v3972_5.js?v=3972_5','family-shell.v3972_5.js?v=3972_5'
]: require(marker in self_check,f'self-check missing {marker}')
for forbidden in ['self-check.v3959_0.js','family-shell.v3959_0.js','v3956_0-self-check.js']:
 require(forbidden not in self_check,f'self-check still mounts retired active resource {forbidden}')

contract=text('functions/_lib/release-contract.js')
for marker in [
 'familyActionSingleOwnerContract: true','familyPlanEntryDocumentFlowContract: true',
 'noFixedMobileFamilyPlanActionContract: true','feishuPublicSharePreservedContract: true',
 'export const LN_RANK_RELEASE_CONTRACT','export const RELEASE_CONTRACT = LN_RANK_RELEASE_CONTRACT'
]: require(marker in contract,f'release contract missing {marker}')

admission=json.loads(text('shared/resources/schools/liaoning-2026-admission-school-directory.v3969_0.json') or '{}')
require(admission.get('admissionRecordCount')==11628,'admission record count mismatch')
require(int(admission.get('schoolCount',0))>=900,'admission school count too small')

if errors:
 print('\n'.join('ERROR: '+error for error in errors),file=sys.stderr); sys.exit(1)
print(json.dumps({
 'ok':True,
 'version':'v3.9.72.5',
 'siteRuntimeGeneration':'v3972_5',
 'resourceGraph':'site-resource-graph-v3972_5',
 'uiRegistry':'ui-resource-registry-v3972_5',
 'cssGraph':'css-resource-graph-v3972_5',
 'dataGraph':'data-resource-graph-v3972_5',
 'removedLegacyInventory':True,
 'homeRuntime':'family-home-runtime-v3972_5',
 'interactionRuntime':'resource-execution-v3972_5',
 'interactionTransaction':'interaction-transaction-v3972_5',
 'workspace':'selection-workspace-orchestration-v3972_5',
 'localStrength':'local-strength-static-v3971_2',
 'all211':'all-211-static-v3972_0',
 'majorBands':'major-bands-static-v3972_2',
 'admissionSchools':admission.get('schoolCount'),
 'admissionRecords':admission.get('admissionRecordCount')
},ensure_ascii=False,indent=2))

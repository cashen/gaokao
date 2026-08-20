import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CURRENT_RELEASE } from '../shared/resources/release/current-release.js';
import { SITE_RUNTIME_CONTRACT } from '../shared/resources/release/site-runtime-contract.v3990_2.js';
import { UI_COMPONENT_REGISTRY, UI_RESOURCE_REGISTRY_VERSION } from '../shared/ui/ui-resource-registry.v3990_2.js';
import { UI_ACTION_COPY } from '../shared/ui/contracts/action-contract.v3970_0.js';
import { FAMILY_PLAN_COPY } from '../shared/ui/contracts/copy-contract.v3970_0.js';
import { buildFamilyStatus, resolveFamilyNextAction } from '../ln-rank/js/domain/family-decision-contract.v3970_0.js';
import { LN_RANK_RUNTIME_CACHE_CONTRACT } from '../shared/resources/release/runtime-cache-contract.v3990_2.js';
import { RESOURCE_EXECUTION_VERSION, RESOURCE_EXECUTION_REGISTRY } from '../shared/governance/resource-execution-contract.v3990_2.js';

const read = rel => fs.readFileSync(rel, 'utf8');
const main = read('ln-rank/index.html');
const selection = read('ln-rank/selection-pool.html');
const shell = read('shared/ui/shell/family-shell.v3990_2.js');
const component = read('shared/ui/components/family-plan-entry.v3990_2.js');
const componentCss = read('shared/ui/components/family-plan-entry.v3972_5.css');
const adapter = read('ln-rank/js/domain/family-plan-copy-adapter.v3970_0.js');
const interaction = read('shared/ui/interaction/interaction-transaction.v3990_2.js');
const runtime = read('ln-rank/js/app-runtime.v3990_2.js');
const workspace = read('ln-rank/js/workspace/selection-workspace-orchestrator.v3990_2.js');
const releaseContract = read('functions/_lib/release-contract.js');
const manifest = JSON.parse(read('ln-rank/site-active-generation.v3990_2.json'));

assert.equal(CURRENT_RELEASE.display, 'v3.9.90.2');
assert.equal(CURRENT_RELEASE.assetReleaseVersion, 'v3.9.90.2');
assert.equal(CURRENT_RELEASE.assetVersion, 'v3990_2');
assert.equal(CURRENT_RELEASE.siteRuntimeGeneration, 'v3990_2');
assert.equal(CURRENT_RELEASE.familyActionVersion, 'family-action-v3990_2');
assert.equal(CURRENT_RELEASE.uiResourceRegistryVersion, UI_RESOURCE_REGISTRY_VERSION);
assert.equal(CURRENT_RELEASE.resourceExecutionVersion, RESOURCE_EXECUTION_VERSION);
assert.equal(LN_RANK_RUNTIME_CACHE_CONTRACT.version, 'runtime-cache-coherence-v3990_2');
assert.equal(RESOURCE_EXECUTION_REGISTRY.familyAction.owner, '/shared/ui/components/family-plan-entry.v3990_2.js');
assert.equal(RESOURCE_EXECUTION_REGISTRY.familyAction.classification, 'current-generation');
assert.equal(RESOURCE_EXECUTION_REGISTRY.familyAction.schemaVersion, 'family-action-v3990_2');
assert.equal(SITE_RUNTIME_CONTRACT.owners.familyPlanEntry, RESOURCE_EXECUTION_REGISTRY.familyAction.owner);
assert.equal(SITE_RUNTIME_CONTRACT.activeEntrypointClassifications.familyPlanEntry, 'current-generation');
assert.equal(SITE_RUNTIME_CONTRACT.activeEntrypointClassifications.familyPlanEntryStyles, 'declared-stable-dependency');
assert.deepEqual(UI_COMPONENT_REGISTRY.familyPlanEntry.variants, ['header-compact', 'results-footer']);
assert.ok(UI_COMPONENT_REGISTRY.familyPlanEntry.forbiddenVariants.includes('fixed-bottom'));
assert.equal(UI_COMPONENT_REGISTRY.familyPlanEntry.domOwner, CURRENT_RELEASE.resourceOwners.familyAction);
assert.equal(UI_COMPONENT_REGISTRY.familyPlanEntry.cssOwner, CURRENT_RELEASE.resourceOwners.familyActionStyles);
assert.equal(CURRENT_RELEASE.resourceOwners.familyActionStyles, '/shared/ui/components/family-plan-entry.v3972_5.css');
assert.ok(LN_RANK_RUNTIME_CACHE_CONTRACT.activeGenerationModules.includes('/shared/ui/components/family-plan-entry.v3990_2.js'));
assert.ok(LN_RANK_RUNTIME_CACHE_CONTRACT.declaredStableActiveModules.includes('/shared/ui/components/family-plan-entry.v3972_5.css'));

assert.equal(UI_ACTION_COPY.addFamilyPlan.level, 'secondary');
assert.equal(UI_ACTION_COPY.viewFamilyPlan.level, 'secondary');
assert.equal(FAMILY_PLAN_COPY.add, '加入家庭方案');
assert.match(FAMILY_PLAN_COPY.publicShareNotice, /知道链接的人可以查看/);

const noScore = buildFamilyStatus({ score: null, items: [] });
assert.equal(noScore.nextActionKey, 'confirm-score');
const emptyPlan = buildFamilyStatus({ score: 600, items: [] });
assert.equal(emptyPlan.nextActionKey, 'build-family-plan');
const pending = buildFamilyStatus({ score: 600, items: [{ id: 'a', specialProject: { hasSpecialProject: true } }] });
assert.equal(pending.nextActionKey, 'review-family-plan');
const ready = resolveFamilyNextAction({ score: 600, items: [{ id: 'a', school: '甲校', major: '自动化' }] });
assert.equal(ready.key, 'create-family-plan-report');

for (const marker of [
  'data-ui-family-plan-results-footer',
  'data-ui-family-plan-live',
  'interaction-transaction.v3990_2.js?v=3990_2',
  'app.v3990_2.js?v=3990_2',
  'family-shell.v3972_5.css?v=3972_5',
  'family-plan-entry.v3972_5.css?v=3972_5'
]) assert.ok(main.includes(marker), `main missing ${marker}`);
for (const stale of [
  'interaction-transaction.v3972_5.js?v=3972_5',
  'app.v3972_5.js?v=3972_5',
  'family-shell.v3972_5.js?v=3972_5',
  'family-plan-entry.v3972_5.js?v=3972_5'
]) assert.ok(!main.includes(stale), `main mounts retired current JS ${stale}`);
for (const marker of ['生成家庭方案报告', '知道链接的人可以查看', 'selection-pool.v3990_2.js?v=3990_2']) {
  assert.ok(selection.includes(marker), `selection missing ${marker}`);
}
assert.ok(!selection.includes('selection-pool.v3972_5.js?v=3972_5'), 'selection mounts retired current bootstrap');

for (const forbidden of [
  'data-ui-mobile-action-mount',
  'selectionPoolShell',
  'poolResultStickyMount',
  'ui-mobile-context-visible',
  'data-ui-mobile-selection',
  '已选 0 个 · 去整理',
  '还没选专业 · 回到结果继续看'
]) {
  assert.ok(!main.includes(forbidden), `main retains ${forbidden}`);
  assert.ok(!shell.includes(forbidden), `shell retains ${forbidden}`);
}
for (const forbidden of ['position:fixed', 'position: fixed', 'position:sticky', 'position: sticky', 'bottom:', 'z-index:']) {
  assert.ok(!componentCss.includes(forbidden), `family plan entry must stay in document flow: ${forbidden}`);
}
assert.ok(component.includes("export const FAMILY_PLAN_ENTRY_VERSION = 'family-plan-entry-v3990_2'"));
assert.ok(component.includes("window.addEventListener('gaokao:selection-change'"));
assert.ok(!component.includes('MutationObserver'));
assert.ok(shell.includes("export const FAMILY_SHELL_VERSION = 'family-shell-v3990_2'"));
assert.ok(shell.includes("family-plan-entry.v3990_2.js?v=3990_2"));
assert.ok(shell.includes("family-shell.v3972_5.css?v=3972_5"));
assert.ok(adapter.includes('REPORT_COPY'));
assert.ok(adapter.includes('FAMILY_PLAN_COPY'));
assert.ok(adapter.includes('加入家庭方案'));

for (const marker of [
  "const VERSION = 'interaction-transaction-v3990_2'",
  "const HAS_POINTER_EVENTS = typeof globalThis.PointerEvent === 'function'",
  "preActivationDomMutationPolicy: 'forbidden'",
  'tailGuardStartsAfterOutcome: true',
  'navigation-without-owned-activation',
  "document.addEventListener('gaokao:workspace-state'"
]) assert.ok(interaction.includes(marker), `interaction contract missing ${marker}`);
for (const marker of [
  "const INTERACTION_VERSION = 'interaction-transaction-v3990_2'",
  "const RUNTIME_VERSION = 'resource-execution-v3990_2'",
  "selection-workspace-orchestrator.v3990_2.js?v=3990_2"
]) assert.ok(runtime.includes(marker), `runtime patch missing ${marker}`);
for (const marker of [
  "selection-workspace-orchestration-v3990_2",
  "selection-workspace-orchestrator.v3969_0.js?v=3969_0",
  'delegateVersion',
  'navigationOwner'
]) assert.ok(workspace.includes(marker), `workspace wrapper missing ${marker}`);

assert.equal(manifest.releaseVersion, 'v3.9.90.2');
assert.equal(manifest.generation, 'v3990_2');
assert.equal(manifest.resourceGraph.uiRegistry, CURRENT_RELEASE.resourceOwners.uiResourceRegistry);
assert.equal(manifest.currentGenerationEntrypoints.familyPlanEntry, '/shared/ui/components/family-plan-entry.v3990_2.js?v=3990_2');
assert.equal(manifest.declaredStableActiveEntrypoints.familyPlanEntryStyles, '/shared/ui/components/family-plan-entry.v3972_5.css?v=3972_5');
assert.equal(manifest.policies.oneActiveGeneration, true);
assert.equal(manifest.policies.historicalAssetsCannotClaimActiveOwnership, true);
assert.ok(!('legacyInventory' in manifest));
assert.ok(!('legacyInventoryIsActiveOwner' in manifest));

for (const marker of [
  'familyActionSingleOwnerContract: true',
  'familyPlanEntryDocumentFlowContract: true',
  'noFixedMobileFamilyPlanActionContract: true',
  'feishuPublicSharePreservedContract: true',
  'export const LN_RANK_RELEASE_CONTRACT',
  'export const RELEASE_CONTRACT = LN_RANK_RELEASE_CONTRACT'
]) assert.ok(releaseContract.includes(marker), `release contract missing ${marker}`);

console.log(JSON.stringify({
  ok: true,
  release: CURRENT_RELEASE.display,
  generation: CURRENT_RELEASE.siteRuntimeGeneration,
  uiRegistry: UI_RESOURCE_REGISTRY_VERSION,
  familyAction: CURRENT_RELEASE.familyActionVersion,
  interaction: CURRENT_RELEASE.interactionVersion,
  workspace: CURRENT_RELEASE.selectionWorkspaceVersion,
  familyComponentOwner: UI_COMPONENT_REGISTRY.familyPlanEntry.domOwner,
  stableComponentCss: UI_COMPONENT_REGISTRY.familyPlanEntry.cssOwner,
  fixedMobileAction: false,
  publicFeishuShare: true
}, null, 2));


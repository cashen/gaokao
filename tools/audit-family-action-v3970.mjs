import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CURRENT_RELEASE } from '../shared/resources/release/current-release.js';
import { UI_COMPONENT_REGISTRY, UI_COMPONENT_EXECUTION_VERSION } from '../shared/ui/component-registry.v3970_0.js';
import { UI_ACTION_COPY } from '../shared/ui/contracts/action-contract.v3970_0.js';
import { FAMILY_PLAN_COPY } from '../shared/ui/contracts/copy-contract.v3970_0.js';
import { buildFamilyStatus, resolveFamilyNextAction } from '../ln-rank/js/domain/family-decision-contract.v3970_0.js';
import { LN_RANK_RUNTIME_CACHE_CONTRACT } from '../shared/resources/release/runtime-cache-contract.v3970_0.js';
import { RESOURCE_EXECUTION_VERSION, RESOURCE_EXECUTION_REGISTRY } from '../shared/governance/resource-execution-contract.v3970_0.js';

const read = rel => fs.readFileSync(rel, 'utf8');
const active = JSON.parse(read('ln-rank/active-assets.json'));
const main = read('ln-rank/index.html');
const selection = read('ln-rank/selection-pool.html');
const shell = read('shared/ui/shell/family-shell.v3970_0.js');
const shellCss = read('shared/ui/shell/family-shell.v3970_0.css');
const component = read('shared/ui/components/family-plan-entry.v3970_0.js');
const componentCss = read('shared/ui/components/family-plan-entry.v3970_0.css');
const adapter = read('ln-rank/js/domain/family-plan-copy-adapter.v3970_0.js');
const releaseContract = read('functions/_lib/release-contract.js');

assert.equal(CURRENT_RELEASE.display, 'v3.9.72.0');
assert.equal(CURRENT_RELEASE.assetReleaseVersion, 'v3.9.70.0');
assert.equal(CURRENT_RELEASE.assetVersion, 'v3970_0');
assert.equal(CURRENT_RELEASE.familyActionVersion, 'family-action-v3970_0');
assert.equal(CURRENT_RELEASE.resourceExecutionVersion, RESOURCE_EXECUTION_VERSION);
assert.equal(UI_COMPONENT_EXECUTION_VERSION, 'ui-component-execution-v3970_0');
assert.equal(LN_RANK_RUNTIME_CACHE_CONTRACT.version, 'runtime-cache-coherence-v3970_0');
assert.equal(RESOURCE_EXECUTION_REGISTRY.familyAction.owner, '/shared/ui/components/family-plan-entry.v3970_0.js');
assert.equal(UI_COMPONENT_REGISTRY.familyPlanEntry.domOwner, RESOURCE_EXECUTION_REGISTRY.familyAction.owner);
assert.equal(UI_COMPONENT_REGISTRY.familyPlanEntry.cssOwner, '/shared/ui/components/family-plan-entry.v3970_0.css');
assert.deepEqual(UI_COMPONENT_REGISTRY.familyPlanEntry.variants, ['header-compact', 'results-footer']);
assert.ok(UI_COMPONENT_REGISTRY.familyPlanEntry.forbiddenVariants.includes('fixed-bottom'));

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
  'app.v3970_0.js?v=3970_0',
  'family-shell.v3970_0.css?v=3970_0',
  'family-plan-entry.v3970_0.css?v=3970_0'
]) assert.ok(main.includes(marker), `main missing ${marker}`);
for (const marker of ['生成家庭方案报告', '知道链接的人可以查看', 'selection-pool.v3970_0.js?v=3970_0']) assert.ok(selection.includes(marker), `selection missing ${marker}`);

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
  assert.ok(!shellCss.includes(forbidden), `shell css retains ${forbidden}`);
}
for (const forbidden of ['position:fixed', 'position: fixed', 'position:sticky', 'position: sticky', 'bottom:', 'z-index:']) {
  assert.ok(!componentCss.includes(forbidden), `family plan entry must stay in document flow: ${forbidden}`);
}
assert.ok(component.includes("window.addEventListener('gaokao:selection-change'"));
assert.ok(!component.includes('MutationObserver'));
assert.ok(adapter.includes("REPORT_COPY"));
assert.ok(adapter.includes("FAMILY_PLAN_COPY"));
assert.ok(adapter.includes("加入家庭方案"));

assert.equal(active.version, 'v3.9.70.0');
assert.equal(active.familyActionSingleOwnerContract, true);
assert.equal(active.familyPlanEntryDocumentFlowContract, true);
assert.equal(active.noFixedMobileFamilyPlanActionContract, true);
assert.equal(active.noFloatingFamilyPlanActionContract, true);
for (const rel of [
  '../shared/ui/components/family-plan-entry.v3970_0.js',
  '../shared/ui/component-registry.v3970_0.js',
  '../shared/ui/contracts/copy-contract.v3970_0.js',
  'js/domain/family-decision-contract.v3970_0.js',
  'js/domain/family-plan-copy-adapter.v3970_0.js'
]) assert.ok(active.jsEntry.includes(rel), `active missing ${rel}`);
for (const rel of ['../shared/ui/components/family-plan-entry.v3970_0.css', '../shared/ui/shell/family-shell.v3970_0.css']) assert.ok(active.cssEntry.includes(rel), `active css missing ${rel}`);

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
  assetRelease: CURRENT_RELEASE.assetReleaseVersion,
  component: UI_COMPONENT_REGISTRY.familyPlanEntry.id,
  variants: UI_COMPONENT_REGISTRY.familyPlanEntry.variants,
  fixedMobileAction: false,
  publicFeishuShare: true
}, null, 2));

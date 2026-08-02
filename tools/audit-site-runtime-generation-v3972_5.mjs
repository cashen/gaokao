import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CURRENT_RELEASE } from '../shared/resources/release/current-release.js';
import { SITE_RUNTIME_CONTRACT } from '../shared/resources/release/site-runtime-contract.v3972_5.js';
import { LN_RANK_RUNTIME_CACHE_CONTRACT } from '../shared/resources/release/runtime-cache-contract.v3972_5.js';
import { RESOURCE_EXECUTION_VERSION, RESOURCE_EXECUTION_REGISTRY } from '../shared/governance/resource-execution-contract.v3972_5.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(ROOT, rel));
const stripQuery = value => String(value || '').split('?')[0].replace(/^\//, '');
const generation = SITE_RUNTIME_CONTRACT.generation;
const query = SITE_RUNTIME_CONTRACT.queryVersion;

assert.equal(CURRENT_RELEASE.display, 'v3.9.72.5');
assert.equal(CURRENT_RELEASE.siteRuntimeGeneration, generation);
assert.equal(CURRENT_RELEASE.assetVersion, generation);
assert.equal(CURRENT_RELEASE.assetReleaseVersion, 'v3.9.72.5');
assert.equal(CURRENT_RELEASE.resourceExecutionVersion, RESOURCE_EXECUTION_VERSION);
assert.equal(CURRENT_RELEASE.runtimeCacheVersion, LN_RANK_RUNTIME_CACHE_CONTRACT.version);
assert.equal(CURRENT_RELEASE.interactionVersion, 'interaction-transaction-v3972_5');
assert.equal(SITE_RUNTIME_CONTRACT.scope, 'whole-site-active-generation');
assert.equal(SITE_RUNTIME_CONTRACT.preservedBusinessResources.localStrength, 'local-strength-static-v3971_2');
assert.equal(SITE_RUNTIME_CONTRACT.preservedBusinessResources.all211, 'all-211-static-v3972_0');
assert.equal(SITE_RUNTIME_CONTRACT.preservedBusinessResources.majorBands, 'major-bands-static-v3972_2');

for (const [name, url] of Object.entries(SITE_RUNTIME_CONTRACT.activeEntrypoints)) {
  if (!String(url).startsWith('/')) continue;
  if (['homePage', 'selectionPage', 'familyPlanPage'].includes(name)) continue;
  const rel = stripQuery(url);
  assert.ok(exists(rel), `missing active generation resource ${name}: ${rel}`);
  if (/\.(?:js|css)$/.test(rel)) {
    assert.match(url, new RegExp(`\\?v=${query}$`), `${name} must use the active generation query`);
    assert.ok(rel.includes(`.v${query}.`) || rel.endsWith('current-release.js'), `${name} must use the active generation filename`);
  }
}

for (const dependency of SITE_RUNTIME_CONTRACT.stableDependencies) {
  assert.ok(exists(dependency.replace(/^\//, '')), `missing declared stable dependency ${dependency}`);
}

assert.equal(LN_RANK_RUNTIME_CACHE_CONTRACT.assetVersion, generation);
assert.equal(LN_RANK_RUNTIME_CACHE_CONTRACT.siteRuntimeContractVersion, SITE_RUNTIME_CONTRACT.version);
assert.ok(LN_RANK_RUNTIME_CACHE_CONTRACT.policies.oneActiveGeneration);
assert.equal(RESOURCE_EXECUTION_REGISTRY.siteRuntime.owner, SITE_RUNTIME_CONTRACT.owners.activeGeneration);
assert.equal(RESOURCE_EXECUTION_REGISTRY.interaction.owner, SITE_RUNTIME_CONTRACT.owners.interaction);
assert.equal(RESOURCE_EXECUTION_REGISTRY.familyAction.owner, SITE_RUNTIME_CONTRACT.owners.familyPlanEntry);

const pages = {
  home: read('index.html'),
  selection: read('ln-rank/index.html'),
  familyPlan: read('ln-rank/selection-pool.html')
};
for (const [name, html] of Object.entries(pages)) {
  assert.ok(html.includes('data-release="v3.9.72.5"'), `${name} release mismatch`);
  assert.ok(html.includes(`data-site-runtime-generation="${generation}"`), `${name} generation marker missing`);
  assert.ok(!html.includes('v3972_4'), `${name} still references retired interaction generation`);
}

for (const marker of [
  '/ln-rank/js/ux/family-home.v3972_5.js?v=3972_5',
  '/shared/ui/shell/family-shell.v3972_5.css?v=3972_5',
  '/shared/ui/components/family-plan-entry.v3972_5.css?v=3972_5'
]) assert.ok(pages.home.includes(marker), `home missing ${marker}`);

for (const marker of [
  '/shared/ui/interaction/interaction-transaction.v3972_5.css?v=3972_5',
  '/shared/ui/interaction/interaction-transaction.v3972_5.js?v=3972_5',
  '/ln-rank/js/app.v3972_5.js?v=3972_5',
  'data-ui-interaction-version="interaction-transaction-v3972_5"'
]) assert.ok(pages.selection.includes(marker), `selection missing ${marker}`);
assert.equal((pages.selection.match(/data-ui-navigation="auxiliary-background"/g) || []).length, 2);
assert.equal((pages.selection.match(/data-ui-navigation-target="\/ln-rank\/(?:local|211)-mainline\.html"/g) || []).length, 2);
assert.ok(!/<a[^>]+href="\/ln-rank\/(?:local|211)-mainline\.html"/.test(pages.selection), 'auxiliary background must not use native anchors');

assert.ok(pages.familyPlan.includes('/ln-rank/js/selection-pool.v3972_5.js?v=3972_5'));
for (const button of pages.familyPlan.matchAll(/<button\b[^>]*>/g)) {
  assert.match(button[0], /\btype="button"/, `family-plan button lacks type=button: ${button[0]}`);
}
for (const button of pages.selection.matchAll(/<button\b[^>]*>/g)) {
  assert.match(button[0], /\btype="button"/, `selection button lacks type=button: ${button[0]}`);
}

const interaction = read('shared/ui/interaction/interaction-transaction.v3972_5.js');
for (const marker of [
  "const VERSION = 'interaction-transaction-v3972_5'",
  "const DISCLOSURE_ID = 'familyConditionsDisclosure'",
  'native-chooser-stabilizing',
  'REQUIRED_STABLE_FRAMES',
  'visualViewport',
  'MutationObserver',
  'location.assign',
  'navigation-without-owned-activation',
  'data-ui-navigation-target'
]) assert.ok(interaction.includes(marker), `interaction runtime missing ${marker}`);
for (const forbidden of ['Alook', 'Android', 'navigator.userAgent', 'a[href="/ln-rank/local-mainline.html"]']) {
  assert.ok(!interaction.includes(forbidden), `interaction runtime contains device or native-link special case: ${forbidden}`);
}

const runtime = read('ln-rank/js/app-runtime.v3972_5.js');
for (const marker of [
  "const INTERACTION_VERSION = 'interaction-transaction-v3972_5'",
  "const RUNTIME_VERSION = 'resource-execution-v3972_5'",
  "selection-workspace-orchestrator.v3972_5.js?v=3972_5",
  "url.searchParams.set('siteRuntimeGeneration', CURRENT_RELEASE.siteRuntimeGeneration)"
]) assert.ok(runtime.includes(marker), `selection runtime missing ${marker}`);

const workspace = read('ln-rank/js/workspace/selection-workspace-orchestrator.v3972_5.js');
assert.ok(workspace.includes("selection-workspace-orchestrator.v3969_0.js?v=3969_0"));
assert.ok(workspace.includes('delegateVersion'));
assert.ok(workspace.includes('navigationOwner'));

const manifest = JSON.parse(read('ln-rank/site-active-generation.v3972_5.json'));
assert.equal(manifest.releaseVersion, CURRENT_RELEASE.display);
assert.equal(manifest.generation, generation);
assert.equal(manifest.contractVersion, SITE_RUNTIME_CONTRACT.version);
assert.equal(manifest.legacyInventoryIsActiveOwner, false);

const releaseContract = read('functions/_lib/release-contract.js');
assert.ok(releaseContract.includes('export const LN_RANK_RELEASE_CONTRACT'));
assert.ok(releaseContract.includes('export const RELEASE_CONTRACT = LN_RANK_RELEASE_CONTRACT'));

console.log(JSON.stringify({
  ok: true,
  release: CURRENT_RELEASE.display,
  generation,
  contract: SITE_RUNTIME_CONTRACT.version,
  activeEntrypoints: Object.keys(SITE_RUNTIME_CONTRACT.activeEntrypoints).length,
  stableDependencies: SITE_RUNTIME_CONTRACT.stableDependencies.length,
  auxiliaryNavigationOwner: SITE_RUNTIME_CONTRACT.owners.auxiliaryNavigation,
  preservedBusinessResources: SITE_RUNTIME_CONTRACT.preservedBusinessResources
}, null, 2));

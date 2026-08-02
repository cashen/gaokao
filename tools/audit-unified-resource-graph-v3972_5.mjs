import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CURRENT_RELEASE } from '../shared/resources/release/current-release.js';
import { SITE_RUNTIME_CONTRACT } from '../shared/resources/release/site-runtime-contract.v3972_5.js';
import {
  SHARED_RESOURCE_CENTER_VERSION,
  SHARED_RESOURCE_GRAPH_VERSION,
  DATA_RESOURCE_GRAPH_VERSION,
  RESOURCE_DECOMMISSION_POLICY_VERSION,
  SHARED_RESOURCE_REGISTRY
} from '../shared/resources/resource-registry.js';
import {
  UI_RESOURCE_REGISTRY_VERSION,
  UI_CSS_RESOURCE_GRAPH_VERSION,
  UI_ACTIVE_RESOURCE_REGISTRY,
  UI_STABLE_RESOURCE_REGISTRY,
  UI_COMPONENT_REGISTRY,
  UI_CSS_RESOURCE_GRAPH,
  UI_RESOURCE_POLICIES
} from '../shared/ui/ui-resource-registry.v3972_5.js';
import { ALGORITHM_RESOURCE_REGISTRY } from '../shared/algorithms/algorithm-registry.js';
import { RESOURCE_EXECUTION_REGISTRY } from '../shared/governance/resource-execution-contract.v3972_5.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const strip = value => String(value || '').split('?')[0].split('#')[0].replace(/^\//, '');
const exists = value => {
  const rel = strip(value);
  return !rel || fs.existsSync(path.join(ROOT, rel));
};
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const requirePaths = (label, values) => {
  for (const value of values) assert.ok(exists(value), `${label} references missing resource: ${value}`);
};

assert.equal(CURRENT_RELEASE.display, 'v3.9.72.5');
assert.equal(CURRENT_RELEASE.assetVersion, 'v3972_5');
assert.equal(CURRENT_RELEASE.sharedResourceGraphVersion, 'site-resource-graph-v3972_5');
assert.equal(CURRENT_RELEASE.uiResourceRegistryVersion, 'ui-resource-registry-v3972_5');
assert.equal(CURRENT_RELEASE.cssResourceGraphVersion, 'css-resource-graph-v3972_5');
assert.equal(CURRENT_RELEASE.dataResourceGraphVersion, 'data-resource-graph-v3972_5');
assert.equal(CURRENT_RELEASE.resourceDecommissionPolicyVersion, 'resource-decommission-v3972_5');
assert.equal(SHARED_RESOURCE_CENTER_VERSION, CURRENT_RELEASE.assetVersion);
assert.equal(SHARED_RESOURCE_GRAPH_VERSION, CURRENT_RELEASE.sharedResourceGraphVersion);
assert.equal(DATA_RESOURCE_GRAPH_VERSION, CURRENT_RELEASE.dataResourceGraphVersion);
assert.equal(RESOURCE_DECOMMISSION_POLICY_VERSION, CURRENT_RELEASE.resourceDecommissionPolicyVersion);
assert.equal(UI_RESOURCE_REGISTRY_VERSION, CURRENT_RELEASE.uiResourceRegistryVersion);
assert.equal(UI_CSS_RESOURCE_GRAPH_VERSION, CURRENT_RELEASE.cssResourceGraphVersion);

assert.equal(CURRENT_RELEASE.resourceOwners.resourceRegistry, '/shared/resources/resource-registry.js');
assert.equal(CURRENT_RELEASE.resourceOwners.uiResourceRegistry, '/shared/ui/ui-resource-registry.v3972_5.js');
assert.equal(CURRENT_RELEASE.resourceOwners.ui, CURRENT_RELEASE.resourceOwners.uiResourceRegistry);
assert.equal(CURRENT_RELEASE.resourceOwners.uiComponents, CURRENT_RELEASE.resourceOwners.uiResourceRegistry);
assert.equal(CURRENT_RELEASE.resourceOwners.uiPageCatalogAdapter, '/shared/ui/ui-registry.v3970_0.js');
assert.equal(SHARED_RESOURCE_REGISTRY.governance.module, CURRENT_RELEASE.resourceOwners.resourceRegistry);
assert.equal(SHARED_RESOURCE_REGISTRY.governance.uiRegistry, CURRENT_RELEASE.resourceOwners.uiResourceRegistry);
assert.equal(SHARED_RESOURCE_REGISTRY.ui.registry, CURRENT_RELEASE.resourceOwners.uiResourceRegistry);
assert.equal(SHARED_RESOURCE_REGISTRY.ui.pageCatalogAdapter, CURRENT_RELEASE.resourceOwners.uiPageCatalogAdapter);
assert.equal(SHARED_RESOURCE_REGISTRY.ui.version, UI_RESOURCE_REGISTRY_VERSION);

const activeExpected = Object.freeze({
  familyShellJs: SITE_RUNTIME_CONTRACT.activeEntrypoints.familyShell,
  familyShellCss: SITE_RUNTIME_CONTRACT.activeEntrypoints.familyShellStyles,
  familyPlanEntryJs: SITE_RUNTIME_CONTRACT.activeEntrypoints.familyPlanEntry,
  familyPlanEntryCss: SITE_RUNTIME_CONTRACT.activeEntrypoints.familyPlanEntryStyles,
  interactionJs: SITE_RUNTIME_CONTRACT.activeEntrypoints.interactionRuntime,
  interactionCss: SITE_RUNTIME_CONTRACT.activeEntrypoints.interactionStyles,
  homeRuntime: SITE_RUNTIME_CONTRACT.activeEntrypoints.homeRuntime,
  selectionBootstrap: SITE_RUNTIME_CONTRACT.activeEntrypoints.selectionBootstrap,
  selectionRuntime: SITE_RUNTIME_CONTRACT.activeEntrypoints.selectionRuntime,
  selectionWorkspace: SITE_RUNTIME_CONTRACT.activeEntrypoints.selectionWorkspace,
  familyPlanBootstrap: SITE_RUNTIME_CONTRACT.activeEntrypoints.familyPlanBootstrap,
  familyPlanRuntime: SITE_RUNTIME_CONTRACT.activeEntrypoints.familyPlanRuntime
});
for (const [key, value] of Object.entries(activeExpected)) {
  assert.equal(UI_ACTIVE_RESOURCE_REGISTRY[key], `/${strip(value)}`, `active UI graph mismatch: ${key}`);
}

requirePaths('active UI graph', Object.values(UI_ACTIVE_RESOURCE_REGISTRY));
requirePaths('stable UI graph', Object.values(UI_STABLE_RESOURCE_REGISTRY));
requirePaths('CSS graph', UI_CSS_RESOURCE_GRAPH.map(item => item.path));
requirePaths('algorithm graph', Object.values(ALGORITHM_RESOURCE_REGISTRY));
requirePaths('site stable dependency graph', SITE_RUNTIME_CONTRACT.stableDependencies);

const cssPaths = UI_CSS_RESOURCE_GRAPH.map(item => item.path);
assert.equal(new Set(cssPaths).size, cssPaths.length, 'CSS graph contains duplicate paths');
for (const item of UI_CSS_RESOURCE_GRAPH) {
  assert.ok(item.classification, `CSS classification missing: ${item.path}`);
  assert.ok(item.role, `CSS role missing: ${item.path}`);
  assert.ok(item.owner, `CSS owner missing: ${item.path}`);
  if (item.classification === 'active-generation') {
    assert.ok(item.path.includes('.v3972_5.'), `active CSS is not current generation: ${item.path}`);
  }
}

for (const component of Object.values(UI_COMPONENT_REGISTRY)) {
  assert.ok(component.id, 'component id missing');
  assert.ok(component.domOwner, `component DOM owner missing: ${component.id}`);
  assert.ok(component.cssOwner, `component CSS owner missing: ${component.id}`);
  assert.ok(exists(component.domOwner), `component DOM owner missing on disk: ${component.domOwner}`);
  assert.ok(cssPaths.includes(component.cssOwner), `component CSS owner is outside canonical graph: ${component.cssOwner}`);
  if (component.supplementalCssOwner) {
    assert.ok(cssPaths.includes(component.supplementalCssOwner), `supplemental CSS owner is outside canonical graph: ${component.supplementalCssOwner}`);
  }
}

assert.ok(UI_RESOURCE_POLICIES.singleCurrentRegistry);
assert.ok(UI_RESOURCE_POLICIES.oldVersionMayOnlyBeStableAdapter);
assert.ok(UI_RESOURCE_POLICIES.historicalAssetsCannotClaimActiveOwnership);

const requiredDataOwners = [
  CURRENT_RELEASE.resourceOwners.exam,
  CURRENT_RELEASE.resourceOwners.regions,
  CURRENT_RELEASE.resourceOwners.schools,
  CURRENT_RELEASE.resourceOwners.schoolIdentity,
  CURRENT_RELEASE.resourceOwners.schoolAdmissionDirectory,
  CURRENT_RELEASE.resourceOwners.majors,
  CURRENT_RELEASE.resourceOwners.localStrengthData,
  CURRENT_RELEASE.resourceOwners.localStrengthAudit,
  CURRENT_RELEASE.resourceOwners.all211Data,
  CURRENT_RELEASE.resourceOwners.all211Audit,
  CURRENT_RELEASE.resourceOwners.majorBandsStaticProvider,
  CURRENT_RELEASE.resourceOwners.historyScoreRankEvidence,
  CURRENT_RELEASE.resourceOwners.reports
];
requirePaths('data owner graph', requiredDataOwners);

assert.equal(SHARED_RESOURCE_REGISTRY.localStrength.data, CURRENT_RELEASE.resourceOwners.localStrengthData);
assert.equal(SHARED_RESOURCE_REGISTRY.all211.data, CURRENT_RELEASE.resourceOwners.all211Data);
assert.equal(SHARED_RESOURCE_REGISTRY.majorBands.cacheOwner, CURRENT_RELEASE.resourceOwners.majorBandsBucketCacheOwner);
assert.equal(RESOURCE_EXECUTION_REGISTRY.majorBands.bucketCacheOwner, CURRENT_RELEASE.resourceOwners.majorBandsBucketCacheOwner);
assert.equal(RESOURCE_EXECUTION_REGISTRY.familyAction.owner, CURRENT_RELEASE.resourceOwners.familyAction);
assert.equal(RESOURCE_EXECUTION_REGISTRY.interaction.owner, CURRENT_RELEASE.resourceOwners.interactionRuntime);

const registrySource = read('shared/resources/resource-registry.js');
for (const forbidden of [
  "current-release.js?v=3969_0",
  "runtime-cache-contract.v3969_0.js",
  "resource-execution-contract.v3969_0.js",
  "family-shell.v3965_0.js",
  "family-shell.v3970_0.js",
  "family-plan-entry.v3970_0.js",
  "registry: '/shared/ui/ui-registry.v3965_0.js'",
  "componentRegistry: '/shared/ui/component-registry.v3967_0.js'"
]) assert.ok(!registrySource.includes(forbidden), `shared registry still claims stale active resource: ${forbidden}`);

assert.ok(!fs.existsSync(path.join(ROOT, 'ln-rank/active-assets.json')), 'stale active-assets.json still exists');
const manifest = JSON.parse(read('ln-rank/site-active-generation.v3972_5.json'));
assert.equal(manifest.releaseVersion, CURRENT_RELEASE.display);
assert.equal(manifest.generation, CURRENT_RELEASE.siteRuntimeGeneration);
assert.equal(manifest.resourceGraph?.registry, CURRENT_RELEASE.resourceOwners.resourceRegistry);
assert.equal(manifest.resourceGraph?.uiRegistry, CURRENT_RELEASE.resourceOwners.uiResourceRegistry);
assert.equal(manifest.resourceGraph?.version, CURRENT_RELEASE.sharedResourceGraphVersion);
assert.equal(manifest.resourceGraph?.cssVersion, CURRENT_RELEASE.cssResourceGraphVersion);
assert.equal(manifest.resourceGraph?.dataVersion, CURRENT_RELEASE.dataResourceGraphVersion);
assert.equal(manifest.resourceGraph?.decommissionPolicyVersion, CURRENT_RELEASE.resourceDecommissionPolicyVersion);
assert.ok(!('legacyInventory' in manifest), 'active manifest still points to legacy inventory');
assert.ok(!('legacyInventoryIsActiveOwner' in manifest), 'active manifest still carries legacy ownership switch');

console.log(JSON.stringify({
  ok: true,
  release: CURRENT_RELEASE.display,
  generation: CURRENT_RELEASE.siteRuntimeGeneration,
  resourceGraph: SHARED_RESOURCE_GRAPH_VERSION,
  uiRegistry: UI_RESOURCE_REGISTRY_VERSION,
  cssGraph: UI_CSS_RESOURCE_GRAPH_VERSION,
  dataGraph: DATA_RESOURCE_GRAPH_VERSION,
  activeUiResources: Object.keys(UI_ACTIVE_RESOURCE_REGISTRY).length,
  stableUiResources: Object.keys(UI_STABLE_RESOURCE_REGISTRY).length,
  cssResources: UI_CSS_RESOURCE_GRAPH.length,
  components: Object.keys(UI_COMPONENT_REGISTRY).length,
  algorithms: Object.keys(ALGORITHM_RESOURCE_REGISTRY).length,
  removedLegacyInventory: true
}, null, 2));

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CURRENT_RELEASE } from '../shared/resources/release/current-release.js';
import { SITE_RUNTIME_CONTRACT } from '../shared/resources/release/site-runtime-contract.v3990_0.js';
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
  UI_ACTIVE_RESOURCE_CLASSIFICATIONS,
  UI_STABLE_RESOURCE_REGISTRY,
  UI_COMPONENT_REGISTRY,
  UI_CSS_RESOURCE_GRAPH,
  UI_RESOURCE_POLICIES
} from '../shared/ui/ui-resource-registry.v3990_0.js';
import { ALGORITHM_RESOURCE_REGISTRY } from '../shared/algorithms/algorithm-registry.js';
import { RESOURCE_EXECUTION_REGISTRY } from '../shared/governance/resource-execution-contract.v3990_0.js';

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
const PAGINATION_SNAPSHOT_GUARD_PATH = '/ln-rank/js/feature/major-pool/pagination-snapshot-guard.v3990_0.js?v=3990_0';

assert.equal(CURRENT_RELEASE.display, 'v3.9.90.0');
assert.equal(CURRENT_RELEASE.assetVersion, 'v3990_0');
assert.equal(CURRENT_RELEASE.sharedResourceGraphVersion, 'site-resource-graph-v3990_0');
assert.equal(CURRENT_RELEASE.uiResourceRegistryVersion, 'ui-resource-registry-v3990_0');
assert.equal(CURRENT_RELEASE.cssResourceGraphVersion, 'css-resource-graph-v3990_0');
assert.equal(CURRENT_RELEASE.dataResourceGraphVersion, 'data-resource-graph-v3990_0');
assert.equal(CURRENT_RELEASE.resourceDecommissionPolicyVersion, 'resource-decommission-v3990_0');
assert.equal(SHARED_RESOURCE_CENTER_VERSION, CURRENT_RELEASE.assetVersion);
assert.equal(SHARED_RESOURCE_GRAPH_VERSION, CURRENT_RELEASE.sharedResourceGraphVersion);
assert.equal(DATA_RESOURCE_GRAPH_VERSION, CURRENT_RELEASE.dataResourceGraphVersion);
assert.equal(RESOURCE_DECOMMISSION_POLICY_VERSION, CURRENT_RELEASE.resourceDecommissionPolicyVersion);
assert.equal(UI_RESOURCE_REGISTRY_VERSION, CURRENT_RELEASE.uiResourceRegistryVersion);
assert.equal(UI_CSS_RESOURCE_GRAPH_VERSION, CURRENT_RELEASE.cssResourceGraphVersion);

assert.equal(CURRENT_RELEASE.resourceOwners.resourceRegistry, '/shared/resources/resource-registry.js');
assert.equal(CURRENT_RELEASE.resourceOwners.uiResourceRegistry, '/shared/ui/ui-resource-registry.v3990_0.js');
assert.equal(CURRENT_RELEASE.resourceOwners.ui, CURRENT_RELEASE.resourceOwners.uiResourceRegistry);
assert.equal(CURRENT_RELEASE.resourceOwners.uiComponents, CURRENT_RELEASE.resourceOwners.uiResourceRegistry);
assert.equal(SHARED_RESOURCE_REGISTRY.governance.module, CURRENT_RELEASE.resourceOwners.resourceRegistry);
assert.equal(SHARED_RESOURCE_REGISTRY.governance.uiRegistry, CURRENT_RELEASE.resourceOwners.uiResourceRegistry);
assert.equal(SHARED_RESOURCE_REGISTRY.ui.registry, CURRENT_RELEASE.resourceOwners.uiResourceRegistry);
assert.equal(SHARED_RESOURCE_REGISTRY.ui.version, UI_RESOURCE_REGISTRY_VERSION);
assert.equal(SHARED_RESOURCE_REGISTRY.interaction.owner, CURRENT_RELEASE.resourceOwners.interactionRuntime);
assert.equal(SHARED_RESOURCE_REGISTRY.interaction.nativeChooserActivationOwner, CURRENT_RELEASE.resourceOwners.nativeChooserActivation);
assert.equal(SHARED_RESOURCE_REGISTRY.regions.interactionOwner, CURRENT_RELEASE.resourceOwners.nativeChooserActivation);

const entrypointMap = Object.freeze({
  familyShellJs: 'familyShell',
  familyShellCss: 'familyShellStyles',
  familyPlanEntryJs: 'familyPlanEntry',
  familyPlanEntryCss: 'familyPlanEntryStyles',
  interactionJs: 'interactionRuntime',
  interactionCss: 'interactionStyles',
  homeRuntime: 'homeRuntime',
  selectionBootstrap: 'selectionBootstrap',
  selectionRuntime: 'selectionRuntime',
  selectionWorkspace: 'selectionWorkspace',
  familyPlanBootstrap: 'familyPlanBootstrap',
  familyPlanRuntime: 'familyPlanRuntime'
});
for (const [uiKey, contractKey] of Object.entries(entrypointMap)) {
  assert.equal(UI_ACTIVE_RESOURCE_REGISTRY[uiKey], `/${strip(SITE_RUNTIME_CONTRACT.activeEntrypoints[contractKey])}`, `active UI graph mismatch: ${uiKey}`);
  assert.equal(UI_ACTIVE_RESOURCE_CLASSIFICATIONS[uiKey], SITE_RUNTIME_CONTRACT.activeEntrypointClassifications[contractKey], `active UI classification mismatch: ${uiKey}`);
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
  if (item.classification === 'current-generation') {
    assert.ok(item.path.includes('.v3990_0.'), `current CSS is not v3990_0: ${item.path}`);
  }
}
for (const component of Object.values(UI_COMPONENT_REGISTRY)) {
  assert.ok(component.id, 'component id missing');
  assert.ok(component.domOwner, `component DOM owner missing: ${component.id}`);
  assert.ok(component.cssOwner, `component CSS owner missing: ${component.id}`);
  assert.ok(exists(component.domOwner), `component DOM owner missing on disk: ${component.domOwner}`);
  assert.ok(cssPaths.includes(component.cssOwner), `component CSS owner is outside canonical graph: ${component.cssOwner}`);
  if (component.supplementalCssOwner) assert.ok(cssPaths.includes(component.supplementalCssOwner));
}

const interactionComponent = UI_COMPONENT_REGISTRY.interactionTransaction;
assert.equal(interactionComponent.nativeChooserActivationOwner, CURRENT_RELEASE.resourceOwners.nativeChooserActivation);
assert.ok(interactionComponent.policies.preActivationDomMutationForbidden);
assert.ok(interactionComponent.policies.singlePhysicalEventFamily);
assert.ok(interactionComponent.policies.tailGuardAfterOutcomeOnly);
assert.ok(interactionComponent.policies.userAgentBranchForbidden);
assert.ok(UI_RESOURCE_POLICIES.currentGenerationAndDeclaredStableDependenciesSeparated);
assert.ok(UI_RESOURCE_POLICIES.nativeChooserPreActivationDomMutationForbidden);
assert.ok(UI_RESOURCE_POLICIES.nativeChooserSinglePhysicalEventFamily);
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
  CURRENT_RELEASE.resourceOwners.majorBandsRankIndex,
  CURRENT_RELEASE.resourceOwners.majorBandsRankIndexBuilder,
  CURRENT_RELEASE.resourceOwners.majorBandsOrchestrator,
  CURRENT_RELEASE.resourceOwners.majorBandsRankBucketLoader,
  CURRENT_RELEASE.resourceOwners.majorBandsResultOrder,
  CURRENT_RELEASE.resourceOwners.majorBandsResponseTransport,
  CURRENT_RELEASE.resourceOwners.historyScoreRankEvidence,
  CURRENT_RELEASE.resourceOwners.reports,
  CURRENT_RELEASE.resourceOwners.interactionRuntime,
  CURRENT_RELEASE.resourceOwners.interactionStyles
];
requirePaths('data and interaction owner graph', requiredDataOwners);

assert.equal(SHARED_RESOURCE_REGISTRY.localStrength.data, CURRENT_RELEASE.resourceOwners.localStrengthData);
assert.equal(SHARED_RESOURCE_REGISTRY.all211.data, CURRENT_RELEASE.resourceOwners.all211Data);
assert.equal(SHARED_RESOURCE_REGISTRY.majorBands.cacheOwner, CURRENT_RELEASE.resourceOwners.majorBandsBucketCacheOwner);
assert.equal(RESOURCE_EXECUTION_REGISTRY.majorBands.bucketCacheOwner, CURRENT_RELEASE.resourceOwners.majorBandsBucketCacheOwner);
assert.equal(SHARED_RESOURCE_REGISTRY.majorBands.rankIndex, CURRENT_RELEASE.resourceOwners.majorBandsRankIndex);
assert.equal(SHARED_RESOURCE_REGISTRY.majorBands.queryKernel, CURRENT_RELEASE.resourceOwners.majorBandsOrchestrator);
assert.equal(RESOURCE_EXECUTION_REGISTRY.majorBands.queryKernelOwner, CURRENT_RELEASE.resourceOwners.majorBandsOrchestrator);
assert.equal(SHARED_RESOURCE_REGISTRY.majorBands.stableBucketWorker, CURRENT_RELEASE.resourceOwners.majorBandsStableBucketWorker);
assert.equal(RESOURCE_EXECUTION_REGISTRY.familyAction.owner, CURRENT_RELEASE.resourceOwners.familyAction);
assert.equal(RESOURCE_EXECUTION_REGISTRY.interaction.owner, CURRENT_RELEASE.resourceOwners.interactionRuntime);
assert.equal(RESOURCE_EXECUTION_REGISTRY.interaction.nativeChooserActivationOwner, CURRENT_RELEASE.resourceOwners.nativeChooserActivation);
assert.equal(RESOURCE_EXECUTION_REGISTRY.interaction.activationContractVersion, CURRENT_RELEASE.nativeChooserActivationVersion);

const registrySource = read('shared/resources/resource-registry.js');
for (const marker of [
  "current-release.js?v=3990_0",
  "ui-resource-registry.v3990_0.js?v=3990_0",
  "preActivationPolicy: 'memory-only-no-dom-disabled-inert-or-pointer-events-mutation'",
  "tailGuardPolicy: 'begin-after-input-change-focus-return-or-bounded-close-signal'"
]) assert.ok(registrySource.includes(marker), `shared registry missing current marker: ${marker}`);
for (const forbidden of [
  "current-release.js?v=3969_0",
  "ui-resource-registry.v3972_5.js?v=3972_5",
  "registry: '/shared/ui/ui-registry.v3965_0.js'"
]) assert.ok(!registrySource.includes(forbidden), `shared registry still claims stale current resource: ${forbidden}`);

assert.ok(!fs.existsSync(path.join(ROOT, 'ln-rank/active-assets.json')), 'stale active-assets.json still exists');
assert.ok(!fs.existsSync(path.join(ROOT, 'ln-rank/release-meta.json')), 'stale release-meta.json still exists');
const manifest = JSON.parse(read('ln-rank/site-active-generation.v3990_0.json'));
assert.equal(manifest.releaseVersion, CURRENT_RELEASE.display);
assert.equal(manifest.generation, CURRENT_RELEASE.siteRuntimeGeneration);
assert.equal(manifest.queryVersion, CURRENT_RELEASE.asset);
assert.equal(manifest.resourceGraph.registry, CURRENT_RELEASE.resourceOwners.resourceRegistry);
assert.equal(manifest.resourceGraph.uiRegistry, CURRENT_RELEASE.resourceOwners.uiResourceRegistry);
assert.equal(manifest.resourceGraph.version, CURRENT_RELEASE.sharedResourceGraphVersion);
assert.equal(manifest.resourceGraph.cssVersion, CURRENT_RELEASE.cssResourceGraphVersion);
assert.equal(manifest.resourceGraph.dataVersion, CURRENT_RELEASE.dataResourceGraphVersion);
assert.equal(manifest.resourceGraph.decommissionPolicyVersion, CURRENT_RELEASE.resourceDecommissionPolicyVersion);
assert.equal(manifest.interactionContract.owner, CURRENT_RELEASE.resourceOwners.nativeChooserActivation);
assert.deepEqual(manifest.currentGenerationInternalModules, {
  majorBandsPaginationSnapshotGuard: PAGINATION_SNAPSHOT_GUARD_PATH
});
requirePaths('current internal module graph', Object.values(manifest.currentGenerationInternalModules));
assert.ok(manifest.policies.currentAndStableEntrypointsSeparated);
assert.ok(manifest.policies.currentInternalModulesDeclared);
assert.ok(manifest.policies.majorBandsBrowserSnapshotGuardBounded);
assert.ok(manifest.policies.majorBandsBrowserSnapshotMismatchRejectedBeforeMerge);
assert.ok(manifest.policies.nativeChooserPreActivationDomMutationForbidden);
assert.ok(manifest.policies.nativeChooserSinglePhysicalEventFamily);
assert.ok(manifest.policies.nativeChooserTailGuardAfterOutcomeOnly);
assert.ok(!('legacyInventory' in manifest));

console.log(JSON.stringify({
  ok: true,
  release: CURRENT_RELEASE.display,
  generation: CURRENT_RELEASE.siteRuntimeGeneration,
  resourceGraph: SHARED_RESOURCE_GRAPH_VERSION,
  uiRegistry: UI_RESOURCE_REGISTRY_VERSION,
  cssGraph: UI_CSS_RESOURCE_GRAPH_VERSION,
  dataGraph: DATA_RESOURCE_GRAPH_VERSION,
  currentUiResources: Object.values(UI_ACTIVE_RESOURCE_CLASSIFICATIONS).filter(value => value === 'current-generation').length,
  currentInternalModules: Object.keys(manifest.currentGenerationInternalModules).length,
  declaredStableActiveUiResources: Object.values(UI_ACTIVE_RESOURCE_CLASSIFICATIONS).filter(value => value === 'declared-stable-dependency').length,
  stableUiResources: Object.keys(UI_STABLE_RESOURCE_REGISTRY).length,
  components: Object.keys(UI_COMPONENT_REGISTRY).length,
  algorithms: Object.keys(ALGORITHM_RESOURCE_REGISTRY).length,
  nativeChooserActivationOwner: CURRENT_RELEASE.resourceOwners.nativeChooserActivation,
  majorBandsPaginationSnapshotGuard: manifest.currentGenerationInternalModules.majorBandsPaginationSnapshotGuard
}, null, 2));

import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CURRENT_RELEASE } from '../shared/resources/release/current-release.js';

assert.equal(CURRENT_RELEASE.display, 'v3.9.90.3');
assert.equal(CURRENT_RELEASE.version, 'v3.9.90.3');
assert.equal(CURRENT_RELEASE.assetReleaseVersion, 'v3.9.90.3');
assert.equal(CURRENT_RELEASE.assetVersion, 'v3990_3');
assert.equal(CURRENT_RELEASE.siteRuntimeGeneration, 'v3990_3');
assert.equal(CURRENT_RELEASE.asset, '3990_3');
assert.equal(CURRENT_RELEASE.siteRuntimeContractVersion, 'site-runtime-coherence-v3990_3');
assert.equal(CURRENT_RELEASE.resourceExecutionVersion, 'resource-execution-v3990_3');
assert.equal(CURRENT_RELEASE.runtimeCacheVersion, 'runtime-cache-coherence-v3990_3');
assert.equal(CURRENT_RELEASE.selectionWorkspaceVersion, 'selection-workspace-orchestration-v3990_3');
assert.equal(CURRENT_RELEASE.interactionVersion, 'interaction-transaction-v3990_3');
assert.equal(CURRENT_RELEASE.nativeChooserActivationVersion, 'native-chooser-activation-integrity-v3990_3');
assert.equal(CURRENT_RELEASE.sharedResourceGraphVersion, 'site-resource-graph-v3990_3');
assert.equal(CURRENT_RELEASE.uiResourceRegistryVersion, 'ui-resource-registry-v3990_3');
assert.equal(CURRENT_RELEASE.cssResourceGraphVersion, 'css-resource-graph-v3990_3');
assert.equal(CURRENT_RELEASE.dataResourceGraphVersion, 'data-resource-graph-v3990_3');
assert.equal(CURRENT_RELEASE.resourceDecommissionPolicyVersion, 'resource-decommission-v3990_3');
assert.equal(CURRENT_RELEASE.productionResourceGraphVerificationVersion, 'production-resource-graph-verification-v3990_3');

assert.equal(CURRENT_RELEASE.tongxueRuntimeVersion, 'tongxue-runtime-v159-r3968');
assert.equal(CURRENT_RELEASE.localStrengthDataVersion, 'local-strength-static-v3971_2');
assert.equal(CURRENT_RELEASE.all211DataVersion, 'all-211-static-v3972_0');
assert.equal(CURRENT_RELEASE.majorBandsVersion, 'major-bands-static-v3972_2');
assert.equal(CURRENT_RELEASE.majorBandsOrchestrationVersion, 'major-bands-single-worker-rank-window-v3990_3');
assert.equal(CURRENT_RELEASE.majorBandsBucketCacheVersion, 'major-bands-rank-bucket-cache-v3990_3');
assert.equal(CURRENT_RELEASE.majorBandsRankIndexVersion, 'major-bands-rank-index-v3990_3');
assert.equal(CURRENT_RELEASE.majorBandsQueryKernelVersion, 'major-bands-rank-query-kernel-v3990_3');
assert.equal(CURRENT_RELEASE.majorBandsPaginationVersion, 'stable-full-id-snapshot-v3990_3');
assert.equal(CURRENT_RELEASE.majorBandsStableWorkerVersion, 'major-bands-bounded-fanout-v3972_5');
assert.equal(CURRENT_RELEASE.resourceOwners.majorBandsRankIndex, '/functions/_lib/major-bands-rank-index.v3990_3.js');
assert.equal(CURRENT_RELEASE.resourceOwners.majorBandsOrchestrator, '/functions/_lib/major-bands-rank-query-kernel.v3990_3.js');

const html = fs.readFileSync('ln-rank/index.html', 'utf8');
for (const marker of [
  'data-release="v3.9.90.3"',
  'data-site-runtime-generation="v3990_3"',
  'data-ui-interaction-version="interaction-transaction-v3990_3"',
  '/shared/ui/interaction/interaction-transaction.v3990_3.css?v=3990_3',
  '/shared/ui/interaction/interaction-transaction.v3990_3.js?v=3990_3',
  '/ln-rank/js/app.v3990_3.js?v=3990_3',
  '<span data-current-release>v3.9.90.3</span>'
]) assert.ok(html.includes(marker), `ln-rank page missing canonical release marker: ${marker}`);
for (const forbidden of [
  'data-release="v3.9.72.5"',
  'data-site-runtime-generation="v3972_5"',
  'interaction-transaction.v3972_5.js?v=3972_5',
  'app.v3972_5.js?v=3972_5'
]) assert.ok(!html.includes(forbidden), `ln-rank page still mounts retired current marker: ${forbidden}`);

const releaseContract = fs.readFileSync('functions/_lib/release-contract.js', 'utf8');
assert.ok(releaseContract.includes('export const LN_RANK_RELEASE_CONTRACT'));
assert.ok(releaseContract.includes('export const RELEASE_CONTRACT = LN_RANK_RELEASE_CONTRACT'));

console.log(JSON.stringify({
  ok: true,
  release: CURRENT_RELEASE.display,
  generation: CURRENT_RELEASE.siteRuntimeGeneration,
  query: CURRENT_RELEASE.asset,
  interaction: CURRENT_RELEASE.interactionVersion,
  stableBusinessResourcesPreserved: true
}, null, 2));

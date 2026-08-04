import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CURRENT_RELEASE } from '../shared/resources/release/current-release.js';
import { PRODUCTION_RESOURCE_VERIFICATION_CONTRACT as CONTRACT } from '../shared/governance/production-resource-verification-contract.v3990_0.js';

const manifest = JSON.parse(fs.readFileSync('ln-rank/site-active-generation.v3990_0.json', 'utf8'));
const exists = value => fs.existsSync(String(value).split('?')[0].replace(/^\//, ''));
const PAGINATION_SNAPSHOT_GUARD_PATH = '/ln-rank/js/feature/major-pool/pagination-snapshot-guard.v3990_0.js';
const PAGINATION_SNAPSHOT_GUARD_MANIFEST_PATH = `${PAGINATION_SNAPSHOT_GUARD_PATH}?v=3990_0`;
const QUERY_CACHE_VERSION = 'major-bands-query-execution-cache-serialized-request-timer-v3990_0';
const EXECUTION_GATE_VERSION = 'major-bands-query-execution-gate-v3990_0';
const EXECUTION_GATE_MODE = 'request-owned-timer-polling';
const REQUEST_BAND_LOADER_VERSION = 'major-bands-rank-bucket-loader-request-band-scope-v3990_0';

assert.equal(CONTRACT.version, 'production-resource-graph-verification-v3990_0');
assert.equal(CONTRACT.statusContext, 'production/resource-graph-v3990.0');
assert.equal(CONTRACT.releaseVersion, CURRENT_RELEASE.display);
assert.equal(CONTRACT.generation, CURRENT_RELEASE.siteRuntimeGeneration);
assert.equal(CONTRACT.queryVersion, CURRENT_RELEASE.asset);
assert.equal(CONTRACT.resourceGraphVersion, CURRENT_RELEASE.sharedResourceGraphVersion);
assert.equal(CONTRACT.uiRegistryVersion, CURRENT_RELEASE.uiResourceRegistryVersion);
assert.equal(CONTRACT.cssGraphVersion, CURRENT_RELEASE.cssResourceGraphVersion);
assert.equal(CONTRACT.dataGraphVersion, CURRENT_RELEASE.dataResourceGraphVersion);
assert.equal(CONTRACT.interactionVersion, CURRENT_RELEASE.interactionVersion);
assert.equal(CONTRACT.nativeChooserActivationVersion, CURRENT_RELEASE.nativeChooserActivationVersion);
assert.equal(CONTRACT.pagesBase, 'https://gaokao-4y9.pages.dev');
assert.equal(CONTRACT.customBase, 'https://gaokao.powers.org.cn');
assert.equal(CONTRACT.requiredStaticResources.majorBandsPaginationSnapshotGuard, PAGINATION_SNAPSHOT_GUARD_PATH);

for (const value of Object.values(CONTRACT.requiredStaticResources)) {
  assert.ok(exists(value), `production verification references missing resource: ${value}`);
}
for (const value of CONTRACT.retiredResources) {
  assert.ok(!exists(value), `retired resource remains in source: ${value}`);
}
assert.equal(CONTRACT.dynamicResources.runtimeHealth, '/api/ln-rank-runtime-health');
assert.ok(CONTRACT.dynamicResources.majorBandsHealth.includes('/api/major-bands-health'));
assert.ok(CONTRACT.dynamicResources.majorBandsStandard.includes('rangePreset=standard'));
assert.ok(CONTRACT.dynamicResources.majorBandsWide.includes('rangePreset=wide'));
assert.ok(CONTRACT.dynamicResources.majorBandsSafe.includes('rangePreset=safe'));
assert.ok(CONTRACT.dynamicResources.majorBandsHighBoundary.includes('candidateScore=750'));
for (const [key, value] of Object.entries(CONTRACT.policies)) assert.equal(value, true, `production policy disabled: ${key}`);

assert.equal(manifest.resourceGraph.productionVerificationVersion, CONTRACT.version);
assert.equal(manifest.resourceGraph.productionVerificationOwner, '/shared/governance/production-resource-verification-contract.v3990_0.js');
assert.equal(manifest.policies.productionVerificationStatusRequired, true);
assert.equal(manifest.interactionContract.version, CONTRACT.interactionVersion);
assert.equal(manifest.interactionContract.activationVersion, CONTRACT.nativeChooserActivationVersion);
assert.equal(
  manifest.currentGenerationInternalModules.majorBandsPaginationSnapshotGuard,
  PAGINATION_SNAPSHOT_GUARD_MANIFEST_PATH
);
assert.equal(manifest.policies.currentInternalModulesDeclared, true);
assert.equal(manifest.policies.majorBandsBrowserSnapshotGuardBounded, true);
assert.equal(manifest.policies.majorBandsBrowserSnapshotMismatchRejectedBeforeMerge, true);

const workflow = fs.readFileSync('.github/workflows/verify-production-resource-graph-v3972_6.yml', 'utf8');
for (const marker of [
  'push:',
  'branches: [main]',
  'statuses: write',
  'production/resource-graph-v3990.0',
  'verify-production-resource-graph-v3990_0.mjs',
  'verify-production-pagination-snapshot-guard-v3990_0.mjs',
  'pagination-snapshot-guard.v3990_0.js',
  'PRODUCTION_PAGINATION_SNAPSHOT_EVIDENCE',
  'v3990-0-production-pagination-snapshot-guard.json',
  'Wait for bounded rank-query production deployment',
  QUERY_CACHE_VERSION,
  REQUEST_BAND_LOADER_VERSION,
  '"publicHttpSelfFanout":false',
  '"bucketWorkerCount":0',
  'PRODUCTION_RESOURCE_ATTEMPTS',
  'PRODUCTION_RESOURCE_WAIT_MS'
]) assert.ok(workflow.includes(marker), `production workflow missing ${marker}`);
for (const forbidden of [
  '"executionGateVersion":"major-bands-query-execution-gate-v3990_0"',
  '"maxConcurrentExecutions":2',
  '"crossRequestSemaphore":true'
]) assert.ok(!workflow.includes(forbidden), `production workflow reads unpublished API field: ${forbidden}`);

const verifier = fs.readFileSync('tools/verify-production-resource-graph-v3990_0.mjs', 'utf8');
for (const marker of [
  'CONTRACT.requiredStaticResources',
  'CONTRACT.retiredResources',
  'validateStaticSet',
  'validatePages',
  'interactionRuntime',
  'interactionStyles',
  'runtimeHealth',
  'productionVerificationVersion',
  'nativeChooserActivationVersion',
  'verifyMajorBandsPagination',
  'nextOffset did not strictly increase',
  'rank_unavailable_empty'
]) assert.ok(verifier.includes(marker), `production verifier missing ${marker}`);

const snapshotVerifier = fs.readFileSync('tools/verify-production-pagination-snapshot-guard-v3990_0.mjs', 'utf8');
for (const marker of [
  'CONTRACT.requiredStaticResources.majorBandsPaginationSnapshotGuard',
  'createMajorBandsPaginationSnapshotGuard',
  'verifySourceStateMachine',
  'pagination_snapshot_mismatch',
  'currentGenerationInternalModules',
  'majorBandsBrowserSnapshotGuardBounded',
  'majorBandsBrowserSnapshotMismatchRejectedBeforeMerge',
  'selection runtime snapshot owner',
  'runtime cache snapshot registration',
  'self-check snapshot coverage',
  'source guard retention exceeded budget'
]) assert.ok(snapshotVerifier.includes(marker), `pagination snapshot production verifier missing ${marker}`);

const concurrencyVerifier = fs.readFileSync('tools/verify-major-bands-preview-concurrency-v3990_0.mjs', 'utf8');
for (const marker of [
  QUERY_CACHE_VERSION,
  EXECUTION_GATE_VERSION,
  EXECUTION_GATE_MODE,
  REQUEST_BAND_LOADER_VERSION,
  'queryExecutionCacheVersion',
  'queryExecutionCacheStatus',
  "result.scenario === 'safe-449-near'",
  "source?.chunksRead), 6",
  "source?.staticIndexBytes), 621156"
]) assert.ok(concurrencyVerifier.includes(marker), `production concurrency verifier missing ${marker}`);
for (const forbidden of [
  'queryCacheState.crossRequestSemaphore',
  'queryCacheState.boundedDistinctExecutions',
  'queryCacheState.maxConcurrentExecutions'
]) assert.ok(!concurrencyVerifier.includes(forbidden), `concurrency verifier reads unpublished API state: ${forbidden}`);

const executionCache = fs.readFileSync('functions/_lib/major-bands-query-execution-cache.v3990_0.js', 'utf8');
for (const marker of [
  `MAJOR_BANDS_QUERY_EXECUTION_CACHE_VERSION = '${QUERY_CACHE_VERSION}'`,
  `MAJOR_BANDS_QUERY_EXECUTION_GATE_VERSION = '${EXECUTION_GATE_VERSION}'`,
  `MAJOR_BANDS_QUERY_EXECUTION_GATE_MODE = '${EXECUTION_GATE_MODE}'`,
  'MAX_CONCURRENT_EXECUTIONS = 2',
  'EXECUTION_SLOT_POLL_MS = 8',
  'waitForOwnTimer',
  'crossRequestSemaphore: true',
  'boundedDistinctExecutions: true',
  'requestOwnedTimerWait: true',
  'crossRequestResolverQueue: false'
]) assert.ok(executionCache.includes(marker), `bounded execution cache missing ${marker}`);
for (const forbidden of [
  'executionWaiters',
  'executionWaiters.push',
  'executionWaiters.shift'
]) assert.ok(!executionCache.includes(forbidden), `cross-request resolver queue returned: ${forbidden}`);

console.log(JSON.stringify({
  ok: true,
  release: CONTRACT.releaseVersion,
  generation: CONTRACT.generation,
  verification: CONTRACT.version,
  statusContext: CONTRACT.statusContext,
  requiredStaticResources: Object.keys(CONTRACT.requiredStaticResources).length,
  retiredResources: CONTRACT.retiredResources.length,
  paginationSnapshotGuard: CONTRACT.requiredStaticResources.majorBandsPaginationSnapshotGuard,
  paginationSnapshotProductionGate: true,
  queryExecutionCacheVersion: QUERY_CACHE_VERSION,
  executionGateVersion: EXECUTION_GATE_VERSION,
  executionGateMode: EXECUTION_GATE_MODE,
  maxConcurrentExecutions: 2,
  requestOwnedTimerWait: true,
  crossRequestResolverQueue: false,
  requestBandLoaderVersion: REQUEST_BAND_LOADER_VERSION,
  publishedApiContractOnly: true,
  boundedExecutionProductionGate: true
}, null, 2));

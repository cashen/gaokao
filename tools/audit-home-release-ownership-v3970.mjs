import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CURRENT_RELEASE } from '../shared/resources/release/current-release.js';
import { SITE_RUNTIME_CONTRACT } from '../shared/resources/release/site-runtime-contract.v3972_6.js';
import { LN_RANK_RUNTIME_CACHE_CONTRACT } from '../shared/resources/release/runtime-cache-contract.v3972_6.js';
import { RESOURCE_EXECUTION_REGISTRY } from '../shared/governance/resource-execution-contract.v3972_6.js';
import { SHARED_RESOURCE_GRAPH_VERSION } from '../shared/resources/resource-registry.js';

const read = path => fs.readFileSync(path, 'utf8');
const headerBlock = (headers, route) => headers.match(new RegExp(`^${route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\n((?:  .*(?:\n|$))+)`, 'm'))?.[1] || '';
const home = read('index.html');
const runtime = read('ln-rank/js/ux/family-home.v3972_5.js');
const headers = read('_headers');
const manifest = JSON.parse(read('ln-rank/site-active-generation.v3972_6.json'));
const releaseContract = read('functions/_lib/release-contract.js');

assert.equal(CURRENT_RELEASE.display, 'v3.9.72.6');
assert.equal(CURRENT_RELEASE.assetVersion, 'v3972_6');
assert.equal(CURRENT_RELEASE.assetReleaseVersion, 'v3.9.72.6');
assert.equal(CURRENT_RELEASE.siteRuntimeGeneration, 'v3972_6');
assert.equal(CURRENT_RELEASE.sharedResourceGraphVersion, SHARED_RESOURCE_GRAPH_VERSION);
assert.equal(CURRENT_RELEASE.homeEntryVersion, 'family-home-runtime-v3972_5');
assert.equal(CURRENT_RELEASE.resourceOwners.homeStructure, '/index.html');
assert.equal(CURRENT_RELEASE.resourceOwners.homeRuntime, '/ln-rank/js/ux/family-home.v3972_5.js');
assert.equal(CURRENT_RELEASE.resourceOwners.homeIndustryMapEntry, '/index.html#[data-home-industry-map-entry]');
assert.equal(CURRENT_RELEASE.resourceOwners.industryMap, '/Public_company/');
assert.equal(RESOURCE_EXECUTION_REGISTRY.home.owner, '/ln-rank/js/ux/family-home.v3972_5.js');
assert.equal(RESOURCE_EXECUTION_REGISTRY.home.structureOwner, '/index.html');
assert.equal(RESOURCE_EXECUTION_REGISTRY.home.classification, 'declared-stable-dependency');
assert.equal(LN_RANK_RUNTIME_CACHE_CONTRACT.entrypoints.homeRuntime, '/ln-rank/js/ux/family-home.v3972_5.js?v=3972_5');
assert.equal(LN_RANK_RUNTIME_CACHE_CONTRACT.owners.home, '/ln-rank/js/ux/family-home.v3972_5.js');
assert.ok(LN_RANK_RUNTIME_CACHE_CONTRACT.declaredStableActiveModules.includes('/ln-rank/js/ux/family-home.v3972_5.js'));
assert.ok(!LN_RANK_RUNTIME_CACHE_CONTRACT.activeGenerationModules.includes('/ln-rank/js/ux/family-home.v3972_5.js'));
assert.equal(SITE_RUNTIME_CONTRACT.generation, CURRENT_RELEASE.siteRuntimeGeneration);
assert.equal(SITE_RUNTIME_CONTRACT.activeEntrypointClassifications.homeRuntime, 'declared-stable-dependency');

for (const marker of [
  'data-release="v3.9.72.6"',
  'data-site-runtime-generation="v3972_6"',
  'family-shell.v3972_5.css?v=3972_5',
  'family-plan-entry.v3972_5.css?v=3972_5',
  'family-home.v3972_5.js?v=3972_5',
  '家庭方案与逐项复核',
  'data-current-release>v3.9.72.6',
  'data-home-industry-map-entry',
  'href="/Public_company/"',
  '全国上市公司产业落地图'
]) assert.ok(home.includes(marker), `root home missing ${marker}`);

assert.equal((home.match(/data-home-industry-map-entry/g) || []).length, 1, 'industry map entry must have one homepage owner');
for (const stale of ['family-home.v3970_0.js?v=3970_0', 'family-shell.v3970_0.css?v=3970_0', 'data-release="v3.9.70.0"', 'data-release="v3.9.72.5"']) {
  assert.ok(!home.includes(stale), `root home still activates ${stale}`);
}

assert.equal((home.match(/<script type="module"/g) || []).length, 1, 'root home must have one module bootstrap owner');
for (const marker of [
  'release-presenter.v3972_5.js?v=3972_5',
  'family-shell.v3972_5.js?v=3972_5',
  'family-decision-contract.v3970_0.js?v=3970_0',
  "HOME_RUNTIME_VERSION = 'family-home-runtime-v3972_5'",
  "window.addEventListener('gaokao:selection-change'",
  'generation: release.siteRuntimeGeneration',
  'releaseOwner: release.resourceOwners.release',
  'shellOwner: release.resourceOwners.familyShell',
  'stateOwner: release.resourceOwners.familyDecisionState'
]) assert.ok(runtime.includes(marker), `home runtime missing ${marker}`);
assert.ok(!runtime.includes('MutationObserver'), 'home runtime must not add a structural observer');
assert.equal((runtime.match(/setInterval\(/g) || []).length, 1, 'home countdown must have one timer owner');

for (const route of ['/', '/index.html']) {
  const block = headerBlock(headers, route);
  assert.ok(block, `headers missing ${route}`);
  assert.match(block, /Cache-Control: no-cache, max-age=0, must-revalidate/, `${route} must revalidate`);
}

assert.equal(manifest.releaseVersion, CURRENT_RELEASE.display);
assert.equal(manifest.generation, CURRENT_RELEASE.siteRuntimeGeneration);
assert.equal(manifest.declaredStableActiveEntrypoints.home, '/ln-rank/js/ux/family-home.v3972_5.js?v=3972_5');
assert.equal(manifest.resourceGraph.version, SHARED_RESOURCE_GRAPH_VERSION);
assert.equal(manifest.resourceGraph.registry, CURRENT_RELEASE.resourceOwners.resourceRegistry);
assert.equal(manifest.resourceGraph.uiRegistry, CURRENT_RELEASE.resourceOwners.uiResourceRegistry);
assert.equal(manifest.policies.historicalAssetsCannotClaimActiveOwnership, true);
assert.equal(manifest.policies.currentAndStableEntrypointsSeparated, true);
assert.ok(!('legacyInventory' in manifest));
assert.ok(!('legacyInventoryIsActiveOwner' in manifest));
assert.ok(!fs.existsSync('ln-rank/active-assets.json'));

for (const marker of [
  'homeReleaseSingleOwnerContract: true',
  'homeStaticRuntimeParityContract: true',
  'homeCurrentShellContract: true',
  'productionReleaseVerificationContract: true',
  'export const LN_RANK_RELEASE_CONTRACT',
  'export const RELEASE_CONTRACT = LN_RANK_RELEASE_CONTRACT'
]) assert.ok(releaseContract.includes(marker), `release contract missing ${marker}`);

console.log(JSON.stringify({
  ok: true,
  release: CURRENT_RELEASE.display,
  generation: CURRENT_RELEASE.siteRuntimeGeneration,
  resourceGraph: SHARED_RESOURCE_GRAPH_VERSION,
  homeRuntime: CURRENT_RELEASE.homeEntryVersion,
  homeClassification: SITE_RUNTIME_CONTRACT.activeEntrypointClassifications.homeRuntime,
  industryMap: CURRENT_RELEASE.resourceOwners.industryMap,
  bootstrapCount: (home.match(/<script type="module"/g) || []).length,
  homeHtmlCache: 'revalidate',
  activeHome: manifest.declaredStableActiveEntrypoints.home,
  productionGate: true
}, null, 2));

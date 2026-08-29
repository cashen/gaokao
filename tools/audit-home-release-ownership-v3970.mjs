import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CURRENT_RELEASE } from '../shared/resources/release/current-release.js';
import { SITE_RUNTIME_CONTRACT } from '../shared/resources/release/site-runtime-contract.v3990_3.js';
import { LN_RANK_RUNTIME_CACHE_CONTRACT } from '../shared/resources/release/runtime-cache-contract.v3990_3.js';
import { RESOURCE_EXECUTION_REGISTRY } from '../shared/governance/resource-execution-contract.v3990_3.js';
import { SHARED_RESOURCE_GRAPH_VERSION } from '../shared/resources/resource-registry.js';

const read = file => fs.readFileSync(file, 'utf8');
const headerBlock = (headers, route) => headers.match(new RegExp(`^${route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\n((?:  .*(?:\n|$))+)`, 'm'))?.[1] || '';
const home = read('index.html');
const runtime = read('ln-rank/js/ux/family-home.v3990_3.js');
const headers = read('_headers');
const manifest = JSON.parse(read('ln-rank/site-active-generation.v3990_3.json'));
const releaseContract = read('functions/_lib/release-contract.js');

assert.equal(CURRENT_RELEASE.display, 'v3.9.90.3');
assert.equal(CURRENT_RELEASE.assetVersion, 'v3990_3');
assert.equal(CURRENT_RELEASE.assetReleaseVersion, 'v3.9.90.3');
assert.equal(CURRENT_RELEASE.siteRuntimeGeneration, 'v3990_3');
assert.equal(CURRENT_RELEASE.sharedResourceGraphVersion, SHARED_RESOURCE_GRAPH_VERSION);
assert.equal(CURRENT_RELEASE.homeEntryVersion, 'family-home-runtime-v3990_3-r031');
assert.equal(CURRENT_RELEASE.homeUiRevision, 'r031-home-redesign');
assert.equal(CURRENT_RELEASE.resourceOwners.homeStructure, '/index.html');
assert.equal(CURRENT_RELEASE.resourceOwners.homeRuntime, '/ln-rank/js/ux/family-home.v3990_3.js');
assert.equal(CURRENT_RELEASE.resourceOwners.familyShell, '/shared/ui/shell/family-shell.v3990_3.js');
assert.equal(CURRENT_RELEASE.resourceOwners.familyShellStyles, '/shared/ui/shell/family-shell.v3972_5.css');
assert.equal(CURRENT_RELEASE.resourceOwners.homeIndustryMapEntry, '/index.html#[data-home-industry-map-entry]');
assert.equal(CURRENT_RELEASE.resourceOwners.industryMap, '/Public_company/');

assert.equal(RESOURCE_EXECUTION_REGISTRY.home.owner, '/ln-rank/js/ux/family-home.v3990_3.js');
assert.equal(RESOURCE_EXECUTION_REGISTRY.home.structureOwner, '/index.html');
assert.equal(RESOURCE_EXECUTION_REGISTRY.home.classification, 'current-generation');
assert.equal(RESOURCE_EXECUTION_REGISTRY.home.schemaVersion, 'family-home-runtime-v3990_3-r031');
assert.equal(LN_RANK_RUNTIME_CACHE_CONTRACT.entrypoints.homeRuntime, '/ln-rank/js/ux/family-home.v3990_3.js?v=3990_3-nav003&r=r031-home-redesign');
assert.equal(LN_RANK_RUNTIME_CACHE_CONTRACT.owners.home, '/ln-rank/js/ux/family-home.v3990_3.js');
assert.ok(LN_RANK_RUNTIME_CACHE_CONTRACT.activeGenerationModules.includes('/ln-rank/js/ux/family-home.v3990_3.js'));
assert.ok(!LN_RANK_RUNTIME_CACHE_CONTRACT.declaredStableActiveModules.includes('/ln-rank/js/ux/family-home.v3990_3.js'));
assert.ok(LN_RANK_RUNTIME_CACHE_CONTRACT.declaredStableActiveModules.includes('/shared/ui/shell/family-shell.v3972_5.css'));
assert.equal(SITE_RUNTIME_CONTRACT.generation, CURRENT_RELEASE.siteRuntimeGeneration);
assert.equal(SITE_RUNTIME_CONTRACT.activeEntrypointClassifications.homeRuntime, 'current-generation');
assert.equal(SITE_RUNTIME_CONTRACT.activeEntrypointClassifications.familyShellStyles, 'declared-stable-dependency');

for (const marker of [
  'data-release="v3.9.90.3"',
  'data-site-runtime-generation="v3990_3"',
  'family-shell.v3972_5.css?v=3972_5',
  'family-plan-entry.v3972_5.css?v=3972_5',
  'family-home.v3990_3.js?v=3990_3',
  '家庭方案与逐项复核',
  'data-current-release>v3.9.90.3',
  'data-home-major-path-entry',
  'href="/major-path/"',
  '专业升学地图',
  'data-home-industry-map-entry',
  'href="/Public_company/"',
  '全国上市公司产业落地图',
  'data-countdown-precision="second"',
  'id="h2027"',
  'id="m2027"',
  'id="s2027"'
]) assert.ok(home.includes(marker), `root home missing ${marker}`);

assert.equal((home.match(/data-home-major-path-entry/g) || []).length, 1, 'major path entry must have one homepage owner');
assert.equal((home.match(/data-home-industry-map-entry/g) || []).length, 1, 'industry map entry must have one homepage owner');
const majorPathIndex = home.indexOf('data-home-major-path-entry');
const scoreEquivalenceIndex = home.indexOf('data-score-equivalence-entry="home"');
const industryIndex = home.indexOf('data-home-industry-map-entry');
assert.ok(majorPathIndex > 0 && majorPathIndex < scoreEquivalenceIndex && scoreEquivalenceIndex < industryIndex, 'homepage support links must keep major path before score history and industry map');
for (const stale of [
  'family-home.v3970_0.js?v=3970_0',
  'family-home.v3972_5.js?v=3972_5',
  'family-shell.v3972_5.js?v=3972_5',
  'data-release="v3.9.70.0"',
  'data-release="v3.9.72.5"'
]) assert.ok(!home.includes(stale), `root home still activates ${stale}`);

assert.equal((home.match(/<script type="module"/g) || []).length, 1, 'root home must have one module bootstrap owner');
for (const marker of [
  'release-presenter.v3990_3.js?v=3990_3',
  'family-shell.v3990_3.js?v=3990_3',
  'family-decision-contract.v3970_0.js?v=3970_0',
  "HOME_RUNTIME_VERSION = 'family-home-runtime-v3990_3-r031'",
  "HOME_UI_REVISION = 'r031-home-redesign'",
  "window.addEventListener('gaokao:selection-change'",
  'generation: release.siteRuntimeGeneration',
  'releaseOwner: release.resourceOwners.release',
  'shellOwner: release.resourceOwners.familyShell',
  'stateOwner: release.resourceOwners.familyDecisionState',
  "second: '2-digit'",
  "countdownPrecision: 'second'",
  'countdownIntervalMs: 1000',
  'setInterval(renderCountdown, 1000)'
]) assert.ok(runtime.includes(marker), `home runtime missing ${marker}`);
for (const stale of ['release-presenter.v3972_5.js?v=3972_5', 'family-shell.v3972_5.js?v=3972_5']) {
  assert.ok(!runtime.includes(stale), `home runtime imports retired current infrastructure ${stale}`);
}
assert.ok(!runtime.includes('MutationObserver'), 'home runtime must not add a structural observer');
assert.equal((runtime.match(/setInterval\(/g) || []).length, 1, 'home countdown must have one timer owner');
assert.equal((home.match(/data-countdown-precision="second"/g) || []).length, 1, 'home must have one second-precision countdown');
assert.equal((home.match(/id="[dhms]2027"/g) || []).length, 4, 'home countdown must expose four stable time cells');

for (const route of ['/', '/index.html']) {
  const block = headerBlock(headers, route);
  assert.ok(block, `headers missing ${route}`);
  assert.match(block, /Cache-Control: no-cache, max-age=0, must-revalidate/, `${route} must revalidate`);
}

assert.equal(manifest.releaseVersion, CURRENT_RELEASE.display);
assert.equal(manifest.generation, CURRENT_RELEASE.siteRuntimeGeneration);
assert.equal(manifest.currentGenerationEntrypoints.home, '/ln-rank/js/ux/family-home.v3990_3.js?v=3990_3-nav003&r=r031-home-redesign');
assert.equal(manifest.declaredStableActiveEntrypoints.familyShellStyles, '/shared/ui/shell/family-shell.v3972_5.css?v=3972_5');
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
  stableShellCss: CURRENT_RELEASE.resourceOwners.familyShellStyles,
  majorPath: '/major-path/',
  industryMap: CURRENT_RELEASE.resourceOwners.industryMap,
  bootstrapCount: (home.match(/<script type="module"/g) || []).length,
  homeHtmlCache: 'revalidate',
  activeHome: manifest.currentGenerationEntrypoints.home,
  productionGate: true
}, null, 2));

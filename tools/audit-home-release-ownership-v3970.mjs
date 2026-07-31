import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CURRENT_RELEASE } from '../shared/resources/release/current-release.js';
import { LN_RANK_RUNTIME_CACHE_CONTRACT } from '../shared/resources/release/runtime-cache-contract.v3970_0.js';
import { RESOURCE_EXECUTION_REGISTRY } from '../shared/governance/resource-execution-contract.v3970_0.js';

const read = path => fs.readFileSync(path, 'utf8');
const headerBlock = (headers, route) => headers.match(new RegExp(`^${route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\n((?:  .*(?:\n|$))+)`, 'm'))?.[1] || '';
const home = read('index.html');
const runtime = read('ln-rank/js/ux/family-home.v3970_0.js');
const headers = read('_headers');
const active = JSON.parse(read('ln-rank/active-assets.json'));
const meta = JSON.parse(read('ln-rank/release-meta.json'));
const releaseContract = read('functions/_lib/release-contract.js');

assert.equal(CURRENT_RELEASE.display, 'v3.9.72.0');
assert.equal(CURRENT_RELEASE.assetVersion, 'v3970_0');
assert.equal(CURRENT_RELEASE.assetReleaseVersion, 'v3.9.70.0');
assert.equal(CURRENT_RELEASE.homeEntryVersion, 'home-industry-map-entry-v3970_1');
assert.equal(CURRENT_RELEASE.resourceOwners.homeStructure, '/index.html');
assert.equal(CURRENT_RELEASE.resourceOwners.homeRuntime, '/ln-rank/js/ux/family-home.v3970_0.js');
assert.equal(CURRENT_RELEASE.resourceOwners.homeIndustryMapEntry, '/index.html#[data-home-industry-map-entry]');
assert.equal(CURRENT_RELEASE.resourceOwners.industryMap, '/Public_company/');
assert.equal(RESOURCE_EXECUTION_REGISTRY.home.owner, '/ln-rank/js/ux/family-home.v3970_0.js');
assert.equal(RESOURCE_EXECUTION_REGISTRY.home.structureOwner, '/index.html');
assert.equal(LN_RANK_RUNTIME_CACHE_CONTRACT.entrypoints.home, '/ln-rank/js/ux/family-home.v3970_0.js?v=3970_0');
assert.equal(LN_RANK_RUNTIME_CACHE_CONTRACT.owners.home, '/ln-rank/js/ux/family-home.v3970_0.js');
assert.ok(LN_RANK_RUNTIME_CACHE_CONTRACT.activeGenerationModules.includes('/ln-rank/js/ux/family-home.v3970_0.js'));
assert.ok(!LN_RANK_RUNTIME_CACHE_CONTRACT.activeGenerationModules.includes('/ln-rank/js/ux/family-home.v3968_0.js'));

for (const marker of [
  'data-release="v3.9.72.0"',
  'family-shell.v3970_0.css?v=3970_0',
  'family-plan-entry.v3970_0.css?v=3970_0',
  'family-home.v3970_0.js?v=3970_0',
  '家庭方案与逐项复核',
  'data-current-release>v3.9.72.0',
  'data-home-industry-map-entry',
  'href="/Public_company/"',
  '全国上市公司产业落地图'
]) assert.ok(home.includes(marker), `root home missing ${marker}`);

assert.equal((home.match(/data-home-industry-map-entry/g) || []).length, 1, 'industry map entry must have one homepage owner');

for (const stale of [
  'family-home.v3968_0.js',
  'family-shell.v3965_0.js',
  'data-release="v3.9.68.0"',
  'data-current-release>v3.9.68.0'
]) assert.ok(!home.includes(stale), `root home still activates ${stale}`);

assert.equal((home.match(/<script type="module"/g) || []).length, 1, 'root home must have one module bootstrap owner');
for (const marker of [
  'release-presenter.v3970_0.js?v=3970_0',
  'family-shell.v3970_0.js?v=3970_0',
  'family-decision-contract.v3970_0.js?v=3970_0',
  "HOME_RUNTIME_VERSION = 'family-home-runtime-v3970_0'",
  "window.addEventListener('gaokao:selection-change'",
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
for (const route of [
  '/ln-rank/js/ux/family-home.v3970_0.js',
  '/shared/ui/shell/family-shell.v3970_0.js',
  '/shared/ui/shell/family-shell.v3970_0.css',
  '/shared/ui/components/family-plan-entry.v3970_0.js',
  '/shared/ui/components/family-plan-entry.v3970_0.css'
]) {
  const block = headerBlock(headers, route);
  assert.ok(block, `headers missing ${route}`);
  assert.match(block, /Cache-Control: public, max-age=31536000, immutable/, `${route} must be immutable`);
}

for (const [payload, name] of [[active, 'active'], [meta, 'meta']]) {
  assert.equal(payload.version, CURRENT_RELEASE.assetReleaseVersion, `${name} asset-lineage release`);
  assert.equal(payload.assetVersion, 'v3970_0', `${name} asset`);
  assert.equal(payload.familyHomeJs, 'js/ux/family-home.v3970_0.js', `${name} home owner`);
  assert.ok(payload.jsEntry.includes('js/ux/family-home.v3970_0.js'), `${name} current home absent`);
  assert.ok(!payload.jsEntry.includes('js/ux/family-home.v3968_0.js'), `${name} old home still active`);
  assert.ok(payload.html.includes('../index.html'), `${name} root home not tracked`);
  for (const flag of ['homeReleaseSingleOwnerContract', 'homeStaticRuntimeParityContract', 'homeCurrentShellContract', 'productionReleaseVerificationContract']) {
    assert.equal(payload[flag], true, `${name} missing ${flag}`);
  }
}

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
  assetRelease: CURRENT_RELEASE.assetReleaseVersion,
  homeRuntime: 'family-home-runtime-v3970_0',
  industryMap: CURRENT_RELEASE.resourceOwners.industryMap,
  bootstrapCount: (home.match(/<script type="module"/g) || []).length,
  homeHtmlCache: 'revalidate',
  homeRuntimeCache: 'immutable',
  activeHome: active.familyHomeJs,
  productionGate: active.productionReleaseVerificationContract
}, null, 2));

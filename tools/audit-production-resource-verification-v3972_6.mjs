import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CURRENT_RELEASE } from '../shared/resources/release/current-release.js';
import { PRODUCTION_RESOURCE_VERIFICATION_CONTRACT as CONTRACT } from '../shared/governance/production-resource-verification-contract.v3972_6.js';

const manifest = JSON.parse(fs.readFileSync('ln-rank/site-active-generation.v3972_6.json', 'utf8'));
const exists = value => fs.existsSync(String(value).replace(/^\//, ''));

assert.equal(CONTRACT.version, 'production-resource-graph-verification-v3972_6');
assert.equal(CONTRACT.statusContext, 'production/resource-graph-v3972.6');
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

for (const value of Object.values(CONTRACT.requiredStaticResources)) {
  assert.ok(exists(value), `production verification references missing resource: ${value}`);
}
for (const value of CONTRACT.retiredResources) {
  assert.ok(!exists(value), `retired resource remains in source: ${value}`);
}
assert.equal(CONTRACT.dynamicResources.runtimeHealth, '/api/ln-rank-runtime-health');
for (const [key, value] of Object.entries(CONTRACT.policies)) assert.equal(value, true, `production policy disabled: ${key}`);

assert.equal(manifest.resourceGraph.productionVerificationVersion, CONTRACT.version);
assert.equal(manifest.resourceGraph.productionVerificationOwner, '/shared/governance/production-resource-verification-contract.v3972_6.js');
assert.equal(manifest.policies.productionVerificationStatusRequired, true);
assert.equal(manifest.interactionContract.version, CONTRACT.interactionVersion);
assert.equal(manifest.interactionContract.activationVersion, CONTRACT.nativeChooserActivationVersion);

const workflow = fs.readFileSync('.github/workflows/verify-production-resource-graph-v3972_6.yml', 'utf8');
for (const marker of [
  'push:',
  'branches: [main]',
  'statuses: write',
  'production/resource-graph-v3972.6',
  'verify-production-resource-graph-v3972_6.mjs',
  'PRODUCTION_RESOURCE_ATTEMPTS',
  'PRODUCTION_RESOURCE_WAIT_MS'
]) assert.ok(workflow.includes(marker), `production workflow missing ${marker}`);

const verifier = fs.readFileSync('tools/verify-production-resource-graph-v3972_6.mjs', 'utf8');
for (const marker of [
  'CONTRACT.requiredStaticResources',
  'CONTRACT.retiredResources',
  'validateStaticSet',
  'validatePages',
  'interactionRuntime',
  'interactionStyles',
  'runtimeHealth',
  'productionVerificationVersion',
  'nativeChooserActivationVersion'
]) assert.ok(verifier.includes(marker), `production verifier missing ${marker}`);

console.log(JSON.stringify({
  ok: true,
  release: CONTRACT.releaseVersion,
  generation: CONTRACT.generation,
  verification: CONTRACT.version,
  statusContext: CONTRACT.statusContext,
  requiredStaticResources: Object.keys(CONTRACT.requiredStaticResources).length,
  retiredResources: CONTRACT.retiredResources.length
}, null, 2));

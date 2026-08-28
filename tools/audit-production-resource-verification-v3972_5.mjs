import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CURRENT_RELEASE } from '../shared/resources/release/current-release.js';
import { PRODUCTION_RESOURCE_VERIFICATION_CONTRACT as CONTRACT } from '../shared/governance/production-resource-verification-contract.v3972_5.js';

const manifest = JSON.parse(fs.readFileSync('ln-rank/site-active-generation.v3972_5.json', 'utf8'));
const exists = path => fs.existsSync(String(path).replace(/^\//, ''));

assert.equal(CONTRACT.version, 'production-resource-graph-verification-v3972_5');
assert.equal(CONTRACT.statusContext, 'production/resource-graph-v3972.5');
assert.equal(CONTRACT.releaseVersion, CURRENT_RELEASE.display);
assert.equal(CONTRACT.generation, CURRENT_RELEASE.siteRuntimeGeneration);
assert.equal(CONTRACT.resourceGraphVersion, CURRENT_RELEASE.sharedResourceGraphVersion);
assert.equal(CONTRACT.uiRegistryVersion, CURRENT_RELEASE.uiResourceRegistryVersion);
assert.equal(CONTRACT.cssGraphVersion, CURRENT_RELEASE.cssResourceGraphVersion);
assert.equal(CONTRACT.dataGraphVersion, CURRENT_RELEASE.dataResourceGraphVersion);
assert.equal(CONTRACT.pagesBase, 'https://gaokao-4y9.pages.dev');
assert.equal(CONTRACT.customBase, 'https://gaokao.powers.org.cn');

for (const path of Object.values(CONTRACT.requiredStaticResources)) {
  assert.ok(exists(path), `production verification references missing resource: ${path}`);
}
for (const path of CONTRACT.retiredResources) {
  assert.ok(!exists(path), `retired resource remains in source: ${path}`);
}
assert.equal(CONTRACT.dynamicResources.runtimeHealth, '/api/ln-rank-runtime-health');
assert.ok(CONTRACT.policies.pagesStaticResourcesMustReturn200);
assert.ok(CONTRACT.policies.customStaticResourcesMustReturn200);
assert.ok(CONTRACT.policies.retiredResourcesMustReturn404);
assert.ok(CONTRACT.policies.runtimeHealthMustMatchGeneration);
assert.ok(CONTRACT.policies.commitStatusRequired);
assert.ok(CONTRACT.policies.sourceAndProductionEvidenceRequired);
assert.ok(CONTRACT.policies.customHtmlChallengeBoundarySeparate);

assert.equal(manifest.resourceGraph.productionVerificationVersion, CONTRACT.version);
assert.equal(
  manifest.resourceGraph.productionVerificationOwner,
  '/shared/governance/production-resource-verification-contract.v3972_5.js'
);
assert.equal(manifest.policies.productionVerificationStatusRequired, true);

const workflow = fs.readFileSync('.github/workflows/verify-production-resource-graph-v3972_5.yml', 'utf8');
for (const marker of [
  'push:',
  'branches: [main]',
  'statuses: write',
  'production/resource-graph-v3972.5',
  'verify-production-resource-graph-v3972_5.mjs',
  'PRODUCTION_RESOURCE_ATTEMPTS',
  'PRODUCTION_RESOURCE_WAIT_MS'
]) assert.ok(workflow.includes(marker), `production workflow missing ${marker}`);

const verifier = fs.readFileSync('tools/verify-production-resource-graph-v3972_5.mjs', 'utf8');
for (const marker of [
  'CONTRACT.requiredStaticResources',
  'CONTRACT.retiredResources',
  'validateStaticSet',
  'validatePages',
  'runtimeHealth',
  'productionVerificationVersion',
  'productionVerificationOwner'
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

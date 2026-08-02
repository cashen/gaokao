import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { CURRENT_RELEASE } from '../shared/resources/release/current-release.js';
import { SITE_RUNTIME_CONTRACT } from '../shared/resources/release/site-runtime-contract.v3972_5.js';
import { LN_RANK_RUNTIME_CACHE_CONTRACT } from '../shared/resources/release/runtime-cache-contract.v3972_5.js';
import {
  SHARED_RESOURCE_GRAPH_VERSION,
  DATA_RESOURCE_GRAPH_VERSION,
  RESOURCE_DECOMMISSION_POLICY_VERSION
} from '../shared/resources/resource-registry.js';
import {
  UI_RESOURCE_REGISTRY_VERSION,
  UI_CSS_RESOURCE_GRAPH_VERSION
} from '../shared/ui/ui-resource-registry.v3972_5.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const canonicalRelease = 'v3.9.72.5';
const canonicalGeneration = 'v3972_5';
const canonicalQuery = '3972_5';
const retiredPublicRelease = ['v3', '9', '72', '2'].join('.');
const excludedPrefixes = [
  'docs/release-acceptance/',
  'ln-rank/data/local-strength/',
  'ln-rank/data/211-static/'
];

function generationFromRelease(version) {
  const match = /^v(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(version);
  assert.ok(match, `invalid canonical release ${version}`);
  return `v${match[1]}${match[2]}${match[3]}_${match[4]}`;
}

function findRetiredReleaseReferences() {
  const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT })
    .toString('utf8')
    .split('\0')
    .filter(Boolean);
  const matches = [];
  for (const rel of tracked) {
    if (excludedPrefixes.some(prefix => rel.startsWith(prefix))) continue;
    const absolute = path.join(ROOT, rel);
    let source;
    try {
      source = fs.readFileSync(absolute, 'utf8');
    } catch {
      continue;
    }
    if (source.includes(retiredPublicRelease)) matches.push(rel);
  }
  return matches;
}

assert.equal(CURRENT_RELEASE.display, canonicalRelease);
assert.equal(CURRENT_RELEASE.version, canonicalRelease);
assert.equal(CURRENT_RELEASE.assetReleaseVersion, canonicalRelease);
assert.equal(CURRENT_RELEASE.siteRuntimeGeneration, canonicalGeneration);
assert.equal(CURRENT_RELEASE.assetVersion, canonicalGeneration);
assert.equal(CURRENT_RELEASE.asset, canonicalQuery);
assert.equal(generationFromRelease(CURRENT_RELEASE.version), canonicalGeneration);
assert.equal(SITE_RUNTIME_CONTRACT.releaseVersion, canonicalRelease);
assert.equal(SITE_RUNTIME_CONTRACT.generation, canonicalGeneration);
assert.equal(SITE_RUNTIME_CONTRACT.queryVersion, canonicalQuery);
assert.equal(LN_RANK_RUNTIME_CACHE_CONTRACT.releaseVersion, canonicalRelease);
assert.equal(LN_RANK_RUNTIME_CACHE_CONTRACT.assetVersion, canonicalGeneration);
assert.equal(CURRENT_RELEASE.sharedResourceGraphVersion, SHARED_RESOURCE_GRAPH_VERSION);
assert.equal(CURRENT_RELEASE.uiResourceRegistryVersion, UI_RESOURCE_REGISTRY_VERSION);
assert.equal(CURRENT_RELEASE.cssResourceGraphVersion, UI_CSS_RESOURCE_GRAPH_VERSION);
assert.equal(CURRENT_RELEASE.dataResourceGraphVersion, DATA_RESOURCE_GRAPH_VERSION);
assert.equal(CURRENT_RELEASE.resourceDecommissionPolicyVersion, RESOURCE_DECOMMISSION_POLICY_VERSION);
assert.equal(CURRENT_RELEASE.resourceOwners.resourceRegistry, '/shared/resources/resource-registry.js');
assert.equal(CURRENT_RELEASE.resourceOwners.uiResourceRegistry, '/shared/ui/ui-resource-registry.v3972_5.js');
assert.equal(CURRENT_RELEASE.resourceOwners.ui, CURRENT_RELEASE.resourceOwners.uiResourceRegistry);
assert.equal(CURRENT_RELEASE.resourceOwners.uiComponents, CURRENT_RELEASE.resourceOwners.uiResourceRegistry);

for (const rel of ['index.html', 'ln-rank/index.html', 'ln-rank/selection-pool.html', 'ln-rank/211-mainline.html']) {
  const html = read(rel);
  assert.ok(html.includes(`data-release="${canonicalRelease}"`), `${rel} does not declare canonical release`);
  assert.ok(!html.includes(`data-release="${retiredPublicRelease}"`), `${rel} exposes retired public release`);
}

const manifest = JSON.parse(read('ln-rank/site-active-generation.v3972_5.json'));
assert.equal(manifest.releaseVersion, canonicalRelease);
assert.equal(manifest.generation, canonicalGeneration);
assert.equal(manifest.resourceGraph.version, SHARED_RESOURCE_GRAPH_VERSION);
assert.equal(manifest.resourceGraph.uiRegistry, CURRENT_RELEASE.resourceOwners.uiResourceRegistry);
assert.equal(manifest.resourceGraph.cssVersion, UI_CSS_RESOURCE_GRAPH_VERSION);
assert.equal(manifest.resourceGraph.dataVersion, DATA_RESOURCE_GRAPH_VERSION);
assert.equal(manifest.resourceGraph.decommissionPolicyVersion, RESOURCE_DECOMMISSION_POLICY_VERSION);
assert.ok(!('legacyInventory' in manifest));
assert.ok(!('legacyInventoryIsActiveOwner' in manifest));
assert.ok(!fs.existsSync(path.join(ROOT, 'ln-rank/active-assets.json')), 'retired active-assets inventory remains');
assert.equal(read('VERSION.txt').trim(), canonicalRelease);

const skill = read('docs/skills/unified-site-release/SKILL.md');
assert.ok(skill.includes('three encodings of the same release identity'));
assert.ok(skill.includes('never keep an older public version while publishing a newer active runtime'));

const stable = SITE_RUNTIME_CONTRACT.preservedBusinessResources;
assert.equal(stable.localStrength, 'local-strength-static-v3971_2');
assert.equal(stable.all211, 'all-211-static-v3972_0');
assert.equal(stable.majorBands, 'major-bands-static-v3972_2');

const retiredReferences = findRetiredReleaseReferences();
assert.deepEqual(
  retiredReferences,
  [],
  `retired public release remains in active tracked files: ${retiredReferences.join(', ')}`
);

console.log(JSON.stringify({
  ok: true,
  canonicalRelease,
  canonicalGeneration,
  canonicalQuery,
  resourceGraph: SHARED_RESOURCE_GRAPH_VERSION,
  uiRegistry: UI_RESOURCE_REGISTRY_VERSION,
  cssGraph: UI_CSS_RESOURCE_GRAPH_VERSION,
  dataGraph: DATA_RESOURCE_GRAPH_VERSION,
  activeRetiredReferenceCount: retiredReferences.length,
  removedLegacyInventory: true,
  preservedBusinessResources: stable
}, null, 2));

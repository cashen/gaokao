import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { CURRENT_RELEASE } from '../shared/resources/release/current-release.js';
import { SITE_RUNTIME_CONTRACT } from '../shared/resources/release/site-runtime-contract.v3972_5.js';
import { LN_RANK_RUNTIME_CACHE_CONTRACT } from '../shared/resources/release/runtime-cache-contract.v3972_5.js';

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

for (const rel of ['index.html', 'ln-rank/index.html', 'ln-rank/selection-pool.html', 'ln-rank/211-mainline.html']) {
  const html = read(rel);
  assert.ok(html.includes(`data-release="${canonicalRelease}"`), `${rel} does not declare canonical release`);
  assert.ok(!html.includes(`data-release="${retiredPublicRelease}"`), `${rel} exposes retired public release`);
}

const manifest = JSON.parse(read('ln-rank/site-active-generation.v3972_5.json'));
assert.equal(manifest.releaseVersion, canonicalRelease);
assert.equal(manifest.generation, canonicalGeneration);
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
  activeRetiredReferenceCount: retiredReferences.length,
  preservedBusinessResources: stable
}, null, 2));

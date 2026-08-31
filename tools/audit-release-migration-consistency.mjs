#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const repoFile = relativePath => path.join(root, String(relativePath).replace(/^\/+/, ''));
const importRepoModule = relativePath => import(pathToFileURL(repoFile(relativePath)).href);
const failures = [];
const fail = (condition, message) => { if (!condition) failures.push(message); };

const { CURRENT_RELEASE } = await importRepoModule('shared/resources/release/current-release.js');
const { SITE_RUNTIME_CONTRACT } = await importRepoModule(CURRENT_RELEASE.resourceOwners.siteRuntimeContract);
const activeManifestPath = `ln-rank/site-active-generation.${CURRENT_RELEASE.assetVersion}.json`;
const activeManifest = JSON.parse(fs.readFileSync(repoFile(activeManifestPath), 'utf8'));
const clean = value => String(value || '').split(/[?#]/, 1)[0].replace(/^\/+/, '');

fail(CURRENT_RELEASE.display === CURRENT_RELEASE.version, 'display and version disagree');
fail(CURRENT_RELEASE.assetVersion === CURRENT_RELEASE.siteRuntimeGeneration, 'asset and runtime generation disagree');
fail(CURRENT_RELEASE.asset === CURRENT_RELEASE.assetVersion.replace(/^v/, ''), 'asset query is not derived from assetVersion');
fail(activeManifest.releaseVersion === CURRENT_RELEASE.version, `active manifest release mismatch: ${activeManifest.releaseVersion}`);
fail(activeManifest.generation === CURRENT_RELEASE.siteRuntimeGeneration, `active manifest generation mismatch: ${activeManifest.generation}`);
fail(activeManifest.queryVersion === CURRENT_RELEASE.asset, `active manifest query mismatch: ${activeManifest.queryVersion}`);
fail(activeManifest.contractVersion === SITE_RUNTIME_CONTRACT.version, `active manifest contract mismatch: ${activeManifest.contractVersion}`);
fail(SITE_RUNTIME_CONTRACT.releaseVersion === CURRENT_RELEASE.version, 'runtime contract is not migrated to canonical release');
fail(SITE_RUNTIME_CONTRACT.generation === CURRENT_RELEASE.siteRuntimeGeneration, 'runtime contract is not migrated to active generation');
fail(SITE_RUNTIME_CONTRACT.queryVersion === CURRENT_RELEASE.asset, 'runtime contract is not migrated to active query');

const currentEntries = Object.entries(activeManifest.currentGenerationEntrypoints || {});
const internalEntries = Object.entries(activeManifest.currentGenerationInternalModules || {});
for (const [name, value] of [...currentEntries, ...internalEntries]) {
  const local = repoFile(clean(value));
  fail(fs.existsSync(local), `canonical active entry is missing: ${name} -> ${value}`);
  if (/\.(?:js|mjs|css|json)(?:[?#]|$)/.test(String(value))) {
    fail(String(value).includes(CURRENT_RELEASE.asset), `canonical active entry has stale query: ${name} -> ${value}`);
    fail(!/(?:v3990_0|v3990_1|v3990_2)(?:[./?]|$)/.test(String(value)), `retired entry remains in current generation: ${name} -> ${value}`);
  }
}

const publicEntryPages = ['index.html', 'ln-rank/index.html', 'ln-rank/selection-pool.html', 'ln-rank/211-mainline.html', 'aiplus/index.html'];
for (const relative of publicEntryPages) {
  const source = fs.readFileSync(repoFile(relative), 'utf8');
  fail(source.includes(`data-release="${CURRENT_RELEASE.version}"`), `${relative}: canonical release marker missing`);
  fail(source.includes(`data-site-runtime-generation="${CURRENT_RELEASE.siteRuntimeGeneration}"`), `${relative}: canonical generation marker missing`);
}

const report = {
  audit: 'audit-release-migration-consistency',
  status: failures.length ? 'fail' : 'pass',
  sourceOfTruth: CURRENT_RELEASE.resourceOwners.release,
  activeManifest: activeManifestPath,
  release: CURRENT_RELEASE.version,
  generation: CURRENT_RELEASE.siteRuntimeGeneration,
  queryVersion: CURRENT_RELEASE.asset,
  checkedCurrentEntries: currentEntries.length,
  checkedInternalEntries: internalEntries.length,
  checkedPublicEntryPages: publicEntryPages.length,
  failures
};
fs.writeFileSync(repoFile(`ln-rank/release-migration-consistency-audit.${CURRENT_RELEASE.asset}.json`), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);

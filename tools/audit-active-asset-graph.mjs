#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const repoFile = relativePath => path.join(root, String(relativePath).replace(/^\/+/, ''));
const importRepoModule = relativePath => import(pathToFileURL(repoFile(relativePath)).href);
const failures = [];

const { CURRENT_RELEASE } = await importRepoModule('shared/resources/release/current-release.js');
const { SITE_RUNTIME_CONTRACT } = await importRepoModule(CURRENT_RELEASE.resourceOwners.siteRuntimeContract);
const activeManifestPath = `ln-rank/site-active-generation.${CURRENT_RELEASE.assetVersion}.json`;
const activeManifest = JSON.parse(fs.readFileSync(repoFile(activeManifestPath), 'utf8'));

const strip = value => String(value || '').split(/[?#]/, 1)[0].replace(/^\/+/, '');
const localPath = value => path.resolve(root, strip(value));
const exists = value => fs.existsSync(localPath(value));
const isSourceFile = value => /\.(?:js|mjs|css|json|html)$/i.test(strip(value));
const fail = (condition, message) => { if (!condition) failures.push(message); };

fail(activeManifest.releaseVersion === CURRENT_RELEASE.version,
  `active generation release mismatch: ${activeManifest.releaseVersion} != ${CURRENT_RELEASE.version}`);
fail(activeManifest.generation === CURRENT_RELEASE.siteRuntimeGeneration,
  `active generation mismatch: ${activeManifest.generation} != ${CURRENT_RELEASE.siteRuntimeGeneration}`);
fail(activeManifest.queryVersion === CURRENT_RELEASE.asset,
  `active asset query mismatch: ${activeManifest.queryVersion} != ${CURRENT_RELEASE.asset}`);
fail(activeManifest.contractVersion === SITE_RUNTIME_CONTRACT.version,
  `active contract mismatch: ${activeManifest.contractVersion} != ${SITE_RUNTIME_CONTRACT.version}`);
fail(SITE_RUNTIME_CONTRACT.releaseVersion === CURRENT_RELEASE.version,
  `runtime contract release mismatch: ${SITE_RUNTIME_CONTRACT.releaseVersion}`);
fail(SITE_RUNTIME_CONTRACT.generation === CURRENT_RELEASE.siteRuntimeGeneration,
  `runtime contract generation mismatch: ${SITE_RUNTIME_CONTRACT.generation}`);
fail(SITE_RUNTIME_CONTRACT.queryVersion === CURRENT_RELEASE.asset,
  `runtime contract query mismatch: ${SITE_RUNTIME_CONTRACT.queryVersion}`);

const currentEntries = Object.entries({
  ...(activeManifest.currentGenerationEntrypoints || {}),
  ...(activeManifest.currentGenerationInternalModules || {})
});
const stableEntries = Object.entries(activeManifest.declaredStableActiveEntrypoints || {});
const allSourceEntries = [...currentEntries, ...stableEntries];
for (const [name, value] of allSourceEntries) {
  fail(exists(value), `missing active resource ${name}: ${value}`);
  if (isSourceFile(value)) {
    const clean = strip(value);
    if (currentEntries.some(([currentName]) => currentName === name)) {
      fail(String(value).includes(CURRENT_RELEASE.asset), `current resource is not cache-versioned: ${name}: ${value}`);
      fail(!/(?:v3990_0|v3990_1|v3990_2)(?:[./?]|$)/.test(String(value)), `retired generation remains active: ${name}: ${value}`);
    }
    fail(fs.existsSync(path.resolve(root, clean)), `active resource path does not exist: ${name}: ${value}`);
  }
}

const importRe = /(?:import|export)\s+(?:[^'\"]*?from\s*)?['\"]([^'\"]+\.js(?:\?[^'\"]*)?)['\"]/g;
const seen = new Set();
function toRepoRelative(spec, fromRelative) {
  if (!spec.startsWith('/') && !spec.startsWith('.')) return null;
  const clean = strip(spec);
  if (!clean.endsWith('.js')) return null;
  const absolute = spec.startsWith('/')
    ? path.resolve(root, clean)
    : path.resolve(root, path.dirname(fromRelative), clean);
  const relative = path.relative(root, absolute).replaceAll('\\', '/');
  return relative.startsWith('..') ? null : relative;
}
function walk(relative) {
  if (seen.has(relative)) return;
  seen.add(relative);
  const absolute = path.resolve(root, relative);
  if (!fs.existsSync(absolute)) {
    failures.push(`missing active import: ${relative}`);
    return;
  }
  const source = fs.readFileSync(absolute, 'utf8');
  for (const match of source.matchAll(importRe)) {
    const next = toRepoRelative(match[1], relative);
    if (next) walk(next);
  }
}
for (const [, value] of currentEntries) {
  const clean = strip(value);
  if (clean.endsWith('.js') && exists(value)) walk(clean);
}

const report = {
  audit: 'audit-active-asset-graph',
  status: failures.length ? 'fail' : 'pass',
  sourceOfTruth: activeManifestPath,
  release: CURRENT_RELEASE.version,
  generation: CURRENT_RELEASE.siteRuntimeGeneration,
  queryVersion: CURRENT_RELEASE.asset,
  currentEntryCount: currentEntries.length,
  stableEntryCount: stableEntries.length,
  transitiveCurrentJsCount: seen.size,
  failures
};
const outputPath = path.join(root, 'ln-rank', `active-asset-graph-audit.${CURRENT_RELEASE.asset}.json`);
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);

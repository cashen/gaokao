import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CURRENT_RELEASE } from '../shared/resources/release/current-release.js';
import { SITE_RUNTIME_CONTRACT } from '../shared/resources/release/site-runtime-contract.v3990_1.js';

const root = process.cwd();
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const exists = relative => fs.existsSync(path.join(root, relative));
const strip = value => String(value || '').split('?')[0].replace(/^\//, '');

const handoffPath = 'docs/architecture/START-HERE.md';
const handoff = read(handoffPath);
const agents = read('AGENTS.md');

assert.ok(agents.includes(handoffPath), 'AGENTS.md must point every maintainer to the architecture handoff map');
for (const marker of [
  'SOURCE-OF-TRUTH:CURRENT-RELEASE',
  'SOURCE-OF-TRUTH:SITE-RUNTIME',
  'KNOWN-GAP:AIPLUS-WORKSPACE-TRANSITIVE',
  'KNOWN-COMPAT:CLOUDFLARE-VERIFIER-MAP',
  'NON-OWNER:ROOT-VERSION',
  'NON-OWNER:LN-RANK-VERSION'
]) assert.ok(handoff.includes(marker), `architecture handoff missing ${marker}`);

assert.equal(SITE_RUNTIME_CONTRACT.releaseVersion, CURRENT_RELEASE.version, 'site runtime release owner drift');
assert.equal(SITE_RUNTIME_CONTRACT.generation, CURRENT_RELEASE.siteRuntimeGeneration, 'site runtime generation owner drift');
assert.equal(SITE_RUNTIME_CONTRACT.queryVersion, CURRENT_RELEASE.asset, 'site runtime asset owner drift');
assert.equal(CURRENT_RELEASE.resourceOwners.release, '/shared/resources/release/current-release.js');
assert.equal(CURRENT_RELEASE.resourceOwners.siteRuntimeContract, '/shared/resources/release/site-runtime-contract.v3990_1.js');

const html = read('aiplus/index.html');
const app = read('aiplus/app.v3990_1.js');
const htmlRuntime = html.match(/<script[^>]+src="([^"]*app\.v3990_1\.js[^"]*)"/)?.[1] || '';
assert.ok(htmlRuntime, 'AIPLuS page must mount the current browser runtime');
assert.equal(strip(htmlRuntime), strip(SITE_RUNTIME_CONTRACT.activeEntrypoints.aiRuntime), 'AIPLuS page/runtime path drift');
assert.ok(html.includes(`data-release="${CURRENT_RELEASE.version}"`), 'AIPLuS page release identity drift');
assert.ok(html.includes(`data-site-runtime-generation="${CURRENT_RELEASE.siteRuntimeGeneration}"`), 'AIPLuS page site generation drift');

const workspaceImports = [...app.matchAll(/from\s+['"]([^'"]*ai-workspace-contract[^'"]*)['"]/g)].map(match => match[1]);
assert.equal(workspaceImports.length, 1, `AIPLuS browser must have one workspace contract import, got ${workspaceImports.length}`);
const declaredWorkspace = strip(SITE_RUNTIME_CONTRACT.activeEntrypoints.aiWorkspaceContract);
const actualWorkspace = strip(workspaceImports[0]);
assert.ok(exists(actualWorkspace), `AIPLuS actual workspace contract missing: ${actualWorkspace}`);
const knownWorkspaceTransitiveGap = actualWorkspace !== declaredWorkspace;
if (knownWorkspaceTransitiveGap) {
  assert.ok(handoff.includes('KNOWN-GAP:AIPLUS-WORKSPACE-TRANSITIVE'), 'workspace transitive generation gap must stay explicit until a canonical release reconciles it');
}

function productionFiles(directory) {
  const absolute = path.join(root, directory);
  if (!fs.existsSync(absolute)) return [];
  const output = [];
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    const relative = path.posix.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...productionFiles(relative));
    else if (/\.(?:js|mjs|html)$/.test(entry.name)) output.push(relative);
  }
  return output;
}

const legacyIntentPath = 'functions/_lib/ai/intent-interpreter.js';
assert.ok(exists(legacyIntentPath), 'declared legacy intent interpreter disappeared without a migration');
const legacyIntentRuntimeCallers = [];
for (const relative of ['aiplus', 'functions', 'shared', 'ln-rank'].flatMap(productionFiles)) {
  if (relative === legacyIntentPath) continue;
  if (read(relative).includes('intent-interpreter')) legacyIntentRuntimeCallers.push(relative);
}
assert.deepEqual(legacyIntentRuntimeCallers, [], `legacy intent interpreter regained production reachability: ${legacyIntentRuntimeCallers.join(', ')}`);

for (const legacyMarker of ['VERSION.txt', 'ln-rank/VERSION.txt']) {
  assert.ok(exists(legacyMarker), `legacy version marker unexpectedly missing: ${legacyMarker}`);
}
const releaseSource = read('shared/resources/release/current-release.js');
assert.ok(!releaseSource.includes("from '../../../VERSION.txt'"), 'canonical release must not import root VERSION.txt');
assert.ok(!releaseSource.includes('ln-rank/VERSION.txt'), 'canonical release must not import ln-rank/VERSION.txt');

const workflowPaths = Object.freeze({
  production: '.github/workflows/deploy-cloudflare-pages-main.yml',
  ai: '.github/workflows/verify-ai-workspace-v3990_1.yml',
  workerPreview: '.github/workflows/verify-worker-resource-vnext-preview.yml',
  workerProduction: '.github/workflows/verify-worker-resource-vnext-production.yml',
  finalRegression: '.github/workflows/verify-ln-2026-final.yml'
});
for (const [owner, workflow] of Object.entries(workflowPaths)) assert.ok(exists(workflow), `${owner} workflow missing: ${workflow}`);

const deployWorkflow = read(workflowPaths.production);
assert.ok(deployWorkflow.includes('verify-cloudflare-git-production-v3990_0.mjs'), 'active Cloudflare compatibility verifier mapping changed without architecture migration');
assert.ok(deployWorkflow.includes('s/v3990_0/v3990_1/g'), 'Cloudflare verifier generation mapping changed without architecture migration');
assert.ok(handoff.includes('KNOWN-COMPAT:CLOUDFLARE-VERIFIER-MAP'), 'active Cloudflare verifier compatibility must remain documented');

const releaseContract = read('functions/_lib/release-contract.js');
assert.ok(releaseContract.includes('export const LN_RANK_RELEASE_CONTRACT'), 'LN_RANK_RELEASE_CONTRACT export missing');
assert.ok(releaseContract.includes('export const RELEASE_CONTRACT = LN_RANK_RELEASE_CONTRACT'), 'RELEASE_CONTRACT compatibility export missing');

console.log(JSON.stringify({
  ok: true,
  version: 'architecture-handoff-v3990_1',
  release: CURRENT_RELEASE.version,
  generation: CURRENT_RELEASE.siteRuntimeGeneration,
  handoff: handoffPath,
  aiRuntime: strip(htmlRuntime),
  declaredWorkspace,
  actualWorkspace,
  knownWorkspaceTransitiveGap,
  legacyIntentRuntimeCallers,
  workflowOwners: workflowPaths,
  canonicalReleaseOwner: CURRENT_RELEASE.resourceOwners.release,
  protectedReleaseAliasPreserved: true
}, null, 2));

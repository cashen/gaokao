import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const requireText = (text, needle, label) => {
  assert.ok(text.includes(needle), label + ': missing ' + needle);
};

const release = read('shared/resources/release/current-release.js');
const manifest = read('shared/resources/release/active-resource-manifest.v3990_3.js');
const registry = read('shared/resources/resource-registry.js');
const siteRuntime = read('shared/resources/release/site-runtime-contract.v3990_3.js');
const cache = read('shared/resources/release/runtime-cache-contract.v3990_3.js');
const execution = read('shared/governance/resource-execution-contract.v3990_3.js');
const activeGeneration = JSON.parse(read('ln-rank/site-active-generation.v3990_3.json'));
const aiplusApp = read('aiplus/app.v3990_3.js');
const majorSourceProfile = read('ln-rank/kb/major-understanding/major-source-profile.generated.js');

requireText(release, "version: 'v3.9.90.3'", 'canonical release');
requireText(release, "siteRuntimeGeneration: 'v3990_3'", 'canonical runtime generation');
requireText(release, "asset: '3990_3'", 'canonical asset query');
requireText(release, "activeResourceManifestVersion: 'active-resource-manifest-v3990_3'", 'canonical manifest identity');

requireText(manifest, "ACTIVE_RESOURCE_MANIFEST_VERSION = 'active-resource-manifest-v3990_3'", 'active manifest version');
requireText(manifest, "version: CURRENT_RELEASE.version", 'manifest release version binding');
requireText(manifest, "generation: CURRENT_RELEASE.siteRuntimeGeneration", 'manifest generation binding');
requireText(manifest, "assetQuery: CURRENT_RELEASE.asset", 'manifest query binding');
for (const modulePath of [
  '/shared/ai/ai-workspace-contract.v3992_0.js?v=002_4&fdw=003_0',
  '/aiplus/render.v3992_0.js?v=002_4&fdw=003_0&focus=006_0',
  '/aiplus/history-store.v3992_4.js?v=002_4&fdw=003_0'
]) requireText(manifest, modulePath, 'AIPLuS transitive manifest');
for (const modulePath of [
  '/shared/ai/ai-workspace-contract.v3992_0.js',
  '/aiplus/render.v3992_0.js',
  '/aiplus/history-store.v3992_4.js'
]) requireText(aiplusApp, modulePath, 'AIPLuS browser graph');
requireText(manifest, "manifestVersion: 'pr194-major-source-profile-v001'", 'major source profile manifest');
requireText(manifest, "source: 'eo.srgaoxiao.cn'", 'major source profile source');
requireText(manifest, "chunkCount: 13", 'major source profile chunk count');
requireText(majorSourceProfile, "pr194", 'major source profile cache identity');
requireText(majorSourceProfile, "pr194-flow002", 'major source profile flow cache identity');

for (const needle of [
  'ACTIVE_RESOURCE_MANIFEST',
  'aiplusTransitive',
  'majorSourceProfile',
  'schoolDirectory'
]) requireText(registry, needle, 'shared resource registry');

for (const needle of [
  'resourceManifest',
  'aiplusWorkspaceImplementation',
  'aiplusRenderImplementation',
  'aiplusHistoryImplementation',
  'majorSourceProfile',
  'schoolDirectory',
  'schoolResourceCenter',
  'schoolDirectoryData'
]) requireText(siteRuntime, needle, 'site runtime contract');

for (const needle of [
  'declaredTransitiveImplementationModules',
  'declaredCurrentDataModules',
  'transitiveImplementationManifest',
  'dataResourceManifest'
]) requireText(cache, needle, 'runtime cache contract');

for (const needle of [
  'resourceManifest: entry',
  'aiplusTransitive: entry',
  'majorSourceProfile: entry',
  'schoolDirectory: entry'
]) requireText(execution, needle, 'resource execution contract');

assert.equal(activeGeneration.releaseVersion, 'v3.9.90.3', 'active generation release');
assert.equal(activeGeneration.generation, 'v3990_3', 'active generation runtime');
assert.equal(activeGeneration.queryVersion, '3990_3', 'active generation query');
assert.equal(
  activeGeneration.resourceGraph.resourceManifest,
  '/shared/resources/release/active-resource-manifest.v3990_3.js',
  'active generation manifest'
);
assert.equal(activeGeneration.policies.transitiveImplementationResourcesDeclared, true, 'transitive policy');
assert.equal(activeGeneration.policies.currentDataResourcesDeclared, true, 'data policy');
assert.equal(activeGeneration.policies.schoolDirectoryLoaderDeclared, true, 'school directory policy');

const publicPages = [
  'index.html',
  'ln-rank/index.html',
  'ln-rank/selection-pool.html',
  'aiplus/index.html'
];
for (const file of publicPages) {
  const html = read(file);
  requireText(html, 'data-release="v3.9.90.3"', file + ' public release');
  requireText(html, 'data-site-runtime-generation="v3990_3"', file + ' runtime generation');
}
requireText(read('index.html'), 'family-home.v3990_3.js?v=3990_3', 'home entrypoint');
requireText(read('ln-rank/index.html'), 'app.v3990_3.js?v=3990_3', 'selection entrypoint');
requireText(read('ln-rank/selection-pool.html'), 'selection-pool.v3990_3.js?v=3990_3', 'plan entrypoint');
requireText(read('aiplus/index.html'), 'app.v3990_3.js?v=002_4&scroll=002_1&fdw=003_0&focus=006_0', 'AIPLuS entrypoint');

const statusFiles = [
  'docs/architecture/AIPLUS-DECISION-FOCUS-STATUS.md',
  'docs/architecture/AIPLUS-SELECTION-DIAGNOSIS-STATUS.md',
  'docs/architecture/AIPLUS-FAMILY-DECISION-WORKBENCH-STATUS.md',
  'docs/architecture/UNIFIED-EXPERIENCE-CONTEXT-STATUS.md',
  'docs/architecture/UNIFIED-BACKGROUND-CONTEXT-STATUS.md'
];
for (const file of statusFiles) {
  const status = read(file);
  assert.match(status, /Current main snapshot|当前 main 快照/, file + ' current snapshot');
}
assert.doesNotMatch(
  read('docs/architecture/AIPLUS-DECISION-FOCUS-STATUS.md'),
  /public\/site release remains \`v3\.9\.90\.1 \/ v3990_1\`/,
  'Decision Focus stale public release'
);

console.log('resource-consistency-v3990_3: PASS');

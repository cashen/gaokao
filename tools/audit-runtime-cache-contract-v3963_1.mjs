import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const json = file => JSON.parse(read(file));
const exists = file => fs.existsSync(path.join(root, file));
const moduleUrl = file => `${pathToFileURL(path.join(root, file)).href}?audit=${Date.now()}`;

const { LN_RANK_RUNTIME_CACHE_CONTRACT: contract } = await import(
  moduleUrl('shared/resources/release/runtime-cache-contract.v3963_1.js')
);

function parseModuleSpecifiers(source) {
  const values = [];
  const patterns = [
    /\bimport\s+(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/g,
    /\bexport\s+(?:\*|\{[^}]*\})\s+from\s+['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) values.push(match[1]);
  }
  return [...new Set(values)];
}

function fileFromUrl(url) {
  return String(url).split('?')[0].replace(/^\/+/, '');
}

function buildGraph(entryUrl) {
  const entry = fileFromUrl(entryUrl);
  const queue = [entry];
  const modules = new Set();
  const edges = [];

  while (queue.length) {
    const from = queue.shift();
    if (modules.has(from)) continue;
    assert.ok(exists(from), `active runtime module missing: ${from}`);
    modules.add(from);
    const source = read(from);
    for (const specifier of parseModuleSpecifiers(source)) {
      if (!specifier.startsWith('.')) continue;
      const target = path.posix.normalize(
        path.posix.join(path.posix.dirname(from), fileFromUrl(specifier))
      );
      edges.push({ from, specifier, target });
      if (target.endsWith('.js')) queue.push(target);
    }
  }

  return { entry, modules, edges };
}

const searchPage = read('ln-rank/index.html');
const selectionPage = read('ln-rank/selection-pool.html');
assert.ok(searchPage.includes(`src="${contract.entries.search}"`), 'search page must own the single current bootstrap entry');
assert.ok(selectionPage.includes(`src="${contract.entries.selectionPool}"`), 'selection-pool page must own the current immutable entry');
assert.ok(searchPage.includes('id="runtimeStatusPanel"'), 'search page must statically own runtime status structure');
assert.ok(searchPage.includes('data-runtime-state="loading"'), 'search page must start in an honest loading state');
assert.ok(searchPage.includes('data-runtime-control disabled'), 'runtime-controlled actions must start disabled');

const bootstrap = read(fileFromUrl(contract.entries.search));
assert.equal(
  parseModuleSpecifiers(bootstrap).filter(specifier => !specifier.includes('app-runtime.v3963_1.js')).length,
  0,
  'bootstrap must have only one runtime dependency'
);
assert.ok(bootstrap.includes("setRuntimeState('error')"), 'bootstrap must expose a visible failure state');
assert.ok(bootstrap.includes('unlockRuntimeControls'), 'bootstrap must unlock controls only after runtime readiness');
assert.ok(!bootstrap.includes('MutationObserver'), 'bootstrap must not observe or patch layout');
assert.ok(!bootstrap.includes('setTimeout'), 'bootstrap must not use delayed DOM ownership');

const graphs = [
  buildGraph(contract.entries.search),
  buildGraph(contract.entries.selectionPool)
];
const allModules = new Set(graphs.flatMap(graph => [...graph.modules]));
const allEdges = graphs.flatMap(graph => graph.edges);

for (const item of contract.replacedMutableModules) {
  const legacy = fileFromUrl(item.legacy);
  const active = fileFromUrl(item.active);
  assert.ok(exists(active), `replacement module missing: ${active}`);
  assert.ok(allModules.has(active), `replacement module is not reachable from an active entry: ${active}`);
  const offenders = allEdges.filter(edge => edge.target === legacy);
  assert.deepEqual(
    offenders,
    [],
    `active graph still imports replaced mutable module ${item.legacy}: ${JSON.stringify(offenders)}`
  );
}

for (const activeUrl of contract.activeGenerationModules) {
  const active = fileFromUrl(activeUrl);
  assert.ok(exists(active), `declared generation module missing: ${active}`);
  assert.ok(allModules.has(active), `declared generation module is not reachable: ${active}`);
}

for (const item of contract.preservedPreviousGenerationAssets) {
  const file = fileFromUrl(item.path);
  assert.ok(exists(file), `previous immutable asset was removed: ${file}`);
  const content = fs.readFileSync(path.join(root, file));
  const header = Buffer.from(`blob ${content.length}\0`);
  const actual = crypto.createHash('sha1').update(header).update(content).digest('hex');
  assert.equal(actual, item.gitBlobSha, `previous immutable asset changed: ${file}`);
}

const currentReleaseEdges = allEdges.filter(
  edge => edge.target === 'shared/resources/release/current-release.js'
);
assert.ok(currentReleaseEdges.length >= 4, 'current release owner must be shared by search, shell and reports');
for (const edge of currentReleaseEdges) {
  assert.ok(
    edge.specifier.endsWith('?v=3963_1'),
    `current release owner uses a stale cache identity: ${edge.from} -> ${edge.specifier}`
  );
}

const staleFailureUrl = '../domain/flow-step-contract.js?v=3961_0';
assert.ok(
  !allEdges.some(edge => edge.specifier === staleFailureUrl),
  'the production-breaking flow contract URL must not remain active'
);

for (const file of [
  'ln-rank/js/app-runtime.v3963_1.js',
  'ln-rank/js/workspace/selection-workspace-orchestrator.v3963_1.js',
  'ln-rank/js/feature/school-majors/school-all-mode.v3963_1.js'
]) {
  const source = read(file);
  assert.ok(!source.includes('MutationObserver'), `${file} must not claim layout with MutationObserver`);
}

for (const file of ['ln-rank/active-assets.json', 'ln-rank/release-meta.json']) {
  const meta = json(file);
  assert.equal(meta.version, 'v3.9.63.1');
  assert.equal(meta.assetVersion, 'v3963_1');
  assert.equal(meta.runtimeCacheContractVersion, contract.version);
  assert.equal(meta.runtimeCacheCoherenceContract, true);
  assert.equal(meta.immutableChangedInterfaceContract, true);
  assert.equal(meta.runtimeFailureHonestyContract, true);
  assert.equal(meta.previousImmutableAssetsPreservedContract, true);
  assert.equal(meta.scoreSchoolFeishuBrowserJourneyContract, true);
  assert.ok(meta.jsEntry.includes('js/app.v3963_1.js'));
  assert.ok(meta.jsEntry.includes('js/app-runtime.v3963_1.js'));
  assert.ok(meta.jsEntry.includes('../shared/resources/release/runtime-cache-contract.v3963_1.js'));
}

const releaseContract = read('functions/_lib/release-contract.js');
for (const marker of [
  'LN_RANK_RELEASE_CONTRACT',
  'RELEASE_CONTRACT',
  'runtimeCacheCoherenceContract: true',
  'immutableChangedInterfaceContract: true',
  'runtimeFailureHonestyContract: true',
  'previousImmutableAssetsPreservedContract: true',
  'scoreSchoolFeishuBrowserJourneyContract: true',
  'feishuYearCaliberContract: true',
  'feishuServerAuthoritativeYearContract: true',
  'feishuPathAnalysisYearContract: true',
  'feishu2026PrimaryBrowserPayloadContract: true'
]) {
  assert.ok(releaseContract.includes(marker), `release contract missing ${marker}`);
}

console.log(JSON.stringify({
  ok: true,
  contract: contract.version,
  entries: graphs.map(graph => graph.entry),
  activeModules: allModules.size,
  activeEdges: allEdges.length,
  replacedMutableModules: contract.replacedMutableModules.length,
  preservedPreviousAssets: contract.preservedPreviousGenerationAssets.length,
  currentReleaseEdges: currentReleaseEdges.length,
  visibleFailureOwner: contract.owners.staticFailureState
}, null, 2));

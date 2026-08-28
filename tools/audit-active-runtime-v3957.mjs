import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { CURRENT_RELEASE } = await import(pathToFileURL(`${process.cwd()}/shared/resources/release/current-release.js`));
const active = JSON.parse(fs.readFileSync('ln-rank/active-assets.json', 'utf8'));
assert.equal(active.version, CURRENT_RELEASE.display);
assert.equal(active.assetVersion, CURRENT_RELEASE.assetVersion);
assert.equal(active.algorithmOrchestrationVersion, CURRENT_RELEASE.algorithmOrchestrationVersion);

const entryFiles = [
  ...active.jsEntry.map(item => path.join('ln-rank', item)),
  'shared/resources/resource-registry.js',
  'shared/resources/release/current-release.js',
  'shared/resources/majors/major-catalog-contract.js',
  'shared/resources/schools/school-identity-center.js',
  'shared/resources/schools/school-profile-center.js',
  'shared/resources/reports/feishu-report-contract.js',
  'shared/ui/ui-registry.js',
  'shared/ui/shell/family-shell.v3959_0.js',
  'shared/ui/shell/family-shell.v3960_0.js',
  'shared/algorithms/algorithm-registry.js',
  'shared/algorithms/position/canonical-position.v3960_0.js',
  'shared/algorithms/ranking/staged-ranking.v3960_0.js',
  'shared/algorithms/contracts/decision-snapshot.v3960_0.js',
  'tongxue/app/tongxue-performance-v156.js'
];
for (const file of [
  ...active.html.map(item => path.join('ln-rank', item)),
  ...active.jsEntry.map(item => path.join('ln-rank', item)),
  ...active.cssEntry.map(item => path.join('ln-rank', item))
]) assert.ok(fs.existsSync(file), `active resource missing: ${file}`);

const visited = new Set();
const missing = [];
const importPattern = /(?:from\s*|import\s*\(|export\s+\*\s+from\s*)['"]([^'"]+)['"]/g;
function resolveImport(fromFile, specifier) {
  const clean = specifier.split('?')[0].split('#')[0];
  if (!clean || /^(?:https?:|node:|data:)/.test(clean)) return null;
  if (clean.startsWith('/')) return clean.replace(/^\/+/, '');
  if (!clean.startsWith('.')) return null;
  return path.normalize(path.join(path.dirname(fromFile), clean));
}
function walk(file) {
  if (visited.has(file)) return;
  visited.add(file);
  if (!fs.existsSync(file)) { missing.push(file); return; }
  if (!file.endsWith('.js') && !file.endsWith('.mjs')) return;
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(importPattern)) {
    const resolved = resolveImport(file, match[1]);
    if (resolved) walk(resolved);
  }
}
entryFiles.forEach(walk);
assert.deepEqual(missing, [], `reachable imports missing: ${missing.join(', ')}`);

const reachableSource = [...visited]
  .filter(file => fs.existsSync(file) && /\.(?:m?js)$/.test(file))
  .map(file => fs.readFileSync(file, 'utf8'))
  .join('\n');
for (const marker of [
  'feishu-api-client.v3956_0.js','feishu-report-contract.js','current-release.js','school-identity-center.js',
  'major-catalog-contract.js','school-profile-data.20260617-v3957.js','tongxue-direct-handoff-v155.js',
  'tongxue-direct-result-v156.js','render.v3957_0.js','family-shell.v3960_0.js','UI_ORCHESTRATION_VERSION',
  'algorithm-orchestration-v3960','resolveCanonicalPosition','staged-ranking-v3960_0','decision-snapshot-v3960_0',
  'school-all-mode-v3962','/api/school-majors','resolveCompactSchoolResource'
]) assert.ok(reachableSource.includes(marker), `active graph missing ${marker}`);
assert.ok(!reachableSource.includes("from './feature/feishu/index.js?v=3951_0'"));

const routeLiteralOwners = [];
for (const file of visited) {
  if (!fs.existsSync(file) || !file.endsWith('.js')) continue;
  const source = fs.readFileSync(file, 'utf8');
  if (source.includes('/api/feishu-create-report') || source.includes('/api/feishu-create-selection-pool-report')) routeLiteralOwners.push(file);
}
assert.deepEqual(routeLiteralOwners, ['shared/resources/reports/feishu-report-contract.js'], `Feishu routes duplicated in active graph: ${routeLiteralOwners.join(', ')}`);

const allFrontendRouteOwners = [];
function collectJs(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) collectJs(file);
    else if (entry.name.endsWith('.js')) {
      const source = fs.readFileSync(file, 'utf8');
      if (source.includes('/api/feishu-create-report') || source.includes('/api/feishu-create-selection-pool-report')) allFrontendRouteOwners.push(file);
    }
  }
}
collectJs('ln-rank/js');
assert.deepEqual(allFrontendRouteOwners, [], `frontend modules still own Feishu routes: ${allFrontendRouteOwners.join(', ')}`);

const oldSchoolTierOwners = [];
function collectTierOwners(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) collectTierOwners(file);
    else if (entry.name.endsWith('.js')) {
      const source = fs.readFileSync(file, 'utf8');
      if (source.includes("'大连理工大学': ['985','211'")) oldSchoolTierOwners.push(file);
    }
  }
}
collectTierOwners('functions');
assert.deepEqual(oldSchoolTierOwners, [], `legacy school tier tables remain active: ${oldSchoolTierOwners.join(', ')}`);
assert.ok(!fs.readFileSync('ln-rank/js/app.v3951_0.js', 'utf8').includes('SPECIAL_CONTROL_SCORE'));

const compatEntity150 = fs.readFileSync('tongxue/data/school-entities-v150.js', 'utf8');
const compatEntity130 = fs.readFileSync('tongxue/data/school-entities-v130.js', 'utf8');
for (const source of [compatEntity150, compatEntity130]) {
  assert.ok(source.includes('shared/resources/schools/school-identity-center.js'));
  assert.ok(!source.includes("E('dlut-panjin'"));
}

const shell = fs.readFileSync('shared/ui/shell/family-shell.v3960_0.js', 'utf8');
assert.ok(!shell.includes('MutationObserver'));
assert.ok(!shell.includes("fetch('/api/"));
assert.ok(fs.readFileSync('shared/ui/shell/family-shell.v3960_0.css', 'utf8').includes('family-decision-bar'));
assert.ok(fs.readFileSync('shared/ui/shell/family-shell.v3959_0.js', 'utf8').includes('family-shell.v3960_0.js'));

for (const forbidden of ['fenxi/pendingdel', 'v3.9.46.3', 'pure runtime']) {
  assert.ok(!reachableSource.includes(forbidden), `active graph contains forbidden marker: ${forbidden}`);
}

for (const temp of [
  '.github/workflows/agent-school-profile-v3957.yml',
  '.github/workflows/agent-tongxue-direct-result-v156.yml',
  '.github/workflows/agent-ui-orchestration-v3959.yml',
  '.github/workflows/agent-algorithm-orchestration-v3960.yml',
  'tools/schools/apply-school-profile-v3957.py',
  'tools/tongxue/apply-direct-result-v156.py',
  'tools/ui/apply-ui-orchestration-v3959.py',
  'tools/algorithms/apply-algorithm-orchestration-v3960.py'
]) assert.ok(!fs.existsSync(temp), `temporary integration file remains: ${temp}`);

console.log(JSON.stringify({
  ok: true,
  release: CURRENT_RELEASE.display,
  entries: entryFiles.length,
  reachableFiles: visited.size,
  feishuRouteOwner: routeLiteralOwners[0],
  schoolProfileOwner: 'shared/resources/schools/school-profile-center.js',
  schoolIdentityOwner: 'shared/resources/schools/school-identity-center.js',
  majorResolverOwner: 'shared/resources/majors/major-catalog-contract.js',
  uiOwner: 'shared/ui/ui-registry.js',
  algorithmOwner: 'shared/algorithms/algorithm-registry.js'
}));

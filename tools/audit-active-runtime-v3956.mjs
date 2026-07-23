import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const active = JSON.parse(fs.readFileSync('ln-rank/active-assets.json', 'utf8'));
assert.equal(active.version, 'v3.9.56.0');
assert.equal(active.assetVersion, 'v3956_0');

const entryFiles = [
  ...active.jsEntry.map(item => path.join('ln-rank', item)),
  'shared/resources/resource-registry.js',
  'shared/resources/reports/feishu-report-contract.js',
  'tongxue/app/tongxue-performance-v155.js'
];
for (const file of [...active.html.map(item => path.join('ln-rank', item)), ...active.jsEntry.map(item => path.join('ln-rank', item)), ...active.cssEntry.map(item => path.join('ln-rank', item))]) {
  assert.ok(fs.existsSync(file), `active resource missing: ${file}`);
}

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

const reachableSource = [...visited].filter(file => fs.existsSync(file) && /\.(?:m?js)$/.test(file)).map(file => fs.readFileSync(file, 'utf8')).join('\n');
assert.ok(reachableSource.includes('feishu-api-client.v3956_0.js'));
assert.ok(reachableSource.includes('feishu-report-contract.js'));
assert.ok(reachableSource.includes('tongxue-direct-handoff-v155.js'));
assert.ok(!reachableSource.includes("from './feature/feishu/index.js?v=3951_0'"));

const routeLiteralOwners = [];
for (const file of visited) {
  if (!fs.existsSync(file) || !file.endsWith('.js')) continue;
  const source = fs.readFileSync(file, 'utf8');
  if (source.includes('/api/feishu-create-report') || source.includes('/api/feishu-create-selection-pool-report')) routeLiteralOwners.push(file);
}
assert.deepEqual(routeLiteralOwners, ['shared/resources/reports/feishu-report-contract.js'], `Feishu routes are duplicated in active graph: ${routeLiteralOwners.join(', ')}`);


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
assert.deepEqual(allFrontendRouteOwners, [], `frontend modules still own Feishu route strings: ${allFrontendRouteOwners.join(', ')}`);
assert.ok(!fs.readFileSync('ln-rank/js/app.v3951_0.js', 'utf8').includes('SPECIAL_CONTROL_SCORE'));

for (const forbidden of ['fenxi/pendingdel', 'v3.9.46.3', 'pure runtime']) {
  assert.ok(!reachableSource.includes(forbidden), `active graph contains forbidden runtime marker: ${forbidden}`);
}

console.log(JSON.stringify({ ok: true, entries: entryFiles.length, reachableFiles: visited.size, feishuRouteOwner: routeLiteralOwners[0] }));

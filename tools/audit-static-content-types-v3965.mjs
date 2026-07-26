import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('_headers', 'utf8');
const rules = [];
let current = null;
for (const line of source.split(/\r?\n/)) {
  if (!line.trim() || line.trim().startsWith('#')) continue;
  if (!/^\s/.test(line)) {
    current = { pattern: line.trim(), headers: [] };
    rules.push(current);
    continue;
  }
  if (!current) throw new Error(`Header without owner: ${line}`);
  const value = line.trim();
  const separator = value.indexOf(':');
  if (separator < 1) throw new Error(`Malformed header: ${line}`);
  current.headers.push({ name: value.slice(0, separator).trim().toLowerCase(), value: value.slice(separator + 1).trim() });
}

function matches(pattern, pathname) {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replaceAll('*', '.*');
  return new RegExp(`^${escaped}$`).test(pathname);
}
function values(pathname, name) {
  return rules
    .filter(rule => matches(rule.pattern, pathname))
    .flatMap(rule => rule.headers)
    .filter(header => header.name === name)
    .map(header => header.value.toLowerCase());
}

const types = new Map([
  ['/ln-rank/js/app.v3965_0.js', 'application/javascript'],
  ['/ln-rank/js/feature/feishu/report-controller.v3965_0.js', 'application/javascript'],
  ['/shared/ui/shell/family-shell.v3965_0.js', 'application/javascript'],
  ['/shared/resources/release/runtime-cache-contract.v3965_0.js', 'application/javascript'],
  ['/tongxue/app/tongxue-runtime-v159.js', 'application/javascript'],
  ['/ln-rank/js/major-difficulty-2026.v3965_0.js', 'application/javascript'],
  ['/zy2026/assets/zy2026.v3965_0.js', 'application/javascript'],
  ['/ln-rank/css/ln-rank-workspace.v3964_0.css', 'text/css'],
  ['/shared/ui/shell/family-shell.v3965_0.css', 'text/css'],
  ['/ln-rank/js/ux/family-home.v3965_0.js', 'application/javascript']
]);
for (const [pathname, expected] of types) {
  const contentTypes = values(pathname, 'content-type').map(value => value.split(';')[0].trim());
  assert.deepEqual(contentTypes, [expected], `${pathname}: expected one MIME owner ${expected}, got ${contentTypes.join(', ')}`);
}

for (const pathname of [
  '/', '/index.html', '/ln-rank/', '/ln-rank/index.html', '/ln-rank/selection-pool.html',
  '/ln-rank/local-mainline.html', '/ln-rank/211-mainline.html', '/ln2026.html',
  '/zy2026.html', '/zy2026/', '/zy2026/index.html', '/tongxue/', '/tongxue/index.html',
  '/tongxue/changelog.html', '/shared/resources/release/current-release.js'
]) {
  assert.deepEqual(values(pathname, 'cache-control'), ['no-cache, max-age=0, must-revalidate'], `${pathname} must revalidate`);
}
for (const pathname of [
  '/ln-rank/js/app.v3965_0.js',
  '/ln-rank/js/app-runtime.v3965_0.js',
  '/ln-rank/js/workspace/selection-workspace-orchestrator.v3965_0.js',
  '/ln-rank/js/feature/feishu/report-controller.v3965_0.js',
  '/shared/ui/shell/family-shell.v3965_0.js',
  '/shared/resources/release/runtime-cache-contract.v3965_0.js',
  '/tongxue/app/tongxue-runtime-v159.js',
  '/tongxue/app/tongxue-runtime-controller-v159.js',
  '/ln-rank/js/major-difficulty-2026.v3965_0.js',
  '/zy2026/assets/zy2026.v3965_0.js'
]) {
  assert.deepEqual(values(pathname, 'cache-control'), ['public, max-age=31536000, immutable'], `${pathname} must have one immutable owner`);
}

console.log(JSON.stringify({ ok: true, contract: 'static-content-type-ownership-v3965_0', checked: [...types.keys()] }, null, 2));

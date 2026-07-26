import assert from 'node:assert/strict';
import fs from 'node:fs';

const headersSource = fs.readFileSync('_headers', 'utf8');
const rules = [];
let currentRule = null;

for (const sourceLine of headersSource.split(/\r?\n/)) {
  if (!sourceLine.trim()) continue;
  if (!/^\s/.test(sourceLine)) {
    currentRule = { pattern: sourceLine.trim(), headers: [] };
    rules.push(currentRule);
    continue;
  }
  if (!currentRule) throw new Error(`Header without a path owner: ${sourceLine}`);
  const line = sourceLine.trim();
  const separator = line.indexOf(':');
  if (separator < 1) throw new Error(`Malformed header rule: ${sourceLine}`);
  currentRule.headers.push({
    name: line.slice(0, separator).trim().toLowerCase(),
    value: line.slice(separator + 1).trim()
  });
}

function matches(pattern, pathname) {
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replaceAll('*', '.*');
  return new RegExp(`^${escaped}$`).test(pathname);
}

function contentTypesFor(pathname) {
  return rules
    .filter(rule => matches(rule.pattern, pathname))
    .flatMap(rule => rule.headers)
    .filter(header => header.name === 'content-type')
    .map(header => header.value.split(';')[0].trim().toLowerCase());
}

const activeAssets = new Map([
  ['/ln-rank/js/app.v3964_0.js', 'application/javascript'],
  ['/ln-rank/css/ln-rank-workspace.v3964_0.css', 'text/css'],
  ['/shared/ui/ui-registry.v3964_0.js', 'application/javascript'],
  ['/shared/ui/shell/family-shell.v3964_0.js', 'application/javascript'],
  ['/shared/ui/shell/family-shell.v3964_0.css', 'text/css'],
  ['/shared/ui/tokens/foundation.v3959_0.css', 'text/css']
]);

for (const [pathname, expected] of activeAssets) {
  assert.deepEqual(
    contentTypesFor(pathname),
    [expected],
    `${pathname} must have exactly one Content-Type owner (${expected})`
  );
}

const broadSharedUiTypeRule = rules.find(rule =>
  rule.pattern === '/shared/ui/*' &&
  rule.headers.some(header => header.name === 'content-type')
);
assert.equal(
  broadSharedUiTypeRule,
  undefined,
  'shared UI root wildcard must not assign one MIME type to both JS and CSS'
);

console.log(JSON.stringify({
  ok: true,
  contract: 'static-content-type-ownership-v3964_0',
  checkedAssets: [...activeAssets.keys()]
}, null, 2));

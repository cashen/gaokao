import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync('ln-rank/simulation-report.html', 'utf8');
const legacyJs = fs.readFileSync('ln-rank/js/simulation-report-v011-family-decision.js', 'utf8');
const currentJs = fs.readFileSync('ln-rank/js/simulation-report-v014-school-major-intent.js', 'utf8');
const currentCss = fs.readFileSync('ln-rank/css/simulation-report-v012-family-decision.css', 'utf8');
const manifest = JSON.parse(fs.readFileSync('ln-rank/data/simulation-workbench-release-v014.json', 'utf8'));

assert.match(html, /simulation-report-v012-family-decision\.css\?v=012-family-decision/);
assert.match(html, /simulation-report-v012-family-decision\.js\?v=012-family-decision/);
assert.match(html, /simulation-report-v014-school-major-intent\.js\?v=014-school-major-intent/);
assert.doesNotMatch(html, /simulation-report-v011-family-decision\.css\?v=011-family-decision/);
assert.doesNotMatch(html, /simulation-report-v011-family-decision\.js\?v=011-family-decision/);

for (const expected of [
  '这所学校怎么处理？', '继续考虑', '候选', '还没决定', '排除',
  'aria-pressed', 'data-family-option', 'persistCard'
]) assert.ok(currentJs.includes(expected), `current runtime missing ${expected}`);
for (const expected of [
  '.family-decision', '.family-decision-options', '.family-option[aria-pressed="true"]',
  '@media(max-width:760px)', '@media(max-width:420px)'
]) assert.ok(currentCss.includes(expected), `current family css missing ${expected}`);
assert.ok(legacyJs.includes('继续考虑') && legacyJs.includes('排除'), 'legacy v011 source must retain its historical semantics for auditability');
assert.equal(manifest.version, 'simulation-workspace-v014.12');
assert.equal(manifest.revision, 'r074-postmerge-v011-compatibility');
console.log('simulation-report-v011 compatibility contract on current v014.12 workbench: PASS');

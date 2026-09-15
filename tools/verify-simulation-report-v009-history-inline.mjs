import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync('ln-rank/simulation-report.html', 'utf8');
const css = fs.readFileSync('ln-rank/css/simulation-report-v009-history-inline.css', 'utf8');
const js = fs.readFileSync('ln-rank/js/simulation-report-v009-history-inline.js', 'utf8');
const currentRuntime = fs.readFileSync('ln-rank/js/simulation-report-v014-school-major-intent.js', 'utf8');
const manifest = JSON.parse(fs.readFileSync('ln-rank/data/simulation-workbench-release-v014.json', 'utf8'));

assert.match(html, /simulation-report-v014-school-major-intent\.css\?v=014-school-major-intent/);
assert.match(html, /simulation-report-v014-school-major-intent\.js\?v=014-school-major-intent/);
assert.doesNotMatch(html, /simulation-report-v008-history-hint\.js\?v=008-history-hint/);
assert.match(js, /localStorage\.getItem\(STORAGE_KEY/);
for (const year of [2026, 2025, 2024]) assert.match(js, new RegExp(String(year)));
assert.match(js, /role=\"note\"/);
assert.match(css, /\.history-inline\{display:flex/);
assert.match(css, /white-space:nowrap/);
assert.match(css, /overflow-x:auto/);
assert.match(currentRuntime, /history|近3年/);
assert.equal(manifest.version, 'simulation-workspace-v014.7');
assert.equal(manifest.revision, 'r069-current-workbench-regression-cleanup');
console.log('simulation-report-v009 compatibility contract on current workbench: PASS');

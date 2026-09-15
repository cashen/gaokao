import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync('ln-rank/simulation-report.html', 'utf8');
const css = fs.readFileSync('ln-rank/css/simulation-report-v008-history-hint.css', 'utf8');
const js = fs.readFileSync('ln-rank/js/simulation-report-v008-history-hint.js', 'utf8');
const currentRuntime = fs.readFileSync('ln-rank/js/simulation-report-v014-school-major-intent.js', 'utf8');
const manifest = JSON.parse(fs.readFileSync('ln-rank/data/simulation-workbench-release-v014.json', 'utf8'));

assert.match(html, /simulation-report-v014-school-major-intent\.css\?v=014-school-major-intent/);
assert.match(html, /simulation-report-v014-school-major-intent\.js\?v=014-school-major-intent/);
assert.match(js, /localStorage\.getItem\(STORAGE_KEY/);
assert.match(js, /history\?\.years\?\.\[year\]/);
for (const year of [2026, 2025, 2024]) assert.match(js, new RegExp(String(year)));
assert.match(js, /近3年分数 \/ 位次/);
assert.match(js, /只用于回看近三年投档记录/);
assert.match(css, /\.history-hint-grid\{display:grid;grid-template-columns:repeat\(3/);
assert.match(css, /\.detail-panel \.history-strip\{display:none!important\}/);
assert.match(currentRuntime, /history|近3年/);
assert.equal(manifest.version, 'simulation-workspace-v014.7');
assert.equal(manifest.revision, 'r069-current-workbench-regression-cleanup');
console.log('simulation-report-v008 compatibility contract on current workbench: PASS');

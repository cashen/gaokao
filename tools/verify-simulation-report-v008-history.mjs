import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync('ln-rank/simulation-report.html', 'utf8');
const css = fs.readFileSync('ln-rank/css/simulation-report-v008-history-hint.css', 'utf8');
const js = fs.readFileSync('ln-rank/js/simulation-report-v008-history-hint.js', 'utf8');
const manifest = JSON.parse(fs.readFileSync('ln-rank/data/simulation-workbench-release-v008.json', 'utf8'));

assert.match(html, /simulation-report-v008-history-hint\.css\?v=008-history-hint/);
assert.match(html, /simulation-report-v008-history-hint\.js\?v=008-history-hint/);
assert.match(js, /localStorage\.getItem\(STORAGE_KEY/);
assert.match(js, /history\?\.years\?\.\[year\]/);
for (const year of [2026, 2025, 2024]) assert.match(js, new RegExp(String(year)));
assert.match(js, /近3年分数 \/ 位次/);
assert.match(js, /只用于回看近三年投档记录/);
assert.match(css, /\.history-hint-grid\{display:grid;grid-template-columns:repeat\(3/);
assert.match(css, /\.detail-panel \.history-strip\{display:none!important\}/);
assert.equal(manifest.version, 'simulation-workspace-v008');
assert.equal(manifest.revision, 'r054-visible-three-year-history');
console.log('simulation-report-v008-history: PASS');

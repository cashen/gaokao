import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync('ln-rank/simulation-report.html', 'utf8');
const css = fs.readFileSync('ln-rank/css/simulation-report-v009-history-inline.css', 'utf8');
const js = fs.readFileSync('ln-rank/js/simulation-report-v009-history-inline.js', 'utf8');
const manifest = JSON.parse(fs.readFileSync('ln-rank/data/simulation-workbench-release-v009.json', 'utf8'));

assert.match(html, /simulation-report-v009-history-inline\.css\?v=009-history-inline/);
assert.match(html, /simulation-report-v009-history-inline\.js\?v=009-history-inline/);
assert.doesNotMatch(html, /simulation-report-v008-history-hint\.js\?v=008-history-hint/);
assert.match(js, /localStorage\.getItem\(STORAGE_KEY/);
assert.match(js, /history\?\.years\?\.\[2026\]/);
assert.match(js, /history\?\.years\?\.\[2025\]/);
assert.match(js, /history\?\.years\?\.\[2024\]/);
assert.match(js, /role=\\"note\\"/);
assert.match(css, /\.history-inline\{display:flex/);
assert.match(css, /white-space:nowrap/);
assert.match(css, /overflow-x:auto/);
assert.equal(manifest.version, 'simulation-workspace-v009');
assert.equal(manifest.revision, 'r055-inline-three-year-history');
console.log('simulation-report-v009-history-inline: PASS');

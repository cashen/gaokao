import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync('ln-rank/simulation-report.html', 'utf8');
const css = fs.readFileSync('ln-rank/css/simulation-report-v010-history-layout.css', 'utf8');
const js = fs.readFileSync('ln-rank/js/simulation-report-v010-history-layout.js', 'utf8');
const manifest = JSON.parse(fs.readFileSync('ln-rank/data/simulation-workbench-release-v010.json', 'utf8'));

assert.match(html, /simulation-report-v010-history-layout\.css\?v=010-history-layout/);
assert.match(html, /simulation-report-v010-history-layout\.js\?v=010-history-layout/);
assert.doesNotMatch(html, /simulation-report-v009-history-inline\.js\?v=009-history-inline/);
assert.match(js, /querySelector\('\.volunteer-top'\)/);
assert.match(js, /top\.insertAdjacentHTML\('afterend'/);
assert.match(js, /history\?\.years\?\.\[2026\]/);
assert.match(js, /history\?\.years\?\.\[2025\]/);
assert.match(js, /history\?\.years\?\.\[2024\]/);
assert.match(css, /width:calc\(100% - 80px\)/);
assert.match(css, /margin:6px 13px 11px 67px/);
assert.match(css, /white-space:nowrap/);
assert.match(css, /overflow-x:auto/);
assert.match(css, /margin-left:59px/);
assert.equal(manifest.version, 'simulation-workspace-v010');
assert.equal(manifest.revision, 'r056-history-left-align-full-width');
console.log('simulation-report-v010-history-layout: PASS');

import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const css = read('ln-rank/css/ln-rank-workspace.v3967_0.css');
const handoff = read('ln-rank/js/workspace/major-path-handoff.v003.js');
const presenter = read('ln-rank/js/workspace/family-card-presenter.v3967_0.js');
const html = read('ln-rank/index.html');
const commit = read('ln-rank/js/workspace/result-commit.v3967_0.js');
const release = read('shared/resources/release/current-release.js');

for (const token of ['major-path-entry','student-voice-entry','tongxue-card-entry']) assert.ok(css.includes(token), token+' CSS owner missing');
assert.ok(!css.includes('.results-grid .major-card .student-voice-entry,\n  .results-grid .major-card .tongxue-card-entry { display: none'), 'PC must not hide two card entries');
assert.match(css, /\.results-grid \.major-card \.major-path-entry,[\s\S]*display: grid !important/);
assert.match(handoff, /专业升学路径/);
assert.match(handoff, /专业升学路径<\/span><small>了解这个专业的关系与读研方向/);
assert.match(handoff, /大学生说专业/);
assert.match(presenter, /大学生说学校/);
assert.match(presenter, /看看这所学校的大学生怎么说/);
assert.match(handoff, /看看这所学校的大学生怎么说/);
assert.match(handoff, /entry\.classList\.add\('tongxue-card-entry--compact'\)/);
assert.match(handoff, /major-path-handoff\.v003\.css\?v=003_0&r=r036-major-history-rank-lazy/);
assert.match(html, /app\.v3990_3\.js\?v=3990_3-nav003&r=r036-major-history-rank-lazy/);
assert.match(html, /ln-rank-workspace\.v3967_0\.css\?v=3967_0&r=r036-major-history-rank-lazy/);
assert.match(commit, /family-card-presenter\.v3967_0\.js\?v=3967_0&r=r036-major-history-rank-lazy/);
assert.match(release, /lnRankHumanQueryInputRevision: 'r032-input-clear-state'/);
assert.match(release, /lnRankCardEntryVersion: 'ln-rank-three-card-entries-v005'/);
console.log(JSON.stringify({ok:true,entries:['专业升学路径','大学生说专业','大学生说学校'],pcHiddenEntries:false,cacheRevision:'r036-major-history-rank-lazy'},null,2));

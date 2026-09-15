import fs from 'node:fs';
import assert from 'node:assert/strict';

const html=fs.readFileSync('ln-rank/simulation-report.html','utf8');
const js=fs.readFileSync('ln-rank/js/simulation-report-v015-human-workbench.js','utf8');
const plan=fs.readFileSync('docs/plans/simulation-workspace-v015-human-input.md','utf8');
const manifest=JSON.parse(fs.readFileSync('ln-rank/data/simulation-workbench-release-v015.json','utf8'));

assert.match(html,/simulation-report-v015-human-workbench\.js\?v=v015\.2-r076/);
assert.doesNotMatch(html,/simulation-report-v006-input-bridge\.js/);
assert.doesNotMatch(html,/simulation-report-v014-school-major-intent\.js/);
assert.equal(manifest.version,'simulation-workspace-v015.2');
assert.equal(manifest.revision,'r076-real-delete-regression');
assert.equal(manifest.runtime,'/ln-rank/js/simulation-report-v015-human-workbench.js');
assert.match(js,/AbortController/);
assert.match(js,/compositionstart/);
assert.match(js,/compositionend/);
assert.match(js,/stopImmediatePropagation/);
assert.match(js,/schoolGrounded/);
assert.match(js,/实际专业记录/);
assert.match(js,/不会替你自动选一个/);
assert.match(js,/normalizeMajorCode/);
assert.match(plan,/School × Major/);
assert.match(plan,/080301.*08030.*0803.*080.*08.*0/);
assert.match(plan,/东北大学.*自动化/);
assert.match(plan,/机械/);
console.log('simulation-workspace-v015.2 contract: PASS');

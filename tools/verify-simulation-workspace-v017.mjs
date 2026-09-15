import fs from 'node:fs';
import assert from 'node:assert/strict';

const html=fs.readFileSync('ln-rank/simulation-report.html','utf8');
const runtime=fs.readFileSync('ln-rank/js/simulation-report-v017-responsive-input.js','utf8');
const worker=fs.readFileSync('ln-rank/js/simulation-school-search-worker-v001.js','utf8');
const css=fs.readFileSync('ln-rank/css/simulation-report-v017-responsive-input.css','utf8');
const manifest=JSON.parse(fs.readFileSync('ln-rank/data/simulation-workbench-release-v016.json','utf8'));
const browser=fs.readFileSync('tools/browser-simulation-workspace-v017-actions.mjs','utf8');

assert.equal(manifest.version,'simulation-workspace-v016.38');
assert.equal(manifest.revision,'r128-single-action-runtime');
for(const src of [
  '/ln-rank/js/simulation-report-v016-legacy-render-guard.js?v=v016.38-r128',
  '/ln-rank/js/simulation-report-v016-pdf.js?v=v016.38-r128',
  '/ln-rank/js/simulation-report-v017-responsive-input.js?v=v016.38-r128',
  '/ln-rank/css/simulation-report-v017-responsive-input.css?v=v016.38-r128'
]) assert.ok(html.includes(src),`html missing ${src}`);
assert.ok(!html.includes('/ln-rank/js/simulation-report-v015-human-workbench.js?v='));
assert.ok(runtime.includes("const RELEASE='v016.38-r128'"));
assert.ok(runtime.includes('bindCandidateActions'));
assert.ok(!runtime.includes('window.addEventListener(\'click\',onClick,true)'));
assert.ok(!runtime.includes('function onClick('));
assert.ok(runtime.includes("addEventListener('click',e=>"));
for(const expected of ['getMetadata','province','city','level','candidateView']) assert.ok(worker.includes(expected),`worker missing ${expected}`);
for(const expected of ['overflow:visible','pointer-events:auto','touch-action:manipulation','.suggestion-action']) assert.ok(css.includes(expected),`css missing ${expected}`);
for(const expected of ['390','768','1280','选这所','选这个','confirmedSchool','majorName','direct action browser']) assert.ok(browser.includes(expected),`browser gate missing ${expected}`);
console.log('simulation-workspace-v016.38 contract: PASS');

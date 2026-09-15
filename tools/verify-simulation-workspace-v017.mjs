import fs from 'node:fs';
import assert from 'node:assert/strict';

const html=fs.readFileSync('ln-rank/simulation-report.html','utf8');
const runtime=fs.readFileSync('ln-rank/js/simulation-report-v017-responsive-input.js','utf8');
const legacy=fs.readFileSync('ln-rank/js/simulation-report-v007-workbench.js','utf8');
const historyLayout=fs.readFileSync('ln-rank/js/simulation-report-v010-history-layout.js','utf8');
const historyReference=fs.readFileSync('ln-rank/js/simulation-report-v016-history-reference-only.js','utf8');
const worker=fs.readFileSync('ln-rank/js/simulation-school-search-worker-v001.js','utf8');
const css=fs.readFileSync('ln-rank/css/simulation-report-v017-responsive-input.css','utf8');
const manifest=JSON.parse(fs.readFileSync('ln-rank/data/simulation-workbench-release-v016.json','utf8'));
const browser=fs.readFileSync('tools/browser-simulation-workspace-v017-actions.mjs','utf8');
const performance=fs.readFileSync('tools/browser-simulation-workspace-v016-performance.mjs','utf8');

assert.equal(manifest.version,'simulation-workspace-v016.44');
assert.equal(manifest.revision,'r134-history-reference-only');
assert.equal(manifest.historyReferenceRuntime,'/ln-rank/js/simulation-report-v016-history-reference-only.js');
for(const src of [
  '/ln-rank/js/simulation-report-v016-legacy-render-guard.js?v=v016.44-r134',
  '/ln-rank/js/simulation-report-v016-pdf.js?v=v016.44-r134',
  '/ln-rank/js/simulation-report-v016-history-reference-only.js?v=v016.44-r134',
  '/ln-rank/js/simulation-report-v017-responsive-input.js?v=v016.44-r134',
  '/ln-rank/css/simulation-report-v017-responsive-input.css?v=v016.44-r134'
]) assert.ok(html.includes(src),`html missing ${src}`);
assert.ok(!html.includes('/ln-rank/js/simulation-report-v015-human-workbench.js?v='));
assert.equal((html.match(/simulation-report-v016-history-reference-only\.js\?v=v016\.44-r134/g)||[]).length,1);
assert.ok(runtime.includes("const RELEASE='v016.43-r133'"));
assert.ok(runtime.includes('function pickLowest('));
assert.ok(runtime.includes('function buildHistory('));
assert.ok(runtime.includes('三年历史已写入'));
assert.ok(runtime.includes('bindCandidateActions'));
assert.ok(!runtime.includes('window.addEventListener(\'click\',onClick,true)'));
assert.ok(!runtime.includes('function onClick('));
assert.ok(runtime.includes("addEventListener('click',e=>"));
assert.ok(historyReference.includes('History is reference-only'));
assert.ok(!historyReference.includes('有历史记录需要核对'));
assert.ok(!historyReference.includes('需核验'));
assert.ok(!historyLayout.includes('需核验'));
assert.ok(legacy.includes('function observeV017TerminalState()'));
assert.ok(!legacy.includes('setInterval(()=>render(),500)'));
assert.ok(!legacy.includes('const observer=new MutationObserver(()=>render())'));
assert.ok(legacy.includes('no-strict-record'));
for(const expected of ['getMetadata','province','city','level','candidateView','loadSchoolCatalog','resolveUnifiedSchoolQuery']) assert.ok(worker.includes(expected),`worker missing ${expected}`);
for(const expected of ['overflow:visible','pointer-events:auto','touch-action:manipulation','.suggestion-action']) assert.ok(css.includes(expected),`css missing ${expected}`);
for(const expected of ['390','768','1280','选这所','选这个','沈阳工业大学','沈阳化工大学','高分子','电气','电气工程及其自动化','confirmedSchool','majorName','history.years','getByText']) assert.ok(browser.includes(expected),`browser gate missing ${expected}`);
for(const expected of ['synchronous input-dispatch','100','60','沈阳工业大学','自动化']) assert.ok(performance.includes(expected),`performance gate missing ${expected}`);
console.log('simulation-workspace-v016.44 contract: PASS');

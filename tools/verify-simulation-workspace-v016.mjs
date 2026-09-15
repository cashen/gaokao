import fs from 'node:fs';
import assert from 'node:assert/strict';

const html=fs.readFileSync('ln-rank/simulation-report.html','utf8');
const js=fs.readFileSync('ln-rank/js/simulation-report-v015-human-workbench.js','utf8');
const guard=fs.readFileSync('ln-rank/js/simulation-report-v016-legacy-render-guard.js','utf8');
const pdf=fs.readFileSync('ln-rank/js/simulation-report-v016-pdf.js','utf8');
const legacy=fs.readFileSync('ln-rank/js/simulation-report-v007-workbench.js','utf8');
const legacyPdf=fs.readFileSync('ln-rank/js/simulation-report-v005-pdf-reminders.js','utf8');
const manifest=JSON.parse(fs.readFileSync('ln-rank/data/simulation-workbench-release-v016.json','utf8'));
const browser=fs.readFileSync('tools/browser-simulation-workspace-v016.mjs','utf8');

for (const src of [
  '/ln-rank/js/simulation-report-v015-human-workbench.js?v=v016.14-r104',
  '/ln-rank/js/simulation-report-v016-legacy-render-guard.js?v=v016.14-r104',
  '/ln-rank/js/simulation-report-v016-pdf.js?v=v016.14-r104'
]) assert.ok(html.includes(src), `html missing ${src}`);
assert.ok(!html.includes('simulation-report-v006-input-bridge.js'));
assert.ok(!html.includes('simulation-report-v014-school-major-intent.js'));
assert.equal(manifest.version,'simulation-workspace-v016.14');
assert.equal(manifest.revision,'r104-guard-contract-fix');
assert.equal(manifest.runtime,'/ln-rank/js/simulation-report-v015-human-workbench.js');
assert.equal(manifest.pdfRuntime,'/ln-rank/js/simulation-report-v016-pdf.js');
assert.equal(manifest.legacyRenderGuard,'/ln-rank/js/simulation-report-v016-legacy-render-guard.js');
assert.doesNotThrow(()=>new Function(js.replace(/^import .*$/gm,'')),'input runtime syntax must remain valid');
assert.doesNotThrow(()=>new Function(pdf),'pdf runtime syntax must remain valid');
assert.doesNotThrow(()=>new Function(guard),'guard runtime syntax must remain valid');
for(const expected of ['AbortController','compositionstart','compositionend','queueMicrotask','stopImmediatePropagation','schoolGrounded','实际专业记录','不会替你自动选一个','normalizeMajorCode','factCache','const timers=new Map','function previewMajor','scheduleLegacyFieldSync','__simulationHumanSyncDepth']) assert.ok(js.includes(expected),`input runtime missing ${expected}`);
assert.ok(js.includes('function exactRecord'));
assert.ok(js.includes('r.majorCode2026||r.standardMajorCode'));
assert.ok(js.includes('r.standardMajorName||r.major'));
assert.ok(js.includes('norm(item.code)'));
assert.ok(js.includes('norm(item.name)'));
assert.ok(guard.includes('__simulationHumanSyncDepth'));
assert.ok(guard.includes('Math.max(1'));
assert.ok(legacy.includes('function inboundMajorConflict'));
assert.ok(legacy.includes('代码与专业名称不一致'));
assert.ok(legacy.includes('__simulationHumanSyncDepth'));
assert.ok(legacy.includes("from '../../shared/resources/majors/major-catalog-contract.js'"));
assert.ok(!legacy.includes('setInterval(()=>render(),500)'));
for(const expected of ['html2canvas','jsPDF','pdf-v016-title','报考信息（待核实）','第二页及后续页面重复顶部考生信息','家庭处理','pdf.save']) assert.ok(pdf.includes(expected),`pdf runtime missing ${expected}`);
assert.ok(!pdf.includes('家庭判断'));
assert.ok(!pdf.includes('冲稳保'));
assert.ok(legacyPdf.includes('家庭判断')); // legacy compatibility layer is no longer the visible PDF exporter.
for(const expected of ['390','768','1280','pressSequentially','compositionstart','insertFromPaste','网络失败','Backspace','URL inbound','inbound conflict','duplicate','refresh','visible human input must be synchronized']) assert.ok(browser.includes(expected),`browser regression missing ${expected}`);
console.log('simulation-workspace-v016.14 contract: PASS');

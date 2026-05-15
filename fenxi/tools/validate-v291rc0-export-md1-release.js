#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
function ok(cond, msg){ if(cond){ console.log('PASS', msg); pass++; } else { console.error('FAIL', msg); fail++; }}
function read(p){ return fs.readFileSync(path.join(root,p),'utf8'); }
function exists(p){ return fs.existsSync(path.join(root,p)); }
const index = read('index.html');
ok(index.includes('V2.91RC0.rules-closure4.family-read1.frontfix1.export-md1'), 'version string');
ok(index.includes('291rc0md1-20260514'), 'stamp string');
ok(index.includes('assets/export-md.v291rc0md1.css'), 'export md css loaded');
ok(index.includes('assets/export-md.v291rc0md1.js'), 'export md js loaded');
ok(exists('assets/export-md.v291rc0md1.css'), 'export md css exists');
ok(exists('assets/export-md.v291rc0md1.js'), 'export md js exists');
ok(exists('docs/V2.91RC0.rules-closure4.family-read1.frontfix1.export-md1_更新说明.md'), 'update doc exists');
ok(exists('docs/V2.91RC0.rules-closure4.family-read1.frontfix1.export-md1_验证清单.md'), 'checklist doc exists');
const js = read('assets/export-md.v291rc0md1.js');
ok(js.includes('fullMarkdown'), 'fullMarkdown exists');
ok(js.includes('briefMarkdown'), 'briefMarkdown exists');
ok(js.includes('报告展示顺序 ≠ 最终志愿顺序'), 'order warning included');
ok(js.includes('网报名师式复核口径'), 'neutral mentor style included');
ok(js.includes('doesModifyFormula:false'), 'does not modify formula flag');
ok(js.includes('doesChangeCandidatePool:false'), 'does not change candidate pool flag');
ok(js.includes('doesChangeSorting:false'), 'does not change sorting flag');
ok(index.includes('rules-closure.v291rc0closure4.js'), 'closure4 baseline kept');
ok(!index.includes('V3.0.0'), 'no V3 string');
console.log(`RESULT PASS ${pass} / FAIL ${fail}`);
if(fail) process.exit(1);

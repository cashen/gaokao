#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
function ok(cond, msg){ if(cond){ console.log('PASS', msg); pass++; } else { console.error('FAIL', msg); fail++; }}
function read(p){ return fs.readFileSync(path.join(root,p),'utf8'); }
function exists(p){ return fs.existsSync(path.join(root,p)); }
const index = read('index.html');
ok(index.includes('V2.91RC0.rules-closure4.family-read1.frontfix1.export-md2'), 'version string');
ok(index.includes('291rc0md2-20260514'), 'stamp string');
ok(index.includes('assets/export-md.v291rc0md2.css'), 'export md2 css loaded');
ok(index.includes('assets/export-md.v291rc0md2.js'), 'export md2 js loaded');
ok(exists('assets/export-md.v291rc0md2.css'), 'export md2 css exists');
ok(exists('assets/export-md.v291rc0md2.js'), 'export md2 js exists');
ok(exists('docs/V2.91RC0.rules-closure4.family-read1.frontfix1.export-md2_更新说明.md'), 'update doc exists');
ok(exists('docs/V2.91RC0.rules-closure4.family-read1.frontfix1.export-md2_验证清单.md'), 'checklist doc exists');
const js = read('assets/export-md.v291rc0md2.js');
ok(js.includes('Markdown位次明细与复核增强版'), 'md2 title in js');
ok(js.includes('我家位次对比'), 'child rank comparison included');
ok(js.includes('近两年投档'), 'yearly evidence included');
ok(js.includes('变化判断'), 'rank change judgement included');
ok(js.includes('招生计划变化'), 'plan change reminder included');
ok(js.includes('最终志愿草案排序建议'), 'volunteer order block included');
ok(js.includes('前段：小冲'), 'front rush policy included');
ok(js.includes('中段：匹配/稳妥'), 'middle match policy included');
ok(js.includes('后段：保底'), 'safe policy included');
ok(js.includes('最后：强保底'), 'strong safe policy included');
ok(js.includes('近两年位次变化汇总'), 'rank comparison summary included');
ok(js.includes('风险汇总'), 'risk summary included');
ok(js.includes('数据口径说明'), 'data scope included');
ok(js.includes('没放到主方案里的常见原因'), 'not selected reasons included');
ok(js.includes('doesModifyFormula:false'), 'does not modify formula flag');
ok(js.includes('doesChangeCandidatePool:false'), 'does not change candidate pool flag');
ok(js.includes('doesChangeSorting:false'), 'does not change sorting flag');
ok(index.includes('rules-closure.v291rc0closure4.js'), 'closure4 baseline kept');
ok(!index.includes('V3.0.0'), 'no V3 string');
try{ new Function(js); ok(true, 'export md2 js syntax'); }catch(e){ console.error(e); ok(false, 'export md2 js syntax'); }
console.log(`RESULT PASS ${pass} / FAIL ${fail}`);
if(fail) process.exit(1);

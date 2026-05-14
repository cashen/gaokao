#!/usr/bin/env node
const fs=require('fs'), path=require('path');
const root=path.resolve(__dirname,'..');
let pass=0, fail=0; function ok(name,cond){if(cond){console.log('PASS',name);pass++;}else{console.error('FAIL',name);fail++;}}
const read=f=>fs.readFileSync(path.join(root,f),'utf8'); const exists=f=>fs.existsSync(path.join(root,f));
const index=read('index.html');
ok('版本号正确',index.includes('V2.91RC0.rules-closure4'));
ok('版本戳正确',index.includes('291rc0closure4-20260514'));
ok('closure4 JS 已加载',index.includes('assets/rules-closure.v291rc0closure4.js'));
ok('closure4 CSS 已加载',index.includes('assets/rules-closure.v291rc0closure4.css'));
ok('closure4 regression 已加载',index.includes('assets/family-scenario-regression.v291rc0closure4.js'));
const js='assets/rules-closure.v291rc0closure4.js', css='assets/rules-closure.v291rc0closure4.css', reg='assets/family-scenario-regression.v291rc0closure4.js';
ok('closure4 JS 存在',exists(js)); ok('closure4 CSS 存在',exists(css)); ok('regression 存在',exists(reg));
const code=read(js);
['v291rc0closure4','291rc0closure4-20260514','planRole','riskLayer','tradeoffLabel','environmentLabel','exitLabel','reviewActions','closureFields','rows.slice(0,6)','out.length>=6','exportClosureSummary','closureCsvFields'].forEach(s=>ok('closure4 包含 '+s, code.includes(s)));
ok('仍保留电网现场冲突',code.includes('grid_vs_site_reject'));
ok('仍保留考公医学冲突',code.includes('exam_vs_medical_interest'));
ok('仍保留C机会对照',code.includes('C 是机会对照'));
const exp=read('assets/export.v2981.js');
['闭环角色','风险层','取舍点','就业环境','毕业出口','复核动作'].forEach(s=>ok('导出包含 '+s, exp.includes(s)));
const self=read('assets/debug-selftest.v2983fix12.js');
ok('selftest 指向 closure4', self.includes('rules-closure4'));
const protectedFiles=['assets/compute-pipeline.v2983.js','assets/filter-engine.v298fix1.js','assets/plan-engine.v297fix2.js','assets/region-filter-rules.v2983fix5.js','assets/rules-interest-core.v291rc0rules1.js','assets/rules-decision-core.v291rc0rules1.js','assets/child-interest-runtime.v298fix1.js','assets/catalog-interest-binding.v298.js','assets/catalog-match-engine.v298.js'];
protectedFiles.forEach(f=>ok('核心文件存在 '+f,exists(f)));
['docs/V2.91RC0.rules-closure4_更新说明.md','docs/V2.91RC0.rules-closure4_验证清单.md'].forEach(f=>ok('文档存在 '+f,exists(f)));
console.log(`RESULT PASS ${pass} / FAIL ${fail}`); process.exit(fail?1:0);

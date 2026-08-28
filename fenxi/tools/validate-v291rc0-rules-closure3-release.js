#!/usr/bin/env node
const fs=require('fs');const path=require('path');const crypto=require('crypto');
const root=path.resolve(__dirname,'..');
let pass=0,fail=0;function ok(name,cond,detail=''){if(cond){pass++;console.log('PASS｜'+name+(detail?'｜'+detail:''));}else{fail++;console.error('FAIL｜'+name+(detail?'｜'+detail:''));}}
function read(p){return fs.readFileSync(path.join(root,p),'utf8');}
function exists(p){return fs.existsSync(path.join(root,p));}
function sha(p){return crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');}
const index=read('index.html');
ok('版本号正确',index.includes('V2.91RC0.rules-closure3'));
ok('版本戳正确',index.includes('291rc0closure3-20260514'));
ok('未回到 V3',!index.includes('V3.0.0'));
ok('parent-trust2 仍保留',index.includes('parent-trust.v291rc0parenttrust2.js'));
ok('rules-closure3 JS 已加载',index.includes('assets/rules-closure.v291rc0closure3.js'));
ok('rules-closure3 CSS 已加载',index.includes('assets/rules-closure.v291rc0closure3.css'));
ok('家庭回归清单已加载',index.includes('assets/family-scenario-regression.v291rc0closure3.js'));
ok('rulesClosure 线路记录存在',index.includes("rulesClosure:'291rc0closure3-20260514'"));
const js='assets/rules-closure.v291rc0closure3.js';
const css='assets/rules-closure.v291rc0closure3.css';
const reg='assets/family-scenario-regression.v291rc0closure3.js';
ok('rules-closure3 JS 存在',exists(js));
ok('rules-closure3 CSS 存在',exists(css));
ok('family regression JS 存在',exists(reg));
const code=read(js);
[
 'studentGenderEffective','fieldRejectEffective','scenarioPriorityConflict','priorityConflictLevel','rejectLongCycleEffective','rejectNightEffective','abcPathDistribution','siteRisk','pathInfo','evaluate','scoreAdjustment','diversifyBuckets','medicalRisk','costRisk','schoolRisk','basic_science','strong_code','applied_digital','grid_vs_site_reject','medical_vs_reject','机会对照','观察模式','候选较少','exam_vs_medical_interest','当前 A/B/C 集中','exportClosureSummary','closureCsvFields'
].forEach(s=>ok('closure3 包含 '+s,code.includes(s)));
ok('女生组合规则存在',/female/.test(code)&&/女孩/.test(code));
ok('男生偏表达考公规则存在',code.includes('男孩偏表达考公'));
ok('现场分层规则存在',code.includes('hardSite')&&code.includes('factorySite')&&code.includes('powerSite')&&code.includes('deviceLabSite'));
ok('医学长周期/夜班规则存在',code.includes('rejectLongCycle')&&code.includes('rejectNight')&&code.includes('medicalRisk'));
ok('计算机强度分层存在',code.includes('strong_code')&&code.includes('medium_code')&&code.includes('applied_digital'));
ok('基础理学非师范识别存在',code.includes('basic_science')&&code.includes('非师范理学复核'));
ok('考公典型路径规则存在',code.includes('isTypicalExamPath')&&code.includes('public_service')&&code.includes('accounting'));
ok('priority 冲突处理存在',code.includes('scenarioPriorityConflict')&&code.includes('priorityConflictLevel'));
ok('ABC 多样性守卫存在',code.includes('focusAllowsDominance')&&code.includes('diversifyBuckets'));
const regression=read(reg);
ok('回归清单不少于关键用例',regression.includes('female_540_employment_site_reject')&&regression.includes('female_540_grid_site_reject')&&regression.includes('female_600_medical_reject_long')&&regression.includes('basic_science_not_teacher')&&regression.includes('exam_medical_interest_conflict')&&regression.includes('energy_chem_not_electric'));
const self=read('assets/debug-selftest.v2983fix12.js');
ok('selftest 包含 closure3 加载检查',self.includes('rules-closure3 闭环解释与路径分类加载检查'));
ok('selftest 包含女生考公拒绝现场样例',self.includes('rules-closure3 女生考公拒绝现场压住电气样例'));
ok('selftest 包含回归清单检查',self.includes('rules-closure3 家庭场景回归清单加载检查'));

const exportJs=read('assets/export.v2981.js');
ok('CSV 导出包含闭环字段',exportJs.includes('闭环路径')&&exportJs.includes('闭环冲突')&&exportJs.includes('closureCsvFields'));
ok('PNG 摘要接入闭环判断',exportJs.includes('闭环')||exportJs.includes('closureCsvFields'));
const expected={
 'assets/compute-pipeline.v2983.js':'e13b600b1344168b8f362a05b81d3280c20bb114bdcd20b39a57e8a53ce48425',
 'assets/filter-engine.v298fix1.js':'554534209df5090ffc56bb43d44d3dfc008cf28a77b136932ccb1a3e73a4e5cc',
 'assets/plan-engine.v297fix2.js':'6784b9d103cbaf33277bffff3b4711cbea6b97748563fad6d2d0c60fc3c29069',
 'assets/region-filter-rules.v2983fix5.js':'ae05166286f1fea36f3e4d3f34574872eaff028f5770b27b52c54fc0bf095610',
 'assets/rules-interest-core.v291rc0rules1.js':'229e5641e3d3f2a1d565688fb248f54c175c51c23a49a375d09f8a4e680fcfda',
 'assets/rules-decision-core.v291rc0rules1.js':'23ac43c750666b394be28e4f3067244143baaf789653dc029a25618cf86d49c5',
 'assets/child-interest-runtime.v298fix1.js':'4f719670d9f71c6ab539445d744939c791b417afdedf20a07afe1b0e2c85ef41',
 'assets/catalog-interest-binding.v298.js':'bb73ec5be18591a93e0ffe33b90cb13569fe0f483054c4a8b6a23f6b4683d793',
 'assets/catalog-match-engine.v298.js':'c5e2992a5f917cb9dee853047381e71ca6ece8f71bbb07f7a1e0a900eb02b387'
};
for(const [f,h] of Object.entries(expected))ok('核心文件哈希不变 '+f,exists(f)&&sha(f)===h,exists(f)?sha(f):'missing');
['docs/V2.91RC0.rules-closure3_更新说明.md','docs/V2.91RC0.rules-closure3_验证清单.md'].forEach(f=>ok('文档存在 '+f,exists(f)));
console.log(`\n结果：PASS ${pass} / FAIL ${fail}`);process.exit(fail?1:0);

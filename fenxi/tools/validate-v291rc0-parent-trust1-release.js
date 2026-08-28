#!/usr/bin/env node
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const root=process.cwd().endsWith('fenxi')?process.cwd():path.join(process.cwd(),'fenxi');
function read(p){return fs.readFileSync(path.join(root,p),'utf8');}
function exists(p){return fs.existsSync(path.join(root,p));}
function sha(p){return crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');}
let pass=0,fail=0;
function check(name,ok){if(ok){pass++;console.log('PASS',name);}else{fail++;console.error('FAIL',name);}}
const index=read('index.html');
const activeFiles=[
 'index.html',
 'assets/render.v2981.js',
 'assets/scenario-ui.v298.js',
 'assets/ui-form-step-core.v291rc0ui1.js',
 'assets/ui-notice-profile-early-core.v291rc0ui1.js',
 'assets/rules-detail-export-late-core.v291rc0rules1.js',
 'assets/parent-trust.v291rc0parenttrust1.js',
 'assets/parent-trust.v291rc0parenttrust1.css'
].filter(exists);
const all=activeFiles.map(f=>read(f)).join('\n');
check('版本号 parent-trust1',index.includes('V2.91RC0.parent-trust1'));
check('版本戳 parenttrust1',index.includes('291rc0parenttrust1-20260514'));
check('CSS 存在',exists('assets/parent-trust.v291rc0parenttrust1.css'));
check('JS 存在',exists('assets/parent-trust.v291rc0parenttrust1.js'));
check('index 加载 CSS',index.includes('parent-trust.v291rc0parenttrust1.css'));
check('index 加载 JS',index.includes('parent-trust.v291rc0parenttrust1.js'));
check('parentTrust debug 标记',read('assets/parent-trust.v291rc0parenttrust1.js').includes('parentTrust'));
check('scenario debug 标记',read('assets/parent-trust.v291rc0parenttrust1.js').includes('scenario'));
check('effectivePriority debug 标记',read('assets/parent-trust.v291rc0parenttrust1.js').includes('effectivePriority'));
check('prioritySource debug 标记',read('assets/parent-trust.v291rc0parenttrust1.js').includes('prioritySource'));
check('scenario-default 标记',read('assets/parent-trust.v291rc0parenttrust1.js').includes('scenario-default'));
check('user-tuned 标记',read('assets/parent-trust.v291rc0parenttrust1.js').includes('user-tuned'));
check('LN_PARENT_TRUST_OPT 开关',index.includes('LN_PARENT_TRUST_OPT')&&read('assets/parent-trust.v291rc0parenttrust1.js').includes('LN_PARENT_TRUST_OPT'));
check('考生基本信息口径',index.includes('考生基本信息'));
check('孩子学习特点口径',all.includes('孩子学习特点'));
check('当前倾向口径',all.includes('当前倾向'));
check('A/B/C 倾向微调口径',index.includes('A/B/C 倾向微调'));
check('旧画像绝对文案清除',!all.includes('画像只调整提醒顺序')&&!all.includes('只调整提醒顺序，不作为专业排除条件'));
check('priority id 保持',index.includes('id="priority"'));
check('strategyEntry id 保持',index.includes('id="strategyEntry"'));
check('childInterest id 保持',index.includes('id="childInterest"'));
check('modelLazy 保持',index.includes('LN_MODEL_LAZY_VERSION')&&index.includes('291rc0-model-lazy1-20260513'));
check('coordinator 保持',index.includes('291rc0-coordinator1-20260513'));
check('rules bundle 保持',index.includes('291rc0-rules-core1-20260513'));
check('ui bundle 保持',index.includes('291rc0-ui-core1-20260513'));
const hashes={
 'assets/compute-pipeline.v2983.js':'e13b600b1344168b8f362a05b81d3280c20bb114bdcd20b39a57e8a53ce48425',
 'assets/filter-engine.v298fix1.js':'554534209df5090ffc56bb43d44d3dfc008cf28a77b136932ccb1a3e73a4e5cc',
 'assets/plan-engine.v297fix2.js':'6784b9d103cbaf33277bffff3b4711cbea6b97748563fad6d2d0c60fc3c29069',
 'assets/region-filter-rules.v2983fix5.js':'ae05166286f1fea36f3e4d3f34574872eaff028f5770b27b52c54fc0bf095610',
 'assets/rules-interest-core.v291rc0rules1.js':'229e5641e3d3f2a1d565688fb248f54c175c51c23a49a375d09f8a4e680fcfda',
 'assets/rules-decision-core.v291rc0rules1.js':'23ac43c750666b394be28e4f3067244143baaf789653dc029a25618cf86d49c5'
};
for(const [f,h] of Object.entries(hashes)) check('核心哈希不变 '+f,sha(f)===h);
const self=read('assets/debug-selftest.v2983fix12.js');
check('selftest 包含 parent-trust1',self.includes('parent-trust1'));
check('selftest 检查 prioritySource',self.includes('prioritySource'));
check('不含 V3 版本',!index.includes('V3.0.0'));
console.log(`\n结果：PASS ${pass} / FAIL ${fail}`);
process.exit(fail?1:0);

#!/usr/bin/env node
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const root=process.cwd().endsWith('fenxi')?process.cwd():path.join(process.cwd(),'fenxi');
function read(p){return fs.readFileSync(path.join(root,p),'utf8');}
function exists(p){return fs.existsSync(path.join(root,p));}
function sha(p){return crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');}
let pass=0,fail=0;function check(name,ok){if(ok){pass++;console.log('PASS',name);}else{fail++;console.error('FAIL',name);}}
const index=read('index.html');
const pt=read('assets/parent-trust.v291rc0parenttrust2.js');
check('版本号 parent-trust2',index.includes('V2.91RC0.parent-trust2'));
check('版本戳 parenttrust2',index.includes('291rc0parenttrust2-20260514'));
check('CSS 存在',exists('assets/parent-trust.v291rc0parenttrust2.css'));
check('JS 存在',exists('assets/parent-trust.v291rc0parenttrust2.js'));
check('index 加载 CSS',index.includes('parent-trust.v291rc0parenttrust2.css'));
check('index 加载 JS',index.includes('parent-trust.v291rc0parenttrust2.js'));
check('parentTrust debug 标记',pt.includes('parentTrust'));
check('scenarioRaw debug 标记',pt.includes('scenarioRaw'));
check('scenarioEffective debug 标记',pt.includes('scenarioEffective'));
check('effectivePriority debug 标记',pt.includes('effectivePriority'));
check('prioritySource debug 标记',pt.includes('prioritySource'));
check('copyHumanized 标记',pt.includes('copyHumanized'));
check('colorNoiseReduced 标记',pt.includes('colorNoiseReduced'));
check('scenario-default 标记',pt.includes('scenario-default'));
check('user-tuned 标记',pt.includes('user-tuned'));
check('LN_PARENT_TRUST_OPT 开关',index.includes('LN_PARENT_TRUST_OPT')&&pt.includes('LN_PARENT_TRUST_OPT'));
check('考生基本信息口径',index.includes('考生基本信息'));
check('孩子情况口径',index.includes('孩子情况')||pt.includes('孩子情况'));
check('我家情况口径',index.includes('我家情况')||pt.includes('我家情况'));
check('当前优先考虑口径',index.includes('当前优先考虑')||pt.includes('当前优先考虑'));
check('只看真正对口口径',index.includes('只看真正对口')||pt.includes('只看真正对口'));
check('被动文案修补存在',pt.includes('humanizeTextNodes')&&pt.includes('MutationObserver'));
check('避免目标路径主口径',!index.includes('选择目标路径'));
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
 'assets/rules-decision-core.v291rc0rules1.js':'23ac43c750666b394be28e4f3067244143baaf789653dc029a25618cf86d49c5',
 'assets/catalog-interest-binding.v298.js':'bb73ec5be18591a93e0ffe33b90cb13569fe0f483054c4a8b6a23f6b4683d793',
 'assets/catalog-match-engine.v298.js':'c5e2992a5f917cb9dee853047381e71ca6ece8f71bbb07f7a1e0a900eb02b387',
 'assets/child-interest-runtime.v298fix1.js':'4f719670d9f71c6ab539445d744939c791b417afdedf20a07afe1b0e2c85ef41'
};
for(const [f,h] of Object.entries(hashes)) check('核心/兴趣哈希不变 '+f,exists(f)&&sha(f)===h);
const shouldMatchPt1={
 'assets/profile-interest-bridge-rules.v2981.js':'c6bc3246c0478738bfe06e518c6ec7efbc255da1adcacd96347b3f6434e44110',
 'assets/profile-interest-summary.v2981fix1.js':'4f8100ac28bc25160dd483f1924ca48be0e0b921c16672ba2f2cdc466bea73eb',
 'assets/profile-interest-summary.v2981fix2.js':'0627a9a7e0a1caffafa9f9e0334c5dade62990375d3f9de957f256a02b16788a',
 'assets/render.v2981.js':'37854f22ce7a959697870d33a4ac81d22aa705857affa3bc804c8253e3501163',
 'assets/rules-detail-export-late-core.v291rc0rules1.js':'38fd84cda03db48a94b6a48b3c10e50c37469195a344f46ae3d7bdd2e3d5dd89',
 'assets/scenario-ui.v298.js':'ac75442ea69b7968fafae0397299d808e4ba637c80fd90e8525574be58d02fb9',
 'assets/student-profile-rules.v2981.js':'90e20b52c9f28e229c4a5b11b676dce109123d23b69453ded30fd683d89b6b81',
 'assets/student-profile-ui.v2981.js':'62fad5c1fe2c976a143848b554c6b20e1a2e50a2d4d0e628b4be5fc34d3aa19d',
 'assets/ui-form-step-core.v291rc0ui1.js':'2a35a8143e704acd0415651166c091842baf3b6e34dcc2065c05588854c23f22',
 'assets/ui-notice-profile-early-core.v291rc0ui1.js':'b7402dc46299abffe1b5d7f77f17e0d48c6f5de7a9387afc4aa4b6a39ecb558a'
};
for(const [f,h] of Object.entries(shouldMatchPt1)) check('高风险 active UI 文件回到 parent-trust1 '+f,exists(f)&&sha(f)===h);
const self=read('assets/debug-selftest.v2983fix12.js');
check('selftest 包含 parent-trust2',self.includes('parent-trust2'));
check('selftest 检查 scenarioRaw',self.includes('scenarioRaw'));
check('selftest 检查 scenarioEffective',self.includes('scenarioEffective'));
check('selftest 检查 prioritySource',self.includes('prioritySource'));
check('不含 V3 版本',!index.includes('V3.0.0'));
console.log(`\n结果：PASS ${pass} / FAIL ${fail}`);process.exit(fail?1:0);

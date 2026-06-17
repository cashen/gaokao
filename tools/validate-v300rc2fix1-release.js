const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(p){return fs.readFileSync(path.join(root,p),'utf8')}
function exists(p){return fs.existsSync(path.join(root,p))}
const checks=[];
function check(name, ok, detail=''){checks.push({name,ok,detail});}
check('不包含旧版 fenxi/index.html', !exists('fenxi/index.html'));
check('V3 index 存在', exists('fenxi/v3/index.html'));
check('版本为 rc2.fix1', /V3\.0\.0\.rc2\.fix1/.test(read('fenxi/v3/assets/js/version.v3.js')));
check('版本戳为 v300rc2fix1', /v300rc2fix1-20260512/.test(read('fenxi/v3/assets/js/version.v3.js')));
const compute=read('fenxi/v3/assets/js/adapters/compute-core.v3.js');
check('compute-core 删除兴趣强制 A→B', !/if\s*\([^)]*_rc2PlanBand[^)]*===['"]A['"][^)]*\).*_rc2PlanBand\s*=\s*['"]B['"]/.test(compute));
check('compute-core 有 rankRole 位次分层', /function rankRole/.test(compute)&&/超冲过远/.test(compute)&&/上限探索/.test(compute));
check('compute-core 明确 B 不承接明显上探', /明显够不上的，只能做 C/.test(compute)||/blockedFromBByRank/.test(compute));
const plans=read('fenxi/v3/assets/js/adapters/plans-adapter-rc2.v3.js');
check('plans 采用位次先行语义', /位次先行/.test(plans)||/rank-first/.test(plans));
check('plans 有 A/B/C 防吸空兜底', /防止 A\/B\/C/.test(plans));
const cand=read('fenxi/v3/assets/js/steps/step-candidates-rc2.v3.js');
check('第6步改为候选复核', /候选复核 & 家庭自选池/.test(cand));
check('加入按钮为家庭自选池', /加入家庭自选池/.test(cand));
check('横向比较只用家庭自选池', /横向比较只读取家庭自选池/.test(cand));
check('候选复核卡含旧版复核逻辑', /招生身份/.test(cand)&&/成本提醒/.test(cand)&&/年度位次/.test(cand));
const adv=read('fenxi/v3/assets/js/adapters/advanced-filter-adapter.v3.js');
check('高级筛选支持 A/B/C 和位次角色', /planBand/.test(adv)&&/rankRole/.test(adv));
check('UI patch 重命名底部自选为候选', exists('fenxi/v3/assets/js/adapters/rc2fix1-ui-patch.v3.js'));
const debug=read('fenxi/v3/assets/js/debug/path-matrix-debug.v3.js');
check('Debug 为 rc2.fix1', /RC2\.fix1/.test(debug)&&/真实流程矩阵/.test(debug));
const failed=checks.filter(x=>!x.ok);
for(const [i,c] of checks.entries()) console.log(`${c.ok?'PASS':'FAIL'} ${String(i+1).padStart(2,'0')} ${c.name}${c.detail?' '+c.detail:''}`);
if(failed.length){console.error(`\nFAILED ${failed.length}/${checks.length}`);process.exit(1);}else console.log(`\nOK ${checks.length}/${checks.length}`);

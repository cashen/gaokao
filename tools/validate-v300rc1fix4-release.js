const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(p){ return fs.readFileSync(path.join(root,p),'utf8'); }
function exists(p){ return fs.existsSync(path.join(root,p)); }
function assert(cond,msg){ if(!cond){ console.error('FAIL:', msg); process.exit(1); } }
const stamp = 'v300rc1fix4-20260512';
const oldStamps = ['v300rc1fix3-20260512','v300rc1fix2-20260512','v300rc1-20260512','v300beta9-20260512'];
const entries = [
  'fenxi/v3/index.html',
  'fenxi/v3/index.htm',
  'fenxi/v3/debug.html',
  'fenxi/v3/debug.htm',
  'fenxi/v3/debug/index.html',
  'fenxi/v3/assets/js/version.v3.js'
];
for (const f of entries) {
  const s = read(f);
  assert(s.includes(stamp), f + ' missing rc1.fix4 stamp');
  for (const old of oldStamps) assert(!s.includes(old), f + ' still contains old stamp ' + old);
}
assert(read('fenxi/v3/assets/js/version.v3.js').includes('V3.0.0.rc1.fix4｜分数段口径与强专业推荐修正版'), 'version name not updated');
const scoreBand = read('fenxi/v3/assets/js/adapters/score-band-strategy-adapter.v3.js');
assert(scoreBand.includes('550–589 专业优先段'), '550-589 label not fixed');
assert(scoreBand.includes('fromScore(effectiveScore) || fromRank(effectiveRank)'), 'score band does not prioritize effective score');
assert(read('fenxi/v3/assets/js/debug/debug-selftest.v3.js').includes('580分显示550–589专业优先段'), 'debug missing 580 score band regression');
const plans = read('fenxi/v3/assets/js/adapters/plans-adapter.v3.js');
assert(plans.includes('majorQualityScore'), 'major quality score missing');
assert(plans.includes('金融类对学校层级、实习资源和家庭资源依赖较高'), 'finance risk warning missing');
assert(plans.includes('大数据管理与应用属于管理科学与工程类'), 'big data management warning missing');
const report = read('fenxi/v3/assets/js/adapters/report-export-adapter.v3.js');
assert(report.includes('需复核招生章程、学费、校区和培养方向'), 'compact report human review text missing');
assert(report.includes('reviewCategoryLines'), 'review dedupe categories missing');
assert(report.includes('默认已排除少数民族预科、专项计划、定向等需资格项目'), 'qualification counterfactual wording missing');
const store = read('fenxi/v3/assets/js/state-store.v3.js');
assert(store.includes('versionChanged'), 'storage version migration missing');
const rankStep = read('fenxi/v3/assets/js/steps/step-rank.v3.js');
assert(rankStep.includes('downstreamResetPatch'), 'rank downstream reset missing');
console.log('All V3.0.0.rc1.fix4 checks passed.');

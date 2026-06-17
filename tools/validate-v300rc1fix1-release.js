const fs = require('fs');
const path = require('path');

const root = process.cwd();
const required = [
  'fenxi/v3/index.html',
  'fenxi/v3/debug.html',
  'fenxi/v3/assets/js/version.v3.js',
  'fenxi/v3/assets/js/adapters/legacy-data-adapter.v3.js',
  'fenxi/v3/assets/js/adapters/score-band-strategy-adapter.v3.js',
  'fenxi/v3/assets/js/adapters/decision-context-adapter.v3.js',
  'fenxi/v3/assets/js/adapters/report-export-adapter.v3.js',
  'fenxi/v3/assets/js/adapters/counterfactual-adapter.v3.js',
  'fenxi/v3/assets/js/debug/debug-selftest.v3.js',
  'fenxi/v3/docs/V3_rc1fix1_分数位次一致性护栏与报告口径修复说明.md'
];

function read(file) {
  const p = path.join(root, file);
  if (!fs.existsSync(p)) throw new Error(`Missing ${file}`);
  return fs.readFileSync(p, 'utf8');
}

for (const file of required) read(file);

const version = read('fenxi/v3/assets/js/version.v3.js');
if (!version.includes('V3.0.0.rc1.fix2｜入口别名同步与分数位次护栏修正版')) throw new Error('version name mismatch');
if (!version.includes('v300rc1fix2-20260512')) throw new Error('version stamp mismatch');
if (!version.includes('ln-v3-rc1-fix2')) throw new Error('body class mismatch');

const index = read('fenxi/v3/index.html');
const debug = read('fenxi/v3/debug.html');
if (!index.includes('v300rc1fix2-20260512') || !debug.includes('v300rc1fix2-20260512')) throw new Error('cache stamp missing');
if (index.includes('v300rc1-20260512') || debug.includes('v300rc1-20260512')) throw new Error('old cache stamp still present');

const legacyData = read('fenxi/v3/assets/js/adapters/legacy-data-adapter.v3.js');
if (!legacyData.includes('checkRankScoreConsistency')) throw new Error('missing checkRankScoreConsistency');
if (!legacyData.includes("status = 'conflict'") && !legacyData.includes("status: 'conflict'")) throw new Error('missing conflict status');
if (!legacyData.includes('明显不匹配')) throw new Error('missing conflict human message');

const scoreBand = read('fenxi/v3/assets/js/adapters/score-band-strategy-adapter.v3.js');
if (!scoreBand.includes('input_conflict')) throw new Error('missing input_conflict band');
if (!scoreBand.includes('effectiveRank') || !scoreBand.includes('fromRank(effectiveRank)')) throw new Error('score band does not prefer effective rank');

const decision = read('fenxi/v3/assets/js/adapters/decision-context-adapter.v3.js');
if (!decision.includes('effectiveScore') || !decision.includes('effectiveRank') || !decision.includes('inputConsistency')) throw new Error('decision context missing effective input');

const report = read('fenxi/v3/assets/js/adapters/report-export-adapter.v3.js');
if (!report.includes('inputSummary')) throw new Error('report missing input summary');
if (!report.includes('原始输入') || !report.includes('系统采用')) throw new Error('report missing raw/effective wording');

const counter = read('fenxi/v3/assets/js/adapters/counterfactual-adapter.v3.js');
if (!counter.includes('Number(card.delta || 0) !== 0')) throw new Error('counterfactual zero-delta filter missing');

const selftest = read('fenxi/v3/assets/js/debug/debug-selftest.v3.js');
if (!selftest.includes('Step1 冲突输入 56548/650 必须拦截')) throw new Error('debug conflict regression missing');
if (!selftest.includes('Step1 合理输入 56548/500 可以通过')) throw new Error('debug consistent regression missing');
if (!selftest.includes('分数/位次冲突时分数段被拦截')) throw new Error('debug score-band conflict regression missing');

console.log('All V3.0.0.rc1.fix2 checks passed.');

#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function exists(file) { return fs.existsSync(path.join(root, file)); }
function assert(condition, message) { if (!condition) { console.error('FAIL:', message); process.exit(1); } }
const requiredFiles = [
  'fenxi/v3/index.html',
  'fenxi/v3/index.htm',
  'fenxi/v3/debug.html',
  'fenxi/v3/debug.htm',
  'fenxi/v3/debug/index.html',
  'fenxi/v3/VERSION.txt',
  'fenxi/v3/assets/js/version.v3.js',
  'fenxi/v3/assets/js/state-store.v3.js',
  'fenxi/v3/assets/js/adapters/legacy-data-adapter.v3.js',
  'fenxi/v3/assets/js/steps/step-rank.v3.js',
  'fenxi/v3/assets/js/debug/debug-step-rank.v3.js',
  'fenxi/v3/assets/js/debug/debug-selftest.v3.js',
  'fenxi/v3/assets/js/debug/debug-panel.v3.js',
  'fenxi/v3/docs/V3_Step1位次输入与数据加载说明.md',
  'fenxi/data/manifest.json',
  'fenxi/data/rank_2025_physics.json',
  'fenxi/data/chunks/rank_50000_80000.json'
];
requiredFiles.forEach(file => assert(exists(file), `missing ${file}`));
const index = read('fenxi/v3/index.html');
const debug = read('fenxi/v3/debug.html');
const version = read('fenxi/v3/assets/js/version.v3.js');
const store = read('fenxi/v3/assets/js/state-store.v3.js');
const data = read('fenxi/v3/assets/js/adapters/legacy-data-adapter.v3.js');
const rank = read('fenxi/v3/assets/js/steps/step-rank.v3.js');
const rankDebug = read('fenxi/v3/assets/js/debug/debug-step-rank.v3.js');
const selftest = read('fenxi/v3/assets/js/debug/debug-selftest.v3.js');
const panel = read('fenxi/v3/assets/js/debug/debug-panel.v3.js');
const stepsCss = read('fenxi/v3/assets/css/steps.v3.css');
assert(index.includes('ln-v3-alpha2'), 'index body class missing alpha2');
assert(debug.includes('ln-v3-alpha2'), 'debug body class missing alpha2');
assert(version.includes("V3.0.0.alpha2｜Step1位次输入与数据加载状态版"), 'version name missing alpha2');
assert(version.includes('v300alpha2-20260512'), 'version stamp missing alpha2');
assert(version.includes("accessCode: 'ln2026'"), 'access code must remain ln2026');
assert(store.includes('chunkIds: []') && store.includes('loadMs: 0') && store.includes('rankSource'), 'rank state fields missing');
assert(store.includes('v3-alpha2-step1-data-loading'), 'compute lastReason alpha2 missing');
assert(data.includes("MANIFEST_URL = '/fenxi/data/manifest.json'"), 'manifest url missing');
assert(data.includes("RANK_URL = '/fenxi/data/rank_2025_physics.json'"), 'rank url missing');
assert(data.includes('loadForRankOrScore'), 'loadForRankOrScore missing');
assert(data.includes('window.LN_V3_DATA_CACHE'), 'v3 data cache missing');
assert(data.includes('selectWindowChunks'), 'chunk window selection missing');
assert(rank.includes('加载位次范围并继续'), 'Step1 load button missing');
assert(rank.includes('LN_V3_LEGACY_DATA.loadForRankOrScore'), 'Step1 must call data adapter');
assert(rank.includes('waitDataMs'), 'Step1 waitDataMs recording missing');
assert(rank.includes('rank-sample-list'), 'Step1 sample list missing');
assert(debug.includes('Step1 位次加载自测'), 'debug Step1 selftest button missing');
assert(debug.includes('debug-step-rank.v3.js'), 'debug Step1 script missing');
assert(rankDebug.includes('runAsync'), 'rank debug async selftest missing');
assert(rankDebug.includes("rank: '56548'"), 'rank debug demo rank missing');
assert(rankDebug.includes('自测状态回滚干净'), 'rank debug rollback check missing');
assert(selftest.includes("type === 'rank'"), 'selftest rank mode missing');
assert(panel.includes('Promise.resolve'), 'debug panel must support async selftest');
assert(stepsCss.includes('.rank-status-grid') && stepsCss.includes('.rank-sample-item'), 'Step1 status CSS missing');
assert(!exists('index.html'), 'root index.html should not exist in fenxi-only package');
console.log('All V3.0.0.alpha2 checks passed.');

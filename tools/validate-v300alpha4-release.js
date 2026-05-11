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
  'fenxi/v3/assets/js/adapters/family-filter-adapter.v3.js',
  'fenxi/v3/assets/js/adapters/child-interest-adapter.v3.js',
  'fenxi/v3/assets/js/steps/step-rank.v3.js',
  'fenxi/v3/assets/js/debug/debug-step-rank.v3.js',
  'fenxi/v3/assets/js/debug/debug-step-family.v3.js',
  'fenxi/v3/assets/js/debug/debug-selftest.v3.js',
  'fenxi/v3/assets/js/debug/debug-panel.v3.js',
  'fenxi/v3/docs/V3_Step1位次输入与数据加载说明.md',
  'fenxi/v3/docs/V3_Step1数据401修复说明.md',
  'fenxi/v3/docs/V3_Step2家庭底线说明.md',
  'fenxi/v3/docs/V3_Step3孩子专业偏好联动说明.md',
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
const familyAdapter = read('fenxi/v3/assets/js/adapters/family-filter-adapter.v3.js');
const childAdapter = read('fenxi/v3/assets/js/adapters/child-interest-adapter.v3.js');
const rank = read('fenxi/v3/assets/js/steps/step-rank.v3.js');
const familyStep = read('fenxi/v3/assets/js/steps/step-family.v3.js');
const childStep = read('fenxi/v3/assets/js/steps/step-child.v3.js');
const rankDebug = read('fenxi/v3/assets/js/debug/debug-step-rank.v3.js');
const familyDebug = read('fenxi/v3/assets/js/debug/debug-step-family.v3.js');
const childDebug = read('fenxi/v3/assets/js/debug/debug-step-child.v3.js');
const selftest = read('fenxi/v3/assets/js/debug/debug-selftest.v3.js');
const panel = read('fenxi/v3/assets/js/debug/debug-panel.v3.js');
const stepsCss = read('fenxi/v3/assets/css/steps.v3.css');
const childCss = read('fenxi/v3/assets/css/child-preference.v3.css');
assert(index.includes('ln-v3-alpha4'), 'index body class missing alpha3');
assert(debug.includes('ln-v3-alpha4'), 'debug body class missing alpha3');
assert(version.includes("V3.0.0.alpha4｜Step3孩子专业偏好与底线结果联动版"), 'version name missing alpha3');
assert(version.includes('v300alpha4-20260512'), 'version stamp missing alpha3');
assert(version.includes("accessCode: 'ln2026'"), 'access code must remain ln2026');
assert(store.includes('chunkIds: []') && store.includes('loadMs: 0') && store.includes('rankSource'), 'rank state fields missing');
assert(store.includes('v3-alpha4-child-interest-preview'), 'compute lastReason alpha3 missing');
assert(data.includes("MANIFEST_URL = '/fenxi/data/manifest.json'"), 'manifest url missing');
assert(data.includes("RANK_URL = '/fenxi/data/rank_2025_physics.json'"), 'rank url missing');
assert(data.includes('loadForRankOrScore'), 'loadForRankOrScore missing');
assert(data.includes("credentials: 'same-origin'"), 'data fetch must include same-origin credentials');
assert(data.includes('ensureServerSession'), 'data adapter must retry after server session sync');
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
const access = read('fenxi/v3/assets/js/access-gate.v3.js');
const runtime = read('fenxi/v3/assets/js/debug/debug-runtime.v3.js');
const report = read('fenxi/v3/assets/js/debug/debug-report.v3.js');
assert(access.includes('/api/login') && access.includes('/api/session'), 'v3 access gate must call server auth APIs');
assert(access.includes('LN_V3_SERVER_SESSION'), 'server session global status missing');
assert(runtime.includes('serverSession'), 'debug runtime must expose server session');
assert(report.includes('服务器会话：'), 'debug report must include server session');
assert(selftest.includes('服务器会话已同步'), 'selftest must check server session');
assert(stepsCss.includes('.rank-status-grid') && stepsCss.includes('.rank-sample-item'), 'Step1 status CSS missing');

assert(index.includes('family-filter-adapter.v3.js'), 'index must load family filter adapter');
assert(debug.includes('Step2 底线自测'), 'debug Step2 selftest button missing');
assert(debug.includes('debug-step-family.v3.js'), 'debug Step2 script missing');
assert(store.includes('preview: null') && store.includes('家庭底线尚未设置'), 'family preview state fields missing');
assert(familyAdapter.includes('LN_V3_FAMILY_FILTER'), 'family filter adapter global missing');
assert(familyAdapter.includes('unmatchedKept') && familyAdapter.includes('targetExists'), 'hard region diagnostics missing');
assert(familyAdapter.includes('isHighFeeRecord'), 'high fee filtering preview missing');
assert(familyStep.includes('只看辽宁') && familyStep.includes('保存底线并继续'), 'Step2 family UI missing core actions');
assert(familyStep.includes('v3-step2-family-preview'), 'Step2 must record preview compute reason');
assert(familyDebug.includes('辽宁 hard unmatchedKept=0'), 'Step2 debug hard region check missing');
assert(familyDebug.includes('高收费排除预览可运行'), 'Step2 debug high fee check missing');
assert(selftest.includes("type === 'family'"), 'selftest family mode missing');
assert(stepsCss.includes('.family-preview-grid') && stepsCss.includes('.family-bigpool-hint'), 'Step2 CSS missing');

assert(index.includes('child-interest-adapter.v3.js'), 'index must load child interest adapter');
assert(debug.includes('child-interest-adapter.v3.js'), 'debug must load child interest adapter');
assert(store.includes('preview: null'), 'childPreference preview state missing');
assert(childAdapter.includes('LN_V3_CHILD_INTEREST'), 'child interest adapter global missing');
assert(childAdapter.includes('previewForState'), 'child interest previewForState missing');
assert(childAdapter.includes('manualOnly'), 'child interest manualOnly preview missing');
assert(childAdapter.includes('effectiveFilteredRows'), 'child interest effectiveFilteredRows missing');
assert(childAdapter.includes('matchedRows'), 'child interest matchedRows missing');
assert(familyAdapter.includes('getPreviewRecords'), 'family adapter must expose filtered records for Step3');
assert(childStep.includes('兴趣联动预览'), 'Step3 interest linkage panel missing');
assert(childStep.includes('syncPreview'), 'Step3 must sync child preview into store');
assert(childStep.includes('v3-step3-child-interest-preview'), 'Step3 compute reason missing');
assert(childDebug.includes('child-interest-adapter 存在'), 'Step3 debug child adapter check missing');
assert(childDebug.includes('兴趣命中预览已生成'), 'Step3 debug interest preview check missing');
assert(childDebug.includes('真实命中模式收窄到 matchedRows'), 'Step3 debug manualOnly narrowing check missing');
assert(childCss.includes('.child-link-panel') && childCss.includes('.child-metric-grid'), 'Step3 linkage CSS missing');

assert(!exists('index.html'), 'root index.html should not exist in fenxi-only package');
console.log('All V3.0.0.alpha4 checks passed.');

#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const requiredFiles = [
  'fenxi/v3/index.html',
  'fenxi/v3/index.htm',
  'fenxi/v3/debug.html',
  'fenxi/v3/debug.htm',
  'fenxi/v3/debug/index.html',
  'fenxi/v3/VERSION.txt',
  'fenxi/v3/assets/css/tokens.v3.css',
  'fenxi/v3/assets/css/access-gate.v3.css',
  'fenxi/v3/assets/css/shell.v3.css',
  'fenxi/v3/assets/css/steps.v3.css',
  'fenxi/v3/assets/css/child-preference.v3.css',
  'fenxi/v3/assets/css/debug.v3.css',
  'fenxi/v3/assets/css/responsive.v3.css',
  'fenxi/v3/assets/js/version.v3.js',
  'fenxi/v3/assets/js/access-gate.v3.js',
  'fenxi/v3/assets/js/state-store.v3.js',
  'fenxi/v3/assets/js/tab-router.v3.js',
  'fenxi/v3/assets/js/wizard-shell.v3.js',
  'fenxi/v3/assets/js/bootstrap.v3.js',
  'fenxi/v3/assets/js/steps/step-child.v3.js',
  'fenxi/v3/assets/js/debug/debug-selftest.v3.js',
  'fenxi/v3/assets/js/debug/debug-report.v3.js',
  'fenxi/v3/docs/V3_架构说明.md',
  'fenxi/v3/docs/V3_Debug诊断说明.md',
  'fenxi/v3/docs/V3_孩子专业偏好模块说明.md'
];
function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function assert(condition, message) { if (!condition) { console.error('FAIL:', message); process.exit(1); } }
requiredFiles.forEach(file => assert(fs.existsSync(path.join(root, file)), `missing ${file}`));

const index = read('fenxi/v3/index.html');
const debug = read('fenxi/v3/debug.html');
const debugDir = read('fenxi/v3/debug/index.html');
const version = read('fenxi/v3/assets/js/version.v3.js');
const tokens = read('fenxi/v3/assets/css/tokens.v3.css');
const accessCss = read('fenxi/v3/assets/css/access-gate.v3.css');
const accessJs = read('fenxi/v3/assets/js/access-gate.v3.js');
const childGroups = read('fenxi/v3/assets/js/modules/child-major-groups.v3.js');
const childStep = read('fenxi/v3/assets/js/steps/step-child.v3.js');

assert(index.includes('ln-v3-alpha1-fix2'), 'index body class missing fix2');
assert(debug.includes('ln-v3-alpha1-fix2'), 'debug body class missing fix2');
assert(version.includes("name: 'V3.0.0.alpha1.fix2｜Debug自测版本戳与状态回滚修正版'"), 'version name missing fix2');
assert(version.includes('v300alpha1fix2-20260512'), 'version stamp missing fix2');
assert(version.includes("accessCode: 'ln2026'"), 'access code must be ln2026');
assert(tokens.includes('[hidden] { display: none !important; }'), 'global hidden display fix missing');
assert(accessCss.includes('body.is-unlocked .access-page'), 'unlocked access gate CSS missing');
assert(accessJs.includes("gate.innerHTML = ''"), 'access gate cleanup missing');
assert(accessJs.includes('window.scrollTo'), 'post-access scroll reset missing');
assert(index.includes('href="/fenxi/v3/assets/css/'), 'index must use absolute v3 CSS paths');
assert(debug.includes('src="/fenxi/v3/assets/js/'), 'debug must use absolute v3 JS paths');
assert(debugDir.includes('ln-v3-debug-page'), 'debug directory alias must be debug page');
assert((childGroups.match(/id: '/g) || []).length === 9, 'child groups must be 9');
assert(childStep.includes('selectedGroups'), 'selectedGroups logic missing');
assert(childStep.includes('selectedMajors'), 'selectedMajors logic missing');
assert(childStep.includes('manualOnly'), 'manualOnly state missing');

const selftest = read('fenxi/v3/assets/js/debug/debug-selftest.v3.js');
const childDebug = read('fenxi/v3/assets/js/debug/debug-step-child.v3.js');
assert(selftest.includes('snap.stamp === window.LN_V3_VERSION.stamp'), 'debug selftest stamp must compare against runtime version');
assert(!selftest.includes("snap.stamp === 'v300alpha1-20260512'"), 'debug selftest must not hardcode old alpha1 stamp');
assert(childDebug.includes('finally') && childDebug.includes('childPreference: before.childPreference') && childDebug.includes('ui: before.ui'), 'child debug selftest must restore state');
assert(!fs.existsSync(path.join(root, 'index.html')), 'root index.html should not exist in fenxi-only package');
console.log('All V3.0.0.alpha1.fix2 checks passed.');

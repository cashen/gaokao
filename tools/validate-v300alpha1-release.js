#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const requiredFiles = [
  'fenxi/v3/index.html',
  'fenxi/v3/debug.html',
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

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}
function assert(condition, message) {
  if (!condition) {
    console.error('FAIL:', message);
    process.exit(1);
  }
}

requiredFiles.forEach(file => assert(fs.existsSync(path.join(root, file)), `missing ${file}`));

const index = read('fenxi/v3/index.html');
const debug = read('fenxi/v3/debug.html');
const version = read('fenxi/v3/assets/js/version.v3.js');
const router = read('fenxi/v3/assets/js/tab-router.v3.js');
const childGroups = read('fenxi/v3/assets/js/modules/child-major-groups.v3.js');
const childStep = read('fenxi/v3/assets/js/steps/step-child.v3.js');

assert(index.includes('ln-v3-alpha1'), 'index body class missing ln-v3-alpha1');
assert(debug.includes('ln-v3-debug-page'), 'debug body class missing ln-v3-debug-page');
assert(index.includes('lnV3AccessGate'), 'index access gate missing');
assert(debug.includes('lnV3AccessGate'), 'debug access gate missing');
assert(version.includes("accessCode: 'ln2026'"), 'access code must be ln2026');
assert(version.includes('v300alpha1-20260512'), 'version stamp missing');
assert(router.includes("{ id: 'rank'"), 'rank tab missing');
assert(router.includes("{ id: 'export'"), 'export tab missing');
assert((childGroups.match(/id: '/g) || []).length === 9, 'child groups must be 9');
assert(childStep.includes('最多 3 个方向') || childStep.includes('3 个方向'), 'max 3 prompt missing');
assert(childStep.includes('selectedGroups'), 'selectedGroups logic missing');
assert(childStep.includes('selectedMajors'), 'selectedMajors logic missing');
assert(childStep.includes('manualOnly'), 'manualOnly state missing');
assert(!fs.existsSync(path.join(root, 'index.html')), 'root index.html should not exist in fenxi-only package');
console.log('All V3.0.0.alpha1 checks passed.');

import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = file => fs.readFileSync(file, 'utf8');
const page = read('ln-rank/simulation-report.html');
const printRuntime = read('ln-rank/js/simulation-report-v003-print.js');
const printStyles = read('ln-rank/css/simulation-report-v003-print.css');
const plan = read('docs/plans/simulation-report-v003-compact-paper-card.md');

for (const needle of [
  'simulation-report-v003-print.css?v=003-compact-card',
  'simulation-report-v003-print.js?v=003-compact-card',
  '核对 / 重点提醒',
  '辽宁物理类模拟志愿填报单',
  'print-student-head',
  '打印 A4'
]) assert.ok(page.includes(needle), `page missing ${needle}`);

for (const needle of [
  "const STORAGE_KEY = 'gaokao:simulation-report:v002'",
  'function riskMessages(row)',
  '中外合作｜学费需重点确认',
  '异地/多校区培养｜确认实际地点',
  '非标准学制｜确认培养年限',
  '特殊培养方式｜需确认',
  'return messages.slice(0, 2)',
  'window.addEventListener(\'beforeprint\', syncPrintChecks)'
]) assert.ok(printRuntime.includes(needle), `print runtime missing ${needle}`);

assert.match(printRuntime, /仅.*manualCheck/u, 'risk layer should depend on existing manual records');
assert.equal(printRuntime.includes('高收费项目'), false, 'must not invent a high-tuition classification from a raw tuition number');
assert.equal(printRuntime.includes('学费：待核实'), false, 'must not generate hardcoded 待核实 placeholder');

for (const needle of [
  '.compact-check-sheet',
  '.compact-risk-item',
  'max-width: 24%',
  'display: none !important',
  'break-inside: avoid',
  '.col-check {\n    width: 28%'
]) assert.ok(printStyles.includes(needle), `print styles missing ${needle}`);

for (const needle of [
  '固定核对只保留“代码/专业组”和“特殊限制”',
  '最多 2 个风险标签',
  '高收费：v003 不因单独出现一个学费数字而判定“高收费”',
  '普通卡：主信息约 2 行 + 核对 1 行 + 家庭处理 1 行'
]) assert.ok(plan.includes(needle), `plan missing ${needle}`);

console.log('simulation-report-v003-compact-paper-contract: PASS');
console.log('Static contract: compact fixed checks, conditional risk reminders, max two risks');
console.log('No hardcoded 待核实 or unsupported high-tuition inference');

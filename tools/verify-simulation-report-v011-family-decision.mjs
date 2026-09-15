import fs from 'node:fs';

const html = fs.readFileSync('ln-rank/simulation-report.html', 'utf8');
const css = fs.readFileSync('ln-rank/css/simulation-report-v011-family-decision.css', 'utf8');
const js = fs.readFileSync('ln-rank/js/simulation-report-v011-family-decision.js', 'utf8');
const manifest = JSON.parse(fs.readFileSync('ln-rank/data/simulation-workbench-release-v011.json', 'utf8'));

for (const expected of [
  'simulation-report-v011-family-decision.css?v=011-family-decision',
  'simulation-report-v011-family-decision.js?v=011-family-decision',
  'simulation-report-v010-history-layout.js?v=010-history-layout',
  'simulation-report-v005-pdf-reminders.js?v=005-pdf-reminders'
]) {
  if (!html.includes(expected)) throw new Error(`html missing ${expected}`);
}
for (const forbidden of ['家庭处理：', 'family-select']) {
  if (css.includes(forbidden) || js.includes(forbidden)) throw new Error(`v011 visible layer should not use legacy copy: ${forbidden}`);
}
for (const expected of [
  '这所学校怎么处理？',
  '继续考虑',
  '候选',
  '还没决定',
  '排除',
  'aria-pressed',
  'data-family-option',
  "[data-field=\"familyStatus\"]",
  "value = '保留'",
  "value = '备选'",
  "value = '待讨论'",
  "value = '已排除'"
]) {
  if (!js.includes(expected)) throw new Error(`runtime missing ${expected}`);
}
for (const expected of [
  '.family-decision',
  '.family-decision-options',
  '.family-option[aria-pressed="true"]',
  '@media(max-width:760px)',
  '@media(max-width:420px)'
]) {
  if (!css.includes(expected)) throw new Error(`css missing ${expected}`);
}
if (manifest.version !== 'simulation-workspace-v011') throw new Error(`manifest version mismatch: ${manifest.version}`);
if (manifest.revision !== 'r055-human-readable-family-decision') throw new Error(`manifest revision mismatch: ${manifest.revision}`);
console.log('simulation-report-v011-family-decision contract: PASS');

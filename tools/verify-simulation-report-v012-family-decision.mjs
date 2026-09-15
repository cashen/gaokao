import fs from 'node:fs';

const html = fs.readFileSync('ln-rank/simulation-report.html', 'utf8');
const css = fs.readFileSync('ln-rank/css/simulation-report-v012-family-decision.css', 'utf8');
const js = fs.readFileSync('ln-rank/js/simulation-report-v012-family-decision.js', 'utf8');
const manifest = JSON.parse(fs.readFileSync('ln-rank/data/simulation-workbench-release-v012.json', 'utf8'));

for (const expected of [
  'simulation-report-v012-family-decision.css?v=012-family-decision',
  'simulation-report-v012-family-decision.js?v=012-family-decision',
  'simulation-report-v010-history-layout.js?v=010-history-layout',
  'simulation-report-v005-pdf-reminders.js?v=005-pdf-reminders'
]) {
  if (!html.includes(expected)) throw new Error(`html missing ${expected}`);
}
if (html.includes('simulation-report-v011-family-decision.js')) throw new Error('legacy v011 visible decision runtime should not be loaded');
for (const expected of [
  'paintSelection',
  'writeFamilyStatus',
  'aria-pressed',
  'data-family-option',
  'data-family-current',
  "'保留'",
  "'备选'",
  "'待讨论'",
  "'已排除'"
]) {
  if (!js.includes(expected)) throw new Error(`runtime missing ${expected}`);
}
for (const expected of [
  '.family-option-keep[aria-pressed="true"]',
  '.family-option-candidate[aria-pressed="true"]',
  '.family-option-undecided[aria-pressed="true"]',
  '.family-option-exclude[aria-pressed="true"]',
  '.family-option[aria-pressed="true"]::before',
  '@media(max-width:760px)',
  '@media(max-width:420px)'
]) {
  if (!css.includes(expected)) throw new Error(`css missing ${expected}`);
}
if (manifest.version !== 'simulation-workspace-v012') throw new Error(`manifest version mismatch: ${manifest.version}`);
if (manifest.revision !== 'r056-family-decision-visual-feedback') throw new Error(`manifest revision mismatch: ${manifest.revision}`);
console.log('simulation-report-v012-family-decision contract: PASS');

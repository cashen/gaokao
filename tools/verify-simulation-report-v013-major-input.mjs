import fs from 'node:fs';

const html = fs.readFileSync('ln-rank/simulation-report.html', 'utf8');
const js = fs.readFileSync('ln-rank/js/simulation-report-v013-major-input.js', 'utf8');
const css = fs.readFileSync('ln-rank/css/simulation-report-v013-major-input.css', 'utf8');
const manifest = JSON.parse(fs.readFileSync('ln-rank/data/simulation-workbench-release-v013.json', 'utf8'));
const plan = fs.readFileSync('docs/plans/simulation-major-input-v013.md', 'utf8');

for (const expected of [
  'simulation-report-v013-major-input.css?v=013-major-input',
  'simulation-report-v013-major-input.js?v=013-major-input',
  'simulation-report-v012-family-decision.js?v=012-family-decision',
  'simulation-report-v010-history-layout.js?v=010-history-layout'
]) {
  if (!html.includes(expected)) throw new Error(`html missing ${expected}`);
}
for (const expected of [
  'createMajorCatalogResolver',
  'findByCode',
  'findByName',
  'resolver.search',
  'schoolKeyword',
  'majorMatch',
  'majorMatchMessage',
  'mismatch',
  'needs-check',
  '暂时无法在线核对',
  '输入专业名称或代码'
]) {
  if (!js.includes(expected)) throw new Error(`runtime missing ${expected}`);
}
for (const expected of [
  '.major-input-suggestions',
  '.major-suggestion',
  '@media(max-width:760px)',
  'min-height:46px'
]) {
  if (!css.includes(expected)) throw new Error(`css missing ${expected}`);
}
for (const expected of [
  '专业名称或专业代码',
  '测空技术与仪器',
  '计算机',
  '学校已填写且专业已识别',
  '不编造招生事实'
]) {
  if (!plan.includes(expected)) throw new Error(`plan missing ${expected}`);
}
if (manifest.version !== 'simulation-workspace-v013') throw new Error(`manifest version mismatch: ${manifest.version}`);
if (manifest.revision !== 'r057-forgiving-major-input-school-match') throw new Error(`manifest revision mismatch: ${manifest.revision}`);
console.log('simulation-report-v013-major-input contract: PASS');

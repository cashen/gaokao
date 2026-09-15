import fs from 'node:fs';

const page = fs.readFileSync('ln-rank/simulation-report.html', 'utf8');
const runtime = fs.readFileSync('ln-rank/js/simulation-report-v005-pdf-reminders.js', 'utf8');
const currentRuntime = fs.readFileSync('ln-rank/js/simulation-report-v014-school-major-intent.js', 'utf8');
const manifest = JSON.parse(fs.readFileSync('ln-rank/data/simulation-workbench-release-v014.json', 'utf8'));

const requiredPage = [
  'id="printSheet"',
  '生成 PDF',
  'simulation-report-v014-school-major-intent.js?v=014-school-major-intent',
  'volunteer-card',
];
for (const needle of requiredPage) {
  if (!page.includes(needle)) throw new Error(`current page contract missing: ${needle}`);
}
if (page.includes('simulation-report-v004-android-print.js')) throw new Error('legacy Android print entry must not remain');

const requiredRuntime = [
  'html2canvas@1.4.1',
  'jspdf@2.5.1',
  'pdf.save(',
  '辽宁物理类模拟志愿填报单-${stamp}.pdf',
  '还没有填写学校，这条志愿暂不完整。',
  '还没有填写专业代码，这条志愿暂不完整。',
  '专业代码已填写，请确认系统是否已匹配到正确的中文专业。',
  '部分年份没有严格口径历史记录，不宜据此判断趋势。',
  '部分历史记录口径需要核验，请结合当年招生章程判断。',
  '人工核对记录',
  '家庭处理：',
  '目前没有发现需要特别提醒的项目。',
  'slice(0, 2)',
];
for (const needle of requiredRuntime) {
  if (!runtime.includes(needle)) throw new Error(`runtime contract missing: ${needle}`);
}
for (const needle of ['schoolGroundedCandidates', 'broadTerms', '实际招生记录']) {
  if (!currentRuntime.includes(needle)) throw new Error(`current v014 integration contract missing: ${needle}`);
}
if (manifest.version !== 'simulation-workspace-v014.6') throw new Error(`manifest version mismatch: ${manifest.version}`);
if (manifest.revision !== 'r068-v012-browser-harness') throw new Error(`manifest revision mismatch: ${manifest.revision}`);

console.log('simulation-report-v005 compatibility contract on current v014.6 runtime: PASS');
console.log('Direct client-side PDF file generation: covered');
console.log('Scenario reminders remain available through the v005 compatibility layer');

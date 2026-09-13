import fs from 'node:fs';

const page = fs.readFileSync('ln-rank/simulation-report.html', 'utf8');
const runtime = fs.readFileSync('ln-rank/js/simulation-report-v005-pdf-reminders.js', 'utf8');

const requiredPage = [
  'id="printSheet"',
  '>生成 PDF<',
  'simulation-report-v005-pdf-reminders.js?v=005-pdf-reminders',
  '核对与提醒用于辅助检查当前志愿',
];
for (const needle of requiredPage) {
  if (!page.includes(needle)) throw new Error(`page contract missing: ${needle}`);
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

console.log('simulation-report-v005-pdf-reminders: PASS');
console.log('Direct client-side PDF file generation: covered');
console.log('Scenario reminders: missing school / major / unmatched major / history / manual checks / family handling');
console.log('Reminder cap: 2');

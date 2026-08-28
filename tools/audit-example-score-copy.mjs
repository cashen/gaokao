import fs from 'node:fs';
const files = ['ln-rank/local-mainline.html','ln-rank/211-mainline.html','ln-rank/js/local-mainline/local-mainline-app.v3933_14.js','ln-rank/js/211-mainline/211-mainline-app.v3933_14.js'];
const hits = [];
for (const file of files) {
  const text = fs.readFileSync(file,'utf8');
  const patterns = ['如 580','例如 580','默认 580'];
  for (const p of patterns) if (text.includes(p)) hits.push({file, pattern:p});
}
const passed = hits.length === 0;
console.log(JSON.stringify({ audit: 'audit-example-score-copy', version: 'v3.9.33.14', passed, hits, note: '只检查用户可见示例，不扫描真实历史数据。' }, null, 2));
if (!passed) process.exit(1);

import fs from 'node:fs';
const files = ['ln-rank/local-mainline.html','ln-rank/211-mainline.html'];
const checks = files.map(file => {
  const text = fs.readFileSync(file,'utf8');
  return { file, hasTopNav: text.includes('class="aux-page-nav"'), hasHomeLink: text.includes('href="/ln-rank/"'), hasBottomLink: text.includes('aux-page-bottom-link'), repeatedHardBacklink: /回到初选工具查看|返回专业初选继续查询|回到专业初选继续看/.test(text) };
});
const passed = checks.every(x => x.hasTopNav && x.hasHomeLink && x.hasBottomLink && !x.repeatedHardBacklink);
console.log(JSON.stringify({ audit: 'audit-aux-page-navigation-contract', version: 'v3.9.33.14', passed, checks }, null, 2));
if (!passed) process.exit(1);

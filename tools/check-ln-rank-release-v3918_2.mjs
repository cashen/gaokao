import fs from 'node:fs';
const must = [
  'ln-rank/index.html',
  'ln-rank/selection-pool.html',
  'ln-rank/self-check.html',
  'ln-rank/major-trend-2025.html',
  'ln-rank/js/app.v3918_2.js',
  'ln-rank/js/selection-pool.v3918_2.js',
  'ln-rank/js/self-check.v3918_2.js',
  'ln-rank/js/major-trend-render.v3918_2.js',
  'ln-rank/js/feature/ui/bottomline-select.js',
  'ln-rank/js/feature/ui/rank-band-legend.js',
  'ln-rank/js/feature/score-bands/render.js',
  'ln-rank/css/components/rank-band.css',
  'functions/_lib/fenxi-session.js'
];
const bad = ['fenxi/','functions/fenxi/','functions/_middleware.js'];
const errors = [];
for (const f of must) if (!fs.existsSync(f)) errors.push(`缺少：${f}`);
for (const f of bad) if (fs.existsSync(f)) errors.push(`不应包含：${f}`);
const index = fs.readFileSync('ln-rank/index.html','utf8');
if (!index.includes('rankBandLegend') || !index.includes('resultBandSwitcher')) errors.push('首页未拆分分数区间说明与结果区切换');
if (index.includes('rankBandLegendToggle')) errors.push('仍残留展开分数区间说明按钮');
if (!index.includes('app.v3918_2.js')) errors.push('首页入口版本未更新');
const selection = fs.readFileSync('ln-rank/selection-pool.html','utf8');
if (!selection.includes('复制文字版报告')) errors.push('自选页缺少复制文字版报告兜底按钮');
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log('ln-rank v3.9.18.2 release check passed');

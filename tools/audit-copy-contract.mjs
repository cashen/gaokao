#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const lr = path.join(root, 'ln-rank');
const fn = path.join(root, 'functions', '_lib');
const assets = JSON.parse(fs.readFileSync(path.join(lr, 'active-assets.json'), 'utf8'));
const q = String(assets.assetVersion || '').replace(/^v/, '');
const activeSelection = (assets.jsEntry || []).find(x => x.includes('selection-pool')) || 'js/selection-pool.js';
const activeApp = (assets.jsEntry || []).find(x => x.includes('app.')) || 'js/app.js';
const activeTrend = (assets.jsEntry || []).find(x => x.includes('major-trend-render')) || 'js/major-trend-render.js';
const files = [
  ...(assets.html || []),
  ...(assets.jsEntry || []),
  'active-assets.json',
  'release-meta.json',
  'js/feature/major-pool/render.js',
  'js/feature/major-pool/history-score-render.js',
  'js/knowledge/local-context-resolver.js',
  'js/feature/selection-pool/store.js',
  activeSelection,
  activeApp,
  activeTrend
];
const forbidden = ['辽宁属地强链','辽宁本地强链','一级命中','二级命中','强链：','强链复核','本校主干方向','本校特色相关','学习就业方向提醒','就业保证','强烈推荐','王牌','录取优势','稳进','必录','保底','兜底','捡漏','稳赚'];
const failures = [];
function readLr(rel){ const p = path.join(lr, rel); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null; }
for (const rel of [...new Set(files)]) {
  const txt = readLr(rel);
  if (txt == null) { failures.push(`missing ${rel}`); continue; }
  for (const word of forbidden) if (txt.includes(word)) failures.push(`${rel}: ${word}`);
}
const required = [
  ['js/knowledge/local-context-resolver.js','本校方向'],
  ['js/knowledge/local-context-resolver.js','方向提醒'],
  [activeSelection,'院校专业背景复核'],
  [activeSelection,'再看'],
  ['js/feature/major-pool/history-score-render.js','2024同口径参考'],
  ['js/feature/major-pool/render.js','为什么出现']
];
for (const [rel, word] of required) {
  const txt = readLr(rel) || '';
  if (!txt.includes(word)) failures.push(`${rel}: missing ${word}`);
}
const report = { version: assets.version, assetVersion: assets.assetVersion, checkedQuery: q, failures, status: failures.length ? 'fail' : 'pass' };
fs.writeFileSync(path.join(lr, `copy-contract-audit.${q}.json`), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);

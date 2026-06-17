#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const lr = path.join(root, 'ln-rank');
const fn = path.join(root, 'functions', '_lib');
const assets = JSON.parse(fs.readFileSync(path.join(lr, 'active-assets.json'), 'utf8'));
const q = String(assets.assetVersion || '').replace(/^v/, '');
const failures = [];
function read(p){ return fs.readFileSync(p, 'utf8'); }
const activeSelection = (assets.jsEntry || []).find(x => x.includes('selection-pool')) || 'js/selection-pool.js';
for (const rel of assets.cssEntry || []) {
  const css = read(path.join(lr, rel));
  if (/\.ln-major-card\s+\.history-score\{display:none!important\}/.test(css) || /history-score\s*\{\s*display\s*:\s*none/i.test(css)) failures.push(`${rel}: hides 2024 history score`);
}
const historyJs = read(path.join(lr, 'js/feature/major-pool/history-score-render.js'));
if (!historyJs.includes('2024同口径参考')) failures.push('history-score-render missing 2024同口径参考 copy');
if (!/history-label">2024同口径参考/.test(historyJs)) failures.push('card label should show 2024同口径参考');
if (/暂无同口径数据/.test(historyJs) && /return\s+`\s*<div class="history-score/.test(historyJs)) failures.push('card renders empty 2024 block');
const render = read(path.join(lr, 'js/feature/major-pool/render.js'));
if (!(render.lastIndexOf('renderHistoryScore(record)') < render.lastIndexOf('renderMajorCode(record)') && render.lastIndexOf('renderMajorCode(record)') < render.lastIndexOf('renderLocalContextInline(record)'))) failures.push('card field order should be 2024 before code/background and code before background');
const selection = read(path.join(lr, activeSelection));
if (!selection.includes('workspace-history-chip')) failures.push('selection item missing workspace history chip');
if (selection.indexOf('itemHistoryText(item)') > selection.indexOf('itemLocalContextChip(item)')) failures.push('selection history appears after local context');
const report = read(path.join(fn, 'feishu-selection-pool-report-builder.js'));
if (!report.includes('2024同口径参考')) failures.push('Feishu selection report missing 2024同口径参考');
if (!/2025最低分[\s\S]{0,180}2025最低位次[\s\S]{0,260}historyText\(item\)[\s\S]{0,600}地域[\s\S]{0,320}codeText[\s\S]{0,800}localContextItems\(item\)/.test(report)) failures.push('Feishu item order should place 2024 and hard fields before local context');
const engine = read(path.join(fn, 'history-score-engine.js'));
for (const key of ['2024年最低分','2024专业最低分','2024最低录取位次','24最低位次']) {
  if (!engine.includes(key.replace('2024','${y}').replace('24','${yy}')) && !engine.includes(key)) failures.push(`history-score-engine missing alias ${key}`);
}
const out = { version: assets.version, assetVersion: assets.assetVersion, checkedQuery: q, failures, status: failures.length ? 'fail' : 'pass' };
fs.writeFileSync(path.join(lr, `history-score-contract-audit.${q}.json`), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
if (failures.length) process.exit(1);

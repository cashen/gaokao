#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const lr = path.join(root, 'ln-rank');
const assets = JSON.parse(fs.readFileSync(path.join(lr, 'active-assets.json'), 'utf8'));
const q = String(assets.assetVersion || '').replace(/^v/, '');
const activeSelection = (assets.jsEntry || []).find(x => x.includes('selection-pool')) || 'js/selection-pool.js';
const selectionCss = (assets.cssEntry || []).find(x => x.includes('selection')) || assets.cssDist?.selection;
const selection = fs.readFileSync(path.join(lr, activeSelection), 'utf8');
const css = fs.readFileSync(path.join(lr, selectionCss), 'utf8');
const failures = [];
function check(name, ok, detail=''){ if(!ok) failures.push(`${name}${detail ? ': ' + detail : ''}`); }
check('list stats do not render combination review long panel', !/renderDistributionCards\(summary\)\}\$\{renderKnowledgeSummaryPanel/.test(selection), 'combination review should not sit above selected list');
check('knowledge summary is compact details', /details class=\"analysis-knowledge-card is-compact\"/.test(selection), 'summary should be low-weight details');
check('single item knowledge hint is compact one-line chip', /workspace-knowledge-hints is-compact/.test(selection) && !/workspace-knowledge-hints[\s\S]{0,240}<ul>/.test(selection), 'self-selected item should not become lecture');
const metaOrder = ['2025最低分', 'itemHistoryText(item)', 'class=\"is-band\"', 'itemCodeText(item)', 'itemLocalContextChip(item)'];
let last = -1;
for (const marker of metaOrder) {
  const i = selection.indexOf(marker);
  check(`selection item contains ${marker}`, i >= 0);
  check(`selection item order ${marker}`, i > last, `${marker} should be after prior hard/soft field`);
  last = i;
}
for (const word of ['候选区：', '特控线锚点', '功能区', '推免参考匹配', '知识库复核提示', '后段是否够稳']) {
  check(`active selection visible copy avoids ${word}`, !selection.includes(word));
}
check('rank zone uses human label', selection.includes('孩子当前大概在哪一段') && selection.includes('可以重点讨论'), 'rank zone should be family-readable');
check('next action heading is human', selection.includes('下一步先做什么'), 'diagnosis should end with family action');
check('workspace order is visually reduced', /workspace-order[\s\S]{0,220}width:\s*26px\s*!important/.test(css), 'order bubble should not overpower content');
check('selected item buttons are reduced', /workspace-mini-button[\s\S]{0,220}font-size:\s*11\.5px\s*!important/.test(css), 'buttons should not overpower card');
check('analysis knowledge compact CSS exists', /analysis-knowledge-card\.is-compact[\s\S]{0,260}font-size:\s*12\.5px\s*!important/.test(css), 'review hint should be low weight');
check('human rankzone CSS exists', /analysis-rankzone\.human-rankzone[\s\S]{0,260}grid-template-columns/.test(css), 'rank zone should be structured');
const out = { version: assets.version, assetVersion: assets.assetVersion, activeSelection, selectionCss, failures, status: failures.length ? 'fail' : 'pass' };
fs.writeFileSync(path.join(lr, `selection-human-hierarchy-audit.${q}.json`), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
if (failures.length) process.exit(1);

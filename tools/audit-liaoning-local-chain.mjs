#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const argRoot = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(process.cwd(), 'ln-rank');
const projectRoot = fs.existsSync(path.join(argRoot, 'js')) ? argRoot : path.join(argRoot, 'ln-rank');
const assets = JSON.parse(fs.readFileSync(path.join(projectRoot, 'active-assets.json'), 'utf8'));
const q = String(assets.assetVersion || '').replace(/^v/, '');
const version = process.argv[3] || assets.assetVersion || `v${q}`;
const src = fs.readFileSync(path.join(projectRoot, 'js/knowledge/liaoning-local-strong-chain.js'), 'utf8');
const resolver = fs.readFileSync(path.join(projectRoot, 'js/knowledge/local-context-resolver.js'), 'utf8');
const render = fs.readFileSync(path.join(projectRoot, 'js/feature/major-pool/render.js'), 'utf8');
const activeSelection = (assets.jsEntry || []).find(x => x.includes('selection-pool')) || 'js/selection-pool.js';
const selection = fs.readFileSync(path.join(projectRoot, activeSelection), 'utf8');
const css = fs.readFileSync(path.join(projectRoot, 'css/components/local-context-contract.css'), 'utf8');
const errors = [];
const warnings = [];
function count(re, text = src) { return [...text.matchAll(re)].length; }
const chainCount = count(/school:\s*'/g);
const coreCount = count(/coreMajors:\s*\[/g);
const supportCount = count(/supportMajors:\s*\[/g);
if (chainCount < 12) errors.push(`规则数量偏少：${chainCount}`);
if (!src.includes('沈阳工程学院') || !src.includes('辽宁石油化工大学') || !src.includes('大连交通大学')) errors.push('代表院校缺失。');
if (!src.includes('matchLiaoningLocalStrongChain')) errors.push('matcher 函数缺失。');
if (!src.includes('本校方向') || !src.includes('本校相关')) errors.push('家长可理解显示文案缺失。');
const forbiddenVisible = ['一级命中', '二级命中', '王牌专业', '强烈推荐', '稳进', '必录', '录取概率'];
for (const word of forbiddenVisible) {
  const hits = count(new RegExp(word, 'g'));
  if (hits) errors.push(`用户文案不应出现：${word} (${hits})`);
}
if (!src.includes('建议复核') && !src.includes('建议重点复核')) errors.push('cardTip/reportTip 必须体现复核边界。');
if (!css.includes('.local-context-inline') || !css.includes('.workspace-local-context-chip') || !css.includes('.local-context-summary-card')) errors.push('CSS 院校专业背景合同类缺失。');
if (!render.includes('renderLocalContextInline') || !render.includes('local-context-inline')) errors.push('专业卡片未接入院校专业背景短标签。');
if (!selection.includes('renderLocalContextSummaryPanel') || !selection.includes('itemLocalContextChip')) errors.push('自选页未接入院校专业背景短提示/汇总。');
if (!resolver.includes('getLocalContextPresentation') || !resolver.includes("'card'") || !resolver.includes("'report'")) errors.push('展示调度层缺失。');
if (/辽宁属地强链|辽宁本地强链|强链：|强链复核|本校主干方向|本校特色相关/.test(render + selection + css)) errors.push('前台仍暴露内部强链文案。');
const result = { version, assetVersion: assets.assetVersion, generatedAt: new Date().toISOString(), chainCount, coreSections: coreCount, supportSections: supportCount, errors, warnings, status: errors.length ? 'fail' : 'pass' };
fs.writeFileSync(path.join(projectRoot, `local-strong-chain-audit.${q}.json`), JSON.stringify(result, null, 2), 'utf8');
console.log(JSON.stringify(result, null, 2));
if (errors.length) process.exit(1);

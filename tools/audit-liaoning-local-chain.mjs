#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const argRoot = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(process.cwd(), 'ln-rank');
const projectRoot = fs.existsSync(path.join(argRoot, 'js')) ? argRoot : path.join(argRoot, 'ln-rank');
const repoRoot = fs.existsSync(path.join(projectRoot, '..', 'functions')) ? path.resolve(projectRoot, '..') : process.cwd();
const version = 'v3930';
const file = path.join(projectRoot, 'js/knowledge/liaoning-local-strong-chain.js');
const src = fs.readFileSync(file, 'utf8');
const errors = [];
const warnings = [];
function count(re) { return [...src.matchAll(re)].length; }
const chainCount = count(/school:\s*'/g);
const coreCount = count(/coreMajors:\s*\[/g);
const supportCount = count(/supportMajors:\s*\[/g);
if (chainCount < 12) errors.push(`规则数量偏少：${chainCount}`);
if (!src.includes('沈阳工程学院') || !src.includes('辽宁石油化工大学') || !src.includes('大连交通大学')) errors.push('S级代表院校缺失。');
if (!src.includes('matchLiaoningLocalStrongChain')) errors.push('matcher 函数缺失。');
if (!src.includes('学校主干方向') || !src.includes('学校特色相关')) errors.push('家长可理解显示文案缺失。');
const forbiddenVisible = ['一级命中', '二级命中', '王牌专业', '强烈推荐', '稳进', '必录', '录取概率'];
for (const word of forbiddenVisible) {
  const re = new RegExp(word, 'g');
  const hits = count(re);
  if (hits) errors.push(`强链用户文案不应出现：${word} (${hits})`);
}
if (!src.includes('建议复核')) errors.push('cardTip/reportTip 必须体现建议复核。');
const css = fs.readFileSync(path.join(projectRoot, 'css/components/local-strong-chain-contract.css'), 'utf8');
if (!css.includes('.local-chain-card-tip') || !css.includes('.workspace-local-chain') || !css.includes('.local-chain-summary-card')) errors.push('CSS 合同类缺失。');
const selection = fs.readFileSync(path.join(projectRoot, 'js/selection-pool.v3930.js'), 'utf8');
if (!selection.includes('renderLocalStrongChainSummaryPanel') || !selection.includes('itemLocalStrongChainHtml')) errors.push('自选页未接入强链展示/汇总。');
const render = fs.readFileSync(path.join(projectRoot, 'js/feature/major-pool/render.js'), 'utf8');
if (!render.includes('renderLocalStrongChainHint')) errors.push('专业卡片未接入强链提示。');
const reportBuilder = fs.readFileSync(path.join(repoRoot, 'functions/_lib/feishu-selection-pool-report-builder.js'), 'utf8');
if (!reportBuilder.includes('localChainMarkdownLines') || !reportBuilder.includes('辽宁属地强链')) errors.push('飞书 Markdown 报告未接入强链诊断。');
const result = { version, generatedAt: new Date().toISOString(), chainCount, coreSections: coreCount, supportSections: supportCount, errors, warnings, status: errors.length ? 'fail' : 'pass' };
fs.writeFileSync(path.join(projectRoot, 'local-strong-chain-audit.v3930.json'), JSON.stringify(result, null, 2), 'utf8');
console.log(JSON.stringify(result, null, 2));
if (errors.length) process.exit(1);

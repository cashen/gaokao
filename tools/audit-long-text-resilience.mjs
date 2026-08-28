#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(process.cwd(), 'ln-rank');
const selectors = [
  '.workspace-major-name',
  '.workspace-school',
  '.workspace-item-meta span',
  '.ln-major-card .major',
  '.ln-major-card .school',
  '.result-context-range',
  '.result-context-keyword',
  '.direction-result-tags span',
  '.direction-report-tags span',
  '.meta-pill'
];
const cssFiles = [
  'css/components/text-resilience-contract.css',
  'css/components/selection-workspace.css',
  'css/pages/selection-pool.css',
  'css/components/major-card-contract.css',
  'css/components/result-context-bar.css',
  'css/components/direction-explorer.css'
];

function read(rel) {
  const abs = path.join(projectRoot, rel);
  return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : '';
}

const combined = cssFiles.map(rel => `/* ${rel} */\n${read(rel)}`).join('\n');
const contract = read('css/components/text-resilience-contract.css');
const checks = selectors.map(selector => {
  const appears = combined.includes(selector);
  const inContract = contract.includes(selector);
  const safeBlock = inContract
    && /min-width\s*:\s*0/.test(contract)
    && /max-width\s*:\s*100%/.test(contract)
    && /overflow-wrap\s*:\s*anywhere/.test(contract);
  return { selector, appears, inContract, ok: Boolean(appears && safeBlock) };
});

let activeSelection = 'js/selection-pool.v3933.js';
try {
  const assets = JSON.parse(read('active-assets.json') || '{}');
  activeSelection = (assets.jsEntry || []).find(x => x.includes('selection-pool')) || activeSelection;
} catch {}
const selectionJs = read(activeSelection);
const behavior = {
  workspaceTitleBlock: selectionJs.includes('workspace-title-block'),
  clampClass: selectionJs.includes('text-clamp-2'),
  toggleMajor: selectionJs.includes('data-toggle-major'),
  longMajorDetector: selectionJs.includes('isLongMajorName')
};
const cssBehavior = {
  textClamp2: /\.text-clamp-2/.test(contract) && /-webkit-line-clamp\s*:\s*2/.test(contract),
  expandedUnlock: /\.is-expanded \.text-clamp-2/.test(contract),
  padActionsMove: /@media \(max-width:\s*1180px\)/.test(contract) && /workspace-item-actions/.test(contract),
  mobileActionsGrid: /@media \(max-width:\s*760px\)/.test(contract) && /repeat\(2,\s*minmax\(0,\s*1fr\)\)/.test(contract)
};
const testStrings = [
  '工科试验班（智能制造与先进材料类、机械类、自动化类、能源动力类）',
  '计算机类（软件工程、网络工程、智能科学与技术、数据科学与大数据技术）',
  '临床医学（5+3一体化，儿科学）',
  '电气工程及其自动化（中外合作办学）'
];
const report = {
  generatedAt: new Date().toISOString(),
  projectRoot,
  files: cssFiles.filter(rel => fs.existsSync(path.join(projectRoot, rel))),
  checks,
  behavior,
  cssBehavior,
  testStrings,
  pass: checks.every(x => x.ok) && Object.values(behavior).every(Boolean) && Object.values(cssBehavior).every(Boolean)
};
fs.writeFileSync(path.join(projectRoot, 'long-text-resilience-audit.active.json'), JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exitCode = 1;

#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(process.cwd(), 'ln-rank');
const version = process.argv[3] || '3929';
const targets = [
  'index.html',
  'selection-pool.html',
  'js/knowledge/knowledge-contract.js',
  'js/feature/major-pool/render.js',
  'js/selection-pool.v3929.js',
  '../functions/_lib/kb/knowledge-contract.js',
  '../functions/_lib/feishu-selection-pool-report-builder.js',
  '../functions/_lib/feishu-selection-pool-styled-builder.js'
];
const forbidden = ['录取概率','稳进','必录','保底','兜底','捡漏','稳赚','强烈推荐','强烈不推荐','男生适合','女生适合','适合度','匹配度'];
const requiredSignals = ['复核提示','知识库复核','招生章程','家庭讨论','不替代'];
const results = [];
for (const rel of targets) {
  const file = path.resolve(root, rel);
  if (!fs.existsSync(file)) { results.push({ file: rel, missing: true }); continue; }
  const text = fs.readFileSync(file, 'utf8');
  const foundForbidden = forbidden.filter(w => text.includes(w));
  const foundRequired = requiredSignals.filter(w => text.includes(w));
  results.push({ file: rel, bytes: text.length, forbidden: foundForbidden, requiredSignals: foundRequired });
}
const summary = {
  version: `v${version}`,
  generatedAt: new Date().toISOString(),
  targets: results.length,
  forbiddenCount: results.reduce((n, r) => n + (r.forbidden?.length || 0), 0),
  missingFiles: results.filter(r => r.missing).map(r => r.file),
  knowledgeModules: [
    'ln-rank/js/knowledge/knowledge-contract.js',
    'functions/_lib/kb/knowledge-contract.js',
    'css/components/knowledge-contract.css'
  ],
  results
};
const out = path.join(root, `knowledge-claims-audit.v${version}.json`);
fs.writeFileSync(out, JSON.stringify(summary, null, 2), 'utf8');
console.log(JSON.stringify(summary, null, 2));
if (summary.forbiddenCount) process.exitCode = 2;

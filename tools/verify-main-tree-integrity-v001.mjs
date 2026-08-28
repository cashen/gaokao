#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const [mode = 'main', baseRef = '', headRef = 'HEAD'] = process.argv.slice(2);

const requiredFiles = [
  'index.html',
  '404.html',
  'ln-rank/index.html',
  '_headers',
  '.github/workflows/deploy-cloudflare-pages-main.yml',
  'shared/resources/release/current-release.js',
  'functions/_lib/release-contract.js',
  'data/zy2026/summary.json',
  'data/zy2026/school-index.json',
  'data/zy2026/major-index.json',
  'shared/ui/shell/family-shell.v3972_5.css',
  'shared/ui/shell/unified-visual-responsive.v3990_3.css',
  'ln-rank/css/history-evidence.v3967_0.css',
  'ln-rank/css/school-all-mode.v3967_0.css',
  'shared/ui/components/mode-switch.v3963_0.css',
  'shared/ui/interaction/interaction-transaction.v3990_2.css'
];

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function treeFiles(ref) {
  return git('ls-tree', '-r', '--name-only', ref).split('\n').filter(Boolean);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(mode === 'main' || mode === 'pull-request', `unsupported mode: ${mode}`);
const head = headRef || 'HEAD';
assert(git('cat-file', '-e', `${head}^{commit}`) === '', `head commit is unavailable: ${head}`);

const headFiles = treeFiles(head);
const headSet = new Set(headFiles);
const missingFiles = requiredFiles.filter((file) => !headSet.has(file));
assert(headFiles.length >= 100, `deployable tree is implausibly small: ${headFiles.length} files`);
assert(missingFiles.length === 0, `required tree sentinels are missing: ${missingFiles.join(', ')}`);

let baseCount = null;
let minimumAllowed = 100;
if (mode === 'pull-request') {
  assert(baseRef, 'pull-request mode requires a base commit');
  assert(git('cat-file', '-e', `${baseRef}^{commit}`) === '', `base commit is unavailable: ${baseRef}`);
  baseCount = treeFiles(baseRef).length;
  if (baseCount >= 100) {
    minimumAllowed = Math.max(100, Math.ceil(baseCount * 0.9));
    assert(
      headFiles.length >= minimumAllowed,
      `head tree shrank from ${baseCount} to ${headFiles.length} files; minimum allowed is ${minimumAllowed}`
    );
  }
}

for (const file of requiredFiles) {
  assert(existsSync(file), `checked-out sentinel is missing: ${file}`);
}

console.log(JSON.stringify({
  check: 'main-tree-integrity-v001',
  mode,
  baseRef: baseRef || null,
  headRef: head,
  baseTreeFileCount: baseCount,
  headTreeFileCount: headFiles.length,
  minimumAllowed,
  requiredSentinels: requiredFiles.length,
  missingSentinels: missingFiles,
  status: 'pass'
}, null, 2));

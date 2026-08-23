#!/usr/bin/env node

/**
 * PR192 major owner boundary verification.
 *
 * This guard does not validate admission data. It only protects the ownership
 * boundary: major knowledge belongs to the shared major layer, while products
 * consume adapters.
 */

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const required = [
  'shared/resources/major/contract.v001.md',
  'shared/resources/major/schema.v001.json',
  'shared/resources/major/loader.v001.js'
];

const missing = required.filter((file) => !fs.existsSync(path.join(root, file)));

if (missing.length) {
  console.error('Missing major owner files:', missing.join(', '));
  process.exit(1);
}

const forbidden = [
  'AI认为',
  '智能推荐',
  '精准预测',
  '成功率保证',
  '闭眼选择'
];

const scanTargets = [
  'shared/resources/major',
  'docs/contracts',
  'docs/audits'
];

const hits = [];
for (const target of scanTargets) {
  const dir = path.join(root, target);
  if (!fs.existsSync(dir)) continue;
  const files = fs.readdirSync(dir, { recursive: true });
  for (const file of files) {
    const full = path.join(dir, file);
    if (!fs.statSync(full).isFile()) continue;
    const text = fs.readFileSync(full, 'utf8');
    for (const word of forbidden) {
      if (text.includes(word)) hits.push(`${full}: ${word}`);
    }
  }
}

if (hits.length) {
  console.error('Human copy violations:');
  console.error(hits.join('\n'));
  process.exit(1);
}

console.log('PR192 major owner boundary verification passed.');

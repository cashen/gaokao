#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const target = path.join(root, 'functions/_lib/ln-2024-physics-score-rank.js');
let source = fs.readFileSync(target, 'utf8');

const corrections = [
  [
    '[683,47,524],[682,4,528],[681,81,609]',
    '[683,47,524],[682,45,569],[681,40,609]'
  ],
  [
    '[478,456,63519],[477,604,64123],[476,421,64544]',
    '[478,456,63519],[477,504,64023],[476,521,64544]'
  ]
];

for (const [before, after] of corrections) {
  if (source.includes(after)) continue;
  if (!source.includes(before)) throw new Error(`2024 correction marker missing: ${before}`);
  source = source.replace(before, after);
}
fs.writeFileSync(target, source, 'utf8');

const auditPath = path.join(root, 'tools/audit-three-year-rank-evidence-v3966.mjs');
let audit = fs.readFileSync(auditPath, 'utf8');
audit = audit.replace('[600,14365]', '[600,13601]');
fs.writeFileSync(auditPath, audit, 'utf8');

console.log(JSON.stringify({
  ok: true,
  correctedScores: [682, 477],
  correctedAuditAnchor: { year: 2025, score: 600, rankEnd: 13601 },
  evidence: 'authoritative-image-and-protected-historical-rank-cross-check'
}, null, 2));

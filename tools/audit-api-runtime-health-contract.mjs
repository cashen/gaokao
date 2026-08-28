#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const lr = path.join(root, 'ln-rank');
const assets = JSON.parse(fs.readFileSync(path.join(lr, 'active-assets.json'), 'utf8'));
const q = String(assets.assetVersion || '').replace(/^v/, '');
const failures = [];
function exists(rel){ return fs.existsSync(path.join(root, rel)); }
function read(rel){ return fs.readFileSync(path.join(root, rel), 'utf8'); }
for (const rel of ['functions/api/ln-rank-runtime-health.js','functions/api/major-bands-health.js','functions/api/major-bands.js']) {
  if (!exists(rel)) failures.push(`missing ${rel}`);
}
const health = exists('functions/api/ln-rank-runtime-health.js') ? read('functions/api/ln-rank-runtime-health.js') : '';
if (!/content-type.+application\/json|application\/json.+content-type/s.test(health)) failures.push('runtime health must return JSON content-type');
if (!health.includes('loadManifest')) failures.push('runtime health must check /fenxi manifest path');
if (!health.includes('getLocalMainlineMeta')) failures.push('runtime health must check local-mainline KB without requiring full data scan');
if (!health.includes('functions-route')) failures.push('runtime health must expose functions route hit check');
const mbh = exists('functions/api/major-bands-health.js') ? read('functions/api/major-bands-health.js') : '';
if (!mbh.includes('/api/ln-rank-runtime-health')) failures.push('major-bands-health should point to runtime health route');
const report = { version: assets.version, assetVersion: assets.assetVersion, failures, status: failures.length ? 'fail' : 'pass' };
fs.writeFileSync(path.join(lr, `api-runtime-health-contract-audit.${q}.json`), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);

#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const lr = path.join(root, 'ln-rank');
const assets = JSON.parse(fs.readFileSync(path.join(lr, 'active-assets.json'), 'utf8'));
const expectedVersion = assets.version;
const expectedAsset = assets.assetVersion;
const expectedQuery = String(assets.assetVersion || '').replace(/^v/, '');
const failures = [];
function read(rel){return fs.readFileSync(path.join(lr, rel), 'utf8');}
function exists(rel){return fs.existsSync(path.join(lr, rel));}
if (assets.version !== expectedVersion || assets.assetVersion !== expectedAsset) failures.push(`active-assets version mismatch: ${assets.version} / ${assets.assetVersion}`);
for (const rel of [...(assets.jsEntry || []), ...(assets.cssEntry || [])]) if (!exists(rel)) failures.push(`missing ${rel}`);
for (const rel of assets.html || []) {
  const html = read(rel);
  if (!html.includes(expectedVersion)) failures.push(`${rel}: missing ${expectedVersion}`);
  if (/v3\.9\.33\.[12]/.test(html) && !html.includes(expectedVersion)) failures.push(`${rel}: old display version remains`);
  if (new RegExp('\\?v=(?!' + expectedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b)[^\"\']+').test(html)) failures.push(`${rel}: non-current query remains`);
}
const importRe = /(?:import|export)\s+(?:[^'\"]*?from\s*)?['\"]([^'\"]+\.js(?:\?v=[^'\"]+)?)['\"]/g;
const seen = new Set();
function walk(rel){
  if (seen.has(rel)) return;
  seen.add(rel);
  const abs = path.join(lr, rel);
  if (!fs.existsSync(abs)) { failures.push(`missing import ${rel}`); return; }
  const txt = fs.readFileSync(abs, 'utf8');
  for (const m of txt.matchAll(importRe)) {
    const spec = m[1];
    const q = spec.match(/\?v=([^'\"]+)$/)?.[1];
    if (q && q !== expectedQuery) failures.push(`${rel}: imports non-current query ${spec}`);
    const clean = spec.split('?')[0];
    const next = path.normalize(path.join(path.dirname(rel), clean)).replaceAll('\\', '/');
    walk(next);
  }
}
for (const rel of assets.jsEntry || []) walk(rel);
const report = { version: expectedVersion, assetVersion: expectedAsset, checkedFiles: [...seen].sort(), checkedCount: seen.size, failures, status: failures.length ? 'fail' : 'pass' };
fs.writeFileSync(path.join(lr, `active-asset-graph-audit.${expectedQuery}.json`), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);

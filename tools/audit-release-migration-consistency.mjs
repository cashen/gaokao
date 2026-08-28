#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const lr = path.join(root, 'ln-rank');
const assets = JSON.parse(fs.readFileSync(path.join(lr, 'active-assets.json'), 'utf8'));
const q = String(assets.assetVersion || '').replace(/^v/, '');
const failures = [];
const warnings = [];
const read = rel => fs.readFileSync(path.join(lr, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(lr, rel));
function fail(name, ok, detail){ if(!ok) failures.push(`${name}${detail ? ': ' + detail : ''}`); }
fail('active-assets version present', /^v3\.9\.33\.\d+$/.test(String(assets.version || '')), assets.version);
fail('active-assets assetVersion present', /^v3933_\d+$/.test(String(assets.assetVersion || '')), assets.assetVersion);
const versionTxt = read('VERSION.txt').trim();
fail('VERSION.txt follows active version', versionTxt.includes(assets.version), versionTxt);
const releaseMeta = JSON.parse(read('release-meta.json'));
fail('release-meta version follows active version', releaseMeta.version === assets.version, `${releaseMeta.version} != ${assets.version}`);
fail('release-meta assetVersion follows active assetVersion', releaseMeta.assetVersion === assets.assetVersion, `${releaseMeta.assetVersion} != ${assets.assetVersion}`);
for (const rel of assets.html || []) {
  const html = read(rel);
  fail(`${rel} contains active display version`, html.includes(assets.version), assets.version);
  fail(`${rel} contains active asset query`, html.includes(`?v=${q}`), `?v=${q}`);
  fail(`${rel} has no stale query`, !new RegExp('\\?v=3933_(?!' + q.split('_')[1] + '\\b)\\d+').test(html), 'stale query not matching active asset');
  fail(`${rel} references only active entry version`, !new RegExp('v3933_(?!' + q.split('_')[1] + '\\b)\\d+\\.(?:js|css)').test(html), 'stale active file ref');
}
for (const rel of [...(assets.jsEntry || []), ...(assets.cssEntry || [])]) fail(`active entry exists ${rel}`, exists(rel));
for (const rel of assets.jsEntry || []) fail(`jsEntry filename carries active asset ${rel}`, rel.includes(assets.assetVersion), rel);
for (const rel of assets.cssEntry || []) fail(`cssEntry filename carries active asset ${rel}`, rel.includes(assets.assetVersion), rel);
const importRe = /(?:import|export)\s+(?:[^'\"]*?from\s*)?['\"]([^'\"]+\.js(?:\?v=[^'\"]+)?)['\"]/g;
const seen = new Set();
function walk(rel){
  if(seen.has(rel)) return;
  seen.add(rel);
  const abs = path.join(lr, rel);
  if(!fs.existsSync(abs)){ failures.push(`missing active import: ${rel}`); return; }
  const txt = fs.readFileSync(abs, 'utf8');
  for (const m of txt.matchAll(importRe)) {
    const spec = m[1];
    const iq = spec.match(/\?v=([^'\"]+)$/)?.[1];
    if (iq && iq !== q) failures.push(`${rel}: import query not migrated: ${spec}`);
    const clean = spec.split('?')[0];
    const next = path.normalize(path.join(path.dirname(rel), clean)).replaceAll('\\', '/');
    walk(next);
  }
}
for (const rel of assets.jsEntry || []) walk(rel);
const activeSelection = (assets.jsEntry || []).find(x => x.includes('selection-pool'));
if (activeSelection) {
  const txt = read(activeSelection);
  fail('selection report context version follows active', txt.includes(`version: '${assets.version}'`) || txt.includes(`version: \"${assets.version}\"`), activeSelection);
}
const out = { version: assets.version, assetVersion: assets.assetVersion, checkedActiveJs: [...seen].sort(), failures, warnings, status: failures.length ? 'fail' : 'pass' };
fs.writeFileSync(path.join(lr, `release-migration-consistency-audit.${q}.json`), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
if (failures.length) process.exit(1);

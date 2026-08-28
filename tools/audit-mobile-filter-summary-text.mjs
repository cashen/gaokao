#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const lr = path.join(root, 'ln-rank');
const assets = JSON.parse(fs.readFileSync(path.join(lr, 'active-assets.json'), 'utf8'));
const q = String(assets.assetVersion || '').replace(/^v/, '');
const appRel = (assets.jsEntry || []).find(x => /js\/app\.v/.test(x));
const failures = [];
if (!appRel) failures.push('missing active app entry');
const app = appRel ? fs.readFileSync(path.join(lr, appRel), 'utf8') : '';
if (/当前查看：\$\{parts\.join\('｜'\)\}/.test(app) || /parts\.join\('｜'\)/.test(app)) failures.push('renderFilterSummary still uses a single long joined text');
if (/root\.textContent\s*=\s*`当前查看/.test(app)) failures.push('filter summary still writes one long textContent string');
for (const token of ['ln-filter-summary-main','ln-filter-summary-chip','ln-filter-summary-details','查看完整条件']) {
  if (!app.includes(token)) failures.push(`missing structured summary token: ${token}`);
}
const out = { version: assets.version, assetVersion: assets.assetVersion, checked: appRel, failures, status: failures.length ? 'fail' : 'pass' };
fs.writeFileSync(path.join(lr, `mobile-filter-summary-text-audit.${q}.json`), JSON.stringify(out,null,2));
console.log(JSON.stringify(out,null,2));
if (failures.length) process.exit(1);

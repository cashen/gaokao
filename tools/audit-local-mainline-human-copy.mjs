#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const lr = path.join(root, 'ln-rank');
const assets = JSON.parse(fs.readFileSync(path.join(lr, 'active-assets.json'), 'utf8'));
const q = assets.assetVersion.replace(/^v/, '');
const failures = [];
const forbidden = /推荐|优势明显|强校|稳进|保底|捡漏|必录|能上|性价比最高|就业保证|一级命中|二级命中|强链|博士点强专业/;
const activeLocalJs = (assets.jsEntry || []).find(x => x.includes('local-mainline-app'));
const activeLocalCss = (assets.cssEntry || []).find(x => x.includes('local-mainline'));
const scanList = ['local-mainline.html', activeLocalJs, activeLocalCss, 'data/local-mainline/local-mainline-index.generated.json'].filter(Boolean);
function scan(rel) {
  const txt = fs.readFileSync(path.join(lr, rel), 'utf8');
  const m = txt.match(forbidden);
  if (m) failures.push(`${rel} contains forbidden copy: ${m[0]}`);
}
scanList.forEach(scan);
const html = fs.readFileSync(path.join(lr, 'local-mainline.html'), 'utf8');
if (/学校主线|专业主线/.test(html)) failures.push('local-mainline.html should use human copy instead of 学校主线/专业主线');
const out = { version: assets.version, assetVersion: assets.assetVersion, scanned: scanList, status: failures.length ? 'fail' : 'pass', failures };
fs.writeFileSync(path.join(lr, `local-mainline-human-copy-audit.${q}.json`), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
if (failures.length) process.exit(1);

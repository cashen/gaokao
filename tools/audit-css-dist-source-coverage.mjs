#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const projectRoot = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(process.cwd(), 'ln-rank');
const assets = JSON.parse(fs.readFileSync(path.join(projectRoot,'active-assets.json'),'utf8'));
const asset = String(assets.assetVersion||'').replace(/^v/,'');
const manifest = JSON.parse(fs.readFileSync(path.join(projectRoot,'css/css-bundle-sources.json'),'utf8'));
const reportPath = path.join(projectRoot, `css-dist-report.v${asset}.json`);
if (!fs.existsSync(reportPath)) throw new Error(`missing css dist report ${reportPath}`);
const report = JSON.parse(fs.readFileSync(reportPath,'utf8'));
const checks=[];
let ok=true;
for (const page of report.pages || []) {
  const min=(manifest.minimums&&manifest.minimums[page.bundle])||{};
  const cssPath=path.join(projectRoot,page.dist);
  const css=fs.readFileSync(cssPath,'utf8');
  const required=(manifest.requiredSelectors&&manifest.requiredSelectors[page.bundle])||[];
  const missing=required.filter(sel=>!css.includes(sel));
  const pass = (!min.sourceCount || page.sourceCount>=min.sourceCount) && (!min.bytes || page.bytes>=min.bytes) && missing.length===0;
  if (!pass) ok=false;
  checks.push({bundle:page.bundle,dist:page.dist,sourceCount:page.sourceCount,minSourceCount:min.sourceCount||0,bytes:page.bytes,minBytes:min.bytes||0,missingSelectors:missing,pass});
}
const out={ok,version:assets.version,assetVersion:assets.assetVersion,checks};
fs.writeFileSync(path.join(projectRoot,`css-dist-source-coverage-audit.${asset}.json`),JSON.stringify(out,null,2),'utf8');
if (!ok) { console.error(JSON.stringify(out,null,2)); process.exit(1); }
console.log(JSON.stringify(out,null,2));

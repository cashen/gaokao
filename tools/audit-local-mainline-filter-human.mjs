#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const lr = path.join(root, 'ln-rank');
const assets = JSON.parse(fs.readFileSync(path.join(lr, 'active-assets.json'), 'utf8'));
const q = String(assets.assetVersion || '').replace(/^v/, '');
const html = fs.readFileSync(path.join(lr, 'local-mainline.html'), 'utf8');
const jsRel = (assets.jsEntry || []).find(x => x.includes('local-mainline-app'));
const js = fs.readFileSync(path.join(lr, jsRel), 'utf8');
function visibleTextFromHtml(source){ return source.replace(/<script[\s\S]*?<\/script>/g,' ').replace(/<style[\s\S]*?<\/style>/g,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' '); }
const front = visibleTextFromHtml(html) + '\n' + js;
const failures=[];
for (const bad of ['证据层级']) {
  if (front.includes(bad)) failures.push(`filter exposes engineering term: ${bad}`);
}
for (const s of ['先看背景更明确的专业','多看一些相关专业','连提醒也一起看','更多筛选']) if(!front.includes(s)) failures.push(`missing human filter copy: ${s}`);
if (!html.includes('lm-more-filter')) failures.push('advanced filter should be folded');
const out={version:assets.version,assetVersion:assets.assetVersion,checked:['local-mainline.html',jsRel],failures,status:failures.length?'fail':'pass'};
fs.writeFileSync(path.join(lr, `local-mainline-filter-human-audit.${q}.json`), JSON.stringify(out,null,2));
console.log(JSON.stringify(out,null,2));
if(failures.length) process.exit(1);

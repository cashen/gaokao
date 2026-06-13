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
function userFacingStrings(source){
  const out=[];
  for (const m of source.matchAll(/(['`"])([\s\S]*?)\1/g)) {
    const s=m[2];
    if(!/[\u4e00-\u9fa5]/.test(s)) continue;
    if(s.startsWith('/api/') || s.startsWith('/ln-rank/') || s.includes('application/json')) continue;
    if(s.includes('<') || s.includes('>') || s.includes('href=') || s.includes('class=')) continue;
    out.push(s);
  }
  return out.join(' ');
}
const htmlVisible = visibleTextFromHtml(html);
const jsVisible = userFacingStrings(js);
const failures = [];
const forbiddenInHtml = ['飞书','推送','API','JSON','HTML','status','debug','log','待补证据','知识库暂未形成','专业入口','/ln-rank/','manifest'];
const forbiddenInJsCopy = ['飞书','推送','待补证据','知识库暂未形成','专业入口'];
for (const word of forbiddenInHtml) if (htmlVisible.includes(word)) failures.push(`front html contains engineering/platform term: ${word}`);
for (const word of forbiddenInJsCopy) if (jsVisible.includes(word)) failures.push(`front copy contains engineering/platform term: ${word}`);
const required = ['辽宁省内专业背景怎么先看','不知道从哪开始','返回专业初选','家庭讨论报告','回到初选工具查看'];
const visible = htmlVisible + '\n' + jsVisible;
for (const word of required) if (!visible.includes(word)) failures.push(`missing parent-first copy: ${word}`);
const out = { version: assets.version, assetVersion: assets.assetVersion, checked: ['local-mainline.html', jsRel], forbiddenInHtml, forbiddenInJsCopy, required, failures, status: failures.length ? 'fail' : 'pass' };
fs.writeFileSync(path.join(lr, `local-mainline-parent-first-copy-audit.${q}.json`), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
if (failures.length) process.exit(1);

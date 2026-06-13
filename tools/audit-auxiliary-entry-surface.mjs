#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const lr = path.join(root, 'ln-rank');
const assets = JSON.parse(fs.readFileSync(path.join(lr, 'active-assets.json'), 'utf8'));
const q = assets.assetVersion.replace(/^v/, '');
const failures=[];
function fail(name, ok, detail=''){ if(!ok) failures.push(`${name}${detail?': '+detail:''}`); }
const index = fs.readFileSync(path.join(lr,'index.html'),'utf8');
const css = fs.readFileSync(path.join(lr, assets.cssDist?.main || 'css/dist/ln-rank-main.v3933_10.css'),'utf8');
const section = index.slice(index.indexOf('class="mainline-entry'), index.indexOf('class="ln-console'));
fail('auxiliary entry uses human title', section.includes('省内学校的专业背景'));
fail('auxiliary entry button uses human copy', section.includes('查看省内专业背景'));
fail('auxiliary entry does not expose 主线 copy', !/学校和专业主线|省内院校专业主线|查看省内院校专业主线/.test(section));
fail('auxiliary button not strong blue fill', !/\.mainline-entry-link\{[^}]*background:\s*#2457a6/i.test(css));
fail('auxiliary button prevents wrapping', /\.mainline-entry-link\{[^}]*white-space:\s*nowrap/s.test(css));
fail('mobile auxiliary entry becomes block', /@media\(max-width:720px\)\{[^}]*\.mainline-entry\{display:block/s.test(css));
const out={version:assets.version,assetVersion:assets.assetVersion,status:failures.length?'fail':'pass',failures};
fs.writeFileSync(path.join(lr,`auxiliary-entry-surface-audit.${q}.json`),JSON.stringify(out,null,2));
console.log(JSON.stringify(out,null,2));
if(failures.length) process.exit(1);

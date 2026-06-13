#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const lr = path.join(root, 'ln-rank');
const assets = JSON.parse(fs.readFileSync(path.join(lr, 'active-assets.json'), 'utf8'));
const q = String(assets.assetVersion || '').replace(/^v/, '');
const jsRel = (assets.jsEntry || []).find(x => x.includes('local-mainline-app'));
const js = fs.readFileSync(path.join(lr, jsRel), 'utf8');
const failures=[];
for (const s of ['这不代表学校不好','数据暂时没有读取成功','展开排查信息','回到专业初选工具']) if(!js.includes(s)) failures.push(`missing empty/error human copy: ${s}`);
const directDiagnostic = /errorHtml[\s\S]*?apiErrorDiagnosticHtml\(error, esc\)/.test(js);
if (directDiagnostic) failures.push('api diagnostic should not be appended directly; it must be folded behind details');
for (const bad of ['undefined','null','TypeError','manifest failed']) if(js.includes(`>${bad}<`)) failures.push(`visible raw error term: ${bad}`);
const out={version:assets.version,assetVersion:assets.assetVersion,checked:[jsRel],failures,status:failures.length?'fail':'pass'};
fs.writeFileSync(path.join(lr, `local-mainline-empty-error-human-audit.${q}.json`), JSON.stringify(out,null,2));
console.log(JSON.stringify(out,null,2));
if(failures.length) process.exit(1);

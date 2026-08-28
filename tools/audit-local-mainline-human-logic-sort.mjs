#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const lr = path.join(root, 'ln-rank');
const assets = JSON.parse(fs.readFileSync(path.join(lr,'active-assets.json'),'utf8'));
const q = String(assets.assetVersion||'').replace(/^v/,'');
const jsRel = (assets.jsEntry||[]).find(x => x.includes('local-mainline-app'));
const js = fs.readFileSync(path.join(lr, jsRel),'utf8');
const api = fs.readFileSync(path.join(root,'functions/api/local-mainline.js'),'utf8');
const failures=[];
const required = [
  'buildDirectionGroups',
  'renderDirectionGroup',
  'buildMajorSchoolGroups',
  'majorDifferenceText',
  '接近孩子分数',
  '稍高一点可少量了解',
  '低一些的可讨论选择',
  '2025历史参考'
];
for (const token of required) if (!js.includes(token)) failures.push(`local-mainline app missing human logic token: ${token}`);
if (/showSchoolDetail[\s\S]*?records\.map\(r => recordCard\(r\)/.test(js)) failures.push('school detail still directly maps records to full record cards');
if (!api.includes('near: sortByHumanScore') || !api.includes('lower: sortByHumanScore')) failures.push('score API is not grouped into near/upper/lower with human sorting');
if (js.includes('不叫保底') || js.includes('保底')) failures.push('local-mainline user-facing score copy contains forbidden safety wording');
const out={version:assets.version,assetVersion:assets.assetVersion,checked:[jsRel,'functions/api/local-mainline.js'],failures,status:failures.length?'fail':'pass'};
fs.writeFileSync(path.join(lr,`local-mainline-human-logic-sort-audit.${q}.json`),JSON.stringify(out,null,2),'utf8');
if (failures.length){ console.error(JSON.stringify(out,null,2)); process.exit(1); }
console.log(JSON.stringify(out,null,2));

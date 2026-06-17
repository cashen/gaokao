#!/usr/bin/env node
import fs from 'node:fs';
const js=fs.readFileSync('ln-rank/js/local-mainline/local-mainline-app.v3933_13.js','utf8');
const failures=[];
for(const s of ['这不代表学校不好','数据暂时没有读取成功','展开排查信息']) if(!js.includes(s)) failures.push(`missing empty/error human copy: ${s}`);
for(const s of ['回到专业初选工具','返回专业初选','回到初选工具查看']) if(js.includes(s)) failures.push(`noisy backlink remains in local app: ${s}`);
console.log(JSON.stringify({ok:failures.length===0,failures},null,2));
if(failures.length)process.exit(1);

#!/usr/bin/env node
import fs from 'node:fs';
const html=fs.readFileSync('ln-rank/local-mainline.html','utf8');
const failures=[];
const required=['辽宁省内专业背景怎么先看','不知道从哪开始','家庭讨论报告','招生章程'];
for(const s of required) if(!html.includes(s)) failures.push(`missing parent-first copy: ${s}`);
for(const s of ['返回专业初选','回到初选工具查看']) if(html.includes(s)) failures.push(`noisy backlink remains: ${s}`);
console.log(JSON.stringify({ok:failures.length===0,failures},null,2));
if(failures.length)process.exit(1);

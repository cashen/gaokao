#!/usr/bin/env node
import fs from 'node:fs';
const files=['ln-rank/local-mainline.html','ln-rank/js/local-mainline/local-mainline-app.v3933_13.js','ln-rank/211-mainline.html','ln-rank/js/211-mainline/211-mainline-app.v3933_13.js'];
const banned=['返回专业初选','回到初选工具查看','回到专业初选继续看','回到专业初选工具','返回专业初选继续查询'];
const failures=[];
for(const file of files){const s=fs.readFileSync(file,'utf8');for(const b of banned){if(s.includes(b))failures.push(`${file} contains noisy backlink: ${b}`)}}
console.log(JSON.stringify({ok:failures.length===0,failures},null,2));
if(failures.length)process.exit(1);

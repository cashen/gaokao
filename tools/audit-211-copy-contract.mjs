#!/usr/bin/env node
import fs from 'node:fs';
const files=['ln-rank/211-mainline.html','ln-rank/js/211-mainline/211-mainline-app.v3933_13.js','ln-rank/kb/211-mainline/211-school-background.generated.js'];
const banned=['录取概率','就业保证','一级命中','二级命中','强链','主线命中'];
const failures=[];
for(const file of files){const s=fs.readFileSync(file,'utf8');for(const b of banned){if(s.includes(b))failures.push(`${file} contains forbidden frontend copy: ${b}`)}}
console.log(JSON.stringify({ok:failures.length===0,failures},null,2));
if(failures.length)process.exit(1);

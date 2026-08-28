#!/usr/bin/env node
import fs from 'node:fs';
const html=fs.readFileSync('ln-rank/211-mainline.html','utf8');
const data=JSON.parse(fs.readFileSync('ln-rank/data/211-mainline/211-mainline-index.generated.json','utf8'));
const failures=[];
for(const s of ['按学校看','按专业看','按分数看','本校方向','本校相关','方向提醒','不代表录取判断']) if(!html.includes(s)) failures.push(`missing 211 page copy: ${s}`);
if(data.meta.totalEntries!==115) failures.push(`expected 115 entries, got ${data.meta.totalEntries}`);
if(data.meta.militarySpecialEntries!==3) failures.push('military special entry count is not 3');
if(!fs.existsSync('functions/api/211-mainline.js')) failures.push('missing 211 api');
if(!fs.existsSync('ln-rank/js/knowledge/211-background-hint.js')) failures.push('missing result card 211 hint resolver');
console.log(JSON.stringify({ok:failures.length===0,failures},null,2));
if(failures.length)process.exit(1);

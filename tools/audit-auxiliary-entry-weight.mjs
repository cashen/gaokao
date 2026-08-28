#!/usr/bin/env node
import fs from 'node:fs';
const html=fs.readFileSync('ln-rank/index.html','utf8');
const failures=[];
const heroEnd=html.indexOf('<section class="ln-console');
const aux=html.indexOf('aux-background-entry');
if(aux<0)failures.push('missing low-weight auxiliary background entry');
if(aux>=0 && heroEnd>=0 && aux<heroEnd)failures.push('auxiliary background entry appears before search console');
if(/mainline-entry panel/.test(html))failures.push('old high-weight mainline-entry panel still exists');
for(const s of ['资料与背景复核','省内学校专业背景','全国 211 院校专业背景']) if(!html.includes(s)) failures.push(`missing copy: ${s}`);
if(!/查看省内背景/.test(html)||!/查看 211 背景/.test(html))failures.push('missing two weak auxiliary links');
console.log(JSON.stringify({ok:failures.length===0,failures},null,2));
if(failures.length)process.exit(1);

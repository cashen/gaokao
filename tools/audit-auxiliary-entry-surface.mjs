#!/usr/bin/env node
import fs from 'node:fs';
const html=fs.readFileSync('ln-rank/index.html','utf8');
const failures=[];
if(!html.includes('资料与背景复核'))failures.push('missing low weight auxiliary entry title');
if(html.includes('mainline-entry panel'))failures.push('old high weight provincial background panel still exists');
if(!html.includes('/ln-rank/local-mainline.html')||!html.includes('/ln-rank/211-mainline.html'))failures.push('missing local or 211 auxiliary link');
console.log(JSON.stringify({ok:failures.length===0,failures},null,2));
if(failures.length)process.exit(1);

#!/usr/bin/env node
import fs from 'node:fs';
const html=fs.readFileSync('ln-rank/index.html','utf8');
const failures=[];
if(!html.includes('学校和专业背景'))failures.push('missing low weight auxiliary entry title');
if(html.includes('mainline-entry panel'))failures.push('old high weight provincial background panel still exists');
if(!html.includes('href="/ln-rank/local-mainline"')||!html.includes('href="/ln-rank/211-mainline"'))failures.push('missing canonical local or 211 auxiliary link');
if(!/<a class="aux-background-card"[^>]*href="\/ln-rank\/local-mainline"/.test(html)||!/<a class="aux-background-card"[^>]*href="\/ln-rank\/211-mainline"/.test(html))failures.push('auxiliary entries must be native anchors');
console.log(JSON.stringify({ok:failures.length===0,failures},null,2));
if(failures.length)process.exit(1);

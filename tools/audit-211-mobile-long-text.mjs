#!/usr/bin/env node
import fs from 'node:fs';
const css=fs.readFileSync('ln-rank/css/dist/211-mainline.v3933_13.css','utf8');
const failures=[];
for(const s of ['overflow-wrap:anywhere','@media(max-width:640px)','grid-template-columns:1fr','width:100%']) if(!css.includes(s))failures.push(`missing mobile resilience css: ${s}`);
console.log(JSON.stringify({ok:failures.length===0,failures},null,2));
if(failures.length)process.exit(1);

#!/usr/bin/env node
import fs from 'node:fs';
const manifest=JSON.parse(fs.readFileSync('ln-rank/css/css-bundle-sources.json','utf8'));
const css=fs.readFileSync('ln-rank/css/dist/211-mainline.v3933_13.css','utf8');
const failures=[];
if(!manifest.bundles.main211) failures.push('missing main211 css bundle');
for(const s of ['css/pages/local-mainline.css','css/pages/211-mainline.css']) if(!manifest.bundles.main211?.includes(s)) failures.push(`main211 missing source ${s}`);
for(const s of ['.jm-page','.jm-hero','.jm-school-card','.lm-start-card']) if(!css.includes(s)) failures.push(`211 dist missing selector ${s}`);
console.log(JSON.stringify({ok:failures.length===0,failures},null,2));
if(failures.length)process.exit(1);

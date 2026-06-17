#!/usr/bin/env node
import fs from 'node:fs';
const data=JSON.parse(fs.readFileSync('ln-rank/data/211-mainline/211-mainline-index.generated.json','utf8'));
const military=data.schools.filter(s=>s.isMilitarySpecial);
const failures=[];
if(military.length!==3)failures.push(`expected 3 military special schools, got ${military.length}`);
for(const s of military){if(!s.specialBoundary)failures.push(`${s.school} missing special boundary`);}
const api=fs.readFileSync('functions/api/211-mainline.js','utf8');
if(!api.includes('match211Mainline'))failures.push('211 score api does not use match211Mainline boundary matcher');
console.log(JSON.stringify({ok:failures.length===0,failures},null,2));
if(failures.length)process.exit(1);

#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const failures=[];
function walk(dir){const out=[]; if(!fs.existsSync(dir))return out; for(const name of fs.readdirSync(dir)){const p=path.join(dir,name); const st=fs.statSync(p); if(st.isDirectory()) out.push(...walk(p)); else out.push(p.replace(/\\/g,'/'));} return out;}
const files=walk('.');
for(const f of files){ if(f.startsWith('ln-rank/fenxi/')) failures.push(`contains /ln-rank/fenxi/: ${f}`); if(f.startsWith('functions/fenxi/')) failures.push(`contains functions/fenxi/: ${f}`); if(f==='functions/_middleware.js') failures.push('contains functions/_middleware.js'); }
if(!fs.existsSync('functions/_lib/fenxi-session.js')) failures.push('missing functions/_lib/fenxi-session.js');
console.log(JSON.stringify({ok:failures.length===0,failures},null,2));
if(failures.length)process.exit(1);

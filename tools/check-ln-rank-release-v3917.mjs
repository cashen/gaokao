import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
function ok(p){ if(!fs.existsSync(path.join(root,p))) throw new Error('missing '+p); }
['ln-rank/index.html','ln-rank/selection-pool.html','ln-rank/self-check.html','ln-rank/js/app.v3917.js','ln-rank/js/selection-pool.v3917.js','ln-rank/js/feature/review-checklist/index.js','ln-rank/css/components/review-checklist.css','functions/_lib/kb/review-checklist-builder.js','functions/_lib/fenxi-session.js'].forEach(ok);
const sel=fs.readFileSync(path.join(root,'ln-rank/selection-pool.html'),'utf8');
if(!sel.includes('reviewChecklistPanel')) throw new Error('reviewChecklistPanel missing');
if(sel.includes('v3916')) throw new Error('old v3916 reference in selection-pool.html');
const idx=fs.readFileSync(path.join(root,'ln-rank/index.html'),'utf8');
if(!idx.includes('app.v3917.js')) throw new Error('index entry not v3917');
console.log('check-ln-rank-release-v3917 passed');

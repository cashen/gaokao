import fs from 'node:fs';
const roles = ['asset','architecture','main-flow','data-contract','gaokao-contract','aux-boundary','ai-output','report-consistency','parent-readable','ui-consistency','mobile-behavior','api-error'];
const out = { ok: true, roles, note: 'Static checklist companion for v3.9.35 release review.' };
fs.writeFileSync('ln-rank/v3.9.35-12-role-release-checklist.json', JSON.stringify(out,null,2));
console.log(JSON.stringify(out,null,2));

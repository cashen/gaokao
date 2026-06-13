#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const lr = path.join(root, 'ln-rank');
const assets = JSON.parse(fs.readFileSync(path.join(lr, 'active-assets.json'), 'utf8'));
const q = assets.assetVersion.replace(/^v/, '');
const activeLocalJs = (assets.jsEntry || []).find(x => x.includes('local-mainline-app'));
const js = fs.readFileSync(path.join(lr, activeLocalJs), 'utf8');
const failures=[];
function fail(name, ok, detail=''){ if(!ok) failures.push(`${name}${detail?': '+detail:''}`); }
const body = js.slice(js.indexOf('function recordCard'), js.indexOf('function emptyHtml'));
function pos(s){return body.indexOf(s)}
fail('record card body found', body.length > 200);
fail('card renders school/major before score', pos('r.school') >= 0 && pos('2025最低分') > pos('r.school'));
fail('card renders 2024 history after 2025 score', pos('${historyLine(r)}') > pos('2025最低分'));
fail('card renders mainline after hard data', pos('lm-mainline-row') > pos('lm-data-row'));
fail('card renders evidence after mainline', pos('lm-evidence-row') > pos('lm-mainline-row'));
fail('card renders review after evidence', pos('建议再看') > pos('lm-evidence-row'));
const out={version:assets.version,assetVersion:assets.assetVersion,activeLocalJs,status:failures.length?'fail':'pass',failures};
fs.writeFileSync(path.join(lr,`local-mainline-card-hierarchy-audit.${q}.json`),JSON.stringify(out,null,2));
console.log(JSON.stringify(out,null,2));
if(failures.length) process.exit(1);

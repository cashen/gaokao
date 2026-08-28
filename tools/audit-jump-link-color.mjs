#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const lr = path.join(root, 'ln-rank');
const assets = JSON.parse(fs.readFileSync(path.join(lr, 'active-assets.json'), 'utf8'));
const q = assets.assetVersion.replace(/^v/, '');
const failures=[];
function fail(name, ok, detail=''){ if(!ok) failures.push(`${name}${detail?': '+detail:''}`); }
const mainCss = fs.readFileSync(path.join(lr, assets.cssDist?.main || 'css/dist/ln-rank-main.v3933_11.css'),'utf8');
const localCss = fs.readFileSync(path.join(lr, assets.cssDist?.localMainline || 'css/dist/local-mainline.v3933_11.css'),'utf8');
const auxRules = mainCss.match(/\.mainline-entry-link\{[^}]+\}/g) || [];
const cardRules = mainCss.match(/\.local-mainline-card-link\{[^}]+\}/g) || [];
const auxRule = auxRules.find(x => /color:\s*#365f8f/i.test(x)) || '';
const cardRule = cardRules.find(x => /background:\s*#f9fbfe/i.test(x) && /color:\s*#3f628f/i.test(x)) || '';
fail('auxiliary entry link uses warm text color', Boolean(auxRule));
fail('auxiliary entry link avoids hard primary fill', !/\.mainline-entry-link\{[^}]*background:\s*#2457a6/i.test(mainCss));
fail('card local background link is low weight', Boolean(cardRule));
fail('local page primary uses warm token', /--lm-primary:\s*#365f8f/i.test(localCss));
const out={version:assets.version,assetVersion:assets.assetVersion,status:failures.length?'fail':'pass',failures};
fs.writeFileSync(path.join(lr,`jump-link-color-audit.${q}.json`),JSON.stringify(out,null,2));
console.log(JSON.stringify(out,null,2));
if(failures.length) process.exit(1);

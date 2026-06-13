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
fail('main entry has 720px mobile contract', /@media\(max-width:720px\)/.test(mainCss));
fail('main entry link full width on mobile', /\.mainline-entry-link\{[^}]*width:100%/s.test(mainCss));
fail('card local link full width on mobile', /\.major-card-actions \.local-mainline-card-link\{[^}]*width:100%/s.test(mainCss));
fail('buttons prevent wrap on narrow screens', /@media\(max-width:360px\)[\s\S]*white-space:nowrap/.test(mainCss));
fail('local page mobile actions full width', /@media\(max-width:640px\)[\s\S]*\.lm-hero-actions\{width:100%/.test(localCss));
const out={version:assets.version,assetVersion:assets.assetVersion,status:failures.length?'fail':'pass',failures};
fs.writeFileSync(path.join(lr,`mobile-entry-layout-audit.${q}.json`),JSON.stringify(out,null,2));
console.log(JSON.stringify(out,null,2));
if(failures.length) process.exit(1);

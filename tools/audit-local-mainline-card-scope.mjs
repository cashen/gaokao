#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const lr = path.join(root, 'ln-rank');
const assets = JSON.parse(fs.readFileSync(path.join(lr, 'active-assets.json'), 'utf8'));
const q = assets.assetVersion.replace(/^v/, '');
const failures = [];
function fail(name, ok, detail=''){ if(!ok) failures.push(`${name}${detail?': '+detail:''}`); }
const render = fs.readFileSync(path.join(lr, 'js/feature/major-pool/render.js'), 'utf8');
const linkBlock = render.slice(render.indexOf('function localMainlineLink'), render.indexOf('function card'));
fail('localMainlineLink exists', linkBlock.includes('function localMainlineLink'));
fail('card link requires unified local background evidence', /getLocalBackgroundHint\(record\)/.test(linkBlock));
fail('card link refuses no evidence', /!hint\?\.visible/.test(linkBlock) || /hint\?\.visible\s*!==\s*true/.test(linkBlock));
fail('card link no longer unconditional school major only', !/if\s*\(record\?\.school\s*&&\s*record\?\.major\)\s*\{?\s*const href/s.test(linkBlock));
fail('card link uses human label', linkBlock.includes('省内背景'));
fail('card link removed old label', !linkBlock.includes('查看学校主线'));
const out = { version: assets.version, assetVersion: assets.assetVersion, status: failures.length ? 'fail' : 'pass', failures };
fs.writeFileSync(path.join(lr, `local-mainline-card-scope-audit.${q}.json`), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
if (failures.length) process.exit(1);

#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const lr = path.join(root, 'ln-rank');
const assets = JSON.parse(fs.readFileSync(path.join(lr, 'active-assets.json'), 'utf8'));
const q = assets.assetVersion.replace(/^v/, '');
const failures = [];
const api = fs.readFileSync(path.join(root, 'functions/api/local-mainline.js'), 'utf8');
function fail(name, ok, detail=''){ if(!ok) failures.push(`${name}${detail?': '+detail:''}`); }
fail('score API loads /fenxi through loadAllRecords', /loadAllRecords/.test(api));
fail('score API normalizes records', /normalizeRecord/.test(api));
fail('score API checks score2025', /score2025/.test(api));
fail('score API under group uses <= candidate', /Number\(r\.score2025\) <= candidate/.test(api));
fail('score API upper group limited to +10', /Number\(r\.score2025\) <= candidate \+ 10/.test(api));
fail('score API does not hardcode score result list', !/580\s*[:=]/.test(api));
const out = { version: assets.version, assetVersion: assets.assetVersion, status: failures.length ? 'fail' : 'pass', failures };
fs.writeFileSync(path.join(lr, `score-entrance-accuracy-audit.${q}.json`), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
if (failures.length) process.exit(1);

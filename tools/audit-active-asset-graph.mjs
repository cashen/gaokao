#!/usr/bin/env node
import fs from 'node:fs';import path from 'node:path';
const root=process.argv[2]?path.resolve(process.argv[2]):process.cwd();const lr=path.join(root,'ln-rank');const assets=JSON.parse(fs.readFileSync(path.join(lr,'active-assets.json'),'utf8'));
const failures=[];function read(rel){return fs.readFileSync(path.join(lr,rel),'utf8')}function exists(rel){return fs.existsSync(path.join(lr,rel))}
if(assets.version!=='v3.9.33'||assets.assetVersion!=='v3933')failures.push('active-assets version mismatch');
for(const rel of [...assets.jsEntry,...assets.cssEntry])if(!exists(rel))failures.push(`missing ${rel}`);
for(const rel of assets.html||[]){const html=read(rel);if(!/v3\.9\.33/.test(html))failures.push(`${rel} footer/version missing v3.9.33`);if(/v3932|\?v=3932/.test(html))failures.push(`${rel} has old v3932`)}
const importRe=/(?:import|export)\s+(?:[^'\"]*?from\s*)?['\"]([^'\"]+\.js(?:\?v=[^'\"]+)?)['\"]/g;
const seen=new Set();function walk(rel){if(seen.has(rel))return;seen.add(rel);const abs=path.join(lr,rel);if(!fs.existsSync(abs)){failures.push(`missing import ${rel}`);return;}const txt=fs.readFileSync(abs,'utf8');for(const m of txt.matchAll(importRe)){const spec=m[1];if(/\?v=(?!3933\b)/.test(spec))failures.push(`${rel} imports old query ${spec}`);const clean=spec.split('?')[0];const next=path.normalize(path.join(path.dirname(rel),clean)).replaceAll('\\','/');walk(next)}}
for(const rel of assets.jsEntry)walk(rel);
const report={version:'v3.9.33',checked:[...seen].length,failures,status:failures.length?'fail':'pass'};fs.writeFileSync(path.join(lr,'active-asset-graph-audit.v3933.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(failures.length)process.exit(1);

#!/usr/bin/env node
import fs from 'node:fs';import path from 'node:path';
const root=process.argv[2]?path.resolve(process.argv[2]):process.cwd();const lr=path.join(root,'ln-rank');const assets=JSON.parse(fs.readFileSync(path.join(lr,'active-assets.json'),'utf8'));
const q=String(assets.assetVersion||'').replace(/^v/,'');
const files=[...(assets.jsEntry||[]),'js/feature/selection-pool/store.js','js/feature/major-pool/render.js'];const failures=[];
const setItemRe=/localStorage\.setItem\(\s*['"]([^'"]+)['"]/g;
for(const rel of files){const p=path.join(lr,rel);if(!fs.existsSync(p))continue;const txt=fs.readFileSync(p,'utf8');for(const m of txt.matchAll(setItemRe)){const key=m[1];if(/\.v39\d+/.test(key)&&!key.endsWith(`.v${q}`))failures.push(`${rel}: writes non-current key ${key}`);}}
const store=fs.readFileSync(path.join(lr,'js/feature/selection-pool/store.js'),'utf8');if(!store.includes(`physics2025.v${q}`))failures.push(`store STORAGE_KEY not v${q}`);
const report={version:assets.version,assetVersion:assets.assetVersion,failures,status:failures.length?'fail':'pass'};fs.writeFileSync(path.join(lr,`storage-version-audit.${q}.json`),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(failures.length)process.exit(1);

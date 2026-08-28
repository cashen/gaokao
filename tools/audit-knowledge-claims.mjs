#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(process.cwd(), 'ln-rank');
const version = process.argv[3] || '3929';
const scanDirs = ['js','functions'].map(d => path.join(root === process.cwd() ? process.cwd() : path.dirname(root), d)).filter(fs.existsSync);
const files = [];
function walk(dir){ for (const name of fs.readdirSync(dir)){ const p=path.join(dir,name); const st=fs.statSync(p); if(st.isDirectory()) walk(p); else if(/\.(js|html|css)$/.test(name)) files.push(p); } }
for(const dir of scanDirs) walk(dir);
const forbidden = ['录取概率','稳进','必录','保底','兜底','捡漏','稳赚','强烈推荐','强烈不推荐','男生适合','女生适合','适合度','匹配度'];
const allowFiles = [/human-copy-dictionary/, /audit-knowledge-claims/, /README/, /knowledge/i, /functions\/_lib\/kb\/.*generated/];
const hits=[]; const internalGuardHits=[];
const guardFiles = [/prompt/, /validator/, /copy-policy/, /output-schema/, /zone-policy/, /fallback-writer/, /ai-skills/];
for(const f of files){ const rel=path.relative(process.cwd(),f); const txt=fs.readFileSync(f,'utf8'); for(const term of forbidden){ if(txt.includes(term) && !allowFiles.some(re=>re.test(rel))) { const hit={file:rel,term}; if(guardFiles.some(re=>re.test(rel))) internalGuardHits.push(hit); else hits.push(hit); } } }
const requiredModules = ['ln-rank/js/knowledge/major-knowledge-contract.js','ln-rank/js/knowledge/index.js','ln-rank/css/components/knowledge-contract.css'];
const missingModules = requiredModules.filter(m=>!fs.existsSync(path.resolve(process.cwd(),m)));
const report = {version:`v${version}`, generatedAt:new Date().toISOString(), scannedFiles:files.length, forbiddenHits:hits, internalGuardHits, missingModules, status: hits.length||missingModules.length ? 'warn' : 'pass'};
fs.writeFileSync(path.join(root, `knowledge-claims-audit.v${version}.json`), JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));

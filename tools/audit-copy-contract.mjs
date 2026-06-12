#!/usr/bin/env node
import fs from 'node:fs';import path from 'node:path';
const root=process.argv[2]?path.resolve(process.argv[2]):process.cwd();const lr=path.join(root,'ln-rank');const files=['index.html','selection-pool.html','js/app.v3933.js','js/selection-pool.v3933.js','js/feature/major-pool/render.js','js/knowledge/local-context-resolver.js'];
const forbidden=['辽宁属地强链','一级命中','二级命中','强链：','强链复核','本校主干方向','本校特色相关','学习就业方向提醒','就业保证','强烈推荐','王牌','录取优势'];
const failures=[];for(const rel of files){const txt=fs.readFileSync(path.join(lr,rel),'utf8');for(const word of forbidden){if(txt.includes(word))failures.push(`${rel}: ${word}`)}}
const required=[['js/knowledge/local-context-resolver.js','本校方向'],['js/knowledge/local-context-resolver.js','方向提醒'],['js/selection-pool.v3933.js','院校专业背景复核'],['js/selection-pool.v3933.js','再看']];for(const [rel,word] of required){if(!fs.readFileSync(path.join(lr,rel),'utf8').includes(word))failures.push(`${rel}: missing ${word}`)}
const report={version:'v3.9.33',failures,status:failures.length?'fail':'pass'};fs.writeFileSync(path.join(lr,'copy-contract-audit.v3933.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(failures.length)process.exit(1);

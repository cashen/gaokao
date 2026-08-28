#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const lr = path.join(root, 'ln-rank');
const assets = JSON.parse(fs.readFileSync(path.join(lr, 'active-assets.json'), 'utf8'));
const q = String(assets.assetVersion || '').replace(/^v/, '');
const html = fs.readFileSync(path.join(lr, 'local-mainline.html'), 'utf8');
const failures=[];
function has(s){ return html.includes(s); }
for (const s of ['不知道从哪开始','已经有目标学校','孩子有大概专业方向','现在只知道分数','data-start-tab="school"','data-start-tab="major"','data-start-tab="score"']) if(!has(s)) failures.push(`missing first-use guide: ${s}`);
const hero = html.match(/<header class="lm-hero[\s\S]*?<\/header>/)?.[0] || '';
const heroLinks = (hero.match(/class="lm-link-button/g) || []).length;
if (heroLinks !== 1) failures.push(`hero should expose exactly one main path button, got ${heroLinks}`);
if (!/lm-boundary-soft[\s\S]*?<details>/.test(html)) failures.push('full boundary should be folded behind details');
const out={version:assets.version,assetVersion:assets.assetVersion,failures,status:failures.length?'fail':'pass'};
fs.writeFileSync(path.join(lr, `local-mainline-first-use-flow-audit.${q}.json`), JSON.stringify(out,null,2));
console.log(JSON.stringify(out,null,2));
if(failures.length) process.exit(1);

#!/usr/bin/env node
const fs=require('fs');
const path=require('path');
const root=process.cwd();
function ok(cond,msg){ if(!cond){ console.error('FAIL:',msg); process.exitCode=1; } else console.log('OK:',msg); }
function exists(p){return fs.existsSync(path.join(root,p));}
ok(exists('fenxi/index.html'),'fenxi/index.html exists');
ok(exists('fenxi/diagnostics.html'),'fenxi/diagnostics.html exists');
ok(exists('functions/_middleware.js'),'functions/_middleware.js exists');
['student-profile-rules','student-profile-ui','child-intent-translator','child-intent-ui','intent-conflict-rules','path-review-rules','major-misread-rules','score-rank-band-rules','path-scenario-rules','path-explain-engine'].forEach(n=>ok(exists(`fenxi/assets/${n}.v2975.js`),`${n}.v2975.js exists`));
const index=fs.readFileSync(path.join(root,'fenxi/index.html'),'utf8');
ok(index.includes('V2.9.7.5｜学生画像、孩子想法翻译与专业路径解释整合版'),'version title updated');
ok(index.includes('assets/path-explain-engine.v2975.js'),'path explain engine referenced');
ok(!exists('index.html'),'root index.html not included');
const files=[...fs.readdirSync(path.join(root,'fenxi/assets')).filter(x=>x.endsWith('.v2975.js'))];
for(const f of files){ const s=fs.readFileSync(path.join(root,'fenxi/assets',f),'utf8'); ok(!/适合女生|女生优先|女生慎报|不建议女生|高薪专业|轻松专业|闭眼选|避坑专业/.test(s),`${f} wording scan`); }
if(process.exitCode) process.exit(process.exitCode);

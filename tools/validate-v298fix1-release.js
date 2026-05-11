const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
function ok(cond,msg){ if(!cond){ console.error('FAIL:',msg); process.exitCode=1; } else console.log('OK:',msg); }
const idx=fs.readFileSync(path.join(root,'fenxi/index.html'),'utf8');
ok(idx.includes('V2.9.8.fix1'), 'index title/version is V2.9.8.fix1');
['filter-engine.v298fix1.js','app.v298fix1.js','child-interest-runtime.v298fix1.js','child-interest-ui.v298fix1.js','child-intent-translator.v298fix1.js','child-intent-ui.v298fix1.js'].forEach(f=>ok(idx.includes(`assets/${f}`), `index references ${f}`));
const app=fs.readFileSync(path.join(root,'fenxi/assets/app.v298fix1.js'),'utf8');
ok(app.includes("child-interest-auto-toggle"),'app handles auto-toggle action');
const fe=fs.readFileSync(path.join(root,'fenxi/assets/filter-engine.v298fix1.js'),'utf8');
ok(fe.includes('interestSortScoreV298Fix1'),'filter engine has interest sort function');
ok(fe.includes('_interestSortScore'),'filter engine stores interest sort score');
ok(fe.includes('window.LN_CHILD_INTEREST_UI_V296?.renderSummary'),'filter engine refreshes interest summary after filtered changes');
const ver=fs.readFileSync(path.join(root,'fenxi/VERSION.txt'),'utf8');
ok(ver.includes('V2.9.8.fix1'),'VERSION is V2.9.8.fix1');
process.exit(process.exitCode||0);

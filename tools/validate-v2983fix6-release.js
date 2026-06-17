const fs = require('fs');
const path = require('path');
const root = process.cwd();
function assert(ok,msg){ if(!ok){ console.error('FAIL:',msg); process.exit(1);} console.log('PASS:',msg); }
const html = fs.readFileSync(path.join(root,'fenxi/index.html'),'utf8');
assert(html.includes("2983fix6-20260511"),'index version stamp is fix6');
assert(html.includes('LN_THEME_TOKENS_V297'),'theme tokens are inlined');
assert(!html.includes('const files=["assets/theme-tokens.v297fix2.js"'),'theme-tokens is not first boot script');
assert(!/const files=\[[^\]]*theme-tokens\.v297fix2\.js/.test(html),'theme-tokens removed from critical boot queue');
assert(fs.existsSync(path.join(root,'fenxi/assets/theme-tokens.v297fix2.js')),'theme token compatibility file still exists');
assert(fs.readFileSync(path.join(root,'fenxi/VERSION.txt'),'utf8').includes('V2.9.8.3.fix6'),'VERSION is fix6');
console.log('All V2.9.8.3.fix6 checks passed.');

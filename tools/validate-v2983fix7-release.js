const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(p){ return fs.readFileSync(path.join(root,p),'utf8'); }
function ok(name, cond){ if(!cond){ console.error('FAIL:', name); process.exitCode=1; } else console.log('OK:', name); }
const idx = read('fenxi/index.html');
ok('VERSION is fix7', read('fenxi/VERSION.txt').includes('V2.9.8.3.fix7'));
ok('index version stamp fix7', idx.includes("const VERSION='2983fix7-20260511'"));
ok('theme tokens inline still present', idx.includes('LN_THEME_TOKENS_V297'));
ok('rules inline present', idx.includes('LN_GAOKAO_RULES_V2953'));
ok('rules script removed from boot queue', !idx.includes('"assets/rules.v297fix2.js"'));
ok('rules legacy asset retained', fs.existsSync(path.join(root,'fenxi/assets/rules.v297fix2.js')));
ok('fix5 region rules retained', fs.existsSync(path.join(root,'fenxi/assets/region-filter-rules.v2983fix5.js')));
ok('debug retained', fs.existsSync(path.join(root,'fenxi/debug.html')));
if(process.exitCode){ process.exit(process.exitCode); }
console.log('All V2.9.8.3.fix7 checks passed.');

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(p){ return fs.readFileSync(path.join(root,p),'utf8'); }
function exists(p){ return fs.existsSync(path.join(root,p)); }
const checks=[];
function ok(name, cond){ checks.push([name, !!cond]); }
const version=read('fenxi/VERSION.txt');
const index=read('fenxi/index.html');
const app2982=read('fenxi/assets/app.v2982.js');
const app2981fix2=read('fenxi/assets/app.v2981fix2.js');
const css=read('fenxi/assets/app.v2982.css');
const scroll=read('fenxi/assets/scroll-lock-guard.v2982fix2.js');
ok('VERSION is fix2', version.includes('V2.9.8.2.fix2'));
ok('index visible title is fix2', index.includes('V2.9.8.2.fix2'));
ok('index cache version is 2982fix2', index.includes("const VERSION='2982fix2-20260511'"));
ok('index css cache is fix2', index.includes('app.v2982.css?v=2982fix2-20260511'));
ok('index loads scroll guard', index.includes('scroll-lock-guard.v2982fix2.js'));
ok('app v2982 body class includes fix2', app2982.includes("'v2982fix2'"));
ok('app v2982 marks fix2 version', app2982.includes("version:'V2.9.8.2.fix2'"));
ok('app v2982 has no MutationObserver', !/new\s+MutationObserver/.test(app2982));
ok('legacy app v2981fix2 no MutationObserver', !/new\s+MutationObserver/.test(app2981fix2));
ok('legacy app observe disabled', app2981fix2.includes('function observe(){observe.done=true; return false;}'));
ok('css has fix2 scroll rules', css.includes('body.v2982fix2:not(.drawer-open-v296)'));
ok('css keeps profileAsk hidden fix2', css.includes('body.v2982fix2 #profileAsk'));
ok('css keeps mentorRules hidden fix2', css.includes('body.v2982fix2 #mentorRules'));
ok('css keeps bands hidden fix2', css.includes('body.v2982fix2 #resultBox .bands'));
ok('scroll guard exists', exists('fenxi/assets/scroll-lock-guard.v2982fix2.js'));
ok('scroll guard removes drawer-open', scroll.includes("classList.remove('drawer-open-v296')"));
ok('scroll guard exposes ensure', scroll.includes('LN_SCROLL_LOCK_GUARD_V2982FIX2={ensure'));
ok('doc exists', exists('docs/V2.9.8.2.fix2_缓存版本戳重绘观察器移除与滚动稳定修正版说明.md'));
ok('middleware exists', exists('functions/_middleware.js'));
const failed=checks.filter(([,v])=>!v);
if(failed.length){console.error('FAILED CHECKS:');failed.forEach(([n])=>console.error(' - '+n));process.exit(1);}
console.log(`All ${checks.length} V2.9.8.2.fix2 checks passed.`);

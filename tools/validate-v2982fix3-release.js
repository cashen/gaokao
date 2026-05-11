#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(p){ return fs.readFileSync(path.join(root,p),'utf8'); }
function ok(name, cond){ if(!cond){ console.error('FAIL:', name); process.exitCode=1; } else console.log('OK:', name); }
const index = read('fenxi/index.html');
const version = read('fenxi/VERSION.txt');
const rt = read('fenxi/assets/child-interest-runtime.v298fix1.js');
const ui = read('fenxi/assets/child-interest-ui.v298fix1.js');
const intent = read('fenxi/assets/child-intent-ui.v2981.js');
const app = read('fenxi/assets/app.v2982.js');
const css = read('fenxi/assets/app.v2982.css');
const hit = read('fenxi/assets/interest-hit-summary.v298.js');
ok('VERSION is fix3', version.includes('V2.9.8.2.fix3'));
ok('index cache bust is fix3', index.includes("const VERSION='2982fix3-20260511'"));
ok('stylesheet cache bust is fix3', index.includes('app.v2982.css?v=2982fix3-20260511'));
ok('app body class includes v2982fix3', app.includes('v2982fix3'));
ok('app runtime version fix3', app.includes("version:'V2.9.8.2.fix3'"));
ok('runtime exposes drawerIsChildInterest', rt.includes('drawerIsChildInterest'));
ok('runtime exposes flushPendingRefresh', rt.includes('flushPendingRefresh'));
ok('runtime marks pending while drawer is open', rt.includes('markPending(reason'));
ok('runtime does not render full drawer body in refreshLight', /renderDrawerSelectionOnly\?\.\(\)/.test(rt));
ok('runtime start returns true', /function start\(\).*return true;\}/s.test(rt));
ok('ui has renderDrawerSelectionOnly', ui.includes('function renderDrawerSelectionOnly'));
ok('ui group card does not call countFor live', !/countFor\?\.\(g\.id\)/.test(ui));
ok('ui says close drawer will refresh', ui.includes('关闭抽屉后再统一刷新'));
ok('child intent refresh is lightweight in drawer', intent.includes('markPendingRefresh') && intent.includes('renderDrawerSelectionOnly'));
ok('interest hit summary writes cache', hit.includes('__LN_INTEREST_HIT_CACHE_V298'));
ok('no CSS.escape in detail lite UI', !read('fenxi/assets/detail-card-lite-ui.v2981fix1.js').includes('CSS.escape') && !read('fenxi/assets/detail-card-lite-ui.v2981fix2.js').includes('CSS.escape'));
ok('fix3 CSS keeps old modules hidden', css.includes('body.v2982fix3 #profileAsk') && css.includes('body.v2982fix3 #mentorRules'));
ok('zip top-level expectation files exist', fs.existsSync(path.join(root,'functions')) && fs.existsSync(path.join(root,'docs')) && fs.existsSync(path.join(root,'tools')));
if(process.exitCode){ process.exit(process.exitCode); }
console.log('All V2.9.8.2.fix3 checks passed.');

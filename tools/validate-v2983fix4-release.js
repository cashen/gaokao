const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
function read(p){return fs.readFileSync(path.join(root,p),'utf8');}
function ok(name,cond){if(!cond){console.error('FAIL:',name);process.exitCode=1;}else console.log('OK:',name);}
const index=read('fenxi/index.html');
const version=read('fenxi/VERSION.txt');
ok('VERSION is fix4',/V2\.9\.8\.3\.fix4/.test(version));
ok('index title is fix4',/V2\.9\.8\.3\.fix4/.test(index));
ok('cache bust fix4',/2983fix4-20260511/.test(index));
ok('loads interest drawer slim patch',/interest-drawer-slim\.v2983fix4\.js/.test(index));
ok('fix4 patch file exists',fs.existsSync(path.join(root,'fenxi/assets/interest-drawer-slim.v2983fix4.js')));
const slim=read('fenxi/assets/interest-drawer-slim.v2983fix4.js');
ok('slim drawer overrides runtime toggleGroup',/r\.toggleGroup=toggleGroupLite/.test(slim));
ok('slim drawer overrides UI renderDrawerBody',/u\.renderDrawerBody=renderDrawerBody/.test(slim));
ok('intent capture prevents old heavy bind',/data-child-intent-id/.test(slim)&&/stopImmediatePropagation/.test(slim));
ok('hit summary aggregate skipped inline',/interestAggregatePolicy/.test(slim)&&/skip-inline/.test(slim));
ok('debug captures drawer open breakdown',/interestDrawerOpenBreakdown/.test(slim));
ok('debug captures intent toggle breakdown',/interestIntentToggleBreakdown/.test(slim));
ok('debug version fix4',/2983fix4-20260511/.test(read('fenxi/assets/debug-runtime.v2983.js')));
ok('app class fix4',/v2983fix4/.test(read('fenxi/assets/app.v2983.js')));
ok('debug page fix4',/V2\.9\.8\.3\.fix4/.test(read('fenxi/debug.html')));
if(process.exitCode){process.exit(1);}else console.log('All V2.9.8.3.fix4 checks passed.');

const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
function read(p){return fs.readFileSync(path.join(root,p),'utf8');}
function exists(p){return fs.existsSync(path.join(root,p));}
const checks=[];
function check(name, ok){checks.push({name,ok:!!ok}); if(!ok) console.error('FAIL:',name);}
const idx=read('fenxi/index.html');
const ver=read('fenxi/VERSION.txt');
check('VERSION is v2983', /V2\.9\.8\.3/.test(ver));
check('index visible title is v2983', /V2\.9\.8\.3/.test(idx));
check('cache bust is 2983', /2983-20260511/.test(idx));
check('debug page exists', exists('fenxi/debug.html'));
check('debug runtime loaded', idx.includes('assets/debug-runtime.v2983.js'));
check('compute pipeline loaded before app', idx.indexOf('assets/compute-pipeline.v2983.js') < idx.indexOf('assets/app.v2981.js'));
check('app v2983 loaded', idx.includes('assets/app.v2983.js'));
check('old app fix1 not loaded', !idx.includes('assets/app.v2981fix1.js'));
check('old app fix2 not loaded', !idx.includes('assets/app.v2981fix2.js'));
check('old app v2982 not loaded', !idx.includes('assets/app.v2982.js'));
check('app v2983 css loaded', idx.includes('assets/app.v2983.css'));
const pipe=read('fenxi/assets/compute-pipeline.v2983.js');
check('compute pipeline patches applyFilters', /window\.applyFilters=applyFiltersV2983/.test(pipe));
check('compute pipeline has basePool', /basePool/.test(pipe) && /buildBasePool/.test(pipe));
check('compute pipeline has profile cache', /profileCache/.test(pipe));
check('debug report copy page has localStorage key', read('fenxi/debug.html').includes('ln_v2983_debug_report'));
const app=read('fenxi/assets/app.v2983.js');
check('app v2983 marks body', /v2983/.test(app));
check('student profile change render-only', read('fenxi/assets/student-profile-ui.v2981.js').includes("level:'render-only'"));
check('profileAsk hidden in v2983 css', read('fenxi/assets/app.v2983.css').includes('#profileAsk'));
const ok=checks.every(x=>x.ok);
if(!ok){process.exit(1);}console.log(`All ${checks.length} V2.9.8.3 checks passed.`);

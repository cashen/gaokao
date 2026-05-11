const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(p){return fs.readFileSync(path.join(root,p),'utf8');}
function exists(p){return fs.existsSync(path.join(root,p));}
const checks=[];
function check(name, ok){checks.push([name, !!ok]); if(!ok){console.error('FAIL:', name); process.exitCode=1;}}
const version=read('fenxi/VERSION.txt');
const index=read('fenxi/index.html');
const diag=read('fenxi/diagnostics.html');
check('VERSION is V2.9.8.2', /V2\.9\.8\.2/.test(version));
check('index visible title is V2.9.8.2', /V2\.9\.8\.2/.test(index));
check('diagnostics visible title is V2.9.8.2', /V2\.9\.8\.2/.test(diag));
check('decision context model exists', exists('fenxi/assets/decision-context-model.v2982.js'));
check('legacy preference adapter exists', exists('fenxi/assets/legacy-preference-adapter.v2982.js'));
check('advisor diagnosis engine exists', exists('fenxi/assets/advisor-diagnosis-engine.v2982.js'));
check('interaction stability exists', exists('fenxi/assets/interaction-stability.v2982.js'));
check('app v2982 exists', exists('fenxi/assets/app.v2982.js'));
check('app v2982 css exists', exists('fenxi/assets/app.v2982.css'));
check('index loads v2982 scripts', /decision-context-model\.v2982\.js/.test(index) && /legacy-preference-adapter\.v2982\.js/.test(index) && /app\.v2982\.js/.test(index));
check('diagnostics loads v2982 scripts', /decision-context-model\.v2982\.js/.test(diag) && /app\.v2982\.js/.test(diag));
check('family baseline next targets childInterest', /data-scroll-target="childInterest">下一步：补充孩子画像与兴趣/.test(index));
check('profileAsk buttons no longer used as next target', !/data-scroll-target="profileAsk"/.test(index));
const css=read('fenxi/assets/app.v2982.css');
check('legacy profileAsk hidden in v2982 css', /#profileAsk/.test(css) && /display:none!important/.test(css));
check('mentorRules hidden in v2982 css', /#mentorRules/.test(css) && /display:none!important/.test(css));
check('large bands hidden in v2982 css', /#resultBox \.bands/.test(css));
const adapter=read('fenxi/assets/legacy-preference-adapter.v2982.js');
check('adapter maps old groups from unified context', /getGroup:group/.test(adapter) && /medical_health/.test(adapter) && /gridPower/.test(adapter));
check('adapter patches state snapshot', /patchStateSnapshot/.test(adapter) && /decisionContext/.test(adapter));
check('adapter syncs legacy DOM from context', /syncLegacyDom/.test(adapter));
const inter=read('fenxi/assets/interaction-stability.v2982.js');
check('child-interest direct binding present', /child-interest-start/.test(inter) && /openInterest/.test(inter));
check('student profile direct binding present', /open-student-profile/.test(inter) && /openProfile/.test(inter));
check('drawer type guard present', /__LN_ACTIVE_DRAWER_TYPE/.test(inter));
check('detail expand does not depend on CSS.escape', !/CSS\.escape/.test(inter) && /data-lite-panel/.test(inter));
const advisor=read('fenxi/assets/advisor-diagnosis-engine.v2982.js');
check('advisor uses unified decision context', /LN_DECISION_CONTEXT_V2982/.test(advisor));
const middleware=read('functions/_middleware.js');
check('middleware protects fenxi data', /\/fenxi\/data/.test(middleware));
check('middleware protects root data', /\/data/.test(middleware));
if(process.exitCode){console.error('\nValidation failed.'); process.exit(process.exitCode);} else {console.log(`All ${checks.length} V2.9.8.2 checks passed.`);} 

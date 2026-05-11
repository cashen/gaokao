const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(p){ return fs.readFileSync(path.join(root,p),'utf8'); }
function exists(p){ return fs.existsSync(path.join(root,p)); }
const checks=[];
function ok(name, cond){ checks.push([name, !!cond]); }

const version = read('fenxi/VERSION.txt');
const index = read('fenxi/index.html');
const app = read('fenxi/assets/app.v2982.js');
const profile = read('fenxi/assets/profile-interest-summary.v2981fix2.js');
const detail = read('fenxi/assets/detail-card-lite-ui.v2981fix2.js');
const inter = read('fenxi/assets/interaction-stability.v2982.js');
const css = read('fenxi/assets/app.v2982.css');

ok('VERSION is V2.9.8.2.fix1', version.includes('V2.9.8.2.fix1'));
ok('index visible title mentions fix1', index.includes('V2.9.8.2.fix1'));
ok('app marks fix1 version', app.includes("version:'V2.9.8.2.fix1'"));
ok('app has no active MutationObserver constructor', !/new\s+MutationObserver/.test(app));
ok('app declares noGlobalMutationObserver', app.includes('noGlobalMutationObserver:true'));
ok('app has render re-entry lock', app.includes('let rendering=false') && app.includes('if(rendering) return false'));
ok('profile summary avoids unconditional innerHTML', profile.includes('dataset.lastProfileInterestHtml') && profile.includes('if(box.dataset.lastProfileInterestHtml!==html)'));
ok('profile summary directly binds open profile', profile.includes('boundDirectFix1') && profile.includes('open-student-profile'));
ok('profile summary directly binds open interest', profile.includes('child-interest-start') && profile.includes('LN_CHILD_INTEREST_RUNTIME_V296?.start'));
ok('detail expander no CSS.escape dependency', !detail.includes('CSS.escape'));
ok('detail expander stops event propagation', detail.includes('e.preventDefault(); e.stopPropagation();'));
ok('interaction exposes openInterest/openProfile', inter.includes('openInterest') && inter.includes('openProfile') && inter.includes('LN_INTERACTION_STABILITY_V2982={patch,openInterest,openProfile'));
ok('css keeps old profileAsk hidden for fix1', css.includes('body.v2982fix1 #profileAsk'));
ok('css keeps mentorRules hidden for fix1', css.includes('body.v2982fix1 #mentorRules'));
ok('css keeps bands hidden for fix1', css.includes('body.v2982fix1 #resultBox .bands'));
ok('middleware exists', exists('functions/_middleware.js'));
ok('doc exists', exists('docs/V2.9.8.2.fix1_交互冻结与重绘循环修正版说明.md'));

const failed = checks.filter(([,v])=>!v);
if(failed.length){
  console.error('FAILED CHECKS:');
  failed.forEach(([n])=>console.error(' - '+n));
  process.exit(1);
}
console.log(`All ${checks.length} V2.9.8.2.fix1 checks passed.`);

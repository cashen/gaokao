
const fs = require('fs');
const path = require('path');
function assert(cond,msg){ if(!cond){ console.error('FAIL:',msg); process.exit(1); } }
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root,'index.html'),'utf8');
const rules = fs.readFileSync(path.join(root,'assets','rules.v2952.js'),'utf8');
const app = fs.readFileSync(path.join(root,'assets','app.v2952.js'),'utf8');
assert(html.includes('app.v2952.css'), 'index should load app.v2952.css');
assert(html.includes('rules.v2952.js'), 'index should load rules.v2952.js');
assert(html.includes('app.v2952.js'), 'index should load app.v2952.js');
const baseStart = html.indexOf('id="baseInfo"');
const familyStart = html.indexOf('id="familyBaseline"');
const baseBlock = html.slice(baseStart, familyStart);
assert(!baseBlock.includes('id="priority"'), 'priority select should not be in baseInfo');
assert(html.includes('targetPathPanelV2952'), 'target path panel should exist');
assert(rules.includes('window.LN_GAOKAO_RULES_V2952'), 'rules should export V2952');
assert(rules.includes('preferenceRules'), 'preferenceRules should exist');
assert(rules.includes('scenarioPresets'), 'scenarioPresets should exist');
assert(app.includes('renderPreferenceSelectV2952'), 'app should render preference select');
assert(app.includes('setPreferenceValueV2952'), 'app should protect manual preference');
assert(!app.includes('deprecatedRenderPlanABC_V2950'), 'deprecated renderPlanABC should be removed');
const assets = fs.readdirSync(path.join(root,'assets'));
const oldApps = assets.filter(f => /^app\.v(294|2950|2951)/.test(f));
assert(oldApps.length===0, 'production package should not contain old app entry files: '+oldApps.join(','));
console.log('V2.9.5.2 release validation passed');

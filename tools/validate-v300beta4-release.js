const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(p){ return fs.readFileSync(path.join(root,p),'utf8'); }
function exists(p){ return fs.existsSync(path.join(root,p)); }
function assert(cond,msg){ if(!cond){ console.error('FAIL:',msg); process.exitCode=1; } }
const idx = read('fenxi/v3/index.html');
const dbg = read('fenxi/v3/debug.html');
const ver = read('fenxi/v3/assets/js/version.v3.js');
const self = read('fenxi/v3/assets/js/debug/debug-selftest.v3.js');
const wizard = read('fenxi/v3/assets/js/wizard-shell.v3.js');
const css = read('fenxi/v3/assets/css/shell.v3.css');
assert(idx.includes('v300beta4-20260512'), 'index cache stamp should be beta4');
assert(dbg.includes('v300beta4-20260512'), 'debug cache stamp should be beta4');
assert(ver.includes('V3.0.0.beta4｜家长端体验收口与移动端可用性增强版'), 'version name beta4');
assert(ver.includes("stamp: 'v300beta4-20260512'"), 'version stamp beta4');
assert(idx.includes('page-experience-adapter.v3.js'), 'index loads page experience adapter');
assert(dbg.includes('page-experience-adapter.v3.js'), 'debug loads page experience adapter');
assert(exists('fenxi/v3/assets/js/adapters/page-experience-adapter.v3.js'), 'page experience adapter exists');
assert(wizard.includes('applyPageExperience(root, state)'), 'wizard applies page experience');
assert(wizard.includes('review-checklist-details'), 'review checklist is collapsible');
assert(wizard.includes('getExperienceSnapshot'), 'wizard exposes experience snapshot');
assert(css.includes('step-focus-note'), 'css contains step focus note');
assert(css.includes('v3-actions-enhanced'), 'css contains enhanced actions');
assert(css.includes('position: sticky'), 'css contains sticky action behavior');
assert(self.includes('V3.0.0.beta4'), 'debug selftest expects beta4');
assert(self.includes('页面体验适配器存在'), 'debug tests page experience adapter');
assert(self.includes('真实页面结构检查已纳入总检'), 'mainflow tests page structure');
assert(exists('fenxi/v3/docs/V3_beta4_家长端体验收口与移动端可用性增强说明.md'), 'beta4 docs exist');
if (process.exitCode) process.exit(process.exitCode);
console.log('All V3.0.0.beta4 checks passed.');

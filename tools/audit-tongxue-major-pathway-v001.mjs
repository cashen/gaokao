import assert from 'node:assert/strict';
import fs from 'node:fs';

// Contract revision v0.02: the public result-view module is a compatibility/decorator
// entry; major pathway rendering and source-attribution behavior stay owned by core.
const read = file => fs.readFileSync(file, 'utf8');
const plan = read('docs/plans/tongxue-major-pathway-v001.md');
const presenter = read('shared/resources/majors/undergrad-graduate-pathway-view.v001.js');
const resultViewEntry = read('tongxue/app/tongxue-runtime-result-view-v159.js');
const resultViewCore = read('tongxue/app/tongxue-runtime-result-view-core-v159.js');
const controller = read('tongxue/app/tongxue-runtime-controller-v159.js');
const index = read('tongxue/index.html');
const navigation = read('shared/resources/majors/major-path-navigation.v004.js');
const majorPathApp = read('major-path/app.v004.js');

assert.match(plan, /必要归属、最小呈现/);
assert.match(plan, /主结果区不再显示/);
assert.match(presenter, /undergrad-graduate-pathway\.v001\.js/);
assert.match(presenter, /graduate-catalog-2022\.v001\.js/);
assert.match(presenter, /major-path-navigation\.v004\.js/);
assert.doesNotMatch(presenter, /CLASS_RULES|MAJOR_RULES/, 'Tongxue presenter must not copy the pathway mapping owner');
assert.doesNotMatch(presenter, /\\`|\\\$\{/, 'shared presenter must contain valid JavaScript template syntax');
assert.match(presenter, /UNDERGRAD_GRADUATE_PATHWAY_VIEW_META/);
assert.match(presenter, /GRADUATE_CATALOG_SOURCES/);
const graduateCatalog = read('shared/resources/graduate/graduate-catalog-2022.v001.js');
assert.match(graduateCatalog, /https:\/\/www\.moe\.gov\.cn/);

assert.match(resultViewEntry, /createBaseResultView/,'Tongxue result-view compatibility entry must retain the base-owner bridge');
assert.match(resultViewCore, /buildUndergradGraduatePathwayView/);
assert.match(resultViewCore, /data-major-source-footer-note/);
assert.match(resultViewCore, /footerNote\.hidden = false/);
assert.match(resultViewCore, /专业解读来源：eo\.srgaoxiao\.cn/);
const mainTargetStart = resultViewCore.indexOf('target.innerHTML = `<div class="section-heading">先看懂这个专业</div>');
const mainTargetEnd = resultViewCore.indexOf('\n      })', mainTargetStart);
assert.ok(mainTargetStart >= 0 && mainTargetEnd > mainTargetStart, 'major source render target must remain bounded');
const mainTarget = resultViewCore.slice(mainTargetStart, mainTargetEnd);
assert.doesNotMatch(mainTarget, /eo\.srgaoxiao\.cn|抓取日期|sourceLink/, 'source attribution must not render in the main result block');

assert.match(index, /tongxue-runtime-result-view-v159\.js\?v=159-flow006/);
assert.match(index, /data-major-source-footer-note/);
const footerStart = index.indexOf('<footer');
const footerEnd = index.indexOf('</footer>', footerStart);
assert.ok(footerStart >= 0 && footerEnd > footerStart, 'Tongxue footer must exist');
const footer = index.slice(footerStart, footerEnd);
assert.match(footer, /data-major-source-footer-note/);
assert.match(footer, /hidden/);

assert.match(controller, /data-major-source-footer-note/);
assert.match(controller, /sourceNote\.hidden = true/);
assert.match(navigation, /allowedReturnPath/);
assert.match(navigation, /['"]\/tongxue\/['"]/);
assert.match(navigation, /fromTongxue/);
assert.match(majorPathApp, /sourceContext\.fromTongxue/);

console.log(JSON.stringify({
  ok: true,
  contract: 'tongxue-major-pathway-v001',
  verifierRevision: 'v0.02',
  dataOwner: 'undergrad-graduate-pathway-v001',
  resultViewOwner: 'tongxue-runtime-result-view-core-v159',
  sourceAttribution: 'footer-only-on-major-profile-success',
  mainResultSourceBlock: false,
  schoolScopeClearsFooter: true
}, null, 2));

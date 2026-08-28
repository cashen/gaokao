import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const frontend = read('ln-rank/js/feature/school-majors/school-all-mode.v3962_1.js');
const css = read('ln-rank/css/school-all-mode.v3962_1.css');
const semantic = read('shared/ui/tokens/semantic.v3959_0.css');
const actionContract = read('shared/ui/contracts/action-contract.v3959_0.js');
const index = read('ln-rank/index.html');
const app = read('ln-rank/js/app.v3961_0.js');

assert.ok(frontend.includes('UI_ACTION_COPY'), 'school UI copy must come from the shared action contract');
for (const key of ['addSelectedMajor', 'removeSelectedMajor', 'inspectDetails', 'publicReviews', 'retry']) {
  assert.ok(actionContract.includes(`${key}:Object.freeze`), `shared action contract missing ${key}`);
}
for (const exact of ["label:'加入已选'", "label:'移出已选'", "label:'查看详情'", "expandedLabel:'收起详情'"]) {
  assert.ok(actionContract.includes(exact), `shared action copy missing ${exact}`);
}

for (const sharedClass of ['ui-button ui-button--compact', 'ui-chip ui-chip--compact', 'ui-card school-major-row', 'ui-state ui-state--loading']) {
  assert.ok(frontend.includes(sharedClass), `school UI must use shared component ${sharedClass}`);
}
assert.ok(semantic.includes('.ui-button--compact'), 'shared semantic tokens must own compact actions');
assert.ok(semantic.includes('.ui-chip--compact'), 'shared semantic tokens must own compact chips');
assert.ok(semantic.includes('@media(pointer:coarse)'), 'shared compact actions must restore touch height for coarse pointers');

for (const forbidden of [
  '加入已选专业',
  '已加入，点击移除',
  '<details>',
  '<summary>',
  'min-width: min(620px',
  'school-major-actions details',
  '@media (max-width: 1180px)',
  '@media (max-width: 767px)',
  '@media (max-width: 390px)'
]) {
  assert.ok(!frontend.includes(forbidden) && !css.includes(forbidden), `ungoverned school UI pattern: ${forbidden}`);
}

assert.ok(frontend.includes('data-school-detail-toggle'), 'details must use a governed toggle button');
assert.ok(frontend.includes('aria-expanded'), 'detail toggle must expose expanded state');
assert.ok(frontend.includes('aria-controls'), 'detail toggle must point to the full-row panel');
assert.ok(frontend.includes('expandedRecordKey'), 'one shared detail state owner is required');
assert.ok(frontend.includes('<section id="${detailId}" class="school-major-detail"'), 'detail panel must be a direct card section');
const actionsIndex = frontend.indexOf('<div class="school-major-actions">');
const detailIndex = frontend.indexOf('<section id="${detailId}" class="school-major-detail"');
assert.ok(actionsIndex >= 0 && detailIndex > actionsIndex, 'full-row detail must follow the action region');
const actionCloseIndex = frontend.indexOf('</div>\n      <section id="${detailId}" class="school-major-detail"', actionsIndex);
assert.ok(actionCloseIndex > actionsIndex, 'detail panel must not remain nested in the action column');

for (const marker of [
  'container-name: school-mode',
  'container-type: inline-size',
  'container-name: school-results',
  '@container school-results (max-width: 1040px)',
  '@container school-results (max-width: 600px)',
  '@container school-results (max-width: 260px)'
]) assert.ok(css.includes(marker), `container-responsive contract missing ${marker}`);
assert.ok(!/@media\s*\(\s*max-width/i.test(css), 'school layout may not regress to device-width breakpoints');

const visualProperties = /(?:^|[;\s])(min-height|padding|border(?:-radius)?|background|color|font(?:-size|-weight)?|box-shadow)\s*:/i;
for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  const selector = match[1].trim();
  const body = match[2];
  const localActionSelector = /school-(?:major-actions|view-mode__buttons|candidate-list)[^{}]*(?:\.ui-button|button|summary)/.test(selector);
  if (localActionSelector) {
    assert.ok(!visualProperties.test(body), `local action styling escaped shared UI ownership: ${selector}`);
  }
}
assert.ok(!css.includes('.school-major-tags span'), 'school chips may not define a second visual system');

assert.ok(index.includes('/shared/ui/tokens/semantic.v3959_0.css?v=3962_1'), 'page must load governed shared semantic assets');
assert.ok(index.includes('/ln-rank/css/school-all-mode.v3962_1.css?v=3962_1'), 'page must load governed school CSS');
assert.ok(app.includes('school-all-mode.v3962_1.js?v=3962_1'), 'app must load governed school runtime');
assert.ok(!index.includes('school-all-mode.v3962_0.css?v=3962_0'), 'old school CSS must not stay active');
assert.ok(!app.includes('school-all-mode.v3962_0.js?v=3962_0'), 'old school runtime must not stay active');

console.log(JSON.stringify({
  ok: true,
  contract: 'school-ui-governance-v3962_1',
  sharedActionCopy: true,
  sharedButtonAndChipSystem: true,
  fullRowDetails: true,
  containerResponsive: true,
  deviceBreakpointDuplication: false
}));

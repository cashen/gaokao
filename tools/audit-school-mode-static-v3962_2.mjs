import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const page = read('ln-rank/index.html');
const runtime = read('ln-rank/js/feature/school-majors/school-all-mode.v3962_2.js');
const resultCss = read('ln-rank/css/school-all-mode.v3962_2.css');
const modeCss = read('shared/ui/components/mode-switch.v3962_2.css');
const semantic = read('shared/ui/tokens/semantic.v3959_0.css');
const actions = read('shared/ui/contracts/action-contract.v3959_0.js');
const registry = read('shared/ui/ui-registry.v3961_0.js');
const app = read('ln-rank/js/app.v3961_0.js');
const releaseContract = read('functions/_lib/release-contract.js');

for (const id of ['schoolViewModeMount','schoolResolveStatus','schoolAllResultsPanel','schoolAllTitle','schoolAllMeta','schoolAllContent','schoolAllSort','schoolAllBack']) {
  assert.ok(page.includes(`id="${id}"`), `static selection structure missing ${id}`);
  assert.ok(runtime.includes(`'${id}'`), `runtime does not consume static ${id}`);
}

const filterStart = page.indexOf('<div class="search-grid-top ln-filter-panel__secondary">');
const modeIndex = page.indexOf('id="schoolViewModeMount"');
const filterEnd = page.indexOf('</div>', modeIndex);
assert.ok(filterStart >= 0 && modeIndex > filterStart && filterEnd > modeIndex, 'school mode switch must live inside the shared filter grid');
assert.ok(page.includes('class="ui-mode-switch"'), 'static mode switch must use shared UI component');
assert.ok(page.includes('class="ui-segmented ui-mode-switch__actions"'), 'static mode switch must use shared segmented control');

for (const forbidden of ['injectStylesheet','ensureModeMount','ensureWorkspace','document.createElement','insertAdjacentElement','insertAdjacentHTML','appendChild(link)']) {
  assert.ok(!runtime.includes(forbidden), `runtime layout injection forbidden: ${forbidden}`);
}
assert.ok(runtime.includes("mountPolicy: 'static-shared-ui'"), 'runtime must declare static mount policy');
assert.ok(runtime.includes('assertStaticStructure'), 'runtime must fail when the unified mount is absent');
assert.ok(runtime.includes('filterGrid?.contains(mount)'), 'runtime must verify the shared filter owner');

for (const marker of ['.ui-mode-switch{','grid-column:1 / -1','writing-mode:horizontal-tb','container-name:ui-mode-switch','@container ui-mode-switch (max-width:280px)']) {
  assert.ok(modeCss.includes(marker), `shared mode component missing ${marker}`);
}
for (const marker of ['.ui-segmented{','.ui-segmented>.ui-button','writing-mode:horizontal-tb']) {
  assert.ok(semantic.includes(marker), `shared segmented component missing ${marker}`);
}
for (const key of ['viewScoreNearby:Object.freeze','viewSchoolAllMajors:Object.freeze']) {
  assert.ok(actions.includes(key), `shared action contract missing ${key}`);
}
assert.ok(registry.includes("modeSwitch: '/shared/ui/components/mode-switch.v3962_2.css'"), 'UI registry must own the mode switch resource');
assert.ok(registry.includes("schoolModeMountOwner: 'static-selection-filter-grid'"), 'workspace contract must own the static mount');
assert.ok(registry.includes("schoolModeControlOwner: 'shared-ui-mode-switch'"), 'workspace contract must own shared mode control');

assert.ok(!resultCss.includes('.school-view-mode'), 'school result CSS may not own filter controls');
assert.ok(!resultCss.includes('.ui-mode-switch'), 'school result CSS may not restyle shared mode controls');
assert.ok(app.includes('school-all-mode.v3962_2.js?v=3962_2'), 'app must activate the unified runtime');
assert.ok(page.includes('mode-switch.v3962_2.css?v=3962_2'), 'page must load shared mode component');
assert.ok(page.includes('school-all-mode.v3962_2.css?v=3962_2'), 'page must load current school result CSS');
assert.ok(!app.includes('school-all-mode.v3962_1.js?v=3962_1'), 'old runtime must be inactive');
assert.ok(!page.includes('school-all-mode.v3962_1.css?v=3962_1'), 'old result CSS must be inactive');

assert.ok(releaseContract.includes('LN_RANK_RELEASE_CONTRACT'), 'release contract must retain LN_RANK_RELEASE_CONTRACT');
assert.ok(releaseContract.includes('RELEASE_CONTRACT'), 'release contract must retain RELEASE_CONTRACT');

console.log(JSON.stringify({
  ok: true,
  contract: 'school-mode-static-shared-ui-v3962_2',
  staticFilterMount: true,
  staticResultMount: true,
  runtimeLayoutInjection: false,
  sharedModeSwitch: true,
  sharedActionCopy: true
}));

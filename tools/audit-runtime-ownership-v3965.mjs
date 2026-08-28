import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const json = file => JSON.parse(read(file));
const moduleUrl = file => `${pathToFileURL(path.join(root, file)).href}?audit=v3965_0`;

const home = read('index.html');
const homeRuntime = read('ln-rank/js/ux/family-home.v3965_0.js');
const shellRuntime = read('shared/ui/shell/family-shell.v3965_0.js');
const main = read('ln-rank/index.html');
const selection = read('ln-rank/selection-pool.html');
const localBackground = read('ln-rank/local-mainline.html');
const nationalBackground = read('ln-rank/211-mainline.html');
const difficulty = read('ln2026.html');
const difficultyEntry = read('ln-rank/js/major-difficulty-2026.v3965_0.js');
const structureRoot = read('zy2026.html');
const structureIndex = read('zy2026/index.html');
const structureEntry = read('zy2026/assets/zy2026.v3965_0.js');
const tongxue = read('tongxue/index.html');
const tongxueChangelog = read('tongxue/changelog.html');
const orchestrator = read('ln-rank/js/workspace/selection-workspace-orchestrator.v3965_0.js');
const feishuState = read('ln-rank/js/feature/feishu/report-state.v3965_0.js');
const feishuRender = read('ln-rank/js/feature/feishu/report-render.v3965_0.js');
const feishuController = read('ln-rank/js/feature/feishu/report-controller.v3965_0.js');
const tongxueEntry = read('tongxue/app/tongxue-runtime-v159.js');
const tongxueController = read('tongxue/app/tongxue-runtime-controller-v159.js');
const tongxueSearchView = read('tongxue/app/tongxue-runtime-search-view-v159.js');
const tongxueResultView = read('tongxue/app/tongxue-runtime-result-view-v159.js');
const releaseContract = read('functions/_lib/release-contract.js');
const headers = read('_headers');
const active = json('ln-rank/active-assets.json');
const meta = json('ln-rank/release-meta.json');
const { CURRENT_RELEASE } = await import(moduleUrl('shared/resources/release/current-release.js'));
const { summaryGroups } = await import(moduleUrl('tongxue/app/tongxue-runtime-utils-v159.js'));

assert.equal(CURRENT_RELEASE.display, 'v3.9.65.0');
assert.equal(CURRENT_RELEASE.assetVersion, 'v3965_0');
assert.equal(CURRENT_RELEASE.uiOrchestrationVersion, 'ui-orchestration-v3965_0');
assert.equal(CURRENT_RELEASE.selectionWorkspaceVersion, 'selection-workspace-orchestration-v3965_0');
assert.equal(CURRENT_RELEASE.runtimeCacheVersion, 'runtime-cache-coherence-v3965_0');
assert.equal(CURRENT_RELEASE.reportFrontendVersion, 'feishu-browser-v3965_0');
assert.equal(CURRENT_RELEASE.tongxueRuntimeVersion, 'tongxue-runtime-v159');
assert.equal(CURRENT_RELEASE.resourceOwners.searchIntentState, '/ln-rank/js/workspace/selection-workspace-orchestrator.v3965_0.js');
assert.equal(active.version, CURRENT_RELEASE.display);
assert.equal(meta.version, CURRENT_RELEASE.display);
assert.equal(active.assetVersion, CURRENT_RELEASE.assetVersion);

const activePages = new Map([
  ['index.html', home],
  ['ln-rank/index.html', main],
  ['ln-rank/selection-pool.html', selection],
  ['ln-rank/local-mainline.html', localBackground],
  ['ln-rank/211-mainline.html', nationalBackground],
  ['ln2026.html', difficulty],
  ['zy2026.html', structureRoot],
  ['zy2026/index.html', structureIndex],
  ['tongxue/index.html', tongxue],
  ['tongxue/changelog.html', tongxueChangelog]
]);
for (const [file, source] of activePages) {
  assert.ok(source.includes('data-release="v3.9.65.0"'), `${file} must declare the current release`);
  assert.ok(!source.includes('release-presenter.v3964_1.js'), `${file} still activates the old release presenter`);
  assert.ok(!source.includes('<span data-current-release>v3.9.64.1</span>'), `${file} still displays the old full-site release`);
}

assert.ok(home.includes('/ln-rank/js/ux/family-home.v3965_0.js?v=3965_0'));
assert.ok(home.includes('/shared/ui/shell/family-shell.v3965_0.css?v=3965_0'));
assert.ok(home.includes('/shared/ui/shell/family-shell.v3965_0.js?v=3965_0'));
assert.ok(home.includes('<span data-current-release>v3.9.65.0</span>'));
assert.ok(!home.includes('family-shell.v3964_'));
assert.ok(!home.includes('family-home.v3955_0.js'));
assert.ok(!home.includes("const t=new Date('2027-06-07T09:00:00+08:00')"));
assert.ok(homeRuntime.includes("HOME_RUNTIME_VERSION = 'family-home-runtime-v3965_0'"));
assert.ok(homeRuntime.includes('mountCurrentRelease'));
assert.ok(homeRuntime.includes('countdownOwner: HOME_RUNTIME_VERSION'));
assert.ok(shellRuntime.includes('/shared/ui/shell/family-shell.v3965_0.css?v=3965_0'));
assert.equal(active.familyHomeJs, 'js/ux/family-home.v3965_0.js');
assert.equal(active.sharedUiShellCss, '../shared/ui/shell/family-shell.v3965_0.css');
assert.ok(active.jsEntry.includes('js/ux/family-home.v3965_0.js'));
assert.ok(!active.jsEntry.includes('js/ux/family-home.v3955_0.js'));
assert.ok(active.cssEntry.includes('../shared/ui/shell/family-shell.v3965_0.css'));
assert.ok(!active.cssEntry.includes('../shared/ui/shell/family-shell.v3964_0.css'));

assert.ok(main.includes('/ln-rank/js/app.v3965_0.js?v=3965_0'));
assert.ok(selection.includes('/ln-rank/js/selection-pool.v3965_0.js?v=3965_0'));
for (const source of [localBackground, nationalBackground]) {
  assert.ok(source.includes('/shared/resources/release/release-presenter.v3965_0.js?v=3965_0'));
  assert.ok(source.includes('/shared/ui/shell/family-shell.v3965_0.js?v=3965_0'));
  assert.ok(source.includes('<span data-current-release>v3.9.65.0</span>'));
}
assert.ok(difficulty.includes('/ln-rank/js/major-difficulty-2026.v3965_0.js?v=3965_0'));
assert.ok(difficultyEntry.includes('release-presenter.v3965_0.js?v=3965_0'));
assert.ok(difficultyEntry.includes('family-shell.v3965_0.js?v=3965_0'));
assert.ok(!difficultyEntry.includes('family-shell.v3964_1.js'));
for (const source of [structureRoot, structureIndex]) {
  assert.ok(source.includes('/zy2026/assets/zy2026.v3965_0.js?v=3965_0'));
  assert.ok(source.includes('<span data-current-release>v3.9.65.0</span>'));
}
assert.ok(structureEntry.includes('release-presenter.v3965_0.js?v=3965_0'));
assert.ok(structureEntry.includes('family-shell.v3965_0.js?v=3965_0'));
assert.ok(!structureEntry.includes('family-shell.v3964_1.js'));
assert.equal(active.majorDifficultyJs, 'js/major-difficulty-2026.v3965_0.js');
assert.equal(meta.majorDifficultyJs, 'js/major-difficulty-2026.v3965_0.js');
assert.equal(active.structure2026.js, '../zy2026/assets/zy2026.v3965_0.js');
assert.equal(meta.structure2026.js, '../zy2026/assets/zy2026.v3965_0.js');
for (const manifest of [active, meta]) {
  assert.ok(manifest.jsEntry.includes('js/major-difficulty-2026.v3965_0.js'));
  assert.ok(manifest.jsEntry.includes('../zy2026/assets/zy2026.v3965_0.js'));
  assert.ok(!manifest.jsEntry.includes('js/major-difficulty-2026.v3964_1.js'));
  assert.ok(!manifest.jsEntry.includes('../zy2026/assets/zy2026.v3964_1.js'));
}

assert.ok(tongxue.includes('tongxue-v159-single-runtime-owner-20260726'));
assert.ok(tongxue.includes('./app/tongxue-runtime-v159.js?v=159'));
assert.ok(tongxue.includes('同学你好 v1.5.9'));
assert.ok(tongxueEntry.includes('release-presenter.v3965_0.js?v=3965_0'));
assert.ok(tongxueChangelog.includes('/shared/resources/release/release-presenter.v3965_0.js?v=3965_0'));
assert.ok(tongxueChangelog.includes('当前全站发布：<span data-current-release>v3.9.65.0</span>'));
for (const legacy of [
  'tongxue-performance-v158.js',
  'tongxue-copy-v152.js',
  'tongxue-region-ui-v152.js',
  'tongxue-school-entity-ui-v152.js',
  'tongxue-direct-result-v156.js',
  'tongxue-direct-handoff-v155.js',
  'tongxue-school-portrait-v121.js',
  'tongxue-share-stabilizer-v113.js'
]) assert.ok(!tongxue.includes(legacy), `Tongxue active HTML still mounts ${legacy}`);

assert.ok(orchestrator.includes("feature/feishu/index.v3965_0.js?v=3965_0"));
assert.ok(!orchestrator.includes('feature/feishu/index.v3964_0.js'));
assert.ok(feishuController.includes('generationPromise'));
assert.ok(feishuController.includes('copyPromise'));
assert.ok(feishuController.includes('beginGeneration(state)'));
assert.ok(feishuController.includes('beginCopy(state)'));
assert.ok(feishuController.includes('failCopy(state, error)'));
assert.ok(feishuRender.includes('data-feishu-feedback'));
assert.ok(feishuState.includes("COPYING: 'copying'"));
for (const source of [feishuState, feishuRender, feishuController]) {
  assert.ok(!source.includes('event.currentTarget'), 'Feishu async state must not retain event.currentTarget');
  assert.ok(!source.includes('MutationObserver'), 'Feishu runtime must not observe report DOM');
}

assert.ok(tongxueEntry.includes('startTongxueRuntime'));
assert.ok(tongxueController.includes("owner: 'tongxue-runtime-controller-v159'"));
assert.ok(tongxueController.includes('observerCount: 0'));
assert.ok(tongxueController.includes("on(window, 'popstate'"));
assert.ok(tongxueController.includes('activeQueryPromise'));
assert.ok(tongxueController.includes('loadingMore'));
assert.ok(tongxueController.includes("resolution.status === 'region'"));
assert.ok(tongxueController.includes("params.set('entity', options.entityId)"));
assert.ok(tongxueController.includes('currentEntityId'));
assert.ok(tongxueController.includes('experienceKey(school, entityId, 1)'));
for (const source of [tongxueEntry, tongxueController, tongxueSearchView, tongxueResultView]) {
  assert.ok(!source.includes('MutationObserver'), 'Tongxue v159 must not contain MutationObserver');
  assert.ok(!source.includes('setInterval('), 'Tongxue v159 must not poll DOM state');
  assert.ok(!source.includes('setTimeout('), 'Tongxue v159 must not use delayed ownership fixes');
}
assert.ok(!tongxueSearchView.includes('addEventListener'));
assert.ok(!tongxueResultView.includes('addEventListener'));
assert.ok(!tongxueSearchView.includes('fetch('));
assert.ok(!tongxueResultView.includes('fetch('));
assert.equal((tongxueController.match(/function bindEvents/g) || []).length, 1);
assert.equal((tongxueController.match(/ui\.result, 'click'/g) || []).length, 1);
assert.equal((tongxueController.match(/ui\.button, 'click'/g) || []).length, 1);

const groupedSummary = summaryGroups('整体体验稳定。宿舍条件需要结合校区核对。课程管理较严格。就业机会较多。不过专业资源存在差异。');
const groupedByKey = new Map(groupedSummary.map(group => [group.key, group.items]));
assert.ok(groupedByKey.get('overall')?.length);
assert.ok(groupedByKey.get('life')?.length);
assert.ok(groupedByKey.get('study')?.length);
assert.ok(groupedByKey.get('career')?.length);
assert.ok(groupedByKey.get('attention')?.length);
assert.equal(groupedSummary.reduce((count, group) => count + group.items.length, 0), 5);

assert.ok(releaseContract.includes('export const LN_RANK_RELEASE_CONTRACT'));
assert.ok(releaseContract.includes('export const RELEASE_CONTRACT = LN_RANK_RELEASE_CONTRACT'));
for (const flag of [
  'feishuOperationSingleOwnerContract',
  'feishuCopyStateRecoveryContract',
  'feishuRepeatedActionLockContract',
  'tongxueSingleRuntimeOwnerContract',
  'tongxueNoSelfMutationObserverContract',
  'tongxueRegionSchoolDirectUnifiedStateContract',
  'tongxueHistoryRefreshContract',
  'tongxueDuplicateBindingGuardContract',
  'tongxueLongTaskRegressionContract'
]) {
  assert.ok(releaseContract.includes(`${flag}: true`), `release contract missing ${flag}`);
  assert.equal(active[flag], true, `active manifest missing ${flag}`);
  assert.equal(meta[flag], true, `release meta missing ${flag}`);
}

for (const asset of [
  'js/app.v3965_0.js',
  'js/app-runtime.v3965_0.js',
  'js/workspace/selection-workspace-orchestrator.v3965_0.js',
  'js/feature/feishu/index.v3965_0.js',
  'js/feature/feishu/report-state.v3965_0.js',
  'js/feature/feishu/report-render.v3965_0.js',
  'js/feature/feishu/report-controller.v3965_0.js',
  '../tongxue/app/tongxue-runtime-v159.js',
  '../tongxue/app/tongxue-runtime-controller-v159.js'
]) assert.ok(active.jsEntry.includes(asset), `active manifest missing ${asset}`);
for (const legacy of [
  'js/app.v3964_1.js',
  'js/workspace/selection-workspace-orchestrator.v3964_0.js',
  'js/feature/feishu/index.v3964_0.js',
  '../tongxue/app/tongxue-performance-v158.js'
]) assert.ok(!active.jsEntry.includes(legacy), `legacy active entry remains ${legacy}`);

for (const page of [
  '/', '/index.html', '/ln-rank/', '/ln-rank/index.html', '/ln-rank/selection-pool.html',
  '/ln-rank/local-mainline.html', '/ln-rank/211-mainline.html', '/ln2026.html',
  '/zy2026.html', '/zy2026/', '/zy2026/index.html', '/tongxue/', '/tongxue/index.html',
  '/tongxue/changelog.html'
]) assert.ok(headers.includes(`${page}\n  Cache-Control: no-cache, max-age=0, must-revalidate`), `${page} must revalidate`);
for (const asset of [
  '/ln-rank/js/app.v3965_0.js',
  '/ln-rank/js/feature/feishu/report-controller.v3965_0.js',
  '/shared/ui/shell/family-shell.v3965_0.js',
  '/tongxue/app/tongxue-runtime-v159.js',
  '/ln-rank/js/major-difficulty-2026.v3965_0.js',
  '/zy2026/assets/zy2026.v3965_0.js'
]) assert.ok(headers.includes(`${asset}\n  Cache-Control: public, max-age=31536000, immutable`), `${asset} must be immutable`);

console.log(JSON.stringify({
  ok: true,
  version: CURRENT_RELEASE.display,
  feishuOwner: CURRENT_RELEASE.resourceOwners.reportFeedbackState,
  tongxueOwner: CURRENT_RELEASE.resourceOwners.tongxueState,
  releasePages: [...activePages.keys()],
  tongxueSummaryGroups: groupedSummary.map(group => group.key),
  activeEntries: active.jsEntry.length
}, null, 2));

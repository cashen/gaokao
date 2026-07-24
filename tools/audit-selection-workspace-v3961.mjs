import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const json = path => JSON.parse(read(path));

const release = await import(new URL('../shared/resources/release/current-release.js', import.meta.url));
const ui = await import(new URL('../shared/ui/ui-registry.js', import.meta.url));

assert.equal(release.CURRENT_RELEASE.display, 'v3.9.62.1');
assert.equal(release.CURRENT_RELEASE.assetVersion, 'v3962_1');
assert.equal(release.CURRENT_RELEASE.uiOrchestrationVersion, 'ui-orchestration-v3961');
assert.equal(release.CURRENT_RELEASE.schoolAllModeVersion, 'school-all-mode-v3962_1');
assert.equal(ui.UI_ORCHESTRATION_VERSION, 'v3961_0');
assert.equal(ui.SELECTION_WORKSPACE_CONTRACT.version, 'selection-workspace-orchestration-v3961');
assert.equal(ui.SELECTION_WORKSPACE_CONTRACT.filterChangeQueriesImmediately, false);
assert.equal(ui.SELECTION_WORKSPACE_CONTRACT.preservePreviousResultsWhileDirty, true);
assert.equal(ui.SELECTION_WORKSPACE_CONTRACT.bandSwitchIsViewOnly, true);
assert.equal(ui.SELECTION_WORKSPACE_CONTRACT.resultStructuralObserverAllowed, false);

const page = read('ln-rank/index.html');
assert.ok(page.includes('app.v3961_0.js?v=3962_0'));
assert.ok(page.includes('selection-workspace.v3961_0.css?v=3961_0'));
assert.ok(page.includes('school-all-mode.v3962_1.css?v=3962_0'));
for (const inactive of [
  'multi-terminal.v3949_4.js',
  'family-presentation.v3955_0.js',
  'compare-workspace.v3953_0.js',
  'app.v3960_0.js?v=3960_0'
]) {
  assert.ok(!page.includes(inactive), `legacy active layer remains: ${inactive}`);
}

const orchestrator = read('ln-rank/js/workspace/selection-workspace-orchestrator.v3961_0.js');
for (const marker of [
  'querySnapshotFromDraft',
  "bandFocus: 'all-bands'",
  'committedQuery',
  'committedSummary',
  "button.textContent = '更新结果'",
  'requestState.loading',
  'activeController?.abort?.()',
  'dirty = currentQuerySignature() !== submittedSignature',
  "markDirty('region_changed')",
  "markDirty('bottomline_changed')"
]) {
  assert.ok(orchestrator.includes(marker), `orchestrator missing ${marker}`);
}
assert.ok(!orchestrator.includes('markResultStale'));
assert.ok(!orchestrator.includes('clearResultState'));
assert.ok(!orchestrator.includes('MutationObserver'));
assert.ok(!orchestrator.includes('.scrollIntoView('));
assert.ok(!orchestrator.includes('window.scrollTo('));
assert.ok(!/applyBottomLineMode[\s\S]{0,300}loadData\(/.test(orchestrator), 'bottomline must not auto-query');

const commit = read('ln-rank/js/workspace/result-commit.v3961_0.js');
for (const marker of [
  'presentFamilyResults(root)',
  'ensureCompareSlot',
  'workspace-compare-slot',
  'ln-result-workspace-status is-stale',
  'preserveScrollSnapshot',
  "document.dispatchEvent(new CustomEvent('gaokao:results-committed'"
]) {
  assert.ok(commit.includes(marker), `result commit missing ${marker}`);
}
assert.ok(!commit.includes('MutationObserver'));
assert.ok(!commit.includes('setTimeout('));

const presenter = read('ln-rank/js/workspace/family-card-presenter.v3961_0.js');
assert.ok(presenter.includes('export function presentFamilyResults'));
assert.ok(presenter.includes('ensureDecisionSummary'));
assert.ok(presenter.includes('ensureTongxueEntry'));
assert.ok(!presenter.includes('MutationObserver'));

const viewport = read('ln-rank/js/workspace/viewport-orchestrator.v3961_0.js');
assert.ok(viewport.includes('visualViewport'));
assert.ok(viewport.includes("document.dispatchEvent(new CustomEvent('gaokao:viewport-state'"));
const shell = read('shared/ui/shell/family-shell.v3961_0.js');
assert.ok(!shell.includes('visualViewport'));
assert.ok(!shell.includes('MutationObserver'));
assert.ok(!shell.includes("document.addEventListener('input'"));
assert.ok(shell.includes("document.addEventListener('gaokao:workspace-state'"));

const scroll = read('ln-rank/js/workspace/scroll-policy.v3961_0.js');
assert.ok(scroll.includes('userScrollRevision'));
assert.ok(scroll.includes('finishQueryScrollIntent'));
assert.ok(scroll.includes('intent.revision !== userScrollRevision'));
const activeWorkspaceFiles = [
  'ln-rank/js/workspace/selection-workspace-orchestrator.v3961_0.js',
  'ln-rank/js/workspace/result-commit.v3961_0.js',
  'ln-rank/js/workspace/family-card-presenter.v3961_0.js',
  'ln-rank/js/workspace/viewport-orchestrator.v3961_0.js',
  'shared/ui/shell/family-shell.v3961_0.js'
];
for (const file of activeWorkspaceFiles) {
  const source = read(file);
  assert.ok(!source.includes('.scrollIntoView('), `${file} bypasses scroll owner`);
  assert.ok(!source.includes('window.scrollTo('), `${file} bypasses scroll owner`);
}

const bands = read('ln-rank/js/feature/score-bands/render.v3961_0.js');
assert.ok(bands.includes('score-band-segmented'));
assert.ok(bands.includes('role="tablist"'));
assert.ok(bands.includes('aria-selected='));
assert.ok(bands.includes('只切换当前列表，不重新查询'));
assert.ok(!/class="score-band-segment[\s\S]{0,300}safeRangeText/.test(bands), 'range text leaked into mobile segment');

const selectionController = read('ln-rank/js/feature/selection-pool/controller.v3961_0.js');
assert.equal((selectionController.match(/gaokao:selection-change/g) || []).length, 1);
assert.ok(!selectionController.includes('lnrank:pool-updated'));
assert.ok(!selectionController.includes("window.addEventListener('resize'"));

const css = read('ln-rank/css/selection-workspace.v3961_0.css');
for (const marker of [
  '.score-band-segmented',
  'grid-template-columns: repeat(3, minmax(0, 1fr))',
  '.score-band-current',
  '.ln-result-workspace-status',
  '.workspace-compare-slot',
  'overflow-anchor: none'
]) assert.ok(css.includes(marker), `workspace CSS missing ${marker}`);

for (const file of ['ln-rank/release-meta.json', 'ln-rank/active-assets.json']) {
  const meta = json(file);
  assert.equal(meta.version, 'v3.9.62.1');
  assert.equal(meta.assetVersion, 'v3962_1');
  assert.equal(meta.schoolAllModeVersion, 'school-all-mode-v3962_1');
  for (const contract of [
    'selectionWorkspaceOrchestrationContract',
    'draftCommittedQueryContract',
    'preserveStaleResultsContract',
    'stableResultSlotsContract',
    'singleUiCommitPerIntentContract',
    'noStructuralResultObserverContract',
    'singleScrollOwnerContract',
    'userScrollWinsContract',
    'bandSwitchViewOnlyContract',
    'compareSingleLayoutOwnerContract',
    'cardFirstPassPresentationContract',
    'selectionEventDedupContract',
    'keyboardViewportSingleOwnerContract',
    'androidNoLayoutJitterContract',
    'layoutShiftBudgetContract',
    'schoolAllModeContract',
    'schoolAllSharedSelectionPoolContract'
  ]) assert.equal(meta[contract], true, `${file} missing ${contract}`);
}

console.log(JSON.stringify({
  ok: true,
  release: release.CURRENT_RELEASE.display,
  workspace: ui.SELECTION_WORKSPACE_CONTRACT.version,
  schoolAll: release.CURRENT_RELEASE.schoolAllModeVersion,
  checks: 'state, result commit, scroll, viewport, Android bands, selection events'
}, null, 2));

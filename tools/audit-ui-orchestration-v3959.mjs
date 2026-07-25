import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const read=file=>fs.readFileSync(file,'utf8');
const json=file=>JSON.parse(read(file));
const { CURRENT_RELEASE }=await import(pathToFileURL(`${process.cwd()}/shared/resources/release/current-release.js`));
const releasePresenter=await import(pathToFileURL(`${process.cwd()}/shared/resources/release/release-presenter.js`));
const { UI_PAGE_REGISTRY, UI_RESOURCE_REGISTRY, UI_ORCHESTRATION_VERSION, UI_ACTION_PRIORITY, SELECTION_WORKSPACE_CONTRACT }=await import(pathToFileURL(`${process.cwd()}/shared/ui/ui-registry.js`));
const { UI_ACTION_COPY, validateUiAction }=await import(pathToFileURL(`${process.cwd()}/shared/ui/contracts/action-contract.v3959_0.js`));
const { UI_STATE_COPY, validateUiState }=await import(pathToFileURL(`${process.cwd()}/shared/ui/contracts/state-contract.v3959_0.js`));
const { UI_LANGUAGE, FORBIDDEN_PUBLIC_COPY }=await import(pathToFileURL(`${process.cwd()}/shared/ui/contracts/copy-contract.v3959_0.js`));
const shellModule=await import(pathToFileURL(`${process.cwd()}/shared/ui/shell/family-shell.v3961_0.js`));

assert.equal(CURRENT_RELEASE.display,'v3.9.62.2');
assert.equal(CURRENT_RELEASE.assetVersion,'v3962_2');
assert.equal(CURRENT_RELEASE.uiOrchestrationVersion,'ui-orchestration-v3961');
assert.equal(CURRENT_RELEASE.algorithmOrchestrationVersion,'algorithm-orchestration-v3960');
assert.equal(CURRENT_RELEASE.resourceOwnershipVersion,'resource-ownership-v3958');
assert.equal(CURRENT_RELEASE.selectionWorkspaceVersion,'selection-workspace-orchestration-v3961');
assert.equal(CURRENT_RELEASE.schoolAllModeVersion,'school-all-mode-v3962_2');
assert.equal(CURRENT_RELEASE.schoolUiGovernanceVersion,'school-ui-governance-v3962_2');
assert.equal(CURRENT_RELEASE.schoolModeMountVersion,'school-mode-static-mount-v3962_2');
assert.equal(CURRENT_RELEASE.resourceOwners.ui,'/shared/ui/ui-registry.js');
assert.equal(CURRENT_RELEASE.resourceOwners.uiActions,'/shared/ui/contracts/action-contract.v3959_0.js');
assert.equal(CURRENT_RELEASE.resourceOwners.uiSemantic,'/shared/ui/tokens/semantic.v3959_0.css');
assert.equal(CURRENT_RELEASE.resourceOwners.uiModeSwitch,'/shared/ui/components/mode-switch.v3962_2.css');
assert.equal(typeof releasePresenter.syncCurrentRelease,'function');
assert.equal(typeof releasePresenter.mountCurrentRelease,'function');
assert.equal(UI_ORCHESTRATION_VERSION,'v3961_0');
assert.equal(Object.keys(UI_PAGE_REGISTRY).length,7);
assert.equal(UI_PAGE_REGISTRY.selected.route,'/ln-rank/selection-pool.html#selected-list');
assert.equal(UI_PAGE_REGISTRY.review.route,'/ln-rank/selection-pool.html#family-review');
assert.notEqual(UI_PAGE_REGISTRY.selected.route,UI_PAGE_REGISTRY.review.route);
assert.equal(UI_PAGE_REGISTRY.tongxue.brand,'tongxue');
assert.equal(UI_RESOURCE_REGISTRY.shellJs,'/shared/ui/shell/family-shell.v3961_0.js');
assert.equal(UI_RESOURCE_REGISTRY.workspaceJs,'/ln-rank/js/workspace/selection-workspace-orchestrator.v3961_0.js');
assert.equal(UI_RESOURCE_REGISTRY.viewportOrchestrator,'/ln-rank/js/workspace/viewport-orchestrator.v3961_0.js');
assert.equal(UI_RESOURCE_REGISTRY.modeSwitch,'/shared/ui/components/mode-switch.v3962_2.css');
assert.equal(UI_ACTION_PRIORITY.filterDirty,'update-results');
assert.equal(UI_ACTION_PRIORITY.keyboardOpen,'hidden');
assert.equal(SELECTION_WORKSPACE_CONTRACT.filterChangeQueriesImmediately,false);
assert.equal(SELECTION_WORKSPACE_CONTRACT.preservePreviousResultsWhileDirty,true);
assert.equal(SELECTION_WORKSPACE_CONTRACT.bandSwitchIsViewOnly,true);
assert.equal(SELECTION_WORKSPACE_CONTRACT.resultStructuralObserverAllowed,false);
assert.equal(SELECTION_WORKSPACE_CONTRACT.schoolModeMountOwner,'static-selection-filter-grid');
assert.equal(SELECTION_WORKSPACE_CONTRACT.schoolModeControlOwner,'shared-ui-mode-switch');

for(const action of Object.values(UI_ACTION_COPY))assert.equal(validateUiAction(action),true,`invalid action ${JSON.stringify(action)}`);
for(const state of Object.values(UI_STATE_COPY))assert.equal(validateUiState(state),true,`invalid state ${JSON.stringify(state)}`);
assert.equal(UI_ACTION_COPY.viewScoreNearby.label,'按我的分数附近看');
assert.equal(UI_ACTION_COPY.viewSchoolAllMajors.label,'看该校全部招生专业');
assert.equal(UI_ACTION_COPY.addSelectedMajor.label,'加入已选');
assert.equal(UI_ACTION_COPY.removeSelectedMajor.label,'移出已选');
assert.equal(UI_ACTION_COPY.inspectDetails.label,'查看详情');
assert.equal(UI_ACTION_COPY.inspectDetails.expandedLabel,'收起详情');
assert.equal(UI_LANGUAGE.minimumFilingPosition,'最低投档位置');
assert.equal(UI_LANGUAGE.publicReviews,'公开评论');
assert.ok(UI_LANGUAGE.probabilityBoundary.includes('不代表录取概率'));

assert.equal(shellModule.resolveUiPage('/'),'home');
assert.equal(shellModule.resolveUiPage('/ln-rank/'),'selection');
assert.equal(shellModule.resolveUiPage('/ln-rank/selection-pool.html'),'selected');
assert.equal(shellModule.resolveUiPage('/ln2026.html'),'difficulty');
assert.equal(shellModule.resolveUiPage('/zy2026/'),'structure');
assert.equal(shellModule.resolveUiPage('/tongxue/?school=x'),'tongxue');

const releasePresentation=read('shared/resources/release/release-presenter.js');
for(const marker of ['CURRENT_RELEASE','data-current-release','dataset.release','dataset.uiRelease','__GAOKAO_RELEASE__'])assert.ok(releasePresentation.includes(marker),`release presenter missing ${marker}`);
assert.ok(!releasePresentation.includes('MutationObserver'));
assert.ok(!releasePresentation.includes('setTimeout'));

const shell=read('shared/ui/shell/family-shell.v3961_0.js');
for(const marker of ['当前家庭方案','data-ui-mobile-selected','data-ui-mobile-pending','ui-mobile-update-required','query.click()','#selected-list','#family-review','gaokao:workspace-state','gaokao:selection-change'])assert.ok(shell.includes(marker),`shell missing ${marker}`);
assert.ok(!shell.includes('MutationObserver'));
assert.ok(!shell.includes('visualViewport'));
assert.ok(!shell.includes("fetch('/api/"));
assert.ok(!shell.includes("document.addEventListener('input'"));
const compatShell=read('shared/ui/shell/family-shell.v3960_0.js');
assert.ok(compatShell.includes('当前家庭方案'));
const legacyCompatShell=read('shared/ui/shell/family-shell.v3959_0.js');
assert.ok(legacyCompatShell.includes('release-presenter.js?v=3961_0'));

const viewport=read('ln-rank/js/workspace/viewport-orchestrator.v3961_0.js');
assert.ok(viewport.includes('visualViewport'));
assert.ok(viewport.includes('baseViewportHeight'));
assert.ok(viewport.includes('orientationchange'));
assert.ok(viewport.includes('gaokao:viewport-state'));
const scroll=read('ln-rank/js/workspace/scroll-policy.v3961_0.js');
assert.ok(scroll.includes('userScrollRevision'));
assert.ok(scroll.includes('finishQueryScrollIntent'));
assert.ok(scroll.includes('intent.revision !== userScrollRevision'));

const foundation=read('shared/ui/tokens/foundation.v3959_0.css');
const semantic=read('shared/ui/tokens/semantic.v3959_0.css');
const modeSwitch=read('shared/ui/components/mode-switch.v3962_2.css');
const shellCss=read('shared/ui/shell/family-shell.v3960_0.css');
const workspaceCss=read('ln-rank/css/selection-workspace.v3961_0.css');
const schoolAllCss=read('ln-rank/css/school-all-mode.v3962_2.css');
for(const token of ['--ui-page-bg','--ui-surface','--ui-ink','--ui-brand-primary','--ui-touch-min','--ui-reading-width','--ui-workspace-width','--ui-safe-bottom'])assert.ok(foundation.includes(token),`foundation missing ${token}`);
assert.ok(foundation.includes('env(safe-area-inset-bottom'), 'foundation must own safe-area environment value');
for(const component of ['.ui-button','.ui-button--compact','.ui-chip--compact','.ui-card','.ui-state--loading','.ui-state--pending','.ui-state--error','.ui-segmented'])assert.ok(semantic.includes(component),`semantic missing ${component}`);
assert.ok(semantic.includes('writing-mode:horizontal-tb'));
assert.ok(semantic.includes('@media(pointer:coarse)'));
for(const feature of ['.ui-mode-switch','grid-column:1 / -1','container-name:ui-mode-switch','writing-mode:horizontal-tb','@container ui-mode-switch (max-width:280px)'])assert.ok(modeSwitch.includes(feature),`mode switch missing ${feature}`);
for(const feature of ['.ui-global-header','.ui-family-status','.ui-mobile-nav','var(--ui-safe-bottom)','@media(max-width:767px)','mobile-dirty-bar','pool-entry-toast','#selected-list','#family-review'])assert.ok(shellCss.includes(feature),`shell CSS missing ${feature}`);
for(const feature of ['.score-band-segmented','.score-band-current','.ln-result-workspace-status','.workspace-compare-slot','overflow-anchor: none','grid-template-columns: repeat(3, minmax(0, 1fr))'])assert.ok(workspaceCss.includes(feature),`workspace CSS missing ${feature}`);
for(const feature of ['body[data-result-mode="school-all"]','.school-major-row','.school-all-summary','container-name:school-results','@container school-results (max-width:1040px)','@container school-results (max-width:600px)','@container school-results (max-width:360px)','.school-major-detail','grid-column:1 / -1'])assert.ok(schoolAllCss.includes(feature),`school-all CSS missing ${feature}`);
assert.ok(!schoolAllCss.includes('@media (max-width:'));
assert.ok(!schoolAllCss.includes('min-width: min(620px'));
assert.ok(!schoolAllCss.includes('.ui-mode-switch'));
assert.ok(!schoolAllCss.includes('.school-view-mode'));

const home=read('index.html');
assert.ok(home.includes('data-release="v3.9.62.2"'));
assert.ok(home.includes('data-current-release'));
assert.ok(!home.includes('首页版本：v3.9.59.0'));

const main=read('ln-rank/index.html');
assert.ok(main.includes('family-shell.v3960_0.css?v=3961_0'));
assert.ok(main.includes('selection-workspace.v3961_0.css?v=3961_0'));
assert.ok(main.includes('semantic.v3959_0.css?v=3962_2'));
assert.ok(main.includes('mode-switch.v3962_2.css?v=3962_2'));
assert.ok(main.includes('school-all-mode.v3962_2.css?v=3962_2'));
assert.ok(main.includes('app.v3961_0.js?v=3962_2'));
assert.ok(main.includes('id="schoolViewModeMount"'));
assert.ok(main.includes('id="schoolAllResultsPanel"'));
assert.ok(main.includes('class="ui-mode-switch"'));
assert.ok(main.includes('class="ui-segmented ui-mode-switch__actions"'));
assert.ok(main.includes('data-release="v3.9.62.2"'));
assert.ok(main.includes('data-current-release'));
assert.ok(main.includes('资源、UI与算法：全站统一调度'));
for(const inactive of ['family-decision-bar.v3955_0.js','multi-terminal.v3949_4.js','family-presentation.v3955_0.js','compare-workspace.v3953_0.js','school-all-mode.v3962_0.css?v=3962_0','school-all-mode.v3962_1.css?v=3962_1'])assert.ok(!main.includes(inactive),`legacy active layer ${inactive}`);

const appEntry=read('ln-rank/js/app.v3961_0.js');
assert.ok(appEntry.includes('release-presenter.js?v=3962_2'));
assert.ok(appEntry.includes('school-all-mode.v3962_2.js?v=3962_2'));
assert.ok(!appEntry.includes('school-all-mode.v3962_0.js?v=3962_0'));
assert.ok(!appEntry.includes('school-all-mode.v3962_1.js?v=3962_1'));
const schoolRuntime=read('ln-rank/js/feature/school-majors/school-all-mode.v3962_2.js');
for(const marker of ['UI_ACTION_COPY','data-school-detail-toggle','aria-expanded','aria-controls','expandedRecordKey',"mountPolicy: 'static-shared-ui'",'assertStaticStructure','filterGrid?.contains(mount)'])assert.ok(schoolRuntime.includes(marker),`school runtime missing ${marker}`);
for(const forbidden of ['injectStylesheet','ensureModeMount','ensureWorkspace','document.createElement','insertAdjacentElement','<details>','<summary>','MutationObserver','setTimeout('])assert.ok(!schoolRuntime.includes(forbidden),`school runtime layout owner regression ${forbidden}`);
const selectedEntry=read('ln-rank/js/selection-pool.v3960_0.js');
assert.ok(selectedEntry.includes('release-presenter.js?v=3961_0'));

const selected=read('ln-rank/selection-pool.html');
assert.ok(selected.includes('id="selected-list"'));
assert.ok(selected.includes('id="family-review"'));
assert.ok(selected.includes('selection-pool.v3960_0.js?v=3961_0'));
assert.ok(selected.includes('data-release="v3.9.62.2"'));
assert.ok(selected.includes('data-current-release'));
assert.ok(selected.includes('同一算法快照'));
assert.ok(!selected.includes('family-decision-bar.v3955_0.js'));

const staticPages={
  'index.html':['home','family','reading'],
  'ln-rank/index.html':['selection','family','workspace'],
  'ln-rank/selection-pool.html':['selected','family','workspace'],
  'ln-rank/self-check.html':['selected','family','reading']
};
for(const [file,[page,brand,density]] of Object.entries(staticPages)){
  const source=read(file);
  assert.ok(source.includes(`data-ui-page="${page}"`),`${file} wrong page adapter`);
  assert.ok(source.includes(`data-ui-brand="${brand}"`),`${file} wrong brand adapter`);
  assert.ok(source.includes(`data-ui-density="${density}"`),`${file} wrong density adapter`);
  assert.ok(source.includes('ui-orchestrated'),`${file} missing static orchestrated class`);
  for(const phrase of FORBIDDEN_PUBLIC_COPY)assert.ok(!source.includes(phrase),`${file} contains forbidden public copy ${phrase}`);
}

const runtimeAdapters={
  'ln2026.html':'ln-rank/js/major-difficulty-2026.v3959_0.js',
  'zy2026/index.html':'zy2026/assets/zy2026.v3959_0.js',
  'tongxue/index.html':'tongxue/app/tongxue-performance-v156.js'
};
for(const [pageFile,adapterFile] of Object.entries(runtimeAdapters)){
  const page=read(pageFile);
  const adapter=read(adapterFile);
  assert.ok(adapter.includes('shared/ui/shell/family-shell.v3959_0.js'),`${adapterFile} missing compatibility shell import`);
  for(const phrase of FORBIDDEN_PUBLIC_COPY)assert.ok(!page.includes(phrase),`${pageFile} contains forbidden public copy ${phrase}`);
}
assert.ok(read('ln2026.html').includes('data-current-release'));
assert.ok(read('zy2026/index.html').includes('data-current-release'));

const directReleasePages=['ln-rank/local-mainline.html','ln-rank/211-mainline.html'];
for(const file of directReleasePages){
  const source=read(file);
  assert.ok(source.includes('data-current-release'),`${file} missing current release marker`);
  assert.ok(source.includes('/shared/resources/release/release-presenter.js?v=3961_0'),`${file} missing direct release presenter`);
  assert.ok(!source.includes('data-release="v3.9.'),`${file} retains static release owner`);
  assert.ok(!/版本：v3\.9\./.test(source),`${file} retains visible static release`);
}

const selfCheck=read('ln-rank/self-check.html');
assert.ok(selfCheck.includes('data-current-release'));
assert.ok(selfCheck.includes('family-shell.v3959_0.js?v=3959_0'));
assert.ok(!selfCheck.includes('data-release="v3.9.'));
assert.ok(!selfCheck.includes('发版自测｜v3.9.'));
assert.ok(!selfCheck.includes('用于确认 v3.9.'));

const redirectPages={
  'ln-rank/major-trend-2026.html':"location.replace('/ln2026.html#overview')",
  'lngk2026.html':"location.replace('/ln2026.html#score-band')",
  'e.html':"location.replace('/')",
  'zy.html':"location.replace('/zy2026')"
};
for(const [file,target] of Object.entries(redirectPages)){
  const source=read(file);
  assert.ok(source.includes(target),`${file} redirect target changed`);
  assert.ok(!/版本：v3\.9\./.test(source),`${file} redirect owns a release version`);
  assert.ok(!source.includes('data-release="v3.9.'),`${file} redirect owns data-release`);
}

for(const file of ['ln-rank/release-meta.json','ln-rank/active-assets.json']){
  const meta=json(file);
  assert.equal(meta.version,'v3.9.62.2');
  assert.equal(meta.assetVersion,'v3962_2');
  assert.equal(meta.uiOrchestrationVersion,'ui-orchestration-v3961');
  assert.equal(meta.selectionWorkspaceVersion,'selection-workspace-orchestration-v3961');
  assert.equal(meta.schoolAllModeVersion,'school-all-mode-v3962_2');
  assert.equal(meta.schoolUiGovernanceVersion,'school-ui-governance-v3962_2');
  assert.equal(meta.schoolModeMountVersion,'school-mode-static-mount-v3962_2');
  for(const key of [
    'sharedUiOwnershipContract','sharedUiTokenContract','sharedUiShellContract','sharedUiActionContract','sharedUiStateContract','sharedUiCopyContract','sharedUiSixPageAdapterContract','sharedUiMobileNavigationContract','sharedUiKeyboardSafeAreaContract','sharedUiSubBrandContract','sharedUiNoNewObserverContract','sharedUiResourceOwnershipPreservedContract','sharedUiSingleActionSurfaceContract','quietSelectionFeedbackContract','selectedReviewDistinctRouteContract','tabletDecisionLayoutContract','selectionWorkspaceOrchestrationContract','preserveStaleResultsContract','singleScrollOwnerContract','bandSwitchViewOnlyContract','androidNoLayoutJitterContract','schoolAllModeContract','schoolAllSharedResourceContract','schoolAllEntityIsolationContract','schoolAllScoreInvariantContract','schoolAllMultiTerminalContract','schoolAllSharedSelectionPoolContract','schoolAllSharedUiGovernanceContract','schoolAllFullRowDetailsContract','schoolAllContainerResponsiveContract','schoolAllBrowserMultiTerminalContract','schoolModeStaticMountContract','schoolModeSharedSwitchContract','schoolModeNoRuntimeLayoutInjectionContract','schoolModeRealFilterJourneyContract'
  ])assert.equal(meta[key],true,`${file} missing ${key}`);
}

console.log(JSON.stringify({ok:true,release:CURRENT_RELEASE.display,ui:UI_ORCHESTRATION_VERSION,workspace:SELECTION_WORKSPACE_CONTRACT.version,schoolAll:CURRENT_RELEASE.schoolAllModeVersion,schoolUiGovernance:CURRENT_RELEASE.schoolUiGovernanceVersion,schoolModeMount:CURRENT_RELEASE.schoolModeMountVersion,pages:Object.keys(UI_PAGE_REGISTRY),resourceOwnership:CURRENT_RELEASE.resourceOwnershipVersion,releasePresentation:'shared-owner-all-pages'},null,2));

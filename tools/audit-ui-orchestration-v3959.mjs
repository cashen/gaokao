import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const read=file=>fs.readFileSync(file,'utf8');
const json=file=>JSON.parse(read(file));
const { CURRENT_RELEASE }=await import(pathToFileURL(`${process.cwd()}/shared/resources/release/current-release.js`));
const { UI_PAGE_REGISTRY, UI_RESOURCE_REGISTRY, UI_ORCHESTRATION_VERSION, UI_ACTION_PRIORITY }=await import(pathToFileURL(`${process.cwd()}/shared/ui/ui-registry.js`));
const { UI_ACTION_COPY, validateUiAction }=await import(pathToFileURL(`${process.cwd()}/shared/ui/contracts/action-contract.v3959_0.js`));
const { UI_STATE_COPY, validateUiState }=await import(pathToFileURL(`${process.cwd()}/shared/ui/contracts/state-contract.v3959_0.js`));
const { UI_LANGUAGE, FORBIDDEN_PUBLIC_COPY }=await import(pathToFileURL(`${process.cwd()}/shared/ui/contracts/copy-contract.v3959_0.js`));
const shellModule=await import(pathToFileURL(`${process.cwd()}/shared/ui/shell/family-shell.v3960_0.js`));

assert.equal(CURRENT_RELEASE.display,'v3.9.60.0');
assert.equal(CURRENT_RELEASE.assetVersion,'v3960_0');
assert.equal(CURRENT_RELEASE.uiOrchestrationVersion,'ui-orchestration-v3960');
assert.equal(CURRENT_RELEASE.algorithmOrchestrationVersion,'algorithm-orchestration-v3960');
assert.equal(CURRENT_RELEASE.resourceOwnershipVersion,'resource-ownership-v3958');
assert.equal(CURRENT_RELEASE.resourceOwners.ui,'/shared/ui/ui-registry.js');
assert.equal(UI_ORCHESTRATION_VERSION,'v3960_0');
assert.equal(Object.keys(UI_PAGE_REGISTRY).length,7);
assert.equal(UI_PAGE_REGISTRY.selected.route,'/ln-rank/selection-pool.html#selected-list');
assert.equal(UI_PAGE_REGISTRY.review.route,'/ln-rank/selection-pool.html#family-review');
assert.notEqual(UI_PAGE_REGISTRY.selected.route,UI_PAGE_REGISTRY.review.route);
assert.equal(UI_PAGE_REGISTRY.tongxue.brand,'tongxue');
assert.equal(UI_RESOURCE_REGISTRY.shellJs,'/shared/ui/shell/family-shell.v3960_0.js');
assert.equal(UI_ACTION_PRIORITY.filterDirty,'update-results');
assert.equal(UI_ACTION_PRIORITY.keyboardOpen,'hidden');

for(const action of Object.values(UI_ACTION_COPY))assert.equal(validateUiAction(action),true,`invalid action ${JSON.stringify(action)}`);
for(const state of Object.values(UI_STATE_COPY))assert.equal(validateUiState(state),true,`invalid state ${JSON.stringify(state)}`);
assert.equal(UI_LANGUAGE.minimumFilingPosition,'最低投档位置');
assert.equal(UI_LANGUAGE.publicReviews,'公开评论');
assert.ok(UI_LANGUAGE.probabilityBoundary.includes('不代表录取概率'));

assert.equal(shellModule.resolveUiPage('/'),'home');
assert.equal(shellModule.resolveUiPage('/ln-rank/'),'selection');
assert.equal(shellModule.resolveUiPage('/ln-rank/selection-pool.html'),'selected');
assert.equal(shellModule.resolveUiPage('/ln2026.html'),'difficulty');
assert.equal(shellModule.resolveUiPage('/zy2026/'),'structure');
assert.equal(shellModule.resolveUiPage('/tongxue/?school=x'),'tongxue');

const shell=read('shared/ui/shell/family-shell.v3960_0.js');
for(const marker of ['当前家庭方案','data-ui-mobile-selected','data-ui-mobile-pending','visualViewport','ui-keyboard-open','ensureUiStyles','ui-mobile-update-required','query.click()','#selected-list','#family-review'])assert.ok(shell.includes(marker),`shell missing ${marker}`);
assert.ok(!shell.includes('MutationObserver'));
assert.ok(!shell.includes("fetch('/api/"));
const compatShell=read('shared/ui/shell/family-shell.v3959_0.js');
assert.ok(compatShell.includes('family-shell.v3960_0.js'));

const foundation=read('shared/ui/tokens/foundation.v3959_0.css');
const semantic=read('shared/ui/tokens/semantic.v3959_0.css');
const shellCss=read('shared/ui/shell/family-shell.v3960_0.css');
for(const token of ['--ui-page-bg','--ui-surface','--ui-ink','--ui-brand-primary','--ui-touch-min','--ui-reading-width','--ui-workspace-width','--ui-safe-bottom'])assert.ok(foundation.includes(token),`foundation missing ${token}`);
assert.ok(foundation.includes('env(safe-area-inset-bottom'), 'foundation must own safe-area environment value');
for(const component of ['.ui-button','.ui-card','.ui-state--loading','.ui-state--pending','.ui-state--error'])assert.ok(semantic.includes(component),`semantic missing ${component}`);
for(const feature of ['.ui-global-header','.ui-family-status','.ui-mobile-nav','var(--ui-safe-bottom)','@media(max-width:767px)','mobile-dirty-bar','pool-entry-toast','#selected-list','#family-review'])assert.ok(shellCss.includes(feature),`shell CSS missing ${feature}`);
assert.ok(shellCss.includes('@media(max-width:900px)'));
assert.ok(shellCss.includes('#results.results-grid{grid-template-columns:minmax(0,1fr)!important}'));

const main=read('ln-rank/index.html');
assert.ok(main.includes('family-shell.v3960_0.css?v=3960_0'));
assert.ok(main.includes('app.v3960_0.js?v=3960_0'));
assert.ok(main.includes('data-release="v3.9.60.0"'));
assert.ok(main.includes('资源、UI与算法：全站统一调度'));
assert.ok(!main.includes('family-decision-bar.v3955_0.js'));

const selected=read('ln-rank/selection-pool.html');
assert.ok(selected.includes('id="selected-list"'));
assert.ok(selected.includes('id="family-review"'));
assert.ok(selected.includes('selection-pool.v3960_0.js?v=3960_0'));
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

for(const file of ['ln-rank/release-meta.json','ln-rank/active-assets.json']){
  const meta=json(file);
  assert.equal(meta.version,'v3.9.60.0');
  assert.equal(meta.assetVersion,'v3960_0');
  assert.equal(meta.uiOrchestrationVersion,'ui-orchestration-v3960');
  for(const key of ['sharedUiOwnershipContract','sharedUiTokenContract','sharedUiShellContract','sharedUiActionContract','sharedUiStateContract','sharedUiCopyContract','sharedUiSixPageAdapterContract','sharedUiMobileNavigationContract','sharedUiKeyboardSafeAreaContract','sharedUiSubBrandContract','sharedUiNoNewObserverContract','sharedUiResourceOwnershipPreservedContract','sharedUiSingleActionSurfaceContract','quietSelectionFeedbackContract','selectedReviewDistinctRouteContract','tabletDecisionLayoutContract'])assert.equal(meta[key],true,`${file} missing ${key}`);
}

console.log(JSON.stringify({ok:true,release:CURRENT_RELEASE.display,ui:UI_ORCHESTRATION_VERSION,pages:Object.keys(UI_PAGE_REGISTRY),resourceOwnership:CURRENT_RELEASE.resourceOwnershipVersion},null,2));

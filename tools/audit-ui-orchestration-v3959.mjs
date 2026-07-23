import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const read=file=>fs.readFileSync(file,'utf8');
const json=file=>JSON.parse(read(file));
const { CURRENT_RELEASE }=await import(pathToFileURL(`${process.cwd()}/shared/resources/release/current-release.js`));
const { UI_PAGE_REGISTRY, UI_RESOURCE_REGISTRY, UI_ORCHESTRATION_VERSION }=await import(pathToFileURL(`${process.cwd()}/shared/ui/ui-registry.js`));
const { UI_ACTION_COPY, validateUiAction }=await import(pathToFileURL(`${process.cwd()}/shared/ui/contracts/action-contract.v3959_0.js`));
const { UI_STATE_COPY, validateUiState }=await import(pathToFileURL(`${process.cwd()}/shared/ui/contracts/state-contract.v3959_0.js`));
const { UI_LANGUAGE, FORBIDDEN_PUBLIC_COPY }=await import(pathToFileURL(`${process.cwd()}/shared/ui/contracts/copy-contract.v3959_0.js`));
const shellModule=await import(pathToFileURL(`${process.cwd()}/shared/ui/shell/family-shell.v3959_0.js`));

assert.equal(CURRENT_RELEASE.display,'v3.9.59.0');
assert.equal(CURRENT_RELEASE.assetVersion,'v3959_0');
assert.equal(CURRENT_RELEASE.uiOrchestrationVersion,'ui-orchestration-v3959');
assert.equal(CURRENT_RELEASE.resourceOwnershipVersion,'resource-ownership-v3958');
assert.equal(CURRENT_RELEASE.resourceOwners.ui,'/shared/ui/ui-registry.js');
assert.equal(UI_ORCHESTRATION_VERSION,'v3959_0');
assert.equal(Object.keys(UI_PAGE_REGISTRY).length,6);
assert.equal(UI_PAGE_REGISTRY.tongxue.brand,'tongxue');
assert.equal(UI_RESOURCE_REGISTRY.shellJs,'/shared/ui/shell/family-shell.v3959_0.js');

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

const shell=read('shared/ui/shell/family-shell.v3959_0.js');
assert.ok(shell.includes('当前家庭方案'));
assert.ok(shell.includes('data-ui-mobile-selected'));
assert.ok(shell.includes('visualViewport'));
assert.ok(shell.includes('ui-keyboard-open'));
assert.ok(shell.includes('ensureUiStyles'));
assert.ok(!shell.includes('MutationObserver'));
assert.ok(!shell.includes("fetch('/api/"));

const foundation=read('shared/ui/tokens/foundation.v3959_0.css');
const semantic=read('shared/ui/tokens/semantic.v3959_0.css');
const shellCss=read('shared/ui/shell/family-shell.v3959_0.css');
for(const token of ['--ui-page-bg','--ui-surface','--ui-ink','--ui-brand-primary','--ui-touch-min','--ui-reading-width','--ui-workspace-width','--ui-safe-bottom'])assert.ok(foundation.includes(token),`foundation missing ${token}`);
assert.ok(foundation.includes('env(safe-area-inset-bottom'), 'foundation must own safe-area environment value');
for(const component of ['.ui-button','.ui-card','.ui-state--loading','.ui-state--pending','.ui-state--error'])assert.ok(semantic.includes(component),`semantic missing ${component}`);
for(const feature of ['.ui-global-header','.ui-family-status','.ui-mobile-nav','var(--ui-safe-bottom)','@media(max-width:767px)','family-decision-bar'])assert.ok(shellCss.includes(feature),`shell CSS missing ${feature}`);

const staticPages={
  'index.html':['home','family','reading'],
  'ln-rank/index.html':['selection','family','workspace'],
  'ln-rank/selection-pool.html':['selected','family','workspace'],
  'ln-rank/self-check.html':['selected','family','reading']
};
for(const [file,[page,brand,density]] of Object.entries(staticPages)){
  const source=read(file);
  assert.ok(source.includes('foundation.v3959_0.css?v=3959_0'),`${file} missing foundation`);
  assert.ok(source.includes('semantic.v3959_0.css?v=3959_0'),`${file} missing semantic`);
  assert.ok(source.includes('family-shell.v3959_0.css?v=3959_0'),`${file} missing shell CSS`);
  assert.ok(source.includes('family-shell.v3959_0.js?v=3959_0')||source.includes('app.v3959_0.js?v=3959_0')||source.includes('selection-pool.v3959_0.js?v=3959_0'),`${file} missing shell runtime`);
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
  assert.ok(adapter.includes('shared/ui/shell/family-shell.v3959_0.js'),`${adapterFile} missing shared shell import`);
  for(const phrase of FORBIDDEN_PUBLIC_COPY)assert.ok(!page.includes(phrase),`${pageFile} contains forbidden public copy ${phrase}`);
}
assert.ok(read('ln2026.html').includes('major-difficulty-2026.v3959_0.js?v=3959_0'));
assert.ok(read('zy2026/index.html').includes('zy2026.v3959_0.js?v=3959_0'));
assert.ok(!read('ln-rank/index.html').includes('family-decision-bar.v3955_0.js'));
assert.ok(!read('ln-rank/selection-pool.html').includes('family-decision-bar.v3955_0.js'));
assert.ok(!read('index.html').includes(':root{--bg:#f4f7f6'));

for(const file of ['ln-rank/release-meta.json','ln-rank/active-assets.json']){
  const meta=json(file);
  assert.equal(meta.version,'v3.9.59.0');
  assert.equal(meta.assetVersion,'v3959_0');
  for(const key of ['sharedUiOwnershipContract','sharedUiTokenContract','sharedUiShellContract','sharedUiActionContract','sharedUiStateContract','sharedUiCopyContract','sharedUiSixPageAdapterContract','sharedUiMobileNavigationContract','sharedUiKeyboardSafeAreaContract','sharedUiSubBrandContract','sharedUiNoNewObserverContract','sharedUiResourceOwnershipPreservedContract'])assert.equal(meta[key],true,`${file} missing ${key}`);
}

const registry=read('shared/resources/resource-registry.js');
assert.ok(registry.includes("id: 'family-ui-orchestration'"));
assert.ok(registry.includes("policy: 'single-ui-language-shell-state-and-responsive-contract'"));

console.log(JSON.stringify({ok:true,release:CURRENT_RELEASE.display,ui:UI_ORCHESTRATION_VERSION,pages:[...Object.keys(staticPages),...Object.keys(runtimeAdapters)],resourceOwnership:CURRENT_RELEASE.resourceOwnershipVersion},null,2));

import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = path => fs.readFileSync(path, 'utf8');
const json = path => JSON.parse(read(path));
const includesAll = (source, phrases, label) => {
  for (const phrase of phrases) assert.ok(source.includes(phrase), `${label} missing ${phrase}`);
};

const root = read('index.html');
const main = read('ln-rank/index.html');
const selection = read('ln-rank/selection-pool.html');
const presentation = read('ln-rank/js/workspace/family-card-presenter.v3961_0.js');
const schoolAll = read('ln-rank/js/feature/school-majors/school-all-mode.v3962_2.js');
const oldPresentation = read('ln-rank/js/ux/family-presentation.v3955_0.js');
const legacyDecisionBar = read('ln-rank/js/ux/family-decision-bar.v3955_0.js');
const sharedShell = read('shared/ui/shell/family-shell.v3961_0.js');
const compatShell = read('shared/ui/shell/family-shell.v3960_0.js');
const legacyCompatShell = read('shared/ui/shell/family-shell.v3959_0.js');
const releasePresenter = read('shared/resources/release/release-presenter.js');
const home = read('ln-rank/js/ux/family-home.v3955_0.js');
const decisionContract = read('ln-rank/js/domain/family-decision-contract.v3955_0.js');
const schoolCenter = read('shared/resources/schools/school-resource-center.js');
const schoolIdentity = read('shared/resources/schools/school-identity-center.js');
const entityCompat = read('tongxue/data/school-entities-v150.js');
const css = read('ln-rank/css/dist/family-decision-workspace.v3955_0.css');
const workspaceCss = read('ln-rank/css/selection-workspace.v3961_0.css');
const schoolAllCss = read('ln-rank/css/school-all-mode.v3962_2.css');
const modeSwitchCss = read('shared/ui/components/mode-switch.v3962_2.css');
const semanticCss = read('shared/ui/tokens/semantic.v3959_0.css');
const actionContract = read('shared/ui/contracts/action-contract.v3959_0.js');
const foundationCss = read('shared/ui/tokens/foundation.v3959_0.css');
const shellCss = read('shared/ui/shell/family-shell.v3960_0.css');
const zyPage = read('zy2026/index.html');
const zyAlias = read('zy2026.html');
const zyRuntime = read('zy2026/assets/zy2026.v3955_0.js');
const release = json('ln-rank/release-meta.json');
const active = json('ln-rank/active-assets.json');
const { CURRENT_RELEASE } = await import('../shared/resources/release/current-release.js');

assert.equal(release.version, CURRENT_RELEASE.display);
assert.equal(active.version, CURRENT_RELEASE.display);
assert.equal(release.assetVersion, CURRENT_RELEASE.assetVersion);
assert.equal(active.assetVersion, CURRENT_RELEASE.assetVersion);
assert.equal(CURRENT_RELEASE.display, 'v3.9.62.2');
assert.equal(CURRENT_RELEASE.assetVersion, 'v3962_2');
assert.equal(CURRENT_RELEASE.uiOrchestrationVersion, 'ui-orchestration-v3961');
assert.equal(CURRENT_RELEASE.schoolAllModeVersion, 'school-all-mode-v3962_2');
assert.equal(CURRENT_RELEASE.schoolUiGovernanceVersion, 'school-ui-governance-v3962_2');
assert.equal(CURRENT_RELEASE.schoolModeMountVersion, 'school-mode-static-mount-v3962_2');
assert.equal(CURRENT_RELEASE.resourceOwners.uiModeSwitch, '/shared/ui/components/mode-switch.v3962_2.css');

includesAll(root, ['辽宁高考家庭决策工作台','先圈出一批可以讨论的专业','近期公开评论','时间只帮助安排节奏','family-shell.v3959_0.js','data-current-release'], 'homepage');
assert.ok(!root.includes('近期真实评论'), 'homepage must not claim real reviews');
assert.ok(!root.includes('id="h2027"') && !root.includes('id="s2027"'), 'homepage must not foreground second-level countdown');
includesAll(home, ['returning','score-ready','继续检查当前家庭方案','继续检查家庭方案','先让孩子确认','2027招生计划'], 'homepage runtime');

includesAll(main, [
  '确认孩子的位置','说清想看什么','圈出并整理专业','家庭逐项复核',
  'app.v3961_0.js?v=3962_2','selection-workspace.v3961_0.css?v=3961_0',
  'school-all-mode.v3962_2.css?v=3962_2','mode-switch.v3962_2.css?v=3962_2',
  'semantic.v3959_0.css?v=3962_2','family-decision-workspace.v3955_0.css',
  'id="schoolViewModeMount"','id="schoolAllResultsPanel"','class="ui-mode-switch"',
  'class="ui-segmented ui-mode-switch__actions"',`data-release="${CURRENT_RELEASE.display}"`,'data-current-release'
], 'main flow');
for (const inactive of ['family-decision-bar.v3955_0.js','multi-terminal.v3949_4.js','family-presentation.v3955_0.js','compare-workspace.v3953_0.js','school-all-mode.v3962_0.css?v=3962_0','school-all-mode.v3962_1.css?v=3962_1']) assert.ok(!main.includes(inactive), `legacy main layer active: ${inactive}`);
assert.ok(!main.includes('第一步：模考') && !main.includes('第二步：先看多大范围') && !main.includes('第三步：想看什么方向'), 'old duplicate field step numbering remains');
const filterStart = main.indexOf('<div class="search-grid-top ln-filter-panel__secondary">');
const modeIndex = main.indexOf('id="schoolViewModeMount"');
assert.ok(filterStart >= 0 && modeIndex > filterStart, 'school mode switch must live inside the family filter flow');

includesAll(selection, ['id="selected-list"','id="family-review"','检查已选专业','检查真实承接与待确认事项','生成家庭复核报告','其他保存方式','selection-pool.v3960_0.js?v=3961_0','同一算法快照',`data-release="${CURRENT_RELEASE.display}"`,'data-current-release'], 'selection page');
assert.ok(!selection.includes('family-decision-bar.v3955_0.js'), 'legacy family bar still active on selection');

includesAll(presentation, ['为什么出现','最需要确认','现在还不知道','最低投档位置基本稳定','最低投档所需位次','tongxue-card-entry','公开评论和来源摘要','shared/resources/schools/school-resource-center.js','export function presentFamilyResults'], 'synchronous card presentation');
assert.ok(!presentation.includes('MutationObserver'), 'current card presenter must be first-pass synchronous');
assert.ok(!presentation.includes('近两年录取位置基本稳定'), 'old visible admission-position copy remains');
assert.ok(!presentation.includes('2026年录取所需位次'), 'old visible admission-rank copy remains');
assert.ok(!presentation.includes("fetch('/api/tongxue"), 'card layer must not prefetch Tongxue API');
assert.ok(oldPresentation.includes('为什么出现'), 'preserved compatibility presentation changed unexpectedly');

includesAll(schoolAll, ['createSelectionPoolAdapter','buildTongxueSchoolHref',"version: 'school-all-mode-v3962_2'","mountPolicy: 'static-shared-ui'",'assertStaticStructure','filterGrid?.contains(mount)','看该校全部招生专业','输入参考分数后，可查看历史位置关系','UI_ACTION_COPY','data-school-detail-toggle','expandedRecordKey'], 'school-all family flow');
for(const forbidden of ['MutationObserver','setTimeout(','injectStylesheet','ensureModeMount','ensureWorkspace','document.createElement','insertAdjacentElement','<details>','<summary>']) assert.ok(!schoolAll.includes(forbidden), `school-all runtime layout owner regression: ${forbidden}`);

includesAll(schoolCenter, ['isEntitySourceAvailable','directory_resolve_on_open','combinedCampusCandidates','tongxueDirectoryPromise','loadTongxueSchoolDirectory',"from './school-identity-center.js'"], 'shared school center');
assert.ok(schoolIdentity.includes("E('dlut-main','大连理工大学'"), 'Dalian University of Technology main entity missing');
assert.ok(schoolIdentity.includes("E('dlut-panjin','大连理工大学（盘锦校区）'"), 'DUT Panjin entity missing');
assert.ok(schoolIdentity.includes("E('neu-main','东北大学'"), 'Northeastern University entity missing');
assert.ok(schoolIdentity.includes("E('neu-qhd','东北大学秦皇岛分校'"), 'Northeastern University Qinhuangdao entity missing');
assert.ok(entityCompat.includes('shared/resources/schools/school-identity-center.js'), 'Tongxue compatibility export must use shared identity');
assert.ok(!entityCompat.includes("E('dlut-panjin'"), 'Tongxue must not maintain a second entity table');
includesAll(legacyDecisionBar, ['当前家庭方案','data-mobile-selected','data-mobile-pending','lnrank-selection-pool-updated'], 'legacy compatibility bar');
includesAll(sharedShell, ['当前家庭方案','data-ui-mobile-selected','data-ui-mobile-pending','gaokao:selection-change','gaokao:workspace-state','query.click()','#selected-list','#family-review'], 'shared family shell');
assert.ok(!sharedShell.includes('MutationObserver'), 'shared shell must not add global observer');
assert.ok(!sharedShell.includes('visualViewport'), 'shared shell must not be second viewport owner');
assert.ok(compatShell.includes('family-shell.v3960_0.js') || compatShell.includes('CURRENT_RELEASE'), 'v3960 compatibility shell must remain');
assert.ok(legacyCompatShell.includes('release-presenter.js?v=3961_0'), 'legacy compatibility shell must mount current release presenter');
includesAll(releasePresenter, ['CURRENT_RELEASE','data-current-release','dataset.release','dataset.uiRelease','__GAOKAO_RELEASE__'], 'release presenter');
assert.ok(!releasePresenter.includes('MutationObserver') && !releasePresenter.includes('setTimeout'), 'release presenter must not add observer or timer');
includesAll(decisionContract, ['resolveFamilyNextAction','countFamilyPendingItems','buildTongxueHref','tongxueEntryCopy','buildTongxueSchoolHref'], 'decision contract');
includesAll(css, ['.family-decision-summary','.tongxue-card-entry','min-height:48px','prefers-reduced-motion'], 'family compatibility CSS');
includesAll(workspaceCss, ['.score-band-segmented','.ln-result-workspace-status','.workspace-compare-slot','overflow-anchor: none'], 'workspace orchestration CSS');
includesAll(modeSwitchCss, ['.ui-mode-switch','grid-column:1 / -1','writing-mode:horizontal-tb','container-name:ui-mode-switch','@container ui-mode-switch (max-width:280px)'], 'shared mode-switch CSS');
includesAll(schoolAllCss, ['.school-major-row','.school-all-summary','container-name:school-results','@container school-results (max-width:1040px)','@container school-results (max-width:600px)','@container school-results (max-width:360px)'], 'school-all responsive CSS');
assert.ok(!schoolAllCss.includes('@media (max-width:'), 'school list must not own device breakpoints');
assert.ok(!schoolAllCss.includes('.ui-mode-switch') && !schoolAllCss.includes('.school-view-mode'), 'school result CSS must not own family mode controls');
includesAll(semanticCss, ['.ui-button--compact','.ui-chip--compact','.ui-segmented','writing-mode:horizontal-tb','@media(pointer:coarse)'], 'shared semantic UI');
includesAll(actionContract, ['viewScoreNearby','viewSchoolAllMajors','addSelectedMajor','removeSelectedMajor','inspectDetails',"label:'按我的分数附近看'", "label:'看该校全部招生专业'", "label:'加入已选'", "label:'移出已选'", "expandedLabel:'收起详情'"], 'shared action copy');
includesAll(foundationCss, ['--ui-safe-bottom','env(safe-area-inset-bottom'], 'shared foundation CSS');
includesAll(shellCss, ['.ui-global-header','.ui-family-status','.ui-mobile-nav','family-decision-bar','var(--ui-safe-bottom)','mobile-dirty-bar','pool-entry-toast'], 'shared shell CSS');

assert.equal(zyAlias, zyPage, 'ZY2026 extensionless alias must exactly mirror directory page');
for (const phrase of ['2026投档表首次可见','2026投档表未再单列','2026投档表重新出现']) assert.ok(zyPage.includes(phrase) || zyRuntime.includes(phrase), `ZY2026 missing precise copy ${phrase}`);
includesAll(zyPage, ['zy2026.v3959_0.js?v=3959_0','data-current-release'], 'ZY2026 page');
assert.ok(!zyPage.includes('页面体验版本：v3.9.55.0'), 'ZY2026 must not retain a second visible release owner');
includesAll(zyRuntime, ["first_seen:'2026投档表首次可见'",'不等于教育部新设专业或扩招','不能直接说专业被撤销'], 'ZY2026 runtime');

for (const key of [
  'familyLanguageTrustContract','familyFourStageLanguageContract','familyNextStepHomepageContract',
  'familyDecisionStatusBarContract','familyDecisionCardSummaryContract','familyDecisionTongxueEntityContract',
  'familyDecisionPublicReviewCopyContract','familyDecisionNoRankingInfluenceContract','familyDecisionNoApiPrefetchContract',
  'sharedSchoolResourceContract','sharedSchoolDirectoryLazySingleFlightContract','zy2026RecordLanguageContract',
  'unifiedResourceOwnershipContract','sharedSchoolIdentityOwnerContract','sharedUiOwnershipContract',
  'sharedUiShellContract','sharedUiMobileNavigationContract','sharedUiNoNewObserverContract',
  'sharedUiSingleActionSurfaceContract','quietSelectionFeedbackContract','selectedReviewDistinctRouteContract',
  'algorithmOrchestrationContract','canonicalPositionContract','decisionSnapshotContract',
  'selectionWorkspaceOrchestrationContract','preserveStaleResultsContract','singleScrollOwnerContract',
  'bandSwitchViewOnlyContract','compareSingleLayoutOwnerContract','cardFirstPassPresentationContract',
  'schoolAllModeContract','schoolAllSharedResourceContract','schoolAllEntityIsolationContract',
  'schoolAllScoreInvariantContract','schoolAllMultiTerminalContract','schoolAllSharedSelectionPoolContract',
  'schoolAllSharedUiGovernanceContract','schoolAllFullRowDetailsContract','schoolAllContainerResponsiveContract','schoolAllBrowserMultiTerminalContract',
  'schoolModeStaticMountContract','schoolModeSharedSwitchContract','schoolModeNoRuntimeLayoutInjectionContract','schoolModeRealFilterJourneyContract'
]) {
  assert.equal(release[key], true, `release contract false: ${key}`);
  assert.equal(active[key], true, `active contract false: ${key}`);
}
assert.equal(release.schoolAllModeVersion, 'school-all-mode-v3962_2');
assert.equal(active.schoolAllModeVersion, 'school-all-mode-v3962_2');
assert.equal(release.schoolUiGovernanceVersion, 'school-ui-governance-v3962_2');
assert.equal(active.schoolUiGovernanceVersion, 'school-ui-governance-v3962_2');
assert.equal(release.schoolModeMountVersion, 'school-mode-static-mount-v3962_2');
assert.equal(active.schoolModeMountVersion, 'school-mode-static-mount-v3962_2');
assert.equal(active.structure2026.js, '../zy2026/assets/zy2026.v3959_0.js');
for (const entry of ['js/app.v3961_0.js','js/workspace/selection-workspace-orchestrator.v3961_0.js','js/workspace/family-card-presenter.v3961_0.js','js/feature/school-majors/school-all-mode.v3962_2.js','../shared/ui/shell/family-shell.v3961_0.js','../shared/algorithms/algorithm-registry.js']) assert.ok(active.jsEntry.includes(entry), `active entry missing ${entry}`);
for (const inactive of ['js/app.v3960_0.js','js/ux/family-presentation.v3955_0.js','js/ux/multi-terminal.v3949_4.js','js/ux/compare-workspace.v3953_0.js','js/app.v3951_0.js','js/feature/school-majors/school-all-mode.v3962_0.js','js/feature/school-majors/school-all-mode.v3962_1.js']) assert.ok(!active.jsEntry.includes(inactive), `legacy active entry remains ${inactive}`);
assert.ok(active.cssEntry.includes('../shared/ui/tokens/foundation.v3959_0.css'));
assert.ok(active.cssEntry.includes('../shared/ui/components/mode-switch.v3962_2.css'));
assert.ok(active.cssEntry.includes('../shared/ui/shell/family-shell.v3960_0.css'));
assert.ok(active.cssEntry.includes('css/selection-workspace.v3961_0.css'));
assert.ok(active.cssEntry.includes('css/school-all-mode.v3962_2.css'));
assert.ok(!active.cssEntry.includes('css/school-all-mode.v3962_1.css'));

const { buildTongxueHref, tongxueEntryCopy } = await import('../ln-rank/js/domain/family-decision-contract.v3955_0.js');
const { resolveCardSchoolResource } = await import('../shared/resources/schools/school-resource-center.js');
const panjin = resolveCardSchoolResource(['盘锦校区', '大连理工大学']);
assert.equal(panjin.entityId, 'dlut-panjin');
assert.equal(buildTongxueHref(panjin), '/tongxue/?school=%E5%A4%A7%E8%BF%9E%E7%90%86%E5%B7%A5%E5%A4%A7%E5%AD%A6%EF%BC%88%E7%9B%98%E9%94%A6%E6%A0%A1%E5%8C%BA%EF%BC%89&entity=dlut-panjin');
assert.equal(resolveCardSchoolResource(['辽宁大学']).source, 'ordinary-school-fallback');
assert.equal(tongxueEntryCopy('admission_campus'), '看看这个校区的公开评论');
assert.equal(tongxueEntryCopy('branch_school'), '看看这所分校的公开评论');
assert.equal(tongxueEntryCopy('official_school'), '看看这所学校的公开评论');

console.log('FAMILY_DECISION_V3962_2_OK');

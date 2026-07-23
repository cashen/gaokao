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
const presentation = read('ln-rank/js/ux/family-presentation.v3955_0.js');
const legacyDecisionBar = read('ln-rank/js/ux/family-decision-bar.v3955_0.js');
const sharedShell = read('shared/ui/shell/family-shell.v3960_0.js');
const compatShell = read('shared/ui/shell/family-shell.v3959_0.js');
const home = read('ln-rank/js/ux/family-home.v3955_0.js');
const decisionContract = read('ln-rank/js/domain/family-decision-contract.v3955_0.js');
const schoolCenter = read('shared/resources/schools/school-resource-center.js');
const schoolIdentity = read('shared/resources/schools/school-identity-center.js');
const entityCompat = read('tongxue/data/school-entities-v150.js');
const css = read('ln-rank/css/dist/family-decision-workspace.v3955_0.css');
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
assert.equal(CURRENT_RELEASE.display, 'v3.9.60.0');

includesAll(root, ['辽宁高考家庭决策工作台','先圈出一批可以讨论的专业','近期公开评论','时间只帮助安排节奏','family-shell.v3959_0.js'], 'homepage');
assert.ok(!root.includes('近期真实评论'), 'homepage must not claim real reviews');
assert.ok(!root.includes('id="h2027"') && !root.includes('id="s2027"'), 'homepage must not foreground second-level countdown');
includesAll(home, ['returning','score-ready','继续检查当前家庭方案','继续检查家庭方案','先让孩子确认','2027招生计划'], 'homepage runtime');

includesAll(main, ['确认孩子的位置','说清想看什么','圈出并整理专业','家庭逐项复核','app.v3960_0.js?v=3960_0','family-decision-workspace.v3955_0.css','family-presentation.v3955_0.js',`data-release="${CURRENT_RELEASE.display}"`], 'main flow');
assert.ok(!main.includes('family-decision-bar.v3955_0.js'), 'legacy family bar still active on main');
assert.ok(!main.includes('第一步：模考') && !main.includes('第二步：先看多大范围') && !main.includes('第三步：想看什么方向'), 'old duplicate field step numbering remains');

includesAll(selection, ['id="selected-list"','id="family-review"','检查已选专业','检查真实承接与待确认事项','生成家庭复核报告','其他保存方式','selection-pool.v3960_0.js?v=3960_0','同一算法快照',`data-release="${CURRENT_RELEASE.display}"`], 'selection page');
assert.ok(!selection.includes('family-decision-bar.v3955_0.js'), 'legacy family bar still active on selection');

includesAll(presentation, ['为什么出现','最需要确认','现在还不知道','最低投档位置基本稳定','最低投档所需位次','tongxue-card-entry','公开评论和来源摘要','shared/resources/schools/school-resource-center.js'], 'card presentation');
assert.ok(!presentation.includes('近两年录取位置基本稳定'), 'old visible admission-position copy remains');
assert.ok(!presentation.includes('2026年录取所需位次'), 'old visible admission-rank copy remains');
assert.ok(!presentation.includes('/tongxue/data/school-entities-v150.js'), 'presentation must not bypass shared school center');
assert.ok(!presentation.includes("fetch('/api/tongxue"), 'card layer must not prefetch Tongxue API');

includesAll(schoolCenter, ['isEntitySourceAvailable','directory_resolve_on_open','combinedCampusCandidates','tongxueDirectoryPromise','loadTongxueSchoolDirectory',"from './school-identity-center.js'"], 'shared school center');
assert.ok(schoolIdentity.includes("E('dlut-main','大连理工大学'"), 'Dalian University of Technology main entity missing');
assert.ok(schoolIdentity.includes("E('dlut-panjin','大连理工大学（盘锦校区）'"), 'DUT Panjin entity missing');
assert.ok(entityCompat.includes('shared/resources/schools/school-identity-center.js'), 'Tongxue compatibility export must use shared identity');
assert.ok(!entityCompat.includes("E('dlut-panjin'"), 'Tongxue must not maintain a second entity table');
includesAll(legacyDecisionBar, ['当前家庭方案','data-mobile-selected','data-mobile-pending','lnrank-selection-pool-updated'], 'legacy compatibility bar');
includesAll(sharedShell, ['当前家庭方案','data-ui-mobile-selected','data-ui-mobile-pending','lnrank-selection-pool-updated','resolveFamilyNextAction','query.click()','#selected-list','#family-review'], 'shared family shell');
assert.ok(!sharedShell.includes('MutationObserver'), 'shared shell must not add global observer');
assert.ok(compatShell.includes('family-shell.v3960_0.js'), 'legacy shell must bridge to v3960');
includesAll(decisionContract, ['resolveFamilyNextAction','countFamilyPendingItems','buildTongxueHref','tongxueEntryCopy','buildTongxueSchoolHref'], 'decision contract');
includesAll(css, ['.family-decision-summary','.tongxue-card-entry','min-height:48px','prefers-reduced-motion'], 'family compatibility CSS');
includesAll(foundationCss, ['--ui-safe-bottom','env(safe-area-inset-bottom'], 'shared foundation CSS');
includesAll(shellCss, ['.ui-global-header','.ui-family-status','.ui-mobile-nav','family-decision-bar','var(--ui-safe-bottom)','mobile-dirty-bar','pool-entry-toast'], 'shared shell CSS');

assert.equal(zyAlias, zyPage, 'ZY2026 extensionless alias must exactly mirror directory page');
for (const phrase of ['2026投档表首次可见','2026投档表未再单列','2026投档表重新出现']) assert.ok(zyPage.includes(phrase) || zyRuntime.includes(phrase), `ZY2026 missing precise copy ${phrase}`);
includesAll(zyPage, ['zy2026.v3959_0.js?v=3959_0','页面体验版本：v3.9.55.0'], 'ZY2026 page');
includesAll(zyRuntime, ["first_seen:'2026投档表首次可见'",'不等于教育部新设专业或扩招','不能直接说专业被撤销'], 'ZY2026 runtime');

for (const key of [
  'familyLanguageTrustContract','familyFourStageLanguageContract','familyNextStepHomepageContract',
  'familyDecisionStatusBarContract','familyDecisionCardSummaryContract','familyDecisionTongxueEntityContract',
  'familyDecisionPublicReviewCopyContract','familyDecisionNoRankingInfluenceContract','familyDecisionNoApiPrefetchContract',
  'sharedSchoolResourceContract','sharedSchoolDirectoryLazySingleFlightContract','zy2026RecordLanguageContract',
  'unifiedResourceOwnershipContract','sharedSchoolIdentityOwnerContract','sharedUiOwnershipContract',
  'sharedUiShellContract','sharedUiMobileNavigationContract','sharedUiNoNewObserverContract',
  'sharedUiSingleActionSurfaceContract','quietSelectionFeedbackContract','selectedReviewDistinctRouteContract',
  'algorithmOrchestrationContract','canonicalPositionContract','decisionSnapshotContract'
]) {
  assert.equal(release[key], true, `release contract false: ${key}`);
  assert.equal(active[key], true, `active contract false: ${key}`);
}
assert.equal(active.structure2026.js, '../zy2026/assets/zy2026.v3959_0.js');
assert.ok(active.jsEntry.includes('js/app.v3960_0.js'));
assert.ok(active.jsEntry.includes('js/ux/family-presentation.v3955_0.js'));
assert.ok(active.jsEntry.includes('../shared/ui/shell/family-shell.v3960_0.js'));
assert.ok(active.jsEntry.includes('../shared/algorithms/algorithm-registry.js'));
assert.ok(!active.jsEntry.includes('js/ux/family-decision-bar.v3955_0.js'));
assert.ok(active.cssEntry.includes('../shared/ui/tokens/foundation.v3959_0.css'));
assert.ok(active.cssEntry.includes('../shared/ui/shell/family-shell.v3960_0.css'));
assert.ok(!active.jsEntry.includes('js/app.v3951_0.js'));

const { buildTongxueHref, tongxueEntryCopy } = await import('../ln-rank/js/domain/family-decision-contract.v3955_0.js');
const { resolveCardSchoolResource } = await import('../shared/resources/schools/school-resource-center.js');
const panjin = resolveCardSchoolResource(['盘锦校区', '大连理工大学']);
assert.equal(panjin.entityId, 'dlut-panjin');
assert.equal(buildTongxueHref(panjin), '/tongxue/?school=%E5%A4%A7%E8%BF%9E%E7%90%86%E5%B7%A5%E5%A4%A7%E5%AD%A6%EF%BC%88%E7%9B%98%E9%94%A6%E6%A0%A1%E5%8C%BA%EF%BC%89&entity=dlut-panjin');
assert.equal(resolveCardSchoolResource(['辽宁大学']).source, 'ordinary-school-fallback');
assert.equal(tongxueEntryCopy('admission_campus'), '看看这个校区的公开评论');
assert.equal(tongxueEntryCopy('branch_school'), '看看这所分校的公开评论');
assert.equal(tongxueEntryCopy('official_school'), '看看这所学校的公开评论');

console.log('FAMILY_DECISION_V3960_OK');

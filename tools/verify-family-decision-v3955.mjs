import fs from 'node:fs';
import assert from 'node:assert/strict';

const text = path => fs.readFileSync(path, 'utf8');
const json = path => JSON.parse(text(path));

const root = text('index.html');
const main = text('ln-rank/index.html');
const selection = text('ln-rank/selection-pool.html');
const presentation = text('ln-rank/js/ux/family-presentation.v3955_0.js');
const decisionBar = text('ln-rank/js/ux/family-decision-bar.v3955_0.js');
const home = text('ln-rank/js/ux/family-home.v3955_0.js');
const decisionContract = text('ln-rank/js/domain/family-decision-contract.v3955_0.js');
const schoolCenter = text('shared/resources/schools/school-resource-center.js');
const css = text('ln-rank/css/dist/family-decision-workspace.v3955_0.css');
const zyPage = text('zy2026/index.html');
const zyAlias = text('zy2026.html');
const zyRuntime = text('zy2026/assets/zy2026.v3955_0.js');
const entities = text('tongxue/data/school-entities-v150.js');
const release = json('ln-rank/release-meta.json');
const active = json('ln-rank/active-assets.json');

assert.equal(release.version, 'v3.9.55.0');
assert.equal(active.version, 'v3.9.55.0');
assert.equal(release.assetVersion, 'v3955_0');
assert.equal(active.assetVersion, 'v3955_0');

for (const phrase of ['辽宁高考家庭决策工作台','继续检查当前家庭方案','近期公开评论','时间只帮助安排节奏']) {
  assert.ok(root.includes(phrase), `homepage missing ${phrase}`);
}
assert.ok(!root.includes('近期真实评论'), 'homepage must not claim real reviews');
assert.ok(!root.includes('id="h2027"') && !root.includes('id="s2027"'), 'homepage must not foreground second-level countdown');

for (const phrase of ['确认孩子的位置','说清想看什么','圈出并整理专业','家庭逐项复核']) {
  assert.ok(main.includes(phrase), `main flow missing ${phrase}`);
}
assert.ok(main.includes('app.v3955_0.js?v=3955_0'));
assert.ok(main.includes('family-decision-workspace.v3955_0.css'));
assert.ok(main.includes('family-presentation.v3955_0.js'));
assert.ok(main.includes('family-decision-bar.v3955_0.js'));
assert.ok(main.includes('data-release="v3.9.55.0"'));
assert.ok(!main.includes('第一步：模考') && !main.includes('第二步：先看多大范围') && !main.includes('第三步：想看什么方向'), 'old duplicate field step numbering remains');

for (const phrase of ['检查已选专业','看看当前方案有没有明显偏科','生成家庭复核报告','其他保存方式']) {
  assert.ok(selection.includes(phrase), `selection page missing ${phrase}`);
}
assert.ok(selection.includes('data-release="v3.9.55.0"'));

for (const phrase of ['为什么出现','最需要确认','现在还不知道','最低投档位置基本稳定','最低投档所需位次','tongxue-card-entry','公开评论和来源摘要']) {
  assert.ok(presentation.includes(phrase), `presentation missing ${phrase}`);
}
assert.ok(!presentation.includes('近两年录取位置基本稳定'), 'old visible admission-position copy remains');
assert.ok(!presentation.includes('2026年录取所需位次'), 'old visible admission-rank copy remains');
assert.ok(presentation.includes('shared/resources/schools/school-resource-center.js'), 'shared school resource center not used');
assert.ok(!presentation.includes('/tongxue/data/school-entities-v150.js'), 'presentation must not bypass shared school center');
assert.ok(!presentation.includes("fetch('/api/tongxue"), 'card layer must not prefetch Tongxue API');
assert.ok(schoolCenter.includes('isEntitySourceAvailable'), 'campus unavailable source guard missing');
assert.ok(schoolCenter.includes('directory_resolve_on_open'), 'ordinary school automatic resolution missing');
assert.ok(schoolCenter.includes('combinedCampusCandidates'), 'school plus campus tag resolution missing');
assert.ok(schoolCenter.includes('tongxueDirectoryPromise'), 'lazy single-flight school directory missing');

for (const phrase of ['当前家庭方案','data-mobile-selected','data-mobile-pending','lnrank-selection-pool-updated']) {
  assert.ok(decisionBar.includes(phrase), `decision bar missing ${phrase}`);
}
for (const phrase of ['returning','score-ready','继续检查家庭方案','孩子先确认']) {
  assert.ok(home.includes(phrase), `home runtime missing ${phrase}`);
}
for (const phrase of ['resolveFamilyNextAction','countFamilyPendingItems','buildTongxueHref','tongxueEntryCopy','buildTongxueSchoolHref']) {
  assert.ok(decisionContract.includes(phrase), `decision contract missing ${phrase}`);
}
for (const phrase of ['.family-decision-bar','.family-decision-mobile','.family-decision-summary','.tongxue-card-entry','min-height:48px','prefers-reduced-motion']) {
  assert.ok(css.includes(phrase), `family CSS missing ${phrase}`);
}

assert.equal(zyAlias, zyPage, 'ZY2026 extensionless alias must exactly mirror directory page');
for (const phrase of ['2026投档表首次可见','2026投档表未再单列','2026投档表重新出现']) {
  assert.ok(zyPage.includes(phrase) || zyRuntime.includes(phrase), `ZY2026 missing precise copy ${phrase}`);
}
assert.ok(zyPage.includes('zy2026.v3955_0.js?v=3955_0'));
assert.ok(zyPage.includes('页面体验版本：v3.9.55.0'));
assert.ok(zyRuntime.includes("first_seen:'2026投档表首次可见'"));
assert.ok(zyRuntime.includes('不等于教育部新设专业或扩招'));
assert.ok(zyRuntime.includes('不能直接说专业被撤销'));

assert.ok(entities.includes("E('dlut-main','大连理工大学'"), 'Dalian University of Technology main entity missing');
assert.ok(entities.includes("E('dlut-panjin','大连理工大学（盘锦校区）'"), 'DUT Panjin entity missing');

for (const key of [
  'familyLanguageTrustContract','familyFourStageLanguageContract','familyNextStepHomepageContract',
  'familyDecisionStatusBarContract','familyDecisionCardSummaryContract','familyDecisionTongxueEntityContract',
  'familyDecisionPublicReviewCopyContract','familyDecisionNoRankingInfluenceContract','familyDecisionNoApiPrefetchContract',
  'sharedSchoolResourceContract','sharedSchoolDirectoryLazySingleFlightContract','zy2026RecordLanguageContract'
]) {
  assert.equal(release[key], true, `release contract false: ${key}`);
  assert.equal(active[key], true, `active contract false: ${key}`);
}
assert.equal(active.structure2026.js, '../zy2026/assets/zy2026.v3955_0.js');
assert.ok(active.jsEntry.includes('js/app.v3955_0.js'));
assert.ok(active.jsEntry.includes('js/ux/family-presentation.v3955_0.js'));
assert.ok(active.jsEntry.includes('js/ux/family-decision-bar.v3955_0.js'));
assert.ok(active.cssEntry.includes('css/dist/family-decision-workspace.v3955_0.css'));
assert.ok(!active.jsEntry.includes('js/app.v3951_0.js'));
assert.ok(!active.jsEntry.includes('js/ux/family-presentation.v3952_0.js'));

const { buildTongxueHref, tongxueEntryCopy } = await import('../ln-rank/js/domain/family-decision-contract.v3955_0.js');
const { resolveCardSchoolResource } = await import('../shared/resources/schools/school-resource-center.js');
assert.equal(
  buildTongxueHref({ school: '大连理工大学（盘锦校区）', entityId: 'dlut-panjin' }),
  '/tongxue/?school=%E5%A4%A7%E8%BF%9E%E7%90%86%E5%B7%A5%E5%A4%A7%E5%AD%A6%EF%BC%88%E7%9B%98%E9%94%A6%E6%A0%A1%E5%8C%BA%EF%BC%89&entity=dlut-panjin'
);
assert.equal(resolveCardSchoolResource(['盘锦校区', '大连理工大学']).entityId, 'dlut-panjin');
assert.equal(resolveCardSchoolResource(['辽宁大学']).source, 'ordinary-school-fallback');
assert.equal(tongxueEntryCopy('admission_campus'), '看看这个校区的公开评论');
assert.equal(tongxueEntryCopy('branch_school'), '看看这所分校的公开评论');
assert.equal(tongxueEntryCopy('official_school'), '看看这所学校的公开评论');

console.log('FAMILY_DECISION_V3955_OK');

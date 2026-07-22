import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  LIAONING_PHYSICS_EXAM_CONFIG,
  getLiaoningPhysicsConfig,
  getExamResourceConfig,
  isPublicBottomLineVisible,
  validateExamScore
} from '../shared/resources/exam/liaoning-physics.js';
import {
  REGION_OPTIONS,
  REGION_GROUPS,
  matchRegionRule,
  normalizeProvinceName
} from '../shared/resources/geo/china-region-catalog.js';
import {
  resolveCompactSchoolResource,
  resolveCardSchoolResource,
  buildTongxueSchoolHref,
  SCHOOL_RESOURCE_PATHS
} from '../shared/resources/schools/school-resource-center.js';
import {
  SHARED_RESOURCE_CENTER_VERSION,
  SHARED_RESOURCE_REGISTRY
} from '../shared/resources/resource-registry.js';

const read = path => fs.readFileSync(path, 'utf8');
const json = path => JSON.parse(read(path));

assert.equal(SHARED_RESOURCE_CENTER_VERSION, 'v3955_0');
assert.equal(LIAONING_PHYSICS_EXAM_CONFIG.dataYear, 2026);
assert.equal(LIAONING_PHYSICS_EXAM_CONFIG.audienceYear, 2027);
assert.equal(LIAONING_PHYSICS_EXAM_CONFIG.specialControlScore, 508);
assert.equal(LIAONING_PHYSICS_EXAM_CONFIG.undergraduateControlScore, 344);
assert.equal(LIAONING_PHYSICS_EXAM_CONFIG.vocationalControlScore, 150);
assert.equal(getLiaoningPhysicsConfig(2025).specialControlScore, 515);
assert.equal(getExamResourceConfig({ year: 2026, region: '辽宁', subject: '物理类' }).supported, true);
assert.equal(isPublicBottomLineVisible(344), true);
assert.equal(isPublicBottomLineVisible(508), true);
assert.equal(isPublicBottomLineVisible(343), false);
assert.equal(validateExamScore(149).key, 'belowVocational');
assert.equal(validateExamScore(343).key, 'belowUndergraduate');
assert.equal(validateExamScore(500).key, 'underSpecial');

assert.equal(REGION_OPTIONS[0].key, 'all');
assert.deepEqual(REGION_GROUPS.jiangzhehu, ['江苏', '浙江', '上海']);
assert.equal(normalizeProvinceName('广西壮族自治区'), '广西');
assert.equal(matchRegionRule({ province: '浙江省' }, 'jiangzhehu'), true);
assert.equal(matchRegionRule({ province: '辽宁省', city: '沈阳市' }, 'shenyang'), true);
assert.equal(matchRegionRule({ province: '山东省' }, 'ln'), false);

const panjin = resolveCompactSchoolResource('大连理工大学盘锦校区');
assert.equal(panjin.entityId, 'dlut-panjin');
assert.equal(panjin.school, '大连理工大学（盘锦校区）');
assert.equal(resolveCardSchoolResource(['盘锦校区', '大连理工大学']).entityId, 'dlut-panjin');
const liaoning = resolveCompactSchoolResource('辽宁大学');
assert.equal(liaoning.entityId, '');
assert.equal(liaoning.source, 'ordinary-school-fallback');
assert.equal(
  buildTongxueSchoolHref(panjin),
  '/tongxue/?school=%E5%A4%A7%E8%BF%9E%E7%90%86%E5%B7%A5%E5%A4%A7%E5%AD%A6%EF%BC%88%E7%9B%98%E9%94%A6%E6%A0%A1%E5%8C%BA%EF%BC%89&entity=dlut-panjin'
);
assert.equal(SCHOOL_RESOURCE_PATHS.tongxueDirectoryData, '/tongxue/data/school-search-index.20260617-v150.json');
assert.equal(SHARED_RESOURCE_REGISTRY.schools.fullDirectoryPolicy, 'lazy-single-flight');

const examAdapter = read('functions/_lib/exam-year-config.js');
const scoreGuard = read('ln-rank/js/core/score-guard.js');
const candidateContext = read('ln-rank/js/feature/selection-pool/candidate-context.js');
const yearCaliber = read('functions/_lib/kb/year-caliber-kb.generated.js');
const regionOptions = read('ln-rank/js/config/region-options.js');
const regionRules = read('functions/_lib/region-rules.js');
const appWrapper = read('ln-rank/js/app.v3955_0.js');
const mainPage = read('ln-rank/index.html');
const familyPresentation = read('ln-rank/js/ux/family-presentation.v3955_0.js');
const familyContract = read('ln-rank/js/domain/family-decision-contract.v3955_0.js');
const schoolCenter = read('shared/resources/schools/school-resource-center.js');

for (const [name, source] of [
  ['exam adapter', examAdapter],
  ['score guard', scoreGuard],
  ['candidate context', candidateContext],
  ['AI year caliber', yearCaliber]
]) {
  assert.ok(source.includes('shared/resources/exam/liaoning-physics.js'), `${name} bypasses shared exam resource`);
}
assert.ok(regionOptions.includes('shared/resources/geo/china-region-catalog.js'));
assert.ok(regionRules.includes('shared/resources/geo/china-region-catalog.js'));
assert.ok(mainPage.includes('/ln-rank/js/app.v3955_0.js?v=3955_0'));
assert.ok(!mainPage.includes('/ln-rank/js/app.v3951_0.js?v=3955_0'));
assert.ok(appWrapper.includes("await import('./app.v3951_0.js?v=3951_0')"));
assert.ok(appWrapper.includes("url.pathname !== '/api/major-bands'"));
assert.ok(appWrapper.includes("url.searchParams.set('bottomLineMode', visible ? selectedMode : 'all')"));
assert.ok(appWrapper.includes('isPublicBottomLineVisible'));
assert.ok(familyPresentation.includes('shared/resources/schools/school-resource-center.js'));
assert.ok(!familyPresentation.includes('/tongxue/data/school-entities-v150.js'));
assert.ok(familyContract.includes('buildTongxueSchoolHref'));
assert.ok(schoolCenter.includes('let tongxueDirectoryPromise = null'));
assert.ok(schoolCenter.includes('if (!tongxueDirectoryPromise)'));
assert.ok(schoolCenter.includes("import('../../../tongxue/data/school-name-resolver-v150.js')"));
assert.ok(!schoolCenter.includes("fetch('/api/tongxue"));

const forbiddenLiteralChecks = [
  ['functions/_lib/exam-year-config.js', /specialControlScore\s*:\s*508|undergraduateControlScore\s*:\s*344/],
  ['ln-rank/js/core/score-guard.js', /(?:SPECIAL_CONTROL_SCORE|UNDERGRADUATE_CONTROL_SCORE|VOCATIONAL_CONTROL_SCORE)\s*=\s*(?:508|344|150)/],
  ['ln-rank/js/feature/selection-pool/candidate-context.js', /(?:specialControlScore|undergraduateControlScore|vocationalControlScore)\s*:\s*Number\([^\n]*(?:508|344|150)/],
  ['functions/_lib/kb/year-caliber-kb.generated.js', /(?:specialControlLine|undergraduateLine|vocationalLine)\s*:\s*(?:508|344|150)/]
];
for (const [path, pattern] of forbiddenLiteralChecks) {
  assert.ok(!pattern.test(read(path)), `${path} redefines shared control-line facts`);
}

assert.equal(read('ln-rank/js/config/region-options.js').trim().split('\n').length <= 2, true);
assert.equal(read('functions/_lib/region-rules.js').trim().split('\n').length <= 8, true);

const release = json('ln-rank/release-meta.json');
const active = json('ln-rank/active-assets.json');
for (const meta of [release, active]) {
  assert.equal(meta.sharedResourceCenterContract, true);
  assert.equal(meta.sharedExamResourceContract, true);
  assert.equal(meta.sharedRegionResourceContract, true);
  assert.equal(meta.sharedSchoolResourceContract, true);
  assert.equal(meta.sharedSchoolDirectoryLazySingleFlightContract, true);
  assert.equal(meta.sharedResourceCenterVersion, 'v3955_0');
}
assert.equal(active.mainJs, 'js/app.v3955_0.js');
assert.ok(active.jsEntry.includes('js/app.v3955_0.js'));
assert.ok(!active.jsEntry.includes('js/app.v3951_0.js'));

console.log('SHARED_RESOURCE_CENTER_V3955_OK');

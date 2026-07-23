import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  LIAONING_PHYSICS_EXAM_CONFIG,
  getLiaoningPhysicsConfig,
  getExamResourceConfig,
  isPublicBottomLineVisible,
  validateExamScore
} from '../shared/resources/exam/liaoning-physics.js';
import { REGION_OPTIONS, REGION_GROUPS, matchRegionRule, normalizeProvinceName } from '../shared/resources/geo/china-region-catalog.js';
import { resolveCompactSchoolResource, resolveCardSchoolResource, buildTongxueSchoolHref, SCHOOL_RESOURCE_PATHS } from '../shared/resources/schools/school-resource-center.js';
import { FEISHU_REPORT_CONTRACT, FEISHU_REPORT_ROUTES, validateFeishuCandidateScore } from '../shared/resources/reports/feishu-report-contract.js';
import { SHARED_RESOURCE_CENTER_VERSION, SHARED_RESOURCE_REGISTRY } from '../shared/resources/resource-registry.js';

const read = file => fs.readFileSync(file, 'utf8');
const json = file => JSON.parse(read(file));
assert.equal(SHARED_RESOURCE_CENTER_VERSION, 'v3956_0');
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
assert.equal(buildTongxueSchoolHref(panjin), '/tongxue/?school=%E5%A4%A7%E8%BF%9E%E7%90%86%E5%B7%A5%E5%A4%A7%E5%AD%A6%EF%BC%88%E7%9B%98%E9%94%A6%E6%A0%A1%E5%8C%BA%EF%BC%89&entity=dlut-panjin');
assert.equal(SCHOOL_RESOURCE_PATHS.tongxueDirectoryData, '/tongxue/data/school-search-index.20260617-v150.json');
assert.equal(SHARED_RESOURCE_REGISTRY.schools.fullDirectoryPolicy, 'lazy-single-flight');

assert.equal(FEISHU_REPORT_CONTRACT.dataYear, 2026);
assert.equal(FEISHU_REPORT_CONTRACT.audienceYear, 2027);
assert.equal(FEISHU_REPORT_ROUTES.currentBand, '/api/feishu-create-report');
assert.equal(FEISHU_REPORT_ROUTES.selectionPool, '/api/feishu-create-selection-pool-report');
assert.equal(validateFeishuCandidateScore(580).valid, true);
assert.equal(validateFeishuCandidateScore(149).valid, false);
assert.equal(SHARED_RESOURCE_REGISTRY.reports.policy, 'single-source-contract-and-client');

const adapters = [
  ['functions/_lib/exam-year-config.js', 'shared/resources/exam/liaoning-physics.js'],
  ['ln-rank/js/core/score-guard.js', 'shared/resources/exam/liaoning-physics.js'],
  ['ln-rank/js/feature/selection-pool/candidate-context.js', 'shared/resources/exam/liaoning-physics.js'],
  ['functions/_lib/kb/year-caliber-kb.generated.js', 'shared/resources/exam/liaoning-physics.js'],
  ['ln-rank/js/config/region-options.js', 'shared/resources/geo/china-region-catalog.js'],
  ['functions/_lib/region-rules.js', 'shared/resources/geo/china-region-catalog.js'],
  ['ln-rank/js/ux/family-presentation.v3955_0.js', 'shared/resources/schools/school-resource-center.js'],
  ['ln-rank/js/shared/feishu-api-client.v3956_0.js', 'shared/resources/reports/feishu-report-contract.js'],
  ['functions/_lib/report-data-service-v3956.js', 'shared/resources/reports/feishu-report-contract.js']
];
for (const [file, marker] of adapters) assert.ok(read(file).includes(marker), `${file} bypasses shared resource ${marker}`);

const mainPage = read('ln-rank/index.html');
const appWrapper = read('ln-rank/js/app.v3956_0.js');
const schoolCenter = read('shared/resources/schools/school-resource-center.js');
assert.ok(mainPage.includes('/ln-rank/js/app.v3956_0.js?v=3956_0'));
assert.ok(!mainPage.includes('/ln-rank/js/app.v3951_0.js?v=3956_0'));
assert.ok(appWrapper.includes("await import('./app.v3951_0.js?v=3956_0')"));
assert.ok(appWrapper.includes("url.pathname !== '/api/major-bands'"));
assert.ok(!read('ln-rank/js/app.v3951_0.js').includes('SPECIAL_CONTROL_SCORE'), 'active main core control lines are duplicated');
assert.ok(schoolCenter.includes('let tongxueDirectoryPromise = null'));
assert.ok(!schoolCenter.includes("fetch('/api/tongxue"));

for (const file of ['ln-rank/js/feature/feishu/report-api.v3956_0.js','ln-rank/js/feature/selection-pool/feishu-report-api.v3956_0.js']) {
  const source = read(file);
  assert.ok(source.includes('FEISHU_REPORT_ROUTES'));
  assert.ok(!source.includes("fetch('/api/feishu"));
}
for (const file of ['functions/api/feishu-create-report.js','functions/api/feishu-create-selection-pool-report.js']) {
  const source = read(file);
  assert.ok(source.includes('createFeishuReportResponse'));
  assert.ok(!source.includes('getTenantAccessToken'));
}

const forbiddenLiteralChecks = [
  ['functions/_lib/exam-year-config.js', /specialControlScore\s*:\s*508|undergraduateControlScore\s*:\s*344/],
  ['ln-rank/js/core/score-guard.js', /(?:SPECIAL_CONTROL_SCORE|UNDERGRADUATE_CONTROL_SCORE|VOCATIONAL_CONTROL_SCORE)\s*=\s*(?:508|344|150)/],
  ['ln-rank/js/feature/selection-pool/candidate-context.js', /(?:specialControlScore|undergraduateControlScore|vocationalControlScore)\s*:\s*Number\([^\n]*(?:508|344|150)/],
  ['functions/_lib/kb/year-caliber-kb.generated.js', /(?:specialControlLine|undergraduateLine|vocationalLine)\s*:\s*(?:508|344|150)/]
];
for (const [file, pattern] of forbiddenLiteralChecks) assert.ok(!pattern.test(read(file)), `${file} redefines shared control-line facts`);
assert.ok(read('ln-rank/js/config/region-options.js').trim().split('\n').length <= 2);
assert.ok(read('functions/_lib/region-rules.js').trim().split('\n').length <= 8);

for (const meta of [json('ln-rank/release-meta.json'), json('ln-rank/active-assets.json')]) {
  for (const key of ['sharedResourceCenterContract','sharedExamResourceContract','sharedRegionResourceContract','sharedSchoolResourceContract','sharedSchoolDirectoryLazySingleFlightContract','feishuSharedResourceContract']) assert.equal(meta[key], true, `missing ${key}`);
  assert.equal(meta.sharedResourceCenterVersion, 'v3956_0');
}
console.log('SHARED_RESOURCE_CENTER_V3956_OK');

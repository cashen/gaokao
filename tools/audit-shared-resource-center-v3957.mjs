import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  LIAONING_PHYSICS_EXAM_CONFIG,
  getLiaoningPhysicsConfig,
  getExamResourceConfig,
  isPublicBottomLineVisible,
  validateExamScore
} from '../shared/resources/exam/liaoning-physics.js';
import { REGION_OPTIONS, REGION_GROUPS, deriveRegionGroups, matchRegionRule, normalizeProvinceName, getLiaoningAreaLabel } from '../shared/resources/geo/china-region-catalog.js';
import { resolveCompactSchoolResource, resolveCardSchoolResource, buildTongxueSchoolHref, SCHOOL_RESOURCE_PATHS } from '../shared/resources/schools/school-resource-center.js';
import { getSchoolEntity } from '../shared/resources/schools/school-identity-center.js';
import { SCHOOL_PROFILE_SOURCE_META, resolveSchoolProfile } from '../shared/resources/schools/school-profile-center.js';
import { MAJOR_CATALOG_RESOURCE_CONTRACT, createMajorCatalogResolver } from '../shared/resources/majors/major-catalog-contract.js';
import { CURRENT_RELEASE } from '../shared/resources/release/current-release.js';
import { FEISHU_REPORT_CONTRACT, FEISHU_REPORT_ROUTES, validateFeishuCandidateScore } from '../shared/resources/reports/feishu-report-contract.js';
import { SHARED_RESOURCE_CENTER_VERSION, SHARED_RESOURCE_REGISTRY } from '../shared/resources/resource-registry.js';
import { UI_ORCHESTRATION_VERSION, UI_PAGE_REGISTRY } from '../shared/ui/ui-registry.js';
import { STANDARD_MAJOR_CATALOG_2026_FULL, STANDARD_MAJOR_CATEGORIES_2026_FULL } from '../functions/_lib/kb/standard-major-catalog-2026-full.generated.js';

const read = file => fs.readFileSync(file, 'utf8');
const json = file => JSON.parse(read(file));
assert.equal(SHARED_RESOURCE_CENTER_VERSION, CURRENT_RELEASE.assetVersion);
assert.equal(UI_ORCHESTRATION_VERSION, 'v3959_0');
assert.equal(Object.keys(UI_PAGE_REGISTRY).length, 6);
assert.equal(SHARED_RESOURCE_REGISTRY.ui.policy, 'single-ui-language-shell-state-and-responsive-contract');
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

assert.equal(REGION_OPTIONS[0].key, 'all');
assert.deepEqual(REGION_GROUPS.jiangzhehu, ['江苏', '浙江', '上海']);
assert.equal(normalizeProvinceName('广西壮族自治区'), '广西');
assert.equal(getLiaoningAreaLabel({ province: '辽宁省', city: '盘锦市' }), '辽宁其他');
assert.ok(deriveRegionGroups({ province: '辽宁省', city: '盘锦市' }).includes('ln-other'));
assert.equal(matchRegionRule({ province: '浙江省' }, 'jiangzhehu'), true);
assert.equal(matchRegionRule({ province: '辽宁省', city: '沈阳市' }, 'shenyang'), true);
assert.equal(matchRegionRule({ province: '山东省' }, 'ln'), false);

const panjinLink = resolveCompactSchoolResource('大连理工大学盘锦校区');
assert.equal(panjinLink.entityId, 'dlut-panjin');
assert.equal(getSchoolEntity('dlut-panjin')?.parentEntityId, 'dlut-main');
assert.equal(resolveCardSchoolResource(['盘锦校区', '大连理工大学']).entityId, 'dlut-panjin');
assert.equal(buildTongxueSchoolHref(panjinLink), '/tongxue/?school=%E5%A4%A7%E8%BF%9E%E7%90%86%E5%B7%A5%E5%A4%A7%E5%AD%A6%EF%BC%88%E7%9B%98%E9%94%A6%E6%A0%A1%E5%8C%BA%EF%BC%89&entity=dlut-panjin');
assert.equal(SCHOOL_RESOURCE_PATHS.tongxueDirectoryData, '/tongxue/data/school-search-index.20260617-v150.json');
assert.equal(SCHOOL_RESOURCE_PATHS.sharedSchoolIdentity, '/shared/resources/schools/school-identity-center.js');
assert.equal(SHARED_RESOURCE_REGISTRY.schools.fullDirectoryPolicy, 'lazy-single-flight');
assert.equal(SHARED_RESOURCE_REGISTRY.schools.profilePolicy, 'server-sync-official-2026');
assert.equal(SHARED_RESOURCE_REGISTRY.schools.identityPolicy, 'shared-upstream-tongxue-compatibility-export');

assert.equal(SCHOOL_PROFILE_SOURCE_META.count, 2952);
assert.equal(SCHOOL_PROFILE_SOURCE_META.privateCount, 840);
assert.equal(SCHOOL_PROFILE_SOURCE_META['985MatchedCount'], 38);
assert.equal(SCHOOL_PROFILE_SOURCE_META['211MatchedCount'], 112);
const shenzhen = resolveSchoolProfile('深圳大学');
assert.equal(shenzhen.natureType, 'public');
assert.equal(shenzhen.isNon985211, true);
assert.equal(shenzhen.displayLocation, '广东 · 深圳');
const privateSchool = resolveSchoolProfile('三亚学院');
assert.equal(privateSchool.natureType, 'private');
assert.equal(privateSchool.isNon985211, true);
const military985 = resolveSchoolProfile('国防科技大学');
assert.equal(military985.is985, true);
assert.equal(military985.is211, true);
assert.equal(military985.displayLocation, '湖南 · 长沙');
const military211 = resolveSchoolProfile('第四军医大学');
assert.equal(military211.is985, false);
assert.equal(military211.is211, true);
assert.equal(military211.displayLocation, '陕西 · 西安');

const majorResolver = createMajorCatalogResolver(STANDARD_MAJOR_CATALOG_2026_FULL, STANDARD_MAJOR_CATEGORIES_2026_FULL);
assert.equal(MAJOR_CATALOG_RESOURCE_CONTRACT.canonicalCount, 883);
assert.equal(majorResolver.count, 883);
assert.equal(majorResolver.resolve('机械设计制造及其自动化(中外合作办学)')?.item?.code, '080202');
assert.equal(majorResolver.resolve('计算机类')?.kind, 'category');
assert.equal(SHARED_RESOURCE_REGISTRY.majors.policy, 'single-resolver-derived-runtime-formats');

assert.equal(FEISHU_REPORT_CONTRACT.releaseVersion, CURRENT_RELEASE.display);
assert.equal(FEISHU_REPORT_CONTRACT.assetVersion, CURRENT_RELEASE.assetVersion);
assert.equal(FEISHU_REPORT_CONTRACT.dataYear, 2026);
assert.equal(FEISHU_REPORT_ROUTES.currentBand, '/api/feishu-create-report');
assert.equal(FEISHU_REPORT_ROUTES.selectionPool, '/api/feishu-create-selection-pool-report');
assert.equal(validateFeishuCandidateScore(580).valid, true);
assert.equal(SHARED_RESOURCE_REGISTRY.reports.policy, 'single-source-contract-and-client');
assert.equal(SHARED_RESOURCE_REGISTRY.release.policy, 'single-source-release-contract');

const adapters = [
  ['functions/_lib/release-contract.js', 'shared/resources/release/current-release.js'],
  ['ln-rank/js/domain/version-contract.js', 'shared/resources/release/current-release.js'],
  ['functions/_lib/exam-year-config.js', 'shared/resources/exam/liaoning-physics.js'],
  ['ln-rank/js/core/score-guard.js', 'shared/resources/exam/liaoning-physics.js'],
  ['ln-rank/js/feature/selection-pool/candidate-context.js', 'shared/resources/exam/liaoning-physics.js'],
  ['functions/_lib/kb/year-caliber-kb.generated.js', 'shared/resources/exam/liaoning-physics.js'],
  ['ln-rank/js/config/region-options.js', 'shared/resources/geo/china-region-catalog.js'],
  ['functions/_lib/region-rules.js', 'shared/resources/geo/china-region-catalog.js'],
  ['functions/_lib/location-normalizer.js', 'shared/resources/geo/china-region-catalog.js'],
  ['functions/_lib/school-geo-db.js', 'shared/resources/geo/china-region-catalog.js'],
  ['ln-rank/js/ux/family-presentation.v3955_0.js', 'shared/resources/schools/school-resource-center.js'],
  ['functions/_lib/school-tags.js', 'shared/resources/schools/school-profile-center.js'],
  ['functions/_lib/location-normalizer.js', 'shared/resources/schools/school-profile-center.js'],
  ['functions/_lib/school-display-tags.js', 'shared/resources/schools/school-profile-center.js'],
  ['functions/_lib/bottomline-policy.js', 'shared/resources/schools/school-profile-center.js'],
  ['functions/_lib/standard-major-mapper.js', 'shared/resources/majors/major-catalog-contract.js'],
  ['functions/_lib/kb/catalog-accessor.js', 'shared/resources/majors/major-catalog-contract.js'],
  ['ln-rank/js/knowledge/major-understanding-resolver.js', 'shared/resources/majors/major-catalog-contract.js'],
  ['ln-rank/js/shared/feishu-api-client.v3956_0.js', 'shared/resources/reports/feishu-report-contract.js'],
  ['functions/_lib/report-data-service-v3956.js', 'shared/resources/reports/feishu-report-contract.js'],
  ['ln-rank/js/app.v3959_0.js', 'shared/ui/shell/family-shell.v3959_0.js'],
  ['ln-rank/js/selection-pool.v3959_0.js', 'shared/ui/shell/family-shell.v3959_0.js'],
  ['ln-rank/js/major-difficulty-2026.v3959_0.js', 'shared/ui/shell/family-shell.v3959_0.js'],
  ['zy2026/assets/zy2026.v3959_0.js', 'shared/ui/shell/family-shell.v3959_0.js'],
  ['tongxue/app/tongxue-performance-v156.js', 'shared/ui/shell/family-shell.v3959_0.js']
];
for (const [file, marker] of adapters) assert.ok(read(file).includes(marker), `${file} bypasses shared resource ${marker}`);

const mainPage = read('ln-rank/index.html');
const appWrapper = read('ln-rank/js/app.v3959_0.js');
const schoolLinkCenter = read('shared/resources/schools/school-resource-center.js');
assert.ok(mainPage.includes('/ln-rank/js/app.v3959_0.js?v=3959_0'));
assert.ok(!mainPage.includes('/ln-rank/js/app.v3951_0.js?v=3959_0'));
assert.ok(appWrapper.includes("await import('./app.v3951_0.js?v=3959_0')"));
assert.ok(appWrapper.includes("url.pathname !== '/api/major-bands'"));
assert.ok(!read('ln-rank/js/app.v3951_0.js').includes('SPECIAL_CONTROL_SCORE'));
assert.ok(schoolLinkCenter.includes('let tongxueDirectoryPromise = null'));
assert.ok(!schoolLinkCenter.includes("fetch('/api/tongxue"));

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
  ['ln-rank/js/feature/selection-pool/candidate-context.js', /(?:specialControlScore|undergraduateControlScore|vocationalControlScore)\s*:\s*Number\([^\n]*(?:508|344|150)/]
];
for (const [file, pattern] of forbiddenLiteralChecks) assert.ok(!pattern.test(read(file)), `${file} redefines shared control-line facts`);
assert.ok(!read('functions/_lib/school-tags.js').includes("'大连理工大学':"), 'school tier table is duplicated outside shared center');

for (const meta of [json('ln-rank/release-meta.json'), json('ln-rank/active-assets.json')]) {
  assert.equal(meta.version, CURRENT_RELEASE.display);
  assert.equal(meta.assetVersion, CURRENT_RELEASE.assetVersion);
  for (const key of [
    'sharedResourceCenterContract','sharedExamResourceContract','sharedRegionResourceContract',
    'sharedSchoolResourceContract','sharedSchoolDirectoryLazySingleFlightContract','feishuSharedResourceContract',
    'sharedSchoolProfileContract','schoolProfileOfficial2026Contract','schoolProfileNatureContract',
    'schoolProfile985211Contract','schoolProfileDoubleNonContract','schoolProfileCampusInheritanceContract',
    'schoolProfileCardAlwaysVisibleContract','schoolProfileSelectionPoolContract','unifiedResourceOwnershipContract',
    'sharedReleaseOwnerContract','singleMoeSchoolBuildContract','sharedSchoolIdentityOwnerContract',
    'sharedMajorCatalogResolverContract','sharedRegionDerivationContract','sharedSchoolNaturePriorityContract',
    'sharedUiOwnershipContract','sharedUiShellContract','sharedUiSixPageAdapterContract'
  ]) assert.equal(meta[key], true, `missing ${key}`);
  assert.equal(meta.sharedResourceCenterVersion, CURRENT_RELEASE.assetVersion);
}
console.log('SHARED_RESOURCE_AND_UI_CENTER_V3959_OK');

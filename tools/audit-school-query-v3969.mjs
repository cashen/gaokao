import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  createSchoolNameResolver,
  extractSchoolRecords
} from '../tongxue/data/school-name-resolver-v150.js';
import { createEntityAwareResolver } from '../shared/resources/schools/school-identity-center.js';
import {
  resolveUnifiedSchoolQuery,
  acceptedAdmissionSchoolNames
} from '../shared/resources/schools/school-query-engine.v3969_0.js';
import {
  SCHOOL_QUERY_CONTRACT_VERSION,
  SCHOOL_QUERY_POLICY,
  SCHOOL_QUERY_STATUSES
} from '../shared/resources/schools/school-query-contract.v3969_0.js';
import { CURRENT_RELEASE } from '../shared/resources/release/current-release.js';
import { LN_RANK_RUNTIME_CACHE_CONTRACT } from '../shared/resources/release/runtime-cache-contract.v3969_0.js';
import {
  RESOURCE_EXECUTION_VERSION,
  RESOURCE_EXECUTION_REGISTRY
} from '../shared/governance/resource-execution-contract.v3969_0.js';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const json = file => JSON.parse(read(file));

const directoryPayload = json('tongxue/data/school-search-index.20260617-v150.json');
const admissionDirectory = json('shared/resources/schools/liaoning-2026-admission-school-directory.v3969_0.json');
const baseResolver = createSchoolNameResolver(extractSchoolRecords(directoryPayload));
const resolver = createEntityAwareResolver(baseResolver, baseResolver.metadata);

assert.equal(CURRENT_RELEASE.display, 'v3.9.69.0');
assert.equal(CURRENT_RELEASE.assetVersion, 'v3969_0');
assert.equal(CURRENT_RELEASE.schoolQueryVersion, SCHOOL_QUERY_CONTRACT_VERSION);
assert.equal(CURRENT_RELEASE.schoolAdmissionDirectoryVersion, admissionDirectory.version);
assert.equal(CURRENT_RELEASE.resourceExecutionVersion, RESOURCE_EXECUTION_VERSION);
assert.equal(LN_RANK_RUNTIME_CACHE_CONTRACT.version, 'runtime-cache-coherence-v3969_0');
assert.equal(RESOURCE_EXECUTION_REGISTRY.schoolQuery.owner, '/shared/resources/schools/school-query-contract.v3969_0.js');
assert.equal(SCHOOL_QUERY_POLICY.noSilentTruncation, true);
assert.equal(SCHOOL_QUERY_POLICY.requireInterpretationForRegionNameCollision, true);

assert.equal(admissionDirectory.contractVersion, SCHOOL_QUERY_CONTRACT_VERSION);
assert.equal(admissionDirectory.generatorVersion, 'school-admission-directory-builder-v3969_0');
assert.equal(admissionDirectory.dataYear, 2026);
assert.equal(admissionDirectory.admissionRecordCount, 11628);
assert.ok(admissionDirectory.schoolCount >= 900, `school count ${admissionDirectory.schoolCount}`);
assert.equal(admissionDirectory.schools.length, admissionDirectory.schoolCount);
assert.ok(admissionDirectory.sourceHash?.length === 64, 'source hash missing');

const schoolByName = new Map(admissionDirectory.schools.map(row => [row.officialName, row]));
for (const required of ['沈阳化工大学', '辽宁大学', '东北大学', '中国医科大学', '沈阳工业大学', '沈阳工学院']) {
  assert.ok(schoolByName.has(required), `admission directory missing ${required}`);
}

for (const row of admissionDirectory.schools) {
  assert.ok(row.officialName, 'empty official school name');
  assert.ok(Array.isArray(row.admissionNames) && row.admissionNames.length, `admission names missing ${row.officialName}`);
  assert.ok(Number(row.recordCount2026) > 0, `record count missing ${row.officialName}`);
  assert.equal(row.hasLiaoningPhysics2026Records, true, `availability flag ${row.officialName}`);
}

const exactCases = [
  ['辽大', '辽宁大学'],
  ['沈航', '沈阳航空航天大学'],
  ['沈工大', '沈阳工业大学'],
  ['沈建', '沈阳建筑大学'],
  ['辽石化', '辽宁石油化工大学'],
  ['大工', '大连理工大学'],
  ['东财', '东北财经大学']
];
for (const [query, expected] of exactCases) {
  const result = resolveUnifiedSchoolQuery({ query, resolver, admissionDirectory, limit: 500 });
  assert.equal(result.status, SCHOOL_QUERY_STATUSES.RESOLVED, `${query}: ${result.status}`);
  assert.equal(result.resolvedSchool?.officialName, expected, `${query}: ${result.resolvedSchool?.officialName}`);
  assert.ok(acceptedAdmissionSchoolNames(result).size > 0, `${query}: accepted names empty`);
}

const shenyang = resolveUnifiedSchoolQuery({
  query: '沈阳',
  resolver,
  admissionDirectory,
  limit: 500
});
assert.equal(shenyang.status, SCHOOL_QUERY_STATUSES.AMBIGUOUS);
assert.equal(shenyang.ambiguityType, 'region-or-school-name');
assert.equal(shenyang.interpretations.length, 2);
const regionGroup = shenyang.interpretations.find(item => item.intent === 'region');
const nameGroup = shenyang.interpretations.find(item => item.intent === 'school-name');
assert.ok(regionGroup, '沈阳 region interpretation missing');
assert.ok(nameGroup, '沈阳 school-name interpretation missing');
assert.equal(regionGroup.total, regionGroup.candidates.length, '沈阳 region candidates silently truncated');
assert.equal(nameGroup.total, nameGroup.candidates.length, '沈阳 name candidates silently truncated');
assert.equal(regionGroup.pagination.hasMore, false, '沈阳 region has hidden candidates');
assert.equal(nameGroup.pagination.hasMore, false, '沈阳 name has hidden candidates');
const regionNames = new Set(regionGroup.candidates.map(item => item.officialName));
const nameNames = new Set(nameGroup.candidates.map(item => item.officialName));
for (const expected of ['沈阳化工大学', '辽宁大学', '东北大学', '中国医科大学']) {
  assert.ok(regionNames.has(expected), `沈阳 region missing ${expected}`);
}
assert.ok(nameNames.has('沈阳化工大学'), '沈阳 name group missing 沈阳化工大学');
assert.ok(regionGroup.total > 8, `沈阳 region coverage unexpectedly small: ${regionGroup.total}`);
assert.ok(nameGroup.total > 8, `沈阳 name coverage unexpectedly small: ${nameGroup.total}`);

for (const city of ['大连', '北京', '上海', '南京', '西安', '哈尔滨', '长春', '武汉', '广州', '深圳']) {
  const result = resolveUnifiedSchoolQuery({ query: city, resolver, admissionDirectory, limit: 500 });
  assert.ok([
    SCHOOL_QUERY_STATUSES.AMBIGUOUS,
    SCHOOL_QUERY_STATUSES.CANDIDATES,
    SCHOOL_QUERY_STATUSES.RESOLVED,
    SCHOOL_QUERY_STATUSES.NOT_AVAILABLE
  ].includes(result.status), `${city}: unexpected ${result.status}`);
  for (const group of result.interpretations || []) {
    assert.equal(group.total, group.candidates.length, `${city}/${group.intent}: silently truncated`);
    assert.equal(group.pagination.hasMore, false, `${city}/${group.intent}: hidden candidates`);
  }
}

const activeConsumers = {
  'functions/api/school-majors.js': [
    'school-query-provider.v3969.js',
    'SCHOOL_QUERY_CONTRACT_VERSION',
    'school_query_requires_choice'
  ],
  'functions/api/major-bands.js': [
    'school-query-provider.v3969.js',
    'SCHOOL_QUERY_CONTRACT_VERSION',
    'school_query_requires_choice'
  ],
  'functions/_lib/report-data-service-v3956.js': [
    'school-query-provider.v3969.js',
    'acceptedAdmissionSchoolNames'
  ],
  'ln-rank/js/feature/school-majors/school-all-mode.v3969_0.js': [
    'region-or-school-name',
    '招生记录数量只作说明',
    'school_query_requires_choice'
  ]
};
for (const [file, markers] of Object.entries(activeConsumers)) {
  const text = read(file);
  for (const marker of markers) assert.ok(text.includes(marker), `${file}: missing ${marker}`);
}

const forbiddenByFile = {
  'functions/api/school-majors.js': ['.slice(0, 8)', 'b[1] - a[1]'],
  'functions/api/major-bands.js': ['record.school.includes(filters.schoolKeyword)', 'rawSchool(raw).includes(schoolKeyword)'],
  'functions/_lib/report-data-service-v3956.js': ['rawSchool(raw).includes(keyword)', 'record.school.includes(filters.schoolKeyword)']
};
for (const [file, markers] of Object.entries(forbiddenByFile)) {
  const text = read(file);
  for (const marker of markers) assert.ok(!text.includes(marker), `${file}: forbidden direct school query logic ${marker}`);
}

const browserSchoolResolver = read('tongxue/data/school-name-resolver-v150.js');
assert.equal(browserSchoolResolver.includes('new URL('), false, 'school resolver must not construct a URL during module evaluation');
assert.ok(browserSchoolResolver.includes("export const SCHOOL_NAME_DATA_URL='/tongxue/data/school-search-index.20260617-v150.json';"), 'school resolver must use a same-origin browser pathname');

const index = read('ln-rank/index.html');
assert.ok(index.includes('app.v3969_0.js?v=3969_0'));
assert.ok(index.includes('城市请用地区'));
const releaseContract = read('functions/_lib/release-contract.js');
for (const marker of [
  'unifiedSchoolQueryContract: true',
  'schoolRegionNameAmbiguityContract: true',
  'noSilentSchoolCandidateTruncationContract: true',
  'admissionRecordCountTiebreakOnlyContract: true',
  'scoreSchoolReportQueryParityContract: true',
  'export const RELEASE_CONTRACT = LN_RANK_RELEASE_CONTRACT'
]) assert.ok(releaseContract.includes(marker), `release contract missing ${marker}`);

console.log(JSON.stringify({
  ok: true,
  version: SCHOOL_QUERY_CONTRACT_VERSION,
  admissionSchools: admissionDirectory.schoolCount,
  admissionRecords: admissionDirectory.admissionRecordCount,
  shenyang: {
    regionTotal: regionGroup.total,
    schoolNameTotal: nameGroup.total,
    includesShenyangChemical: regionNames.has('沈阳化工大学') && nameNames.has('沈阳化工大学')
  },
  exactCases: exactCases.length
}, null, 2));

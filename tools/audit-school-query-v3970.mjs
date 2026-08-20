import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createSchoolNameResolver, extractSchoolRecords } from '../tongxue/data/school-name-resolver-v150.js';
import { createEntityAwareResolver } from '../shared/resources/schools/school-identity-center.js';
import { resolveUnifiedSchoolQuery, acceptedAdmissionSchoolNames } from '../shared/resources/schools/school-query-engine.v3969_0.js';
import { SCHOOL_QUERY_CONTRACT_VERSION, SCHOOL_QUERY_POLICY, SCHOOL_QUERY_STATUSES } from '../shared/resources/schools/school-query-contract.v3969_0.js';
import { CURRENT_RELEASE } from '../shared/resources/release/current-release.js';
import { SITE_RUNTIME_CONTRACT } from '../shared/resources/release/site-runtime-contract.v3990_2.js';
import { LN_RANK_RUNTIME_CACHE_CONTRACT } from '../shared/resources/release/runtime-cache-contract.v3990_2.js';
import { RESOURCE_EXECUTION_VERSION, RESOURCE_EXECUTION_REGISTRY } from '../shared/governance/resource-execution-contract.v3990_2.js';

const json = rel => JSON.parse(fs.readFileSync(rel, 'utf8'));
const directoryPayload = json('tongxue/data/school-search-index.20260617-v150.json');
const admissionDirectory = json('shared/resources/schools/liaoning-2026-admission-school-directory.v3969_0.json');
const baseResolver = createSchoolNameResolver(extractSchoolRecords(directoryPayload));
const resolver = createEntityAwareResolver(baseResolver, baseResolver.metadata);

assert.equal(CURRENT_RELEASE.display, 'v3.9.90.2');
assert.equal(CURRENT_RELEASE.assetReleaseVersion, 'v3.9.90.2');
assert.equal(CURRENT_RELEASE.siteRuntimeGeneration, 'v3990_2');
assert.equal(CURRENT_RELEASE.siteRuntimeGeneration, SITE_RUNTIME_CONTRACT.generation);
assert.equal(CURRENT_RELEASE.schoolQueryVersion, SCHOOL_QUERY_CONTRACT_VERSION);
assert.equal(CURRENT_RELEASE.resourceExecutionVersion, RESOURCE_EXECUTION_VERSION);
assert.equal(LN_RANK_RUNTIME_CACHE_CONTRACT.version, 'runtime-cache-coherence-v3990_2');
assert.ok(SITE_RUNTIME_CONTRACT.stableDependencies.includes('/shared/resources/schools/school-query-contract.v3969_0.js'));
assert.ok(SITE_RUNTIME_CONTRACT.stableDependencies.includes('/shared/resources/schools/school-query-engine.v3969_0.js'));
assert.equal(RESOURCE_EXECUTION_REGISTRY.schoolQuery.owner, '/shared/resources/schools/school-query-contract.v3969_0.js');
assert.equal(SCHOOL_QUERY_POLICY.noSilentTruncation, true);
assert.equal(SCHOOL_QUERY_POLICY.requireInterpretationForRegionNameCollision, true);
assert.equal(admissionDirectory.contractVersion, SCHOOL_QUERY_CONTRACT_VERSION);
assert.equal(admissionDirectory.admissionRecordCount, 11628);

for (const [query, expected] of [['辽大','辽宁大学'],['沈航','沈阳航空航天大学'],['辽石化','辽宁石油化工大学'],['大工','大连理工大学'],['东财','东北财经大学']]) {
  const result = resolveUnifiedSchoolQuery({ query, resolver, admissionDirectory, limit: 500 });
  assert.equal(result.status, SCHOOL_QUERY_STATUSES.RESOLVED, query);
  assert.equal(result.resolvedSchool?.officialName, expected, query);
  assert.ok(acceptedAdmissionSchoolNames(result).size > 0, query);
}
const shenyang = resolveUnifiedSchoolQuery({ query: '沈阳', resolver, admissionDirectory, limit: 500 });
assert.equal(shenyang.status, SCHOOL_QUERY_STATUSES.AMBIGUOUS);
assert.equal(shenyang.ambiguityType, 'region-or-school-name');
for (const group of shenyang.interpretations) {
  assert.equal(group.total, group.candidates.length, `${group.intent} truncated`);
  assert.equal(group.pagination.hasMore, false, `${group.intent} hidden`);
}
assert.ok(shenyang.interpretations.find(row => row.intent === 'region')?.total > 8);
assert.ok(shenyang.interpretations.find(row => row.intent === 'school-name')?.total > 8);

for (const rel of ['functions/api/school-majors.js','functions/api/major-bands.js','functions/_lib/report-data-service-v3956.js']) {
  assert.ok(fs.readFileSync(rel, 'utf8').includes('school-query-provider.v3969.js'), `${rel} provider`);
}
console.log(JSON.stringify({
  ok: true,
  release: CURRENT_RELEASE.display,
  siteGeneration: CURRENT_RELEASE.siteRuntimeGeneration,
  schoolQuery: SCHOOL_QUERY_CONTRACT_VERSION,
  admissionSchools: admissionDirectory.schoolCount
}, null, 2));


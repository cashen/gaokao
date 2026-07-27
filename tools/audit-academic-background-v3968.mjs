import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  ACADEMIC_BACKGROUND_CONTRACT_VERSION,
  isFrontendEligibleBackgroundEvidence
} from '../shared/resources/background/academic-background-contract.v3968_0.js';
import {
  ACADEMIC_BACKGROUND_SOURCE_REGISTRY,
  listAcademicBackgroundSources
} from '../shared/resources/background/academic-background-source-registry.v3968_0.js';
import { ACADEMIC_BACKGROUND_MATCHER_VERSION } from '../shared/algorithms/background/academic-background-matcher.v3968_0.js';
import {
  ACADEMIC_BACKGROUND_PROVIDER_VERSION,
  getAcademicBackgroundMeta,
  matchAcademicBackground
} from '../functions/_lib/academic-background-provider.js';
import { CURRENT_RELEASE } from '../shared/resources/release/current-release.js';
import { SHARED_RESOURCE_REGISTRY } from '../shared/resources/resource-registry.js';
import { RESOURCE_EXECUTION_REGISTRY } from '../shared/governance/resource-execution-contract.v3969_0.js';
import { ALGORITHM_RESOURCE_REGISTRY } from '../shared/algorithms/algorithm-registry.js';

const read = path => fs.readFileSync(path, 'utf8');

assert.equal(ACADEMIC_BACKGROUND_CONTRACT_VERSION, 'academic-background-v3968_0');
assert.equal(ACADEMIC_BACKGROUND_MATCHER_VERSION, 'academic-background-matcher-v3968_0');
assert.equal(ACADEMIC_BACKGROUND_PROVIDER_VERSION, 'academic-background-provider-v3968_0');
assert.equal(CURRENT_RELEASE.display, 'v3.9.69.0');
assert.equal(CURRENT_RELEASE.assetVersion, 'v3969_0');
assert.equal(CURRENT_RELEASE.resourceExecutionVersion, 'resource-execution-v3969_0');
assert.equal(CURRENT_RELEASE.resourceOwners.academicBackgroundProvider, '/functions/_lib/academic-background-provider.js');
assert.equal(SHARED_RESOURCE_REGISTRY.academicBackground.provider, '/functions/_lib/academic-background-provider.js');
assert.equal(RESOURCE_EXECUTION_REGISTRY.academicBackground.matcher, '/shared/algorithms/background/academic-background-matcher.v3968_0.js');
assert.equal(ALGORITHM_RESOURCE_REGISTRY.academicBackgroundMatcher, '/shared/algorithms/background/academic-background-matcher.v3968_0.js');

const officialSources = listAcademicBackgroundSources({ officialOnly: true });
assert.ok(officialSources.length >= 4);
for (const source of officialSources) {
  assert.equal(source.official, true);
  assert.match(source.sourceUrl, /^https:\/\/(?:www\.|hudong\.)?moe\.gov\.cn\//);
  assert.ok(source.sourceYear);
  assert.ok(source.retrievedAt);
  assert.ok(source.sourceHash);
}
assert.equal(ACADEMIC_BACKGROUND_SOURCE_REGISTRY.MOE_211_2005.canSupportDisciplineEvidence, false, '211 identity must not prove a major');
assert.equal(ACADEMIC_BACKGROUND_SOURCE_REGISTRY.MOE_FOURTH_DISCIPLINE_2017.canSupportDisciplineEvidence, true);
assert.equal(isFrontendEligibleBackgroundEvidence({ ...ACADEMIC_BACKGROUND_SOURCE_REGISTRY.MOE_211_2005, sourceId: 'MOE_211_2005', sourceTitle: 'x', sourceUrl: 'https://www.moe.gov.cn/x', evidenceYear: '2005', verificationStatus: 'verified', canTriggerFrontend: false }), false);

const localMeta = getAcademicBackgroundMeta('liaoning');
const all211Meta = getAcademicBackgroundMeta('211');
assert.deepEqual(localMeta.historyYears, [2025, 2024]);
assert.deepEqual(all211Meta.historyYears, [2025, 2024]);
assert.equal(localMeta.admissionDataYear, 2026);
assert.equal(all211Meta.admissionDataYear, 2026);
assert.equal(localMeta.backgroundEvidenceUsesOwnYear, true);
assert.equal(all211Meta.backgroundEvidenceUsesOwnYear, true);
assert.equal(localMeta.legacyInput.executionRole, 'migration-input-only');
assert.equal(all211Meta.legacyInput.executionRole, 'migration-input-only');

const localVerified = matchAcademicBackground({ school: '东北大学', major: '自动化', displayLocation: '辽宁·沈阳' }, 'liaoning', { includePending: true });
assert.equal(localVerified?.matched, true, 'expected local legacy matcher sample');
assert.ok(localVerified.verifiedEvidence.some(item => item.sourceId === 'MOE_FOURTH_DISCIPLINE_2017'));
assert.equal(localVerified.frontendEligible, true);

const all211Candidate = matchAcademicBackground({ school: '兰州大学', major: '化学（基地班）' }, '211', { includePending: true });
if (all211Candidate?.matched) {
  for (const evidence of all211Candidate.verifiedEvidence) assert.equal(evidence.canTriggerFrontend, true);
  if (!all211Candidate.verifiedEvidence.length) assert.equal(matchAcademicBackground({ school: '兰州大学', major: '化学（基地班）' }, '211'), null, 'unverified 211 legacy line must be blocked');
}

for (const [path, scope] of [
  ['ln-rank/local-mainline.html', 'liaoning'],
  ['ln-rank/211-mainline.html', '211']
]) {
  const html = read(path);
  assert.match(html, new RegExp(`data-background-scope="${scope}"`));
  assert.match(html, /academic-background-app\.v3968_0\.js/);
  assert.match(html, /academic-background\.v3968_0\.css/);
  assert.match(html, /release-presenter\.v3968_0\.js/);
  assert.match(html, /2025.*2024/);
  assert.ok(!/local-mainline-app\.v3967_0|211-mainline-app\.v3951_0/.test(html), `${path} still loads legacy runtime`);
}

const browser = read('ln-rank/js/academic-background/academic-background-app.v3968_0.js');
assert.match(browser, /formatHistoricalEvidenceText/);
assert.match(browser, /\/api\/academic-background/);
assert.match(browser, /背景证据年份/);
assert.match(browser, /2026位次距离优先/);
assert.ok(!browser.includes('score2025'), 'browser must not directly interpret historical compatibility fields');
assert.ok(!browser.includes('rank2025'), 'browser must not directly interpret historical compatibility fields');

for (const [path, scope] of [
  ['functions/api/local-mainline.js', 'liaoning'],
  ['functions/api/211-mainline.js', '211']
]) {
  const api = read(path);
  assert.match(api, /handleAcademicBackgroundRequest/);
  assert.match(api, new RegExp(`'${scope}'`));
  assert.ok(!api.includes('loadBackgroundMatchedRecords'), `${path} still owns business logic`);
  assert.ok(!api.includes('score2025'), `${path} still owns legacy score logic`);
}

const service = read('functions/_lib/academic-background-api.js');
assert.match(service, /rank-distance-2026/);
assert.match(service, /academicBackground/);
assert.match(service, /historyYears: \[2025, 2024\]/);
assert.match(service, /matchAcademicBackground/);

const provider = read('functions/_lib/academic-background-provider.js');
assert.match(provider, /migration-input-only/);
assert.match(provider, /includePending/);

const releaseContract = read('functions/_lib/release-contract.js');
assert.match(releaseContract, /export const LN_RANK_RELEASE_CONTRACT/);
assert.match(releaseContract, /export const RELEASE_CONTRACT = LN_RANK_RELEASE_CONTRACT/);

console.log(JSON.stringify({
  ok: true,
  release: CURRENT_RELEASE.display,
  contract: ACADEMIC_BACKGROUND_CONTRACT_VERSION,
  matcher: ACADEMIC_BACKGROUND_MATCHER_VERSION,
  provider: ACADEMIC_BACKGROUND_PROVIDER_VERSION,
  officialSources: officialSources.length,
  localLegacyInput: localMeta.legacyInput,
  all211LegacyInput: all211Meta.legacyInput,
  localVerifiedEvidence: localVerified?.verifiedEvidence?.length || 0,
  all211CandidateEligible: Boolean(all211Candidate?.frontendEligible)
}, null, 2));

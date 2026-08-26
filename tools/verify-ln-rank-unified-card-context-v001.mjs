import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const schoolApi = read('functions/api/school-majors.js');
const bandsApi = read('functions/api/major-bands.js');
const schoolView = read('ln-rank/js/feature/school-majors/school-all-mode.v3969_2.js');
const handoff = read('ln-rank/js/workspace/major-path-handoff.v003.js');
const presenter = read('ln-rank/js/workspace/family-card-presenter.v3967_0.js');
const release = read('shared/resources/release/current-release.js');
const manifest = read('shared/resources/release/active-resource-manifest.v3990_2.js');

assert.match(schoolApi, /resolveMajorDomainQuery/);
assert.match(schoolApi, /buildKeywordQuery/);
assert.match(schoolApi, /matchMajorProject/);
assert.match(schoolApi, /buildSearchIndex/);
assert.match(bandsApi, /resolveMajorDomainQuery/);
assert.match(bandsApi, /keywordQueryWarnings/);
assert.match(schoolView, /data-major-code/);
assert.match(schoolView, /data-major-name/);
const actionsStart = schoolView.indexOf('<div class="school-major-actions">');
const detailStart = schoolView.indexOf('<section id="${detailId}"');
assert.ok(actionsStart >= 0 && detailStart > actionsStart, 'school card action layout');
const actions = schoolView.slice(actionsStart, detailStart);
assert.match(actions, /school-major-review-link/);
assert.doesNotMatch(schoolView.slice(detailStart), /school-major-review-link/);
assert.match(handoff, /concreteMajorFromRendered\(\{ code, name:sourceMajor \}\)/);
assert.match(handoff, /compact:true/);
assert.match(handoff, /看看这所学校的大学生怎么说/);
assert.match(presenter, /看看这所学校的大学生怎么说/);
assert.match(release, /lnRankHumanQueryInputRevision: 'r027'/);
assert.match(release, /lnRankCardEntryVersion: 'ln-rank-three-card-entries-v004'/);
assert.match(manifest, /CURRENT_RELEASE\.lnRankHumanQueryInputRevision/);
console.log(JSON.stringify({
  ok: true,
  sharedMajorResolution: true,
  schoolCanonicalIdentity: true,
  visibleEntries: ['专业升学路径', '大学生说专业', '大学生说学校'],
  releaseRevision: 'r027',
  cacheRevision: 'r027-card4'
}, null, 2));

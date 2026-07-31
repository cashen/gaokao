import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const page = read('ln-rank/local-mainline.html');
const runtime = read('ln-rank/js/local-strength/local-strength-app.v3971_2.js');
const styles = read('ln-rank/css/local-strength.v3971_2.css');
const release = read('shared/resources/release/current-release.js');
const index = JSON.parse(read('ln-rank/data/local-strength/local-strength-index.v3971_2.json'));
const audit = JSON.parse(read('ln-rank/data/local-strength/local-strength-audit.v3971_2.json'));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(page.includes('data-release="v3.9.71.2"'), 'immutable page build lineage');
assert(page.includes('local-strength.v3971_2.css?v=3971_2'), 'page style');
assert(page.includes('local-strength-app.v3971_2.js?v=3971_2'), 'page runtime');
assert(page.includes('release-presenter.v3971_2.js?v=3971_2'), 'page presenter');
assert(runtime.includes("local-strength-index.v3971_2.json?v=3971_2"), 'static index owner');
assert(!runtime.includes('/api/local-strength'), 'runtime must not call LocalStrength Functions');
assert(!fs.existsSync('functions/api/local-strength.js'), 'no LocalStrength API route');
assert(!fs.existsSync('functions/_lib/local-strength-api.js'), 'no LocalStrength Functions library');
assert(styles.includes('.ls-chip-row{display:grid;grid-template-columns:repeat(8'), 'desktop score grid');
assert(styles.includes('.ls-chip-row{grid-template-columns:repeat(4'), 'pad score grid');
assert(styles.includes('.ls-chip-row{grid-template-columns:repeat(2'), 'android score grid');
assert(!/\.ls-chip-row[^}]*overflow-x\s*:\s*(auto|scroll)/.test(styles), 'score bands must not horizontally scroll');
assert(release.includes("display: 'v3.9.72.1'"), 'release display');
assert(release.includes("assetVersion: 'v3970_0'"), 'stable asset lineage');
assert(release.includes("assetReleaseVersion: 'v3.9.70.0'"), 'stable release lineage');
assert(release.includes("localStrengthDataVersion: 'local-strength-static-v3971_2'"), 'static data version');
assert(release.includes("localStrengthArchitecture: 'build-time-static-index'"), 'static architecture');
assert(index.version === 'local-strength-static-v3971_2', 'index version');
assert(index.meta.completeEvaluation, 'complete evaluation');
assert(index.meta.localAdmissionSchoolCount === 62, '62 local admission schools');
assert(index.meta.localAdmissionRecordCount === 1992, '1992 local records');
assert(index.meta.evaluatedRecordCount === index.meta.localAdmissionRecordCount, 'all local records evaluated');
assert(index.meta.duplicatePublicRecordCount === 0, 'no duplicates');
assert(index.meta.unresolvedLocalRecordCount === 0, 'no unresolved records');
assert(index.records.length === index.meta.matchedRecordCount, 'record array count matches metadata');
assert(index.records.length > 0, 'public records exist');
assert(index.records[0].score2026 === index.meta.scoreMax, 'highest score');
assert(index.records.at(-1).score2026 === index.meta.scoreMin, 'lowest score');
assert(index.schools.find(item => item.officialName === '辽宁科技大学')?.matchedRecordCount === 6, '辽宁科技大学 full coverage');
assert(index.records.every(record => !(record.background?.sourceKinds || []).includes('211背景')), 'LocalStrength must not inherit 211 evidence');
assert(audit.assertions.allLocalRecordsEvaluated, 'audit full evaluation');
assert(audit.assertions.noDuplicatePublicRecords, 'audit duplicate');
assert(audit.assertions.sortedDescending, 'audit order');
assert(fs.statSync('ln-rank/data/local-strength/local-strength-index.v3971_2.json').size < 800000, 'browser index size');

console.log(JSON.stringify({
  release: 'v3.9.72.1',
  architecture: 'build-time-static-index',
  schools: index.meta.localAdmissionSchoolCount,
  evaluated: index.meta.evaluatedRecordCount,
  matchedSchools: index.meta.matchedSchoolCount,
  matchedRecords: index.meta.matchedRecordCount,
  liaoningUniversityOfScienceAndTechnology: 6,
  indexBytes: fs.statSync('ln-rank/data/local-strength/local-strength-index.v3971_2.json').size
}, null, 2));

import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const page = read('ln-rank/local-mainline.html');
const runtime = read('ln-rank/js/local-strength/local-strength-app.v3971_2.js');
const styles = read('ln-rank/css/local-strength.v3971_2.css');
const scorePositionStyles = read('ln-rank/css/local-strength-score-position.v3972_3.css');
const release = read('shared/resources/release/current-release.js');
const siteRuntime = read('shared/resources/release/site-runtime-contract.v3990_3.js');
const index = JSON.parse(read('ln-rank/data/local-strength/local-strength-index.v3971_2.json'));
const rankMap = JSON.parse(read('fenxi/data/rank_2026_physics.json'));
const audit = JSON.parse(read('ln-rank/data/local-strength/local-strength-audit.v3971_2.json'));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(page.includes('data-release="v3.9.71.2"'), 'immutable page build lineage');
assert(page.includes('data-local-strength-score-position="local-strength-score-position-v3972_3"'), 'score position correction marker');
assert(page.includes('local-strength.v3971_2.css?v=3971_2'), 'page base style');
assert(page.includes('local-strength-score-position.v3972_3.css?v=3972_3'), 'score position style');
assert(page.includes('local-strength-app.v3971_2.js?v=3972_3'), 'cache-busted page runtime');
assert(page.includes('release-presenter.v3971_2.js?v=3971_2'), 'page presenter');
assert(page.includes('id="scorePositionGroups"'), 'score position controls');
assert(runtime.includes("local-strength-index.v3971_2.json?v=3971_2"), 'static index owner');
assert(runtime.includes("/fenxi/data/rank_2026_physics.json?v=3972_3"), 'static rank lookup owner');
assert(runtime.includes("SCORE_POSITION_VERSION = 'local-strength-score-position-v3972_3'"), 'score position runtime contract');
assert(runtime.includes('rankDistance(a, rank) - rankDistance(b, rank)'), 'rank distance sorting');
assert(runtime.includes("positionGroup: 'near'"), 'near position default');
assert(!runtime.includes('/api/local-strength'), 'runtime must not call LocalStrength Functions');
assert(!fs.existsSync('functions/api/local-strength.js'), 'no LocalStrength API route');
assert(!fs.existsSync('functions/_lib/local-strength-api.js'), 'no LocalStrength Functions library');
assert(styles.includes('.ls-chip-row{display:grid;grid-template-columns:repeat(8'), 'desktop score grid');
assert(styles.includes('.ls-chip-row{grid-template-columns:repeat(4'), 'pad score grid');
assert(styles.includes('.ls-chip-row{grid-template-columns:repeat(2'), 'android score grid');
assert(!/\.ls-chip-row[^}]*overflow-x\s*:\s*(auto|scroll)/.test(styles), 'score bands must not horizontally scroll');
assert(scorePositionStyles.includes('.ls-score-position-groups'), 'score position styles');
assert(scorePositionStyles.includes('grid-template-columns:repeat(2'), 'mobile position grid');
assert(release.includes("display: 'v3.9.90.3'"), 'current public release display');
assert(release.includes("assetVersion: 'v3990_3'"), 'current site generation');
assert(release.includes("assetReleaseVersion: 'v3.9.90.3'"), 'current release lineage');
assert(release.includes("siteRuntimeGeneration: 'v3990_3'"), 'current site runtime generation');
assert(release.includes("localStrengthDataVersion: 'local-strength-static-v3971_2'"), 'stable static data version');
assert(release.includes("localStrengthArchitecture: 'build-time-static-index'"), 'stable static architecture');
assert(siteRuntime.includes("localStrengthRuntime: '/ln-rank/js/local-strength/local-strength-app.v3971_2.js?v=3972_3'"), 'stable LocalStrength entrypoint declaration');
assert(siteRuntime.includes("localStrength: 'local-strength-static-v3971_2'"), 'preserved LocalStrength package declaration');
assert(index.version === 'local-strength-static-v3971_2', 'index version');
assert(index.meta.completeEvaluation, 'complete evaluation');
assert(index.meta.localAdmissionSchoolCount === 62, '62 local admission schools');
assert(index.meta.localAdmissionRecordCount === 1992, '1992 local records');
assert(index.meta.evaluatedRecordCount === index.meta.localAdmissionRecordCount, 'all local records evaluated');
assert(index.meta.duplicatePublicRecordCount === 0, 'no duplicates');
assert(index.meta.unresolvedLocalRecordCount === 0, 'no unresolved records');
assert(index.records.length === index.meta.matchedRecordCount, 'record array count matches metadata');
assert(index.meta.matchedRecordCount === 243, 'published v3971.2 record count must remain immutable');
assert(index.records[0].score2026 === index.meta.scoreMax, 'highest score');
assert(index.records.at(-1).score2026 === index.meta.scoreMin, 'lowest score');
assert(index.schools.find(item => item.officialName === '辽宁科技大学')?.matchedRecordCount === 6, '辽宁科技大学 full coverage');
assert(Number(rankMap['530']) === 40119 && Number(rankMap['579']) === 21051, '2026 score-rank lookup contract');
assert(audit.assertions.allLocalRecordsEvaluated, 'audit full evaluation');
assert(audit.assertions.noDuplicatePublicRecords, 'audit duplicate');
assert(audit.assertions.sortedDescending, 'audit order');
assert(fs.statSync('ln-rank/data/local-strength/local-strength-index.v3971_2.json').size < 800000, 'browser index size');

console.log(JSON.stringify({
  release: 'v3.9.90.3',
  siteGeneration: 'v3990_3',
  pageLineage: 'v3.9.71.2',
  stablePackage: 'local-strength-static-v3971_2',
  scorePosition: 'local-strength-score-position-v3972_3',
  architecture: 'build-time-static-index-plus-static-rank-lookup',
  schools: index.meta.localAdmissionSchoolCount,
  evaluated: index.meta.evaluatedRecordCount,
  matchedSchools: index.meta.matchedSchoolCount,
  matchedRecords: index.meta.matchedRecordCount,
  rank530: rankMap['530'],
  rank579: rankMap['579'],
  liaoningUniversityOfScienceAndTechnology: 6,
  indexBytes: fs.statSync('ln-rank/data/local-strength/local-strength-index.v3971_2.json').size
}, null, 2));


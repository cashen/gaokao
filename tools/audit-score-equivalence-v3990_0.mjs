import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  findEquivalentScoreByRank,
  getRankTableRows,
  lookupScoreRank
} from '../functions/_lib/rank-table-provider.js';
import {
  onRequest,
  SCORE_EQUIVALENCE_CONTRACT
} from '../functions/api/score-equivalence.js';

const ROOT = new URL('../', import.meta.url);
const read = relative => fs.readFileSync(new URL(relative, ROOT), 'utf8');

assert.equal(SCORE_EQUIVALENCE_CONTRACT.version, 'score-equivalence-v3990_0');
assert.equal(SCORE_EQUIVALENCE_CONTRACT.sourceYear, 2026);
assert.deepEqual(SCORE_EQUIVALENCE_CONTRACT.targetYears, [2025, 2024]);
assert.equal(SCORE_EQUIVALENCE_CONTRACT.comparisonRankField, 'rankEnd');
assert.equal(SCORE_EQUIVALENCE_CONTRACT.interpolation, false);

let zeroCountRows = 0;
for (const year of [2024, 2025, 2026]) {
  const rows = getRankTableRows({ year, region: 'ln', subject: 'physics' });
  assert.ok(rows.length > 500, `${year} rank table unexpectedly short`);
  let lastScore = Infinity;
  let lastRankEnd = 0;
  for (const row of rows) {
    assert.ok(row.score < lastScore, `${year} scores are not strictly descending at ${row.score}`);
    assert.ok(row.sameCount >= 0, `${year} sameCount is negative at ${row.score}`);
    if (row.sameCount > 0) {
      assert.ok(row.rankEnd > lastRankEnd, `${year} positive-count rankEnd is not strictly increasing at ${row.score}`);
      assert.equal(row.rankEnd - row.rankStart + 1, row.sameCount, `${year} same-score interval mismatch at ${row.score}`);
    } else {
      zeroCountRows += 1;
      assert.equal(row.rankEnd, lastRankEnd, `${year} zero-count row changed cumulative rank at ${row.score}`);
      assert.equal(row.rankStart, row.rankEnd, `${year} zero-count row has a fabricated rank interval at ${row.score}`);
    }
    lastScore = row.score;
    lastRankEnd = row.rankEnd;
  }
}
assert.ok(zeroCountRows > 0, 'zero-count continuity rows were not audited');

const anchor600 = lookupScoreRank({ year: 2026, region: 'ln', subject: 'physics', score: 600 });
assert.deepEqual(
  { score: anchor600.score, sameCount: anchor600.sameCount, rankStart: anchor600.rankStart, rankEnd: anchor600.rankEnd },
  { score: 600, sameCount: 307, rankStart: 13929, rankEnd: 14235 }
);
const equivalent2025 = findEquivalentScoreByRank({ targetYear: 2025, region: 'ln', subject: 'physics', rank: anchor600.rankEnd });
const equivalent2024 = findEquivalentScoreByRank({ targetYear: 2024, region: 'ln', subject: 'physics', rank: anchor600.rankEnd });
assert.deepEqual(
  { score: equivalent2025.score, sameCount: equivalent2025.sameCount, rankStart: equivalent2025.rankStart, rankEnd: equivalent2025.rankEnd },
  { score: 598, sameCount: 320, rankStart: 13938, rankEnd: 14257 }
);
assert.deepEqual(
  { score: equivalent2024.score, sameCount: equivalent2024.sameCount, rankStart: equivalent2024.rankStart, rankEnd: equivalent2024.rankEnd },
  { score: 601, sameCount: 270, rankStart: 14083, rankEnd: 14352 }
);

let auditedScores = 0;
let skippedZeroCountScores = 0;
for (let score = 150; score <= 708; score += 1) {
  const source = lookupScoreRank({ year: 2026, region: 'ln', subject: 'physics', score });
  if (!source) continue;
  if (source.sameCount <= 0) {
    skippedZeroCountScores += 1;
    continue;
  }
  auditedScores += 1;
  for (const targetYear of [2025, 2024]) {
    const target = findEquivalentScoreByRank({ targetYear, region: 'ln', subject: 'physics', rank: source.rankEnd });
    assert.ok(target, `${score} has no ${targetYear} equivalent`);
    assert.ok(target.sameCount > 0, `${score} -> ${targetYear} resolved to zero-count row`);
    assert.ok(source.rankEnd >= target.rankStart && source.rankEnd <= target.rankEnd, `${score} -> ${targetYear} does not contain anchor ${source.rankEnd}`);
  }
}
assert.ok(auditedScores > 500, 'full score audit did not cover enough official positive-count rows');
assert.ok(skippedZeroCountScores > 0, 'zero-count input rows were not isolated from conversion');

async function request(path, method = 'GET') {
  return onRequest({ request: new Request(`https://example.test${path}`, { method }) });
}

const response600 = await request('/api/score-equivalence?score=600');
assert.equal(response600.status, 200);
assert.match(response600.headers.get('cache-control') || '', /s-maxage=86400/);
const body600 = await response600.json();
assert.equal(body600.ok, true);
assert.equal(body600.anchor.comparisonRank, 14235);
assert.deepEqual(body600.equivalents.map(item => [item.year, item.score, item.rankStart, item.rankEnd]), [
  [2025, 598, 13938, 14257],
  [2024, 601, 14083, 14352]
]);
assert.ok(body600.equivalents.every(item => item.containsComparisonRank));
assert.equal(body600.calculationPolicy.interpolation, false);
assert.equal(Object.hasOwn(body600, 'probability'), false);
assert.equal(Object.hasOwn(body600, 'admissionProbability'), false);

const responseDecimal = await request('/api/score-equivalence?score=600.5');
assert.equal(responseDecimal.status, 400);
assert.equal((await responseDecimal.json()).error.code, 'score-must-be-integer');

const responseMissing = await request('/api/score-equivalence');
assert.equal(responseMissing.status, 400);
assert.equal((await responseMissing.json()).error.code, 'score-required');

const responseMethod = await request('/api/score-equivalence?score=600', 'POST');
assert.equal(responseMethod.status, 405);
assert.equal(responseMethod.headers.get('allow'), 'GET, HEAD');

const responseLow = await request('/api/score-equivalence?score=300');
assert.equal(responseLow.status, 200);
assert.equal((await responseLow.json()).controls.belowUndergraduate, true);

const responseZeroCount = await request('/api/score-equivalence?score=151');
assert.equal(responseZeroCount.status, 422);
assert.equal((await responseZeroCount.json()).error.code, 'score-not-in-official-table');

const responseTop = await request('/api/score-equivalence?score=710');
assert.equal(responseTop.status, 200);
const bodyTop = await responseTop.json();
assert.equal(bodyTop.input.isMergedTopRange, true);
assert.equal(bodyTop.input.sourceLookupScore, 708);

const html = read('ln-rank/score-converter/index.html');
for (const marker of [
  'data-release="v3.9.90.0"',
  'data-site-runtime-generation="v3990_0"',
  'data-feature-version="score-equivalence-v3990_0"',
  '/shared/ui/shell/family-shell.v3990_0.js?v=3990_0',
  '/ln-rank/css/score-converter.v3990_0.css?v=3990_0',
  '/ln-rank/js/score-converter/score-converter-app.v3990_0.js?v=3990_0',
  '只做历史位置对照，不代表录取结果',
  '官方表没有独立统计行时，不插值、不猜测'
]) assert.ok(html.includes(marker), `score converter page missing marker: ${marker}`);

const home = read('index.html');
const selection = read('ln-rank/index.html');
const difficulty = read('ln2026.html');
const entryCases = [
  [home, 'home', '这个分数放到往年是多少分'],
  [selection, 'selection', '想看这个2026分数在2025、2024对应多少分？查看历年同位次'],
  [difficulty, 'difficulty', '跨年份不要直接比较裸分']
];
for (const [document, placement, copy] of entryCases) {
  const marker = `data-score-equivalence-entry="${placement}"`;
  assert.equal(document.split(marker).length - 1, 1, `${placement} entry must be unique`);
  assert.ok(document.includes('href="/ln-rank/score-converter/"'), `${placement} entry target missing`);
  assert.ok(document.includes(copy), `${placement} entry copy missing`);
}
assert.ok(home.indexOf('data-home-major-path-entry') < home.indexOf('data-score-equivalence-entry="home"'), 'home score entry must follow major path');
assert.ok(home.indexOf('data-score-equivalence-entry="home"') < home.indexOf('data-home-industry-map-entry'), 'home score entry must precede industry map');
assert.ok(home.indexOf('data-score-equivalence-entry="home"') < home.indexOf('href="/ln-rank/selection-pool"'), 'home entry must precede family plan');
assert.match(selection, /<div class="score-box">[\s\S]*data-score-equivalence-entry="selection"[\s\S]*<\/div>/, 'selection entry must stay in score box');
assert.match(difficulty, /id="scoreBandPanel"[\s\S]*data-score-equivalence-entry="difficulty"[\s\S]*<\/section>/, 'difficulty entry must stay in score-band context');
assert.ok(!home.includes('data-ui-route="score-equivalence"'), 'score converter must not become a global primary route');

const app = read('ln-rank/js/score-converter/score-converter-app.v3990_0.js');
for (const marker of [
  "const API_URL = '/api/score-equivalence'",
  'FAMILY_DECISION_STORAGE.candidateScore',
  'history.replaceState',
  'AbortController',
  "contract: 'score-equivalence-v3990_0'"
]) assert.ok(app.includes(marker), `score converter app missing marker: ${marker}`);

const endpoint = read('functions/api/score-equivalence.js');
assert.ok(endpoint.includes("from '../_lib/rank-table-provider.js'"));
assert.ok(endpoint.includes('Number(anchorRow.sameCount) <= 0'));
assert.ok(!endpoint.includes('const ROWS='), 'endpoint duplicated rank table rows');
assert.ok(!endpoint.includes('Math.random'), 'endpoint contains nondeterministic calculation');
assert.ok(!/["'](?:probability|admissionProbability)["']\s*:/.test(endpoint), 'endpoint must not expose an admission probability field');

for (const protectedPath of ['fenxi/', 'functions/fenxi/', 'functions/_middleware.js']) {
  assert.ok(![
    'index.html',
    'ln-rank/index.html',
    'ln2026.html',
    'functions/api/score-equivalence.js',
    'ln-rank/score-converter/index.html',
    'ln-rank/css/score-converter.v3990_0.css',
    'ln-rank/js/score-converter/score-converter-app.v3990_0.js',
    'tools/audit-score-equivalence-v3990_0.mjs',
    '.github/workflows/verify-score-equivalence-v3990_0.yml'
  ].some(path => path === protectedPath || path.startsWith(protectedPath)), `protected path touched: ${protectedPath}`);
}

console.log(JSON.stringify({
  ok: true,
  version: SCORE_EQUIVALENCE_CONTRACT.version,
  goldenExample: {
    input2026: 600,
    comparisonRank: body600.anchor.comparisonRank,
    equivalent2025: body600.equivalents[0].score,
    equivalent2024: body600.equivalents[1].score
  },
  fullPositiveCountRowsAudited: auditedScores,
  zeroCountRowsAudited: zeroCountRows,
  zeroCountInputsRejected: skippedZeroCountScores,
  navigationEntriesAudited: 3,
  interpolation: false,
  protectedPathsUntouched: true
}, null, 2));
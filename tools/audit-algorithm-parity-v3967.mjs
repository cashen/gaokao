import assert from 'node:assert/strict';
import fs from 'node:fs';
import { resolveCanonicalPosition } from '../shared/algorithms/position/canonical-position.v3963_0.js';
import { rankResultRecords, RESULT_RANKING_VERSION } from '../shared/algorithms/ranking/result-ranking.v3967_0.js';
import { rankMajorBandsRecordsOnce, MAJOR_BANDS_RESULT_ORDER_VERSION } from '../functions/_lib/major-bands-result-order.v3990_2.js';
import { resolveTrendInterpretation, TREND_INTERPRETATION_VERSION } from '../shared/algorithms/trend/trend-interpretation.v3967_0.js';
import { classifyHistoricalRankSelection, resolveHistoricalRankChange, HISTORICAL_RANK_SELECTION_VERSION } from '../shared/algorithms/position/historical-rank-selection.v3967_0.js';

const candidate = { score:600, rank:14235 };
const sourceRecords = [
  { id:'a',school:'甲校',major:'自动化',score2026:600,rank2026:14235,matchLevel:'exact' },
  { id:'b',school:'乙校',major:'电气工程',score2026:598,rank2026:14810,matchLevel:'related' },
  { id:'c',school:'丙校',major:'机械工程',score2026:603,rank2026:13337,matchLevel:'' }
];
function freshRecords() {
  return sourceRecords.map(record => ({
    ...record,
    canonicalPosition:resolveCanonicalPosition({candidateScore:candidate.score,candidateRank:candidate.rank,recordScore:record.score2026,recordRank:record.rank2026,rangePreset:'standard'})
  }));
}
const scoreOptions = {intent:'score-search',sortMode:'canonical-staged',diversify:false};
const schoolOptions = {intent:'school-search',sortMode:'position-near',diversify:false};
const records = freshRecords();
const score = rankResultRecords(records,scoreOptions);
const school = rankResultRecords(freshRecords(),schoolOptions);
assert.equal(score.length,records.length); assert.equal(school.length,records.length);
for (const list of [score,school]) for (const row of list) {
  assert.equal(row.resultRankingTrace.version,RESULT_RANKING_VERSION);
  assert.ok(row.canonicalPosition?.version);
}
const schoolAgain=rankResultRecords(freshRecords(),schoolOptions);
assert.deepEqual(school.map(x=>x.id),schoolAgain.map(x=>x.id),'ranking not deterministic');

const majorBandsOrder=rankMajorBandsRecordsOnce(freshRecords(),scoreOptions);
assert.deepEqual(majorBandsOrder.map(x=>x.id),score.map(x=>x.id),'major-bands ranking diverged from result-ranking');
for (let index=0; index<majorBandsOrder.length; index+=1) {
  assert.equal(majorBandsOrder[index].rankingTrace?.version,score[index].rankingTrace?.version,'staged ranking trace diverged');
}

const hard=resolveTrendInterpretation({medianRelativePctPoint26vs25:-3},{neutralThresholdPctPoint:1});
const easy=resolveTrendInterpretation({medianRelativePctPoint26vs25:3},{neutralThresholdPctPoint:1});
const stable=resolveTrendInterpretation({medianRelativePctPoint26vs25:.2},{neutralThresholdPctPoint:1});
assert.equal(hard.version,TREND_INTERPRETATION_VERSION); assert.equal(hard.key,'harder'); assert.equal(easy.key,'easier'); assert.equal(stable.key,'stable');
for (const [candidate,target,key] of [[10000,9000,'reach'],[10000,10000,'match'],[10000,11000,'safe'],[10000,12000,'backup'],[10000,8000,'out'],[10000,14000,'out']]) { const row=classifyHistoricalRankSelection({candidateRank:candidate,targetRank:target}); assert.equal(row.version,HISTORICAL_RANK_SELECTION_VERSION); assert.equal(row.key,key); }
assert.equal(resolveHistoricalRankChange({currentRank:9000,previousRank:10000}).key,'forward');
assert.equal(resolveHistoricalRankChange({currentRank:11000,previousRank:10000}).key,'backward');

const majorBandsApi=fs.readFileSync('functions/api/major-bands.js','utf8');
assert.match(majorBandsApi,/major-bands-result-order\.v3990_2/);
assert.match(majorBandsApi,/major-bands-rank-query-kernel\.v3990_2/);
assert.match(fs.readFileSync('functions/_lib/major-bands-result-order.v3990_2.js','utf8'),/staged-ranking\.v3960_0/);
assert.match(fs.readFileSync('functions/api/school-majors.js','utf8'),/result-ranking\.v3967_0/);
console.log(JSON.stringify({ok:true,ranking:RESULT_RANKING_VERSION,majorBandsOrder:MAJOR_BANDS_RESULT_ORDER_VERSION,trend:TREND_INTERPRETATION_VERSION,historicalRankSelection:HISTORICAL_RANK_SELECTION_VERSION,scoreOrder:score.map(x=>x.id),schoolOrder:school.map(x=>x.id)},null,2));

import assert from 'node:assert/strict';
import { buildSelectionPoolSummary } from '../functions/_lib/selection-pool-summary.js';
import { lookupScoreRank, findEquivalentScoreByRank } from '../functions/_lib/rank-table-provider.js';

const items = [
  { school: 'A大学', major: '计算机类', scoreDelta: 18, rank2025: 9000, poolBand: { group: 'rush', detail: '高冲' } },
  { school: 'B大学', major: '自动化', scoreDelta: 8, rank2025: 12000, poolBand: { group: 'rush', detail: '小冲' } },
  { school: 'C大学', major: '电气工程', scoreDelta: 0, rank2025: 15300, poolBand: { group: 'stable', detail: '边稳' } },
  { school: 'D大学', major: '机械设计', scoreDelta: -12, rank2025: 18000, poolBand: { group: 'stable', detail: '稳妥' } },
  { school: 'E大学', major: '土木工程', scoreDelta: -22, rank2025: 23000, poolBand: { group: 'safe', detail: '小保' } },
  { school: 'F大学', major: '材料类', scoreDelta: -35, poolBand: { group: 'safe', detail: '强保' } }
];

const row460 = lookupScoreRank({ year: 2025, region: 'ln', subject: 'physics', score: 460 });
assert.equal(row460.sameCount, 542);
assert.equal(row460.previousCumulative, 76197);
assert.equal(row460.rankStart, 76198);
assert.equal(row460.rankEnd, 76739);
assert.equal(row460.rankForGap, 76739);

const row461 = lookupScoreRank({ year: 2025, region: 'ln', subject: 'physics', score: 461 });
assert.equal(row461.sameCount, 511);
assert.equal(row461.rankEnd, 76197);

const equivalent460 = findEquivalentScoreByRank({ targetYear: 2025, region: 'ln', subject: 'physics', rank: 76739 });
assert.equal(equivalent460.score, 460);

const summary = buildSelectionPoolSummary({ candidateScore: 580 }, items);
assert.equal(summary.totalCount, 6);
assert.equal(summary.candidateRankSource, 'scoreRankTable');
assert.equal(summary.candidateRankLabel, '位次 20,147–20,541');
assert.equal(summary.candidateSameCount, 395);
assert.equal(summary.candidateRankForGap, 20541);
assert.equal(summary.rush.count, 2);
assert.equal(summary.stable.count, 2);
assert.equal(summary.safe.count, 2);
assert.equal(summary.rush.maxForwardRankGap, 11541);
assert.equal(summary.safe.maxBackwardRankGap, 2459);
assert.equal(summary.missingRankCount, 1);

const score460Summary = buildSelectionPoolSummary({ candidateScore: 460 }, [
  { school: '461分参考项', major: '参考专业', rank2025: 76197, poolBand: { group: 'rush', detail: '小冲' } },
  { school: '460分参考项', major: '参考专业', rank2025: 76739, poolBand: { group: 'stable', detail: '边稳' } }
]);
assert.equal(score460Summary.candidateRankLabel, '位次 76,198–76,739');
assert.equal(score460Summary.candidateRankForGap, 76739);
assert.equal(score460Summary.rush.maxForwardRankGap, 542);
assert.equal(score460Summary.stable.nearCount, 1);

const missing = buildSelectionPoolSummary({ candidateScore: 703 }, [
  { school: 'G大学', major: '测试', rank2025: 20, poolBand: { group: 'rush', detail: '高冲' } }
]);
assert.equal(missing.candidateRankSource, 'missingScoreRankTableRow');
assert.equal(missing.rush.missingRankCount, 1);
assert.equal(missing.rush.maxForwardRankGap, null);

console.log('selection-pool-summary tests passed');

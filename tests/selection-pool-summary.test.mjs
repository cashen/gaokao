import assert from 'node:assert/strict';
import { buildSelectionPoolSummary } from '../functions/_lib/selection-pool-summary.js';

const items = [
  { school: 'A大学', major: '计算机类', scoreDelta: 18, rank2025: 9000, poolBand: { group: 'rush', detail: '高冲' } },
  { school: 'B大学', major: '自动化', scoreDelta: 8, rank2025: 12000, poolBand: { group: 'rush', detail: '小冲' } },
  { school: 'C大学', major: '电气工程', scoreDelta: 0, rank2025: 15300, poolBand: { group: 'stable', detail: '边稳' } },
  { school: 'D大学', major: '机械设计', scoreDelta: -12, rank2025: 18000, poolBand: { group: 'stable', detail: '稳妥' } },
  { school: 'E大学', major: '土木工程', scoreDelta: -22, rank2025: 23000, poolBand: { group: 'safe', detail: '小保' } },
  { school: 'F大学', major: '材料类', scoreDelta: -35, poolBand: { group: 'safe', detail: '强保' } }
];

const summary = buildSelectionPoolSummary({ candidateScore: 580, candidateRank: 15234 }, items);
assert.equal(summary.totalCount, 6);
assert.equal(summary.rush.count, 2);
assert.equal(summary.stable.count, 2);
assert.equal(summary.safe.count, 2);
assert.equal(summary.rush.maxForwardRankGap, 6234);
assert.equal(summary.safe.maxBackwardRankGap, 7766);
assert.equal(summary.missingRankCount, 1);
assert.equal(summary.candidateRankSource, 'manual');

const estimated = buildSelectionPoolSummary({ candidateScore: 580 }, items);
assert.equal(estimated.candidateRankSource, 'estimatedFromPool');
assert.equal(estimated.candidateRank, 15300);

const missing = buildSelectionPoolSummary({ candidateScore: 580 }, [
  { school: 'G大学', major: '测试', scoreDelta: 20, poolBand: { group: 'rush', detail: '高冲' } }
]);
assert.equal(missing.candidateRankSource, 'missing');
assert.equal(missing.rush.missingRankCount, 1);
assert.equal(missing.rush.maxForwardRankGap, null);

console.log('selection-pool-summary tests passed');

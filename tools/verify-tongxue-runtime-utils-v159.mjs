import assert from 'node:assert/strict';
import {
  tidySummary,
  isUsefulSummary,
  dedupeReviews,
  summaryGroups
} from '../tongxue/app/tongxue-runtime-utils-v159.js';

const summary = '整体体验较稳定。宿舍和食堂条件需要结合具体校区核对。课程管理较严格。城市实习和就业机会较多。不过不同专业资源存在差异。';
const groups = summaryGroups(summary);
const byKey = new Map(groups.map(group => [group.key, group]));

assert.equal(tidySummary(' 宿舍  条件 ； 课程 管理。 '), '宿舍 条件；课程 管理。');
assert.equal(isUsefulSummary(summary), true);
assert.ok(byKey.get('overall')?.items.some(item => item.includes('整体体验')));
assert.ok(byKey.get('life')?.items.some(item => item.includes('宿舍')));
assert.ok(byKey.get('study')?.items.some(item => item.includes('课程')));
assert.ok(byKey.get('career')?.items.some(item => item.includes('实习')));
assert.ok(byKey.get('attention')?.items.some(item => item.includes('不过')));
assert.equal(groups.reduce((total, group) => total + group.items.length, 0), 5);

const reviews = dedupeReviews([
  { id: 1, content: '第一条' },
  { id: 1, content: '重复第一条' },
  { content: '匿名评论' },
  { content: '匿名评论' },
  { content: '   ' }
]);
assert.equal(reviews.length, 2);

console.log(JSON.stringify({
  ok: true,
  contract: 'tongxue-runtime-utils-v159',
  groups: groups.map(group => ({ key: group.key, count: group.items.length })),
  reviews: reviews.length
}, null, 2));

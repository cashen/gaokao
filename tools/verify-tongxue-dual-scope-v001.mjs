import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { MAJOR_CATALOG_2026 } from '../ln-rank/kb/major-understanding/major-catalog-2026.generated.js';
import { createMajorCatalogResolver } from '../shared/resources/majors/major-catalog-contract.js';

const controller = await readFile(new URL('../tongxue/app/tongxue-runtime-controller-v159.js', import.meta.url), 'utf8');
const index = await readFile(new URL('../tongxue/index.html', import.meta.url), 'utf8');

for (const label of ['MAJOR_CATALOG_2026', 'resolveMajorInput', 'scope:\'major\'', '专业体验线索', '学校体验线索', '看专业怎么说', '看学校怎么说', "writeLocation('major'"]) {
  assert.ok(controller.includes(label), label);
}
for (const label of ['找学校，看看大家怎么说', '输入学校、简称或地区', '整理学生公开留言，帮你了解学习、生活和就业体验', '看同学怎么说', 'tongxue-runtime-controller-v159.js?v=159-fuzzy001', 'tongxue-runtime-search-view-v159.js?v=159-fuzzy001']) {
  assert.ok(index.includes(label), label);
}
assert.match(controller, /if \(majorResolution\?\.status === 'resolved'\)/);
assert.match(controller, /MAJOR_RESOLVER\.search/);
assert.match(controller, /data-major-choice/);
assert.match(controller, /scope:'major'/);
assert.match(controller, /params\.get\('scope'\) === 'major'/);

const majorResolver = createMajorCatalogResolver(MAJOR_CATALOG_2026);
assert.equal(majorResolver.resolve('080902', { allowContains:false })?.item?.name, '软件工程');
assert.equal(majorResolver.resolve('计算机类', { allowContains:false })?.kind, 'category');
assert.equal(majorResolver.search('软件', { limit:3 })[0]?.item?.name, '软件工程');
assert.equal(majorResolver.search('软甲工程', { limit:3 })[0]?.item?.name, '软件工程');

console.log(JSON.stringify({ ok: true, scopes: ['school', 'major'], majorInput: true, copySwitching: true }));

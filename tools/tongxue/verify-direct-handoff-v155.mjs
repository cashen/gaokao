import assert from 'node:assert/strict';
import fs from 'node:fs';
import { readTongxueDirectHandoff, startTongxueDirectQuery } from '../../tongxue/app/tongxue-direct-handoff-v155.js';

const ordinary = readTongxueDirectHandoff('?school=%E4%B8%8A%E6%B5%B7%E8%B4%A2%E7%BB%8F%E5%A4%A7%E5%AD%A6');
assert.equal(ordinary.school, '上海财经大学');
assert.equal(ordinary.entityId, '');
assert.equal(ordinary.shouldAutoQuery, true);

const campus = readTongxueDirectHandoff('?school=%E5%A4%A7%E8%BF%9E%E7%90%86%E5%B7%A5%E5%A4%A7%E5%AD%A6&entity=dlut-panjin');
assert.equal(campus.school, '大连理工大学（盘锦校区）');
assert.equal(campus.entityId, 'dlut-panjin');
assert.equal(campus.shouldAutoQuery, true);

const empty = readTongxueDirectHandoff('');
assert.equal(empty.shouldAutoQuery, false);

let clicked = 0;
const input = { value: '', dataset: {} };
const button = { disabled: false, dataset: {}, click() { clicked += 1; } };
globalThis.document = { getElementById(id) { return id === 'school' ? input : id === 'queryButton' ? button : null; } };
assert.equal(await startTongxueDirectQuery(ordinary, { timeoutMs: 500 }), true);
assert.equal(clicked, 1);
assert.equal(input.value, '上海财经大学');
assert.equal(await startTongxueDirectQuery(ordinary, { timeoutMs: 500 }), true);
assert.equal(clicked, 1, 'direct handoff must only query once');
delete globalThis.document;

const source = fs.readFileSync('tongxue/app/tongxue-direct-handoff-v155.js', 'utf8');
const page = fs.readFileSync('tongxue/index.html', 'utf8');
const entry = fs.readFileSync('tongxue/app/tongxue-performance-v158.js', 'utf8');
assert.ok(source.includes('button.click()'));
assert.ok(!source.includes("fetch('/api/tongxue"));
assert.ok(entry.includes('tongxue-v158-cache-recovery-20260725'));
assert.ok(page.includes('./app/tongxue-runtime-v159-r3968.js?v=3968_0-nav003'));
assert.ok(!page.includes('aria-describedby="indexStatus" autofocus'));
assert.ok(entry.indexOf('prepareTongxueDirectHandoff') < entry.indexOf("await import('./tongxue-performance-v112.js?v=156')"));
assert.ok(entry.indexOf('await directHandoff.start()') > entry.indexOf("await import('./tongxue-performance-v112.js?v=156')"));

console.log('TONGXUE_DIRECT_HANDOFF_V155_COMPAT_OK');

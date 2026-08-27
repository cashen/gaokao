import assert from 'node:assert/strict';
import fs from 'node:fs';
import { onRequestGet } from '../functions/api/ai/major-history.js';

const source = fs.readFileSync('functions/api/ai/major-history.js', 'utf8');
assert.doesNotMatch(source, /standard-major-catalog-2026-full\.generated|createMajorIntentResolver/, 'major-history must not cold-load the full intent catalogue');
assert.match(source, /manifestIntentForInput/, 'major-history must resolve direct inputs from the bounded manifest index');

const assets = {
  fetch: async request => {
    const pathname = new URL(request.url).pathname;
    const file = `.${pathname}`;
    if (!fs.existsSync(file)) return new Response('', { status: 404 });
    return new Response(fs.readFileSync(file), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } });
  }
};
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => { throw new Error('unexpected public origin fetch'); };
try {
  const request = search => new Request(`https://local.test/api/ai/major-history?${search}`);
  const exact = await onRequestGet({ request: request('major=%E7%94%B5%E6%B0%94%E5%B7%A5%E7%A8%8B%E5%8F%8A%E5%85%B6%E8%87%AA%E5%8A%A8%E5%8C%96&limit=1'), env: { ASSETS: assets } });
  const exactPayload = await exact.json();
  assert.equal(exact.status, 200);
  assert.equal(exactPayload.ok, true);
  assert.equal(exactPayload.records.length, 1);

  const ambiguous = await onRequestGet({ request: request('major=%E7%94%B5%E6%B0%94%E5%B7%A5%E7%A8%8B&limit=1'), env: { ASSETS: assets } });
  const ambiguousPayload = await ambiguous.json();
  assert.equal(ambiguous.status, 200);
  assert.equal(ambiguousPayload.ok, true);
  assert.ok(ambiguousPayload.records.length >= 1);

  const broad = await onRequestGet({ request: request('major=%E6%9C%BA&limit=1'), env: { ASSETS: assets } });
  const broadPayload = await broad.json();
  assert.equal(broad.status, 409);
  assert.equal(broadPayload.code, 'major_query_requires_choice');

  console.log(JSON.stringify({ ok: true, exactRecords: exactPayload.records.length, ambiguousRecords: ambiguousPayload.records.length, broadCode: broadPayload.code }, null, 2));
} finally {
  globalThis.fetch = originalFetch;
}

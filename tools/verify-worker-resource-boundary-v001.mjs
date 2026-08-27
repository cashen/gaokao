import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const schoolApiSource = await fs.readFile(path.join(root, 'functions/api/school-majors.js'), 'utf8');
assert.match(schoolApiSource, /getAdmissionSchoolDirectoryMeta\(context\)/, 'school API must pass the Pages Functions context');
assert.doesNotMatch(schoolApiSource, /getAdmissionSchoolDirectoryMeta\(context\.request\)/, 'school API must not discard ASSETS binding');
assert.doesNotMatch(schoolApiSource, /resolve(?:ExactAdmissionSchool|AdmissionSchoolQuery)\(context\.request/, 'school query providers must receive the full context');

const assetCalls = [];
const assets = {
  async fetch(request) {
    const pathname = new URL(request.url).pathname;
    const filename = path.join(root, pathname.slice(1));
    try {
      const data = await fs.readFile(filename);
      assetCalls.push({ pathname, bytes: data.byteLength });
      return new Response(data, { status: 200, headers: { 'content-type': 'application/json' } });
    } catch (error) {
      assetCalls.push({ pathname, error: error.code || String(error) });
      return new Response('missing asset', { status: 404 });
    }
  }
};

const originalFetch = globalThis.fetch;
globalThis.fetch = async () => { throw new Error('unexpected public origin fetch'); };
try {
  const { onRequest } = await import('../functions/api/school-majors.js');
  const school = '哈尔滨工业大学（威海）';
  const resolveResponse = await onRequest({
    request: new Request(`https://local.test/api/school-majors?schoolEntityId=hit-weihai&school=${encodeURIComponent(school)}&resolveOnly=1`),
    env: { ASSETS: assets }
  });
  assert.equal(resolveResponse.status, 200, 'canonical school resolve-only must use bound assets');
  const resolvePayload = await resolveResponse.json();
  assert.equal(resolvePayload.ok, true);
  assert.equal(resolvePayload.meta.schoolEntity.entityId, 'hit-weihai');

  const fullResponse = await onRequest({
    request: new Request(`https://local.test/api/school-majors?schoolEntityId=hit-weihai&school=${encodeURIComponent(school)}&limit=20`),
    env: { ASSETS: assets }
  });
  assert.equal(fullResponse.status, 200, 'canonical school full query must use bound assets');
  const fullPayload = await fullResponse.json();
  assert.equal(fullPayload.ok, true);
  assert.ok(fullPayload.records.length > 0, 'canonical school query must return verified records');
  assert.ok(assetCalls.some(item => item.pathname === '/data/zy2026/school-index.json'));

  const { onRequestGet } = await import('../functions/api/ai/major-history.js');
  const majorResponse = await onRequestGet({
    request: new Request('https://local.test/api/ai/major-history?major=%E7%94%B5%E6%B0%94%E5%B7%A5%E7%A8%8B&limit=1'),
    env: { ASSETS: assets }
  });
  assert.equal(majorResponse.status, 200, 'major history smoke must remain available');
  const majorPayload = await majorResponse.json();
  assert.equal(majorPayload.ok, true);
  assert.equal(majorPayload.majorInputs[0], '电气工程');
  console.log(JSON.stringify({
    ok: true,
    schoolResolveOnly: resolvePayload.meta.schoolEntity.entityId,
    schoolRecords: fullPayload.records.length,
    majorRecords: majorPayload.records.length,
    assetCalls
  }, null, 2));
} finally {
  globalThis.fetch = originalFetch;
}

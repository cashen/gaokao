import assert from 'node:assert/strict';
import fs from 'node:fs';
import { onRequestGet } from '../functions/api/ai/major-history.js';

const assetEnv = {
  ASSETS: {
    fetch: async request => {
      const path = `.${new URL(request.url).pathname}`;
      if (!fs.existsSync(path)) return new Response('', { status: 404 });
      return new Response(fs.readFileSync(path), { status: 200, headers: { 'content-type': 'application/json' } });
    }
  }
};

async function query(search) {
  const response = await onRequestGet({
    request: new Request(`https://preview.example/api/ai/major-history?${search}`),
    env: assetEnv
  });
  return { status: response.status, payload: await response.json() };
}

const core = await query(`major=${encodeURIComponent('电气')}&limit=120`);
assert.equal(core.status, 200);
assert.equal(core.payload.majorScope, 'core');
assert.equal(core.payload.matchedMajors.some(key => /类|试验班|实验班|[\[\]]/.test(key)), false, 'core scope must not silently include admission groups');

const admissionGroups = await query(`major=${encodeURIComponent('电气')}&majorScope=admission-groups&limit=120`);
assert.equal(admissionGroups.status, 200);
assert.equal(admissionGroups.payload.majorScope, 'admission-groups');
assert.ok(admissionGroups.payload.matchedMajors.some(key => key === '电气类(中外合作办学)'), 'explicit admission-group scope must preserve the original group key');
assert.match(admissionGroups.payload.boundary, /逐校核对/);

const broad = await query(`major=${encodeURIComponent('机')}&limit=120`);
assert.equal(broad.status, 409);
assert.equal(broad.payload.code, 'major_query_requires_choice');

console.log(JSON.stringify({
  ok: true,
  coreRecords: core.payload.total,
  admissionGroupRecords: admissionGroups.payload.total,
  admissionGroupKeys: admissionGroups.payload.matchedMajors.filter(key => /类|试验班|实验班|[\[\]]/.test(key)).slice(0, 4),
  broadCode: broad.payload.code
}, null, 2));

import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('functions/api/ai/school-official.js','utf8');
assert.ok(source.includes("AI_SCHOOL_OFFICIAL_EDGE_CACHE_VERSION='ai-school-official-edge-cache-v3990_2'"));
assert.ok(source.includes('const EDGE_CACHE_TTL_SECONDS=24*60*60'));
assert.ok(source.includes('const MODULE_CACHE_LIMIT=96'));
assert.ok(source.includes('const INFLIGHT=new Map()'));
assert.ok(source.includes("globalThis.caches?.default||null"));
assert.ok(source.includes("key.searchParams.set('topic',schoolOfficialTopic(question))"));
assert.ok(source.includes("x-ai-school-official-cache"));
assert.ok(source.includes("cacheStatus='miss-error'" )===false);
assert.ok(source.includes("'miss-error'"));
assert.ok(source.includes('本轮不会用模型补写学校事实'));
assert.equal(source.includes('runAiProvider'),false);
assert.equal(source.includes('env.AI'),false);
console.log(JSON.stringify({ok:true,version:'ai-school-official-edge-cache-v3990_2',checks:['24h-edge-cache','bounded-module-cache','inflight-dedupe','topic-keyed-public-facts','model-isolation','fail-closed']},null,2));

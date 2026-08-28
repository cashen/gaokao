import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  STUDENT_VOICE_SOURCE,studentVoicePublishedMirrors,studentVoiceSourceHosts
} from '../shared/resources/experience/student-voice-source-registry.v001.js';
import {onRequest as studentVoiceOnRequest} from '../functions/_lib/student-voice-source.js';

const mirrors=studentVoicePublishedMirrors();
const hosts=studentVoiceSourceHosts();
assert.equal(new Set(mirrors).size,mirrors.length,'published mirrors must be unique');
assert.equal(new Set(hosts).size,hosts.length,'active API hosts must be unique');
assert.ok(hosts.every(host=>mirrors.includes(host)),'active API hosts must be a subset of published mirrors');
assert.ok(mirrors.includes('https://srgaoxiao.com'));
assert.ok(!hosts.includes('https://srgaoxiao.com'),'observed edge-403 mirror must not receive active API retries');
assert.equal(STUDENT_VOICE_SOURCE.observedAt,'2026-08-21');
assert.match(STUDENT_VOICE_SOURCE.observedBoundary,/403/);

const sourceText=fs.readFileSync('functions/_lib/student-voice-source.js','utf8');
for(const literal of ['https://eo.srgaoxiao.cn','https://eo.srgaoxiao.com','https://srgaoxiao.cn','https://srgaoxiao.com']){
  assert.equal(sourceText.includes(literal),false,'source gateway must consume the shared registry instead of owning mirror literals');
}
assert.match(sourceText,/TOTAL_REQUEST_BUDGET_MS = 8_000/);
assert.match(sourceText,/PER_REQUEST_TIMEOUT_MS = 4_500/);
assert.match(sourceText,/MAX_RESPONSE_BYTES = 2_000_000/);
assert.match(sourceText,/MAX_TOPIC_SCAN_PAGES = 3/);
assert.match(sourceText,/Date\.now\(\) >= deadline/,'failover and topic scanning must obey one request deadline');
assert.match(sourceText,/error:'schema_drift'/,'schema mismatch must have an explicit diagnostic state');
assert.match(sourceText,/url\.searchParams\.set\('scope', scope\)/);
assert.match(sourceText,/url\.searchParams\.set\('topic', topic\)/);
assert.match(sourceText,/url\.searchParams\.set\('page', String\(page\)\)/);
assert.match(sourceText,/url\.searchParams\.set\('majorCode', majorCode\)/);
assert.match(sourceText,/url\.searchParams\.set\('major', major\)/);

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
const realFetch=globalThis.fetch;
const realCaches=globalThis.caches;
try{
  const cacheLookups=[];
  const cachePuts=[];
  globalThis.caches={default:{
    async match(request){cacheLookups.push(new URL(request.url).toString());return undefined;},
    async put(request){cachePuts.push(new URL(request.url).toString());}
  }};
  const calls=[];
  globalThis.fetch=async input=>{
    const url=new URL(String(input));calls.push(url);
    if(url.hostname==='eo.srgaoxiao.cn'&&url.pathname.startsWith('/api/schools/'))return json({name:'测试大学',slug:'测试大学'}); // required id intentionally missing
    if(url.hostname==='eo.srgaoxiao.com'&&/^\/api\/schools\/[^/]+$/.test(url.pathname))return json({id:123,name:'测试大学',slug:'测试大学',province:'辽宁省',city:'沈阳市'});
    if(url.hostname==='eo.srgaoxiao.com'&&url.pathname==='/api/schools/123/ai-summary')return json({summary:'宿舍四人间，空调和暖气情况都有同学提到，食堂早餐和晚饭选择也比较丰富。'});
    return json({},404);
  };

  const dorm=await studentVoiceOnRequest({request:new Request('https://example.test/api/tongxue-summary?scope=school&school=%E6%B5%8B%E8%AF%95%E5%A4%A7%E5%AD%A6&topic=dormitory&page=1')});
  const dormPayload=await dorm.json();
  assert.equal(dorm.status,200,`unexpected dorm response: ${JSON.stringify(dormPayload)}; calls=${calls.map(url=>url.toString()).join(' | ')}`);
  assert.equal(dormPayload.ok,true);
  assert.match(dormPayload.transport,/镜像 2/,'schema drift on mirror 1 must fail over to the next verified API host');
  assert.ok(calls.some(url=>url.hostname==='eo.srgaoxiao.cn'));
  assert.ok(calls.some(url=>url.hostname==='eo.srgaoxiao.com'));
  assert.equal(calls.some(url=>url.hostname==='srgaoxiao.cn'),false,'failover must stop after a successful mirror');
  assert.equal(calls.some(url=>url.hostname==='srgaoxiao.com'),false,'inactive mirror must never receive API traffic');

  const cafeteria=await studentVoiceOnRequest({request:new Request('https://example.test/api/tongxue-summary?scope=school&school=%E6%B5%8B%E8%AF%95%E5%A4%A7%E5%AD%A6&topic=cafeteria&page=1')});
  assert.equal(cafeteria.status,200);
  const normalizedLookupKeys=cacheLookups.map(value=>new URL(value).searchParams.toString());
  assert.ok(normalizedLookupKeys.some(value=>value.includes('scope=school')&&value.includes('topic=dormitory')&&value.includes('page=1')));
  assert.ok(normalizedLookupKeys.some(value=>value.includes('scope=school')&&value.includes('topic=cafeteria')&&value.includes('page=1')));
  assert.equal(new Set(cacheLookups).size,cacheLookups.length,'different topic requests must not collide in the edge cache key');
  assert.ok(cachePuts.length>=2,'successful bounded evidence may be edge cached through the single gateway cache owner');

  globalThis.caches={default:{async match(){return undefined;},async put(){}}};
  const driftCalls=[];
  globalThis.fetch=async input=>{
    const url=new URL(String(input));driftCalls.push(url);
    if(url.pathname.startsWith('/api/schools/'))return json({name:'结构已变化但没有id'});
    return json({},404);
  };
  const drift=await studentVoiceOnRequest({request:new Request('https://example.test/api/tongxue-summary?scope=school&school=%E6%B5%8B%E8%AF%95%E5%A4%A7%E5%AD%A6&topic=general&page=1')});
  assert.equal(drift.status,502);const driftPayload=await drift.json();
  assert.equal(driftPayload.error,'source_api_unavailable');
  assert.ok(Array.isArray(driftPayload.diagnostics));
  assert.ok(driftPayload.diagnostics.some(item=>item.error==='schema_drift'),'schema drift must fail closed with diagnostics instead of guessing a new shape');
  assert.deepEqual([...new Set(driftCalls.map(url=>`https://${url.hostname}`))],hosts,'all active mirrors may be attempted once under the shared deadline when every schema is invalid');
  assert.ok(driftCalls.length<=hosts.length*2,'schema drift must not create retry storms');
}finally{
  globalThis.fetch=realFetch;
  if(realCaches===undefined)delete globalThis.caches;else globalThis.caches=realCaches;
}

for(const temporary of ['.github/workflows/tmp-uec-source-probe.yml','.github/workflows/tmp-uec-aiplus-builder.yml','tools/tmp_uec_aiplus_patch.py','.github/workflows/tmp-uec-compat-health-builder.yml','tools/tmp_uec_compat_and_health_fix.py']){
  assert.equal(fs.existsSync(temporary),false,`${temporary} must not remain in the formal candidate`);
}

console.log('Student Voice source health v0.01 verified: one mirror registry, bounded failover, schema fail-closed, topic-safe cache keys, no temporary construction owner.');

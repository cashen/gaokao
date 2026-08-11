import {loadOfficialSchoolEvidence,schoolOfficialTopic,AI_SCHOOL_OFFICIAL_SOURCE_VERSION} from '../../_lib/ai/school-official-source.js';

export const AI_SCHOOL_OFFICIAL_API_VERSION='ai-school-official-api-v3990_2';
export const AI_SCHOOL_OFFICIAL_EDGE_CACHE_VERSION='ai-school-official-edge-cache-v3990_2';

const EDGE_CACHE_TTL_SECONDS=24*60*60;
const MODULE_CACHE_LIMIT=96;
const MODULE_CACHE=new Map();
const INFLIGHT=new Map();

function clean(value,max=600){return String(value==null?'':value).trim().slice(0,max);}
function json(payload,status=200,cacheStatus=''){const headers={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'};if(cacheStatus)headers['x-ai-school-official-cache']=cacheStatus;return new Response(JSON.stringify({apiVersion:AI_SCHOOL_OFFICIAL_API_VERSION,sourceVersion:AI_SCHOOL_OFFICIAL_SOURCE_VERSION,edgeCacheVersion:AI_SCHOOL_OFFICIAL_EDGE_CACHE_VERSION,...payload}),{status,headers});}
function normalizedSchool(value=''){return clean(value,120).normalize('NFKC').replace(/\s+/g,'');}
function cacheIdentity(school,question){return`${normalizedSchool(school)}|${schoolOfficialTopic(question)}`;}
function moduleGet(key){const entry=MODULE_CACHE.get(key);if(!entry)return null;if(entry.expiresAt<=Date.now()){MODULE_CACHE.delete(key);return null;}MODULE_CACHE.delete(key);MODULE_CACHE.set(key,entry);return entry.payload;}
function modulePut(key,payload){MODULE_CACHE.delete(key);MODULE_CACHE.set(key,{payload,expiresAt:Date.now()+EDGE_CACHE_TTL_SECONDS*1000});while(MODULE_CACHE.size>MODULE_CACHE_LIMIT)MODULE_CACHE.delete(MODULE_CACHE.keys().next().value);}
function edgeCacheRequest(url,school,question){const key=new URL('/__ai-school-official-cache/v3990_2',url.origin);key.searchParams.set('school',normalizedSchool(school));key.searchParams.set('topic',schoolOfficialTopic(question));return new Request(key.toString(),{method:'GET'});}
async function edgeRead(cache,key){if(!cache)return null;try{const response=await cache.match(key);if(!response?.ok)return null;const payload=await response.json();return payload?.ok?payload:null;}catch{return null;}}
async function edgeWrite(cache,key,payload){if(!cache)return;try{const stored=new Response(JSON.stringify(payload),{status:200,headers:{'content-type':'application/json; charset=utf-8','cache-control':`public, max-age=${EDGE_CACHE_TTL_SECONDS}`}});await cache.put(key,stored);}catch{}}
async function loadOnce(key,school,question){if(INFLIGHT.has(key))return INFLIGHT.get(key);const pending=loadOfficialSchoolEvidence({school,question}).finally(()=>INFLIGHT.delete(key));INFLIGHT.set(key,pending);return pending;}

export async function onRequest(context){
  if(context.request.method!=='GET')return json({ok:false,message:'只支持 GET 请求。'},405);
  const url=new URL(context.request.url),school=clean(url.searchParams.get('school'),120),question=clean(url.searchParams.get('question'),600);
  if(!school)return json({ok:false,code:'school_required',message:'需要先明确一所学校。'},400);
  const identity=cacheIdentity(school,question),modulePayload=moduleGet(identity);
  if(modulePayload)return json(modulePayload,200,'module-hit');
  const cache=globalThis.caches?.default||null,cacheKey=edgeCacheRequest(url,school,question),edgePayload=await edgeRead(cache,cacheKey);
  if(edgePayload){modulePut(identity,edgePayload);return json(edgePayload,200,'edge-hit');}
  try{
    const result=await loadOnce(identity,school,question);
    if(!result?.ok)return json(result||{ok:false,message:'学校官方信息暂不可用。'},404,'miss');
    const payload={...result,cacheStoredAt:new Date().toISOString(),cacheTtlSeconds:EDGE_CACHE_TTL_SECONDS};
    modulePut(identity,payload);
    const write=edgeWrite(cache,cacheKey,payload);if(typeof context.waitUntil==='function')context.waitUntil(write);else await write;
    return json(payload,200,'miss-store');
  }catch(error){
    return json({ok:false,code:'official_source_unavailable',message:'阳光高考官方信息暂时读取失败，本轮不会用模型补写学校事实。',error:clean(error?.message||error,280)},502,'miss-error');
  }
}

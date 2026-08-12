import {loadOfficialSchoolEvidence,schoolOfficialTopic,schoolOfficialTopicLabel,AI_SCHOOL_OFFICIAL_SOURCE_VERSION} from '../../_lib/ai/school-official-source.js';

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
async function edgeRead(cache,key){if(!cache)return null;try{const response=await cache.match(key);if(!response?.ok)return null;const payload=await response.json();return payload?.ok&&payload?.sourceAvailable!==false&&payload?.sourceVersion===AI_SCHOOL_OFFICIAL_SOURCE_VERSION?payload:null;}catch{return null;}}
async function edgeWrite(cache,key,payload){if(!cache)return;try{const stored=new Response(JSON.stringify(payload),{status:200,headers:{'content-type':'application/json; charset=utf-8','cache-control':`public, max-age=${EDGE_CACHE_TTL_SECONDS}`}});await cache.put(key,stored);}catch{}}
async function loadOnce(key,school,question){if(INFLIGHT.has(key))return INFLIGHT.get(key);const pending=loadOfficialSchoolEvidence({school,question}).finally(()=>INFLIGHT.delete(key));INFLIGHT.set(key,pending);return pending;}
function unavailablePayload({school,question,code='official_source_unavailable',message='',error=''}={}){const topic=schoolOfficialTopic(question);return{ok:true,sourceAvailable:false,code,school:clean(school,120),topic,topicLabel:schoolOfficialTopicLabel(topic),message:clean(message||'阳光高考官方资料本轮暂未取得；不会用模型补写学校事实。',300),coverage:'official_source_unavailable',detailAvailable:false,evidenceText:'本轮没有取得可验证的阳光高考官方资料，因此不生成学校事实结论。你仍可继续查询站内确定性分数、位次和专业历史。',sources:[],fetchedAt:new Date().toISOString(),boundary:'官方来源不可用时 fail-closed：不把第三方读取失败升级为整轮 AI 失败，也不让模型补写任何未取得的学校事实。',upstreamError:clean(error,240)};}

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
    if(!result?.ok)return json(unavailablePayload({school,question,code:result?.code||'official_source_unavailable',message:result?.message||'学校官方资料本轮暂未取得。'}),200,'miss-unavailable');
    const payload={...result,sourceAvailable:true,cacheStoredAt:new Date().toISOString(),cacheTtlSeconds:EDGE_CACHE_TTL_SECONDS};
    modulePut(identity,payload);
    const write=edgeWrite(cache,cacheKey,payload);if(typeof context.waitUntil==='function')context.waitUntil(write);else await write;
    return json(payload,200,'miss-store');
  }catch(error){
    return json(unavailablePayload({school,question,error:error?.message||error}),200,'miss-unavailable');
  }
}

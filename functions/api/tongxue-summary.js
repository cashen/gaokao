import{onRequest as baseOnRequest}from'../_lib/tongxue-summary-base-v112.js';
import{resolveEntityRequest,publicSchoolEntity,isEntitySourceAvailable,entitySourceQuery,entitySourceId}from'../../tongxue/data/school-entities-v130.js';
import{normalizeStudentVoiceScope}from'../../shared/resources/experience/student-voice-contract.v001.js';
const VERSION='v1.4.1';

function normalizeHandoffToken(value){
 return String(value||'').normalize('NFKC').toLowerCase().replace(/[\s·•,，。；;：:'"“”‘’!！?？_—-]+/g,'').trim();
}

function isLegacyAdmissionHandoff(entityId,school){
 const id=String(entityId||'').trim(),name=String(school||'').trim();
 return Boolean(name&&id.startsWith('admission:')&&normalizeHandoffToken(id.slice('admission:'.length))===normalizeHandoffToken(name));
}

export async function onRequest(context){
 const url=new URL(context.request.url),hasMajor=Boolean(url.searchParams.get('major')||url.searchParams.get('majorCode')),scope=normalizeStudentVoiceScope(url.searchParams.get('scope')||(hasMajor?'major':'school'));
 if(scope!=='school')return finalize(await baseOnRequest(context),{requestedScope:scope});
 const school=String(url.searchParams.get('school')||'').trim(),requestedEntityId=String(url.searchParams.get('entity')||'').trim(),legacyAdmissionFallback=isLegacyAdmissionHandoff(requestedEntityId,school),entityId=legacyAdmissionFallback?'':requestedEntityId;
 const resolved=resolveEntityRequest(entityId,school);
 if(resolved.error)return out({ok:false,error:resolved.error,message:resolved.error==='entity_school_mismatch'?'学校名称与实体标识不一致。':'学校实体标识无效。',scope,version:VERSION},400);
 const entity=resolved.entity;
 if(entity&&!isEntitySourceAvailable(entity))return out({ok:false,error:'entity_source_not_found',message:'来源站暂时没有该分校或校区的独立记录；本站不会自动使用母体学校评价替代。',school:entity.displayName,entity:publicSchoolEntity(entity),scope,version:VERSION},404);
 const inner=new URL(url);inner.searchParams.set('scope','school');inner.searchParams.set('school',entitySourceQuery(entity,school));inner.searchParams.delete('entity');
 const response=await baseOnRequest({...context,request:new Request(inner.toString(),context.request)}),raw=await response.text();let payload={};try{payload=JSON.parse(raw||'{}')}catch{return new Response(raw,{status:response.status,headers:response.headers})}
 const expected=entitySourceId(entity),actual=payload?.schoolMeta?.id;
 if(expected!==null&&payload.ok&&String(actual)!==String(expected))return out({ok:false,error:'entity_source_conflict',message:'来源站返回了另一个学校实体，已停止展示以避免混入错误评价。',school:entity?.displayName||school,entity:publicSchoolEntity(entity),scope,version:VERSION},502);
 payload.version=VERSION;payload.requestedSchool=school;payload.scope='school';if(legacyAdmissionFallback)payload.legacyEntityFallback=true;if(entity){payload.school=entity.displayName;payload.entity=publicSchoolEntity(entity);if(response.status===404){payload.error='entity_source_not_found';payload.message='来源站暂时没有该分校或校区的独立记录；本站不会自动使用母体学校评价替代。';}}
 return responseWithPayload(response,payload);
}

async function finalize(response,extra={}){const raw=await response.text();let payload={};try{payload=JSON.parse(raw||'{}')}catch{return new Response(raw,{status:response.status,headers:response.headers})}payload.version=VERSION;Object.assign(payload,extra);return responseWithPayload(response,payload);}
function responseWithPayload(response,payload){const headers=new Headers(response.headers);headers.set('x-tongxue-version',VERSION);headers.set('content-type','application/json; charset=utf-8');return new Response(JSON.stringify(payload),{status:response.status,statusText:response.statusText,headers});}
function out(payload,status){return new Response(JSON.stringify(payload),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-tongxue-version':VERSION}})}

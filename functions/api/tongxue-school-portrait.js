import{onRequest as baseOnRequest}from'../_lib/tongxue-school-portrait-base-v120.js';
import{resolveEntityRequest,publicSchoolEntity,isEntitySourceAvailable,entitySourceQuery,entitySourceId}from'../../tongxue/data/school-entities-v130.js';
const VERSION='v1.3.0';
export async function onRequest(context){
 const url=new URL(context.request.url),school=String(url.searchParams.get('school')||'').trim(),entityId=String(url.searchParams.get('entity')||'').trim();
 const resolved=resolveEntityRequest(entityId,school);
 if(resolved.error)return out({ok:false,error:resolved.error,message:'学校名称与实体标识不一致。',version:VERSION},400);
 const entity=resolved.entity;
 if(entity&&!isEntitySourceAvailable(entity))return out({ok:false,error:'entity_source_not_found',message:'来源站暂时没有该校区的独立画像；本站不会使用母体学校画像替代。',school:entity.displayName,entity:publicSchoolEntity(entity),version:VERSION},404);
 const inner=new URL(url);inner.searchParams.set('school',entitySourceQuery(entity,school));inner.searchParams.delete('entity');
 const response=await baseOnRequest({...context,request:new Request(inner.toString(),context.request)}),raw=await response.text();let payload={};try{payload=JSON.parse(raw||'{}')}catch{return new Response(raw,{status:response.status,headers:response.headers})}
 const expected=entitySourceId(entity),actual=payload?.identity?.sourceSchoolId??payload?.schoolMeta?.id;
 if(expected!==null&&payload.ok&&actual!==undefined&&actual!==null&&String(actual)!==String(expected))return out({ok:false,error:'entity_source_conflict',message:'来源站画像对应另一个学校实体，已停止展示。',school:entity?.displayName||school,entity:publicSchoolEntity(entity),version:VERSION},502);
 payload.version=VERSION;payload.requestedSchool=school;if(entity){payload.school=entity.displayName;payload.entity=publicSchoolEntity(entity);}
 const headers=new Headers(response.headers);headers.set('x-tongxue-portrait-version',VERSION);headers.set('content-type','application/json; charset=utf-8');return new Response(JSON.stringify(payload),{status:response.status,statusText:response.statusText,headers});
}
function out(payload,status){return new Response(JSON.stringify(payload),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-tongxue-portrait-version':VERSION}})}

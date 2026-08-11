import {loadOfficialSchoolEvidence,AI_SCHOOL_OFFICIAL_SOURCE_VERSION} from '../../_lib/ai/school-official-source.js';

export const AI_SCHOOL_OFFICIAL_API_VERSION='ai-school-official-api-v3990_2';

function clean(value,max=600){return String(value==null?'':value).trim().slice(0,max);}
function json(payload,status=200){return new Response(JSON.stringify({apiVersion:AI_SCHOOL_OFFICIAL_API_VERSION,sourceVersion:AI_SCHOOL_OFFICIAL_SOURCE_VERSION,...payload}),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});}

export async function onRequest(context){
  if(context.request.method!=='GET')return json({ok:false,message:'只支持 GET 请求。'},405);
  const url=new URL(context.request.url),school=clean(url.searchParams.get('school'),120),question=clean(url.searchParams.get('question'),600);
  if(!school)return json({ok:false,code:'school_required',message:'需要先明确一所学校。'},400);
  try{
    const result=await loadOfficialSchoolEvidence({school,question});
    if(!result?.ok)return json(result||{ok:false,message:'学校官方信息暂不可用。'},404);
    return json(result,200);
  }catch(error){
    return json({ok:false,code:'official_source_unavailable',message:'阳光高考官方信息暂时读取失败，本轮不会用模型补写学校事实。',error:clean(error?.message||error,280)},502);
  }
}

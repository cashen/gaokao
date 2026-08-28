import { orchestrateAiTurn } from '../../_lib/ai/turn-orchestrator.js';

export const AI_TURN_API_VERSION = 'ai-turn-api-v3990_2';
const MAX_BODY_BYTES = 128 * 1024;

function json(payload,status=200){return new Response(JSON.stringify({apiVersion:AI_TURN_API_VERSION,...payload}),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});}

export async function onRequest(context){
  if(context.request.method!=='POST')return json({ok:false,message:'只支持 POST 请求。'},405);
  const contentLength=Number(context.request.headers.get('content-length')||0);if(Number.isFinite(contentLength)&&contentLength>MAX_BODY_BYTES)return json({ok:false,message:'本次讨论上下文过大，请新开一次讨论；专业初选和家庭方案不会受影响。'},413);
  let payload;try{payload=await context.request.json();}catch{return json({ok:false,message:'请求格式不是有效 JSON。'},400);}
  try{const result=await orchestrateAiTurn(context,payload||{});return json(result,Number(result?.status||(result?.ok?200:400)));}
  catch(error){return json({ok:false,code:'ai_turn_unhandled',message:'这轮没有完成，之前的讨论不会被修改。',error:String(error?.message||error).slice(0,320)},500);}
}

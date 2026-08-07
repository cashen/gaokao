import { runAiProvider, aiProviderConfig } from '../../_lib/ai/provider-router.js';
import { CURRENT_RELEASE } from '../../../shared/resources/release/current-release.js';

export const AI_MODEL_PROBE_VERSION = 'ai-model-probe-v3990_1';

function json(payload,status=200){ return new Response(JSON.stringify(payload),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}}); }

export async function onRequest(context) {
  if (context.request.method !== 'POST') return json({ok:false,message:'模型实测只接受用户主动 POST。'},405);
  const config = aiProviderConfig(context.env || {});
  const result = await runAiProvider(context.env || {}, [
    { role:'system', content:'这是模型连接健康探针。只返回 JSON，不回答高考问题。' },
    { role:'user', content:'只输出 {"ok":true,"echo":"ai-model-probe"}' }
  ], { maxTokens:100 });
  return json({
    ok:Boolean(result.ok), probeVersion:AI_MODEL_PROBE_VERSION, release:CURRENT_RELEASE.display,
    configured:{ primary:config.primary, primaryModel:config.primaryModel || '', fallback:config.fallback || '', fallbackModel:config.fallbackModel || '' },
    actual:{ provider:result.provider || '', model:result.model || '', latencyMs:Number(result.latencyMs || 0), fallbackUsed:Boolean(result.fallbackUsed) },
    failures:result.failures || [], deterministicFallbackRequired:Boolean(result.deterministicFallbackRequired),
    note:result.ok ? '本次回显来自一次真实模型调用；业务事实仍由确定性工具执行。' : '模型调用失败，/ai/ 仍可退回确定性语义规则。'
  }, result.ok ? 200 : 503);
}

import { runAiProvider, aiProviderConfig } from '../../_lib/ai/provider-router.js';
import { CURRENT_RELEASE } from '../../../shared/resources/release/current-release.js';

export const AI_MODEL_PROBE_VERSION = 'ai-model-probe-v3990_2';

function json(payload,status=200){ return new Response(JSON.stringify(payload),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}}); }

export async function onRequest(context) {
  if (context.request.method !== 'POST') return json({ok:false,message:'模型实测只接受用户主动 POST。'},405);
  const config = aiProviderConfig(context.env || {});
  const result = await runAiProvider(context.env || {}, [
    { role:'system', content:'这是模型连接健康探针。只返回 JSON，不回答高考问题。' },
    { role:'user', content:'只输出 {"ok":true,"echo":"ai-model-probe"}' }
  ], { maxTokens:400, reasoningEffort:'low' });
  const expectedProvider = config.primary || '';
  const expectedModel = config.primaryModel || '';
  const actualProvider = result.provider || '';
  const actualModel = result.model || '';
  const primaryMatched = Boolean(
    result.ok &&
    !result.fallbackUsed &&
    expectedProvider &&
    expectedModel &&
    actualProvider === expectedProvider &&
    actualModel === expectedModel
  );
  const ok = Boolean(result.ok && primaryMatched);
  const note = !result.ok
    ? '模型调用失败，/ai/ 仍可退回确定性语义规则。'
    : primaryMatched
      ? '模型自检通过：当前主配置与本次真实调用的 provider / model 完全一致；业务事实仍由确定性工具执行。'
      : `模型调用成功，但主配置与实际调用不一致：期望 ${expectedProvider} · ${expectedModel || '未配置'}，实际 ${actualProvider || '未知'} · ${actualModel || '未知'}${result.fallbackUsed ? '（使用了备用模型）' : ''}。`;
  return json({
    ok, probeVersion:AI_MODEL_PROBE_VERSION, release:CURRENT_RELEASE.display,
    configured:{ primary:expectedProvider, primaryModel:expectedModel, fallback:config.fallback || '', fallbackModel:config.fallbackModel || '' },
    actual:{ provider:actualProvider, model:actualModel, latencyMs:Number(result.latencyMs || 0), fallbackUsed:Boolean(result.fallbackUsed) },
    match:{ primaryMatched, providerMatched:Boolean(actualProvider && actualProvider === expectedProvider), modelMatched:Boolean(actualModel && actualModel === expectedModel) },
    failures:result.failures || [], deterministicFallbackRequired:Boolean(result.deterministicFallbackRequired),
    note
  }, ok ? 200 : (result.ok ? 409 : 503));
}

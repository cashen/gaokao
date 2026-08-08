import { resolveWorkersAiModelAlias } from '../ai-model-resolver.js';

export const AI_PROVIDER_ROUTER_VERSION = 'ai-provider-router-v3990_1';

function clean(value, max = 240) { return String(value == null ? '' : value).trim().slice(0, max); }
function positiveInt(value, fallback, min = 1000, max = 60000) { const number = Math.round(Number(value)); return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback; }
function providerName(value) {
  const normalized = clean(value, 60).toLowerCase();
  if (['external','openai-compatible','openai_compatible','qwen'].includes(normalized)) return 'openai-compatible';
  if (['workers-ai','workers_ai','cloudflare'].includes(normalized)) return 'workers-ai';
  return normalized || 'workers-ai';
}
function errorSummary(error) { return [error?.name,error?.message,error?.status,error?.code].filter(Boolean).join(' | ').slice(0,360); }
function externalEndpoint(baseValue) { const base = clean(baseValue,500).replace(/\/+$/,''); if (!base) return ''; return /\/chat\/completions$/i.test(base) ? base : `${base}/chat/completions`; }
function getWorkersAiText(result) {
  if (typeof result?.response === 'string') return result.response;
  if (typeof result?.text === 'string') return result.text;
  if (typeof result?.result === 'string') return result.result;
  if (Array.isArray(result?.choices) && typeof result.choices[0]?.message?.content === 'string') return result.choices[0].message.content;
  return '';
}
function workersModelResolution(env = {}) {
  return resolveWorkersAiModelAlias(clean(env?.AI_WORKSPACE_MODEL || env?.AI_MODEL,180));
}

async function callWorkersAi(env, messages, options = {}) {
  const resolved = workersModelResolution(env);
  const model = resolved.model;
  if (!resolved.requestedModel) throw Object.assign(new Error('AI_WORKSPACE_MODEL/AI_MODEL 未配置，使用确定性解析。'), { code:'AI_MODEL_NOT_CONFIGURED' });
  if (!env?.AI || typeof env.AI.run !== 'function') throw Object.assign(new Error('Cloudflare Workers AI binding 未配置。'), { code:'AI_BINDING_MISSING' });
  const started = Date.now();
  const result = await env.AI.run(model, { messages, temperature:0, max_tokens:Math.max(80,Math.min(1000,Number(options.maxTokens || 700))) });
  const text = getWorkersAiText(result);
  if (!text) throw new Error('Workers AI 返回空内容。');
  return { ok:true, provider:'workers-ai', model, requestedModel:resolved.requestedModel, modelMigrated:resolved.migrated, migratedFrom:resolved.migratedFrom, text, usage:result?.usage || null, latencyMs:Date.now()-started };
}

async function callOpenAiCompatible(env, messages, options = {}) {
  const endpoint = externalEndpoint(env?.AI_EXTERNAL_BASE_URL);
  const apiKey = clean(env?.AI_EXTERNAL_API_KEY,800);
  const model = clean(env?.AI_EXTERNAL_MODEL || env?.AI_WORKSPACE_MODEL || env?.AI_MODEL,180);
  if (!endpoint || !apiKey || !model) throw Object.assign(new Error('外部模型需要 AI_EXTERNAL_BASE_URL、AI_EXTERNAL_API_KEY、AI_EXTERNAL_MODEL。'), { code:'AI_EXTERNAL_CONFIG_MISSING' });
  const controller = new AbortController();
  const timeoutMs = positiveInt(env?.AI_TIMEOUT_MS,18000,3000,45000);
  const timer = setTimeout(()=>controller.abort('timeout'),timeoutMs);
  const started = Date.now();
  try {
    const response = await fetch(endpoint, { method:'POST', headers:{ authorization:`Bearer ${apiKey}`,'content-type':'application/json',accept:'application/json' }, body:JSON.stringify({ model,messages,temperature:0,max_tokens:Math.max(80,Math.min(1000,Number(options.maxTokens || 700))) }), signal:controller.signal });
    const bodyText = await response.text();
    if (!response.ok) { const error = new Error(`外部模型 HTTP ${response.status}`); error.status=response.status; error.code='AI_EXTERNAL_HTTP_ERROR'; error.detail=bodyText.slice(0,400); throw error; }
    let payload; try { payload=JSON.parse(bodyText); } catch { throw new Error('外部模型返回非 JSON。'); }
    const text = payload?.choices?.[0]?.message?.content || payload?.output_text || payload?.response || '';
    if (typeof text !== 'string' || !text.trim()) throw new Error('外部模型返回空内容。');
    return { ok:true, provider:'openai-compatible', model, text, usage:payload?.usage || null, requestId:clean(response.headers.get('x-request-id') || payload?.id,180), latencyMs:Date.now()-started };
  } finally { clearTimeout(timer); }
}

async function callOne(provider, env, messages, options) {
  if (provider === 'workers-ai') return callWorkersAi(env,messages,options);
  if (provider === 'openai-compatible') return callOpenAiCompatible(env,messages,options);
  throw Object.assign(new Error(`不支持的 AI Provider：${provider}`), { code:'AI_PROVIDER_UNSUPPORTED' });
}
function modelForProvider(provider, env = {}) {
  if (provider === 'workers-ai') return workersModelResolution(env).model;
  if (provider === 'openai-compatible') return clean(env?.AI_EXTERNAL_MODEL || env?.AI_WORKSPACE_MODEL || env?.AI_MODEL,180);
  return '';
}

export function aiProviderConfig(env = {}) {
  const primary = providerName(env.AI_PROVIDER || 'workers-ai');
  const fallbackRaw = clean(env.AI_FALLBACK_PROVIDER,60);
  const fallback = fallbackRaw ? providerName(fallbackRaw) : '';
  const workersResolved = workersModelResolution(env);
  const workersModel = workersResolved.model;
  const externalModel = clean(env?.AI_EXTERNAL_MODEL || env?.AI_WORKSPACE_MODEL || env?.AI_MODEL,180);
  return {
    version:AI_PROVIDER_ROUTER_VERSION, primary, fallback,
    primaryModel:modelForProvider(primary,env), fallbackModel:fallback ? modelForProvider(fallback,env) : '',
    workersModel, workersModelRequested:workersResolved.requestedModel, workersModelMigrated:workersResolved.migrated, workersModelMigratedFrom:workersResolved.migratedFrom,
    externalModel,
    workersAiBound:Boolean(env?.AI && typeof env.AI.run === 'function'),
    workersModelConfigured:Boolean(workersResolved.requestedModel),
    externalConfigured:Boolean(clean(env?.AI_EXTERNAL_BASE_URL,500) && clean(env?.AI_EXTERNAL_API_KEY,20) && externalModel),
    timeoutMs:positiveInt(env?.AI_TIMEOUT_MS,18000,3000,45000)
  };
}

export async function runAiProvider(env = {}, messages = [], options = {}) {
  const config = aiProviderConfig(env);
  const attempts = [config.primary]; if (config.fallback && config.fallback !== config.primary) attempts.push(config.fallback);
  const failures = [];
  for (const provider of attempts.slice(0,2)) {
    try { const result = await callOne(provider,env,messages,options); return { ...result, routerVersion:AI_PROVIDER_ROUTER_VERSION, failures, fallbackUsed:provider !== config.primary }; }
    catch (error) { failures.push({ provider, model:modelForProvider(provider,env), error:errorSummary(error), code:clean(error?.code,80) }); }
  }
  return { ok:false, provider:'', model:'', text:'', usage:null, latencyMs:0, routerVersion:AI_PROVIDER_ROUTER_VERSION, failures, deterministicFallbackRequired:true, fallbackUsed:false };
}

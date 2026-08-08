import { aiProviderConfig } from '../../_lib/ai/provider-router.js';
import { listOfficialAiEvidence, AI_EVIDENCE_REGISTRY_VERSION } from '../../_lib/ai/evidence-registry.js';
import { AI_TOOL_REGISTRY_VERSION } from '../../_lib/ai/tool-registry.js';
import { CURRENT_RELEASE } from '../../../shared/resources/release/current-release.js';

export const AI_HEALTH_API_VERSION = 'ai-health-api-v3990_1';

function clean(value, max = 500) { return String(value == null ? '' : value).trim().slice(0,max); }
function json(payload,status=200){ return new Response(JSON.stringify(payload),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}}); }

export async function onRequest(context) {
  if (context.request.method !== 'GET') return json({ok:false,message:'只支持 GET 请求。'},405);
  const provider = aiProviderConfig(context.env || {});
  const primaryReady = provider.primary === 'workers-ai'
    ? Boolean(provider.workersAiBound && provider.workersModelConfigured)
    : provider.primary === 'openai-compatible'
      ? Boolean(provider.externalConfigured)
      : false;
  const evidence = listOfficialAiEvidence();
  return json({
    ok:true, apiVersion:AI_HEALTH_API_VERSION, release:CURRENT_RELEASE.display, siteRuntimeGeneration:CURRENT_RELEASE.siteRuntimeGeneration,
    deployment:{ commitSha:clean(context.env?.CF_PAGES_COMMIT_SHA,40), branch:clean(context.env?.CF_PAGES_BRANCH,160), url:clean(context.env?.CF_PAGES_URL,500) },
    workspace:{ scope:'辽宁2027备考家庭 / 2026物理类历史数据底座', deterministicFirst:true, modelMayChangeBusinessFacts:false, providerSwitchable:true, externalApiSupported:true, semanticMode:'command-active-view-history-v3990_1', interruptionMode:'client-latest-write-wins-v3990_1' },
    provider:{
      routerVersion:provider.version, primary:provider.primary, fallback:provider.fallback, primaryReady,
      primaryModel:provider.primaryModel || '', fallbackModel:provider.fallbackModel || '',
      workersModel:provider.workersModel || '', workersModelRequested:provider.workersModelRequested || '', workersModelMigrated:Boolean(provider.workersModelMigrated), workersModelMigratedFrom:provider.workersModelMigratedFrom || '',
      externalModel:provider.externalModel || '',
      workersAiBound:provider.workersAiBound, workersModelConfigured:provider.workersModelConfigured, externalConfigured:provider.externalConfigured, timeoutMs:provider.timeoutMs
    },
    evidence:{ registryVersion:AI_EVIDENCE_REGISTRY_VERSION, officialSourceCount:evidence.length, levels:['A','C','D'], policy:'A=官方事实；C=系统确定性推导；D=缺少可靠证据时明确待核验。' },
    tools:{ registryVersion:AI_TOOL_REGISTRY_VERSION, enabled:['rank_lookup','major_band_search','school_compare','major_compare','selection_review'] }
  });
}

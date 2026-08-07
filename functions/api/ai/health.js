import { aiProviderConfig } from '../../_lib/ai/provider-router.js';
import { listOfficialAiEvidence, AI_EVIDENCE_REGISTRY_VERSION } from '../../_lib/ai/evidence-registry.js';
import { AI_TOOL_REGISTRY_VERSION } from '../../_lib/ai/tool-registry.js';
import { CURRENT_RELEASE } from '../../../shared/resources/release/current-release.js';

export const AI_HEALTH_API_VERSION = 'ai-health-api-v3990_0';

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff'
    }
  });
}

export async function onRequest(context) {
  if (context.request.method !== 'GET') return json({ ok: false, message: '只支持 GET 请求。' }, 405);
  const provider = aiProviderConfig(context.env || {});
  const evidence = listOfficialAiEvidence();
  return json({
    ok: true,
    apiVersion: AI_HEALTH_API_VERSION,
    release: CURRENT_RELEASE.display,
    siteRuntimeGeneration: CURRENT_RELEASE.siteRuntimeGeneration,
    workspace: {
      scope: '辽宁2027备考家庭 / 2026物理类历史数据底座',
      deterministicFirst: true,
      modelMayChangeBusinessFacts: false,
      providerSwitchable: true,
      externalApiSupported: true
    },
    provider: {
      routerVersion: provider.version,
      primary: provider.primary,
      fallback: provider.fallback,
      workersAiBound: provider.workersAiBound,
      workersModelConfigured: provider.workersModelConfigured,
      externalConfigured: provider.externalConfigured,
      timeoutMs: provider.timeoutMs
    },
    evidence: {
      registryVersion: AI_EVIDENCE_REGISTRY_VERSION,
      officialSourceCount: evidence.length,
      levels: ['A', 'C', 'D'],
      policy: 'A=官方事实；C=系统确定性推导；D=缺少可靠证据时明确待核验。'
    },
    tools: {
      registryVersion: AI_TOOL_REGISTRY_VERSION,
      enabled: ['rank_lookup', 'major_band_search', 'school_compare']
    }
  });
}
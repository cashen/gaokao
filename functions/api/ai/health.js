import { aiProviderConfig } from '../../_lib/ai/provider-router.js';
import { listOfficialAiEvidence, AI_EVIDENCE_REGISTRY_VERSION } from '../../_lib/ai/evidence-registry.js';
import { AI_TOOL_REGISTRY_VERSION,listRegisteredAiTools } from '../../_lib/ai/tool-registry.js';
import { AI_AGENT_KERNEL_VERSION } from '../../_lib/ai/agent-task-kernel.js';
import { PARENT_SEMANTIC_FRAME_VERSION } from '../../_lib/ai/parent-semantic-frame.js';
import { AI_EVIDENCE_PLAN_VERSION } from '../../_lib/ai/evidence-plan.js';
import { AI_CLAIM_EVIDENCE_VERSION } from '../../_lib/ai/claim-evidence.js';
import { AI_OFFICIAL_WEB_EVIDENCE_VERSION } from '../../_lib/ai/official-web-evidence.js';
import { AI_DECISION_RESEARCH_RUNTIME_VERSION } from '../../_lib/ai/decision-research-runtime.js';
import { CURRENT_RELEASE } from '../../../shared/resources/release/current-release.js';
import {AIPLUS_PRODUCT_VERSION,AIPLUS_PRODUCT_CONTRACT_VERSION} from '../../../shared/ai/aiplus-product-contract.v002.js';
import {AI_SCHOOL_HISTORY_FACT_CONTRACT} from '../../_lib/ai/school-history-fact-contract.js';

export const AI_HEALTH_API_VERSION='ai-health-api-v0.02';
function clean(value,max=500){return String(value==null?'':value).trim().slice(0,max);}
function json(payload,status=200){return new Response(JSON.stringify(payload),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});}
export async function onRequest(context){
  if(context.request.method!=='GET')return json({ok:false,message:'只支持 GET 请求。'},405);
  const provider=aiProviderConfig(context.env||{}),primaryReady=provider.primary==='workers-ai'?Boolean(provider.workersAiBound&&provider.workersModelConfigured):provider.primary==='openai-compatible'?Boolean(provider.externalConfigured):false,evidence=listOfficialAiEvidence(),officialWebConfigured=Boolean(String(context.env?.JINA_API_KEY||context.env?.AI_WEB_SEARCH_API_KEY||'').trim());
  return json({
    ok:true,apiVersion:AI_HEALTH_API_VERSION,release:CURRENT_RELEASE.display,siteRuntimeGeneration:CURRENT_RELEASE.siteRuntimeGeneration,
    deployment:{commitSha:clean(context.env?.CF_PAGES_COMMIT_SHA,40),branch:clean(context.env?.CF_PAGES_BRANCH,160),url:clean(context.env?.CF_PAGES_URL,500)},
    workspace:{scope:'辽宁2027备考家庭 / 2026物理类历史数据底座',productVersion:AIPLUS_PRODUCT_VERSION,productContractVersion:AIPLUS_PRODUCT_CONTRACT_VERSION,productMode:'family-advisor',deterministicFirst:true,modelMayChangeBusinessFacts:false,providerSwitchable:true,externalApiSupported:true,semanticMode:'intent-task-spec-v0.02',agentSemanticMode:'human-advisor-agent-kernel-v3992_0',decisionSemanticMode:'bounded-evidence-plan-v0.03',conversationMode:'continuous-human-advisor-v0.02',interruptionMode:'client-latest-write-wins-v3992_0',agentKernelVersion:AI_AGENT_KERNEL_VERSION,parentSemanticFrameVersion:PARENT_SEMANTIC_FRAME_VERSION,evidencePlanVersion:AI_EVIDENCE_PLAN_VERSION,claimEvidenceVersion:AI_CLAIM_EVIDENCE_VERSION,decisionResearchRuntimeVersion:AI_DECISION_RESEARCH_RUNTIME_VERSION},
    provider:{routerVersion:provider.version,primary:provider.primary,fallback:provider.fallback,primaryReady,primaryModel:provider.primaryModel||'',fallbackModel:provider.fallbackModel||'',workersModel:provider.workersModel||'',workersModelRequested:provider.workersModelRequested||'',workersModelMigrated:Boolean(provider.workersModelMigrated),workersModelMigratedFrom:provider.workersModelMigratedFrom||'',externalModel:provider.externalModel||'',workersAiBound:provider.workersAiBound,workersModelConfigured:provider.workersModelConfigured,externalConfigured:provider.externalConfigured,timeoutMs:provider.timeoutMs},
    evidence:{registryVersion:AI_EVIDENCE_REGISTRY_VERSION,officialSourceCount:evidence.length,levels:['A','C','D'],policy:'A=官方事实；C=确定性推导；D=缺少可靠证据时明确待核验。',claimContractVersion:AI_CLAIM_EVIDENCE_VERSION,officialWebGatewayVersion:AI_OFFICIAL_WEB_EVIDENCE_VERSION,officialWebConfigured,searchResultIsFact:false},
    tools:{registryVersion:AI_TOOL_REGISTRY_VERSION,enabled:listRegisteredAiTools(),schoolHistoryFact:AI_SCHOOL_HISTORY_FACT_CONTRACT}
  });
}

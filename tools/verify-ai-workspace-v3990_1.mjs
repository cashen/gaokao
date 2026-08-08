import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  createAiWorkspace, applyAiWorkspaceEvent, buildAiResultDelta, compactAiWorkspaceForServer,
  AI_WORKSPACE_CONTRACT_VERSION, AI_ACTIVE_VIEW_VERSION
} from '../shared/ai/ai-workspace-contract.v3990_1.js';
import { deterministicCommand } from '../functions/_lib/ai/command-interpreter.js';
import { orchestrateAiTurn } from '../functions/_lib/ai/turn-orchestrator.js';
import { listOfficialAiEvidence, auditExistingKbOfficialSources } from '../functions/_lib/ai/evidence-registry.js';
import { runSelectionReview } from '../functions/_lib/ai/selection-review.js';
import { runRankLookup } from '../functions/_lib/ai/tool-registry.js';
import { aiProviderConfig, extractWorkersAiText, runAiProvider } from '../functions/_lib/ai/provider-router.js';
import { DEFAULT_WORKERS_AI_MODEL, resolveAiModel } from '../functions/_lib/ai-model-resolver.js';
import { matchRegionRule } from '../shared/resources/geo/china-region-catalog.v3990_1.js';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>fs.readFileSync(path.join(ROOT,relative),'utf8');
const cmd=(text,workspace=createAiWorkspace())=>deterministicCommand(text,workspace);

function testColloquialSemanticCorpus(){
  let c=cmd('580分，先看看电气');assert.equal(c.operation,'search');assert.equal(c.score,580);assert.deepEqual(c.majorKeywords,['电气']);
  const follow=createAiWorkspace({activeView:{score:580,majorKeywords:['电气'],regionKeys:['all'],bottomLineMode:'all'}});
  c=cmd('机械呢',follow);assert.equal(c.operation,'refine');assert.equal(c.persistence,'active_view');assert.deepEqual(c.majorKeywords,['机械']);
  c=cmd('我想在机械',follow);assert.equal(c.operation,'refine');assert.deepEqual(c.majorKeywords,['机械']);
  c=cmd('省内机械',follow);assert.deepEqual(c.regionKeys,['province:辽宁']);assert.deepEqual(c.majorKeywords,['机械']);assert.equal(c.persistence,'active_view');
  c=cmd('那安徽呢',follow);assert.deepEqual(c.regionKeys,['province:安徽']);assert.equal(c.operation,'refine');
  c=cmd('安徽电气',follow);assert.deepEqual(c.regionKeys,['province:安徽']);assert.deepEqual(c.majorKeywords,['电气']);
  c=cmd('也看看机械',follow);assert.equal(c.combination,'union');assert.equal(c.operation,'refine');assert.deepEqual(c.majorKeywords,['机械']);
  c=cmd('电气和机械都看看',follow);assert.equal(c.operation,'refine');assert.equal(c.combination,'union');assert.deepEqual(new Set(c.majorKeywords),new Set(['电气','机械']));
  c=cmd('电气和机械怎么选',follow);assert.equal(c.operation,'compare');assert.equal(c.target,'major');
  c=cmd('机械还是电气',follow);assert.equal(c.operation,'compare');assert.equal(c.target,'major');
  c=cmd('还是机械吧',follow);assert.equal(c.operation,'refine');assert.deepEqual(c.majorKeywords,['机械']);
  c=cmd('不看机械了，看电气',follow);assert.equal(c.operation,'refine');assert.deepEqual(c.majorKeywords,['电气']);assert.ok(c.negativeMajorKeywords.includes('机械'));assert.equal(c.persistence,'active_view');
  c=cmd('机械不看了',follow);assert.equal(c.clearMajor,true);assert.equal(c.persistence,'active_view');
  c=cmd('先不限专业看看',follow);assert.equal(c.clearMajor,true);assert.equal(c.operation,'refine');
  c=cmd('600分位次是多少');assert.equal(c.operation,'answer');assert.equal(c.target,'fact');assert.equal(c.score,600);
  c=cmd('600分能上什么学校');assert.equal(c.operation,'search');assert.equal(c.target,'candidates');
  c=cmd('电气就业怎么样',follow);assert.equal(c.operation,'answer');assert.equal(c.persistence,'turn_only');
  c=cmd('我们家绝对不接受护理',follow);assert.equal(c.persistence,'family');assert.ok(c.familyChanges.majorExcludeKeywords.includes('护理'));
  c=cmd('回到上一批',createAiWorkspace({viewHistory:[{score:580,majorKeywords:['电气'],regionKeys:['all']}]}));assert.equal(c.operation,'restore');
}

function testViewHistoryAndFamilySeparation(){let workspace=createAiWorkspace();const commit=(text,view)=>{const command=cmd(text,workspace);workspace=applyAiWorkspaceEvent(workspace,{type:'command_committed',payload:{command,taskAction:workspace.mainTaskId?'update_main':'create_main',resolvedView:view,commitView:true}});};commit('580分，先看电气',{score:580,majorKeywords:['电气'],regionKeys:['all'],bottomLineMode:'all'});commit('机械呢',{score:580,majorKeywords:['机械'],regionKeys:['all'],bottomLineMode:'all'});commit('省内机械',{score:580,majorKeywords:['机械'],regionKeys:['province:辽宁'],bottomLineMode:'all'});commit('电气呢',{score:580,majorKeywords:['电气'],regionKeys:['province:辽宁'],bottomLineMode:'all'});assert.deepEqual(workspace.activeView.majorKeywords,['电气']);assert.deepEqual(workspace.activeView.regionKeys,['province:辽宁']);assert.ok(workspace.viewHistory.some(view=>view.majorKeywords.includes('机械')&&view.regionKeys.includes('province:辽宁')));assert.ok(workspace.viewHistory.some(view=>view.majorKeywords.includes('电气')&&view.regionKeys.includes('all')));assert.equal(workspace.hardConstraints.length,0);assert.equal(workspace.activeView.version,AI_ACTIVE_VIEW_VERSION);}
function testProvinceFilteringFailClosed(){const anhui={province:'安徽省',city:'合肥市',regionGroups:['outside','省外','安徽','province:安徽']};const jiangsu={province:'江苏省',city:'南京市',regionGroups:['outside','省外','江苏','province:江苏','jiangzhehu']};assert.equal(matchRegionRule(anhui,'province:安徽'),true);assert.equal(matchRegionRule(jiangsu,'province:安徽'),false);assert.equal(matchRegionRule(anhui,'安徽'),true);assert.equal(matchRegionRule(anhui,'totally-unknown-region-key'),false);}
function testDelta(){const previous={candidates:{counts:{upper:1,near:2,steady:1,total:4},records:[{id:'a'},{id:'b'}]}},next={candidates:{counts:{upper:1,near:3,steady:1,total:5},records:[{id:'b'},{id:'c'}]}};const delta=buildAiResultDelta(previous,next);assert.equal(delta.changed,true);assert.deepEqual(delta.addedPreviewIds,['c']);assert.deepEqual(delta.removedPreviewIds,['a']);assert.deepEqual(delta.countChanges.near,{before:2,after:3,delta:1});}
function testSelectionAndPayloadPrivacy(){const empty=runSelectionReview(null);assert.equal(empty.importRequired,true);const review=runSelectionReview({version:'test',items:[{school:'甲大学',major:'计算机',bandKey:'upper',rank2026:15000,displayLocation:'沈阳',tuition:''},{school:'乙大学',major:'软件工程',bandKey:'near',rank2026:19000,displayLocation:'沈阳',tuition:'5200'},{school:'丙大学',major:'电子信息',bandKey:'steady',rank2026:24000,displayLocation:'大连',tuition:'5200'}]});assert.equal(review.ok,true);assert.ok(review.findings.some(item=>item.key==='missing-tuition'));const huge='说明'.repeat(500);const workspace=createAiWorkspace({selectionSnapshot:{version:'stress',items:Array.from({length:112},(_,index)=>({id:`selection-${index}`,school:`测试大学${index}`,major:`机械${index}`,rank2026:20000+index,bandKey:'near',displayLocation:'沈阳',tuition:'5200',userNote:huge}))},lastResult:{identity:huge,candidates:{counts:{upper:1000,near:2000,steady:3000,total:6000},records:Array.from({length:48},(_,index)=>({id:`candidate-${index}`,school:`测试大学${index}`,major:`机械${index}`,payload:huge}))}},pendingChecks:Array.from({length:80},(_,index)=>({key:`k${index}`,level:'review',text:huge}))});const compact=compactAiWorkspaceForServer(workspace);const bytes=Buffer.byteLength(JSON.stringify({workspace:compact,input:'继续'}),'utf8');assert.ok(bytes<96*1024,`compact payload ${bytes}`);assert.equal(compact.selectionSnapshot.items[0].userNote,undefined);assert.equal(compact.lastResult.candidates.records[0].payload,undefined);assert.ok(compact.lastResult.candidates.records[0].school);}
function testOfficialEvidenceBoundary(){const evidence=listOfficialAiEvidence();assert.ok(evidence.some(item=>item.id==='china-administrative-divisions'));const allowed=['moe.gov.cn','ln.gov.cn','chsi.com.cn','nhc.gov.cn','moj.gov.cn','neea.edu.cn','gov.cn','locpg.gov.cn'];for(const item of evidence){const host=new URL(item.sourceUrl).hostname;assert.ok(allowed.some(suffix=>host===suffix||host.endsWith(`.${suffix}`)),`non-official host ${host}`);}const audit=auditExistingKbOfficialSources();assert.ok(Array.isArray(audit.rejected));}
function testRankAndProviderEcho(){const rank=runRankLookup(600);assert.equal(rank.ok,true);assert.equal(rank.rankEnd,14235);assert.ok(rank.source.sourceUrl.startsWith('https://jyt.ln.gov.cn/'));const provider=aiProviderConfig({AI_PROVIDER:'workers-ai',AI_WORKSPACE_MODEL:'@cf/example/model',AI_FALLBACK_PROVIDER:'qwen',AI_EXTERNAL_MODEL:'qwen-plus',AI_EXTERNAL_BASE_URL:'https://example.invalid/v1',AI_EXTERNAL_API_KEY:'secret'});assert.equal(provider.primary,'workers-ai');assert.equal(provider.primaryModel,'@cf/example/model');assert.equal(provider.fallback,'openai-compatible');assert.equal(provider.fallbackModel,'qwen-plus');assert.equal(JSON.stringify(provider).includes('secret'),false);}
async function testRankQuestionUsesLightweightDeterministicPath(){
  let modelCalls=0;
  const turn=await orchestrateAiTurn({env:{AI_PROVIDER:'workers-ai',AI_WORKSPACE_MODEL:DEFAULT_WORKERS_AI_MODEL,AI:{run:async()=>{modelCalls+=1;return{response:'{}'};}}}},{workspace:createAiWorkspace(),input:'600分位次是多少'});
  assert.equal(turn.ok,true);assert.equal(turn.command.operation,'answer');assert.equal(turn.command.target,'fact');assert.equal(turn.result.rank.rankEnd,14235);assert.equal(turn.result.candidates,null);assert.equal(turn.provider.provider,'deterministic');assert.equal(modelCalls,0);
}
async function testWorkersAiModelMigration(){
  const legacy='@cf/meta/llama-3.1-8b-instruct';
  const placeholder='AI_MODEL';
  assert.equal(DEFAULT_WORKERS_AI_MODEL,'@cf/zai-org/glm-4.7-flash');
  const defaultResolved=resolveAiModel({});assert.equal(defaultResolved.model,DEFAULT_WORKERS_AI_MODEL);assert.equal(defaultResolved.usedDefault,true);
  const legacyResolved=resolveAiModel({AI_MODEL:legacy});assert.equal(legacyResolved.model,DEFAULT_WORKERS_AI_MODEL);assert.equal(legacyResolved.migrated,true);assert.equal(legacyResolved.migratedFrom,legacy);
  const placeholderResolved=resolveAiModel({AI_MODEL:placeholder});assert.equal(placeholderResolved.model,DEFAULT_WORKERS_AI_MODEL);assert.equal(placeholderResolved.migrated,true);assert.equal(placeholderResolved.migratedFrom,placeholder);
  const config=aiProviderConfig({AI_PROVIDER:'workers-ai',AI_WORKSPACE_MODEL:legacy});assert.equal(config.primaryModel,DEFAULT_WORKERS_AI_MODEL);assert.equal(config.workersModelRequested,legacy);assert.equal(config.workersModelMigrated,true);assert.equal(config.workersModelMigratedFrom,legacy);
  let invokedModel='';
  const result=await runAiProvider({AI_PROVIDER:'workers-ai',AI_WORKSPACE_MODEL:legacy,AI:{run:async(model)=>{invokedModel=model;return{response:'{"ok":true,"echo":"migration-test"}'};}}},[{role:'user',content:'migration test'}],{maxTokens:100});
  assert.equal(result.ok,true);assert.equal(invokedModel,DEFAULT_WORKERS_AI_MODEL);assert.equal(result.model,DEFAULT_WORKERS_AI_MODEL);assert.equal(result.requestedModel,legacy);assert.equal(result.modelMigrated,true);assert.equal(result.migratedFrom,legacy);
  let placeholderInvokedModel='';
  const placeholderResult=await runAiProvider({AI_PROVIDER:'workers-ai',AI_WORKSPACE_MODEL:placeholder,AI:{run:async(model)=>{placeholderInvokedModel=model;return{response:'{"ok":true,"echo":"placeholder-migration-test"}'};}}},[{role:'user',content:'placeholder migration test'}],{maxTokens:100});
  assert.equal(placeholderResult.ok,true);assert.equal(placeholderInvokedModel,DEFAULT_WORKERS_AI_MODEL);assert.equal(placeholderResult.model,DEFAULT_WORKERS_AI_MODEL);assert.equal(placeholderResult.requestedModel,placeholder);assert.equal(placeholderResult.modelMigrated,true);assert.equal(placeholderResult.migratedFrom,placeholder);
  const external=aiProviderConfig({AI_PROVIDER:'external',AI_EXTERNAL_MODEL:legacy,AI_EXTERNAL_BASE_URL:'https://example.invalid/v1',AI_EXTERNAL_API_KEY:'secret'});assert.equal(external.primaryModel,legacy,'external provider model names must not be rewritten by Workers AI migration');
  const externalPlaceholder=aiProviderConfig({AI_PROVIDER:'external',AI_EXTERNAL_MODEL:placeholder,AI_EXTERNAL_BASE_URL:'https://example.invalid/v1',AI_EXTERNAL_API_KEY:'secret'});assert.equal(externalPlaceholder.primaryModel,placeholder,'external provider placeholder-shaped model names must not be rewritten by Workers AI migration');
}
async function testWorkersAiResponseShapesAndDiagnostics(){
  const segmented={choices:[{message:{content:[{type:'text',text:'{\"ok\":true}' }]}}]};
  const nested={result:{choices:[{message:{content:'nested-choice'}}]}};
  const output={output:[{content:[{type:'output_text',text:'output-part'}]}]};
  assert.equal(extractWorkersAiText(segmented),'{\"ok\":true}');
  assert.equal(extractWorkersAiText(nested),'nested-choice');
  assert.equal(extractWorkersAiText(output),'output-part');
  let capturedInput=null;
  const called=await runAiProvider({
    AI_PROVIDER:'workers-ai',AI_WORKSPACE_MODEL:DEFAULT_WORKERS_AI_MODEL,
    AI:{run:async(_model,input)=>{capturedInput=input;return segmented;}}
  },[{role:'user',content:'probe'}],{maxTokens:400,reasoningEffort:'low'});
  assert.equal(called.ok,true);assert.equal(called.text,'{\"ok\":true}');
  assert.equal(capturedInput.max_completion_tokens,400);assert.equal(capturedInput.stream,false);assert.equal(capturedInput.reasoning_effort,'low');assert.equal('max_tokens' in capturedInput,false);
  const empty=await runAiProvider({
    AI_PROVIDER:'workers-ai',AI_WORKSPACE_MODEL:DEFAULT_WORKERS_AI_MODEL,
    AI:{run:async()=>({choices:[{message:{content:[]}}],metadata:{opaque:'DO_NOT_LEAK'}})}
  },[{role:'user',content:'probe'}],{maxTokens:400,reasoningEffort:'low'});
  assert.equal(empty.ok,false);assert.equal(empty.failures[0].code,'AI_WORKERS_EMPTY_RESPONSE');
  assert.match(empty.failures[0].error,/result-shape=/);assert.match(empty.failures[0].error,/choicesType/);
  assert.equal(empty.failures[0].error.includes('DO_NOT_LEAK'),false);
}
function testSourceGuards(){const app=read('ai/app.v3990_1.js');assert.ok(app.includes("const DB_NAME = 'gaokao-ai-workspace-v3990_0'"),'v3990_1 must migrate the existing AI IndexedDB workspace in place');assert.ok(app.includes('AbortController'));assert.ok(app.includes('activeTurnSequence'));assert.ok(app.includes("index===0?'回到上一批'"));assert.ok(app.includes("executeTurn(index===0?'回到上一批'"));assert.equal(app.includes('继续问当前结果'),false);assert.equal(new RegExp(`localStorage\\.setItem\\(\\s*SELECTION_POOL_KEY`).test(app),false);const html=read('ai/index.html');assert.ok(html.includes('data-release="v3.9.90.1"'));assert.ok(html.includes('data-site-runtime-generation="v3990_1"'));assert.ok(html.includes('id="probeModel"'));assert.ok(html.includes('id="stopButton"'));const orchestrator=read('functions/_lib/ai/turn-orchestrator.js');assert.equal(orchestrator.includes('env.AI.run'),false);assert.ok(orchestrator.includes('runMajorComparison'));const toolRegistry=read('functions/_lib/ai/tool-registry.js');assert.ok(toolRegistry.includes("import { onRequest as majorBandsOnRequest } from '../../api/major-bands.js'"));assert.equal(toolRegistry.includes("fetch('/api/major-bands"),false);const probe=read('functions/api/ai/model-probe.js');assert.ok(probe.includes("context.request.method !== 'POST'"));assert.equal(probe.includes('AI_EXTERNAL_API_KEY:'),false);const providerRouter=read('functions/_lib/ai/provider-router.js');assert.ok(providerRouter.includes("resolveWorkersAiModelAlias"));assert.ok(providerRouter.includes('max_completion_tokens'));assert.ok(providerRouter.includes('stream:false'));assert.ok(providerRouter.includes('AI_WORKERS_EMPTY_RESPONSE'));assert.ok(probe.includes("reasoningEffort:'low'"));const health=read('functions/api/ai/health.js');assert.ok(health.includes('workersModelMigrated'));assert.ok(health.includes('primaryReady'));assert.ok(app.includes('provider.primaryReady'));assert.ok(app.includes('failure?.code'));assert.ok(html.includes('3990_1-model-probe-1'));const liveProbe=read('tools/verify-live-ai-model-v3990_1.mjs');assert.ok(liveProbe.includes('workersAiBound'));assert.ok(liveProbe.includes('probe?.match?.primaryMatched'));const productionWorkflow=read('.github/workflows/verify-production-api-health-v3971.yml');assert.ok(productionWorkflow.includes('Capture current production Workers AI failure evidence'));assert.ok(productionWorkflow.includes('Verify live Workers AI on production'));const geo=read('shared/resources/geo/china-region-catalog.v3990_1.js');assert.ok(geo.includes('Unknown region keys fail closed'));assert.ok(geo.includes('province:'));}
async function main(){testColloquialSemanticCorpus();testViewHistoryAndFamilySeparation();testProvinceFilteringFailClosed();testDelta();testSelectionAndPayloadPrivacy();testOfficialEvidenceBoundary();testRankAndProviderEcho();await testRankQuestionUsesLightweightDeterministicPath();await testWorkersAiModelMigration();await testWorkersAiResponseShapesAndDiagnostics();testSourceGuards();console.log(JSON.stringify({ok:true,contract:AI_WORKSPACE_CONTRACT_VERSION,checks:['colloquial-command-corpus','active-view-history','temporary-vs-family','province-exact-filter','unknown-region-fail-closed','union-vs-compare','clear-major','result-delta','payload-privacy','official-evidence','rank-600=14235','rank-question-lightweight-deterministic','model-echo-safe','workers-ai-deprecated-model-migration','workers-ai-placeholder-model-migration','workers-ai-run-uses-current-model','workers-ai-response-shapes','workers-ai-modern-completion-budget','workers-ai-safe-empty-response-diagnostic','external-model-not-rewritten','binding-aware-health-readiness','live-model-failure-visible','production-live-model-gate','abort-latest-write-source-guard']},null,2));}
main().catch(error=>{console.error(error);process.exit(1);});

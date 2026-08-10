import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createAiWorkspace,applyAiWorkspaceEvent,compactAiWorkspaceForServer,buildAiResultDelta,applyAiViewPatch,regionKeyLabel,
  AI_WORKSPACE_CONTRACT_VERSION,AI_ACTIVE_VIEW_VERSION,AI_AGENT_CONTEXT_VERSION
} from '../shared/ai/ai-workspace-contract.v3992_0.js';
import { deterministicCommand,interpretAiCommand,shouldShortCircuitAiProvider,resolveAiSchoolMentions } from '../functions/_lib/ai/command-interpreter.js';
import { AI_AGENT_KERNEL_VERSION,explicitScoreUsage } from '../functions/_lib/ai/agent-task-kernel.js';
import { deterministicMentorProfile,AI_MENTOR_PROFILE_VERSION,MENTOR_SKILLSET_ATTRIBUTION } from '../functions/_lib/ai/mentor-profile.js';
import { runRankLookup,runBackgroundDiscovery,normalizeOptionalCandidateScore,AI_TOOL_REGISTRY_VERSION } from '../functions/_lib/ai/tool-registry.js';
import { DEFAULT_WORKERS_AI_MODEL } from '../functions/_lib/ai-model-resolver.js';
import { matchRegionRule } from '../shared/resources/geo/china-region-catalog.v3990_1.js';
import { starterScenariosForScore } from '../ai/parent-starter.v3992_1.js';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const cmd=(text,workspace=createAiWorkspace(),resolvedSchools=[])=>deterministicCommand(text,workspace,resolvedSchools);
function apply(text,view,workspace=createAiWorkspace({activeView:view})){const command=cmd(text,workspace);return{command,view:applyAiViewPatch(view,command.changeSet,workspace.examContext)};}

function testCandidatePatchJourney(){
  let view={score:null,regionKeys:['all'],majorKeywords:[],schoolNames:[],bottomLineMode:'all'};
  let step=apply('580分，先看看机械',view);view=step.view;assert.equal(step.command.agentTask,'candidate_discovery');assert.equal(view.score,580);assert.deepEqual(view.majorKeywords,['机械']);
  step=apply('省内',view,createAiWorkspace({activeView:view}));view=step.view;assert.equal(step.command.agentTask,'candidate_refinement');assert.deepEqual(view.regionKeys,['ln']);assert.equal(view.score,580);assert.deepEqual(view.majorKeywords,['机械']);
  step=apply('沈阳',view,createAiWorkspace({activeView:view}));view=step.view;assert.deepEqual(view.regionKeys,['shenyang']);assert.equal(view.score,580);assert.deepEqual(view.majorKeywords,['机械']);
  step=apply('电气也看看',view,createAiWorkspace({activeView:view}));assert.equal(step.command.changeSet.major.op,'add');view=step.view;assert.deepEqual(view.majorKeywords,['机械','电气']);
  step=apply('只留电气',view,createAiWorkspace({activeView:view}));assert.equal(step.command.changeSet.major.op,'set');assert.deepEqual(step.view.majorKeywords,['电气']);
}

function testTaskSwitchAndReference(){
  const candidate=createAiWorkspace({examContext:{score:580,rank:25000},activeView:{score:580,regionKeys:['shenyang'],majorKeywords:['机械']}});
  let first=cmd('沈阳工业大学自动化多少分',candidate);assert.equal(first.agentTask,'school_major_history');assert.equal(first.scoreUsage,'remembered');assert.equal(first.executionPolicy.commitView,false);assert.equal(first.focus.school,'沈阳工业大学');assert.equal(first.focus.major,'自动化');
  const historyWorkspace=createAiWorkspace({...candidate,agentContext:{currentTask:'school_major_history',focus:{school:'沈阳工业大学',major:'自动化',majors:['自动化']}}});
  const follow=cmd('辽宁科技大学这个专业呢',historyWorkspace);assert.equal(follow.agentTask,'school_major_history');assert.equal(follow.focus.school,'辽宁科技大学');assert.equal(follow.focus.major,'自动化');assert.equal(follow.scoreUsage,'remembered');
  const suspend=cmd('先别管我的分数，就看这个专业本身',historyWorkspace);assert.equal(suspend.scoreUsage,'suspended');assert.equal(suspend.agentTask,'school_major_history');assert.equal(suspend.focus.school,'沈阳工业大学');assert.equal(suspend.focus.major,'自动化');
  const fit=cmd('那我580够吗',historyWorkspace);assert.equal(fit.agentTask,'fit_assessment');assert.equal(fit.scoreUsage,'active');assert.equal(fit.focus.school,'沈阳工业大学');assert.equal(fit.focus.major,'自动化');
}

function testBackgroundTasks(){
  const workspace=createAiWorkspace({examContext:{score:580},activeView:{score:580,regionKeys:['ln'],majorKeywords:['机械']}});
  const discovery=cmd('帮我找出省内值得报的专业',workspace);assert.equal(discovery.agentTask,'background_discovery');assert.equal(discovery.scoreUsage,'remembered');
  const fit=cmd('按我580分，省内这些有背景的方向哪些够得着',workspace);assert.equal(fit.agentTask,'background_fit_discovery');assert.equal(fit.scoreUsage,'active');
  const school=cmd('沈阳工业大学有哪些有背景的强项方向',workspace);assert.equal(school.agentTask,'school_background');assert.equal(school.focus.school,'沈阳工业大学');
  const majorWorkspace=createAiWorkspace({...workspace,agentContext:{currentTask:'school_major_history',focus:{school:'沈阳工业大学',major:'自动化'}}});
  const major=cmd('自动化在省内哪些学校有背景',majorWorkspace);assert.equal(major.agentTask,'major_background');assert.equal(major.focus.major,'自动化');
  const bg=runBackgroundDiscovery({limit:12,regionKeys:['ln']});assert.equal(bg.ok,true);assert.ok(bg.items.length>0);assert.ok(bg.meta?.boundary);assert.ok(String(bg.boundary).includes('未显示'));
}

function testExplicitContextPolicy(){
  const w=createAiWorkspace({examContext:{score:580}});assert.equal(explicitScoreUsage('先别管我的分数，只看学校本身',w),'suspended');assert.equal(explicitScoreUsage('那我580够吗',w),'active');assert.equal(explicitScoreUsage('这个学校去年多少分',w),'remembered');
}

function testGeoAndDelta(){
  assert.equal(regionKeyLabel('shenyang'),'沈阳');assert.equal(regionKeyLabel('dalian'),'大连');
  const shenyang={province:'辽宁省',city:'沈阳市',lnArea:'沈阳',regionGroups:['ln','辽宁省内','shenyang','沈阳','province:辽宁']};assert.equal(matchRegionRule(shenyang,'shenyang'),true);assert.equal(matchRegionRule(shenyang,'dalian'),false);
  assert.equal(matchRegionRule({province:'新疆',city:'乌鲁木齐'},'any:province:新疆|province:西藏'),true);assert.equal(matchRegionRule({province:'西藏',city:'拉萨'},'any:province:新疆|province:西藏'),true);assert.equal(matchRegionRule({province:'山东',city:'济南'},'any:province:新疆|province:西藏'),false);
  const previous={candidates:{counts:{upper:6,near:9,steady:36,total:51},records:[{id:'a'},{id:'b'}]}},next={candidates:{counts:{upper:4,near:7,steady:20,total:31},records:[{id:'b'}]}};const delta=buildAiResultDelta(previous,next,{previousView:{score:580,regionKeys:['all'],majorKeywords:['机械']},nextView:{score:580,regionKeys:['ln'],majorKeywords:['机械']}});assert.ok(delta.scopeChanges.regionKeys);assert.equal(delta.scopeChanges.score,undefined);assert.equal(delta.scopeChanges.majorKeywords,undefined);
  const regionWorkspace=createAiWorkspace({examContext:{score:580},activeView:{score:580,regionKeys:['shenyang'],majorKeywords:['机械']}});
  let regional=cmd('不看沈阳了，看大连',regionWorkspace);assert.deepEqual(regional.changeSet.region.keys,['dalian']);assert.equal(regional.changeSet.region.op,'set');
  regional=cmd('沈阳和大连一起看',regionWorkspace);assert.equal(regional.changeSet.region.op,'set');assert.deepEqual(regional.changeSet.region.keys,['shenyang','dalian']);
  regional=cmd('沈阳先不限制了',regionWorkspace);assert.equal(regional.changeSet.region.op,'clear');
  const schoolNameRegion=cmd('辽宁科技大学自动化多少分',regionWorkspace);assert.equal(schoolNameRegion.agentTask,'school_major_history');assert.deepEqual(schoolNameRegion.regionKeys,[]);

}

function testWorkspaceMigrationAndMemory(){
  let workspace=createAiWorkspace({contractVersion:'ai-workspace-contract-v3991_0',examContext:{score:580,rank:25000},activeView:{score:580,regionKeys:['shenyang'],majorKeywords:['机械']},lastTurn:{task:'school_major_history',focus:{school:'沈阳工业大学',major:'自动化'}}});assert.equal(workspace.contractVersion,'ai-workspace-contract-v3992_0');assert.equal(workspace.agentContext.version,AI_AGENT_CONTEXT_VERSION);assert.equal(workspace.agentContext.focus.school,'沈阳工业大学');
  const command=cmd('普通家庭，更看重本科就业，不想把读研当必选项',workspace);assert.equal(command.mentorProfile.version,AI_MENTOR_PROFILE_VERSION);workspace=applyAiWorkspaceEvent(workspace,{type:'command_committed',payload:{command,resolvedView:workspace.activeView,commitView:false,decisionStage:'school_focus',taskAction:'create_main',agentContext:{currentTask:'general_advice',focus:{school:'沈阳工业大学',major:'自动化'},contextUsage:{score:'remembered'}}}});assert.equal(workspace.examContext.score,580);assert.equal(workspace.agentContext.focus.major,'自动化');assert.ok(workspace.decisionProfile.explicit.priorities.includes('employment'));
}

async function testLockedCommandsSkipProvider(){let calls=0;const workspace=createAiWorkspace({examContext:{score:440},activeView:{score:440,regionKeys:['ln'],majorKeywords:[],schoolNames:[],bottomLineMode:'all'}});const deterministic=deterministicCommand('中外合作也可以，预算可以上浮',workspace);assert.equal(deterministic.agentTask,'candidate_refinement');assert.equal(deterministic.bottomLineMode,'public_include_sino');assert.equal(shouldShortCircuitAiProvider(deterministic),true);const result=await interpretAiCommand('中外合作也可以，预算可以上浮',workspace,{AI_PROVIDER:'workers-ai',AI_WORKSPACE_MODEL:DEFAULT_WORKERS_AI_MODEL,AI:{run:async()=>{calls++;throw new Error('locked deterministic command must not call model');}}});assert.equal(calls,0);assert.equal(result.command.agentTask,'candidate_refinement');assert.equal(result.provider.skipped,true);const history=deterministicCommand('沈航的电气呢',createAiWorkspace({examContext:{score:580},agentContext:{currentTask:'school_major_history',focus:{school:'沈阳工业大学',major:'电气'}}}));assert.equal(shouldShortCircuitAiProvider(history),true);}

async function testModelCanCorrectTaskNotFacts(){
  let captured=null;const workspace=createAiWorkspace({examContext:{score:580},activeView:{score:580,regionKeys:['shenyang'],majorKeywords:['机械']},agentContext:{currentTask:'candidate_refinement',focus:{}}});
  const result=await interpretAiCommand('我只是想查这个学校专业本身',workspace,{AI_PROVIDER:'workers-ai',AI_WORKSPACE_MODEL:DEFAULT_WORKERS_AI_MODEL,AI:{run:async(_model,input)=>{captured=input;return{response:JSON.stringify({agentTask:'general_advice',scoreUsage:'suspended',mentorProfile:{primaryGoal:'undecided',priorities:[]},confidence:.95,requiresConfirmation:false,changeSet:{score:{op:'set',value:720},region:{op:'set',keys:['province:北京']}}})};}}});
  assert.equal(result.command.agentTask,'general_advice');assert.equal(result.command.scoreUsage,'suspended');assert.equal(result.command.changeSet.score.op,'inherit');assert.equal(result.command.changeSet.region.op,'inherit');assert.ok(captured.messages[0].content.includes('事实边界'));
}

function testPrivacyBudget(){const huge='备注'.repeat(800),workspace=createAiWorkspace({agentContext:{currentTask:'school_major_history',focus:{school:'沈阳工业大学',major:'自动化'}},turnHistory:Array.from({length:80},(_,i)=>({userText:`第${i}轮 ${huge}`,assistantSummary:huge,changeSummary:huge,task:'general_advice',focus:{school:'测试大学'}})),selectionSnapshot:{items:[{id:'a',school:'测试大学',major:'机械',userNote:huge}]},lastResult:{history:{school:'测试大学',majorKeyword:'机械',records:[{id:'x',school:'测试大学',major:'机械',score2026:580,rank2026:20000,payload:huge}]}}});const compact=compactAiWorkspaceForServer(workspace),json=JSON.stringify({workspace:compact,input:'继续'});assert.ok(Buffer.byteLength(json,'utf8')<128*1024);assert.equal(json.includes('userNote'),false);assert.equal(json.includes('payload'),false);assert.ok(compact.recentTurns.length<=10);}


async function testParentHumanJourneysV3992_1(){
  const fakeResolver={resolve(query){const map={沈航:'沈阳航空航天大学',辽科大:'辽宁科技大学'},school=map[query]||'';return school?{status:'resolved',resolvedName:school,candidates:[]}:{status:'not_found',candidates:[]};}};
  const shenyangAviation=await resolveAiSchoolMentions('沈航的电气呢',fakeResolver);assert.deepEqual(shenyangAviation,['沈阳航空航天大学']);
  const liaoningTech=await resolveAiSchoolMentions('辽科大的电气呢',fakeResolver);assert.deepEqual(liaoningTech,['辽宁科技大学']);
  const directAlias=await resolveAiSchoolMentions('那辽科大呢',fakeResolver);assert.deepEqual(directAlias,['辽宁科技大学']);
  let accidentalResolverCalls=0;const guardResolver={resolve(){accidentalResolverCalls++;return{status:'not_found',candidates:[]};}};for(const ordinary of ['440分，辽宁省内先看能上的学校','省内','公办优先','本科就业怎么选','预算可以上浮看看中外'])assert.deepEqual(await resolveAiSchoolMentions(ordinary,guardResolver),[],ordinary);assert.equal(accidentalResolverCalls,0,'ordinary parent decision language must not load school resolver');
  assert.equal(normalizeOptionalCandidateScore(null),null);assert.equal(normalizeOptionalCandidateScore(''),null);assert.equal(normalizeOptionalCandidateScore(580),580);
  const history=createAiWorkspace({examContext:{score:580},activeView:{score:580,regionKeys:['ln'],majorKeywords:['电气'],schoolNames:['沈阳工业大学']},agentContext:{currentTask:'school_major_history',focus:{school:'沈阳工业大学',major:'电气'}}});
  let c=cmd('沈航的电气呢',history,shenyangAviation);assert.equal(c.agentTask,'school_major_history');assert.equal(c.focus.school,'沈阳航空航天大学');assert.equal(c.focus.major,'电气');assert.equal(c.scoreUsage,'remembered');assert.equal(c.executionPolicy.commitView,false);
  c=cmd('辽科大的电气呢',history,liaoningTech);assert.equal(c.agentTask,'school_major_history');assert.equal(c.focus.school,'辽宁科技大学');assert.equal(c.focus.major,'电气');
  c=cmd('沈阳工业大学所有专业的最低录取分',history);assert.equal(c.agentTask,'school_history');assert.equal(c.focus.school,'沈阳工业大学');assert.equal(c.focus.major,'');assert.equal(c.executionPolicy.commitView,false);
  const majorBg=createAiWorkspace({examContext:{score:580},activeView:{score:580,regionKeys:['ln'],majorKeywords:['电气']},agentContext:{currentTask:'major_background',focus:{major:'电气',majors:['电气']}}});c=cmd('辽科大',majorBg,liaoningTech);assert.equal(c.agentTask,'school_major_history');assert.equal(c.focus.school,'辽宁科技大学');assert.equal(c.focus.major,'电气');
  let advice=cmd('不只看学校层次，优先比较专业质量和培养路径',createAiWorkspace({examContext:{score:650},activeView:{score:650,regionKeys:['all'],majorKeywords:[]}}));assert.equal(advice.agentTask,'general_advice');assert.equal(advice.taskLocked,true);assert.equal(advice.executionPolicy.commitView,false);advice=cmd('学校平台和专业质量怎么平衡',createAiWorkspace({examContext:{score:620},activeView:{score:620,regionKeys:['all'],majorKeywords:[]}}));assert.equal(advice.agentTask,'general_advice');assert.equal(advice.taskLocked,true);assert.equal(advice.executionPolicy.commitView,false);advice=cmd('不能只看学校平台，本科就业和读研怎么取舍',createAiWorkspace({examContext:{score:580},activeView:{score:580,regionKeys:['ln'],majorKeywords:['电气']}}));assert.equal(advice.agentTask,'general_advice');assert.equal(advice.taskLocked,true);assert.equal(advice.executionPolicy.commitView,false);
  for(const score of [350,440,500,580,620,630,650]){const scenarios=starterScenariosForScore(score);assert.ok(scenarios.length>=4,String(score));const w=createAiWorkspace({examContext:{score},activeView:{score,regionKeys:['all'],majorKeywords:[]}});if(score===440){let q=cmd('440分，中外合作也可以，预算可以上浮',w);assert.equal(q.bottomLineMode,'public_include_sino');q=cmd('440分，新疆、西藏也可以，优先公办',w);assert.ok(q.regionKeys.includes('province:新疆')&&q.regionKeys.includes('province:西藏'));assert.equal(q.bottomLineMode,'public_first');q=cmd('440分，民办也可以，看看能增加哪些选择',w);assert.equal(q.bottomLineMode,'all');}if(score===580){const q=cmd('580分，愿意加预算，看看有没有211中外或高收费项目值得研究',w);assert.equal(q.platformTarget,'211');assert.equal(q.bottomLineMode,'public_include_sino');}if(score===620){const q=cmd('620分，愿意加预算，看看有没有985中外或高收费项目值得研究',w);assert.equal(q.platformTarget,'985');assert.equal(q.bottomLineMode,'public_include_sino');}if(score===650)assert.equal(scenarios.some(x=>/加预算|中外/.test(x.label+x.prompt)),false,'650 starter should not nudge spending');}
}

function testAiSchoolResolverBoundary(){const source=read('functions/_lib/ai/command-interpreter.js'),stable=read('tongxue/data/school-name-resolver-v150.js');assert.ok(source.includes('createSchoolNameResolver'));assert.ok(source.includes('SCHOOL_NAME_DATA_URL'));assert.ok(source.includes('env?.ASSETS?.fetch'));assert.ok(source.includes("row[3]==='本科'"));assert.ok(source.includes('resolveAiSchoolMentions'));assert.equal(source.includes('SCHOOL_PROFILE_ROWS'),false);assert.equal(source.includes('school-query-provider.v3969'),false);assert.equal(stable.includes('explicitSchoolAliasesInText'),false);}

function testSchoolHistoryStreamingBoundary(){const api=read('functions/api/school-majors.js'),manifest=read('functions/_lib/ln-rank-manifest.js');assert.ok(api.includes('loadMatchingRecords'));assert.equal(api.includes('loadAllRecords(context.request'),false);assert.ok(api.indexOf('getAdmissionSchoolDirectoryMeta')<api.indexOf('loadMatchingRecords('),'school identity must resolve before rank chunks are scanned');assert.ok(manifest.includes('export async function loadMatchingRecords'));assert.ok(manifest.includes('for(const chunk of chunks)'));assert.ok(manifest.includes('env?.ASSETS?.fetch'));}
function testExactSchoolQueryLightPath(){const api=read('functions/api/school-majors.js'),provider=read('functions/_lib/school-query-provider.v3969.js');assert.ok(api.includes('resolveExactAdmissionSchool'));assert.ok(api.indexOf('resolveExactAdmissionSchool')<api.indexOf('resolveAdmissionSchoolQuery(context.request'),'exact school path must precede fuzzy resolver');assert.ok(provider.includes('async function loadAdmissionDirectory'));assert.ok(provider.includes('export async function resolveExactAdmissionSchool'));const metaStart=provider.indexOf('export async function getAdmissionSchoolDirectoryMeta');const metaEnd=provider.indexOf('export function releaseSchoolQueryProviderCache');assert.ok(metaStart>=0&&metaEnd>metaStart);assert.equal(provider.slice(metaStart,metaEnd).includes('loadResources(request)'),false,'directory metadata must not build 2952-school resolver');}
function testAiSchoolQueryCacheReleaseBoundary(){const registry=read('functions/_lib/ai/tool-registry.js'),provider=read('functions/_lib/school-query-provider.v3969.js');assert.ok(registry.includes("releaseSchoolQueryProviderCache"));assert.ok(registry.includes("finally{releaseSchoolQueryProviderCache();}"));assert.ok(provider.includes('export function releaseSchoolQueryProviderCache()'));assert.ok(provider.includes('clearSchoolQueryProviderCacheForTest()'));}
function testAiMajorBandsResourceBoundary(){const source=read('functions/_lib/ai/tool-registry.js'),majorBands=read('functions/api/major-bands.js');assert.ok(source.includes("onRequest as majorBandsOnRequest"));assert.ok(source.includes("majorBandsOnRequest({...context,request})"));assert.ok(source.includes("new URL('/api/major-bands',sourceUrl.origin)"));assert.equal(majorBands.includes("AI_TOOL_REGISTRY_VERSION"),false);}

function testFactsSkillAndUi(){const rank=runRankLookup(600);assert.equal(rank.ok,true);assert.equal(rank.rankEnd,14235);const profile=deterministicMentorProfile('普通家庭，想稳定就业，不想读太久');assert.equal(profile.enabled,true);assert.equal(MENTOR_SKILLSET_ATTRIBUTION.repository,'cashen/zhangxuefeng-skillset');assert.equal(MENTOR_SKILLSET_ATTRIBUTION.commit,'9a3306d84ea38874bbdbb9e6e62079ba1409e97e');assert.equal(MENTOR_SKILLSET_ATTRIBUTION.knowledgeLicense,'CC BY 4.0');assert.equal(AI_TOOL_REGISTRY_VERSION,'ai-tool-registry-v3992_0');
  const html=read('ai/index.html'),app=read('ai/app.v3990_1.js'),render=read('ai/render.v3992_0.js'),css=read('ai/agent.v3992_0.css'),health=read('functions/api/ai/health.js');assert.ok(html.includes('ai-human-advisor-agent-v3992_0'));assert.ok(html.includes('想到哪就继续问'));assert.ok(app.includes('renderProcessingTurn'));assert.ok(app.includes('停止本轮'));assert.ok(render.includes('history_records'));assert.ok(render.includes('background_routes'));assert.ok(render.includes('已收到你的问题'));assert.ok(render.includes('不会用等待时间伪造百分比'));assert.ok(css.includes('.processing-card'));assert.ok(health.includes('human-advisor-agent-kernel-v3992_0'));assert.ok(health.includes("semanticMode:'command-active-view-history-v3990_1'"));assert.ok(!render.includes('`upper ·'));
}

assert.equal(AI_WORKSPACE_CONTRACT_VERSION,'ai-workspace-contract-v3992_0');assert.equal(AI_ACTIVE_VIEW_VERSION,'ai-active-view-v3992_0');assert.equal(AI_AGENT_KERNEL_VERSION,'ai-human-advisor-kernel-v3992_0');
testCandidatePatchJourney();testTaskSwitchAndReference();testBackgroundTasks();testExplicitContextPolicy();testGeoAndDelta();testWorkspaceMigrationAndMemory();await testLockedCommandsSkipProvider();await testModelCanCorrectTaskNotFacts();testPrivacyBudget();await testParentHumanJourneysV3992_1();testAiSchoolResolverBoundary();testSchoolHistoryStreamingBoundary();
testExactSchoolQueryLightPath();
testAiSchoolQueryCacheReleaseBoundary();
testAiMajorBandsResourceBoundary();testFactsSkillAndUi();
console.log(JSON.stringify({ok:true,version:'v3992_0',checks:['candidate-patch-journey','task-switch-memory-not-execution','school-major-history-followup-reference','score-suspend-reactivate','background-discovery','background-fit-discovery','focus-trace','workspace-v3991-migration','model-task-correction-with-fact-isolation','privacy-budget','loading-source','skill-attribution','rank-fact']},null,2));

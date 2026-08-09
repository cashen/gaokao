import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createAiWorkspace,applyAiWorkspaceEvent,compactAiWorkspaceForServer,buildAiResultDelta,applyAiViewPatch,regionKeyLabel,
  AI_WORKSPACE_CONTRACT_VERSION,AI_ACTIVE_VIEW_VERSION,AI_DECISION_PROFILE_VERSION,AI_TURN_HISTORY_VERSION
} from '../shared/ai/ai-workspace-contract.v3991_0.js';
import { deterministicCommand,interpretAiCommand } from '../functions/_lib/ai/command-interpreter.js';
import { deterministicMentorProfile,AI_MENTOR_PROFILE_VERSION,MENTOR_SKILLSET_ATTRIBUTION } from '../functions/_lib/ai/mentor-profile.js';
import { runRankLookup } from '../functions/_lib/ai/tool-registry.js';
import { DEFAULT_WORKERS_AI_MODEL } from '../functions/_lib/ai-model-resolver.js';
import { matchRegionRule } from '../shared/resources/geo/china-region-catalog.v3990_1.js';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const cmd=(text,workspace=createAiWorkspace())=>deterministicCommand(text,workspace);
function apply(text,view,workspace=createAiWorkspace({activeView:view})){const command=cmd(text,workspace);return{command,view:applyAiViewPatch(view,command.changeSet,workspace.examContext)};}

function testPatchSemantics(){
  let view={score:null,regionKeys:['all'],majorKeywords:[],schoolNames:[],bottomLineMode:'all'};
  let step=apply('580分，先看看机械',view);view=step.view;assert.equal(view.score,580);assert.deepEqual(view.majorKeywords,['机械']);assert.deepEqual(view.regionKeys,['all']);
  step=apply('省内',view,createAiWorkspace({activeView:view}));assert.equal(step.command.changeSet.region.op,'set');assert.deepEqual(step.command.changeSet.region.keys,['ln']);view=step.view;assert.equal(view.score,580);assert.deepEqual(view.majorKeywords,['机械']);assert.deepEqual(view.regionKeys,['ln']);
  step=apply('沈阳',view,createAiWorkspace({activeView:view}));view=step.view;assert.equal(view.score,580);assert.deepEqual(view.majorKeywords,['机械']);assert.deepEqual(view.regionKeys,['shenyang']);
  step=apply('电气也看看',view,createAiWorkspace({activeView:view}));assert.equal(step.command.changeSet.major.op,'add');view=step.view;assert.deepEqual(view.majorKeywords,['机械','电气']);assert.deepEqual(view.regionKeys,['shenyang']);
  step=apply('只留电气',view,createAiWorkspace({activeView:view}));assert.equal(step.command.changeSet.major.op,'set');view=step.view;assert.deepEqual(view.majorKeywords,['电气']);assert.equal(view.score,580);assert.deepEqual(view.regionKeys,['shenyang']);
  step=apply('电气不要了',view,createAiWorkspace({activeView:view}));assert.equal(step.command.changeSet.major.op,'remove');view=step.view;assert.deepEqual(view.majorKeywords,[]);
  step=apply('机械看看',view,createAiWorkspace({activeView:view}));view=step.view;assert.deepEqual(view.majorKeywords,['机械']);
  step=apply('专业不限',view,createAiWorkspace({activeView:view}));assert.equal(step.command.changeSet.major.op,'clear');view=step.view;assert.deepEqual(view.majorKeywords,[]);assert.deepEqual(view.regionKeys,['shenyang']);
  step=apply('不是机械，是自动化',{...view,majorKeywords:['机械']},createAiWorkspace({activeView:{...view,majorKeywords:['机械']}}));assert.equal(step.command.changeSet.major.op,'set');assert.deepEqual(step.view.majorKeywords,['自动化']);
}

function testNoImplicitDimensionClearing(){
  const view={score:580,regionKeys:['shenyang'],majorKeywords:['机械'],schoolNames:['沈阳工业大学'],bottomLineMode:'public_regular_only'};
  const command=cmd('省内',createAiWorkspace({activeView:view}));const next=applyAiViewPatch(view,command.changeSet,{});assert.deepEqual(next.majorKeywords,['机械']);assert.deepEqual(next.schoolNames,['沈阳工业大学']);assert.equal(next.bottomLineMode,'public_regular_only');assert.equal(next.score,580);
  const info=cmd('这个专业就业怎么样',createAiWorkspace({activeView:view,lastResult:{candidates:{records:[{school:'沈阳工业大学',major:'机械工程'}]}}}));assert.equal(info.changeSet.major.op,'inherit');assert.equal(info.changeSet.school.op,'inherit');assert.equal(info.changeSet.region.op,'inherit');
}

function testGeoSingleSource(){
  assert.equal(regionKeyLabel('shenyang'),'沈阳');assert.equal(regionKeyLabel('dalian'),'大连');assert.equal(regionKeyLabel('ln'),'辽宁省内');
  const shenyang={province:'辽宁省',city:'沈阳市',lnArea:'沈阳',regionGroups:['ln','辽宁省内','shenyang','沈阳','province:辽宁']};
  assert.equal(matchRegionRule(shenyang,'shenyang'),true);assert.equal(matchRegionRule(shenyang,'dalian'),false);assert.equal(matchRegionRule(shenyang,'totally-unknown-region'),false);
  assert.deepEqual(cmd('沈阳',createAiWorkspace({activeView:{score:580,majorKeywords:['机械'],regionKeys:['ln']}})).regionKeys,['shenyang']);
}

function testPersistentDecisionProfileAndTurns(){
  let workspace=createAiWorkspace({activeView:{score:580,regionKeys:['shenyang'],majorKeywords:['机械']}});
  const command=cmd('普通家庭，更看重本科就业，不想把读研当必选项',workspace);assert.equal(command.mentorProfile.version,AI_MENTOR_PROFILE_VERSION);assert.equal(command.mentorProfile.persistable.familyResourceSensitivity,'resource_sensitive');assert.ok(command.mentorProfile.persistable.priorities.includes('employment'));assert.equal(command.mentorProfile.persistable.studyDurationTolerance,'prefer_short');
  workspace=applyAiWorkspaceEvent(workspace,{type:'command_committed',payload:{command,resolvedView:workspace.activeView,commitView:false,decisionStage:'school_focus',taskAction:'create_main'}});
  workspace=applyAiWorkspaceEvent(workspace,{type:'result_committed',payload:{result:{decisionStage:'school_focus',rank:{rankEnd:20000},candidates:{counts:{upper:1,near:2,steady:3,total:6},records:[]},pendingChecks:[]},turn:{userText:'普通家庭，更看重本科就业，不想把读研当必选项',assistantSummary:'记住就业与培养周期。',changeSummary:'筛选条件不变。',blocks:[{type:'assistant_message',text:'筛选条件不变。'}],command,stage:'school_focus'}}});
  assert.equal(workspace.decisionProfile.version,AI_DECISION_PROFILE_VERSION);assert.equal(workspace.decisionProfile.explicit.familyResourceSensitivity,'resource_sensitive');assert.ok(workspace.decisionProfile.explicit.priorities.includes('employment'));assert.equal(workspace.decisionProfile.explicit.studyDurationTolerance,'prefer_short');assert.equal(workspace.turnHistory.length,1);assert.equal(workspace.turnHistory[0].version,AI_TURN_HISTORY_VERSION);assert.equal(workspace.conversationMemory.lastUserText.includes('普通家庭'),true);
}

function testDeltaExplainsScope(){const previous={candidates:{counts:{upper:6,near:9,steady:36,total:51},records:[{id:'a'},{id:'b'}]}},next={candidates:{counts:{upper:4,near:7,steady:20,total:31},records:[{id:'b'}]}};const delta=buildAiResultDelta(previous,next,{previousView:{score:580,regionKeys:['all'],majorKeywords:['机械']},nextView:{score:580,regionKeys:['ln'],majorKeywords:['机械']}});assert.equal(delta.changed,true);assert.ok(delta.scopeChanges.regionKeys);assert.equal(delta.scopeChanges.score,undefined);assert.equal(delta.scopeChanges.majorKeywords,undefined);assert.deepEqual(delta.countChanges.total,{before:51,after:31,delta:-20});}

function testPrivacyBudget(){const huge='备注'.repeat(800);const workspace=createAiWorkspace({decisionProfile:{explicit:{primaryGoal:'employment_stability',priorities:['employment'],sourceTexts:[huge]}},turnHistory:Array.from({length:60},(_,i)=>({userText:`第${i}轮 ${huge}`,assistantSummary:huge,changeSummary:huge,blocks:[{type:'x',text:huge}]})),selectionSnapshot:{version:'x',items:[{id:'a',school:'测试大学',major:'机械',userNote:huge}]},lastResult:{candidates:{counts:{total:1},records:[{id:'x',school:'测试大学',major:'机械',score2026:580,rank2026:20000,payload:huge}]}}});const compact=compactAiWorkspaceForServer(workspace);const json=JSON.stringify({workspace:compact,input:'继续'});assert.ok(Buffer.byteLength(json,'utf8')<128*1024);assert.equal(json.includes('userNote'),false);assert.equal(json.includes('payload'),false);assert.ok(compact.recentTurns.length<=8);}

async function testModelCannotInventFilters(){let captured=null;const workspace=createAiWorkspace({activeView:{score:580,regionKeys:['shenyang'],majorKeywords:['机械']}});const result=await interpretAiCommand('普通家庭，想稳定就业',workspace,{AI_PROVIDER:'workers-ai',AI_WORKSPACE_MODEL:DEFAULT_WORKERS_AI_MODEL,AI:{run:async(_model,input)=>{captured=input;return{response:JSON.stringify({operation:'refine',target:'candidates',changeSet:{score:{op:'set',value:720},region:{op:'set',keys:['province:北京']},major:{op:'set',values:['金融']},school:{op:'set',values:['北京大学']},bottomLine:{op:'set',value:'public_regular_only'}},mentorProfile:{primaryGoal:'employment_stability',priorities:['employment'],riskQuestions:['employment_certainty']},confidence:.99,requiresConfirmation:false})};}}});assert.equal(result.command.changeSet.score.op,'inherit');assert.equal(result.command.changeSet.region.op,'inherit');assert.equal(result.command.changeSet.major.op,'inherit');assert.equal(result.command.changeSet.school.op,'inherit');assert.ok(captured.messages[0].content.includes('未明确提到的维度必须 inherit'));}

function testFactsAndSkillAttribution(){const rank=runRankLookup(600);assert.equal(rank.ok,true);assert.equal(rank.rankEnd,14235);const profile=deterministicMentorProfile('普通家庭，想稳定就业，不想读太久');assert.equal(profile.enabled,true);assert.equal(MENTOR_SKILLSET_ATTRIBUTION.repository,'cashen/zhangxuefeng-skillset');assert.equal(MENTOR_SKILLSET_ATTRIBUTION.commit,'9a3306d84ea38874bbdbb9e6e62079ba1409e97e');assert.equal(MENTOR_SKILLSET_ATTRIBUTION.knowledgeLicense,'CC BY 4.0');assert.equal(MENTOR_SKILLSET_ATTRIBUTION.codeLicense,'MIT');}

function testHumanUiSource(){const html=read('ai/index.html'),app=read('ai/app.v3990_1.js'),render=read('ai/render.v3991_0.js'),css=read('ai/workspace.v3990_1.css');assert.ok(html.includes('data-ai-workspace="ai-workspace-v3990_1"'));assert.ok(html.includes('data-ai-advisor-generation="ai-family-decision-advisor-v3991_0"'));assert.ok(html.includes('conversationStream'));assert.ok(html.includes('<details class="support-panel"'));assert.ok(!html.includes('task-rail'));assert.ok(render.includes('workspace.turnHistory'));assert.ok(render.includes('reference-main'));assert.ok(render.includes('${year}参考'));assert.ok(render.includes('比当前高'));assert.ok(render.includes('稍高参考'));assert.ok(!render.includes('`upper ·'));assert.ok(app.includes('compactAiWorkspaceForServer'));assert.ok(css.includes('.conversation'));assert.ok(css.includes('.user-bubble'));}

assert.equal(AI_WORKSPACE_CONTRACT_VERSION,'ai-workspace-contract-v3991_0');assert.equal(AI_ACTIVE_VIEW_VERSION,'ai-active-view-v3991_0');
testPatchSemantics();testNoImplicitDimensionClearing();testGeoSingleSource();testPersistentDecisionProfileAndTurns();testDeltaExplainsScope();testPrivacyBudget();await testModelCannotInventFilters();testFactsAndSkillAttribution();testHumanUiSource();
console.log(JSON.stringify({ok:true,version:'v3991_0',checks:['patch-inherit-set-add-remove-clear','580-mechanical-liaoning-shenyang','city-shared-region','no-implicit-clearing','persistent-decision-profile','conversation-turn-history','causal-delta','privacy-budget','model-filter-isolation','rank-fact','skill-attribution','human-ui-source']},null,2));

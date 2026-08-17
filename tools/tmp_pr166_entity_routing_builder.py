from pathlib import Path


def read(path):
    return Path(path).read_text(encoding='utf-8')


def write(path, value):
    Path(path).write_text(value, encoding='utf-8')


kernel='functions/_lib/ai/agent-task-kernel.js'
value=read(kernel)
marker="\nexport function deterministicAgentTask({text='',schools=[],majors=[],regionKeys=[],score=null,workspace={},candidateIntent=false,compareIntent=false,rankIntent=false,bottomLineMode=''}={}){"
helper="""
function candidateTaskForCompactEntity(workspace={}){
  const prior=clean(workspace?.agentContext?.currentTask,60),view=workspace?.activeView||{};
  const scoped=Boolean((view.majorKeywords||[]).length||(view.schoolNames||[]).length||((view.regionKeys||[]).length&&!view.regionKeys.includes('all'))||(view.bottomLineMode&&view.bottomLineMode!=='all'));
  return ['candidate_discovery','candidate_refinement'].includes(prior)||scoped?'candidate_refinement':'candidate_discovery';
}

export function deterministicAgentTask({text='',schools=[],majors=[],regionKeys=[],score=null,workspace={},candidateIntent=false,compareIntent=false,rankIntent=false,bottomLineMode='',entityTurn={}}={}){"""
if marker not in value:
    raise SystemExit('kernel signature marker missing')
value=value.replace(marker,'\n'+helper,1)
old="  if(looksEducationKnowledgeQuestion(source,{schools,majors:explicitMajors})||looksKnowledgeFollowup(source,priorTask))return'knowledge_explain';"
new="""  if(looksEducationKnowledgeQuestion(source,{schools,majors:explicitMajors})||looksKnowledgeFollowup(source,priorTask))return'knowledge_explain';
  const entityKind=clean(entityTurn?.kind,30);
  if(entityKind==='score')return'fact_rank_lookup';
  if(entityKind==='score_school_major')return'fit_assessment';
  if(entityKind==='score_school')return'school_history';
  if(entityKind==='candidate_scope')return candidateTaskForCompactEntity(workspace);
  if(entityKind==='school_major')return'school_major_history';
  if(entityKind==='school'){
    if(focus.major&&['major_region_history','major_background'].includes(priorTask))return'school_major_history';
    return'school_research';
  }
  if(entityKind==='major'){
    if(focus.school&&['school_research','school_history','school_major_history','school_background','school_official_qa','school_experience','fit_assessment'].includes(priorTask))return'school_major_history';
    if(workspace?.examContext?.score)return candidateTaskForCompactEntity(workspace);
    return'general_advice';
  }
  if(entityKind==='region_major'){
    if(workspace?.examContext?.score||['candidate_discovery','candidate_refinement'].includes(priorTask))return candidateTaskForCompactEntity(workspace);
    return'major_region_history';
  }
  if(entityKind==='region'){
    if(priorTask==='major_region_history'&&focus.major)return'major_region_history';
    if(workspace?.examContext?.score||['candidate_discovery','candidate_refinement'].includes(priorTask))return candidateTaskForCompactEntity(workspace);
    return'region_school_directory';
  }"""
if value.count(old)!=1:
    raise SystemExit('kernel knowledge route marker mismatch')
value=value.replace(old,new,1)
write(kernel,value)

interpreter='functions/_lib/ai/command-interpreter.js'
value=read(interpreter)
marker="function infoQuestionLanguage(text){return /(怎么样|学什么|课程|就业|工作|前景|值不值|为什么|咋样|如何|干什么|以后做什么|适不适合)/.test(String(text||''));}"
helper="""function compactEntityTurn(text,{scoreConstraint={},majors=[],schools=[],geo={},matchedAliases=[]}={}){
  const source=String(text||'').normalize('NFKC').trim();
  if(!source)return{kind:'none',explicit:false};
  const action=/(?:多少|几分|最低|投档|录取|分数|位次|排名|去年|往年|历年|介绍|讲讲|说说|聊聊|了解|怎么样|如何|咋样|比较|对比|怎么选|能上|能报|够不够|只看|只留|筛选|筛一下|保留|换成|改成|收窄|查下|查一下|看看|看下|学校环境|校园环境|宿舍|食堂|背景|优势|强项|官方|章程|方案|为什么|是什么|什么是)/.test(source);
  if(action)return{kind:'none',explicit:false};
  const compact=source.replace(/[\\s，,。！？!?；;：:]/g,'').replace(/^我(?:是|考了|考|有)?/,'');
  const point=scoreConstraint?.kind==='point';
  const short=source.length<=64;
  if(point&&schools.length===1&&majors.length>=1&&short)return{kind:'score_school_major',explicit:true};
  if(point&&schools.length===1&&short)return{kind:'score_school',explicit:true};
  if(point&&!schools.length&&(majors.length||geo?.explicit)&&short)return{kind:'candidate_scope',explicit:true};
  if(point&&!schools.length&&!majors.length&&!geo?.explicit&&/^\\d{3}(?:分)?(?:左右)?$/.test(compact))return{kind:'score',explicit:true};
  if(!point&&!schools.length&&majors.length===1&&geo?.explicit&&source.length<=40)return{kind:'region_major',explicit:true};
  if(!point&&!schools.length&&!majors.length&&geo?.explicit&&source.length<=20)return{kind:'region',explicit:true};
  const schoolTokens=unique([...(schools||[]),...(matchedAliases||[])],12).sort((a,b)=>String(b).length-String(a).length);
  const mentions=majorMentions(source).filter(item=>!item.negative&&!item.irrelevant&&!majorMentionOverlapsSchool(source,item,schools,matchedAliases));
  let residue=source;
  for(const token of schoolTokens)if(token)residue=residue.split(String(token)).join(' ');
  for(const mention of mentions)if(mention.term)residue=residue.split(String(mention.term)).join(' ');
  residue=residue.replace(/[\\s，,。！？!?；;：:]/g,'').replace(/(?:专业|方向|学校|院校|本科)+$/g,'').trim();
  if(!point&&!geo?.explicit&&schools.length===1&&majors.length===1&&!residue)return{kind:'school_major',explicit:true};
  if(!point&&!geo?.explicit&&schools.length===1&&!majors.length&&!residue)return{kind:'school',explicit:true};
  if(!point&&!geo?.explicit&&!schools.length&&majors.length===1&&!residue)return{kind:'major',explicit:true};
  return{kind:'none',explicit:false};
}
"""
if value.count(marker)!=1:
    raise SystemExit('interpreter info marker mismatch')
value=value.replace(marker,helper+marker,1)
old="candidateFollowup=candidateFacetFollowup(source,workspace,{majors,schools,geo,clearMajor,clearSchool,clearRegion}),candidateIntent="
new="candidateFollowup=candidateFacetFollowup(source,workspace,{majors,schools,geo,clearMajor,clearSchool,clearRegion}),entityTurn=compactEntityTurn(source,{scoreConstraint,majors,schools,geo,matchedAliases:resolvedSchoolAliases}),candidateIntent="
if value.count(old)!=1:
    raise SystemExit('entityTurn injection marker mismatch')
value=value.replace(old,new,1)
old="deterministicAgentTask({text:source,schools,majors,regionKeys:geo.keys,score,workspace,candidateIntent,compareIntent:hasCompare,rankIntent,bottomLineMode})"
new="deterministicAgentTask({text:source,schools,majors,regionKeys:geo.keys,score,workspace,candidateIntent,compareIntent:hasCompare,rankIntent,bottomLineMode,entityTurn})"
if value.count(old)!=1:
    raise SystemExit('kernel call marker mismatch')
value=value.replace(old,new,1)
old="const rawScoreUsage=explicitScoreUsage(source,workspace),scoreUsage=['major_region_history','region_school_directory'].includes(agentTask)?'suspended':((['candidate_discovery','candidate_refinement','fit_assessment','background_fit_discovery','fact_rank_lookup'].includes(agentTask)&&score)?'active':rawScoreUsage),taskLocked=explicitTaskLock(source,agentTask,candidateLexical||Boolean(bottomLineMode)||Boolean(platformTarget)||Boolean(score&&majors.length&&!schools.length)),scoreUsageLocked=explicitScoreDirective(source)||Boolean(score&&['candidate_discovery','candidate_refinement','fit_assessment','background_fit_discovery','fact_rank_lookup'].includes(agentTask)),executionPolicy=taskExecutionPolicy(agentTask,scoreUsage),legacy=deriveLegacyShape(agentTask,{workspace,patch,schools,majors,score,geo,hasCompare,restore,mentorProfile,source,negative,bottomLineMode});"
new="const rawScoreUsage=explicitScoreUsage(source,workspace),entityOwnScore=Boolean(score&&['score','score_school','score_school_major','candidate_scope'].includes(entityTurn.kind)),scoreUsage=['major_region_history','region_school_directory'].includes(agentTask)?'suspended':((['candidate_discovery','candidate_refinement','fit_assessment','background_fit_discovery'].includes(agentTask)&&score)?'active':(agentTask==='fact_rank_lookup'&&entityTurn.kind==='score'?'active':(entityOwnScore?'active':rawScoreUsage))),taskLocked=explicitTaskLock(source,agentTask,candidateLexical||Boolean(bottomLineMode)||Boolean(platformTarget)||Boolean(score&&majors.length&&!schools.length))||entityTurn.explicit===true,scoreUsageLocked=explicitScoreDirective(source)||entityOwnScore,executionPolicy=taskExecutionPolicy(agentTask,scoreUsage),legacy=deriveLegacyShape(agentTask,{workspace,patch,schools,majors,score,geo,hasCompare,restore,mentorProfile,source,negative,bottomLineMode});"
if value.count(old)!=1:
    raise SystemExit('score/task lock marker mismatch')
value=value.replace(old,new,1)
old="const previousFocus=priorFocus(workspace),needsSchool=['school_major_history','school_history','school_research','school_official_qa','school_experience','fit_assessment','school_background'].includes(agentTask),needsMajor=['school_major_history','major_region_history','fit_assessment','major_background'].includes(agentTask);"
new="const previousFocus=priorFocus(workspace),needsSchool=['school_major_history','school_history','school_research','school_official_qa','school_experience','fit_assessment','school_background'].includes(agentTask),needsMajor=['school_major_history','major_region_history','fit_assessment','major_background'].includes(agentTask),preserveEntityFocus=['score','region','candidate_scope'].includes(entityTurn.kind);"
if value.count(old)!=1:
    raise SystemExit('focus prereq marker mismatch')
value=value.replace(old,new,1)
old="const focus={school:schools[0]||(needsSchool?clean(previousFocus.school,120):''),major:majors[0]||(needsMajor?clean(previousFocus.major,160):''),schools:schools.length?schools:((agentTask==='school_comparison')?unique(previousFocus.schools||[],4):[]),majors:majors.length?majors:((agentTask==='major_comparison'||needsMajor)?unique(previousFocus.majors||[],8):[]),reference:reference||null,sourceText:source};"
new="const focus={school:schools[0]||((needsSchool||preserveEntityFocus)?clean(previousFocus.school,120):''),major:majors[0]||((needsMajor||preserveEntityFocus)?clean(previousFocus.major,160):''),schools:schools.length?schools:((agentTask==='school_comparison'||preserveEntityFocus)?unique(previousFocus.schools||[],4):[]),majors:majors.length?majors:((agentTask==='major_comparison'||needsMajor||preserveEntityFocus)?unique(previousFocus.majors||[],8):[]),reference:reference||null,sourceText:source};"
if value.count(old)!=1:
    raise SystemExit('focus marker mismatch')
value=value.replace(old,new,1)
old="clearMajor,clearSchool,clearRegion,reference,familyChanges,negativeMajorKeywords:negative,changeSet:patch,mentorProfile,retryRequested:Boolean(retryContext),retryFailedOnly:Boolean(retryContext?.failedOnly),"
new="clearMajor,clearSchool,clearRegion,reference,entityTurn,familyChanges,negativeMajorKeywords:negative,changeSet:patch,mentorProfile,retryRequested:Boolean(retryContext),retryFailedOnly:Boolean(retryContext?.failedOnly),"
if value.count(old)!=1:
    raise SystemExit('return entity marker mismatch')
value=value.replace(old,new,1)
write(interpreter,value)

contract='shared/ai/ai-workspace-contract.v3992_0.js'
value=read(contract)
old="const command=event.payload.command||{},resolvedView=event.payload.resolvedView?viewSeed(event.payload.resolvedView,workspace.examContext):workspace.activeView;\n    if(event.payload.commitView!==false&&normalizedScore(resolvedView.score))workspace.examContext.score=normalizedScore(resolvedView.score);"
new="const command=event.payload.command||{},resolvedView=event.payload.resolvedView?viewSeed(event.payload.resolvedView,workspace.examContext):workspace.activeView;\n    const explicitPersonalScore=normalizedScore(command.score);if(explicitPersonalScore&&command.scoreUsage==='active'&&command.scoreConstraint?.kind==='point')workspace.examContext.score=explicitPersonalScore;\n    if(event.payload.commitView!==false&&normalizedScore(resolvedView.score))workspace.examContext.score=normalizedScore(resolvedView.score);"
if value.count(old)!=1:
    raise SystemExit('workspace command score marker mismatch')
value=value.replace(old,new,1)
old="const result=event.payload.result&&typeof event.payload.result==='object'?cloneValue(event.payload.result):null,rawTurn=event.payload.turn||{},factOnly=rawTurn?.command?.agentTask==='fact_rank_lookup'||(rawTurn?.command?.operation==='answer'&&rawTurn?.command?.target==='fact');"
new="const result=event.payload.result&&typeof event.payload.result==='object'?cloneValue(event.payload.result):null,rawTurn=event.payload.turn||{},personalRankLookup=rawTurn?.command?.agentTask==='fact_rank_lookup'&&rawTurn?.command?.scoreUsage==='active',factOnly=(rawTurn?.command?.agentTask==='fact_rank_lookup'||(rawTurn?.command?.operation==='answer'&&rawTurn?.command?.target==='fact'))&&!personalRankLookup;"
if value.count(old)!=1:
    raise SystemExit('workspace rank marker mismatch')
value=value.replace(old,new,1)
write(contract,value)

presentation='functions/_lib/ai/advisor-presentation.js'
value=read(presentation)
old="case'evidence_verification':return'verify';case'plan_review':return'plan_review';}const total="
new="case'evidence_verification':return'verify';case'plan_review':return'plan_review';case'general_advice':case'save_family':return'start';}const total="
if value.count(old)!=1:
    raise SystemExit('presentation stage marker mismatch')
value=value.replace(old,new,1)
write(presentation,value)

routing='tools/verify-aiplus-routing-grid-v001.mjs'
value=read(routing)
marker="\nconsole.log(JSON.stringify({ok:true,version:'aiplus-routing-grid-v0.01'"
if marker not in value:
    raise SystemExit('routing console marker missing')
block=r'''

// 5) 真人连续操作的“裸实体 / 极短追问”矩阵：实体识别成功后，task 不能掉回无意义的 general_advice，
//    也不能把学校裸实体偷偷变成候选筛选。高置信短输入必须 taskLocked，避免 provider 覆盖确定性路由。
const compactEmpty=createAiWorkspace();
const compactScore=await command('650分',compactEmpty);assert.equal(compactScore.agentTask,'fact_rank_lookup','bare score -> rank/context');assert.equal(compactScore.scoreUsage,'active');assert.equal(compactScore.taskLocked,true);assert.equal(compactScore.entityTurn?.kind,'score');assertions+=4;
const compactMajorEmpty=await command('电气',compactEmpty);assert.equal(compactMajorEmpty.agentTask,'general_advice','bare major without score records direction only');assert.equal(compactMajorEmpty.focus.major,'电气工程及其自动化');assert.equal(compactMajorEmpty.taskLocked,true);assertions+=3;
const compactRegionEmpty=await command('沈阳',compactEmpty);assert.equal(compactRegionEmpty.agentTask,'region_school_directory','bare region without score opens bounded school directory');assert.equal(compactRegionEmpty.taskLocked,true);assertions+=2;
const compactSchoolEmpty=await command('沈工大',compactEmpty);assert.equal(compactSchoolEmpty.agentTask,'school_research','bare school opens school research, never implicit candidate filter');assert.equal(compactSchoolEmpty.focus.school,'沈阳工业大学');assert.equal(compactSchoolEmpty.executionPolicy.commitView,false);assert.equal(compactSchoolEmpty.taskLocked,true);assertions+=4;
const compactPair=await command('沈工大 电气',compactEmpty);assert.equal(compactPair.agentTask,'school_major_history','bare school-major pair drills into deterministic school-major facts');assert.equal(compactPair.focus.school,'沈阳工业大学');assert.equal(compactPair.focus.major,'电气工程及其自动化');assert.equal(compactPair.taskLocked,true);assertions+=4;
const compactScoreMajor=await command('650分 电气',compactEmpty);assert.equal(compactScoreMajor.agentTask,'candidate_discovery','score-major compact scope starts candidates');assert.equal(compactScoreMajor.scoreUsage,'active');assert.equal(compactScoreMajor.taskLocked,true);assertions+=3;
const compactScoreRegion=await command('650分 沈阳',compactEmpty);assert.equal(compactScoreRegion.agentTask,'candidate_discovery','score-region compact scope starts candidates');assert.ok((compactScoreRegion.regionKeys||[]).includes('shenyang'));assert.equal(compactScoreRegion.taskLocked,true);assertions+=3;
const compactScoreSchool=await command('650分 沈工大',compactEmpty);assert.equal(compactScoreSchool.agentTask,'school_history','score-school compact input must not silently mutate candidate school filter');assert.equal(compactScoreSchool.executionPolicy.commitView,false);assert.equal(compactScoreSchool.taskLocked,true);assertions+=3;
const compactScoreSchoolMajor=await command('650分 沈工大 电气',compactEmpty);assert.equal(compactScoreSchoolMajor.agentTask,'fit_assessment','score-school-major compact input is explicit reachability context');assert.equal(compactScoreSchoolMajor.scoreUsage,'active');assert.equal(compactScoreSchoolMajor.taskLocked,true);assertions+=3;
const compactRegionMajor=await command('辽宁 电气',compactEmpty);assert.equal(compactRegionMajor.agentTask,'major_region_history','region-major without personal score is a historical truth query');assert.equal(compactRegionMajor.scoreUsage,'suspended');assert.equal(compactRegionMajor.taskLocked,true);assertions+=3;

const afterScore=createAiWorkspace({examContext:{score:652,rank:2589},agentContext:{currentTask:'fact_rank_lookup',focus:{}}});
const majorAfterScore=await command('电气',afterScore);assert.equal(majorAfterScore.agentTask,'candidate_discovery','score -> major starts first candidate scope');assert.equal(majorAfterScore.taskLocked,true);assertions+=2;
const regionAfterScore=await command('沈阳',afterScore);assert.equal(regionAfterScore.agentTask,'candidate_discovery','score -> region starts first candidate scope');assert.equal(regionAfterScore.taskLocked,true);assertions+=2;
const schoolAfterScore=await command('沈工大',afterScore);assert.equal(schoolAfterScore.agentTask,'school_research','score memory does not make bare school an implicit filter');assert.equal(schoolAfterScore.executionPolicy.commitView,false);assertions+=2;

const candidateCompact=createAiWorkspace({examContext:{score:652,rank:2589},activeView:{score:652,regionKeys:['ln'],majorKeywords:['电气工程及其自动化'],schoolNames:[],bottomLineMode:'all'},agentContext:{currentTask:'candidate_discovery',focus:{major:'电气工程及其自动化',majors:['电气工程及其自动化']}}});
const regionRefine=await command('沈阳',candidateCompact);assert.equal(regionRefine.agentTask,'candidate_refinement');assert.ok((regionRefine.changeSet.region?.keys||[]).includes('shenyang'));assert.equal(regionRefine.taskLocked,true);assertions+=3;
const schoolFromCandidate=await command('沈工大',candidateCompact);assert.equal(schoolFromCandidate.agentTask,'school_research','bare school must switch object, not mutate candidate schoolNames');assert.equal(schoolFromCandidate.executionPolicy.commitView,false);assertions+=2;

const schoolCompact=createAiWorkspace({examContext:{score:652,rank:2589},agentContext:{currentTask:'school_research',focus:{school:'沈阳工业大学',schools:['沈阳工业大学']}}});
const majorDrill=await command('电气',schoolCompact);assert.equal(majorDrill.agentTask,'school_major_history','school -> bare major drills into that school-major');assert.equal(majorDrill.focus.school,'沈阳工业大学');assert.equal(majorDrill.focus.major,'电气工程及其自动化');assertions+=3;
const scoreKeepsSchool=await command('650分',schoolCompact);assert.equal(scoreKeepsSchool.agentTask,'fact_rank_lookup');assert.equal(scoreKeepsSchool.focus.school,'沈阳工业大学','bare score must not erase current school focus');assertions+=2;

const majorCompact=createAiWorkspace({examContext:{score:652,rank:2589},agentContext:{currentTask:'major_region_history',focus:{major:'电气工程及其自动化',majors:['电气工程及其自动化']}}});
const schoolDrill=await command('沈工大',majorCompact);assert.equal(schoolDrill.agentTask,'school_major_history','major history -> bare school drills into that pair');assert.equal(schoolDrill.focus.school,'沈阳工业大学');assert.equal(schoolDrill.focus.major,'电气工程及其自动化');assertions+=3;
const regionDrill=await command('沈阳',majorCompact);assert.equal(regionDrill.agentTask,'major_region_history','major history -> bare region keeps major truth owner');assert.equal(regionDrill.focus.major,'电气工程及其自动化');assert.ok((regionDrill.regionKeys||[]).includes('shenyang'));assertions+=3;
'''
value=value.replace(marker,block+marker,1)
write(routing,value)

workspace_test='tools/verify-ai-workspace-v3990_1.mjs'
value=read(workspace_test)
old="import { buildBlocks } from '../functions/_lib/ai/advisor-presentation.js';"
new="import { buildBlocks,decisionStageFor } from '../functions/_lib/ai/advisor-presentation.js';"
if value.count(old)!=1:
    raise SystemExit('workspace test import marker mismatch')
value=value.replace(old,new,1)
marker="\nfunction testPrivacyBudget(){"
if marker not in value:
    raise SystemExit('workspace test insertion marker missing')
block=r'''

function testCompactEntityContextPersistence(){
  let workspace=createAiWorkspace();
  const scoreCommand=cmd('650分',workspace);assert.equal(scoreCommand.agentTask,'fact_rank_lookup');assert.equal(scoreCommand.scoreUsage,'active');assert.equal(scoreCommand.taskLocked,true);
  workspace=applyAiWorkspaceEvent(workspace,{type:'command_committed',payload:{command:scoreCommand,resolvedView:workspace.activeView,commitView:false,decisionStage:'verify',taskAction:'create_main'}});
  assert.equal(workspace.examContext.score,650,'explicit personal score belongs to examContext even when candidate view is not committed');assert.deepEqual(workspace.activeView.schoolNames,[]);
  workspace=applyAiWorkspaceEvent(workspace,{type:'result_committed',payload:{result:{rank:{ok:true,score:650,rankEnd:2867}},turn:{userText:'650分',task:'fact_rank_lookup',command:scoreCommand,focus:scoreCommand.focus}}});
  assert.equal(workspace.examContext.rank,2867,'active bare-score rank may update personal examContext');
  const factWorkspace=createAiWorkspace(),factCommand=cmd('640分位次',factWorkspace);assert.equal(factCommand.agentTask,'fact_rank_lookup');assert.notEqual(factCommand.scoreUsage,'active','arbitrary score-rank fact query must not become personal score context');
  const afterFact=applyAiWorkspaceEvent(factWorkspace,{type:'command_committed',payload:{command:factCommand,resolvedView:factWorkspace.activeView,commitView:false,decisionStage:'verify',taskAction:'create_main'}});assert.equal(afterFact.examContext.score,null,'fact lookup for another score must not overwrite personal context');
  const stage=decisionStageFor({command:{agentTask:'general_advice'},view:{score:null,regionKeys:['all'],majorKeywords:[],schoolNames:[],bottomLineMode:'all'},result:{},changes:[]});assert.equal(stage,'start','general_advice must never masquerade as feasible_set');
}
'''
value=value.replace(marker,block+marker,1)
old="testCandidatePatchJourney();testTaskSwitchAndReference();testBackgroundTasks();testExplicitContextPolicy();testGeoAndDelta();testWorkspaceMigrationAndMemory();"
new="testCandidatePatchJourney();testTaskSwitchAndReference();testBackgroundTasks();testExplicitContextPolicy();testGeoAndDelta();testWorkspaceMigrationAndMemory();testCompactEntityContextPersistence();"
if value.count(old)!=1:
    raise SystemExit('workspace test call marker mismatch')
value=value.replace(old,new,1)
write(workspace_test,value)

status='docs/architecture/AIPLUS-FAMILY-DECISION-WORKBENCH-STATUS.md'
value=read(status)
marker='\n## Work package ledger\n'
note='''\n### 2026-08-17 · compact entity routing counterexample reopened\n\nUser feedback Log exposed a systemic routing gap rather than a Log/UI defect: short human turns such as `650分`, `电气`, `沈阳`, `沈工大` can successfully identify an entity while the execution task remains `general_advice`; presentation then previously defaulted that task to the misleading internal stage `feasible_set`. The same class can affect score / region / major / school transitions across multi-turn decision journeys.\n\nRelease is blocked until the existing canonical route chain proves all of the following on one clean head: compact score/region/major/school/school-major routing, context-aware drill-down, provider non-override for high-confidence compact entity turns, explicit personal-score persistence independent of candidate-view mutation, and `general_advice -> start` rather than fake `feasible_set`. The permanent routing grid is the owner of these assertions; no phrase-specific UI patch is allowed.\n'''
if marker not in value:
    raise SystemExit('status ledger marker missing')
value=value.replace(marker,note+marker,1)
write(status,value)

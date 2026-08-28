import assert from 'node:assert/strict';
import {createAiWorkspace} from '../shared/ai/ai-workspace-contract.v3992_0.js';
import {deterministicCommand,resolveAiSchoolMentionsDetailed} from '../functions/_lib/ai/command-interpreter.js';
import {resolveEducationKnowledgeQuestion,resolveCanonicalEducationEntity,knowledgeCoverageSnapshot} from '../functions/_lib/ai/education-knowledge-center.js';
import {runEducationKnowledge} from '../functions/_lib/ai/education-knowledge-runtime.js';
import {STANDARD_MAJOR_CATALOG_2026_FULL} from '../functions/_lib/kb/standard-major-catalog-2026-full.generated.js';
import {MAJOR_LANGUAGE_ALIASES} from '../functions/_lib/ai/major-language-resolver.js';

const aliases=new Map([
  ['沈工大','沈阳工业大学'],['沈阳工业','沈阳工业大学'],['沈航','沈阳航空航天大学'],['辽科大','辽宁科技大学'],['大连交通','大连交通大学']
]);
const resolver={resolve(query){const name=aliases.get(query);return name?{status:'resolved',resolvedName:name}:{status:'unresolved',candidates:[]};}};
async function command(text,workspace=createAiWorkspace()){const resolved=await resolveAiSchoolMentionsDetailed(text,resolver);return deterministicCommand(text,workspace,resolved.schoolNames,resolved.matchedAliases);}
function assertKnowledge(cmd,label,{explicitSchool='',scoreUsage}={}){assert.equal(cmd.agentTask,'knowledge_explain',`${label}: task`);assert.equal(cmd.executionPolicy.commitView,false,`${label}: knowledge must not commit candidate view`);if(explicitSchool)assert.deepEqual(cmd.schoolNames,[explicitSchool],`${label}: explicit school reconnect`);else assert.deepEqual(cmd.schoolNames,[],`${label}: remembered school must not leak into current knowledge object`);if(scoreUsage)assert.equal(cmd.scoreUsage,scoreUsage,`${label}: score context`);}

const plainKnowledgePrompts=[
  '高校专项是什么','辽宁省高校专项计划是什么意思','国家专项计划是干什么的','地方专项是什么意思','强基计划是什么','综合评价招生是什么意思',
  '公费师范生是什么意思','优师计划是什么','农村订单定向医学生是什么','特控线是什么意思','本科线是什么意思','投档线是什么意思','专业最低分是什么意思','位次是什么意思',
  '投档是什么意思','录取是什么意思','退档是什么意思','滑档是什么意思','专业调剂是什么','征集志愿是什么','平行志愿是什么意思','招生计划是什么意思',
  '985是什么意思','211是什么意思','双一流是什么意思','国家一流本科专业是什么意思','工程教育认证是什么','学科评估是什么意思','硕士点是什么意思','博士点是什么意思',
  '本科专业是什么意思','专业类是什么意思','一级学科是什么意思','专业学位是什么','学硕是什么意思','专硕是什么意思','职业本科是什么意思','高职专科是什么意思',
  '大类招生是什么','专业分流是什么意思','转专业是什么意思','培养方案是什么','推免是什么意思','保研是什么意思','中外合作办学是什么','国际班是什么意思',
  '选科要求是什么意思','物化是什么意思','物化生是什么意思','色弱报专业是什么意思','色盲限报怎么理解','单色识别是什么意思','国家助学贷款是什么','工业控制是什么意思',
  '智能制造是什么意思','材料加工是什么意思','储能是什么','低空经济是什么意思','职业和专业有什么区别','材料成型及控制工程是什么','临床医学是什么','自动化和控制科学与工程有什么区别',
  '电子信息是什么','机械是什么','金融是什么','会计是什么','建筑是什么',
  '本科专业与一级学科有什么区别','985、211和双一流有什么区别','投档和录取有什么区别','退档和滑档有什么区别','转专业和专业分流有什么区别','一流本科专业和工程教育认证有什么区别'
];
assert.ok(plainKnowledgePrompts.length>=60,'single-turn coverage should be broad, not a tiny phrase fixture');
let singleTurnCount=0;
for(const prompt of plainKnowledgePrompts){const cmd=await command(prompt);assert.equal(cmd.agentTask,'knowledge_explain',`${prompt}: must enter knowledge owner`);assert.equal(cmd.executionPolicy.commitView,false,`${prompt}: must not mutate candidate view`);singleTurnCount++;}

const directRulePrompts=[
  '今年辽宁高校专项有什么要求','2026辽宁省高校专项需要什么条件','辽宁省高校专项谁能报','高校专项报名截止什么时候',
  '强基计划今年有什么要求','国家专项计划现在怎么规定','地方专项怎么报名','综合评价招生需要什么条件'
];
for(const prompt of directRulePrompts){const cmd=await command(prompt);assert.equal(cmd.agentTask,'knowledge_explain',`${prompt}: direct policy/rule question must enter knowledge owner`);assert.equal(cmd.executionPolicy.commitView,false,`${prompt}: direct policy/rule question must not mutate candidate view`);singleTurnCount++;}

assert.equal(STANDARD_MAJOR_CATALOG_2026_FULL.length,883,'canonical undergraduate major catalog cardinality drift');
let catalogIntroductionCount=0;
for(const item of STANDARD_MAJOR_CATALOG_2026_FULL){
  const prompt=`介绍下${item.name}专业`,cmd=await command(prompt);
  assert.equal(cmd.agentTask,'knowledge_explain',`${prompt}: every canonical undergraduate major introduction must enter knowledge owner`);
  assert.equal(cmd.executionPolicy.commitView,false,`${prompt}: pure major introduction must not mutate candidate view`);
  catalogIntroductionCount++;
}
let aliasIntroductionCount=0;
for(const [alias,canonical] of Object.entries(MAJOR_LANGUAGE_ALIASES)){
  if(!alias||alias===canonical)continue;
  const prompt=`介绍下${alias}专业`,cmd=await command(prompt);
  assert.equal(cmd.agentTask,'knowledge_explain',`${prompt}: every existing major alias must enter knowledge owner`);
  assert.equal(cmd.executionPolicy.commitView,false,`${prompt}: alias introduction must not mutate candidate view`);
  aliasIntroductionCount++;
}
assert.ok(aliasIntroductionCount>20,'major alias introduction coverage unexpectedly small');
for(const prompt of ['介绍下电气工程及自动化 专业','讲讲电气工程及自动化专业','说说电气工程及其自动化专业','聊聊电气工程及自动化专业','了解一下电气工程及自动化专业','电气工程及自动化专业介绍一下']){
  const cmd=await command(prompt);assertKnowledge(cmd,`natural major introduction ${prompt}`);
}

const rememberedSchoolWorkspace=createAiWorkspace({
  examContext:{score:580},
  activeView:{score:580,regionKeys:['ln'],majorKeywords:['机械'],schoolNames:['沈阳工业大学'],bottomLineMode:'all'},
  agentContext:{currentTask:'school_research',focus:{school:'沈阳工业大学',schools:['沈阳工业大学'],sourceText:'沈阳工业大学怎么样'}}
});
const contextSwitchPrompts=[
  '高校专项是什么','辽宁省高校专项是什么意思','强基计划是什么','双一流是什么意思','一级学科是什么','职业本科是什么','工程教育认证是什么','投档是什么意思','退档是什么意思','选科要求是什么','中外合作办学是什么','材料成型及控制工程是什么'
];
let multiTurnCount=0;
for(const prompt of contextSwitchPrompts){assertKnowledge(await command(prompt,rememberedSchoolWorkspace),`school->knowledge ${prompt}`,{scoreUsage:'remembered'});multiTurnCount++;}
for(const prompt of directRulePrompts){assertKnowledge(await command(prompt,rememberedSchoolWorkspace),`school->current-policy ${prompt}`,{scoreUsage:'remembered'});multiTurnCount++;}
for(const item of STANDARD_MAJOR_CATALOG_2026_FULL){
  const prompt=`介绍下${item.name}专业`;
  assertKnowledge(await command(prompt,rememberedSchoolWorkspace),`school->major-introduction ${prompt}`,{scoreUsage:'remembered'});
}

const knowledgeWorkspace=createAiWorkspace({
  examContext:{score:580},
  activeView:{score:580,regionKeys:['ln'],majorKeywords:['机械'],schoolNames:[],bottomLineMode:'all'},
  agentContext:{currentTask:'knowledge_explain',focus:{school:'',major:'',schools:[],majors:[],sourceText:'辽宁省高校专项计划是什么意思'}}
});
const anaphoraPrompts=[
  '这个谁能报','这个怎么报','这个今年还有吗','这个资格怎么判断','这个看户籍吗','这个看学籍吗','我家在岫岩，这个能报吗','那这个今年要求是什么','它现在怎么申请','刚才那个计划谁能报','这个政策截止什么时候','这个计划需要什么条件'
];
for(const prompt of anaphoraPrompts){assertKnowledge(await command(prompt,knowledgeWorkspace),`knowledge follow-up ${prompt}`);multiTurnCount++;}

const explicitSchoolFollowups=[
  ['沈工大有这个专项吗','沈阳工业大学'],['沈阳工业有这个专项吗','沈阳工业大学'],['沈航有这个专项吗','沈阳航空航天大学'],['辽科大有这个专项吗','辽宁科技大学'],['大连交通有这个专项吗','大连交通大学']
];
for(const [prompt,school] of explicitSchoolFollowups){assertKnowledge(await command(prompt,knowledgeWorkspace),`knowledge->school ${prompt}`,{explicitSchool:school});multiTurnCount++;}

const scoreFollowups=['我580分符合这个条件吗','我570分符合这个条件吗','我600分符合这个资格吗','我550分符合这个计划条件吗','我620分符合这个要求吗','我590分符合这个资格吗'];
for(const prompt of scoreFollowups){assertKnowledge(await command(prompt,knowledgeWorkspace),`knowledge->score ${prompt}`,{scoreUsage:'active'});multiTurnCount++;}

const candidateWorkspace=createAiWorkspace({
  examContext:{score:580},
  activeView:{score:580,regionKeys:['shenyang'],majorKeywords:['机械'],schoolNames:['辽宁科技大学'],bottomLineMode:'exclude_sino'},
  agentContext:{currentTask:'candidate_refinement',focus:{school:'辽宁科技大学',major:'机械',sourceText:'580分机械只看沈阳去掉中外'}}
});
for(const prompt of ['专业类是什么意思','双一流是什么意思','工业控制是什么','材料加工与工业控制是什么意思','自动化和控制科学与工程有什么区别']){const cmd=await command(prompt,candidateWorkspace);assertKnowledge(cmd,`candidate->knowledge ${prompt}`,{scoreUsage:'remembered'});assert.equal(cmd.executionPolicy.commitView,false);multiTurnCount++;}

assert.ok(multiTurnCount>=40,'at least forty multi-turn journeys must guard context ownership');
assert.ok(singleTurnCount+multiTurnCount>=100,'AEK journey suite must remain system-scale');
assert.ok(multiTurnCount/(singleTurnCount+multiTurnCount)>=1/3,'at least one third of journeys must be multi-turn');

const exactUndergrad=resolveEducationKnowledgeQuestion('材料成型及控制工程是什么');
assert.equal(exactUndergrad.ok,true);assert.equal(exactUndergrad.entities[0].type,'undergraduate_major');assert.equal(exactUndergrad.entities[0].officialCode,'080203');
const electricalAliasIntro=resolveEducationKnowledgeQuestion('介绍下电气工程及自动化 专业');
assert.equal(electricalAliasIntro.ok,true,'spoken/legacy major alias introduction must resolve through the shared major language owner');
assert.equal(electricalAliasIntro.entities[0].type,'undergraduate_major');assert.equal(electricalAliasIntro.entities[0].officialCode,'080601');
const electricalAliasRuntime=await runEducationKnowledge({env:{}},{question:'介绍下电气工程及自动化 专业'});
assert.equal(electricalAliasRuntime.answerStatus,'answered');assert.equal(electricalAliasRuntime.canonical?.officialCode,'080601');
const exactGraduate=resolveEducationKnowledgeQuestion('控制科学与工程是什么');
assert.equal(exactGraduate.ok,true);assert.equal(exactGraduate.entities[0].type,'graduate_first_level_discipline');assert.equal(exactGraduate.entities[0].officialCode,'0811');
const commonCrossLevelLabels=['电子信息','机械','金融','会计','建筑'];
for(const label of commonCrossLevelLabels){const result=resolveEducationKnowledgeQuestion(`${label}是什么`);assert.equal(result.ok,false,`${label}: common education label must not be guessed without level context`);assert.equal(result.resolutionClass,'ambiguous',`${label}: must expose ambiguity rather than unknown/fabricated identity`);}
const introducedCrossLevel=resolveEducationKnowledgeQuestion('介绍下电子信息专业');
assert.equal(introducedCrossLevel.ok,false,'introduction wording must not weaken cross-level ambiguity');assert.equal(introducedCrossLevel.resolutionClass,'ambiguous');
const professionalDegreeByCode=resolveEducationKnowledgeQuestion('0854是什么');
assert.equal(professionalDegreeByCode.ok,true,'explicit graduate catalog code is sufficient identity context');assert.equal(professionalDegreeByCode.entities[0].type,'graduate_professional_degree_category');assert.equal(professionalDegreeByCode.entities[0].officialCode,'0854');
const undergraduateCategory=resolveEducationKnowledgeQuestion('电子信息类是什么');
assert.equal(undergraduateCategory.ok,true,'explicit undergraduate category label must remain resolvable');assert.equal(undergraduateCategory.entities[0].type,'undergraduate_major_category');
const currentRule=resolveEducationKnowledgeQuestion('今年辽宁高校专项有什么要求');
assert.equal(currentRule.ok,true,'direct current-cycle policy question must preserve its canonical subject');assert.equal(currentRule.kind,'current_rule');assert.equal(currentRule.entities[0].id,'special:辽宁省高校专项');assert.equal(currentRule.requiresLive,true);
const directEligibility=resolveEducationKnowledgeQuestion('辽宁省高校专项谁能报');
assert.equal(directEligibility.ok,true,'direct eligibility question must preserve its canonical subject');assert.equal(directEligibility.kind,'eligibility');assert.equal(directEligibility.entities[0].id,'special:辽宁省高校专项');assert.equal(directEligibility.requiresLive,true);
const ambiguousRuntime=await runEducationKnowledge({env:{}},{question:'电子信息是什么'});
assert.equal(ambiguousRuntime.answerStatus,'needs_clarification');assert.equal(ambiguousRuntime.canonical,null);assert.doesNotMatch(ambiguousRuntime.answer,/电子信息专业主要|该专业主要学习/);
const clinical=resolveEducationKnowledgeQuestion('临床医学是什么');
assert.equal(clinical.ok,false);assert.equal(clinical.resolutionClass,'ambiguous');
const compound=await runEducationKnowledge({env:{}},{question:'材料加工与工业控制是什么意思'});
assert.equal(compound.answerStatus,'needs_clarification');assert.doesNotMatch(compound.answer,/该专业主要学习|材料加工与工业控制专业主要/);
const stableMajor=await runEducationKnowledge({env:{}},{question:'材料成型及控制工程是什么'});
assert.equal(stableMajor.answerStatus,'answered');assert.equal(stableMajor.canonical?.officialCode,'080203');

const coverage=knowledgeCoverageSnapshot();
assert.equal(coverage.undergraduateMajorCount,883);
assert.equal(coverage.graduateEntryCount,184);
assert.equal(coverage.graduateFirstLevelCount,117);
assert.equal(coverage.graduateProfessionalDegreeCount,67);
assert.equal(coverage.vocationalCatalogMode,'delegated_authoritative_canonical_index');
assert.equal(coverage.vocationalCurrentIdentityLiveRequired,true);
assert.equal(coverage.vocationalLatestKnownEnrollmentStartYear,2027);
assert.equal(resolveCanonicalEducationEntity('临床医学')?.ambiguous,true);

console.log(JSON.stringify({ok:true,version:'aiplus-aek-human-journeys-v0.03',singleTurnCount,multiTurnCount,total:singleTurnCount+multiTurnCount,multiTurnRatio:multiTurnCount/(singleTurnCount+multiTurnCount),catalogIntroductionCount,aliasIntroductionCount,coverage:{undergraduate:coverage.undergraduateMajorCount,graduate:coverage.graduateEntryCount,vocationalMode:coverage.vocationalCatalogMode}},null,2));

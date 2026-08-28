import assert from 'node:assert/strict';
import {createAiWorkspace} from '../shared/ai/ai-workspace-contract.v3992_0.js';
import {deterministicCommand,resolveAiSchoolMentionsDetailed} from '../functions/_lib/ai/command-interpreter.js';
import {normalizeMajorLanguage} from '../functions/_lib/ai/major-language-resolver.js';

const aliases=new Map([
  ['沈工大','沈阳工业大学'],['沈阳工业','沈阳工业大学'],['沈航','沈阳航空航天大学'],['辽科大','辽宁科技大学'],['辽石化','辽宁石油化工大学'],
  ['大连交通','大连交通大学'],['辽宁师范','辽宁师范大学'],['沈阳师范','沈阳师范大学'],['大连理工','大连理工大学'],['东北石油','东北石油大学']
]);
const resolver={resolve(query){const name=aliases.get(query);return name?{status:'resolved',resolvedName:name}:{status:'unresolved',candidates:[]};}};
async function command(text,workspace=createAiWorkspace()){
  const resolved=await resolveAiSchoolMentionsDetailed(text,resolver);
  return deterministicCommand(text,workspace,resolved.schoolNames,resolved.matchedAliases);
}
function expect(cmd,{task,school,major,commit,scoreUsage},label=cmd.rawText){
  assert.equal(cmd.agentTask,task,`${label}: task`);
  if(school)assert.equal(cmd.focus.school,school,`${label}: school`);
  if(major)assert.equal(cmd.focus.major,major,`${label}: major`);
  if(commit!==undefined)assert.equal(cmd.executionPolicy.commitView,commit,`${label}: commitView`);
  if(scoreUsage)assert.equal(cmd.scoreUsage,scoreUsage,`${label}: scoreUsage`);
}

let assertions=0;
const base=createAiWorkspace({examContext:{score:580},activeView:{score:580,regionKeys:['ln'],majorKeywords:[],schoolNames:[],bottomLineMode:'all'}});

const schoolResearchCases=[
  ['介绍下辽宁科技大学','辽宁科技大学'],['介绍一下辽宁科技大学','辽宁科技大学'],['讲讲辽科大','辽宁科技大学'],['说说辽科大','辽宁科技大学'],
  ['了解一下辽科大','辽宁科技大学'],['辽科大怎么样','辽宁科技大学'],['沈航整体怎么样','沈阳航空航天大学'],['介绍下沈阳师范','沈阳师范大学']
];
for(const [prompt,school] of schoolResearchCases){expect(await command(prompt,base),{task:'school_research',school,commit:false},prompt);assertions++;}

const schoolHistoryCases=[
  ['大连交通 都多少分','大连交通大学'],['大连交通所有专业最低分','大连交通大学'],['大连交通专业都多少分','大连交通大学'],
  ['我想看大连交通大学所有专业分数','大连交通大学'],['辽科大所有专业分数线','辽宁科技大学'],['沈工大各专业最低分','沈阳工业大学']
];
for(const [prompt,school] of schoolHistoryCases){expect(await command(prompt,base),{task:'school_history',school,commit:false},prompt);assertions++;}

const schools=[['沈航','沈阳航空航天大学'],['沈工大','沈阳工业大学'],['大连交通','大连交通大学']];
const majors=['机械','电气','测控','自动化','计算机'];
const schoolMajorTemplates=[
  (school,major)=>`${school}${major}多少分`,
  (school,major)=>`${school} ${major}去年最低分`,
  (school,major)=>`查下${school}${major}录取分`,
  (school,major)=>`${school}的${major}专业都多少分`
];
for(const [schoolAlias,school] of schools){for(const majorAlias of majors){for(const makePrompt of schoolMajorTemplates){
  const prompt=makePrompt(schoolAlias,majorAlias),major=normalizeMajorLanguage(majorAlias),cmd=await command(prompt,base);
  expect(cmd,{task:'school_major_history',school,major,commit:false},prompt);assertions++;
}}}

const regionMajorTemplates=[
  major=>`省内${major}所有学校分数从高到低`,
  major=>`辽宁${major}专业哪些学校多少分`,
  major=>`辽宁省内${major}所有学校最低分`,
  major=>`省内哪些学校有${major}，分数从高到低`
];
for(const majorAlias of ['机械电子','电气工程及自动化','测控','自动化','计算机']){for(const makePrompt of regionMajorTemplates){
  const prompt=makePrompt(majorAlias),major=normalizeMajorLanguage(majorAlias),cmd=await command(prompt,base);
  expect(cmd,{task:'major_region_history',major,commit:true,scoreUsage:'suspended'},prompt);assertions++;
}}

const experienceCases=[
  ['沈航学校环境怎么样','沈阳航空航天大学'],['辽科大人文关怀怎么样','辽宁科技大学'],['大连理工宿舍怎么样','大连理工大学'],
  ['辽宁师范校园环境怎么样','辽宁师范大学'],['沈阳师范同学体验怎么样','沈阳师范大学']
];
for(const [prompt,school] of experienceCases){expect(await command(prompt,base),{task:'school_experience',school,commit:false},prompt);assertions++;}

const officialCases=[
  ['大连理工官方食宿条件','大连理工大学'],['沈航官方宿舍条件','沈阳航空航天大学'],['辽科大官方招生章程怎么说','辽宁科技大学']
];
for(const [prompt,school] of officialCases){const cmd=await command(prompt,base);assert.ok(['school_official_qa','school_research'].includes(cmd.agentTask),`${prompt}: official school fact must stay in school evidence owners`);assert.equal(cmd.focus.school,school,`${prompt}: school`);assertions++;}

const backgroundCases=[
  ['辽宁科技大学哪些专业更有底子','school_background','辽宁科技大学',''],
  ['沈工大哪个专业更有积累','school_background','沈阳工业大学',''],
  ['自动化在省内哪些学校有背景','major_background','', '自动化'],
  ['电气工程及自动化在辽宁哪些学校有积累','major_background','', '电气工程及其自动化']
];
for(const [prompt,task,school,major] of backgroundCases){expect(await command(prompt,base),{task,school:school||undefined,major:major||undefined,commit:false},prompt);assertions++;}

const candidateStartCases=['580分机械省内','580分，机械，省内','我580分想看辽宁机械专业','580分先看看机械'];
for(const prompt of candidateStartCases){const cmd=await command(prompt,createAiWorkspace());assert.ok(['candidate_discovery','candidate_refinement'].includes(cmd.agentTask),`${prompt}: candidate task`);assert.equal(cmd.executionPolicy.commitView,true,`${prompt}: commit`);assertions++;}

const candidateWorkspace=createAiWorkspace({examContext:{score:580},activeView:{score:580,regionKeys:['ln'],majorKeywords:['机械'],schoolNames:[],bottomLineMode:'all'},agentContext:{currentTask:'candidate_discovery',focus:{major:'机械',majors:['机械'],sourceText:'580分机械省内'}}});
for(const [prompt,expectedRegion] of [['只看沈阳','shenyang'],['改成大连','dalian']]){const cmd=await command(prompt,candidateWorkspace);assert.equal(cmd.agentTask,'candidate_refinement',`${prompt}: refinement`);assert.equal(cmd.executionPolicy.commitView,true,`${prompt}: commit`);assert.ok((cmd.changeSet.region?.keys||[]).includes(expectedRegion),`${prompt}: region`);assertions++;}
for(const prompt of ['去掉中外','不要中外合作','中外合作也可以']){const cmd=await command(prompt,candidateWorkspace);assert.ok(['candidate_discovery','candidate_refinement'].includes(cmd.agentTask),`${prompt}: candidate project scope`);assert.equal(cmd.executionPolicy.commitView,true,`${prompt}: commit`);assertions++;}

const oldSchool=createAiWorkspace({examContext:{score:580},activeView:{score:580,regionKeys:['ln'],majorKeywords:['机械'],schoolNames:['沈阳化工大学'],bottomLineMode:'all'},agentContext:{currentTask:'school_research',focus:{school:'沈阳化工大学',schools:['沈阳化工大学'],sourceText:'沈阳化工大学怎么样'}}});
const crossObjectCases=[
  ['介绍下高校专项计划','knowledge_explain'],['什么是特控线','knowledge_explain'],['介绍下电气工程及自动化专业','knowledge_explain'],
  ['大连交通都多少分','school_history'],['沈航电气多少分','school_major_history']
];
for(const [prompt,task] of crossObjectCases){const cmd=await command(prompt,oldSchool);assert.equal(cmd.agentTask,task,`${prompt}: current object must override remembered school`);if(task==='knowledge_explain')assert.deepEqual(cmd.schoolNames,[],`${prompt}: old school pollution`);assertions++;}

console.log(JSON.stringify({ok:true,version:'aiplus-human-intent-matrix-v0.01',assertions,domains:{schoolResearch:schoolResearchCases.length,schoolHistory:schoolHistoryCases.length,schoolMajor:schools.length*majors.length*schoolMajorTemplates.length,regionMajor:5*regionMajorTemplates.length,experience:experienceCases.length,official:officialCases.length,background:backgroundCases.length,candidate:candidateStartCases.length+5,crossObject:crossObjectCases.length}},null,2));

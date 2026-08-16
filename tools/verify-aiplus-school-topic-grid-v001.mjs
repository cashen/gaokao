import assert from 'node:assert/strict';
import {createAiWorkspace} from '../shared/ai/ai-workspace-contract.v3992_0.js';
import {deterministicCommand,resolveAiSchoolMentionsDetailed} from '../functions/_lib/ai/command-interpreter.js';

const aliases=new Map([
  ['沈工大','沈阳工业大学'],['沈阳工业','沈阳工业大学'],['沈航','沈阳航空航天大学'],['辽科大','辽宁科技大学'],['辽石化','辽宁石油化工大学'],
  ['大连交通','大连交通大学'],['辽宁师范','辽宁师范大学'],['沈阳师范','沈阳师范大学']
]);
const resolver={resolve(query){const name=aliases.get(query);return name?{status:'resolved',resolvedName:name,matchType:'alias_exact'}:{status:'unresolved',candidates:[]};}};
async function command(text,workspace=createAiWorkspace()){
  const resolved=await resolveAiSchoolMentionsDetailed(text,resolver);
  return deterministicCommand(text,workspace,resolved.schoolNames,resolved.matchedAliases);
}

const contexts=[
  ['empty',createAiWorkspace()],
  ['remembered-other-school',createAiWorkspace({examContext:{score:580},activeView:{score:580,regionKeys:['ln'],majorKeywords:['机械'],schoolNames:['沈阳化工大学'],bottomLineMode:'all'},agentContext:{currentTask:'school_research',focus:{school:'沈阳化工大学',schools:['沈阳化工大学'],sourceText:'沈阳化工大学怎么样'}}})],
  ['remembered-major',createAiWorkspace({examContext:{score:580},activeView:{score:580,regionKeys:['ln'],majorKeywords:['测控技术与仪器'],schoolNames:[],bottomLineMode:'all'},agentContext:{currentTask:'major_region_history',focus:{major:'测控技术与仪器',majors:['测控技术与仪器'],sourceText:'省内测控多少分'}}})]
];

const backgroundTopics=[
  '哪个专业更有积累','哪些专业更有积累','什么专业更有积累','哪个专业最强','哪些专业最强','什么专业最好',
  '哪些专业有底子','哪个专业有底子','哪些专业有背景','什么专业有背景','强项专业有哪些','优势专业有哪些',
  '专业优势是什么','专业背景怎么样','学科背景怎么样','专业底蕴怎么样','特色方向有哪些'
];
let backgroundAssertions=0;
for(const [alias,school] of aliases){
  for(const topic of backgroundTopics){
    for(const separator of ['', ' ', '，']){
      const prompt=`${alias}${separator}${topic}`;
      for(const [contextName,workspace] of contexts){
        const cmd=await command(prompt,workspace);
        assert.equal(cmd.agentTask,'school_background',`${contextName} ${prompt}: background task`);
        assert.equal(cmd.focus.school,school,`${contextName} ${prompt}: school identity`);
        assert.equal(cmd.executionPolicy.commitView,false,`${contextName} ${prompt}: background research must not mutate candidate view`);
        backgroundAssertions+=3;
      }
    }
  }
}

const experienceTopics=['宿舍怎么样','食堂怎么样','校园环境怎么样','学校环境怎么样','同学体验怎么样','人文关怀怎么样'];
let experienceAssertions=0;
for(const [alias,school] of aliases){
  for(const topic of experienceTopics){
    for(const separator of ['', ' ']){
      const prompt=`${alias}${separator}${topic}`,cmd=await command(prompt);
      assert.equal(cmd.agentTask,'school_experience',`${prompt}: experience task`);
      assert.equal(cmd.focus.school,school,`${prompt}: school identity`);
      experienceAssertions+=2;
    }
  }
}

const researchTopics=['怎么样','整体怎么样','介绍下','介绍一下','讲讲','说说'];
let researchAssertions=0;
for(const [alias,school] of aliases){
  for(const topic of researchTopics){
    const prompts=topic.startsWith('介绍')||['讲讲','说说'].includes(topic)?[`${topic}${alias}`,`${alias}${topic}`]:[`${alias}${topic}`];
    for(const prompt of prompts){
      const cmd=await command(prompt);
      assert.equal(cmd.agentTask,'school_research',`${prompt}: research task`);
      assert.equal(cmd.focus.school,school,`${prompt}: school identity`);
      researchAssertions+=2;
    }
  }
}

console.log(JSON.stringify({ok:true,version:'aiplus-school-topic-grid-v0.01',aliases:aliases.size,contexts:contexts.length,backgroundTopics:backgroundTopics.length,backgroundAssertions,experienceTopics:experienceTopics.length,experienceAssertions,researchTopics:researchTopics.length,researchAssertions,totalAssertions:backgroundAssertions+experienceAssertions+researchAssertions},null,2));

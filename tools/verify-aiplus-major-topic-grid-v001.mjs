import assert from 'node:assert/strict';
import {createAiWorkspace} from '../shared/ai/ai-workspace-contract.v3992_0.js';
import {deterministicCommand,resolveAiSchoolMentionsDetailed} from '../functions/_lib/ai/command-interpreter.js';
import {normalizeMajorLanguage} from '../functions/_lib/ai/major-language-resolver.js';

const schoolResolver={resolve(){return{status:'unresolved',candidates:[]};}};
async function command(text,workspace=createAiWorkspace()){
  const resolved=await resolveAiSchoolMentionsDetailed(text,schoolResolver);
  return deterministicCommand(text,workspace,resolved.schoolNames,resolved.matchedAliases);
}
const contexts=[
  ['empty',createAiWorkspace()],
  ['remembered-school',createAiWorkspace({examContext:{score:580},activeView:{score:580,regionKeys:['ln'],majorKeywords:['机械'],schoolNames:['沈阳工业大学'],bottomLineMode:'all'},agentContext:{currentTask:'school_research',focus:{school:'沈阳工业大学',schools:['沈阳工业大学'],sourceText:'沈阳工业大学怎么样'}}})],
  ['remembered-major',createAiWorkspace({examContext:{score:580},activeView:{score:580,regionKeys:['ln'],majorKeywords:['会计学'],schoolNames:[],bottomLineMode:'all'},agentContext:{currentTask:'major_region_history',focus:{major:'会计学',majors:['会计学'],sourceText:'省内会计多少分'}}})]
];

const majors=['电气工程及自动化','自动化','机械电子','会计','计算机','测控'];
const regions=['辽宁','辽宁省内','省内'];
const backgroundActions=['哪些学校有积累','哪些学校有背景','哪个学校更强','哪些学校有底子','哪些学校有优势','哪里更强','哪里有积累','哪里有背景'];
const backgroundOrders=[
  (major,region,action)=>`${major}在${region}${action}`,
  (major,region,action)=>`${region}${major}${action}`,
  (major,region,action)=>`${region}${action}的${major}专业`
];
let backgroundAssertions=0;
for(const majorAlias of majors){
  const canonical=normalizeMajorLanguage(majorAlias);
  for(const region of regions){
    for(const action of backgroundActions){
      for(const makePrompt of backgroundOrders){
        const prompt=makePrompt(majorAlias,region,action);
        for(const [contextName,workspace] of contexts){
          const cmd=await command(prompt,workspace);
          assert.equal(cmd.agentTask,'major_background',`${contextName} ${prompt}: background task`);
          assert.equal(cmd.focus.major,canonical,`${contextName} ${prompt}: canonical major`);
          assert.equal(cmd.executionPolicy.commitView,false,`${contextName} ${prompt}: background task must not mutate candidate view`);
          backgroundAssertions+=3;
        }
      }
    }
  }
}

const historyActions=['哪些学校多少分','哪些学校最低分','哪些学校投档分','哪些学校录取分','哪些学校位次','从高到低都多少分'];
const historyOrders=[
  (major,region,action)=>`${major}在${region}${action}`,
  (major,region,action)=>`${region}${major}${action}`,
  (major,region,action)=>`${region}${action}的${major}专业`
];
let historyAssertions=0;
for(const majorAlias of majors){
  const canonical=normalizeMajorLanguage(majorAlias);
  for(const region of regions){
    for(const action of historyActions){
      for(const makePrompt of historyOrders){
        const prompt=makePrompt(majorAlias,region,action),cmd=await command(prompt);
        assert.equal(cmd.agentTask,'major_region_history',`${prompt}: history task`);
        assert.equal(cmd.focus.major,canonical,`${prompt}: canonical major`);
        historyAssertions+=2;
      }
    }
  }
}

const listActions=['哪些学校有这个专业','哪些学校开这个专业','哪些学校招这个专业'];
let listAssertions=0;
for(const majorAlias of majors){
  const canonical=normalizeMajorLanguage(majorAlias);
  for(const region of regions){
    for(const action of listActions){
      const prompt=`${region}${majorAlias}${action}`,cmd=await command(prompt);
      assert.equal(cmd.agentTask,'major_region_history',`${prompt}: school-list task uses the canonical major-region owner`);
      assert.equal(cmd.focus.major,canonical,`${prompt}: canonical major`);
      listAssertions+=2;
    }
  }
}

console.log(JSON.stringify({ok:true,version:'aiplus-major-topic-grid-v0.01',majors:majors.length,regions:regions.length,contexts:contexts.length,backgroundActions:backgroundActions.length,backgroundOrders:backgroundOrders.length,backgroundAssertions,historyActions:historyActions.length,historyAssertions,listActions:listActions.length,listAssertions,totalAssertions:backgroundAssertions+historyAssertions+listAssertions},null,2));

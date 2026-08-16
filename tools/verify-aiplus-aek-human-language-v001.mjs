import assert from 'node:assert/strict';
import {createAiWorkspace} from '../shared/ai/ai-workspace-contract.v3992_0.js';
import {deterministicCommand} from '../functions/_lib/ai/command-interpreter.js';
import {resolveEducationKnowledgeQuestion} from '../functions/_lib/ai/education-knowledge-center.js';
import {runEducationKnowledge} from '../functions/_lib/ai/education-knowledge-runtime.js';
import {STANDARD_MAJOR_CATALOG_2026_FULL} from '../functions/_lib/kb/standard-major-catalog-2026-full.generated.js';
import {MAJOR_LANGUAGE_ALIASES} from '../functions/_lib/ai/major-language-resolver.js';

function assertKnowledgeRoute(prompt,workspace,label=prompt){
  const cmd=deterministicCommand(prompt,workspace);
  assert.equal(cmd.agentTask,'knowledge_explain',`${label}: must enter AEK knowledge owner`);
  assert.equal(cmd.executionPolicy.commitView,false,`${label}: pure knowledge must not mutate candidate view`);
  assert.deepEqual(cmd.schoolNames||[],[],`${label}: remembered school must not leak into a new knowledge object`);
  return cmd;
}

const emptyWorkspace=createAiWorkspace();
const rememberedSchoolWorkspace=createAiWorkspace({
  examContext:{score:580},
  activeView:{score:580,regionKeys:['ln'],majorKeywords:['机械'],schoolNames:['沈阳化工大学'],bottomLineMode:'all'},
  agentContext:{currentTask:'school_research',focus:{school:'沈阳化工大学',schools:['沈阳化工大学'],sourceText:'沈阳化工大学怎么样'}}
});
const rememberedMajorWorkspace=createAiWorkspace({
  examContext:{score:580},
  activeView:{score:580,regionKeys:['ln'],majorKeywords:['测控技术与仪器'],schoolNames:[],bottomLineMode:'all'},
  agentContext:{currentTask:'major_region_history',focus:{major:'测控技术与仪器',majors:['测控技术与仪器'],sourceText:'测控技术与仪器多少分'}}
});
const contexts=[
  ['empty',emptyWorkspace],
  ['remembered-school',rememberedSchoolWorkspace],
  ['remembered-major',rememberedMajorWorkspace]
];

const conceptSubjects=[
  '高校专项计划','辽宁省高校专项计划','国家专项计划','地方专项','强基计划','综合评价招生','公费师范生','优师计划','农村订单定向医学生',
  '特控线','本科线','投档线','专业最低分','位次','投档','录取','退档','滑档','专业调剂','征集志愿','平行志愿','招生计划',
  '985','211','双一流','国家一流本科专业','工程教育认证','学科评估','硕士点','博士点','本科专业','专业类','一级学科','专业学位','学硕','专硕',
  '职业本科','高职专科','大类招生','专业分流','转专业','培养方案','推免','保研','中外合作办学','国际班','选科要求','物化','物化生',
  '色弱','色盲','单色识别','国家助学贷款','工业控制','智能制造','材料加工','储能','低空经济'
];
const grammarFamilies=[
  subject=>`${subject}是什么`,
  subject=>`什么是${subject}`,
  subject=>`${subject}什么意思`,
  subject=>`介绍下${subject}`,
  subject=>`介绍一下${subject}`,
  subject=>`讲讲${subject}`,
  subject=>`说说${subject}`,
  subject=>`聊聊${subject}`,
  subject=>`了解一下${subject}`,
  subject=>`${subject}介绍一下`,
  subject=>`解释一下${subject}`,
  subject=>`怎么理解${subject}`
];

let conceptLanguageCount=0;
for(const subject of conceptSubjects){
  for(const makePrompt of grammarFamilies){
    const prompt=makePrompt(subject);
    for(const [contextName,workspace] of contexts){
      assertKnowledgeRoute(prompt,workspace,`${contextName} ${prompt}`);
      conceptLanguageCount++;
    }
  }
}

assert.equal(STANDARD_MAJOR_CATALOG_2026_FULL.length,883,'2026 official undergraduate major catalog cardinality drift');
const majorGrammarFamilies=[
  subject=>`${subject}专业是什么`,
  subject=>`什么是${subject}专业`,
  subject=>`介绍下${subject}专业`,
  subject=>`讲讲${subject}专业`,
  subject=>`了解一下${subject}专业`,
  subject=>`${subject}专业介绍一下`
];
let majorLanguageCount=0;
for(const item of STANDARD_MAJOR_CATALOG_2026_FULL){
  for(const makePrompt of majorGrammarFamilies){
    const prompt=makePrompt(item.name);
    for(const [contextName,workspace] of contexts){
      assertKnowledgeRoute(prompt,workspace,`${contextName} canonical-major ${prompt}`);
      majorLanguageCount++;
    }
  }
}

let aliasLanguageCount=0;
for(const [alias,canonical] of Object.entries(MAJOR_LANGUAGE_ALIASES)){
  if(!alias||alias===canonical)continue;
  for(const prompt of [`介绍下${alias}专业`,`什么是${alias}专业`,`讲讲${alias}专业`]){
    for(const [contextName,workspace] of contexts){
      assertKnowledgeRoute(prompt,workspace,`${contextName} major-alias ${prompt}`);
      aliasLanguageCount++;
    }
  }
}
assert.ok(aliasLanguageCount>100,'major alias language coverage unexpectedly small');

// Real parent-language counterexamples that exposed the routing gap.
for(const [prompt,workspace] of [
  ['介绍下高校专项计划',rememberedSchoolWorkspace],
  ['什么是特控线',rememberedMajorWorkspace],
  ['介绍下电气工程及自动化 专业',emptyWorkspace]
]) assertKnowledgeRoute(prompt,workspace,`production-counterexample ${prompt}`);

const specialIntro=resolveEducationKnowledgeQuestion('介绍下高校专项计划');
assert.equal(specialIntro.ok,true);assert.equal(specialIntro.entities[0].id,'special:高校专项');
const specialRuntime=await runEducationKnowledge({env:{}},{question:'介绍下高校专项计划'});
assert.notEqual(specialRuntime.answerStatus,'unknown','高校专项介绍 must reach canonical knowledge runtime');

const cutoffReverse=resolveEducationKnowledgeQuestion('什么是特控线');
assert.equal(cutoffReverse.ok,true);assert.equal(cutoffReverse.entities[0].id,'score:特控线');

const electricalAlias=resolveEducationKnowledgeQuestion('介绍下电气工程及自动化 专业');
assert.equal(electricalAlias.ok,true);assert.equal(electricalAlias.entities[0].type,'undergraduate_major');assert.equal(electricalAlias.entities[0].officialCode,'080601');

// Broader entry must not weaken ambiguity/fail-closed semantics.
for(const prompt of ['电子信息是什么','什么是电子信息','介绍下电子信息专业','讲讲电子信息专业']){
  assertKnowledgeRoute(prompt,emptyWorkspace,`ambiguous-route ${prompt}`);
  const resolved=resolveEducationKnowledgeQuestion(prompt);
  assert.equal(resolved.ok,false,`${prompt}: cross-level common label must remain unresolved`);
  assert.equal(resolved.resolutionClass,'ambiguous',`${prompt}: must fail closed as ambiguous`);
}

// Natural school introductions must stay owned by school_research, proving the AEK entry did not swallow school identity questions.
for(const prompt of ['介绍下沈阳工业大学','讲讲沈阳工业大学','沈阳工业大学介绍一下']){
  const cmd=deterministicCommand(prompt,emptyWorkspace,['沈阳工业大学'],['沈工大']);
  assert.equal(cmd.agentTask,'school_research',`${prompt}: school introduction must remain school_research`);
}

console.log(JSON.stringify({
  ok:true,
  version:'aiplus-aek-human-language-v0.01',
  conceptSubjects:conceptSubjects.length,
  grammarFamilies:grammarFamilies.length,
  conceptLanguageCount,
  canonicalMajorCount:STANDARD_MAJOR_CATALOG_2026_FULL.length,
  majorGrammarFamilies:majorGrammarFamilies.length,
  majorLanguageCount,
  aliasLanguageCount,
  contexts:contexts.map(([name])=>name),
  totalRouteAssertions:conceptLanguageCount+majorLanguageCount+aliasLanguageCount
},null,2));

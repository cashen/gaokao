import assert from 'node:assert/strict';
import {createAiWorkspace} from '../shared/ai/ai-workspace-contract.v3992_0.js';
import {AIPLUS_PRODUCT_VERSION,AIPLUS_PRODUCT_CONTRACT_VERSION} from '../shared/ai/aiplus-product-contract.v003.js';
import {deterministicCommand} from '../functions/_lib/ai/command-interpreter.js';
import {buildParentSemanticFrame} from '../functions/_lib/ai/parent-semantic-frame.js';
import {buildEvidencePlan} from '../functions/_lib/ai/evidence-plan.js';
import {createEvidenceClaim,validateClaimSet} from '../functions/_lib/ai/claim-evidence.js';
import {OFFICIAL_WEB_EVIDENCE_TESTING,runOfficialWebEvidence} from '../functions/_lib/ai/official-web-evidence.js';
import {orchestrateAiTurn} from '../functions/_lib/ai/turn-orchestrator.js';
import {AIPLUS_PARENT_QUERY_CATALOG_V003} from './fixtures/aiplus-parent-query-catalog-v003.mjs';

assert.equal(AIPLUS_PRODUCT_VERSION,'v0.03');
assert.equal(AIPLUS_PRODUCT_CONTRACT_VERSION,'aiplus-product-contract-v0.03');

const base=createAiWorkspace({examContext:{score:568},activeView:{score:568,regionKeys:['all'],majorKeywords:[],schoolNames:[],bottomLineMode:'all'}});
function frameFor(command,text,workspace=base){return buildParentSemanticFrame(text,{schools:command.schoolNames,majors:command.majorKeywords,regionKeys:command.regionKeys,score:command.score||workspace?.examContext?.score,mentorProfile:command.mentorProfile,workspace});}
for(const scenario of AIPLUS_PARENT_QUERY_CATALOG_V003){
  const command=deterministicCommand(scenario.text,base,scenario.schools||[],scenario.aliases||[]);
  if(scenario.task&&scenario.task!=='decision_research')assert.equal(command.agentTask,scenario.task,`${scenario.id}: atomic task must remain stable`);
  if(scenario.taskOneOf)assert.ok(scenario.taskOneOf.includes(command.agentTask),`${scenario.id}: ${command.agentTask}`);
  if(scenario.majors?.length)assert.deepEqual(command.majorKeywords.slice(0,scenario.majors.length),scenario.majors,`${scenario.id}: majors`);
  if(scenario.task==='decision_research'){
    assert.notEqual(command.agentTask,'decision_research',`${scenario.id}: composite decision must not replace the atomic task kernel`);
    const semanticFrame=frameFor(command,scenario.text);assert.ok(semanticFrame.signature,`${scenario.id}: semantic frame`);assert.ok(semanticFrame.compositeDecision,`${scenario.id}: composite decision`);
    const plan=buildEvidencePlan({...command,agentTask:'decision_research',semanticFrame},base,base.activeView);assert.ok(plan.steps.length<=3,`${scenario.id}: bounded evidence steps`);assert.equal(plan.maxSteps,3);
    for(const need of scenario.needs||[])assert.ok(semanticFrame.evidenceNeeds.includes(need),`${scenario.id}: evidence need ${need}`);
    for(const career of scenario.careers||[])assert.ok(semanticFrame.careerTargets.includes(career),`${scenario.id}: career ${career}`);
    if(scenario.softSignal){const [dimension,value]=scenario.softSignal;assert.ok(semanticFrame.preferenceSignals.some(item=>item.dimension===dimension&&item.value===value&&item.strength==='soft'),`${scenario.id}: soft signal`);}
    if(scenario.hardSignal){const [dimension,value]=scenario.hardSignal;assert.ok(semanticFrame.preferenceSignals.some(item=>item.dimension===dimension&&item.value===value&&item.strength==='hard'),`${scenario.id}: hard signal`);}
  }
}

const pair=deterministicCommand('沈工大电气和大连交通自动化怎么选，考虑就业和考研',base,['沈阳工业大学','大连交通大学'],['沈工大','大连交通']);
assert.equal(pair.agentTask,'school_comparison','atomic comparison owner must stay unchanged');
const pairFrame=frameFor(pair,'沈工大电气和大连交通自动化怎么选，考虑就业和考研');
assert.deepEqual(pairFrame.pairs.map(item=>[item.school,item.major]),[['沈阳工业大学','电气工程及其自动化'],['大连交通大学','自动化']]);
const pairPlan=buildEvidencePlan({...pair,agentTask:'decision_research',semanticFrame:pairFrame},base,base.activeView);assert.deepEqual(pairPlan.steps.map(item=>item.kind),['admissions_compare','background_evidence','official_web_evidence']);

const followWorkspace=createAiWorkspace({examContext:{score:568},activeView:base.activeView,agentContext:{currentTask:'decision_research',semanticFrame:pairFrame,focus:{schools:pair.schoolNames,majors:pair.majorKeywords}}});
const follow=deterministicCommand('那如果我愿意读研呢',followWorkspace,[],[]);
const followFrame=buildParentSemanticFrame('那如果我愿意读研呢',{schools:follow.schoolNames,majors:follow.majorKeywords,regionKeys:follow.regionKeys,score:follow.score,mentorProfile:follow.mentorProfile,workspace:followWorkspace});
assert.deepEqual(followFrame.schools,pairFrame.schools,'decision follow-up keeps prior school objects');assert.deepEqual(followFrame.majors,pairFrame.majors,'decision follow-up keeps prior major objects');assert.ok(followFrame.preferenceSignals.some(item=>item.dimension==='study_duration'&&item.value==='long_ok'));assert.deepEqual(followFrame.careerTargets,pairFrame.careerTargets,'decision follow-up keeps prior explicit career context');

const unsafe=createEvidenceClaim({subject:'测试大学',dimension:'employment',value:'就业率达到95%',source:{sourceName:'测试大学官网',sourceUrl:'https://example.edu.cn/report'}});assert.equal(unsafe,null,'time-sensitive quantitative claim without year must be rejected');
const safe=createEvidenceClaim({subject:'测试大学',dimension:'employment',value:'2025届毕业生就业率达到95%',source:{sourceName:'测试大学官网',sourceUrl:'https://example.edu.cn/report'}});assert.ok(safe?.claimId);assert.equal(validateClaimSet([safe]),true);

const urls=OFFICIAL_WEB_EVIDENCE_TESTING.searchUrls('第三方 https://example.com/a 官方 https://xxu.edu.cn/report 政府 https://jyt.ln.gov.cn/a 阳光 https://gaokao.chsi.com.cn/x');assert.deepEqual(urls,['https://xxu.edu.cn/report','https://jyt.ln.gov.cn/a','https://gaokao.chsi.com.cn/x']);
const unconfigured=await runOfficialWebEvidence({env:{}},{school:'测试大学',needs:['employment']},async()=>{throw new Error('should not fetch without key');});assert.equal(unconfigured.code,'official_web_search_unconfigured');assert.equal(unconfigured.claims.length,0);
const mockedWeb=await runOfficialWebEvidence({env:{JINA_API_KEY:'test'}},{school:'测试大学',major:'电气工程及其自动化',needs:['employment']},async url=>{const value=String(url);if(value.startsWith('https://s.jina.ai/'))return new Response('搜索摘要说就业很好，但摘要不是事实。\nhttps://xxu.edu.cn/reports/employment-2025.pdf',{status:200});if(value.startsWith('https://r.jina.ai/'))return new Response('Title: 测试大学2025届毕业生就业质量报告\nURL Source: https://xxu.edu.cn/reports/employment-2025.pdf\nMarkdown Content:\n测试大学2025届毕业生就业工作坚持分类指导。2025届毕业生主要去向和就业服务安排以本报告为准。',{status:200});throw new Error(value);});assert.equal(mockedWeb.ok,true);assert.equal(mockedWeb.searchResultIsSource,false);assert.equal(mockedWeb.checkedPageCount,1);assert.ok(mockedWeb.claims.length>0);assert.equal(mockedWeb.claims[0].source.sourceUrl,'https://xxu.edu.cn/reports/employment-2025.pdf');assert.doesNotMatch(mockedWeb.claims[0].value,/搜索摘要说就业很好/);

const request=new Request('https://example.test/api/ai/turn',{method:'POST'}),ctx={request,env:{}};
const turn=await orchestrateAiTurn(ctx,{input:'沈工大电气和大连交通自动化怎么选，考虑就业和考研',workspace:base,confirmedCommand:pair});assert.equal(turn.ok,true);assert.equal(turn.pendingDeterministicTool,true);assert.equal(turn.commitView,false);assert.equal(turn.command.agentTask,'decision_research');assert.ok(turn.command.semanticFrame?.signature);assert.deepEqual(turn.command.semanticFrame.pairs,pairFrame.pairs);assert.equal(turn.toolRequests.length,2,'pair decision should request only two exact school-major history facts before further evidence');assert.ok(turn.toolRequests.every(item=>item.kind==='school_history'));assert.equal(turn.comparisonPlan?.kind,'decision');

const followTurn=await orchestrateAiTurn(ctx,{input:'那如果我愿意读研呢',workspace:followWorkspace,confirmedCommand:follow});assert.equal(followTurn.ok,true);assert.equal(followTurn.command.agentTask,'decision_research');assert.equal(followTurn.commitView,false);assert.deepEqual(followTurn.command.semanticFrame.schools,pairFrame.schools);assert.ok(followTurn.command.semanticFrame.preferenceSignals.some(item=>item.dimension==='study_duration'&&item.value==='long_ok'));

console.log(JSON.stringify({ok:true,version:'aiplus-parent-semantics-v0.03',scenarios:AIPLUS_PARENT_QUERY_CATALOG_V003.length,product:AIPLUS_PRODUCT_VERSION},null,2));

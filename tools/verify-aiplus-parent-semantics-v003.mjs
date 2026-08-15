import assert from 'node:assert/strict';
import {createAiWorkspace} from '../shared/ai/ai-workspace-contract.v3992_0.js';
import {AIPLUS_PRODUCT_VERSION,AIPLUS_PRODUCT_CONTRACT_VERSION} from '../shared/ai/aiplus-product-contract.v003.js';
import {deterministicCommand} from '../functions/_lib/ai/command-interpreter.js';
import {buildEvidencePlan} from '../functions/_lib/ai/evidence-plan.js';
import {createEvidenceClaim,validateClaimSet} from '../functions/_lib/ai/claim-evidence.js';
import {OFFICIAL_WEB_EVIDENCE_TESTING,runOfficialWebEvidence} from '../functions/_lib/ai/official-web-evidence.js';
import {orchestrateAiTurn} from '../functions/_lib/ai/turn-orchestrator.js';
import {AIPLUS_PARENT_QUERY_CATALOG_V003} from './fixtures/aiplus-parent-query-catalog-v003.mjs';

assert.equal(AIPLUS_PRODUCT_VERSION,'v0.03');
assert.equal(AIPLUS_PRODUCT_CONTRACT_VERSION,'aiplus-product-contract-v0.03');

const base=createAiWorkspace({examContext:{score:568},activeView:{score:568,regionKeys:['all'],majorKeywords:[],schoolNames:[],bottomLineMode:'all'}});
for(const scenario of AIPLUS_PARENT_QUERY_CATALOG_V003){
  const command=deterministicCommand(scenario.text,base,scenario.schools||[],scenario.aliases||[]);
  if(scenario.task)assert.equal(command.agentTask,scenario.task,scenario.id);
  if(scenario.taskOneOf)assert.ok(scenario.taskOneOf.includes(command.agentTask),`${scenario.id}: ${command.agentTask}`);
  if(scenario.majors?.length)assert.deepEqual(command.majorKeywords.slice(0,scenario.majors.length),scenario.majors,`${scenario.id}: majors`);
  if(command.agentTask==='decision_research'){
    assert.equal(command.executionPolicy.commitView,false,`${scenario.id}: decision research must not mutate candidate view`);
    assert.ok(command.semanticFrame?.signature,`${scenario.id}: semantic frame`);
    assert.ok(command.semanticFrame?.compositeDecision,`${scenario.id}: composite decision`);
    const plan=buildEvidencePlan(command,base,base.activeView);assert.ok(plan.steps.length<=3,`${scenario.id}: bounded evidence steps`);assert.equal(plan.maxSteps,3);
    for(const need of scenario.needs||[])assert.ok(command.semanticFrame.evidenceNeeds.includes(need),`${scenario.id}: evidence need ${need}`);
    for(const career of scenario.careers||[])assert.ok(command.semanticFrame.careerTargets.includes(career),`${scenario.id}: career ${career}`);
    if(scenario.softSignal){const [dimension,value]=scenario.softSignal;assert.ok(command.semanticFrame.preferenceSignals.some(item=>item.dimension===dimension&&item.value===value&&item.strength==='soft'),`${scenario.id}: soft signal`);}
    if(scenario.hardSignal){const [dimension,value]=scenario.hardSignal;assert.ok(command.semanticFrame.preferenceSignals.some(item=>item.dimension===dimension&&item.value===value&&item.strength==='hard'),`${scenario.id}: hard signal`);}
  }
}

const pair=deterministicCommand('沈工大电气和大连交通自动化怎么选，考虑就业和考研',base,['沈阳工业大学','大连交通大学'],['沈工大','大连交通']);
assert.equal(pair.agentTask,'decision_research');
assert.deepEqual(pair.semanticFrame.pairs.map(item=>[item.school,item.major]),[['沈阳工业大学','电气工程及其自动化'],['大连交通大学','自动化']]);
const pairPlan=buildEvidencePlan(pair,base,base.activeView);assert.deepEqual(pairPlan.steps.map(item=>item.kind),['admissions_compare','background_evidence','official_web_evidence']);

const followWorkspace=createAiWorkspace({examContext:{score:568},activeView:base.activeView,agentContext:{currentTask:'decision_research',semanticFrame:pair.semanticFrame,focus:{schools:pair.schoolNames,majors:pair.majorKeywords}}});
const follow=deterministicCommand('那如果我愿意读研呢',followWorkspace,[],[]);
assert.equal(follow.agentTask,'decision_research');
assert.ok(follow.semanticFrame.preferenceSignals.some(item=>item.dimension==='study_duration'&&item.value==='long_ok'));
assert.deepEqual(follow.semanticFrame.careerTargets,pair.semanticFrame.careerTargets,'decision follow-up keeps prior explicit career context');

const unsafe=createEvidenceClaim({subject:'测试大学',dimension:'employment',value:'就业率达到95%',source:{sourceName:'测试大学官网',sourceUrl:'https://example.edu.cn/report'}});
assert.equal(unsafe,null,'time-sensitive quantitative claim without year must be rejected');
const safe=createEvidenceClaim({subject:'测试大学',dimension:'employment',value:'2025届毕业生就业率达到95%',source:{sourceName:'测试大学官网',sourceUrl:'https://example.edu.cn/report'}});
assert.ok(safe?.claimId);assert.equal(validateClaimSet([safe]),true);

const urls=OFFICIAL_WEB_EVIDENCE_TESTING.searchUrls('第三方 https://example.com/a 官方 https://xxu.edu.cn/report 政府 https://jyt.ln.gov.cn/a 阳光 https://gaokao.chsi.com.cn/x');
assert.deepEqual(urls,['https://xxu.edu.cn/report','https://jyt.ln.gov.cn/a','https://gaokao.chsi.com.cn/x']);
const unconfigured=await runOfficialWebEvidence({env:{}},{school:'测试大学',needs:['employment']},async()=>{throw new Error('should not fetch without key');});
assert.equal(unconfigured.code,'official_web_search_unconfigured');assert.equal(unconfigured.claims.length,0);

const request=new Request('https://example.test/api/ai/turn',{method:'POST'}),ctx={request,env:{}};
const turn=await orchestrateAiTurn(ctx,{input:'沈工大电气和大连交通自动化怎么选，考虑就业和考研',workspace:base,confirmedCommand:pair});
assert.equal(turn.ok,true);assert.equal(turn.pendingDeterministicTool,true);assert.equal(turn.commitView,false);assert.equal(turn.command.agentTask,'decision_research');assert.equal(turn.toolRequests.length,2,'pair decision should request only two exact school-major history facts before further evidence');
assert.ok(turn.toolRequests.every(item=>item.kind==='school_history'));

console.log(JSON.stringify({ok:true,version:'aiplus-parent-semantics-v0.03',scenarios:AIPLUS_PARENT_QUERY_CATALOG_V003.length,product:AIPLUS_PRODUCT_VERSION},null,2));

import assert from 'node:assert/strict';
import {createAiWorkspace,buildAiTurnRequestPayload} from '../shared/ai/ai-workspace-contract.v3992_0.js';

const BASE='https://751d2dea.gaokao-4y9.pages.dev';
const EXPECTED='36619de7e5e74baac5303d644f0f581f57269174';

async function turn(input,workspace){
  const payload=buildAiTurnRequestPayload(workspace,{input});
  const response=await fetch(`${BASE}/api/ai/turn`,{method:'POST',headers:{'content-type':'application/json',accept:'application/json','user-agent':'aiplus-pr166-compact-preview-proof'},body:JSON.stringify(payload)});
  const data=await response.json().catch(()=>null);
  assert.ok(response.ok,`${input}: HTTP ${response.status} ${JSON.stringify(data)}`);
  assert.equal(data?.ok,true,`${input}: api ok`);
  assert.ok(data?.command,`${input}: command missing`);
  return data;
}
function assertLocked(data,input){assert.equal(data.command.taskLocked,true,`${input}: compact entity must be deterministic-task locked`);}

const empty=createAiWorkspace();
const bareScore=await turn('650分',empty);
assert.equal(bareScore.command.agentTask,'fact_rank_lookup','650分: task');
assert.equal(bareScore.command.scoreUsage,'active','650分: personal score usage');
assertLocked(bareScore,'650分');

const bareMajor=await turn('电气',empty);
assert.equal(bareMajor.command.agentTask,'general_advice','电气 empty: direction-only task');
assert.equal(bareMajor.command.focus?.major,'电气','电气 empty: broad major preserved');
assertLocked(bareMajor,'电气 empty');
if(!bareMajor.pendingDeterministicTool){assert.equal(bareMajor.result?.decisionStage,'start','general_advice must not masquerade as feasible_set');}

const afterScore=createAiWorkspace({examContext:{score:650,rank:2867},agentContext:{currentTask:'fact_rank_lookup',focus:{}}});
const majorAfterScore=await turn('电气',afterScore);
assert.equal(majorAfterScore.command.agentTask,'candidate_discovery','650 context -> 电气');
assert.equal(majorAfterScore.command.focus?.major,'电气','650 context -> 电气 focus');
assertLocked(majorAfterScore,'score -> major');

const candidate=createAiWorkspace({
  examContext:{score:650,rank:2867},
  activeView:{score:650,regionKeys:['ln'],majorKeywords:['电气'],schoolNames:[],bottomLineMode:'all'},
  agentContext:{currentTask:'candidate_discovery',focus:{major:'电气',majors:['电气'],sourceText:'电气'}}
});
const regionAfterMajor=await turn('沈阳',candidate);
assert.equal(regionAfterMajor.command.agentTask,'candidate_refinement','candidate -> 沈阳');
assert.ok((regionAfterMajor.command.regionKeys||[]).includes('shenyang'),'沈阳 region key');
assertLocked(regionAfterMajor,'candidate -> region');

const schoolAfterCandidate=await turn('沈工大',candidate);
assert.equal(schoolAfterCandidate.command.agentTask,'school_research','candidate -> bare school switches object, not implicit filter');
assert.equal(schoolAfterCandidate.command.focus?.school,'沈阳工业大学','沈工大 canonical school');
assert.equal(schoolAfterCandidate.command.executionPolicy?.commitView,false,'沈工大 must not mutate candidate schoolNames');
assertLocked(schoolAfterCandidate,'candidate -> school');

const majorHistory=createAiWorkspace({examContext:{score:650,rank:2867},agentContext:{currentTask:'major_region_history',focus:{major:'电气',majors:['电气']}}});
const schoolDrill=await turn('沈工大',majorHistory);
assert.equal(schoolDrill.command.agentTask,'school_major_history','major history -> school drills into school-major');
assert.equal(schoolDrill.command.focus?.school,'沈阳工业大学');
assert.equal(schoolDrill.command.focus?.major,'电气');
assertLocked(schoolDrill,'major history -> school');

console.log(JSON.stringify({ok:true,expectedHead:EXPECTED,preview:BASE,proofs:['bare-score','bare-major','score-major','candidate-region','candidate-school','major-history-school'],commands:[bareScore.command.agentTask,bareMajor.command.agentTask,majorAfterScore.command.agentTask,regionAfterMajor.command.agentTask,schoolAfterCandidate.command.agentTask,schoolDrill.command.agentTask]},null,2));

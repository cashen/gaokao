from pathlib import Path

p=Path('tools/verify-aiplus-parent-semantics-v003.mjs')
s=p.read_text()
old="import {createAiWorkspace} from '../shared/ai/ai-workspace-contract.v3992_0.js';"
new="import {createAiWorkspace,compactAiWorkspaceForServer} from '../shared/ai/ai-workspace-contract.v3992_0.js';"
if old in s:
    s=s.replace(old,new,1)
elif new not in s:
    raise SystemExit('workspace import anchor missing')
start=s.index("const request=new Request('https://example.test/api/ai/turn'")
end=s.index("\n\nconsole.log(",start)
block="""const request=new Request('https://example.test/api/ai/turn',{method:'POST'});
const resolverSchools=[{officialName:'沈阳工业大学',province:'辽宁',city:'沈阳'},{officialName:'大连交通大学',province:'辽宁',city:'大连'},...Array.from({length:58},(_,index)=>({officialName:`测试占位大学${index+1}`,province:'辽宁',city:'沈阳'}))];
const emptyBackground={version:'local-strength-static-v3971_2',records:[],schools:[],meta:{dataYear:2026},academicBackgroundMeta:{boundary:'test empty background'}};
const testAssets={fetch:async input=>{const pathname=new URL(input.url).pathname;if(pathname==='/ln-rank/data/local-strength/local-strength-audit.v3971_2.json')return new Response(JSON.stringify({schools:resolverSchools}),{status:200,headers:{'content-type':'application/json'}});if(pathname==='/ln-rank/data/local-strength/local-strength-index.v3971_2.json')return new Response(JSON.stringify(emptyBackground),{status:200,headers:{'content-type':'application/json'}});return new Response('{}',{status:404,headers:{'content-type':'application/json'}});}};
const ctx={request,env:{ASSETS:testAssets}};
const fullPairText='沈阳工业大学电气和大连交通大学自动化怎么选，考虑就业和考研';
const turn=await orchestrateAiTurn(ctx,{input:fullPairText,workspace:base});
assert.equal(turn.ok,true);assert.equal(turn.pendingDeterministicTool,true);assert.equal(turn.commitView,false);assert.equal(turn.command.agentTask,'decision_research');assert.deepEqual(turn.command.schoolNames,['沈阳工业大学','大连交通大学']);assert.deepEqual(turn.command.majorKeywords,['电气','自动化']);assert.ok(turn.command.semanticFrame?.signature);assert.equal(buildEvidencePlan(turn.command,base,base.activeView).scoreUsed,false,'remembered score must not silently execute admissions');assert.ok(turn.toolRequests.length>=1&&turn.toolRequests.length<=4);assert.ok(turn.toolRequests.every(item=>item.kind==='school_official'),'no-score composite decision should request official evidence, not admissions history');
const completedOfficialResults={};for(const item of turn.toolRequests){completedOfficialResults[item.key]={kind:item.kind,key:item.key,url:item.url,status:200,payload:{ok:false,code:'test_no_official_text',school:new URL(item.url,'https://example.test').searchParams.get('school')||'',message:'test evidence unavailable'}};}
const continued=await orchestrateAiTurn(ctx,{input:fullPairText,workspace:base,confirmedCommand:turn.command,deterministicToolResults:completedOfficialResults});
assert.equal(continued.ok,true);assert.equal(continued.pendingDeterministicTool,false);assert.equal(continued.command.agentTask,'decision_research');assert.deepEqual(continued.command.schoolNames,['沈阳工业大学','大连交通大学'],'continuation must re-resolve canonical schools server-side');assert.deepEqual(continued.command.majorKeywords,['电气','自动化'],'continuation must re-resolve canonical majors server-side');assert.equal(continued.commitView,false);assert.equal(continued.result?.decisionResearch?.plan?.scoreUsed,false);
const explicitTurn=await orchestrateAiTurn(ctx,{input:`568分，${fullPairText}`,workspace:base});
assert.equal(explicitTurn.ok,true);assert.equal(explicitTurn.pendingDeterministicTool,true);assert.equal(explicitTurn.command.agentTask,'decision_research');assert.equal(buildEvidencePlan(explicitTurn.command,base,base.activeView).scoreUsed,true);assert.equal(explicitTurn.toolRequests.length,2);assert.ok(explicitTurn.toolRequests.every(item=>item.kind==='school_history'),'explicit score pair must first request exact school-major admissions facts');
const persistedFollowWorkspace=compactAiWorkspaceForServer(followWorkspace,{input:'那如果我愿意读研呢'});assert.equal(persistedFollowWorkspace.agentContext?.semanticFrame?.comparisonPairs?.length,2,'server compaction must preserve bounded decision semantic frame');
const followTurn=await orchestrateAiTurn(ctx,{input:'那如果我愿意读研呢',workspace:persistedFollowWorkspace});assert.equal(followTurn.ok,true);assert.equal(followTurn.command.agentTask,'decision_research');assert.equal(followTurn.commitView,false);assert.deepEqual(followTurn.command.semanticFrame.schools,pairFrame.schools);assert.equal(followTurn.command.semanticFrame.counterfactual.active,true);assert.equal(buildEvidencePlan(followTurn.command,persistedFollowWorkspace,persistedFollowWorkspace.activeView).scoreUsed,false);
const refTurn=await orchestrateAiTurn(ctx,{input:'第二个就业呢',workspace:persistedFollowWorkspace});assert.equal(refTurn.ok,true);assert.equal(refTurn.command.agentTask,'decision_research');assert.equal(refTurn.command.semanticFrame.reference.index,1);assert.deepEqual(refTurn.command.semanticFrame.pairs.map(item=>item.school),['大连交通大学']);assert.ok(refTurn.toolRequests.every(item=>item.kind==='school_official'));assert.equal(refTurn.toolRequests.length,1,'reference follow-up must only research selected school/pair');"""
p.write_text(s[:start]+block+s[end:])

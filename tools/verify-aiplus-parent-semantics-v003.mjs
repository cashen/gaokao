import assert from 'node:assert/strict';
import {createAiWorkspace,compactAiWorkspaceForServer} from '../shared/ai/ai-workspace-contract.v3992_0.js';
import {AIPLUS_PRODUCT_VERSION,AIPLUS_PRODUCT_CONTRACT_VERSION} from '../shared/ai/aiplus-product-contract.v002.js';
import {deterministicCommand} from '../functions/_lib/ai/command-interpreter.js';
import {buildParentSemanticFrame,studentSignalsFromText,referenceFromText} from '../functions/_lib/ai/parent-semantic-frame.js';
import {buildEvidencePlan} from '../functions/_lib/ai/evidence-plan.js';
import {createEvidenceClaim,claimsFromOfficialText,validateClaimSet} from '../functions/_lib/ai/claim-evidence.js';
import {OFFICIAL_WEB_EVIDENCE_TESTING,runOfficialWebEvidence,runMajorKnowledgeEvidence} from '../functions/_lib/ai/official-web-evidence.js';
import {orchestrateAiTurn} from '../functions/_lib/ai/turn-orchestrator.js';
import {composePrimaryAnswer} from '../functions/_lib/ai/answer-composer.js';
import {buildBlocks} from '../functions/_lib/ai/advisor-presentation.js';
import {AIPLUS_PARENT_QUERY_CATALOG_V003} from './fixtures/aiplus-parent-query-catalog-v003.mjs';

assert.equal(AIPLUS_PRODUCT_VERSION,'v0.02');
assert.equal(AIPLUS_PRODUCT_CONTRACT_VERSION,'aiplus-product-contract-v0.02');

const base=createAiWorkspace({examContext:{score:568},activeView:{score:568,regionKeys:['all'],majorKeywords:[],schoolNames:[],bottomLineMode:'all'}});
function frameFor(command,text,workspace=base){return buildParentSemanticFrame(text,{schools:command.schoolNames,majors:command.majorKeywords,regionKeys:command.regionKeys,score:command.score||workspace?.examContext?.score,mentorProfile:command.mentorProfile,workspace});}
function kinds(plan){return plan.steps.map(item=>item.kind);}

for(const scenario of AIPLUS_PARENT_QUERY_CATALOG_V003){
  const command=deterministicCommand(scenario.text,base,scenario.schools||[],scenario.aliases||[]);
  if(scenario.task&&scenario.task!=='decision_research')assert.equal(command.agentTask,scenario.task,`${scenario.id}: atomic task must remain stable`);
  if(scenario.taskOneOf)assert.ok(scenario.taskOneOf.includes(command.agentTask),`${scenario.id}: ${command.agentTask}`);
  if(scenario.majors?.length)assert.deepEqual(command.majorKeywords.slice(0,scenario.majors.length),scenario.majors,`${scenario.id}: majors`);
  if(scenario.scoreUsage)assert.equal(command.scoreUsage,scenario.scoreUsage,`${scenario.id}: score usage`);
  if(scenario.task==='decision_research'){
    assert.notEqual(command.agentTask,'decision_research',`${scenario.id}: composite decision must stay above atomic task kernel`);
    const semanticFrame=frameFor(command,scenario.text);assert.ok(semanticFrame.signature,`${scenario.id}: semantic frame`);assert.ok(semanticFrame.compositeDecision,`${scenario.id}: composite decision`);
    const plan=buildEvidencePlan({...command,agentTask:'decision_research',semanticFrame},base,base.activeView);assert.ok(plan.steps.length<=3,`${scenario.id}: bounded evidence steps`);assert.equal(plan.maxSteps,3);
    for(const need of scenario.needs||[])assert.ok(semanticFrame.evidenceNeeds.includes(need),`${scenario.id}: evidence need ${need}`);
    for(const career of scenario.careers||[])assert.ok(semanticFrame.careerTargets.includes(career),`${scenario.id}: career ${career}`);
    for(const [dimension,value] of scenario.studentSignals||[])assert.ok(semanticFrame.studentSignals.some(item=>item.dimension===dimension&&item.value===value),`${scenario.id}: student signal ${dimension}`);
    if(scenario.softSignal){const [dimension,value]=scenario.softSignal;assert.ok(semanticFrame.preferenceSignals.some(item=>item.dimension===dimension&&item.value===value&&item.strength==='soft'),`${scenario.id}: soft signal`);}
    if(scenario.hardSignal){const [dimension,value]=scenario.hardSignal;assert.ok(semanticFrame.preferenceSignals.some(item=>item.dimension===dimension&&item.value===value&&item.strength==='hard'),`${scenario.id}: hard signal`);}
    if(scenario.rememberedScoreOnly){assert.equal(plan.scoreUsed,false,`${scenario.id}: remembered score must not execute admissions`);assert.equal(plan.rememberedScoreAvailable,true,`${scenario.id}: remembered score remains available`);assert.ok(!kinds(plan).some(kind=>kind.startsWith('admissions')),`${scenario.id}: no hidden admissions step`);}
    if(scenario.explicitScore){assert.equal(plan.scoreUsed,true,`${scenario.id}: explicit current score must execute admissions`);assert.equal(kinds(plan)[0],'admissions_compare',`${scenario.id}: admissions first when explicitly requested`);}
    if(scenario.scoreUsage==='suspended'){assert.equal(semanticFrame.score,null,`${scenario.id}: frame score suspended`);assert.ok(!semanticFrame.evidenceNeeds.includes('admissions'),`${scenario.id}: accumulated admissions removed`);assert.equal(plan.scoreUsed,false,`${scenario.id}: plan score suspended`);assert.ok(!kinds(plan).some(kind=>kind.startsWith('admissions')),`${scenario.id}: no admissions while suspended`);}
    if(scenario.pairShape==='schools_one_major')assert.deepEqual(semanticFrame.pairs.map(item=>item.major),[scenario.majors[0],scenario.majors[0]],`${scenario.id}: same major across schools`);
    if(scenario.pairShape==='one_school_majors')assert.deepEqual(semanticFrame.pairs.map(item=>item.school),[scenario.schools[0],scenario.schools[0],scenario.schools[0]],`${scenario.id}: same school across majors`);
  }
}

const pairText='沈工大电气和大连交通自动化怎么选，考虑就业和考研';
const pair=deterministicCommand(pairText,base,['沈阳工业大学','大连交通大学'],['沈工大','大连交通']);
assert.equal(pair.agentTask,'school_comparison','atomic comparison owner remains unchanged');
const pairFrame=frameFor(pair,pairText);
assert.deepEqual(pairFrame.pairs.map(item=>[item.school,item.major]),[['沈阳工业大学',pair.majorKeywords[0]],['大连交通大学',pair.majorKeywords[1]]],'composite pair must reuse atomic major semantics rather than re-canonicalize them');
const pairPlan=buildEvidencePlan({...pair,agentTask:'decision_research',semanticFrame:pairFrame},base,base.activeView);
assert.deepEqual(kinds(pairPlan),['background_evidence','official_web_evidence'],'remembered score must not silently become a decision dimension');
assert.equal(pairPlan.scoreUsed,false);assert.equal(pairPlan.rememberedScoreAvailable,true);
const answerFirst=composePrimaryAnswer({command:{agentTask:'decision_research'},result:{decisionResearch:{ok:true,frame:pairFrame,plan:pairPlan,answer:'证据不足的部分不会补猜。'}},focus:{},view:base.activeView});assert.equal(answerFirst.status,'answered');assert.match(answerFirst.text,/我先按这些条件理解/);assert.match(answerFirst.text,/分数仍记着/);assert.match(answerFirst.text,/沈阳工业大学/);assert.match(answerFirst.text,/大连交通大学/);

const scoredText='568分，沈工大电气和大连交通自动化怎么选，考虑就业';
const scored=deterministicCommand(scoredText,base,['沈阳工业大学','大连交通大学'],['沈工大','大连交通']);
const scoredFrame=frameFor(scored,scoredText),scoredPlan=buildEvidencePlan({...scored,agentTask:'decision_research',semanticFrame:scoredFrame},base,base.activeView);
assert.deepEqual(kinds(scoredPlan),['admissions_compare','background_evidence','official_web_evidence']);assert.equal(scoredPlan.scoreUsed,true);

const shared=buildParentSemanticFrame('沈工大和沈航的电气怎么选，更看重就业',{schools:['沈阳工业大学','沈阳航空航天大学'],majors:['电气工程及其自动化'],score:568,workspace:base});
assert.deepEqual(shared.pairs.map(item=>[item.school,item.major]),[['沈阳工业大学','电气工程及其自动化'],['沈阳航空航天大学','电气工程及其自动化']]);
const oneSchool=buildParentSemanticFrame('沈航机械、电气、测控怎么选，更看重就业',{schools:['沈阳航空航天大学'],majors:['机械','电气工程及其自动化','测控技术与仪器'],score:568,workspace:base});
assert.deepEqual(oneSchool.pairs.map(item=>[item.school,item.major]),[['沈阳航空航天大学','机械'],['沈阳航空航天大学','电气工程及其自动化'],['沈阳航空航天大学','测控技术与仪器']]);
const ambiguousCartesian=buildParentSemanticFrame('两个学校三个专业怎么选，就业优先',{schools:['甲大学','乙大学'],majors:['机械','电气工程及其自动化','自动化'],score:568,workspace:base});assert.equal(ambiguousCartesian.pairs.length,0,'mismatched multi-school/multi-major must not invent a cartesian pairing');

const followWorkspace=createAiWorkspace({examContext:{score:568},activeView:base.activeView,agentContext:{currentTask:'decision_research',semanticFrame:pairFrame,focus:{schools:pair.schoolNames,majors:pair.majorKeywords}}});
const follow=deterministicCommand('那如果我愿意读研呢',followWorkspace,[],[]);
const followFrame=buildParentSemanticFrame('那如果我愿意读研呢',{schools:follow.schoolNames,majors:follow.majorKeywords,regionKeys:follow.regionKeys,score:follow.score||followWorkspace.examContext.score,mentorProfile:follow.mentorProfile,workspace:followWorkspace});
assert.deepEqual(followFrame.schools,pairFrame.schools,'counterfactual keeps prior schools');assert.deepEqual(followFrame.majors,pairFrame.majors,'counterfactual keeps prior majors');assert.deepEqual(followFrame.comparisonPairs,pairFrame.comparisonPairs,'counterfactual keeps comparison geometry');assert.ok(followFrame.preferenceSignals.some(item=>item.dimension==='study_duration'&&item.value==='long_ok'));assert.equal(followFrame.counterfactual.active,true);assert.deepEqual(followFrame.counterfactual.changedDimensions,['study_duration']);assert.deepEqual(followFrame.currentEvidenceNeeds,['postgraduate']);
const followPlan=buildEvidencePlan({...follow,agentTask:'decision_research',semanticFrame:followFrame},followWorkspace,followWorkspace.activeView);assert.equal(followPlan.scoreUsed,false);assert.deepEqual(kinds(followPlan),['official_web_evidence']);

assert.deepEqual(referenceFromText('第二个就业呢'),{kind:'pair',index:1,word:'第二个'});
const refFrame=buildParentSemanticFrame('第二个就业呢',{schools:['大连交通大学'],majors:['自动化'],score:568,workspace:followWorkspace});
assert.deepEqual(refFrame.schools,pairFrame.schools,'ordinal reference must not redefine decision object set');assert.deepEqual(refFrame.comparisonPairs,pairFrame.comparisonPairs);assert.equal(refFrame.reference.index,1);assert.deepEqual(refFrame.pairs.map(item=>[item.school,item.major]),[['大连交通大学','自动化']]);
const refPlan=buildEvidencePlan({agentTask:'decision_research',scoreUsage:'remembered',semanticFrame:refFrame},followWorkspace,followWorkspace.activeView);assert.equal(refPlan.scoreUsed,false);assert.deepEqual(refPlan.steps[0].params.schools,['大连交通大学']);assert.deepEqual(refPlan.steps[0].params.majors,['自动化']);
const refScoreFrame=buildParentSemanticFrame('第二个568分现实吗',{schools:['大连交通大学'],majors:['自动化'],score:568,workspace:followWorkspace});const refScorePlan=buildEvidencePlan({agentTask:'decision_research',scoreUsage:'remembered',semanticFrame:refScoreFrame},followWorkspace,followWorkspace.activeView);assert.equal(refScorePlan.scoreUsed,true);assert.equal(kinds(refScorePlan)[0],'admissions_compare');assert.equal(refScorePlan.steps[0].params.pairs.length,1);assert.deepEqual(refScorePlan.steps[0].params.schools,['大连交通大学']);

const subjectContextCases=[
  ['孩子数学不错，但不喜欢编程，也不接受倒班，电气和自动化怎么选',['电气','自动化']],
  ['孩子物理很好，机械和电气怎么选',['机械','电气']],
  ['孩子化学一般，材料和化工怎么选',['材料','化工']],
  ['数学和自动化怎么选',['数学','自动化']],
  ['物理和电气怎么选',['物理','电气']],
  ['化学和材料怎么选',['化学','材料']]
];
for(const [text,expected] of subjectContextCases){const value=deterministicCommand(text,base,[],[]);assert.deepEqual(value.majorKeywords.slice(0,expected.length),expected,`subject-major context: ${text}`);}

const student=studentSignalsFromText('孩子数学不错，但是不喜欢编程，不接受倒班，可以出差，动手能力挺好');
assert.ok(student.some(item=>item.dimension==='math_strength'&&item.value==='strong'));assert.ok(student.some(item=>item.dimension==='programming_affinity'&&item.value==='avoid'));assert.ok(!student.some(item=>item.dimension==='programming_affinity'&&item.value==='accept'));assert.ok(student.some(item=>item.dimension==='shift_work'&&item.value==='avoid'));assert.ok(student.some(item=>item.dimension==='travel'&&item.value==='accept'));assert.ok(!student.some(item=>item.dimension==='travel'&&item.value==='avoid'));assert.ok(student.some(item=>item.dimension==='hands_on'&&item.value==='strong'));
const mentorFrame=buildParentSemanticFrame('以后工作稳定一些，电气和自动化怎么选',{majors:['电气工程及其自动化','自动化'],score:568,mentorProfile:{source:'ai-assisted',primaryGoal:'employment_stability',priorities:['employment'],riskQuestions:['employment_certainty']},workspace:base});assert.equal(mentorFrame.source,'deterministic+controlled-ai');assert.ok(mentorFrame.preferenceSignals.some(item=>item.dimension==='employment'));assert.ok(mentorFrame.currentEvidenceNeeds.includes('employment'));

let matrixCount=0;const geometries=[{schools:['甲大学','乙大学'],majors:['电气工程及其自动化']},{schools:['甲大学'],majors:['电气工程及其自动化','自动化']},{schools:['甲大学','乙大学'],majors:['电气工程及其自动化','自动化']}],dimensions=['就业优先','愿意读研','普通家庭预算有限','最好在辽宁','孩子不喜欢编程'],verbs=['怎么选','哪个更适合','如何取舍','综合比较'],tails=['？','，帮我看看','，先把条件拆开'];
for(const geometry of geometries)for(const dimension of dimensions)for(const verb of verbs)for(const tail of tails){const text=`${dimension}，这些选择${verb}${tail}`,frame=buildParentSemanticFrame(text,{...geometry,score:568,workspace:base});assert.equal(frame.compositeDecision,true,`matrix composite: ${text}`);assert.ok(frame.signature);assert.ok(frame.pairs.length>=1,`matrix pair geometry: ${text}`);assert.ok(frame.constraints.length<=18);const plan=buildEvidencePlan({agentTask:'decision_research',scoreUsage:'remembered',semanticFrame:frame},base,base.activeView);assert.ok(plan.steps.length<=3);matrixCount+=1;}
assert.equal(matrixCount,180);

const unsafe=createEvidenceClaim({subject:'测试大学',subjectType:'school',sourceScope:'school',dimension:'employment',value:'就业率达到95%',source:{sourceName:'测试大学官网',sourceUrl:'https://example.edu.cn/report'}});assert.equal(unsafe,null,'time-sensitive quantitative claim without year rejected');
const safe=createEvidenceClaim({subject:'测试大学',subjectType:'school',sourceScope:'school',dimension:'employment',value:'2025届毕业生就业率达到95%',source:{sourceName:'测试大学官网',sourceUrl:'https://example.edu.cn/report'}});assert.ok(safe?.claimId);assert.equal(validateClaimSet([safe]),true);
const illegalNarrow=createEvidenceClaim({subject:'测试大学 · 电气工程及其自动化',subjectType:'school_major',sourceScope:'school',dimension:'employment',value:'2025届毕业生就业情况已发布。',year:2025,source:{sourceName:'测试大学就业报告',sourceUrl:'https://example.edu.cn/report'}});assert.equal(illegalNarrow,null,'school source cannot be narrowed into school-major claim');
const broadClaims=claimsFromOfficialText({school:'测试大学',major:'电气工程及其自动化',dimension:'employment',documentTitle:'测试大学2025届毕业生就业质量报告',text:'测试大学2025届毕业生就业工作坚持分类指导。2025届毕业生主要去向和就业服务安排以本报告为准。',sources:[{sourceName:'测试大学2025届毕业生就业质量报告',sourceUrl:'https://example.edu.cn/report'}]});assert.ok(broadClaims.length);assert.ok(broadClaims.every(item=>item.subjectType==='school'&&item.sourceScope==='school'),'school-wide report remains school scope');assert.ok(broadClaims.every(item=>item.subject==='测试大学'));
const explicitMajorClaims=claimsFromOfficialText({school:'测试大学',major:'电气工程及其自动化',dimension:'employment',documentTitle:'测试大学2025届毕业生就业质量报告',text:'测试大学电气工程及其自动化专业2025届毕业生就业去向由学院按当年口径发布，具体单位以学院报告为准。',sources:[{sourceName:'测试大学2025届毕业生就业质量报告',sourceUrl:'https://example.edu.cn/report'}]});assert.ok(explicitMajorClaims.some(item=>item.subjectType==='school_major'&&item.sourceScope==='school_major'));
const nationalClaims=claimsFromOfficialText({major:'电气工程及其自动化',subject:'电气工程及其自动化',subjectType:'major_national',dimension:'curriculum',documentTitle:'电气工程及其自动化专业知识',text:'电气工程及其自动化专业培养内容包括电路、电机与电力系统等课程，具体学校培养方案存在差异。',sources:[{sourceName:'阳光高考专业知识库',sourceUrl:'https://gaokao.chsi.com.cn/zyk/'}]});assert.ok(nationalClaims.some(item=>item.subjectType==='major_national'&&item.sourceScope==='major_national'));

const urls=OFFICIAL_WEB_EVIDENCE_TESTING.searchUrls('第三方 https://example.com/a 学校 https://xxu.edu.cn/report 政府 https://jyt.ln.gov.cn/a 阳光 https://gaokao.chsi.com.cn/x 学职 https://xz.chsi.com.cn/y 研招 https://yz.chsi.com.cn/z 假学信 https://foo.chsi.com.cn/bad');assert.deepEqual(urls,['https://xxu.edu.cn/report','https://jyt.ln.gov.cn/a','https://gaokao.chsi.com.cn/x','https://xz.chsi.com.cn/y','https://yz.chsi.com.cn/z']);assert.equal(OFFICIAL_WEB_EVIDENCE_TESTING.allowedUrl('https://foo.chsi.com.cn/bad'),'');
const unconfigured=await runOfficialWebEvidence({env:{}},{school:'测试大学',needs:['employment']},async()=>{throw new Error('should not fetch without key');});assert.equal(unconfigured.code,'official_web_search_unconfigured');assert.equal(unconfigured.claims.length,0);
const mockedWeb=await runOfficialWebEvidence({env:{JINA_API_KEY:'test'}},{school:'测试大学',major:'电气工程及其自动化',needs:['employment']},async url=>{const value=String(url);if(value.startsWith('https://s.jina.ai/'))return new Response('搜索摘要说就业很好，但摘要不是事实。\nhttps://xxu.edu.cn/reports/employment-2025.pdf',{status:200});if(value.startsWith('https://r.jina.ai/'))return new Response('Title: 测试大学2025届毕业生就业质量报告\nURL Source: https://xxu.edu.cn/reports/employment-2025.pdf\nMarkdown Content:\n测试大学2025届毕业生就业工作坚持分类指导。2025届毕业生主要去向和就业服务安排以本报告为准。',{status:200});throw new Error(value);});assert.equal(mockedWeb.ok,true);assert.equal(mockedWeb.searchResultIsSource,false);assert.equal(mockedWeb.checkedPageCount,1);assert.ok(mockedWeb.claims.length>0);assert.ok(mockedWeb.claims.every(item=>item.subjectType==='school'),'school web evidence must remain school scope unless page names major');assert.doesNotMatch(mockedWeb.claims[0].value,/搜索摘要说就业很好/);
const mockedMajor=await runMajorKnowledgeEvidence({env:{JINA_API_KEY:'test'}},{major:'电气工程及其自动化',needs:['curriculum']},async url=>{const value=String(url);if(value.startsWith('https://s.jina.ai/'))return new Response('https://gaokao.chsi.com.cn/zyk/major-electric',{status:200});if(value.startsWith('https://r.jina.ai/'))return new Response('Title: 电气工程及其自动化专业知识\nURL Source: https://gaokao.chsi.com.cn/zyk/major-electric\nMarkdown Content:\n电气工程及其自动化专业培养内容包括电路、电机与电力系统等课程，具体学校培养方案存在差异。',{status:200});throw new Error(value);});assert.equal(mockedMajor.ok,true);assert.ok(mockedMajor.claims.length>0);assert.ok(mockedMajor.claims.every(item=>item.subjectType==='major_national'&&item.sourceScope==='major_national'));

const request=new Request('https://example.test/api/ai/turn',{method:'POST'});
const resolverSchools=[{officialName:'沈阳工业大学',province:'辽宁',city:'沈阳'},{officialName:'大连交通大学',province:'辽宁',city:'大连'},...Array.from({length:58},(_,index)=>({officialName:`测试占位大学${index+1}`,province:'辽宁',city:'沈阳'}))];
const emptyBackground={version:'local-strength-static-v3971_2',records:[],schools:[],meta:{dataYear:2026},academicBackgroundMeta:{boundary:'test empty background'}};
const testAssets={fetch:async input=>{const pathname=new URL(input.url).pathname;if(pathname==='/ln-rank/data/local-strength/local-strength-audit.v3971_2.json')return new Response(JSON.stringify({schools:resolverSchools}),{status:200,headers:{'content-type':'application/json'}});if(pathname==='/ln-rank/data/local-strength/local-strength-index.v3971_2.json')return new Response(JSON.stringify(emptyBackground),{status:200,headers:{'content-type':'application/json'}});return new Response('{}',{status:404,headers:{'content-type':'application/json'}});}};
const ctx={request,env:{ASSETS:testAssets}};
const fullPairText='沈阳工业大学电气和大连交通大学自动化怎么选，考虑就业和考研';
const turn=await orchestrateAiTurn(ctx,{input:fullPairText,workspace:base});assert.equal(turn.ok,true);assert.equal(turn.pendingDeterministicTool,true);assert.equal(turn.commitView,false);assert.equal(turn.command.agentTask,'decision_research');assert.deepEqual(turn.command.schoolNames,['沈阳工业大学','大连交通大学']);assert.deepEqual(turn.command.majorKeywords,['电气','自动化']);assert.ok(turn.command.semanticFrame?.signature);assert.equal(buildEvidencePlan(turn.command,base,base.activeView).scoreUsed,false,'remembered score must not silently execute in orchestrator');assert.ok(turn.toolRequests.length>=1&&turn.toolRequests.length<=4);assert.ok(turn.toolRequests.every(item=>item.kind==='school_official'),'no-score composite decision should request current official evidence, not admissions history');
const completedOfficialResults={};for(const item of turn.toolRequests){completedOfficialResults[item.key]={kind:item.kind,key:item.key,url:item.url,status:200,payload:{ok:false,code:'test_no_official_text',school:new URL(item.url,'https://example.test').searchParams.get('school')||'',message:'test evidence unavailable'}};}
const continued=await orchestrateAiTurn(ctx,{input:fullPairText,workspace:base,confirmedCommand:turn.command,deterministicToolResults:completedOfficialResults});assert.equal(continued.ok,true);assert.equal(continued.pendingDeterministicTool,false);assert.equal(continued.command.agentTask,'decision_research');assert.deepEqual(continued.command.schoolNames,['沈阳工业大学','大连交通大学'],'tool continuation must re-resolve canonical schools server-side');assert.deepEqual(continued.command.majorKeywords,['电气','自动化'],'tool continuation must re-resolve canonical majors server-side');assert.equal(continued.commitView,false);assert.equal(continued.result?.decisionResearch?.plan?.scoreUsed,false);
const explicitTurn=await orchestrateAiTurn(ctx,{input:`568分，${fullPairText}`,workspace:base});assert.equal(explicitTurn.ok,true);assert.equal(explicitTurn.pendingDeterministicTool,true);assert.equal(explicitTurn.command.agentTask,'decision_research');assert.equal(buildEvidencePlan(explicitTurn.command,base,base.activeView).scoreUsed,true);assert.equal(explicitTurn.toolRequests.length,2);assert.ok(explicitTurn.toolRequests.every(item=>item.kind==='school_history'),'explicit score pair must first request exact school-major admissions facts');
const persistedFollowWorkspace=compactAiWorkspaceForServer(followWorkspace,{input:'那如果我愿意读研呢'});assert.equal(persistedFollowWorkspace.agentContext?.semanticFrame?.comparisonPairs?.length,2,'server compaction must preserve bounded decision semantic frame');
const followTurn=await orchestrateAiTurn(ctx,{input:'那如果我愿意读研呢',workspace:persistedFollowWorkspace});assert.equal(followTurn.ok,true);assert.equal(followTurn.command.agentTask,'decision_research');assert.equal(followTurn.commitView,false);assert.deepEqual(followTurn.command.semanticFrame.schools,pairFrame.schools);assert.equal(followTurn.command.semanticFrame.counterfactual.active,true);assert.equal(buildEvidencePlan(followTurn.command,persistedFollowWorkspace,persistedFollowWorkspace.activeView).scoreUsed,false);
const refTurn=await orchestrateAiTurn(ctx,{input:'第二个就业呢',workspace:persistedFollowWorkspace});assert.equal(refTurn.ok,true);assert.equal(refTurn.command.agentTask,'decision_research');assert.equal(refTurn.command.semanticFrame.reference.index,1);assert.deepEqual(refTurn.command.semanticFrame.pairs.map(item=>item.school),['大连交通大学']);assert.ok(refTurn.toolRequests.every(item=>item.kind==='school_official'));assert.equal(refTurn.toolRequests.length,1,'reference follow-up must only research the selected school/pair');


const directionPresentationHistory={ok:true,allFailed:false,school:'沈阳工业大学',majorKeyword:'电机电器与装备制造',majorKeywords:['电机电器与装备制造'],records:[],total:0,summary:{total:0,minScore:null,maxScore:null},directionRedirect:{kind:'background_direction',direction:'电机电器与装备制造',admissionMajors:['电气工程及其自动化','自动化'],queryable:false}};
const directionPresentationBlocks=buildBlocks({command:{agentTask:'school_major_history'},view:base.activeView,result:{history:directionPresentationHistory},workspace:base,changeText:'',stage:'history_lookup',focus:{school:'沈阳工业大学',major:'电机电器与装备制造'}});
const directionPresentationText=JSON.stringify(directionPresentationBlocks);
assert.match(directionPresentationText,/不是招生专业名|不是当前招生专业名/,'full presentation must correct the background-direction premise');
assert.match(directionPresentationText,/电气工程及其自动化/,'full presentation must offer a real admissions major');
assert.doesNotMatch(directionPresentationText,/最低0分|最高0分|0分专业/,'full presentation must not repeat fake-zero wording');

console.log(JSON.stringify({ok:true,version:'aiplus-parent-semantics-v0.03',catalogScenarios:AIPLUS_PARENT_QUERY_CATALOG_V003.length,generatedSemanticCases:matrixCount,product:AIPLUS_PRODUCT_VERSION,decisionSemantic:'v0.03',claimScope:'typed'},null,2));
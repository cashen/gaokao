import assert from 'node:assert/strict';
import {createAiWorkspace,applyAiViewPatch,compactAiWorkspaceForServer} from '../shared/ai/ai-workspace-contract.v3992_0.js';
import {deterministicCommand} from '../functions/_lib/ai/command-interpreter.js';
import {orchestrateAiTurn} from '../functions/_lib/ai/turn-orchestrator.js';
import {runSchoolMajorHistory,runMajorRegionHistory,runSchoolComparison,runMajorComparison,runSchoolExperience,listRegisteredAiTools} from '../functions/_lib/ai/tool-registry.js';
import {nextActionsForTurn} from '../functions/_lib/ai/next-action-engine.js';
import {composePrimaryAnswer} from '../functions/_lib/ai/answer-composer.js';
import {runBoundedBatch,deterministicToolBatchConcurrency} from '../aiplus/turn-runtime.v002.js';
import {STANDARD_MAJOR_CATALOG_2026_FULL} from '../functions/_lib/kb/standard-major-catalog-2026-full.generated.js';
import {MAJOR_LANGUAGE_TERMS,normalizeMajorLanguage} from '../functions/_lib/ai/major-language-resolver.js';

const request=new Request('https://example.test/api/ai/turn',{method:'POST'});
const context=results=>({request,env:{},aiDeterministicToolResults:results||{}});
const prompts=['机械','电气','测控','材料','自动化'];
assert.equal(deterministicToolBatchConcurrency([{kind:'major_bands'},{kind:'major_bands'}],3),1,'resource-heavy candidate bands must execute serially');
assert.equal(deterministicToolBatchConcurrency([{kind:'school_history'},{kind:'school_history'}],3),3,'independent school-history queries should retain bounded concurrency');

const majorLanguageTerms=new Set(MAJOR_LANGUAGE_TERMS);
assert.equal(STANDARD_MAJOR_CATALOG_2026_FULL.length,883,'2026 official major catalog cardinality drift');
for(const item of STANDARD_MAJOR_CATALOG_2026_FULL){
  assert.ok(majorLanguageTerms.has(item.name),`official major missing from language resolver: ${item.name}`);
  assert.equal(normalizeMajorLanguage(item.name),item.name,`official major was silently rewritten to another major: ${item.name}`);
}
assert.equal(normalizeMajorLanguage('电气工程及自动化'),'电气工程及其自动化');
assert.equal(normalizeMajorLanguage('电气自动化'),'电气工程及其自动化');
assert.equal(normalizeMajorLanguage('机械电子'),'机械电子工程');
assert.equal(normalizeMajorLanguage('测控'),'测控技术与仪器');
assert.equal(normalizeMajorLanguage('计科'),'计算机科学与技术');

const eightMajorCommand=deterministicCommand('沈航机械电气测控材料自动化计算机电子信息通信多少分',createAiWorkspace(),['沈阳航空航天大学'],['沈航']);
assert.equal(eightMajorCommand.agentTask,'school_major_history');
assert.deepEqual(eightMajorCommand.majorKeywords,['机械','电气','测控技术与仪器','材料','自动化','计算机','电子信息','通信'],'spoken major batch must preserve the shared eight-item limit');

const fiveMajors=await runSchoolMajorHistory(context(),{school:'沈阳航空航天大学',majorKeywords:prompts});
assert.equal(fiveMajors.code,'client_tool_required');
assert.equal(fiveMajors.toolRequests.length,5,'five majors must be planned in one browser bridge round');
assert.equal(new Set(fiveMajors.toolRequests.map(item=>item.key)).size,5);
const schoolAggregateEntries=Object.fromEntries(fiveMajors.toolRequests.slice(0,2).map((tool,index)=>[tool.key,{kind:'school_history',key:tool.key,url:tool.url,status:200,payload:{ok:true,meta:{school:'沈阳航空航天大学'},records:[{id:`school-${index}`,school:'沈阳航空航天大学',major:index?'电气工程及其自动化':'机械工程',score2026:index?620:500,rank2026:index?15000:60000,schoolCode2026:'S001',majorCode2026:`M00${index+1}`}],summary:{total:1,minScore:index?620:500,maxScore:index?620:500},source:{}}}]));
const schoolAggregate=await runSchoolMajorHistory(context(schoolAggregateEntries),{school:'沈阳航空航天大学',majorKeywords:prompts.slice(0,2)});
assert.equal(schoolAggregate.total,2);
assert.equal(schoolAggregate.summary.minScore,500,'school batch min score must aggregate every successful query');
assert.equal(schoolAggregate.summary.maxScore,620,'school batch max score must aggregate every successful query');
const schoolScopePlan=await runSchoolMajorHistory(context(),{school:'测试大学',majorKeywords:['电气']}),schoolScopeTool=schoolScopePlan.toolRequests[0],schoolScopeEntry={[schoolScopeTool.key]:{kind:'school_history',key:schoolScopeTool.key,url:schoolScopeTool.url,status:200,payload:{ok:true,meta:{school:'测试大学'},records:[{id:'regular',school:'测试大学',major:'电气工程及其自动化',score2026:590,rank2026:18000,projectLabel:'普通招生记录'},{id:'sino',school:'测试大学',major:'电气工程及其自动化（中外合作）',score2026:520,rank2026:42000,projectLabel:'中外合作'}],summary:{total:2,minScore:520,maxScore:590},source:{}}}};
const schoolScopeDefault=await runSchoolMajorHistory(context(schoolScopeEntry),{school:'测试大学',majorKeywords:['电气'],bottomLineMode:'all'}),schoolScopeExcluded=await runSchoolMajorHistory(context(schoolScopeEntry),{school:'测试大学',majorKeywords:['电气'],bottomLineMode:'exclude_sino'});
assert.equal(schoolScopeDefault.records.length,2,'school history default must include ordinary and Sino/high-fee projects');
assert.equal(schoolScopeExcluded.records.length,1,'school history scope follow-up must exclude Sino/high-fee projects');
assert.equal(schoolScopeExcluded.summary.minScore,590,'school history summary must be recomputed after project filtering');
assert.match(composePrimaryAnswer({result:{history:schoolScopeDefault},focus:{school:'测试大学'}}).text,/默认包含普通项目与中外合作\/高收费项目/);
assert.match(composePrimaryAnswer({result:{history:schoolScopeExcluded},focus:{school:'测试大学'}}).text,/已排除中外合作\/高收费记录/);

const regionalMajors=['机械','电气','测控技术与仪器'];
const regionalBatch=await runMajorRegionHistory(context(),{majorKeywords:regionalMajors,regionKeys:['ln']});
assert.equal(regionalBatch.code,'client_tool_required');
assert.equal(regionalBatch.toolRequests.length,3,'three region-major queries must be planned in one browser bridge round');
const regionalEntries=Object.fromEntries(regionalBatch.toolRequests.map((tool,index)=>[tool.key,{kind:'major_history',key:tool.key,url:tool.url,status:index===1?503:200,payload:index===1?{ok:false,code:'temporary',message:'暂时不可用'}:{ok:true,major:regionalMajors[index],region:'ln',total:1,complete:true,records:[{id:`region-${index}`,school:`测试大学${index+1}`,major:regionalMajors[index],score2026:600-index*10,rank2026:10000+index*1000}],summary:{total:1,schoolCount:1,minScore:600-index*10,maxScore:600-index*10},source:{}}}]));
const regionalPartial=await runMajorRegionHistory(context(regionalEntries),{majorKeywords:regionalMajors,regionKeys:['ln']});
assert.equal(regionalPartial.partial,true);
assert.deepEqual(regionalPartial.queryResults.map(item=>item.status),['success','failed','success']);
assert.deepEqual(regionalPartial.records.map(item=>item.queryMajor),['机械','测控技术与仪器']);
const regionalPartialAnswer=composePrimaryAnswer({result:{majorHistory:regionalPartial},focus:{major:'机械'},view:{majorKeywords:regionalMajors}});
assert.match(regionalPartialAnswer.text,/部分完成：2项成功、1项失败/,'region-major batch must disclose partial completion');
const overlapMajors=['机械','机械电子工程'],overlapBatch=await runMajorRegionHistory(context(),{majorKeywords:overlapMajors,regionKeys:['ln']}),overlapEntries=Object.fromEntries(overlapBatch.toolRequests.map(tool=>[tool.key,{kind:'major_history',key:tool.key,url:tool.url,status:200,payload:{ok:true,major:new URL(tool.url,'https://example.test').searchParams.get('major'),region:'ln',total:1,complete:true,records:[{id:'same-admission-record',school:'测试大学',major:'机械电子工程',score2026:580,rank2026:24000,schoolCode2026:'S001',majorCode2026:'M001'}],summary:{total:1,schoolCount:1,minScore:580,maxScore:580},source:{}}}])),overlapResult=await runMajorRegionHistory(context(overlapEntries),{majorKeywords:overlapMajors,regionKeys:['ln']});
assert.equal(overlapResult.total,1,'overlapping broad and exact major queries must not duplicate one admission record');
assert.deepEqual(overlapResult.records[0].queryMajors,overlapMajors,'deduplicated record must retain every matching query');
const missingMajorCodeBatch=await runMajorRegionHistory(context(),{majorKeywords:['机械','电气'],regionKeys:['ln']}),missingMajorCodeEntries=Object.fromEntries(missingMajorCodeBatch.toolRequests.map((tool,index)=>[tool.key,{kind:'major_history',key:tool.key,url:tool.url,status:200,payload:{ok:true,major:index?'电气':'机械',region:'ln',total:1,complete:true,records:[{school:'同一所大学',major:index?'电气工程及其自动化':'机械工程',score2026:590-index*10,rank2026:18000+index*2000,schoolCode2026:'SAME',majorCode2026:''}],summary:{total:1,schoolCount:1,minScore:590-index*10,maxScore:590-index*10},source:{}}}])),missingMajorCodeResult=await runMajorRegionHistory(context(missingMajorCodeEntries),{majorKeywords:['机械','电气'],regionKeys:['ln']});
assert.equal(missingMajorCodeResult.total,2,'a school code without a major code must not collapse different majors');

const twoSchools=await runSchoolComparison(context(),{score:580,schoolNames:['沈阳工业大学','沈阳航空航天大学'],regionKeys:['ln']});
assert.equal(twoSchools.code,'client_tool_required');
assert.equal(twoSchools.toolRequests.length,6,'two schools × three bands must be one batch plan');
const twoMajors=await runMajorComparison(context(),{score:580,majorKeywords:['机械','电气'],regionKeys:['ln']});
assert.equal(twoMajors.toolRequests.length,6,'two majors × three bands must be one batch plan');

const majorWorkspace=createAiWorkspace({activeView:{score:null,regionKeys:['ln'],majorKeywords:['机械电子工程'],bottomLineMode:'all'},agentContext:{currentTask:'major_region_history',focus:{major:'机械电子工程'}}});
const excludeCommand=deterministicCommand('去掉中外',majorWorkspace);
assert.equal(excludeCommand.bottomLineMode,'exclude_sino');
const patched=applyAiViewPatch(majorWorkspace.activeView,excludeCommand.changeSet,majorWorkspace.examContext);
assert.equal(patched.bottomLineMode,'exclude_sino','project scope must survive active-view write');
const excludeTurn=await orchestrateAiTurn(context(),{input:'去掉中外',workspace:majorWorkspace,confirmedCommand:excludeCommand});
assert.equal(excludeTurn.pendingDeterministicTool,true);
assert.equal(excludeTurn.resolvedView.bottomLineMode,'exclude_sino');
assert.match(excludeTurn.toolRequests[0].url,/bottomLineMode=exclude_sino/,'next fact query must receive exclude_sino');

const generalInput='学校平台和专业质量怎么平衡';
const generalWorkspace=createAiWorkspace({examContext:{score:620},activeView:{score:620,regionKeys:['all'],majorKeywords:[]}});
const generalCommand=deterministicCommand(generalInput,generalWorkspace);
const generalTurn=await orchestrateAiTurn(context(),{input:generalInput,workspace:generalWorkspace,confirmedCommand:generalCommand});
assert.equal(generalTurn.ok,true);
assert.equal(generalTurn.pendingDeterministicTool,false);
assert.ok(generalTurn.blocks.find(item=>item.type==='assistant_message')?.text.length>20,'general advice must have a primary answer');
assert.equal(generalTurn.result.answerStatus,'answered');
assert.doesNotMatch(generalTurn.blocks[0].text,/这轮切到|建立可行范围/);
const researchPrimary=composePrimaryAnswer({command:{agentTask:'school_research'},result:{officialSchool:{ok:true,detailAvailable:false,answer:'官方卡片没有简介正文'},profileSupplement:{ok:true,answer:'教育部学校目录基本定位'}},focus:{school:'沈阳师范大学'}});
assert.equal(researchPrimary.text,'教育部学校目录基本定位','school research must lead with the usable profile instead of an empty official navigation result');
const richResearchPrimary=composePrimaryAnswer({command:{agentTask:'school_research'},result:{officialSchool:{ok:true,detailAvailable:true,answer:'阳光高考学校简介正文'},profileSupplement:{ok:true,answer:'教育部学校目录基本定位'}},focus:{school:'沈阳师范大学'}});
assert.equal(richResearchPrimary.text,'阳光高考学校简介正文','a verified school introduction must outrank the identity-only directory baseline');

const noScoreComparison=await runSchoolComparison(context(),{score:null,schoolNames:['沈阳工业大学','沈阳航空航天大学']});
assert.equal(noScoreComparison.code,'score_required_for_reachability');
assert.match(noScoreComparison.message,/不带分数时可以先比较/);

const firstExperience=await runSchoolExperience(context(),{school:'辽宁石油化工大学',topic:'living'});
assert.equal(firstExperience.code,'client_tool_required');
const experienceTool=firstExperience.toolRequests?.[0]||firstExperience.toolRequest;
assert.match(experienceTool.url,/topic=living/);
const experiencePayload={ok:true,mode:'recent_reviews',school:'辽宁石油化工大学',reviews:[
  {id:'1',content:'宿舍有暖气，食堂选择比较多。',createdAt:'2026-08-10'},
  {id:'2',content:'老师上课很认真。',createdAt:'2026-08-09'}
],source:{url:'https://srgaoxiao.com/school/example'}};
const living=await runSchoolExperience(context({[experienceTool.key]:{kind:'school_experience',key:experienceTool.key,url:experienceTool.url,status:200,payload:experiencePayload}}),{school:'辽宁石油化工大学',topic:'living'});
assert.equal(living.ok,true);
assert.equal(living.topic,'living');
assert.deepEqual(living.reviews.map(item=>item.id),['1'],'unrelated reviews must not fill a living answer');

const livingActions=nextActionsForTurn({task:'school_experience',school:'辽宁石油化工大学',topic:'living'});
assert.equal(livingActions[0].id,'experience-official-living');
const environmentActions=nextActionsForTurn({task:'school_experience',school:'辽宁科技大学',topic:'environment'});
assert.equal(environmentActions.some(item=>item.id==='experience-official-living'),false,'environment follow-up must not force official living verification');
const regionalActions=nextActionsForTurn({task:'major_region_history',major:'电气工程及其自动化',result:{majorHistory:{records:[{school:'东北大学',major:'电气工程及其自动化'}]}}});
assert.equal(regionalActions.find(item=>item.id==='major-region-school')?.prompt,'介绍下东北大学','a result graph must enter a concrete school instead of emitting a dead generic prompt');
const backgroundActions=nextActionsForTurn({task:'major_background',major:'机械工程',result:{background:{items:[{schools:[{school:'大连交通大学'}]}]}}});
assert.equal(backgroundActions.find(item=>item.id==='major-background-school')?.prompt,'介绍下大连交通大学');
assert.equal([...regionalActions,...backgroundActions].some(item=>/相关学校/.test(item.prompt)),false,'next actions must not contain unresolvable placeholder schools');

const partialWorkspace=createAiWorkspace({
  agentContext:{currentTask:'school_major_history',focus:{school:'沈阳航空航天大学',major:'机械',majors:['机械','电气','测控技术与仪器']}},
  lastResult:{partial:true,history:{school:'沈阳航空航天大学',majorKeywords:['机械','电气','测控技术与仪器'],partial:true,queryResults:[
    {query:'机械',index:0,status:'success',recordCount:1},{query:'电气',index:1,status:'failed',recordCount:0,errorCode:'http_503',errorMessage:'暂时不可用'},{query:'测控技术与仪器',index:2,status:'success',recordCount:1}
  ]}}
});
const compactPartial=compactAiWorkspaceForServer(partialWorkspace);
assert.equal(compactPartial.lastResult.history.queryResults[1].status,'failed','batch status must cross the browser/server workspace boundary');
const partialAnswer=composePrimaryAnswer({result:{history:{ok:true,partial:true,allFailed:false,school:'沈阳航空航天大学',majorKeywords:['机械','电气','测控技术与仪器'],total:2,records:[{},{}],queryResults:partialWorkspace.lastResult.history.queryResults}},focus:{school:'沈阳航空航天大学'}});
assert.equal(partialAnswer.status,'answered');
assert.match(partialAnswer.text,/部分完成：2项成功、1项失败/,'partial primary answer must not imply a complete batch');
const retryCommand=deterministicCommand('只重试刚才失败的查询',compactPartial);
assert.equal(retryCommand.agentTask,'school_major_history');
assert.equal(retryCommand.retryFailedOnly,true);
assert.deepEqual(retryCommand.majorKeywords,['电气'],'retry must plan only failed major queries');
assert.deepEqual(retryCommand.schoolNames,['沈阳航空航天大学']);

const regionalRetryWorkspace=createAiWorkspace({activeView:{regionKeys:['ln'],majorKeywords:regionalMajors,bottomLineMode:'all'},agentContext:{currentTask:'major_region_history',focus:{major:'机械',majors:regionalMajors}},lastResult:{partial:true,majorHistory:regionalPartial}});
const compactRegionalRetry=compactAiWorkspaceForServer(regionalRetryWorkspace);
const regionalRetryCommand=deterministicCommand('只重试刚才失败的查询',compactRegionalRetry);
assert.equal(regionalRetryCommand.agentTask,'major_region_history');
assert.equal(regionalRetryCommand.retryFailedOnly,true);
assert.deepEqual(regionalRetryCommand.majorKeywords,['电气'],'region-major retry must query only the failed major');

let active=0,maxActive=0;
const batch=await runBoundedBatch(Array.from({length:8},(_,i)=>i),async value=>{active++;maxActive=Math.max(maxActive,active);await new Promise(resolve=>setTimeout(resolve,5));active--;return value*2;},{concurrency:3});
assert.equal(maxActive,3);
assert.deepEqual(batch.map(item=>item.value),[0,2,4,6,8,10,12,14]);

for(const required of ['school_official_info','school_experience','major_region_history','selection_review'])assert.ok(listRegisteredAiTools().includes(required),`health capability missing ${required}`);

console.log(JSON.stringify({ok:true,version:'aiplus-v0.02',checks:['883-major-catalog-language-invariant','spoken-major-aliases','eight-major-language-batch','project-scope-roundtrip','school-project-scope-followup','five-major-batch','school-batch-summary','region-major-batch','overlap-deduplication','missing-major-code-deduplication','school-comparison-batch','major-comparison-batch','primary-answer-invariant','school-profile-primary-answer','no-score-comparison-contract','experience-topic-filter','topic-aware-next-actions','batch-state-roundtrip','partial-answer-truthfulness','school-failed-only-retry','region-major-failed-only-retry','bounded-browser-concurrency','capability-manifest'],toolCounts:{fiveMajors:fiveMajors.toolRequests.length,regionalMajors:regionalBatch.toolRequests.length,twoSchools:twoSchools.toolRequests.length,twoMajors:twoMajors.toolRequests.length}},null,2));

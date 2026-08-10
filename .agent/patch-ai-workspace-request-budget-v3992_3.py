from pathlib import Path
import re

contract_path = Path('shared/ai/ai-workspace-contract.v3992_0.js')
app_path = Path('ai/app.v3990_1.js')
verify_path = Path('tools/verify-ai-workspace-v3990_1.mjs')

contract = contract_path.read_text(encoding='utf-8')
marker = 'export function compactAiWorkspaceForServer(workspaceLike)'
if contract.count(marker) != 1:
    raise SystemExit(f'expected one compact workspace marker, got {contract.count(marker)}')
head = contract.split(marker, 1)[0]
new_tail = r'''export const AI_TURN_CLIENT_BODY_BUDGET_BYTES=112*1024;
const AI_SERVER_WORKSPACE_DEFAULT_BUDGET_BYTES=88*1024;
const AI_SERVER_WORKSPACE_MIN_BUDGET_BYTES=4*1024;
function jsonBytes(value){return new TextEncoder().encode(JSON.stringify(value)).byteLength;}
function compactFocusForServer(focus={}){return{school:cleanText(focus?.school,80),major:cleanText(focus?.major,100),schools:uniqueStrings(focus?.schools||[],4),majors:uniqueStrings(focus?.majors||[],6)};}
function compactConstraintForServer(item={}){return{key:cleanText(item?.key,60),values:uniqueStrings(item?.values||[],12),label:cleanText(item?.label,60)};}
function compactTaskForServer(task={}){return{id:cleanText(task?.id,120),parentTaskId:cleanText(task?.parentTaskId,120),kind:cleanText(task?.kind,30),type:cleanText(task?.type,60),status:cleanText(task?.status,30),title:cleanText(task?.title,100)};}
function compactTurnForServer(turn={}){return{userText:cleanText(turn?.userText,300),assistantSummary:cleanText(turn?.assistantSummary,360),changeSummary:cleanText(turn?.changeSummary,240),task:cleanText(turn?.task,80),focus:compactFocusForServer(turn?.focus||{}),stage:cleanText(turn?.stage,50),viewLabel:cleanText(turn?.viewLabel,160),at:turn?.at||''};}
function compactDecisionProfileForServer(profile={}){const explicit=profile?.explicit||{};return{version:cleanText(profile?.version,80),explicit:{primaryGoal:cleanText(explicit.primaryGoal,60),priorities:uniqueStrings(explicit.priorities||[],12),familyResourceSensitivity:cleanText(explicit.familyResourceSensitivity,40),studyDurationTolerance:cleanText(explicit.studyDurationTolerance,40)},inferred:(Array.isArray(profile?.inferred)?profile.inferred:[]).slice(0,8).map(item=>({key:cleanText(item?.key,60),value:cleanText(item?.value,100),confidence:Math.max(0,Math.min(1,Number(item?.confidence||0)))}))};}
function compactConversationMemoryForServer(memory={}){return{version:cleanText(memory?.version,80),confirmed:uniqueStrings(memory?.confirmed||[],16),unresolved:uniqueStrings(memory?.unresolved||[],12),rejected:uniqueStrings(memory?.rejected||[],8),lastUserText:cleanText(memory?.lastUserText,300),lastChangeSummary:cleanText(memory?.lastChangeSummary,300),summary:cleanText(memory?.summary,800)};}
function selectionReviewInput(text=''){return /(方案|选择池|自选|已选|选了些|选了一些|检查.{0,6}(方案|专业)|看看.{0,6}(方案|已选)|还缺什么)/.test(String(text||''));}
function compactSelectionSnapshotForTurn(snapshot=null,includeDetails=false){if(!snapshot||typeof snapshot!=='object')return null;const raw=Array.isArray(snapshot.items)?snapshot.items:[],base={version:cleanText(snapshot.version,80),itemCount:raw.length};if(!includeDetails)return{...base,items:[]};return{...base,items:raw.slice(0,WORKSPACE_LIMITS.selections).map(item=>({school:cleanText(item?.school,48),major:cleanText(item?.major,72),rank2026:normalizedRank(item?.rank2026),bandKey:cleanText(item?.bandKey,16),displayLocation:cleanText(item?.displayLocation,36),tuition:cleanText(item?.tuition,36)}))};}
function clampWorkspaceBudget(value){const numeric=Math.round(Number(value)||AI_SERVER_WORKSPACE_DEFAULT_BUDGET_BYTES);return Math.max(AI_SERVER_WORKSPACE_MIN_BUDGET_BYTES,Math.min(AI_TURN_CLIENT_BODY_BUDGET_BYTES-4*1024,numeric));}
function shrinkWorkspaceToBudget(out,maxBytes){const reducers=[
  ()=>{out.recentTurns=out.recentTurns.slice(-4);},
  ()=>{out.viewHistory=out.viewHistory.slice(0,3);},
  ()=>{out.tasks=out.tasks.slice(0,4);},
  ()=>{out.pendingChecks=out.pendingChecks.slice(0,8);},
  ()=>{if(out.lastResult?.candidates?.records)out.lastResult.candidates.records=out.lastResult.candidates.records.slice(0,8);if(out.lastResult?.history?.records)out.lastResult.history.records=out.lastResult.history.records.slice(0,8);},
  ()=>{out.recentTurns=out.recentTurns.slice(-2);out.viewHistory=out.viewHistory.slice(0,2);out.tasks=out.tasks.slice(0,2);},
  ()=>{out.conversationMemory={...out.conversationMemory,confirmed:(out.conversationMemory?.confirmed||[]).slice(0,8),unresolved:(out.conversationMemory?.unresolved||[]).slice(0,6),rejected:(out.conversationMemory?.rejected||[]).slice(0,4),lastUserText:cleanText(out.conversationMemory?.lastUserText,180),lastChangeSummary:cleanText(out.conversationMemory?.lastChangeSummary,180),summary:cleanText(out.conversationMemory?.summary,480)};},
  ()=>{out.pendingChecks=[];out.recentTurns=out.recentTurns.slice(-1);out.viewHistory=out.viewHistory.slice(0,1);},
  ()=>{out.tasks=[];if(out.lastResult?.candidates?.records)out.lastResult.candidates.records=[];if(out.lastResult?.history?.records)out.lastResult.history.records=[];},
  ()=>{out.hardConstraints=out.hardConstraints.slice(0,16);out.softPreferences=out.softPreferences.slice(0,16);out.decisionProfile={...out.decisionProfile,inferred:[]};},
  ()=>{out.recentTurns=[];out.viewHistory=[];out.pendingChecks=[];out.lastResult=null;out.conversationMemory={version:out.conversationMemory?.version||'',confirmed:(out.conversationMemory?.confirmed||[]).slice(0,6),summary:cleanText(out.conversationMemory?.summary,320)};}
];for(const reduce of reducers){if(jsonBytes(out)<=maxBytes)break;reduce();}return out;}
export function compactAiWorkspaceForServer(workspaceLike,options={}){const workspace=createAiWorkspace(workspaceLike||{}),input=cleanText(options?.input,1200),includeSelectionDetails=options?.includeSelectionDetails===true||selectionReviewInput(input),maxBytes=clampWorkspaceBudget(options?.maxBytes);const out={contractVersion:workspace.contractVersion,id:workspace.id,version:workspace.version,examContext:workspace.examContext,mainTaskId:workspace.mainTaskId,tasks:workspace.tasks.slice(0,6).map(compactTaskForServer),hardConstraints:workspace.hardConstraints.slice(0,24).map(compactConstraintForServer),softPreferences:workspace.softPreferences.slice(0,24).map(compactConstraintForServer),decisionProfile:compactDecisionProfileForServer(workspace.decisionProfile),decisionStage:workspace.decisionStage,conversationMemory:compactConversationMemoryForServer(workspace.conversationMemory),agentContext:{version:cleanText(workspace.agentContext?.version,80),currentTask:cleanText(workspace.agentContext?.currentTask,80),previousTask:cleanText(workspace.agentContext?.previousTask,80),focus:compactFocusForServer(workspace.agentContext?.focus||{}),contextUsage:workspace.agentContext?.contextUsage||{}},activeView:viewSeed(workspace.activeView,workspace.examContext),viewHistory:workspace.viewHistory.slice(0,6).map(view=>({id:view.id,score:view.score,majorKeywords:view.majorKeywords,regionKeys:view.regionKeys,schoolNames:view.schoolNames,bottomLineMode:view.bottomLineMode,target:view.target,combination:view.combination,updatedAt:view.updatedAt})),recentTurns:workspace.turnHistory.slice(-6).map(compactTurnForServer),selectionSnapshot:compactSelectionSnapshotForTurn(workspace.selectionSnapshot,includeSelectionDetails),lastResult:compactLastResultForServer(workspace.lastResult),pendingChecks:workspace.pendingChecks.slice(0,12).map(item=>({key:cleanText(item?.key,100),level:cleanText(item?.level,30),text:cleanText(item?.text,200)}))};return shrinkWorkspaceToBudget(out,maxBytes);}
export function buildAiTurnRequestPayload(workspaceLike,options={}){const input=cleanText(options?.input,1200),confirmedCommand=options?.confirmedCommand&&typeof options.confirmedCommand==='object'?options.confirmedCommand:null,deterministicToolResults=options?.deterministicToolResults&&typeof options.deterministicToolResults==='object'?options.deterministicToolResults:{},envelope={input,confirmedCommand,deterministicToolResults},reserved=jsonBytes(envelope)+2048,workspaceBudget=Math.max(AI_SERVER_WORKSPACE_MIN_BUDGET_BYTES,AI_TURN_CLIENT_BODY_BUDGET_BYTES-reserved);let payload={workspace:compactAiWorkspaceForServer(workspaceLike,{input,maxBytes:workspaceBudget}),...envelope},bytes=jsonBytes(payload);if(bytes>AI_TURN_CLIENT_BODY_BUDGET_BYTES){const tighter=Math.max(AI_SERVER_WORKSPACE_MIN_BUDGET_BYTES,workspaceBudget-(bytes-AI_TURN_CLIENT_BODY_BUDGET_BYTES)-2048);payload={workspace:compactAiWorkspaceForServer(workspaceLike,{input,maxBytes:tighter}),...envelope};bytes=jsonBytes(payload);}if(bytes>AI_TURN_CLIENT_BODY_BUDGET_BYTES)throw new Error('本轮事实桥接超过客户端请求安全预算，请缩小本轮事实范围后继续。');return payload;}
'''
contract_path.write_text(head + new_tail, encoding='utf-8')

app = app_path.read_text(encoding='utf-8')
old_import = "createAiWorkspace,applyAiWorkspaceEvent,compactAiWorkspaceForServer,AI_WORKSPACE_CONTRACT_VERSION,activeViewLabel"
new_import = "createAiWorkspace,applyAiWorkspaceEvent,buildAiTurnRequestPayload,AI_WORKSPACE_CONTRACT_VERSION,activeViewLabel"
if app.count(old_import) != 1:
    raise SystemExit(f'expected one app contract import, got {app.count(old_import)}')
app = app.replace(old_import, new_import, 1)
old_body = "body:JSON.stringify({workspace:compactAiWorkspaceForServer(workspace),input:text,confirmedCommand:continuationCommand,deterministicToolResults})"
new_body = "body:JSON.stringify(buildAiTurnRequestPayload(workspace,{input:text,confirmedCommand:continuationCommand,deterministicToolResults}))"
if app.count(old_body) != 1:
    raise SystemExit(f'expected one AI turn request body, got {app.count(old_body)}')
app = app.replace(old_body, new_body, 1)
app_path.write_text(app, encoding='utf-8')

verify = verify_path.read_text(encoding='utf-8')
old_verify_import = "createAiWorkspace,applyAiWorkspaceEvent,compactAiWorkspaceForServer,buildAiResultDelta,applyAiViewPatch,regionKeyLabel,"
new_verify_import = "createAiWorkspace,applyAiWorkspaceEvent,compactAiWorkspaceForServer,buildAiTurnRequestPayload,AI_TURN_CLIENT_BODY_BUDGET_BYTES,buildAiResultDelta,applyAiViewPatch,regionKeyLabel,"
if verify.count(old_verify_import) != 1:
    raise SystemExit(f'expected one verifier import, got {verify.count(old_verify_import)}')
verify = verify.replace(old_verify_import, new_verify_import, 1)
start = verify.find('function testPrivacyBudget(){')
end = verify.find('\nasync function testParentHumanJourneysV3992_1()', start)
if start < 0 or end < 0:
    raise SystemExit('privacy budget test block not found')
new_test = r'''function testPrivacyBudget(){
  const huge='家庭条件'.repeat(800),selectionItems=Array.from({length:112},(_,i)=>({id:`id-${i}-${huge}`,school:`测试大学${i}${'校'.repeat(30)}`,major:`机械工程与智能制造${i}${'专业'.repeat(28)}`,rank2026:18000+i,bandKey:i%3===0?'upper':i%3===1?'near':'steady',displayLocation:`辽宁省沈阳市${'地点'.repeat(20)}`,tuition:`每年${5000+i}元${'说明'.repeat(18)}`,userNote:huge})),tasks=Array.from({length:24},(_,i)=>({id:`task-${i}`,kind:i?'branch':'main',type:'candidate_refinement',status:'complete',title:`任务${i}${huge}`,command:{agentTask:'candidate_refinement',rawText:huge,question:huge,reason:huge,focus:{school:`测试大学${i}`,major:huge},mentorProfile:{persistable:{primaryGoal:'employment_stability',priorities:['employment','cost']},analysis:huge},changeSet:{major:{op:'set',values:[huge]}}}}));
  const workspace=createAiWorkspace({tasks,mainTaskId:'task-0',agentContext:{currentTask:'candidate_refinement',focus:{school:'沈阳工业大学',major:'自动化'}},turnHistory:Array.from({length:80},(_,i)=>({userText:`第${i}轮 ${huge}`,assistantSummary:huge,changeSummary:huge,task:'general_advice',focus:{school:'测试大学',major:huge}})),selectionSnapshot:{version:'ln-rank-selection-snapshot-v3992_0',items:selectionItems},lastResult:{candidates:{counts:{upper:30,near:40,steady:42,total:112},records:selectionItems},history:{school:'测试大学',majorKeyword:'机械',records:selectionItems},execution:{agentTask:'candidate_refinement',score:580,majorKeywords:['机械'],region:{includeKeys:['ln'],excludeKeys:[]}}},hardConstraints:Array.from({length:40},(_,i)=>({key:`hard-${i}`,values:[huge],label:huge,sourceText:huge})),softPreferences:Array.from({length:40},(_,i)=>({key:`soft-${i}`,values:[huge],label:huge,sourceText:huge}))});
  for(const input of ['580 中外','本科','就业优选']){const payload=buildAiTurnRequestPayload(workspace,{input}),json=JSON.stringify(payload),bytes=Buffer.byteLength(json,'utf8');assert.ok(bytes<=AI_TURN_CLIENT_BODY_BUDGET_BYTES,`${input} request ${bytes} exceeds client budget`);assert.equal(payload.workspace.selectionSnapshot.itemCount,112);assert.equal(payload.workspace.selectionSnapshot.items.length,0);assert.equal(payload.workspace.tasks.some(task=>'command'in task),false);assert.equal(json.includes('userNote'),false);assert.equal(json.includes('mentorProfile'),false);}
  const review=buildAiTurnRequestPayload(workspace,{input:'帮我检查一下当前家庭方案还缺什么'}),reviewBytes=Buffer.byteLength(JSON.stringify(review),'utf8');assert.ok(reviewBytes<=AI_TURN_CLIENT_BODY_BUDGET_BYTES);assert.equal(review.workspace.selectionSnapshot.itemCount,112);assert.equal(review.workspace.selectionSnapshot.items.length,112,'selection review must retain all imported items');
  const deterministicToolResults={'/api/major-bands?score=580':{kind:'major_bands',payload:{blob:'x'.repeat(76*1024)}}},continuation=buildAiTurnRequestPayload(workspace,{input:'本科',confirmedCommand:{agentTask:'candidate_refinement',rawText:'本科',focus:{}},deterministicToolResults}),continuationBytes=Buffer.byteLength(JSON.stringify(continuation),'utf8');assert.ok(continuationBytes<=AI_TURN_CLIENT_BODY_BUDGET_BYTES,`continuation ${continuationBytes} exceeds client budget`);assert.equal(continuation.workspace.selectionSnapshot.items.length,0);
  const compact=compactAiWorkspaceForServer(workspace,{input:'本科',maxBytes:80*1024});assert.ok(Buffer.byteLength(JSON.stringify(compact),'utf8')<=80*1024);assert.ok(compact.recentTurns.length<=6);
}
'''
verify = verify[:start] + new_test + verify[end:]
verify_path.write_text(verify, encoding='utf-8')

print('patched:', contract_path, app_path, verify_path)

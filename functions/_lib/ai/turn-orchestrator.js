import {buildAiResultDelta,AI_WORKSPACE_CONTRACT_VERSION,applyAiViewPatch} from '../../../shared/ai/ai-workspace-contract.v3992_0.js';
import {interpretAiCommand,deterministicResolvedCommand} from './command-interpreter.js';
import {evidenceForIntent} from './evidence-registry.js';
import {
  resolveRegionExecution,runMajorBandSearch,runRankLookup,runSchoolComparison,runMajorComparison,
  runSchoolMajorHistory,runMajorRegionHistory,runRegionSchoolDirectory,runSchoolOfficialInfo,runStudentVoice,runFitAssessment,runSchoolBackground,runMajorBackground,runBackgroundDiscovery,runBackgroundFitDiscovery,
  AI_TOOL_REGISTRY_VERSION
} from './tool-registry.js';
import {runSelectionReview} from './selection-review.js';
import {scopeChanges,changeSummary,decisionStageFor,pendingChecksFor,comparisonText,buildBlocks} from './advisor-presentation.js';
import {agentFocusSeed,taskExecutionPolicy,agentTaskLabel} from './agent-task-kernel.js';
import {runAiProvider} from './provider-router.js';
import {buildOfficialDeterministicSummary} from './school-official-source.js';
import {loadSchoolProfileSupplement} from './school-profile-supplement-source.js';
import {buildIntentContract,intentTopic} from './intent-contract.js';
import {resolveSchoolDirectoryRegion} from './school-directory-resource.js';
import {buildParentSemanticFrame,isParentDecisionLanguage} from './parent-semantic-frame.js';
import {buildEvidencePlan} from './evidence-plan.js';
import {claimToEvidence,claimsFromAcademicBackground} from './claim-evidence.js';
import {runDecisionResearch} from './decision-research-runtime.js';
import {runEducationKnowledge} from './education-knowledge-runtime.js';
import {reflectDecisionTurn} from './decision-reflection.js';
import {normalizeProjectScope,ANSWER_STATUSES,EXPERIENCE_TOPIC_LABELS} from '../../../shared/ai/aiplus-product-contract.v003.js';

export const AI_TURN_ORCHESTRATOR_VERSION='ai-turn-orchestrator-v0.04';
const CANDIDATE_TASKS=new Set(['candidate_discovery','candidate_refinement']);
const VIEW_MUTATING_TASKS=new Set([...CANDIDATE_TASKS,'major_region_history']);
const OLD_CONTRACTS=new Set(['ai-workspace-contract-v3990_2','ai-workspace-contract-v3991_0','ai-workspace-contract-v3992_0',AI_WORKSPACE_CONTRACT_VERSION]);

function clean(value,max=300){return String(value==null?'':value).trim().slice(0,max);}
function unique(values,max=16){return [...new Set((Array.isArray(values)?values:[]).map(v=>clean(v,120)).filter(Boolean))].slice(0,max);}
function validScore(value){const score=Math.round(Number(value));return Number.isFinite(score)&&score>=150&&score<=750?score:null;}
function clone(value){return value==null?value:JSON.parse(JSON.stringify(value));}
function baseView(workspace={}){const source=workspace?.activeView||{};return{target:source.target||'candidates',score:validScore(source.score??workspace?.examContext?.score),majorKeywords:unique(source.majorKeywords||[],8),regionKeys:unique(source.regionKeys||['all'],8).length?unique(source.regionKeys||['all'],8):['all'],schoolNames:unique(source.schoolNames||[],4),bottomLineMode:normalizeProjectScope(source.bottomLineMode),combination:source.combination==='union'?'union':'replace',sourceText:''};}
function fallbackPatch(command={}){return{score:validScore(command.score)?{op:'set',value:validScore(command.score)}:{op:'inherit'},region:command.regionKeys?.length?{op:command.regionKeys.includes('all')?'clear':'set',keys:command.regionKeys}:{op:'inherit',keys:[]},major:command.clearMajor?{op:'clear',values:[]}:command.majorKeywords?.length?{op:command.combination==='union'?'add':'set',values:command.majorKeywords}:{op:'inherit',values:[]},school:command.clearSchool?{op:'clear',values:[]}:command.schoolNames?.length?{op:'set',values:command.schoolNames}:{op:'inherit',values:[]},bottomLine:command.bottomLineMode?{op:'set',value:command.bottomLineMode}:{op:'inherit',value:''}};}
function resolveActiveView(command={},workspace={}){const base=baseView(workspace),patch=command.changeSet&&typeof command.changeSet==='object'?command.changeSet:fallbackPatch(command),ownsView=VIEW_MUTATING_TASKS.has(command.agentTask),transient=command.agentTask==='major_region_history'&&command.transientRegionView===true;if(!ownsView)return{view:clone(base),commitView:false,patch,previousView:base};const next=applyAiViewPatch(base,patch,workspace?.examContext||{});next.sourceText=clean(command.rawText,320);return{view:next,commitView:!transient,patch,previousView:base};}
function viewMatchesCommand(view={},command={}){if(command.majorKeywords?.length&&!command.majorKeywords.every(v=>(view.majorKeywords||[]).includes(v)))return false;if(command.regionKeys?.length&&!command.regionKeys.every(v=>(view.regionKeys||[]).includes(v)))return false;if(validScore(command.score)&&validScore(view.score)!==validScore(command.score))return false;return true;}
function restoreView(command={},workspace={}){const history=Array.isArray(workspace?.viewHistory)?workspace.viewHistory:[];if(!history.length)return null;const text=String(command.rawText||'');if(/(上一批|上一个结果|刚才那批|刚才的结果|前面那批)/.test(text)&&!(command.majorKeywords?.length||command.regionKeys?.length))return clone(history[0]);const matched=history.find(v=>viewMatchesCommand(v,command));return clone(matched||history[0]);}
function selectionReviewRequested(input=''){return /(方案|选择池|自选|已选|选了些|选了一些|检查.{0,6}(方案|专业)|看看.{0,6}(方案|已选)|还缺什么)/.test(String(input||''));}
function evidenceIntent(command,result){return{topic:result?.comparison?'candidate_search':command.agentTask==='evidence_verification'?'verification':(CANDIDATE_TASKS.has(command.agentTask)||command.agentTask==='major_region_history')?'candidate_search':'general_question',question:command.question||command.rawText||'',majorKeywords:command.majorKeywords||[]};}
function resultIdentity({view,command,selectionReview}){return[command.agentTask,view.score||'',command.scoreConstraint?.kind||'',command.scoreConstraint?.min??'',command.scoreConstraint?.max??'',view.majorKeywords.join('/'),view.regionKeys.join(','),(command.regionKeys||[]).join(','),command.schoolLevel||'',view.schoolNames.join('/'),view.bottomLineMode,command.platformTarget||'',command.focus?.school||'',command.focus?.major||'',selectionReview?.snapshotVersion||'',command.semanticFrame?.signature||''].join('|');}
async function validateConfirmedCommand(value,input,workspace,env={},request=null){if(!value||typeof value!=='object')return null;const fallback=await deterministicResolvedCommand(input,workspace,env,request);return{...fallback,semanticFrame:null,rawText:clean(input,1200),question:clean(input,1200),source:`${clean(fallback.source,30)||'deterministic'}-confirmed`};}
function focusForTurn(command={},workspace={}){const prior=workspace?.agentContext?.focus||{},seed=command.focus||{},task=command.agentTask;if(task==='knowledge_explain'){const school=(command.schoolNames||[])[0]||'',major=(command.majorKeywords||[])[0]||'';return agentFocusSeed({school,major,schools:command.schoolNames||[],majors:command.majorKeywords||[],sourceText:command.rawText},{});}if(task==='student_voice'){const school=(command.schoolNames||[])[0]||'',major=(command.majorKeywords||[])[0]||'';return agentFocusSeed({school,major,schools:command.schoolNames||[],majors:command.majorKeywords||[],sourceText:command.rawText},{});}const school=seed.school||((['school_major_history','school_history','school_research','school_official_qa','school_experience','fit_assessment','school_background'].includes(task))?prior.school:'');const major=seed.major||((['school_major_history','major_region_history','fit_assessment','major_background'].includes(task))?prior.major:'');const schools=seed.schools?.length?seed.schools:((task==='school_comparison'||task==='decision_research')?prior.schools:[]);const majors=seed.majors?.length?seed.majors:((task==='major_comparison'||task==='decision_research')?prior.majors:[]);return agentFocusSeed({school,major,schools,majors,sourceText:command.rawText},workspace);}
function effectiveScore(command,workspace,view){const explicit=validScore(command.score),remembered=validScore(workspace?.examContext?.score)||validScore(view?.score);if(command.scoreUsage==='suspended'||command.scoreUsage==='cleared')return null;if(command.scoreUsage==='active')return explicit||remembered;return explicit||remembered;}
function agentContextForTurn(command,workspace,focus){return{version:'ai-agent-context-v3992_0',currentTask:command.agentTask,previousTask:workspace?.agentContext?.currentTask||'',focus,semanticFrame:command.semanticFrame||null,contextUsage:{...taskExecutionPolicy(command.agentTask,command.scoreUsage)},updatedAt:new Date().toISOString()};}
function pendingDeterministicTool(result={}){const requests=[],seen=new Set();for(const value of [result.candidates,result.history,result.majorHistory,result.fit,result.officialSchool,result.experience,result.background,result.comparison,result.decisionResearch]){if(value?.code==='client_tool_invalid')return value;if(value?.code!=='client_tool_required')continue;for(const request of value.toolRequests||[value.toolRequest]){if(!request?.key||seen.has(request.key))continue;seen.add(request.key);requests.push(request);}}return requests.length?{code:'client_tool_required',toolRequest:requests[0],toolRequests:requests,requestCount:requests.length}:null;}
function providerSummary(interpreted={},command={}){return{provider:interpreted.provider?.provider||'',model:interpreted.provider?.model||'',source:command.source,latencyMs:interpreted.provider?.latencyMs||0,failures:interpreted.provider?.failures||[]};}
function officialFallbackAnswer(official={}){const deterministic=clean(official.deterministicSummary,2200)||clean(buildOfficialDeterministicSummary({school:official.school,topic:official.topic,topicLabel:official.topicLabel,coverage:official.coverage,facts:official.facts||{},evidenceText:official.evidenceText||''}),2200);if(deterministic)return deterministic;const school=clean(official.school,120),topic=clean(official.topicLabel,80)||'学校官方信息',updated=clean(official.updatedAt,80);return `已定位到阳光高考的${school}${topic}官方页面${updated?`（资料更新时间：${updated}）`:''}，但没有取得可安全引用的正文段落。为保证准确，本轮不补写页面未返回的学校事实。`;}
async function summarizeOfficialSchool(context,official={},question=''){if(!official?.ok)return official;const fallback=officialFallbackAnswer(official),evidence=clean(official.evidenceText,9000);let provider={ok:false,provider:'',model:'',latencyMs:0,failures:[]};if(official.detailAvailable&&evidence){provider=await runAiProvider(context?.env||{},[{role:'system',content:'你是高考学校官方资料归纳器。只能依据用户提供的阳光高考原文回答，不能使用常识补充，不能制造学校排名、就业率、薪资、录取概率、学费或招生事实。原文没有的信息必须明确说“本次官方材料未提供”。回答面向家长，先直接回答问题，再说明边界；不要长段复制原文。'},{role:'user',content:JSON.stringify({school:official.school,question:clean(question,600),topic:official.topicLabel,updatedAt:official.updatedAt,evidence})}],{maxTokens:700,reasoningEffort:'low'});}
  const answer=provider?.ok?clean(provider.text,2200):fallback;const sources=(official.sources||[]).map(item=>({...item}));return{...official,evidenceText:undefined,answer,answerMode:provider?.ok?'official-evidence-ai-summary':'official-source-navigation-fallback',answerProvider:{provider:provider?.provider||'',model:provider?.model||'',latencyMs:Number(provider?.latencyMs||0),fallbackUsed:Boolean(provider?.fallbackUsed)},sources};}
function pendingComparisonPlan(command={}){if(command.agentTask==='major_comparison')return{kind:'major',pendingEvidenceDimensions:['课程体系','培养方案','就业路径的学校级证据'],status:'awaiting_deterministic_candidate_facts'};if(command.agentTask==='school_comparison')return{kind:'school',pendingEvidenceDimensions:['培养方案','就业口径','推免政策','校区与具体学费'],status:'awaiting_deterministic_candidate_facts'};if(command.agentTask==='decision_research')return{kind:'decision',pendingEvidenceDimensions:command.semanticFrame?.evidenceNeeds||[],status:'awaiting_bounded_evidence'};return null;}
async function isolatedResult(code,run){try{return await run();}catch(error){return{ok:false,code:`${code}_failed`,message:clean(error?.message||error,260)};}}

export async function orchestrateAiTurn(context,payload={}){
  const input=clean(payload.input,1200),workspace=payload.workspace&&typeof payload.workspace==='object'?payload.workspace:{};
  if(!input&&!payload.confirmedCommand)return{ok:false,status:400,message:'直接说你现在想解决的问题即可。'};
  if(workspace?.contractVersion&&!OLD_CONTRACTS.has(workspace.contractVersion))return{ok:false,status:409,message:'AI工作区版本无法安全迁移，请刷新页面后继续；专业初选和家庭方案不会受影响。'};
  const executionContext={...context,aiDeterministicToolResults:payload.deterministicToolResults&&typeof payload.deterministicToolResults==='object'?payload.deterministicToolResults:{}};
  let interpreted;const deterministicContinuation=Object.keys(executionContext.aiDeterministicToolResults).length>0,confirmed=await validateConfirmedCommand(payload.confirmedCommand,input||payload.confirmedCommand?.rawText||'',workspace,context.env||{},context.request||null);
  if(confirmed)interpreted={command:confirmed,provider:{ok:false,provider:'',model:'',confirmed:true}};else interpreted=await interpretAiCommand(input,workspace,context.env||{},context.request||null);
  const command=interpreted.command;
  if(confirmed&&deterministicContinuation&&command.agentTask==='major_region_history'&&command.transientRegionView===true){
    const canonicalRegion=await resolveSchoolDirectoryRegion(executionContext,input,workspace);
    if(!canonicalRegion?.key||!String(canonicalRegion.key).startsWith('city:'))return{ok:false,status:409,message:'本轮城市范围无法从统一高校地域目录重新确认；为避免把城市查询放大成全国查询，本轮未执行。',orchestratorVersion:AI_TURN_ORCHESTRATOR_VERSION};
    command.regionKeys=[canonicalRegion.key];command.regionLabel=canonicalRegion.label;command.regionContext={...canonicalRegion,inherited:false};command.transientRegionView=true;
  }
  const decisionSchools=unique(command.schoolNames?.length?command.schoolNames:(command.focus?.schools||[]),4),decisionMajors=unique(command.majorKeywords?.length?command.majorKeywords:(command.focus?.majors||[]),8),priorTask=workspace?.agentContext?.currentTask||'',decisionLanguage=command.agentTask==='knowledge_explain'?false:(command.agentTask==='decision_research'||isParentDecisionLanguage(input,{schoolCount:decisionSchools.length,majorCount:decisionMajors.length,priorTask}));
  if(decisionLanguage){command.agentTask='decision_research';command.taskLocked=true;if(validScore(command.score))command.scoreUsage='active';command.executionPolicy=taskExecutionPolicy(command.agentTask,command.scoreUsage);command.semanticFrame=buildParentSemanticFrame(input,{schools:decisionSchools,majors:decisionMajors,regionKeys:command.regionKeys||[],score:validScore(command.score)||validScore(workspace?.examContext?.score),mentorProfile:command.mentorProfile||{},workspace});}
  else command.semanticFrame=null;
  const explicitCompare=/(怎么选|哪个好|哪个更|比较|对比|差别|区别|优劣|取舍|横着看|谁更)/.test(input);
  if(!['decision_research','knowledge_explain'].includes(command.agentTask)&&explicitCompare&&command.schoolNames?.length>=2){command.agentTask='school_comparison';command.taskLocked=true;command.executionPolicy=taskExecutionPolicy(command.agentTask,command.scoreUsage);}
  else if(!['decision_research','knowledge_explain'].includes(command.agentTask)&&explicitCompare&&command.majorKeywords?.length>=2){command.agentTask='major_comparison';command.taskLocked=true;command.executionPolicy=taskExecutionPolicy(command.agentTask,command.scoreUsage);}
  command.intent=buildIntentContract(command,workspace);
  if(command.requiresConfirmation&&!confirmed)return{ok:true,pendingConfirmation:true,command,provider:{provider:interpreted.provider?.provider||'',model:interpreted.provider?.model||'',source:command.source,failures:interpreted.provider?.failures||[]},blocks:[{type:'clarification',title:'这句话我不想替你猜',text:command.reason||'请再明确一点。'}],orchestratorVersion:AI_TURN_ORCHESTRATOR_VERSION};

  let resolved=resolveActiveView(command,workspace);
  if(command.agentTask==='restore_view'){const restored=restoreView(command,workspace);if(!restored)return{ok:true,pendingConfirmation:true,command:{...command,requiresConfirmation:true},blocks:[{type:'clarification',title:'还没有可恢复的上一批结果',text:'先执行一次候选探索，再说“回到上一批”。'}],orchestratorVersion:AI_TURN_ORCHESTRATOR_VERSION};resolved={view:{...baseView(workspace),...restored},commitView:true,patch:command.changeSet,previousView:baseView(workspace)};}
  const view=resolved.view,focus=focusForTurn(command,workspace),agentContext=agentContextForTurn(command,workspace,focus),score=effectiveScore(command,workspace,view),changes=scopeChanges(resolved.previousView,view),regionExecution=resolveRegionExecution(view,workspace);
  let changeText='';
  if(CANDIDATE_TASKS.has(command.agentTask))changeText=changeSummary(resolved.previousView,view,command);
  else if(command.agentTask==='region_school_directory')changeText=`这轮只回答${command.regionLabel||command.regionContext?.label||'当前地区'}的高校目录${command.schoolLevel&&command.schoolLevel!=='all'?`（${command.schoolLevel}）`:''}；不会修改你正在使用的候选筛选。`;
  else if(command.agentTask==='major_region_history'&&command.transientRegionView)changeText=`这轮只把${command.regionLabel||command.regionContext?.label||'当前城市'}作为临时专业历史查询范围，不写入候选筛选；直接查${(focus.majors?.length?focus.majors:view.majorKeywords).join(' / ')||focus.major}的2026辽宁物理类实际投档记录。`;
  else if(command.agentTask==='major_region_history')changeText=`${changeSummary(resolved.previousView,view,command)} 同时直接查${(focus.majors?.length?focus.majors:view.majorKeywords).join(' / ')||focus.major}在当前地区的2026物理类实际投档分数；这轮不需要先给个人分数。`;
  else if(command.agentTask==='fact_rank_lookup')changeText=`这次只回答${validScore(command.score)||score}分对应的参考位次，不改变你正在看的候选条件。`;
  else if(command.agentTask==='knowledge_explain')changeText='这轮把问题当作教育/招生知识来解释；上一轮记住的学校、分数和候选筛选不会自动变成本轮事实对象，只有你在当前问题里明确重新提到时才参与核验。';
  else if(command.agentTask==='school_major_history')changeText=`这轮切到“学校 × 专业历史查询”：${focus.school} · ${(focus.majors?.length?focus.majors:[focus.major]).filter(Boolean).join('、')}。${score?'我仍记得你的分数，但这轮不拿它过滤历史记录。':''}`;
  else if(command.agentTask==='school_history')changeText=`这轮只看${focus.school}在辽宁物理类的实际招生专业记录${score?'；你的分数仍记着，但不参与筛选':''}。`;
  else if(command.agentTask==='school_research')changeText=`我先直接回答${focus.school}是什么学校，再补有证据的专业背景和2026辽宁投档事实；这轮不会修改你的候选筛选。`;
  else if(command.agentTask==='school_official_qa')changeText=`这轮只查${focus.school}的阳光高考官方资料${score?'；你的分数仍记着，但不参与学校介绍和章程归纳':''}。`;
  else if(command.agentTask==='student_voice'){const voiceSchool=(command.schoolNames||[])[0]||'',voiceMajor=(command.majorKeywords||[])[0]||focus.major||'',scope=voiceSchool&&voiceMajor?'school_major':'major';changeText=scope==='school_major'?`这轮只核验${voiceSchool} · ${voiceMajor}是否存在明确绑定到学校和专业的大学生声音；来源没有双重身份字段时会直接说明不支持，不会退回全校或跨学校专业评论。`:`这轮只看“${voiceMajor||'这个专业'}”的跨学校大学生声音；上一轮记住的学校不会自动变成本轮范围，它也不是专业强弱、就业率或录取依据。`;}
  else if(command.agentTask==='school_experience'){const topic=intentTopic(command),label=EXPERIENCE_TOPIC_LABELS[topic]||'学校与同学体验';changeText=`这轮从“同学”已有学校体验内容里只看${focus.school}与“${label}”直接相关的内容；它是同学体验，不会冒充学校官方结论，也不会拿无关留言代替回答。`;}
  else if(command.agentTask==='fit_assessment')changeText=`现在把你记住的${score||'当前'}分重新激活，只判断${focus.school}${focus.major?` · ${focus.major}`:''}和你当前位置的历史关系。`;
  else if(command.agentTask==='decision_research')changeText='这轮把家长的一句话拆成“要比较什么、哪些是硬条件/偏好、需要哪些证据”三个层次；只做有界研究，不修改当前候选筛选。';
  else if(command.agentTask==='background_discovery')changeText='这轮不是按分数筛学校，而是先从辽宁高校背景证据里找值得继续研究的专业方向。';
  else if(command.agentTask==='background_fit_discovery')changeText=`这轮把辽宁专业背景证据和你当前${score||''}分的可达窗口做交集预览，不把它包装成“最佳专业排名”。`;
  else changeText=`这轮切到“${agentTaskLabel(command.agentTask)}”；之前记住的家庭背景仍保留，但只让与当前任务有关的信息参与执行。`;

  const result={identity:'',partial:false,answerStatus:'needs_fact',rank:null,candidates:null,history:null,majorHistory:null,regionSchools:null,fit:null,background:null,officialSchool:null,profileSupplement:null,experience:null,knowledge:null,comparison:null,decisionResearch:null,selectionReview:selectionReviewRequested(input)?runSelectionReview(workspace?.selectionSnapshot||null,workspace):null,evidence:[],pendingChecks:[],decisionStage:'start',changeSummary:changeText,execution:{agentTask:command.agentTask,intent:command.intent,scoreUsage:command.scoreUsage,score:score||null,focus,majorKeywords:view.majorKeywords,bottomLineMode:view.bottomLineMode,platformTarget:command.platformTarget||'',region:regionExecution,toolRegistryVersion:AI_TOOL_REGISTRY_VERSION,plan:command.agentTask==='school_research'?{mode:'multi_tool_research',stateMutation:false,steps:['official_profile','moe_directory_baseline','school_background','admission_history']}:command.agentTask==='decision_research'?{mode:'bounded_decision_research',stateMutation:false,...buildEvidencePlan(command,workspace,view)}:{mode:'single_task',stateMutation:resolved.commitView===true,steps:[command.agentTask]}}};
  try{
    switch(command.agentTask){
      case'candidate_discovery':
      case'candidate_refinement':
      case'restore_view':
        if(view.score&&regionExecution.exact){result.rank=runRankLookup(view.score);result.candidates=await runMajorBandSearch(executionContext,{score:view.score,majorKeywords:view.majorKeywords,regionKeys:regionExecution.includeKeys,bottomLineMode:view.bottomLineMode,schoolKeyword:view.schoolNames?.length===1?view.schoolNames[0]:'',platformTarget:command.platformTarget||''});result.partial=!result.candidates.ok;}else result.partial=true;
        break;
      case'fact_rank_lookup':
        result.rank=runRankLookup(validScore(command.score)||score);result.partial=!result.rank.ok;break;
      case'knowledge_explain':
        result.knowledge=await runEducationKnowledge(executionContext,{question:command.question||command.rawText||input,schoolNames:command.schoolNames||[],majorKeywords:command.majorKeywords||[],previousQuestion:workspace?.agentContext?.focus?.sourceText||''});result.partial=result.knowledge?.answerStatus==='needs_fact';break;
      case'major_region_history':
        result.majorHistory=await runMajorRegionHistory(executionContext,{majorKeyword:focus.major||(view.majorKeywords||[])[0]||'',majorKeywords:focus.majors?.length?focus.majors:(view.majorKeywords||[]),regionKeys:command.transientRegionView&&command.regionKeys?.length?command.regionKeys:(regionExecution.exact?regionExecution.includeKeys:(view.regionKeys||['all'])),scoreConstraint:command.scoreConstraint||{kind:'none',min:null,max:null},bottomLineMode:view.bottomLineMode||'all'});result.partial=!result.majorHistory.ok||result.majorHistory.partial===true||result.majorHistory.allFailed===true;break;
      case'region_school_directory':
        result.regionSchools=await runRegionSchoolDirectory(executionContext,{region:command.regionContext||{key:(command.regionKeys||[])[0]||'',label:command.regionLabel||''},level:command.schoolLevel||'all'});result.partial=!result.regionSchools?.ok;break;
      case'school_major_history':
        result.history=await runSchoolMajorHistory(executionContext,{school:focus.school,majorKeywords:focus.majors?.length?focus.majors:[focus.major||''],bottomLineMode:command.bottomLineMode||view.bottomLineMode});result.partial=!result.history.ok||result.history.partial===true||result.history.allFailed===true;break;
      case'school_history':
        result.history=await runSchoolMajorHistory(executionContext,{school:focus.school,majorKeyword:'',bottomLineMode:command.bottomLineMode||view.bottomLineMode});result.partial=!result.history.ok||result.history.partial===true||result.history.allFailed===true;break;
      case'school_research':
        result.officialSchool=await isolatedResult('official_profile',()=>runSchoolOfficialInfo(executionContext,{school:focus.school,question:command.question||command.rawText||''}));
        if(result.officialSchool?.ok)result.officialSchool=await isolatedResult('official_summary',()=>summarizeOfficialSchool(context,result.officialSchool,command.question||command.rawText||''));
        if(!result.officialSchool?.ok||!result.officialSchool.detailAvailable)result.profileSupplement=await isolatedResult('directory_profile',()=>loadSchoolProfileSupplement({school:focus.school}));
        result.history=await isolatedResult('admission_history',()=>runSchoolMajorHistory(executionContext,{school:focus.school,majorKeyword:''}));
        result.background=await isolatedResult('school_background',()=>runSchoolBackground(executionContext,{school:focus.school}));
        result.partial=![result.officialSchool,result.profileSupplement].some(item=>item?.ok)||[result.history,result.background].some(item=>String(item?.code||'').endsWith('_failed'));break;
      case'school_official_qa':
        result.officialSchool=await runSchoolOfficialInfo(executionContext,{school:focus.school,question:command.question||command.rawText||''});if(result.officialSchool?.ok)result.officialSchool=await summarizeOfficialSchool(context,result.officialSchool,command.question||command.rawText||'');result.partial=!result.officialSchool?.ok;break;
      case'school_experience':
        result.experience=await runStudentVoice(executionContext,{scope:'school',school:focus.school,topic:intentTopic(command),question:command.question||command.rawText||input});result.partial=!result.experience?.ok;break;
      case'student_voice':{
        const voiceSchool=(command.schoolNames||[])[0]||'',voiceMajor=(command.majorKeywords||[])[0]||focus.major||'',voiceScope=voiceSchool&&voiceMajor?'school_major':'major';
        result.experience=await runStudentVoice(executionContext,{scope:voiceScope,school:voiceScope==='school_major'?voiceSchool:'',major:voiceMajor,question:command.question||command.rawText||input});result.partial=!result.experience?.ok;break;}
      case'fit_assessment':
        result.fit=await runFitAssessment(executionContext,{school:focus.school,majorKeyword:focus.major,score});result.partial=!result.fit.ok;break;
      case'decision_research':
        result.decisionResearch=await runDecisionResearch(executionContext,context,command,workspace,view,score);if(result.decisionResearch?.comparison)result.comparison=result.decisionResearch.comparison;result.partial=!result.decisionResearch?.ok||result.decisionResearch?.partial===true;break;
      case'background_discovery':
        result.background=await runBackgroundDiscovery(executionContext,{limit:12,regionKeys:command.regionKeys?.length?command.regionKeys:(view.regionKeys||['ln']),scope:command.backgroundScope||'auto'});result.partial=!result.background.ok;break;
      case'background_fit_discovery':
        result.background=await runBackgroundFitDiscovery(executionContext,{score,bottomLineMode:view.bottomLineMode,regionKeys:command.regionKeys?.length?command.regionKeys:(view.regionKeys||['ln']),scope:command.backgroundScope||'auto'});result.partial=!result.background.ok;break;
      case'school_background':
        result.background=await runSchoolBackground(executionContext,{school:focus.school,major:focus.major||'',scope:command.backgroundScope||'auto'});result.partial=!result.background.ok;break;
      case'major_background':
        result.background=await runMajorBackground(executionContext,{major:focus.major,scope:command.backgroundScope||'auto'});result.partial=!result.background.ok;break;
      case'school_comparison':{
        const schools=unique(command.schoolNames?.length?command.schoolNames:focus.schools,3);result.comparison=await runSchoolComparison(executionContext,{score:score||view.score,schoolNames:schools,majorKeywords:view.majorKeywords,regionKeys:view.regionKeys,bottomLineMode:view.bottomLineMode});result.partial=!result.comparison?.ok;break;}
      case'major_comparison':{
        const majors=unique(command.majorKeywords?.length?command.majorKeywords:focus.majors,3);result.comparison=await runMajorComparison(executionContext,{score:score||view.score,majorKeywords:majors,regionKeys:view.regionKeys,bottomLineMode:view.bottomLineMode});result.partial=!result.comparison?.ok;break;}
      case'plan_review':
        if(!result.selectionReview)result.selectionReview=runSelectionReview(workspace?.selectionSnapshot||null,workspace);break;
      default:break;
    }
  }catch(error){result.partial=true;result.toolError={message:clean(error?.message||error,320)};}

  const pendingTool=pendingDeterministicTool(result);
  if(pendingTool?.code==='client_tool_invalid')return{ok:false,status:400,message:pendingTool.message||'确定性候选事实回传无法验证。',orchestratorVersion:AI_TURN_ORCHESTRATOR_VERSION};
  if(pendingTool?.code==='client_tool_required')return{ok:true,pendingConfirmation:false,pendingDeterministicTool:true,command,resolvedView:view,commitView:resolved.commitView,toolRequest:pendingTool.toolRequest,toolRequests:pendingTool.toolRequests,toolRequestCount:pendingTool.requestCount,comparisonPlan:pendingComparisonPlan(command),agentContext,provider:providerSummary(interpreted,command),orchestratorVersion:AI_TURN_ORCHESTRATOR_VERSION};

  if(result.background?.ok)result.background.claims=claimsFromAcademicBackground(result.background);
  result.decisionStage=decisionStageFor({command,view,result,changes});
  result.evidence=evidenceForIntent(evidenceIntent(command,result));
  if(result.background?.claims?.length)for(const claim of result.background.claims)result.evidence.push(claimToEvidence(claim));
  if(result.decisionResearch?.claims?.length)for(const claim of result.decisionResearch.claims)result.evidence.push(claimToEvidence(claim));
  if(result.knowledge?.evidence?.length)for(const evidence of result.knowledge.evidence)result.evidence.push(evidence);
  if(result.officialSchool?.sources?.length)for(const source of result.officialSchool.sources)result.evidence.push({level:'A',sourceName:source.sourceName||'阳光高考',sourceUrl:source.sourceUrl||'',scope:source.scope||result.officialSchool.topicLabel||'学校官方信息',updatedAt:source.updatedAt||result.officialSchool.updatedAt||''});
  result.identity=resultIdentity({view,command,selectionReview:result.selectionReview});
  result.pendingChecks=pendingChecksFor(result,regionExecution);
  result.decisionReflection=reflectDecisionTurn({workspace:{...workspace,activeView:view},command,result});
  const delta=result.candidates?buildAiResultDelta(workspace?.lastResult||null,result,{previousView:resolved.previousView,nextView:view}):{changed:Boolean(changes.length),countChanges:{},scopeChanges:{},addedPreviewIds:[],removedPreviewIds:[],unchangedPreviewCount:0};
  const blocks=buildBlocks({command,view,result,delta,workspace,regionExecution,changeText,stage:result.decisionStage,focus,agentContext});
  const primaryBlock=blocks.find(block=>block?.type==='assistant_message'),validStatuses=new Set(ANSWER_STATUSES);if(!primaryBlock?.text||!validStatuses.has(primaryBlock.answerStatus)||!validStatuses.has(result.answerStatus))return{ok:false,status:500,message:'AIPLuS 主答案合同没有收敛，本轮未提交。',orchestratorVersion:AI_TURN_ORCHESTRATOR_VERSION};
  const assistantSummary=clean(primaryBlock.text,1200);
  const taskAction=resolved.commitView===true?(workspace?.mainTaskId?'update_main':'create_main'):(command.agentTask==='save_family'?'none':(workspace?.mainTaskId?'branch':'create_main'));
  return{ok:true,pendingConfirmation:false,pendingDeterministicTool:false,command,taskAction,resolvedView:view,commitView:resolved.commitView,result,delta,blocks,agentContext,event:{type:'command_committed',payload:{command,taskAction,resolvedView:view,commitView:resolved.commitView,decisionStage:result.decisionStage,agentContext}},provider:providerSummary(interpreted,command),turnRecord:{userText:input,assistantSummary,changeSummary:changeText,blocks,command,stage:result.decisionStage,task:command.agentTask,focus},orchestratorVersion:AI_TURN_ORCHESTRATOR_VERSION};
}

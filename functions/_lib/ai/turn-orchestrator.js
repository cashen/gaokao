
import {buildAiResultDelta,AI_WORKSPACE_CONTRACT_VERSION,applyAiViewPatch} from '../../../shared/ai/ai-workspace-contract.v3992_0.js';
import {interpretAiCommand,deterministicCommand} from './command-interpreter.js';
import {evidenceForIntent} from './evidence-registry.js';
import {
  resolveRegionExecution,runMajorBandSearch,runRankLookup,runSchoolComparison,runMajorComparison,
  runSchoolMajorHistory,runFitAssessment,runSchoolBackground,runMajorBackground,runBackgroundDiscovery,runBackgroundFitDiscovery,
  AI_TOOL_REGISTRY_VERSION
} from './tool-registry.js';
import {runSelectionReview} from './selection-review.js';
import {scopeChanges,changeSummary,decisionStageFor,pendingChecksFor,comparisonText,buildBlocks} from './advisor-presentation.js';
import {agentFocusSeed,taskExecutionPolicy,agentTaskLabel} from './agent-task-kernel.js';

export const AI_TURN_ORCHESTRATOR_VERSION='ai-turn-orchestrator-v3992_0';
const CANDIDATE_TASKS=new Set(['candidate_discovery','candidate_refinement']);
const OLD_CONTRACTS=new Set(['ai-workspace-contract-v3990_1','ai-workspace-contract-v3991_0',AI_WORKSPACE_CONTRACT_VERSION]);

function clean(value,max=300){return String(value==null?'':value).trim().slice(0,max);}
function unique(values,max=16){return [...new Set((Array.isArray(values)?values:[]).map(v=>clean(v,120)).filter(Boolean))].slice(0,max);}
function validScore(value){const score=Math.round(Number(value));return Number.isFinite(score)&&score>=150&&score<=750?score:null;}
function clone(value){return value==null?value:JSON.parse(JSON.stringify(value));}
function baseView(workspace={}){const source=workspace?.activeView||{};return{target:source.target||'candidates',score:validScore(source.score??workspace?.examContext?.score),majorKeywords:unique(source.majorKeywords||[],8),regionKeys:unique(source.regionKeys||['all'],8).length?unique(source.regionKeys||['all'],8):['all'],schoolNames:unique(source.schoolNames||[],4),bottomLineMode:['all','public_first','public_regular_only','public_include_sino'].includes(source.bottomLineMode)?source.bottomLineMode:'all',combination:source.combination==='union'?'union':'replace',sourceText:''};}
function fallbackPatch(command={}){return{score:validScore(command.score)?{op:'set',value:validScore(command.score)}:{op:'inherit'},region:command.regionKeys?.length?{op:command.regionKeys.includes('all')?'clear':'set',keys:command.regionKeys}:{op:'inherit',keys:[]},major:command.clearMajor?{op:'clear',values:[]}:command.majorKeywords?.length?{op:command.combination==='union'?'add':'set',values:command.majorKeywords}:{op:'inherit',values:[]},school:command.clearSchool?{op:'clear',values:[]}:command.schoolNames?.length?{op:'set',values:command.schoolNames}:{op:'inherit',values:[]},bottomLine:command.bottomLineMode?{op:'set',value:command.bottomLineMode}:{op:'inherit',value:''}};}
function resolveActiveView(command={},workspace={}){
  const base=baseView(workspace),patch=command.changeSet&&typeof command.changeSet==='object'?command.changeSet:fallbackPatch(command),mutates=CANDIDATE_TASKS.has(command.agentTask);
  if(!mutates)return{view:clone(base),commitView:false,patch,previousView:base};
  const next=applyAiViewPatch(base,patch,workspace?.examContext||{});next.sourceText=clean(command.rawText,320);return{view:next,commitView:true,patch,previousView:base};
}
function viewMatchesCommand(view={},command={}){if(command.majorKeywords?.length&&!command.majorKeywords.every(v=>(view.majorKeywords||[]).includes(v)))return false;if(command.regionKeys?.length&&!command.regionKeys.every(v=>(view.regionKeys||[]).includes(v)))return false;if(validScore(command.score)&&validScore(view.score)!==validScore(command.score))return false;return true;}
function restoreView(command={},workspace={}){const history=Array.isArray(workspace?.viewHistory)?workspace.viewHistory:[];if(!history.length)return null;const text=String(command.rawText||'');if(/(上一批|上一个结果|刚才那批|刚才的结果|前面那批)/.test(text)&&!(command.majorKeywords?.length||command.regionKeys?.length))return clone(history[0]);const matched=history.find(v=>viewMatchesCommand(v,command));return clone(matched||history[0]);}
function selectionReviewRequested(input=''){return /(方案|选择池|自选|已选|选了些|选了一些|检查.{0,6}(方案|专业)|看看.{0,6}(方案|已选)|还缺什么)/.test(String(input||''));}
function evidenceIntent(command,result){return{topic:result?.comparison?'candidate_search':command.agentTask==='evidence_verification'?'verification':CANDIDATE_TASKS.has(command.agentTask)?'candidate_search':'general_question',question:command.question||command.rawText||'',majorKeywords:command.majorKeywords||[]};}
function resultIdentity({view,command,selectionReview}){return[command.agentTask,view.score||'',view.majorKeywords.join('/'),view.regionKeys.join(','),view.schoolNames.join('/'),view.bottomLineMode,command.platformTarget||'',command.focus?.school||'',command.focus?.major||'',selectionReview?.snapshotVersion||''].join('|');}
function validateConfirmedCommand(value,input,workspace){if(!value||typeof value!=='object')return null;const fallback=deterministicCommand(input,workspace);return{...fallback,...value,changeSet:fallback.changeSet,score:fallback.score,regionKeys:fallback.regionKeys,majorKeywords:fallback.majorKeywords,schoolNames:fallback.schoolNames,bottomLineMode:fallback.bottomLineMode,focus:fallback.focus,rawText:clean(input,1200),question:clean(input,1200),requiresConfirmation:false,confidence:Math.max(.8,Number(value.confidence||.8)),source:`${clean(value.source,30)||'confirmed'}-confirmed`};}
function focusForTurn(command={},workspace={}){
  const prior=workspace?.agentContext?.focus||{},seed=command.focus||{},task=command.agentTask;
  const school=seed.school||((['school_major_history','school_history','fit_assessment','school_background'].includes(task))?prior.school:'');
  const major=seed.major||((['school_major_history','fit_assessment','major_background'].includes(task))?prior.major:'');
  const schools=seed.schools?.length?seed.schools:((task==='school_comparison')?prior.schools:[]);
  const majors=seed.majors?.length?seed.majors:((task==='major_comparison')?prior.majors:[]);
  return agentFocusSeed({school,major,schools,majors,sourceText:command.rawText},workspace);
}
function effectiveScore(command,workspace,view){
  const explicit=validScore(command.score),remembered=validScore(workspace?.examContext?.score)||validScore(view?.score);
  if(command.scoreUsage==='suspended'||command.scoreUsage==='cleared')return null;
  if(command.scoreUsage==='active')return explicit||remembered;
  return explicit||remembered;
}
function agentContextForTurn(command,workspace,focus){
  return{version:'ai-agent-context-v3992_0',currentTask:command.agentTask,previousTask:workspace?.agentContext?.currentTask||'',focus,contextUsage:{...taskExecutionPolicy(command.agentTask,command.scoreUsage)},updatedAt:new Date().toISOString()};
}

export async function orchestrateAiTurn(context,payload={}){
  const input=clean(payload.input,1200),workspace=payload.workspace&&typeof payload.workspace==='object'?payload.workspace:{};
  if(!input&&!payload.confirmedCommand)return{ok:false,status:400,message:'直接说你现在想解决的问题即可。'};
  if(workspace?.contractVersion&&!OLD_CONTRACTS.has(workspace.contractVersion))return{ok:false,status:409,message:'AI工作区版本无法安全迁移，请刷新页面后继续；专业初选和家庭方案不会受影响。'};
  let interpreted;const confirmed=validateConfirmedCommand(payload.confirmedCommand,input||payload.confirmedCommand?.rawText||'',workspace);
  if(confirmed)interpreted={command:confirmed,provider:{ok:false,provider:'',model:'',confirmed:true}};else interpreted=await interpretAiCommand(input,workspace,context.env||{},context.request||null);
  const command=interpreted.command;
  if(command.requiresConfirmation&&!confirmed)return{ok:true,pendingConfirmation:true,command,provider:{provider:interpreted.provider?.provider||'',model:interpreted.provider?.model||'',source:command.source,failures:interpreted.provider?.failures||[]},blocks:[{type:'clarification',title:'这句话我不想替你猜',text:command.reason||'请再明确一点。'}],orchestratorVersion:AI_TURN_ORCHESTRATOR_VERSION};

  let resolved=resolveActiveView(command,workspace);
  if(command.agentTask==='restore_view'){const restored=restoreView(command,workspace);if(!restored)return{ok:true,pendingConfirmation:true,command:{...command,requiresConfirmation:true},blocks:[{type:'clarification',title:'还没有可恢复的上一批结果',text:'先执行一次候选探索，再说“回到上一批”。'}],orchestratorVersion:AI_TURN_ORCHESTRATOR_VERSION};resolved={view:{...baseView(workspace),...restored},commitView:true,patch:command.changeSet,previousView:baseView(workspace)};}
  const view=resolved.view,focus=focusForTurn(command,workspace),agentContext=agentContextForTurn(command,workspace,focus),score=effectiveScore(command,workspace,view),changes=scopeChanges(resolved.previousView,view),regionExecution=resolveRegionExecution(view,workspace);
  let changeText='';
  if(CANDIDATE_TASKS.has(command.agentTask))changeText=changeSummary(resolved.previousView,view,command);
  else if(command.agentTask==='fact_rank_lookup')changeText=`这次只回答${validScore(command.score)||score}分对应的参考位次，不改变你正在看的候选条件。`;
  else if(command.agentTask==='school_major_history')changeText=`这轮切到“学校 × 专业历史查询”：${focus.school} · ${focus.major}。${score?'我仍记得你的分数，但这轮不拿它过滤历史记录。':''}`;
  else if(command.agentTask==='school_history')changeText=`这轮只看${focus.school}在辽宁物理类的实际招生专业记录${score?'；你的分数仍记着，但不参与筛选':''}。`;
  else if(command.agentTask==='fit_assessment')changeText=`现在把你记住的${score||'当前'}分重新激活，只判断${focus.school}${focus.major?` · ${focus.major}`:''}和你当前位置的历史关系。`;
  else if(command.agentTask==='background_discovery')changeText='这轮不是按分数筛学校，而是先从辽宁高校背景证据里找值得继续研究的专业方向。';
  else if(command.agentTask==='background_fit_discovery')changeText=`这轮把辽宁专业背景证据和你当前${score||''}分的可达窗口做交集预览，不把它包装成“最佳专业排名”。`;
  else changeText=`这轮切到“${agentTaskLabel(command.agentTask)}”；之前记住的家庭背景仍保留，但只让与当前任务有关的信息参与执行。`;

  const result={identity:'',partial:false,rank:null,candidates:null,history:null,fit:null,background:null,comparison:null,selectionReview:selectionReviewRequested(input)?runSelectionReview(workspace?.selectionSnapshot||null):null,evidence:[],pendingChecks:[],decisionStage:'start',changeSummary:changeText,execution:{agentTask:command.agentTask,scoreUsage:command.scoreUsage,score:score||null,focus,majorKeywords:view.majorKeywords,bottomLineMode:view.bottomLineMode,platformTarget:command.platformTarget||'',region:regionExecution,toolRegistryVersion:AI_TOOL_REGISTRY_VERSION}};
  try{
    switch(command.agentTask){
      case'candidate_discovery':
      case'candidate_refinement':
      case'restore_view':
        if(view.score&&regionExecution.exact){result.rank=runRankLookup(view.score);result.candidates=await runMajorBandSearch(context,{score:view.score,majorKeywords:view.majorKeywords,regionKeys:regionExecution.includeKeys,bottomLineMode:view.bottomLineMode,schoolKeyword:view.schoolNames?.length===1?view.schoolNames[0]:'',platformTarget:command.platformTarget||''});result.partial=!result.candidates.ok;}else result.partial=true;
        break;
      case'fact_rank_lookup':
        result.rank=runRankLookup(validScore(command.score)||score);result.partial=!result.rank.ok;break;
      case'school_major_history':
        result.history=await runSchoolMajorHistory(context,{school:focus.school,majorKeyword:(focus.majors?.length?focus.majors.join('/'):(focus.major||''))});result.partial=!result.history.ok;break;
      case'school_history':
        result.history=await runSchoolMajorHistory(context,{school:focus.school,majorKeyword:''});result.partial=!result.history.ok;break;
      case'fit_assessment':
        result.fit=await runFitAssessment(context,{school:focus.school,majorKeyword:focus.major,score});result.partial=!result.fit.ok;break;
      case'background_discovery':
        result.background=runBackgroundDiscovery({limit:12,regionKeys:command.regionKeys?.length?command.regionKeys:(view.regionKeys||['ln'])});result.partial=!result.background.ok;break;
      case'background_fit_discovery':
        result.background=await runBackgroundFitDiscovery(context,{score,bottomLineMode:view.bottomLineMode,regionKeys:command.regionKeys?.length?command.regionKeys:(view.regionKeys||['ln'])});result.partial=!result.background.ok;break;
      case'school_background':
        result.background=runSchoolBackground({school:focus.school});result.partial=!result.background.ok;break;
      case'major_background':
        result.background=runMajorBackground({major:focus.major});result.partial=!result.background.ok;break;
      case'school_comparison':{
        const schools=unique(command.schoolNames?.length?command.schoolNames:focus.schools,3);result.comparison=await runSchoolComparison(context,{score:score||view.score,schoolNames:schools,majorKeywords:view.majorKeywords,regionKeys:view.regionKeys,bottomLineMode:view.bottomLineMode});result.partial=!result.comparison?.ok;break;}
      case'major_comparison':{
        const majors=unique(command.majorKeywords?.length?command.majorKeywords:focus.majors,3);result.comparison=await runMajorComparison(context,{score:score||view.score,majorKeywords:majors,regionKeys:view.regionKeys,bottomLineMode:view.bottomLineMode});result.partial=!result.comparison?.ok;break;}
      case'plan_review':
        if(!result.selectionReview)result.selectionReview=runSelectionReview(workspace?.selectionSnapshot||null);break;
      default:break;
    }
  }catch(error){result.partial=true;result.toolError={message:clean(error?.message||error,320)};}

  result.decisionStage=decisionStageFor({command,view,result,changes});
  result.evidence=evidenceForIntent(evidenceIntent(command,result));
  result.identity=resultIdentity({view,command,selectionReview:result.selectionReview});
  result.pendingChecks=pendingChecksFor(result,regionExecution);
  const delta=result.candidates?buildAiResultDelta(workspace?.lastResult||null,result,{previousView:resolved.previousView,nextView:view}):{changed:Boolean(changes.length),countChanges:{},scopeChanges:{},addedPreviewIds:[],removedPreviewIds:[],unchangedPreviewCount:0};
  const blocks=buildBlocks({command,view,result,delta,workspace,regionExecution,changeText,stage:result.decisionStage,focus,agentContext});
  const assistantSummary=[changeText,result.comparison?comparisonText(result.comparison):''].filter(Boolean).join(' ');
  const taskAction=CANDIDATE_TASKS.has(command.agentTask)?(workspace?.mainTaskId?'update_main':'create_main'):(command.agentTask==='save_family'?'none':(workspace?.mainTaskId?'branch':'create_main'));
  return{ok:true,pendingConfirmation:false,command,taskAction,resolvedView:view,commitView:resolved.commitView,result,delta,blocks,agentContext,event:{type:'command_committed',payload:{command,taskAction,resolvedView:view,commitView:resolved.commitView,decisionStage:result.decisionStage,agentContext}},provider:{provider:interpreted.provider?.provider||'',model:interpreted.provider?.model||'',source:command.source,latencyMs:interpreted.provider?.latencyMs||0,failures:interpreted.provider?.failures||[]},turnRecord:{userText:input,assistantSummary,changeSummary:changeText,blocks,command,stage:result.decisionStage,task:command.agentTask,focus},orchestratorVersion:AI_TURN_ORCHESTRATOR_VERSION};
}

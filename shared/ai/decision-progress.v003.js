import {deriveDecisionFocus} from './decision-focus.v006_1.js';

export const AI_DECISION_PROGRESS_VERSION='ai-decision-progress-v0.03';

export const FAMILY_DECISION_STAGE_ORDER=Object.freeze([
  'score_position','major_direction','school_major','family_tradeoff','plan','audit'
]);

export const FAMILY_DECISION_STAGE_LABELS=Object.freeze({
  score_position:'分数位置',
  major_direction:'专业方向',
  school_major:'学校×专业',
  family_tradeoff:'家庭取舍',
  plan:'志愿方案',
  audit:'最终检查'
});

const DONE_STATES=new Set(['ready','confirmed','reviewed']);
const VALID_DECISION_STATUS=new Set(['keep','reject','pending']);

function clean(value,max=160){return String(value==null?'':value).trim().slice(0,max);}
function list(value){return Array.isArray(value)?value:[];}
function unique(values,max=24){return [...new Set(list(values).map(value=>clean(value,120)).filter(Boolean))].slice(0,max);}
function validScore(value){const n=Math.round(Number(value));return Number.isFinite(n)&&n>=150&&n<=750?n:null;}
function validRank(value){const n=Math.round(Number(value));return Number.isFinite(n)&&n>0?n:null;}
function decisionRows(workspace={}){return list(workspace.decisions).filter(item=>VALID_DECISION_STATUS.has(clean(item?.status,20)));}
function decisionCount(workspace,kind,status=''){return decisionRows(workspace).filter(item=>clean(item?.kind,60)===kind&&(!status||item.status===status)).length;}
function frameMajors(workspace={}){const frame=workspace?.agentContext?.semanticFrame||{},focus=workspace?.agentContext?.focus||{},view=workspace?.activeView||{};return unique([...(frame.majors||[]),...(focus.majors||[]),focus.major,...(view.majorKeywords||[])],12);}
function framePairs(workspace={}){const frame=workspace?.agentContext?.semanticFrame||{},pairs=[...(frame.comparisonPairs||[]),...(frame.pairs||[])],focus=workspace?.agentContext?.focus||{};if(focus.school&&focus.major)pairs.push({school:focus.school,major:focus.major});for(const item of list(workspace.decisions)){const subject=item?.subject&&typeof item.subject==='object'?item.subject:{};if(subject.school&&subject.major)pairs.push({school:subject.school,major:subject.major});}for(const item of list(workspace?.selectionSnapshot?.items)){if(item?.school&&item?.major)pairs.push({school:item.school,major:item.major});}const seen=new Set(),out=[];for(const item of pairs){const school=clean(item?.school,120),major=clean(item?.major,160),key=`${school}|${major}`;if(!school||!major||seen.has(key))continue;seen.add(key);out.push({school,major,label:clean(item?.label,300)||`${school} · ${major}`});if(out.length>=12)break;}return out;}
function selectionCount(workspace={}){const snapshot=workspace?.selectionSnapshot||{};if(Number.isFinite(Number(snapshot.itemCount)))return Math.max(0,Math.round(Number(snapshot.itemCount)));return list(snapshot.items).length;}
function explicitTradeoffDimensions(workspace={}){const explicit=workspace?.decisionProfile?.explicit||{},dimensions=[];if(clean(explicit.primaryGoal,60)&&explicit.primaryGoal!=='undecided')dimensions.push('primary_goal');if(list(explicit.priorities).length)dimensions.push('priorities');if(explicit.familyResourceSensitivity==='resource_sensitive')dimensions.push('family_resources');if(['prefer_short','long_ok'].includes(explicit.studyDurationTolerance))dimensions.push('study_duration');if(list(explicit.careerTargets).length)dimensions.push('career_targets');if(list(explicit.studentSignals).length)dimensions.push('student_signals');if(list(workspace.hardConstraints).length)dimensions.push('hard_constraints');if(list(workspace.softPreferences).length)dimensions.push('soft_preferences');return unique(dimensions,12);}
function auditState(workspace={}){const last=workspace.lastResult||{},hasReview=Boolean(last.selectionReview)||list(workspace.turnHistory||workspace.recentTurns).some(turn=>clean(turn?.task,80)==='plan_review');if(!hasReview)return{state:'not_started',blockingCount:0};const review=last.selectionReview||{},findings=list(review.findings);const blocking=findings.filter(item=>item?.blocking===true||['block','error','critical'].includes(clean(item?.level,20))).length;return{state:blocking?'exploring':'reviewed',blockingCount:blocking};}
function blockerRows(focus={},stageKey=''){return list(focus?.gaps).filter(item=>clean(item?.stage,40)===stageKey).slice(0,4).map(item=>({type:clean(item?.type,40),dimension:clean(item?.dimension,60),pairLabel:clean(item?.pairLabel,220),label:clean(item?.label,260),reason:clean(item?.reason,320),prompt:clean(item?.prompt,420),priority:Number(item?.priority||0)}));}
function stage(key,state,summary='',missing=[],blockers=[]){return{key,label:FAMILY_DECISION_STAGE_LABELS[key],state,summary:clean(summary,240),missing:unique(missing,8),blockers:list(blockers).slice(0,4)};}
function scoreRankPosition(workspace={}){const rankResult=workspace?.lastResult?.rank||{},contextScore=validScore(workspace?.examContext?.score),resultScore=validScore(rankResult?.score),score=contextScore||resultScore;const contextRank=validRank(workspace?.examContext?.rank),resultRank=score&&resultScore===score?validRank(rankResult?.rankEnd??rankResult?.rankForGap):null;return{score,rank:contextRank||resultRank};}

export function deriveDecisionProgress(workspace={}){
  const {score,rank}=scoreRankPosition(workspace),majors=frameMajors(workspace),pairs=framePairs(workspace),tradeoffs=explicitTradeoffDimensions(workspace),planCount=selectionCount(workspace),audit=auditState(workspace),focus=deriveDecisionFocus(workspace),rows=[];
  rows.push(stage('score_position',score&&rank?'ready':score?'exploring':'not_started',score&&rank?`${score}分 · 约${rank.toLocaleString('zh-CN')}位`:score?`${score}分，位次还待确认`:'还没有稳定的分数位置',score&&!rank?['位次']:!score?['分数/位次']:[]));
  const majorConfirmed=decisionCount(workspace,'major_direction','keep')>0;rows.push(stage('major_direction',majorConfirmed?'confirmed':majors.length?'exploring':'not_started',majorConfirmed?'已有明确优先方向':majors.length?`正在看 ${majors.slice(0,3).join('、')}`:'专业方向还没开始收敛',majors.length?[]:['至少一个专业方向']));
  const schoolMajorBlockers=blockerRows(focus,'school_major'),pairConfirmed=decisionCount(workspace,'school_major','keep')>0,pairState=schoolMajorBlockers.length?'exploring':pairConfirmed?'confirmed':pairs.length?'exploring':'not_started';rows.push(stage('school_major',pairState,schoolMajorBlockers.length?`已经落到具体学校×专业，但还有 ${schoolMajorBlockers.length} 个关键问题没处理`:pairConfirmed?'已有明确保留的学校×专业':pairs.length?`正在研究 ${pairs.slice(0,2).map(item=>item.label).join('、')}`:'还没有落到具体学校×专业',pairs.length?[]:['具体学校×专业'],schoolMajorBlockers));
  const tradeoffBlockers=blockerRows(focus,'family_tradeoff'),tradeoffConfirmed=decisionCount(workspace,'family_tradeoff','keep')>0,tradeoffBase=tradeoffConfirmed?'confirmed':tradeoffs.length>=2?'ready':tradeoffs.length?'exploring':'not_started',tradeoffState=tradeoffBlockers.length?'exploring':tradeoffBase;rows.push(stage('family_tradeoff',tradeoffState,tradeoffBlockers.length?`家庭条件已经参与判断，但还有 ${tradeoffBlockers.length} 个会改变选择的关键缺口`:tradeoffConfirmed?'关键家庭取舍已经确认':tradeoffs.length>=2?'已经有足够的明确家庭条件参与比较':tradeoffs.length?'已有部分家庭条件，还不够完整':'就业、读研、地域、预算等取舍还没说清',tradeoffs.length>=2?[]:['至少两个明确取舍维度'],tradeoffBlockers));
  const planConflicts=list(focus?.gaps).filter(item=>item?.type==='conflict'),planConfirmed=decisionCount(workspace,'plan','keep')>0,planState=planConflicts.length&&planCount>0?'exploring':planConfirmed?'confirmed':planCount>0?'ready':'not_started';rows.push(stage('plan',planState,planConflicts.length&&planCount>0?`当前方案 ${planCount} 项，但还有 ${planConflicts.length} 个与家庭已确认条件冲突的项目`:planCount>0?`当前方案 ${planCount} 项`:'还没有形成可检查的家庭方案',planCount>0?[]:['导入或形成家庭方案'],planConflicts.slice(0,4)));
  rows.push(stage('audit',audit.state,audit.state==='reviewed'?'已经完成一次结构检查':audit.state==='exploring'?`已经检查，但还有 ${audit.blockingCount} 个阻塞问题`:'方案形成后再做最终检查',audit.state==='reviewed'?[]:['最终方案检查']));
  const firstOpen=rows.find(item=>!DONE_STATES.has(item.state)),completedCount=rows.filter(item=>DONE_STATES.has(item.state)).length;return{version:AI_DECISION_PROGRESS_VERSION,stages:rows,recommendedStage:firstOpen?.key||'audit',completedCount,total:rows.length,majors,pairs,tradeoffDimensions:tradeoffs,selectionCount:planCount,primaryBlocker:focus.primaryGap||null,focusVersion:focus.version};
}
export function decisionProgressStage(progress={},key=''){return list(progress?.stages).find(item=>item?.key===key)||null;}

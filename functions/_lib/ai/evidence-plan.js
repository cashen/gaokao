export const AI_EVIDENCE_PLAN_VERSION='ai-evidence-plan-v0.03';
const WEB_NEEDS=new Set(['curriculum','employment','postgraduate','cost','official_policy']);
function unique(values,max=16){return [...new Set((Array.isArray(values)?values:[]).filter(Boolean))].slice(0,max);}
export function buildEvidencePlan(command={},workspace={},view={}){
  const frame=command.semanticFrame||{},steps=[],add=(kind,reason,params={})=>{if(steps.length<3&&!steps.some(x=>x.kind===kind))steps.push({index:steps.length+1,kind,reason,params});},scoreAllowed=!['suspended','cleared'].includes(command.scoreUsage);
  const score=scoreAllowed?(Number(command.score||frame.score||workspace?.examContext?.score||view?.score)||null):null,schools=unique(frame.schools||command.schoolNames||[],4),majors=unique(frame.majors||command.majorKeywords||[],8),pairs=Array.isArray(frame.pairs)?frame.pairs.slice(0,3):[],needs=new Set(frame.evidenceNeeds||[]);
  if(score&&(pairs.length>=2||schools.length>=2||majors.length>=2))add('admissions_compare','先用辽宁2026确定性投档事实确认当前分数下的可达空间。',{score,schools,majors,pairs});
  if((schools.length||majors.length)&&(needs.has('background')||frame.compositeDecision))add('background_evidence','再看已发布的学校/专业背景证据，不把学校名气当专业实力。',{schools,majors,pairs});
  if(schools.length&&[...needs].some(key=>WEB_NEEDS.has(key)))add('official_web_evidence','最后只补当前决策真正需要的学校官方培养、就业、升学、成本或规则证据。',{schools:schools.slice(0,2),majors:majors.slice(0,2),needs:[...needs].filter(key=>WEB_NEEDS.has(key)).slice(0,4)});
  if(!steps.length&&score&&(schools.length||majors.length))add('admissions_context','先保留当前分数作为决策坐标，但不修改候选筛选。',{score,schools,majors});
  return{version:AI_EVIDENCE_PLAN_VERSION,maxSteps:3,steps,bounded:true,schoolFanoutLimit:2,pairFanoutLimit:3,webFetchLimit:2,scoreUsed:Boolean(score)};
}

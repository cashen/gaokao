export const AI_EVIDENCE_PLAN_VERSION='ai-evidence-plan-v0.03';
const WEB_NEEDS=new Set(['curriculum','employment','postgraduate','cost','official_policy']);
function unique(values,max=16){return [...new Set((Array.isArray(values)?values:[]).filter(Boolean))].slice(0,max);}
export function buildEvidencePlan(command={},workspace={},view={}){
  const frame=command.semanticFrame||{},steps=[],add=(kind,reason,params={})=>{if(steps.length<3&&!steps.some(x=>x.kind===kind))steps.push({index:steps.length+1,kind,reason,params});},scoreAllowed=!['suspended','cleared'].includes(command.scoreUsage),currentNeeds=new Set(frame.currentEvidenceNeeds?.length?frame.currentEvidenceNeeds:(frame.evidenceNeeds||[])),allNeeds=new Set(frame.evidenceNeeds||[]),scoreRequested=command.scoreUsage==='active'||currentNeeds.has('admissions');
  const score=scoreAllowed?(Number(command.score||frame.score||workspace?.examContext?.score||view?.score)||null):null,pairs=Array.isArray(frame.pairs)?frame.pairs.slice(0,3):[],pairScoped=Boolean(frame.reference&&pairs.length),schools=pairScoped?unique(pairs.map(item=>item.school),4):unique(frame.schools||command.schoolNames||[],4),majors=pairScoped?unique(pairs.map(item=>item.major),8):unique(frame.majors||command.majorKeywords||[],8);
  if(score&&scoreRequested&&(pairs.length>=1||schools.length>=2||majors.length>=2))add('admissions_compare','先用辽宁2026确定性投档事实确认本轮明确要求的分数可达空间。',{score,schools,majors,pairs});
  const needsDecisionBaseline=frame.compositeDecision&&!frame.counterfactual?.active&&!frame.reference;
  if((schools.length||majors.length)&&(allNeeds.has('background')||needsDecisionBaseline))add('background_evidence','再看已发布的学校/专业背景证据，不把学校名气当专业实力。',{schools,majors,pairs});
  const webNeeds=[...currentNeeds].filter(key=>WEB_NEEDS.has(key));
  if(schools.length&&webNeeds.length)add('official_web_evidence','只补本轮当前追问真正需要的学校官方培养、就业、升学、成本或规则证据。',{schools:schools.slice(0,2),majors:majors.slice(0,2),needs:webNeeds.slice(0,4)});
  else if(!schools.length&&majors.length&&webNeeds.some(key=>['curriculum','employment','postgraduate'].includes(key)))add('major_knowledge_evidence','没有具体学校时，只补专业层面的官方知识与职业/升学材料，绝不冒充某校某专业去向。',{majors:majors.slice(0,2),needs:webNeeds.filter(key=>['curriculum','employment','postgraduate'].includes(key)).slice(0,3)});
  if(!steps.length&&score&&scoreRequested&&(schools.length||majors.length))add('admissions_context','本轮明确要求分数现实性，因此保留当前分数作为决策坐标，但不修改候选筛选。',{score,schools,majors});
  return{version:AI_EVIDENCE_PLAN_VERSION,maxSteps:3,steps,bounded:true,schoolFanoutLimit:2,pairFanoutLimit:3,webFetchLimit:2,scoreUsed:Boolean(score&&scoreRequested),rememberedScoreAvailable:Boolean(score&&!scoreRequested),currentEvidenceNeeds:[...currentNeeds],allEvidenceNeeds:[...allNeeds]};
}

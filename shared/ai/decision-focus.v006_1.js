export const AI_DECISION_FOCUS_VERSION='aiplus-decision-focus-v0.06';

export const DECISION_FOCUS_DIMENSIONS=Object.freeze({
  admissions:'录取位置',
  background:'专业/学校积累',
  employment:'本科就业证据',
  postgraduate:'读研/升学证据',
  curriculum:'培养与课程',
  cost:'家庭成本',
  family_decision:'家庭决定'
});

const DECISION_STATUS_LABELS=Object.freeze({keep:'先保留',reject:'暂不考虑',pending:'还要核实'});
const EVIDENCE_STATE_LABELS=Object.freeze({verified:'有直接依据',reference:'学校级参考',general:'专业通用参考',missing:'待核实',conflict:'与已确认条件冲突',keep:'先保留',reject:'暂不考虑',pending:'还要核实',undecided:'还没决定'});
const DIMENSION_PRIORITY=Object.freeze({admissions:140,employment:128,cost:124,postgraduate:118,curriculum:108,background:96});

function clean(value,max=260){return String(value==null?'':value).trim().slice(0,max);}
function list(value){return Array.isArray(value)?value:[];}
function normalize(value=''){return clean(value,300).normalize('NFKC').replace(/[\s·•（）()【】\[\]“”"'‘’，,。；;：:!！?？_—-]+/g,'').toLowerCase();}
function pairKey(school='',major=''){return `${normalize(school)}|${normalize(major)}`;}
function safeNumber(value){const n=Number(value);return Number.isFinite(n)?n:null;}
function recordSchool(item={}){return clean(item?.school||item?.schoolName,120);}
function recordMajor(item={}){return clean(item?.major||item?.majorName,180);}
function samePair(item={},pair={}){return pairKey(recordSchool(item),recordMajor(item))===pairKey(pair.school,pair.major);}
function statusText(state='missing'){return EVIDENCE_STATE_LABELS[state]||state;}

function pairCandidates(workspace={}){
  const frame=workspace?.agentContext?.semanticFrame||{},focus=workspace?.agentContext?.focus||{},sources=[...list(frame.comparisonPairs),...list(frame.pairs)];
  if(focus.school&&focus.major)sources.push({school:focus.school,major:focus.major});
  for(const item of list(workspace.decisions)){
    const subject=item?.subject&&typeof item.subject==='object'?item.subject:{};
    if(subject.school&&subject.major)sources.push(subject);
  }
  for(const item of list(workspace?.selectionSnapshot?.items))if(recordSchool(item)&&recordMajor(item))sources.push({school:recordSchool(item),major:recordMajor(item)});
  const seen=new Set(),out=[];
  for(const item of sources){
    const school=clean(item?.school,120),major=clean(item?.major,180),key=pairKey(school,major);
    if(!school||!major||seen.has(key))continue;
    seen.add(key);out.push({school,major,label:clean(item?.label,320)||`${school} · ${major}`,key});
    if(out.length>=6)break;
  }
  return out;
}

function resultPool(workspace={},currentResult=null){
  const values=[];
  if(currentResult&&typeof currentResult==='object')values.push(currentResult);
  if(workspace?.lastResult&&workspace.lastResult!==currentResult)values.push(workspace.lastResult);
  for(const task of list(workspace.tasks))if(task?.result&&typeof task.result==='object'&&!values.includes(task.result))values.push(task.result);
  return values.slice(0,24);
}
function collectClaims(workspace={},currentResult=null){
  const map=new Map();
  for(const result of resultPool(workspace,currentResult))for(const claim of list(result?.decisionResearch?.claims)){
    const id=clean(claim?.claimId,160);if(id&&!map.has(id))map.set(id,claim);
  }
  return [...map.values()].slice(0,120);
}
function resultRecords(result={}){
  const rows=[...list(result?.candidates?.records),...list(result?.history?.records),...list(result?.majorHistory?.records),...list(result?.fit?.records)];
  const nearest=result?.fit?.nearest;
  if(nearest&&typeof nearest==='object')rows.push({...nearest,school:nearest.school||result.fit.school,major:nearest.major||nearest.majorName||result.fit.majorKeyword});
  for(const item of list(result?.decisionResearch?.pairFits)){
    const hit=item?.fit?.nearest;
    if(hit&&typeof hit==='object')rows.push({...hit,school:item.school,major:item.major});
  }
  return rows;
}
function collectRecords(workspace={},currentResult=null){
  const rows=[...list(workspace?.selectionSnapshot?.items)];
  for(const result of resultPool(workspace,currentResult))rows.push(...resultRecords(result));
  return rows.slice(0,400);
}

function claimMatch(claim={},pair={},dimension=''){
  if(clean(claim?.dimension,80)!==dimension)return null;
  const type=clean(claim?.subjectType,40),subject=normalize(claim?.subject),subjectId=clean(claim?.subjectId,220),school=normalize(pair.school),major=normalize(pair.major),exactId=`${pair.school}|${pair.major}`,exactSubject=normalize(`${pair.school}${pair.major}`);
  if(type==='school_major'){
    const exact=subjectId?normalize(subjectId)===normalize(exactId):subject===exactSubject;
    return exact?{rank:3,state:'verified',scope:'school_major'}:null;
  }
  if(type==='school'&&subject===school)return{rank:2,state:'reference',scope:'school'};
  if(type==='major_national'&&subject===major)return{rank:1,state:'general',scope:'major_national'};
  return null;
}
function evidenceForDimension(claims=[],pair={},dimension=''){
  const matches=[];
  for(const claim of claims){const matched=claimMatch(claim,pair,dimension);if(matched)matches.push({...matched,claim});}
  matches.sort((a,b)=>b.rank-a.rank);
  const top=matches[0];
  if(!top)return{key:dimension,label:DECISION_FOCUS_DIMENSIONS[dimension]||dimension,state:'missing',stateLabel:statusText('missing'),scope:'',claimIds:[],text:'这一维还没有能绑定到当前对象的可靠依据。'};
  const direct=matches.filter(item=>item.rank===top.rank).slice(0,4),sample=clean(direct[0]?.claim?.value,180);
  const text=top.scope==='school_major'?(sample||'已有明确点名该学校×专业的可核验依据。'):top.scope==='school'?'目前只有学校级依据，不能直接当成这个专业的结论。':'目前只有专业通用资料，不能当成这所学校该专业的真实结果。';
  return{key:dimension,label:DECISION_FOCUS_DIMENSIONS[dimension]||dimension,state:top.state,stateLabel:statusText(top.state),scope:top.scope,claimIds:direct.map(item=>item.claim.claimId).filter(Boolean),text};
}
function admissionsEvidence(records=[],claims=[],pair={}){
  const claim=evidenceForDimension(claims,pair,'admissions');if(claim.state==='verified')return claim;
  const record=records.find(item=>samePair(item,pair)&&(safeNumber(item?.score2026??item?.score)!==null||safeNumber(item?.rank2026??item?.rank)!==null));
  if(!record)return{key:'admissions',label:DECISION_FOCUS_DIMENSIONS.admissions,state:'missing',stateLabel:statusText('missing'),scope:'school_major',claimIds:[],text:'还没有绑定到这所学校×专业的2026分数/位次记录。'};
  const bits=[],score=safeNumber(record?.score2026??record?.score),rank=safeNumber(record?.rank2026??record?.rank);
  if(score!==null)bits.push(`${Math.round(score)}分`);if(rank!==null)bits.push(`约${Math.round(rank).toLocaleString('zh-CN')}位`);
  return{key:'admissions',label:DECISION_FOCUS_DIMENSIONS.admissions,state:'verified',stateLabel:statusText('verified'),scope:'school_major',claimIds:claim.claimIds||[],text:`2026辽宁物理类参考：${bits.join(' · ')}。这不是下一年度录取概率。`};
}
function costEvidence(records=[],claims=[],pair={}){
  const direct=evidenceForDimension(claims,pair,'cost');if(direct.state!=='missing')return direct;
  const record=records.find(item=>samePair(item,pair)&&clean(item?.tuition,100));
  if(record)return{key:'cost',label:DECISION_FOCUS_DIMENSIONS.cost,state:'verified',stateLabel:statusText('verified'),scope:'school_major',claimIds:[],text:`当前快照记录学费：${clean(record.tuition,100)}；正式填报仍应核当年招生计划/章程。`};
  const risk=records.find(item=>samePair(item,pair)&&(item?.isSinoForeign===true||/中外|高收费/.test(clean(item?.projectLabel,120))));
  if(risk)return{key:'cost',label:DECISION_FOCUS_DIMENSIONS.cost,state:'reference',stateLabel:'存在高成本项目提示',scope:'school_major',claimIds:[],text:'当前记录带中外合作/高收费提示，但没有足够信息给出准确家庭成本。'};
  return{key:'cost',label:DECISION_FOCUS_DIMENSIONS.cost,state:'missing',stateLabel:statusText('missing'),scope:'school_major',claimIds:[],text:'学费/项目成本还没有可绑定到当前项目的可靠依据。'};
}
function matchingDecision(workspace={},pair={}){
  for(const item of list(workspace.decisions)){
    if(clean(item?.kind,60)!=='school_major')continue;
    const subject=item?.subject&&typeof item.subject==='object'?item.subject:{};
    if(pairKey(subject.school,subject.major)===pair.key)return item;
  }
  return null;
}
function exactExcludedMajor(values=[],major=''){
  const target=normalize(major);if(!target)return'';
  for(const value of list(values)){const label=clean(value,180);if(label&&normalize(label)===target)return label;}
  return'';
}
function constraintConflict(workspace={},pair={},records=[]){
  const constraints=list(workspace.hardConstraints);
  for(const item of constraints){
    const key=clean(item?.key,80),values=list(item?.values);
    if(key==='majorExclude'){
      const matched=exactExcludedMajor(values,pair.major);
      if(matched)return`你已经明确排除“${matched}”，但它仍在当前重点对象里。`;
    }
    if(key==='bottomLineMode'&&values.some(value=>['exclude_sino','public_regular_only'].includes(clean(value,40)))){
      const record=records.find(item=>samePair(item,pair));
      if(record&&(record.isSinoForeign===true||/中外|高收费/.test(clean(record.projectLabel,120))))return'这个项目带中外合作/高收费提示，但家庭已经明确排除这类项目。';
    }
  }
  return'';
}
function familyDecisionDimension(workspace={},pair={},records=[]){
  const conflict=constraintConflict(workspace,pair,records);
  if(conflict)return{key:'family_decision',label:DECISION_FOCUS_DIMENSIONS.family_decision,state:'conflict',stateLabel:statusText('conflict'),scope:'family',claimIds:[],text:conflict};
  const decision=matchingDecision(workspace,pair),status=clean(decision?.status,20)||'undecided';
  return{key:'family_decision',label:DECISION_FOCUS_DIMENSIONS.family_decision,state:status,stateLabel:statusText(status),scope:'family',claimIds:[],text:decision?clean(decision.reason||decision.text,260):'还没有由家庭明确标记为“先保留 / 暂不考虑 / 还要核实”。'};
}

function accumulatedNeeds(workspace={}){
  const explicit=workspace?.decisionProfile?.explicit||{},frame=workspace?.agentContext?.semanticFrame||{},needs=new Set(list(frame.evidenceNeeds));
  for(const value of list(frame.currentEvidenceNeeds))needs.add(value);
  if(list(explicit.priorities).some(key=>['employment','income','stability'].includes(key))||list(explicit.careerTargets).length||explicit.primaryGoal==='employment_stability'||explicit.primaryGoal==='income_upside')needs.add('employment');
  if(['prefer_short','long_ok'].includes(explicit.studyDurationTolerance))needs.add('postgraduate');
  if(explicit.familyResourceSensitivity==='resource_sensitive'||list(explicit.priorities).includes('cost'))needs.add('cost');
  if(list(explicit.studentSignals).length)needs.add('curriculum');
  return needs;
}
function currentNeeds(workspace={}){
  const frame=workspace?.agentContext?.semanticFrame||{};
  return new Set(list(frame.currentEvidenceNeeds).map(value=>clean(value,80)).filter(Boolean));
}
function visibleDimensions(workspace={}){
  const needs=accumulatedNeeds(workspace),dims=['admissions','background'];
  for(const key of ['employment','postgraduate','curriculum','cost'])if(needs.has(key))dims.push(key);
  if(dims.length<5)for(const key of ['employment','postgraduate','cost'])if(!dims.includes(key)&&dims.length<5)dims.push(key);
  dims.push('family_decision');return dims;
}
function gapForDimension(pair,dimension,workspace={}){
  const score=Math.round(Number(workspace?.examContext?.score)),scoreText=Number.isFinite(score)&&score>=150&&score<=750?String(score):'';
  const prompts={admissions:scoreText?`按我${scoreText}分，${pair.school}${pair.major}现实吗？先核对2026辽宁物理类分数和位次`:`${pair.school}${pair.major}在辽宁2026物理类多少分和多少位`,employment:`只核实${pair.school}${pair.major}能查到的本科就业证据，学校级和专业级分开说`,postgraduate:`只核实${pair.school}${pair.major}能查到的读研、升学或推免证据，学校级和专业级分开说`,curriculum:`只核实${pair.school}${pair.major}的培养方案和核心课程；拿不到该专业官方材料就明确说`,cost:`核实${pair.school}${pair.major}对应项目的学费、住宿费和是否中外合作/高收费`,background:`${pair.school}${pair.major}有什么可核验的专业背景或培养积累`};
  return{type:'evidence',stage:dimension==='admissions'?'school_major':'family_tradeoff',pairKey:pair.key,pairLabel:pair.label,dimension,priority:DIMENSION_PRIORITY[dimension]||90,label:dimension==='admissions'?`先确认 ${pair.label} 的现实位置`:`先补 ${pair.label} 的${DECISION_FOCUS_DIMENSIONS[dimension]||dimension}`,prompt:prompts[dimension]||`继续核实${pair.label}`,reason:'这是当前比较里最影响判断、但还没有足够直接依据的一项。'};
}
function buildGaps(pairs=[],workspace={},importantNeeds=new Set(),turnNeeds=new Set()){
  const gaps=[],hasCurrentNeed=turnNeeds.size>0,activeNeeds=hasCurrentNeed?turnNeeds:importantNeeds;
  for(const pair of pairs){
    const family=pair.dimensions.find(item=>item.key==='family_decision');
    if(family?.state==='conflict')gaps.push({type:'conflict',stage:'school_major',pairKey:pair.key,pairLabel:pair.label,dimension:'family_decision',priority:160,label:`先处理 ${pair.label} 的家庭条件冲突`,prompt:`${pair.label}和我已经明确的家庭条件有冲突，先解释这个冲突`,reason:family.text});
    for(const dimension of pair.dimensions){
      if(dimension.key==='family_decision')continue;
      if(hasCurrentNeed&&!turnNeeds.has(dimension.key))continue;
      const explicitlyNeeded=activeNeeds.has(dimension.key),scopeInsufficient=explicitlyNeeded&&['reference','general'].includes(dimension.state),missing=dimension.state==='missing';
      if(!missing&&!scopeInsufficient)continue;
      if(hasCurrentNeed&&!explicitlyNeeded)continue;
      let gap=gapForDimension(pair,dimension.key,workspace);
      if(scopeInsufficient)gap={...gap,reason:`${dimension.stateLabel}仍不足以回答“${pair.label}的${dimension.label}”这一层问题，需要继续寻找能绑定到当前对象的更直接依据。`};
      if(!explicitlyNeeded){const cap=dimension.key==='background'?80:92;gap={...gap,priority:Math.min(gap.priority,cap)};}
      gaps.push(gap);
    }
  }
  const explicit=workspace?.decisionProfile?.explicit||{};
  if(pairs.length>=2&&activeNeeds.has('postgraduate')&&!['prefer_short','long_ok'].includes(explicit.studyDurationTolerance))gaps.push({type:'family_tradeoff',stage:'family_tradeoff',pairKey:'',pairLabel:'',dimension:'study_duration',priority:134,label:'先弄清“是否接受读研”会不会改变选择',prompt:'我还没确定是否愿意读研，先告诉我这个取舍会怎样改变当前这几个学校×专业的判断',reason:'你已经把升学/考研带进这次比较，但家庭还没有明确培养周期边界。'});
  return gaps.sort((a,b)=>b.priority-a.priority||a.pairLabel.localeCompare(b.pairLabel,'zh-CN')).slice(0,12);
}

export function deriveDecisionFocus(workspace={},options={}){
  const pairs=pairCandidates(workspace),claims=collectClaims(workspace,options.currentResult||null),records=collectRecords(workspace,options.currentResult||null),dims=visibleDimensions(workspace);
  const matrix=pairs.map(pair=>{
    const dimensions=[];
    for(const key of dims){
      if(key==='admissions')dimensions.push(admissionsEvidence(records,claims,pair));
      else if(key==='cost')dimensions.push(costEvidence(records,claims,pair));
      else if(key==='family_decision')dimensions.push(familyDecisionDimension(workspace,pair,records));
      else dimensions.push(evidenceForDimension(claims,pair,key));
    }
    return{...pair,decisionStatus:clean(matchingDecision(workspace,pair)?.status,20)||'undecided',dimensions};
  });
  const important=accumulatedNeeds(workspace),turn=currentNeeds(workspace),gaps=buildGaps(matrix,workspace,important,turn),primaryGap=gaps[0]||null;
  return{version:AI_DECISION_FOCUS_VERSION,pairs:matrix,dimensions:dims,primaryGap,gaps,currentEvidenceNeeds:[...turn],importantEvidenceNeeds:[...important],evidenceClaimCount:claims.length,deterministicRecordCount:records.length,boundary:'只把现有 workspace、确定性招生记录和带 subject/source scope 的证据重新组织成决策视图；当前轮明确证据需求优先于历史家庭上下文；学校×专业 claim 只能按精确 subjectId 或完整规范化 subject 绑定；专业排除冲突只在同一规范化专业身份时命中，不靠字符串包含扩大范围；不生成综合评分、录取概率或新的招生事实。'};
}

export function decisionFocusGapAction(focus={}){
  const gap=focus?.primaryGap;if(!gap?.prompt)return null;
  return{id:`decision-gap:${gap.type}:${gap.dimension}:${gap.pairKey||'family'}`,label:gap.label,prompt:gap.prompt,reason:gap.reason,priority:Number(gap.priority||120),decisionStage:gap.stage||'family_tradeoff'};
}
export function decisionFocusStatusLabel(value=''){return statusText(value);}
export function decisionStatusLabel(value=''){return DECISION_STATUS_LABELS[value]||'还没决定';}

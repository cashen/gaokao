export const PARENT_SEMANTIC_FRAME_VERSION='parent-semantic-frame-v0.03';

const CAREER_TARGETS=Object.freeze(['central_soe','state_owned','public_service','teacher','manufacturing','it','research','healthcare']);
const EVIDENCE_NEEDS=Object.freeze(['admissions','background','curriculum','employment','postgraduate','cost','city','official_policy','experience']);
const SPEECH_ACTS=Object.freeze(['lookup','compare','decide','explore','verify']);

function clean(value,max=240){return String(value==null?'':value).trim().slice(0,max);}
function unique(values,max=16){return [...new Set((Array.isArray(values)?values:[]).map(v=>clean(v,120)).filter(Boolean))].slice(0,max);}
function allowed(values,set,max=16){const ok=new Set(set);return unique(values,max).filter(v=>ok.has(v));}

export function careerTargetsFromText(text=''){
  const s=String(text||''),out=[];
  if(/(央企|中央企业|国家电网|中石油|中石化|三桶油)/.test(s))out.push('central_soe');
  if(/(国企|国有企业|央国企)/.test(s))out.push('state_owned');
  if(/(考公|公务员|事业编|编制|体制内)/.test(s))out.push('public_service');
  if(/(教师|当老师|师范就业)/.test(s))out.push('teacher');
  if(/(制造业|装备制造|工厂|工业企业)/.test(s))out.push('manufacturing');
  if(/(互联网|软件|IT|程序员|计算机就业)/i.test(s))out.push('it');
  if(/(科研|研究所|读博|学术)/.test(s))out.push('research');
  if(/(医院|医疗|医生|卫生系统)/.test(s))out.push('healthcare');
  return allowed(out,CAREER_TARGETS,8);
}

function evidenceNeedsFromText(text='',{schools=[],majors=[],score=null}={}){
  const s=String(text||''),out=[];
  if(score||/(分数|位次|能上|能报|够不够|现实)/.test(s))out.push('admissions');
  if(/(强项|优势|背景|底子|学科实力|专业实力|专业别太虚)/.test(s))out.push('background');
  if(/(学什么|课程|培养方案|培养内容|实验|实习|专业内容|专业到底)/.test(s))out.push('curriculum');
  if(/(就业|工作|岗位|央企|国企|校招|毕业去向|本科就业|稳定)/.test(s))out.push('employment');
  if(/(考研|读研|保研|推免|升学|深造|研究生)/.test(s))out.push('postgraduate');
  if(/(学费|住宿费|费用|成本|预算|四年花费|经济压力)/.test(s))out.push('cost');
  if(/(城市|地域机会|实习机会|留在|离家|太远|距离)/.test(s))out.push('city');
  if(/(章程|转专业|调剂|体检|选科|录取规则|校区)/.test(s))out.push('official_policy');
  if(/(宿舍|食堂|环境|管理|同学评价|校园生活)/.test(s))out.push('experience');
  if(!out.length&&(schools.length||majors.length))out.push('admissions','background');
  return allowed(out,EVIDENCE_NEEDS,9);
}

function preferenceSignals(text='',mentorProfile={}){
  const s=String(text||''),signals=[],push=(dimension,value,strength='concern')=>signals.push({dimension,value,strength,source:'explicit_text'});
  if(/(学校牌子不用特别高|学校差一点可以|学校层次可以让|学校无所谓)/.test(s))push('school_platform','flexible','soft');
  else if(/(学校优先|平台优先|学校层次|学校牌子|学历平台|985|211|双一流)/.test(s))push('school_platform','important',/(必须.{0,4}(学校|平台)|学校.{0,4}必须)/.test(s)?'hard':'soft');
  if(/(专业别太虚|专业必须|专业优先|专业实力|专业质量|专业更重要)/.test(s))push('major_quality','important',/(专业必须|必须.{0,4}专业)/.test(s)?'hard':'soft');
  if(/(最好在辽宁|尽量省内|省内优先)/.test(s))push('region','liaoning_preferred','soft');
  if(/(绝不出省|只在辽宁|只能省内|不考虑省外)/.test(s))push('region','liaoning_only','hard');
  if(/(省内外都行|东北都行|地域都行)/.test(s))push('region','flexible','soft');
  if(/(普通家庭|家里没资源|没背景|没人脉|预算有限|经济压力)/.test(s))push('family_resources','resource_sensitive','concern');
  if(/(不想考研|不考虑读研|本科就就业|尽快就业|不想读太久)/.test(s))push('study_duration','prefer_short',/(绝不.{0,4}(考研|读研)|一定不.{0,4}(考研|读研))/.test(s)?'hard':'soft');
  if(/(愿意读研|可以读研|接受读研|能接受深造|愿意深造)/.test(s))push('study_duration','long_ok','soft');
  if(/(就业优先|更看重就业|工作稳定|就业稳定|稳定第一)/.test(s))push('employment','important',/(就业必须|稳定第一|必须.{0,4}稳定)/.test(s)?'hard':'soft');
  if(/(高薪|收入上限|挣钱|工资高|薪资高)/.test(s))push('income','important','soft');
  if(mentorProfile?.primaryGoal&&mentorProfile.primaryGoal!=='undecided'&&!signals.some(x=>x.dimension==='primary_goal'))signals.push({dimension:'primary_goal',value:mentorProfile.primaryGoal,strength:'soft',source:'mentor_profile'});
  return signals.slice(0,12);
}

function speechAct(text='',{schools=[],majors=[]}={}){
  const s=String(text||'');
  if(/(怎么选|如何选|到底选|怎么取舍|如何取舍|哪个更适合|哪个更合适|帮我一起看|综合看|综合比较)/.test(s))return'decide';
  if(/(比较|对比|哪个好|哪个更|差别|区别|横着看)/.test(s))return'compare';
  if(/(核验|官方|来源|是不是真的)/.test(s))return'verify';
  if(schools.length+majors.length>1)return'explore';
  return'lookup';
}

function pairObjects(schools=[],majors=[]){
  const ss=unique(schools,4),mm=unique(majors,8);
  if(ss.length<2||mm.length<2||ss.length!==mm.length)return[];
  return ss.slice(0,3).map((school,index)=>({school,major:mm[index],label:`${school} · ${mm[index]}`}));
}

function explicitDimensionCount(text=''){
  const groups=[
    /(就业|工作|稳定|央企|国企|岗位|校招)/,
    /(考研|读研|保研|推免|深造|学制)/,
    /(学费|成本|预算|普通家庭|资源|经济压力)/,
    /(城市|地域|离家|距离|实习机会)/,
    /(学校平台|学校层次|学校牌子|985|211|双一流)/,
    /(专业实力|专业质量|专业优先|强项|底子|专业别太虚)/
  ];
  return groups.reduce((n,re)=>n+(re.test(String(text||''))?1:0),0);
}

export function isParentDecisionLanguage(text='',{schoolCount=0,majorCount=0,priorTask=''}={}){
  const s=String(text||''),decision=/(怎么选|如何选|到底选|怎么取舍|如何取舍|哪个更适合|哪个更合适|帮我一起看|综合看|综合比较|应该选|更值得)/.test(s),changedPreference=/(愿意读研|不想考研|就业优先|学校优先|专业优先|普通家庭|央企|国企|高薪|稳定|成本|城市优先|如果|那如果|改成|不考虑)/.test(s);
  if(priorTask==='decision_research'&&changedPreference)return true;
  const schools=Number(schoolCount||0),majors=Number(majorCount||0),pairDecision=schools>=2&&majors>=2,decisionDimensions=explicitDimensionCount(s);if(!(schools+majors))return false;
  return Boolean(decision&&(pairDecision||decisionDimensions>=1));
}

function signatureFor(frame={}){
  return [frame.speechAct,(frame.schools||[]).join('/'),(frame.majors||[]).join('/'),(frame.regionKeys||[]).join('/'),frame.score||'',(frame.careerTargets||[]).join('/'),(frame.evidenceNeeds||[]).join('/'),(frame.preferenceSignals||[]).map(x=>`${x.dimension}:${x.value}:${x.strength}`).join('/')].join('|').slice(0,900);
}

export function buildParentSemanticFrame(text='',options={}){
  const s=clean(text,1200),workspace=options.workspace||{},prior=workspace?.agentContext?.semanticFrame||{},priorTask=workspace?.agentContext?.currentTask||'',explicitSchools=unique(options.schools||[],4),explicitMajors=unique(options.majors||[],8),schools=explicitSchools.length?explicitSchools:(priorTask==='decision_research'?unique(prior.schools||[],4):[]),majors=explicitMajors.length?explicitMajors:(priorTask==='decision_research'?unique(prior.majors||[],8):[]),explicitRegions=unique(options.regionKeys||[],8),regionKeys=explicitRegions.length?explicitRegions:(priorTask==='decision_research'?unique(prior.regionKeys||[],8):[]),optionScore=Number(options.score),workspaceScore=Number(workspace?.examContext?.score),priorScore=Number(prior.score),score=Number.isFinite(optionScore)&&optionScore>0?optionScore:Number.isFinite(workspaceScore)&&workspaceScore>0?workspaceScore:Number.isFinite(priorScore)&&priorScore>0?priorScore:null,mentorProfile=options.mentorProfile||{};
  const explicitCareers=careerTargetsFromText(s),careers=explicitCareers.length?explicitCareers:(priorTask==='decision_research'?allowed(prior.careerTargets||[],CAREER_TARGETS,8):[]),explicitPreferences=preferenceSignals(s,mentorProfile),preferences=explicitPreferences.length?[...(priorTask==='decision_research'?(prior.preferenceSignals||[]).filter(old=>!explicitPreferences.some(now=>now.dimension===old.dimension)):[]),...explicitPreferences].slice(0,12):(priorTask==='decision_research'?Array.isArray(prior.preferenceSignals)?prior.preferenceSignals.slice(0,12):[]:[]),explicitNeeds=evidenceNeedsFromText(s,{schools,majors,score}),needs=allowed([...(priorTask==='decision_research'?prior.evidenceNeeds||[]:[]),...explicitNeeds],EVIDENCE_NEEDS,9);
  const frame={version:PARENT_SEMANTIC_FRAME_VERSION,speechAct:speechAct(s,{schools,majors}),schools,majors,regionKeys,score,pairs:pairObjects(schools,majors),careerTargets:careers,preferenceSignals:preferences,evidenceNeeds:needs,compositeDecision:isParentDecisionLanguage(s,{schoolCount:schools.length,majorCount:majors.length,priorTask}),source:'deterministic',rawText:s};
  frame.signature=signatureFor(frame);return frame;
}

export function normalizeParentSemanticFrame(candidate={},fallback={},text=''){
  const base=fallback&&typeof fallback==='object'?fallback:buildParentSemanticFrame(text),speech=SPEECH_ACTS.includes(clean(candidate?.speechAct,30))?clean(candidate.speechAct,30):base.speechAct,extraCareers=allowed(candidate?.careerTargets||[],CAREER_TARGETS,8),extraNeeds=allowed(candidate?.evidenceNeeds||[],EVIDENCE_NEEDS,9),candidateConcerns=unique(candidate?.concerns||[],8).map(value=>({dimension:'model_concern',value,strength:'concern',source:'ai_assisted'}));
  const frame={...base,speechAct:speech,careerTargets:allowed([...(base.careerTargets||[]),...extraCareers],CAREER_TARGETS,8),evidenceNeeds:allowed([...(base.evidenceNeeds||[]),...extraNeeds],EVIDENCE_NEEDS,9),preferenceSignals:[...(base.preferenceSignals||[]),...candidateConcerns].slice(0,12),source:'ai-assisted'};frame.signature=signatureFor(frame);return frame;
}

export const PARENT_SEMANTIC_FRAME_ENUMS=Object.freeze({careerTargets:CAREER_TARGETS,evidenceNeeds:EVIDENCE_NEEDS,speechActs:SPEECH_ACTS});

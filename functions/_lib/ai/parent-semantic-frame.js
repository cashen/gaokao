export const PARENT_SEMANTIC_FRAME_VERSION='parent-semantic-frame-v0.03';

const CAREER_TARGETS=Object.freeze(['central_soe','state_owned','public_service','teacher','manufacturing','it','research','healthcare']);
const EVIDENCE_NEEDS=Object.freeze(['admissions','background','curriculum','employment','postgraduate','cost','city','official_policy','experience']);
const SPEECH_ACTS=Object.freeze(['lookup','compare','decide','explore','verify']);
const REFERENCE_WORDS=Object.freeze({第一个:0,'第1个':0,第一项:0,前者:0,第二个:1,'第2个':1,第二项:1,后者:1,第三个:2,'第3个':2,第三项:2});

function clean(value,max=240){return String(value==null?'':value).trim().slice(0,max);}
function unique(values,max=16){return [...new Set((Array.isArray(values)?values:[]).map(v=>clean(v,120)).filter(Boolean))].slice(0,max);}
function allowed(values,set,max=16){const ok=new Set(set);return unique(values,max).filter(v=>ok.has(v));}
function scoreSuppressed(text=''){return /(不考虑|不用管|先别管|别管|不看|先不看|忽略|先忽略).{0,8}(我的)?(分数|位次)/.test(String(text||''));}
function mergeByDimension(prior=[],current=[]){const now=new Set((current||[]).map(item=>item?.dimension).filter(Boolean));return [...(prior||[]).filter(item=>item?.dimension&&!now.has(item.dimension)),...(current||[])].slice(0,16);}

export function careerTargetsFromText(text=''){
  const s=String(text||''),out=[];
  if(/(央企|央国企|中央企业|国家电网|中石油|中石化|三桶油)/.test(s))out.push('central_soe');
  if(/(国企|国有企业|央国企)/.test(s))out.push('state_owned');
  if(/(考公|公务员|事业编|编制|体制内)/.test(s))out.push('public_service');
  if(/(教师|当老师|师范就业)/.test(s))out.push('teacher');
  if(/(制造业|装备制造|工厂|工业企业)/.test(s))out.push('manufacturing');
  if(/(互联网|软件|IT|程序员|计算机就业)/i.test(s))out.push('it');
  if(/(科研|研究所|读博|学术)/.test(s))out.push('research');
  if(/(医院|医疗|医生|卫生系统)/.test(s))out.push('healthcare');
  return allowed(out,CAREER_TARGETS,8);
}

export function studentSignalsFromText(text=''){
  const s=String(text||''),out=[],push=(dimension,value,polarity='positive')=>out.push({dimension,value,polarity,source:'explicit_text'});
  if(/数学.{0,4}(不错|挺好|较好|很好|强|优势)|数学基础.{0,4}(好|强)/.test(s))push('math_strength','strong');
  if(/物理.{0,4}(不错|挺好|较好|很好|强|优势)|物理基础.{0,4}(好|强)/.test(s))push('physics_strength','strong');
  if(/化学.{0,4}(一般|较弱|不好|不太好|弱)/.test(s))push('chemistry_strength','weak','negative');
  if(/(不喜欢|不想|讨厌|排斥).{0,4}(编程|写代码|代码)/.test(s))push('programming_affinity','avoid','negative');
  if(!/(不喜欢|不想|讨厌|排斥).{0,4}(编程|写代码|代码)/.test(s)&&(/(喜欢|愿意|能接受|可以接受).{0,4}(编程|写代码|代码)/.test(s)||/(编程|写代码|代码).{0,4}(可以接受|能接受|愿意|喜欢)/.test(s)))push('programming_affinity','accept');
  if(/(不想|不愿意|不接受|排斥).{0,6}(进工厂|工厂环境|生产一线)/.test(s))push('factory_environment','avoid','negative');
  if(/(不想|不愿意|不接受|排斥).{0,5}(倒班|夜班)/.test(s))push('shift_work','avoid','negative');
  if(/(不想|不愿意|不接受|排斥).{0,6}(工地|施工现场|长期现场)/.test(s))push('field_site','avoid','negative');
  if(/(不接受|不想|不愿意)(?:经常)?出差/.test(s))push('travel','avoid','negative');
  else if(/(?:接受|能接受|可以)(?:经常|偶尔)?出差/.test(s))push('travel','accept');
  if(/(动手能力|实践能力).{0,4}(不错|挺好|较好|很好|强)|喜欢.{0,4}(动手|实践)/.test(s))push('hands_on','strong');
  return mergeByDimension([],out).slice(0,10);
}

function evidenceNeedsFromText(text='',{schools=[],majors=[],score=null,studentSignals=[]}={}){
  const s=String(text||''),out=[],suspendScore=scoreSuppressed(s);
  if(!suspendScore&&/(?:^|[^\d])\d{3}\s*分|分数|位次|能上|能报|够不够|现实/.test(s))out.push('admissions');
  if(/(强项|优势|背景|底子|学科实力|专业实力|专业别太虚)/.test(s))out.push('background');
  if(/(学什么|课程|培养方案|培养内容|实验|实习|专业内容|专业到底)/.test(s))out.push('curriculum');
  if(/(就业|工作|岗位|央企|国企|校招|毕业去向|本科就业|稳定|工厂|倒班|工地|出差)/.test(s))out.push('employment');
  if(/(考研|读研|保研|推免|升学|深造|研究生)/.test(s))out.push('postgraduate');
  if(/(学费|住宿费|费用|成本|预算|四年花费|经济压力)/.test(s))out.push('cost');
  if(/(城市|地域机会|实习机会|留在|离家|太远|距离|出省)/.test(s))out.push('city');
  if(/(章程|转专业|调剂|体检|选科|录取规则|校区)/.test(s))out.push('official_policy');
  if(/(宿舍|食堂|环境|管理|同学评价|校园生活)/.test(s))out.push('experience');
  if((studentSignals||[]).some(item=>['programming_affinity','hands_on'].includes(item.dimension)))out.push('curriculum');
  if((studentSignals||[]).some(item=>['factory_environment','shift_work','field_site','travel'].includes(item.dimension)))out.push('employment');
  if(!out.length&&(schools.length||majors.length))out.push('background');
  return allowed(out,EVIDENCE_NEEDS,9);
}

function mentorSignals(mentorProfile={}){
  const signals=[],needs=[],push=(dimension,value,strength='soft')=>signals.push({dimension,value,strength,source:'mentor_profile'}),goal=mentorProfile?.primaryGoal||'undecided',priorities=new Set(mentorProfile?.priorities||[]),risks=new Set(mentorProfile?.riskQuestions||[]);
  if(goal==='employment_stability')push('employment','important');
  if(goal==='income_upside')push('income','important');
  if(goal==='city_opportunity')push('city','important');
  if(goal==='school_platform')push('school_platform','important');
  if(goal==='major_fit')push('major_quality','important');
  if(goal==='cost_control')push('cost','important');
  if(goal==='public_service')push('career_path','public_service');
  if(priorities.has('employment')||risks.has('employment_certainty'))needs.push('employment');
  if(priorities.has('cost'))needs.push('cost');
  if(priorities.has('city')||risks.has('city_opportunity'))needs.push('city');
  if(priorities.has('study_duration')||risks.has('further_study_cost'))needs.push('postgraduate');
  if(priorities.has('major'))needs.push('background');
  if(mentorProfile?.familyResourceSensitivity==='resource_sensitive')push('family_resources','resource_sensitive','concern');
  if(mentorProfile?.studyDurationTolerance==='prefer_short')push('study_duration','prefer_short');
  if(mentorProfile?.studyDurationTolerance==='long_ok')push('study_duration','long_ok');
  return{signals:mergeByDimension([],signals),needs:allowed(needs,EVIDENCE_NEEDS,9)};
}

function preferenceSignals(text='',mentorProfile={}){
  const s=String(text||''),signals=[],push=(dimension,value,strength='concern')=>signals.push({dimension,value,strength,source:'explicit_text'});
  if(/(学校牌子不用特别高|学校差一点可以|学校层次可以让|学校无所谓)/.test(s))push('school_platform','flexible','soft');
  else if(/(学校优先|平台优先|学校层次|学校牌子|学历平台|985|211|双一流)/.test(s))push('school_platform','important',/(必须.{0,4}(学校|平台)|学校.{0,4}必须)/.test(s)?'hard':'soft');
  if(/(专业别太虚|专业必须|专业优先|专业实力|专业质量|专业更重要)/.test(s))push('major_quality','important',/(专业必须|必须.{0,4}专业)/.test(s)?'hard':'soft');
  if(/(最好在辽宁|尽量省内|省内优先)/.test(s))push('region','liaoning_preferred','soft');
  if(/(绝不出省|只在辽宁|只能省内|不考虑省外)/.test(s))push('region','liaoning_only','hard');
  if(/(省内外都行|东北都行|地域都行|可以出省|愿意出省|省外也可以|出省也行)/.test(s))push('region','flexible','soft');
  if(/(普通家庭|家里没资源|没背景|没人脉|预算有限|经济压力)/.test(s))push('family_resources','resource_sensitive','concern');
  if(/(不想考研|不考虑读研|本科就就业|尽快就业|不想读太久)/.test(s))push('study_duration','prefer_short',/(绝不.{0,4}(考研|读研)|一定不.{0,4}(考研|读研))/.test(s)?'hard':'soft');
  if(/(愿意读研|可以读研|接受读研|能接受深造|愿意深造)/.test(s))push('study_duration','long_ok','soft');
  if(/(就业优先|更看重就业|工作稳定|就业稳定|稳定第一)/.test(s))push('employment','important',/(就业必须|稳定第一|必须.{0,4}稳定)/.test(s)?'hard':'soft');
  if(/(高薪|收入上限|挣钱|工资高|薪资高)/.test(s))push('income','important','soft');
  const mentor=mentorSignals(mentorProfile).signals;
  return mergeByDimension(mentor,signals);
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
  const ss=unique(schools,4),mm=unique(majors,8),pairs=[];
  if(!ss.length||!mm.length)return pairs;
  if(ss.length===1){for(const major of mm.slice(0,3))pairs.push({school:ss[0],major,label:`${ss[0]} · ${major}`});return pairs;}
  if(mm.length===1){for(const school of ss.slice(0,3))pairs.push({school,major:mm[0],label:`${school} · ${mm[0]}`});return pairs;}
  if(ss.length===mm.length){for(let index=0;index<Math.min(3,ss.length);index++)pairs.push({school:ss[index],major:mm[index],label:`${ss[index]} · ${mm[index]}`});}
  return pairs;
}

export function referenceFromText(text=''){
  const source=String(text||'');
  for(const [word,index] of Object.entries(REFERENCE_WORDS))if(source.includes(word))return{kind:'pair',index,word};
  return null;
}

function explicitDimensionCount(text=''){
  const groups=[/(就业|工作|稳定|央企|国企|岗位|校招)/,/(考研|读研|保研|推免|深造|学制)/,/(学费|成本|预算|普通家庭|资源|经济压力)/,/(城市|地域|离家|距离|实习机会|出省)/,/(学校平台|学校层次|学校牌子|985|211|双一流)/,/(专业实力|专业质量|专业优先|强项|底子|专业别太虚)/,/(编程|代码|工厂|倒班|工地|出差|动手)/];
  return groups.reduce((n,re)=>n+(re.test(String(text||''))?1:0),0);
}

export function isParentDecisionLanguage(text='',{schoolCount=0,majorCount=0,priorTask=''}={}){
  const s=String(text||''),decision=/(怎么选|如何选|到底选|怎么取舍|如何取舍|哪个更适合|哪个更合适|帮我一起看|综合看|综合比较|应该选|更值得)/.test(s),changedPreference=/(愿意读研|不想考研|就业优先|学校优先|专业优先|普通家庭|央企|国企|高薪|稳定|成本|城市优先|如果|那如果|改成|不考虑|可以出省|愿意出省|不喜欢编程|不想进工厂|不接受倒班|不想去工地)/.test(s),reference=referenceFromText(s);
  if(priorTask==='decision_research'&&(changedPreference||reference||/(就业|考研|读研|课程|学什么|成本|学费|城市|专业|学校).{0,4}(呢|怎么样|如何|咋样)?[？?]?$/.test(s)))return true;
  const schools=Number(schoolCount||0),majors=Number(majorCount||0),pairDecision=(schools>=2&&majors>=1)||(schools>=1&&majors>=2),decisionDimensions=explicitDimensionCount(s);if(!(schools+majors))return false;
  return Boolean(decision&&(pairDecision||decisionDimensions>=1));
}

function constraintsFrom(preferences=[],studentSignals=[]){
  const out=[];
  for(const item of preferences||[]){const strength=item.strength||'concern',negative=/^(?:avoid|exclude|none)$/.test(String(item.value||'')),operator=negative?'avoid':strength==='hard'?'require':'prefer';out.push({dimension:item.dimension,operator,value:item.value,strength,polarity:negative?'negative':'positive',scope:'decision',source:item.source||'explicit_text'});}
  for(const item of studentSignals||[]){const negative=item.polarity==='negative'||item.value==='avoid';out.push({dimension:item.dimension,operator:negative?'avoid':'prefer',value:item.value,strength:'concern',polarity:negative?'negative':'positive',scope:'student_signal',source:item.source||'explicit_text'});}
  const seen=new Set();return out.filter(item=>{const key=`${item.dimension}|${item.operator}|${item.value}`;if(seen.has(key))return false;seen.add(key);return true;}).slice(0,18);
}

function changedDimensions({text='',preferences=[],studentSignals=[],careerTargets=[]}={}){
  const out=[];if(scoreSuppressed(text))out.push('score');for(const item of preferences||[])out.push(item.dimension);for(const item of studentSignals||[])out.push(item.dimension);if(careerTargets.length)out.push('career');return unique(out,12);
}

function signatureFor(frame={}){
  return [frame.speechAct,(frame.schools||[]).join('/'),(frame.majors||[]).join('/'),(frame.regionKeys||[]).join('/'),frame.score||'',(frame.pairs||[]).map(x=>`${x.school}:${x.major}`).join('/'),frame.reference?`${frame.reference.kind}:${frame.reference.index}`:'',(frame.careerTargets||[]).join('/'),(frame.evidenceNeeds||[]).join('/'),(frame.preferenceSignals||[]).map(x=>`${x.dimension}:${x.value}:${x.strength}`).join('/'),(frame.studentSignals||[]).map(x=>`${x.dimension}:${x.value}`).join('/'),(frame.counterfactual?.changedDimensions||[]).join('/')].join('|').slice(0,1200);
}

export function buildParentSemanticFrame(text='',options={}){
  const s=clean(text,1200),workspace=options.workspace||{},prior=workspace?.agentContext?.semanticFrame||{},priorTask=workspace?.agentContext?.currentTask||'',reference=referenceFromText(s),referenceContinuation=priorTask==='decision_research'&&Boolean(reference),explicitSchools=unique(options.schools||[],4),explicitMajors=unique(options.majors||[],8),schools=referenceContinuation?unique(prior.schools||[],4):(explicitSchools.length?explicitSchools:(priorTask==='decision_research'?unique(prior.schools||[],4):[])),majors=referenceContinuation?unique(prior.majors||[],8):(explicitMajors.length?explicitMajors:(priorTask==='decision_research'?unique(prior.majors||[],8):[])),explicitRegions=unique(options.regionKeys||[],8),regionKeys=explicitRegions.length?explicitRegions:(priorTask==='decision_research'?unique(prior.regionKeys||[],8):[]),optionScore=Number(options.score),workspaceScore=Number(workspace?.examContext?.score),priorScore=Number(prior.score),rememberedScore=Number.isFinite(optionScore)&&optionScore>0?optionScore:Number.isFinite(workspaceScore)&&workspaceScore>0?workspaceScore:Number.isFinite(priorScore)&&priorScore>0?priorScore:null,score=scoreSuppressed(s)?null:rememberedScore,mentorProfile=options.mentorProfile||{};
  const explicitCareers=careerTargetsFromText(s),careers=explicitCareers.length?explicitCareers:(priorTask==='decision_research'?allowed(prior.careerTargets||[],CAREER_TARGETS,8):[]),explicitPreferences=preferenceSignals(s,mentorProfile),priorPreferences=priorTask==='decision_research'?(prior.preferenceSignals||[]):[],preferences=explicitPreferences.length?mergeByDimension(priorPreferences,explicitPreferences):priorPreferences.slice(0,16),explicitStudents=studentSignalsFromText(s),students=explicitStudents.length?mergeByDimension(priorTask==='decision_research'?(prior.studentSignals||[]):[],explicitStudents):(priorTask==='decision_research'?(prior.studentSignals||[]).slice(0,10):[]),mentor=mentorSignals(mentorProfile),explicitNeeds=evidenceNeedsFromText(s,{schools,majors,score,studentSignals:explicitStudents}),currentNeeds=allowed([...explicitNeeds,...mentor.needs],EVIDENCE_NEEDS,9),priorNeeds=priorTask==='decision_research'?(prior.evidenceNeeds||[]).filter(need=>!(scoreSuppressed(s)&&need==='admissions')):[],needs=allowed([...priorNeeds,...currentNeeds],EVIDENCE_NEEDS,9),derivedPairs=pairObjects(schools,majors),priorPairs=Array.isArray(prior.comparisonPairs)&&prior.comparisonPairs.length?prior.comparisonPairs:Array.isArray(prior.pairs)?prior.pairs:[],comparisonPairs=derivedPairs.length?derivedPairs:(priorTask==='decision_research'?priorPairs.slice(0,3):[]),selectedPair=reference&&comparisonPairs[reference.index]?comparisonPairs[reference.index]:null,pairs=selectedPair?[selectedPair]:comparisonPairs.slice(0,3),changed=changedDimensions({text:s,preferences:explicitPreferences,studentSignals:explicitStudents,careerTargets:explicitCareers}),counterfactualActive=priorTask==='decision_research'&&changed.length>0&&/(如果|那如果|改成|换成|愿意|不想|先别管|别管|不考虑|可以|出省)/.test(s);
  const frame={version:PARENT_SEMANTIC_FRAME_VERSION,speechAct:speechAct(s,{schools,majors}),schools,majors,regionKeys,score,pairs,comparisonPairs,reference,careerTargets:careers,preferenceSignals:preferences,studentSignals:students,constraints:constraintsFrom(preferences,students),evidenceNeeds:needs,currentEvidenceNeeds:currentNeeds,compositeDecision:isParentDecisionLanguage(s,{schoolCount:schools.length,majorCount:majors.length,priorTask}),counterfactual:{active:counterfactualActive,changedDimensions:counterfactualActive?changed:[],source:counterfactualActive?'explicit_text':''},source:mentorProfile?.source==='ai-assisted'?'deterministic+controlled-ai':'deterministic',rawText:s};
  frame.signature=signatureFor(frame);return frame;
}

export function normalizeParentSemanticFrame(candidate={},fallback={},text=''){
  const base=fallback&&typeof fallback==='object'?fallback:buildParentSemanticFrame(text),speech=SPEECH_ACTS.includes(clean(candidate?.speechAct,30))?clean(candidate.speechAct,30):base.speechAct,extraCareers=allowed(candidate?.careerTargets||[],CAREER_TARGETS,8),extraNeeds=allowed(candidate?.evidenceNeeds||[],EVIDENCE_NEEDS,9),candidateConcerns=unique(candidate?.concerns||[],8).map(value=>({dimension:'model_concern',value,strength:'concern',source:'ai_assisted'}));
  const frame={...base,speechAct:speech,careerTargets:allowed([...(base.careerTargets||[]),...extraCareers],CAREER_TARGETS,8),evidenceNeeds:allowed([...(base.evidenceNeeds||[]),...extraNeeds],EVIDENCE_NEEDS,9),preferenceSignals:[...(base.preferenceSignals||[]),...candidateConcerns].slice(0,16),source:'ai-assisted'};frame.constraints=constraintsFrom(frame.preferenceSignals,frame.studentSignals||[]);frame.signature=signatureFor(frame);return frame;
}

export const PARENT_SEMANTIC_FRAME_ENUMS=Object.freeze({careerTargets:CAREER_TARGETS,evidenceNeeds:EVIDENCE_NEEDS,speechActs:SPEECH_ACTS});

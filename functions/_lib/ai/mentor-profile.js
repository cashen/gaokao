import {careerTargetsFromText,studentSignalsFromText} from './parent-semantic-frame.js';
export const AI_MENTOR_PROFILE_VERSION = 'ai-mentor-profile-v3991_0';

export const MENTOR_SKILLSET_ATTRIBUTION = Object.freeze({
  repository:'cashen/zhangxuefeng-skillset',
  commit:'9a3306d84ea38874bbdbb9e6e62079ba1409e97e',
  knowledgeLicense:'CC BY 4.0',
  codeLicense:'MIT',
  adaptation:'methodology-and-semantic-goals-only'
});

const GOALS=Object.freeze(['employment_stability','income_upside','city_opportunity','school_platform','major_fit','cost_control','public_service','undecided']);
const PRIORITIES=Object.freeze(['feasible_set','employment','city','school','major','cost','stability','income','study_duration']);
const RISK_QUESTIONS=Object.freeze(['employment_certainty','income_ceiling','resource_dependency','ai_exposure','city_opportunity','further_study_cost']);

function clean(value,max=300){return String(value==null?'':value).trim().slice(0,max);}
function uniqueAllowed(values,allowed,max=8){const whitelist=new Set(allowed);return [...new Set((Array.isArray(values)?values:[]).map(value=>clean(value,60)).filter(value=>whitelist.has(value)))].slice(0,max);}
function detectPrimaryGoal(source){if(/(编制|体制内|考公|公务员|事业编)/.test(source))return'public_service';if(/(稳定就业|工作稳定|就业稳定|铁饭碗|求稳|稳定第一)/.test(source))return'employment_stability';if(/(高薪|收入上限|收入天花板|挣钱|赚钱|薪资高|工资高)/.test(source))return'income_upside';if(/(城市优先|大城市优先|就业城市|地域机会|城市机会)/.test(source))return'city_opportunity';if(/(学校优先|平台优先|学校层次|学校牌子|学历平台|保研平台)/.test(source))return'school_platform';if(/(专业优先|兴趣优先|喜欢的专业|专业匹配|专业方向最重要)/.test(source))return'major_fit';if(/(预算优先|学费敏感|控制学费|经济压力|性价比)/.test(source))return'cost_control';return'';}
function detectPriorities(source){const priorities=[];if(/(分数|位次|能上|能报|可行集|候选)/.test(source))priorities.push('feasible_set');if(/(就业|工作|岗位|职业|前景|本科就业)/.test(source))priorities.push('employment');if(/(城市优先|大城市|就业城市|地域机会|城市机会|实习|校招|留在.{0,8}(沈阳|大连|辽宁|北京|上海|深圳))/i.test(source))priorities.push('city');if(/(学校优先|平台优先|学校层次|学校牌子|学历平台|985|211|双一流|保研)/.test(source))priorities.push('school');if(/(专业优先|兴趣优先|兴趣|喜欢.{0,6}(专业|方向)|专业匹配|专业方向最重要)/.test(source))priorities.push('major');if(/(学费|预算|经济压力|高收费|性价比)/.test(source))priorities.push('cost');if(/(稳定|编制|体制|考公|铁饭碗)/.test(source))priorities.push('stability');if(/(高薪|收入|薪资|工资|天花板)/.test(source))priorities.push('income');if(/(学制|读研|考研|读博|尽快就业|本科就业)/.test(source))priorities.push('study_duration');return uniqueAllowed(priorities,PRIORITIES,9);}
function detectRiskQuestions(source){const risks=[];if(/(就业|工作|岗位|失业|前景|本科就业)/.test(source))risks.push('employment_certainty');if(/(收入|高薪|薪资|工资|天花板)/.test(source))risks.push('income_ceiling');if(/(家庭资源|家里资源|背景|人脉|普通家庭|没资源|没背景|家里没矿)/.test(source))risks.push('resource_dependency');if(/(AI|人工智能|替代|冲击|自动化影响)/i.test(source))risks.push('ai_exposure');if(/(城市优先|大城市|实习|校招|就业城市|地域机会|城市机会)/.test(source))risks.push('city_opportunity');if(/(考研|读研|读博|学制|深造|尽快就业|本科就业)/.test(source))risks.push('further_study_cost');return uniqueAllowed(risks,RISK_QUESTIONS,6);}
function explicitResourceSensitivity(source){return /(普通家庭|家里没资源|家庭资源有限|没有背景|没背景|没人脉|预算有限|经济压力|学费敏感|家里没矿)/.test(source)?'resource_sensitive':'unspecified';}
function explicitStudyDuration(source){if(/(不想读太久|不能接受长学制|尽快就业|本科就就业|本科就业|不考虑读研|不想考研)/.test(source))return'prefer_short';if(/(接受长学制|能接受长学制|可以读研|能读研|愿意读研|可以读博|愿意深造)/.test(source))return'long_ok';return'unspecified';}

function persistableFromText(source){
  const primaryGoal=detectPrimaryGoal(source)||'undecided';
  const priorities=detectPriorities(source).filter(value=>value!=='feasible_set');
  const familyResourceSensitivity=explicitResourceSensitivity(source);
  const studyDurationTolerance=explicitStudyDuration(source);
  const careerTargets=careerTargetsFromText(source);
  const studentSignals=studentSignalsFromText(source);
  const hasExplicit=/((更|最|主要|优先|第一|看重|倾向|希望).{0,8}(就业|城市|学校|专业|稳定|收入|学费|成本)|普通家庭|没资源|没背景|不想读太久|本科就就业|本科就业|愿意读研|接受长学制|考公|编制|铁饭碗)/.test(source)||careerTargets.length>0||studentSignals.length>0;
  return hasExplicit?{primaryGoal,priorities,familyResourceSensitivity,studyDurationTolerance,careerTargets,studentSignals}:{primaryGoal:'undecided',priorities:[],familyResourceSensitivity:'unspecified',studyDurationTolerance:'unspecified',careerTargets:[],studentSignals:[]};
}

export function deterministicMentorProfile(text=''){
  const source=clean(text,1200),primaryGoal=detectPrimaryGoal(source),priorities=detectPriorities(source),familyResourceSensitivity=explicitResourceSensitivity(source),studyDurationTolerance=explicitStudyDuration(source),riskQuestions=detectRiskQuestions(source),nonFeasiblePriorities=priorities.filter(value=>value!=='feasible_set'),persistable=persistableFromText(source);
  const enabled=Boolean(primaryGoal||nonFeasiblePriorities.length||riskQuestions.length||familyResourceSensitivity!=='unspecified'||studyDurationTolerance!=='unspecified');
  return{version:AI_MENTOR_PROFILE_VERSION,enabled,primaryGoal:primaryGoal||'undecided',priorities,familyResourceSensitivity,studyDurationTolerance,riskQuestions,constraintsApplied:false,source:'deterministic',scope:'semantic-only',persistable};
}

export function normalizeMentorProfile(candidate={},fallback={},text=''){
  const base=fallback&&typeof fallback==='object'?fallback:deterministicMentorProfile(text),primaryGoal=GOALS.includes(clean(candidate?.primaryGoal,60))?clean(candidate.primaryGoal,60):base.primaryGoal,priorities=uniqueAllowed(candidate?.priorities,PRIORITIES,9),riskQuestions=uniqueAllowed([...(base.riskQuestions||[]),...(candidate?.riskQuestions||[])],RISK_QUESTIONS,6),sourceText=clean(text,1200),resourceExplicit=explicitResourceSensitivity(sourceText),studyExplicit=explicitStudyDuration(sourceText),familyResourceSensitivity=resourceExplicit!=='unspecified'?resourceExplicit:'unspecified',studyDurationTolerance=studyExplicit!=='unspecified'?studyExplicit:'unspecified',mergedPriorities=priorities.length?priorities:uniqueAllowed(base.priorities,PRIORITIES,9),nonFeasiblePriorities=mergedPriorities.filter(value=>value!=='feasible_set'),enabled=Boolean(primaryGoal!=='undecided'||nonFeasiblePriorities.length||riskQuestions.length||familyResourceSensitivity!=='unspecified'||studyDurationTolerance!=='unspecified');
  return{version:AI_MENTOR_PROFILE_VERSION,enabled,primaryGoal,priorities:mergedPriorities,familyResourceSensitivity,studyDurationTolerance,riskQuestions,constraintsApplied:false,source:enabled?'ai-assisted':'deterministic',scope:'semantic-only',persistable:persistableFromText(sourceText)};
}

export function mentorCommandSchema(){return{primaryGoal:GOALS.join(' | '),priorities:PRIORITIES.join(' | '),familyResourceSensitivity:'resource_sensitive | unspecified; only when explicitly stated',studyDurationTolerance:'prefer_short | long_ok | unspecified; only when explicitly stated',riskQuestions:RISK_QUESTIONS.join(' | '),constraintsApplied:'must be false'};}
export function mentorSystemGuide(){return['附加受控高考顾问方法层：先确认分数/位次与可行集，再从毕业目标倒推城市、学校、专业、成本和培养周期。','就业确定性、收入上限、家庭资源依赖、AI影响、城市机会、深造成本只能作为待核验维度。','严禁使用技能仓库里的固定录取概率、就业率、收入数字、专业绝对优劣或静态行业结论作为事实。','mentorProfile 只能描述用户决策目标，不能修改 score、region、school、major、项目性质或候选集合。'].join('');}

const GOAL_LABELS=Object.freeze({employment_stability:'就业稳定',income_upside:'收入上限',city_opportunity:'城市机会',school_platform:'学校平台',major_fit:'专业匹配',cost_control:'成本控制',public_service:'编制/体制路径',undecided:'目标仍待明确'});
const PRIORITY_LABELS=Object.freeze({feasible_set:'先确定可行集',employment:'就业',city:'城市',school:'学校平台',major:'专业',cost:'成本',stability:'稳定性',income:'收入',study_duration:'学制/深造成本'});
const RISK_LABELS=Object.freeze({employment_certainty:'就业确定性',income_ceiling:'收入上限',resource_dependency:'家庭资源依赖',ai_exposure:'AI影响',city_opportunity:'城市机会',further_study_cost:'深造成本'});

export function mentorFrameForCommand(command={}){
  const profile=command?.mentorProfile;if(!profile?.enabled)return null;const pieces=[];
  if(profile.primaryGoal&&profile.primaryGoal!=='undecided')pieces.push(`你更在意${GOAL_LABELS[profile.primaryGoal]||profile.primaryGoal}`);
  const priorities=uniqueAllowed(profile.priorities,PRIORITIES,9).filter(key=>key!=='feasible_set').map(key=>PRIORITY_LABELS[key]||key);if(priorities.length)pieces.push(`本轮我会重点留意${priorities.join('、')}`);
  if(profile.familyResourceSensitivity==='resource_sensitive')pieces.push('你提到了普通家庭/资源或预算约束，我只把它作为比较维度，不会据此擅自删学校');
  if(profile.studyDurationTolerance==='prefer_short')pieces.push('你更偏向较短培养路径');if(profile.studyDurationTolerance==='long_ok')pieces.push('你可以接受继续深造');
  const risks=uniqueAllowed(profile.riskQuestions,RISK_QUESTIONS,6).map(key=>RISK_LABELS[key]||key);if(risks.length)pieces.push(`没有可靠证据的${risks.join('、')}我会明确标成待核验`);
  return{type:'decision_guidance',title:'我记住了你真正关心的点',text:`${pieces.join('；')}。`,mentorVersion:AI_MENTOR_PROFILE_VERSION,attribution:MENTOR_SKILLSET_ATTRIBUTION};
}

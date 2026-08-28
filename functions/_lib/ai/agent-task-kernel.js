import {looksRegionSchoolDirectoryLanguage,looksRegionSchoolDirectoryFollowup} from './region-school-language.js';
import {looksEducationKnowledgeQuestion} from './knowledge-language.js';
import {collectionScopeFromText,isScoreWindow,scoreConstraintFromText,majorTopicBoundaryFromText,schoolTopicBoundaryFromText} from './human-query-frame.js';

export const AI_AGENT_KERNEL_VERSION='ai-human-advisor-kernel-v3992_6';

export const AGENT_TASKS=Object.freeze([
  'candidate_discovery','candidate_refinement','fact_rank_lookup',
  'school_major_history','school_history','major_region_history','region_school_directory','school_research','school_official_qa','school_experience','student_voice','fit_assessment',
  'school_comparison','major_comparison',
  'background_discovery','background_fit_discovery','school_background','major_background',
  'knowledge_explain','evidence_verification','plan_review','general_advice','restore_view','save_family'
]);

export const CONTEXT_STATES=Object.freeze(['active','remembered','suspended','cleared']);

function clean(value,max=240){return String(value==null?'':value).trim().slice(0,max);}
function unique(values,max=12){return [...new Set((Array.isArray(values)?values:[]).map(v=>clean(v,120)).filter(Boolean))].slice(0,max);}
function has(text,re){return re.test(String(text||''));}

export function agentFocusSeed(seed={},workspace={}){
  const prior=workspace?.agentContext?.focus||{};
  return {
    school:clean(seed.school||prior.school,120),
    major:clean(seed.major||prior.major,160),
    schools:unique(seed.schools||prior.schools||[],4),
    majors:unique(seed.majors||prior.majors||[],8),
    sourceText:clean(seed.sourceText,360)
  };
}

export function contextUsageSeed(seed={},workspace={}){
  const rememberedScore=Number(workspace?.examContext?.score)||null;
  return {
    score:CONTEXT_STATES.includes(seed.score)?seed.score:(rememberedScore?'remembered':'cleared'),
    region:CONTEXT_STATES.includes(seed.region)?seed.region:'remembered',
    major:CONTEXT_STATES.includes(seed.major)?seed.major:'remembered',
    school:CONTEXT_STATES.includes(seed.school)?seed.school:'remembered',
    bottomLine:CONTEXT_STATES.includes(seed.bottomLine)?seed.bottomLine:'remembered'
  };
}

export function explicitScoreUsage(text='',workspace={}){
  const source=String(text||'');
  if(has(source,/(?:不是|不想|先不|别|不要).{0,4}问.{0,8}(能不能上|能不能报|够不够|能上吗|能报吗|够吗)/))return workspace?.examContext?.score?'remembered':'cleared';
  if(has(source,/(不考虑|不用管|先别管|别管|不看|先不看|忽略|不问|先不问).{0,8}(我的)?(分数|位次)|单看.{0,10}(学校|专业|方向)|只看.{0,8}(学校|专业)本身/))return'suspended';
  if(has(source,/我\s*\d{3}\s*分?.{0,8}(符合|资格|条件)/))return'active';
  if(has(source,/(按我|按我的|我这个|我的).{0,6}(分|位次)|我.{0,8}(够不够|能不能上|能不能报|能上吗|能报吗|够吗|现实吗)|我\s*\d{3}\s*分?.{0,6}(够|能上|能报|现实)|按\d{3}分/))return'active';
  return workspace?.examContext?.score?'remembered':'cleared';
}

function looksHistory(source){return /(多少分|几分|什么分|分都多少|所有(?:的)?分数|全部(?:的)?分数|最低分|最低录取分|最低投档分|录取分|投档分|位次|排名|去年|往年|历年|历史|202[3456]|分数线|(?:所有|全部|各校|各学校).{0,18}(?:分数|多少分|录取|投档|位次)|(?:从高到低|从高到底|降序|最高到最低))/.test(source);}
function looksAllSchoolMajorsHistory(source){return collectionScopeFromText(source).kind==='all_school_majors'&&looksHistory(source);}
function looksAllSchoolMajorsFollowup(source){return collectionScopeFromText(source).kind==='all_school_majors'&&!looksHistory(source);}
function looksImplicitAllSchoolMajorsHistory(source){return /(?:(?:专业|各专业|分数)?(?:都|大概都|大约都|分别|各自).{0,6}(?:多少分|几分|什么分|分数(?:是多少|多少)?)|(?:分|分数).{0,3}都多少)/.test(source);}
function looksHistoryCorrection(source){return /(?:不是|不想|先不|别|不要).{0,5}问.{0,8}(能不能上|能不能报|够不够|能上吗|能报吗|够吗).{0,18}(去年|往年|历年|最低分|最低录取分|最低投档分|录取分|投档分|分数线|位次)/.test(source);}
function looksFit(source){return /(我.{0,8}(够不够|能不能上|能不能报|能上吗|能报吗|够吗|现实吗)|我\s*\d{3}\s*分?.{0,6}(够|能上|能报|现实)|按我.{0,8}(分|位次)|这个分.{0,6}(能上|能报|够吗)|够得着)/.test(source);}
function looksCompare(source){return /(怎么选|哪个好|哪个更|比较|对比|差别|区别|优劣|取舍|横着看|谁更)/.test(source);}
function looksBackground(source){return /(强项|优势专业|专业优势|学科背景|专业背景|学校背景|有背景|专业底子|更有底子|拿得出手|哪个专业.{0,6}(最好|最强|有底子)|底蕴|特色方向|本地强项|省内背景)/.test(source);}
function looksWorth(source){return /(值得报|值得看|值得研究|优先研究|优先看|适合研究|方向推荐|推荐.{0,6}(专业|方向)|哪些.{0,8}(专业|方向).{0,8}(好|合适|值得))/.test(source);}
function looksPlanReview(source){return /(方案|选择池|自选|已选|选了些|检查.{0,6}(方案|专业)|看看.{0,6}(方案|已选)|还缺什么)/.test(source);}
function looksVerify(source){return /(章程|招生计划|学费|校区|体检|选科|官方|来源|核验|资格|培养方案)/.test(source);}
function looksSpecificOfficialTopic(source){return /(招生章程|章程|录取规则|调档|退档|专业级差|志愿级差|转专业|宿舍|住宿|食堂|食宿|寝室|学费|收费|费用|联系方式|联系办法|招生电话|学校官网|招生网址|奖学金|助学金|奖助|院系设置|专业介绍|答考生问|毕业生就业|体检要求|校区|主管部门|办学性质)/.test(source);}
function looksBroadSchoolResearch(source){const value=String(source||'');if(looksSpecificOfficialTopic(value))return false;return /(介绍(?:下|一下)?|介绍介绍|讲讲|讲一下|讲下|说说|说一下|说下|聊聊|聊一下|了解(?:下|一下)?|认识一下|什么学校|什么来头|学校定位|办学定位|整体怎么样|总体怎么样|大概怎么样|值不值得了解|帮我看看.{0,8}(大学|学院|专科学校)|(大学|学院|专科学校).{0,2}(怎么样|如何|咋样)[？?]?$|这所学校.{0,6}(怎么样|如何|咋样|什么定位)|这个学校.{0,6}(怎么样|如何|咋样|什么定位)|该校.{0,6}(怎么样|如何|咋样|什么定位))/.test(value);}
function looksSchoolExperience(source){return /(学校环境|校园环境|校园氛围|学习氛围|人文关怀|管理人性|管理严格|老师负责|辅导员|同学评价|学生评价|学生口碑|真实体验|同学体验|在校体验|宿舍|住宿|食堂|食宿|寝室|公寓)/.test(String(source||''));}
function looksStudentVoice(source){return /(?:(?:学生|同学|学长|学姐).{0,10}(?:怎么说|评价|口碑|反馈|觉得|认为|体验|感受|后悔|劝退|就业怎么样)|(?:专业|这个专业|该专业).{0,10}(?:学生体验|同学体验|真实体验))/.test(String(source||''));}
function looksOfficialOutcomeMetric(source){return /(?:就业率|毕业去向落实率|去向落实率|升学率|保研率|平均薪资|平均工资|薪资中位数|就业人数|就业数据)/.test(String(source||''));}
function looksOfficialSchoolInfo(source){return /(学校简介|院校简介|学校介绍|什么学校|学校定位|办学性质|主管部门|校区|宿舍|住宿|食堂|食宿|奖学金|助学金|奖助|联系方式|联系办法|招生电话|学校官网|招生网址|招生章程|录取规则|调档|退档|专业级差|志愿级差|转专业|学费|收费|院系设置|专业介绍|答考生问|毕业生就业|体检要求|(大学|学院|专科学校).{0,4}(怎么样|如何|咋样)[？?]?$|这所学校.{0,6}(怎么样|如何|咋样)|这个学校.{0,6}(怎么样|如何|咋样)|该校.{0,6}(怎么样|如何|咋样))/.test(source);}
function looksRestore(source){return /(回到|恢复|上一批|上一个结果|刚才那批|之前那批|前面的)/.test(source);}
function looksMajorRegionSchoolList(source){return /(?:哪些|那些|什么|啥|有什么|有啥|有哪些).{0,6}(?:学校|大学|高校|院校)|(?:学校|大学|高校|院校).{0,6}(?:有这个专业|有该专业|有吗)/.test(String(source||''));}
function looksKnowledgeFollowup(source,priorTask=''){return priorTask==='knowledge_explain'&&/(这个|它|刚才(?:那个|说的)|这个政策|这个计划|这个专业|这个概念|那这个|那它|我家|户籍|学籍|能报吗|可以报吗|谁能报|怎么报|符合|资格|条件|今年|现在|沈工大|这所学校).{0,20}/.test(String(source||''));}


function candidateTaskForCompactEntity(workspace={}){
  const prior=clean(workspace?.agentContext?.currentTask,60),view=workspace?.activeView||{};
  const scoped=Boolean((view.majorKeywords||[]).length||(view.schoolNames||[]).length||((view.regionKeys||[]).length&&!view.regionKeys.includes('all'))||(view.bottomLineMode&&view.bottomLineMode!=='all'));
  return ['candidate_discovery','candidate_refinement'].includes(prior)||scoped?'candidate_refinement':'candidate_discovery';
}

export function deterministicAgentTask({text='',schools=[],majors=[],regionKeys=[],score=null,workspace={},candidateIntent=false,compareIntent=false,rankIntent=false,bottomLineMode='',entityTurn={}}={}){
  const source=String(text||''),focus=workspace?.agentContext?.focus||{},priorTask=workspace?.agentContext?.currentTask||'';
  const school=schools[0]||focus.school||'',major=majors[0]||focus.major||'';
  const sourceWithoutSchoolNames=schools.reduce((value,name)=>value.split(String(name||'')).join(' '),source);
  const explicitMajors=majors.filter(item=>item&&(!schools.some(name=>String(name||'').includes(String(item||'')))||sourceWithoutSchoolNames.includes(String(item||''))));
  const scoreConstraint=scoreConstraintFromText(source),schoolTopic=schoolTopicBoundaryFromText(source),majorTopic=majorTopicBoundaryFromText(source);
  if(looksEducationKnowledgeQuestion(source,{schools,majors:explicitMajors})||looksKnowledgeFollowup(source,priorTask))return'knowledge_explain';
  const explicitStudentVoice=looksStudentVoice(source)&&!looksOfficialOutcomeMetric(source);
  if(explicitStudentVoice&&explicitMajors.length)return'student_voice';
  const entityKind=clean(entityTurn?.kind,30);
  if(entityKind==='score')return'fact_rank_lookup';
  if(entityKind==='score_school_major')return'fit_assessment';
  if(entityKind==='score_school')return'school_history';
  if(entityKind==='candidate_scope')return candidateTaskForCompactEntity(workspace);
  if(entityKind==='school_major')return'school_major_history';
  if(entityKind==='school'){
    if(focus.major&&['major_region_history','major_background'].includes(priorTask))return'school_major_history';
    return'school_research';
  }
  if(entityKind==='major'){
    if(focus.school&&['school_research','school_history','school_major_history','school_background','school_official_qa','school_experience','fit_assessment'].includes(priorTask))return'school_major_history';
    if(workspace?.examContext?.score||candidateTaskForCompactEntity(workspace)==='candidate_refinement')return candidateTaskForCompactEntity(workspace);
    return'general_advice';
  }
  if(entityKind==='region_major'){
    if(workspace?.examContext?.score||['candidate_discovery','candidate_refinement'].includes(priorTask)||candidateTaskForCompactEntity(workspace)==='candidate_refinement')return candidateTaskForCompactEntity(workspace);
    return'major_region_history';
  }
  if(entityKind==='region'){
    if(priorTask==='major_region_history'&&focus.major)return'major_region_history';
    if(workspace?.examContext?.score||['candidate_discovery','candidate_refinement'].includes(priorTask)||candidateTaskForCompactEntity(workspace)==='candidate_refinement')return candidateTaskForCompactEntity(workspace);
    return'region_school_directory';
  }
  const majorHistoryFollowup=priorTask==='major_region_history'&&!school&&(
    Boolean(bottomLineMode)||looksHistory(source)||
    (explicitMajors.length>0&&/(换成|改成|换个|另一个|再看|改看|纠正)/.test(source))||
    /^(继续|再看|展开|还有|全部|都列|往下看)/.test(source)
  );
  const resolvedSchoolGeneralQuestion=Boolean(schools.length&&/(怎么样|如何|咋样)[？?]?$/.test(source));
  const strippedSchoolReference=schools.reduce((value,name)=>value.split(String(name||'')).join(' '),source).replace(/[\s，,。！？!?；;：:]/g,'');
  const sourceBareSchool=source.replace(/[\s，,。！？!?；;：:]/g,'').replace(/(学校|大学|学院)$/,'');
  const resolvedBareSchool=String(school||'').replace(/(学校|大学|学院)$/,'');
  const bareResolvedSchool=Boolean(schools.length===1&&(!strippedSchoolReference||sourceBareSchool===resolvedBareSchool)&&['candidate_discovery','candidate_refinement','major_region_history','school_history','school_major_history','school_background','school_research','school_official_qa','school_experience','fit_assessment'].includes(priorTask));
  const explicitOfficialRequest=/(官方|阳光高考|招生章程|官网|官方资料|官方页面).{0,16}(宿舍|住宿|食堂|食宿|寝室|公寓)|(宿舍|住宿|食堂|食宿|寝室|公寓).{0,16}(官方|阳光高考|招生章程|官网|官方资料|官方页面)/.test(source);
  const experienceOnly=Boolean(school&&looksSchoolExperience(source)&&!explicitOfficialRequest&&!looksFit(source)&&!looksHistory(source)&&explicitMajors.length===0&&(schools.length||['school_major_history','school_history','school_research','school_official_qa','school_experience','fit_assessment','school_background'].includes(priorTask)||/(这个学校|这所学校|那个学校|那所学校|该校)/.test(source)));
  const broadSchoolResearch=Boolean(school&&(looksBroadSchoolResearch(source)||resolvedSchoolGeneralQuestion||bareResolvedSchool)&&!experienceOnly&&!looksFit(source)&&!looksBackground(source)&&!looksHistory(source)&&!looksSpecificOfficialTopic(source)&&explicitMajors.length===0&&(schools.length||['school_major_history','school_history','school_research','school_official_qa','school_experience','fit_assessment','school_background'].includes(priorTask)||/(这个学校|这所学校|那个学校|那所学校|该校)/.test(source)));
  const officialSchoolOnly=Boolean(school&&(looksOfficialSchoolInfo(source)||resolvedSchoolGeneralQuestion)&&!broadSchoolResearch&&!looksFit(source)&&!looksBackground(source)&&!/(多少分|最低分|最低录取分|最低投档分|录取分|投档分|分数线|位次|排名|去年|往年|历年)/.test(source)&&explicitMajors.length===0&&(schools.length||['school_major_history','school_history','school_research','school_official_qa','fit_assessment','school_background'].includes(priorTask)||/(这个学校|这所学校|那个学校|那所学校|该校)/.test(source)));
  const shortFollowup=/(呢[？?]?$|这个专业|这些专业|该专业|这个学校|这所学校|该校|换成|再看|那.{0,12}呢)/.test(source);
  if(looksPlanReview(source))return'plan_review';
  if(looksRestore(source))return'restore_view';
  if(rankIntent&&score&&!schools.length&&!majors.length)return'fact_rank_lookup';
  const hasRegionScope=Array.isArray(regionKeys)&&regionKeys.length>0&&!regionKeys.includes('all');
  if(!schools.length&&explicitMajors.length&&majorTopic.kind==='major_background'&&!looksFit(source))return'major_background';
  if(!schools.length&&explicitMajors.length&&hasRegionScope&&isScoreWindow(scoreConstraint)&&!looksFit(source)&&majorTopic.kind!=='major_background')return'major_region_history';
  if(!score&&!schools.length&&!explicitMajors.length&&hasRegionScope&&(looksRegionSchoolDirectoryLanguage(source)||(priorTask==='region_school_directory'&&looksRegionSchoolDirectoryFollowup(source))))return'region_school_directory';
  if(!score&&!schools.length&&explicitMajors.length&&hasRegionScope&&!looksFit(source)&&!looksBackground(source)&&(looksHistory(source)||looksMajorRegionSchoolList(source)||priorTask==='region_school_directory'))return'major_region_history';
  if(majorHistoryFollowup)return'major_region_history';
  if(bottomLineMode&&school&&['school_major_history','school_history'].includes(priorTask))return priorTask;
  if(school&&((explicitMajors.length===0&&looksImplicitAllSchoolMajorsHistory(source))||looksAllSchoolMajorsHistory(source)||(looksAllSchoolMajorsFollowup(source)&&['school_major_history','school_history'].includes(priorTask))))return'school_history';
  if(school&&looksHistoryCorrection(source))return explicitMajors.length?'school_major_history':'school_history';
  if(schools.length&&schoolTopic.kind==='school_background'&&!looksFit(source))return'school_background';
  if((looksBackground(source)||/有背景/.test(source))&&looksFit(source)&&/(省内|辽宁|方向|专业|这些|这批)/.test(source))return'background_fit_discovery';
  if(looksFit(source)&&(school||schools.length))return'fit_assessment';
  if(looksCompare(source)||compareIntent){
    if(schools.length>=2||(schools.length===1&&focus.school&&focus.school!==schools[0]))return'school_comparison';
    if(majors.length>=2||((focus.majors||[]).length>=2&&/(这几个专业|这些专业|刚才几个|它们)/.test(source)))return'major_comparison';
  }
  const directSchoolMajorFollowup=Boolean(schools.length&&majors.length&&!score&&/(呢[？?]?$|怎么样[？?]?$|如何[？?]?$|咋样[？?]?$|看看[？?]?$|多少分|最低分|投档分|录取分)/.test(source)&&!/(候选|能报|能上|只看|只留|筛|收窄|缩到|按我|我这个分)/.test(source));
  if(experienceOnly)return'school_experience';
  if(broadSchoolResearch)return'school_research';
  if(officialSchoolOnly)return'school_official_qa';
  if(directSchoolMajorFollowup&&explicitMajors.length)return'school_major_history';
  if(schools.length===1&&!majors.length&&priorTask==='major_background'&&focus.major&&!/(候选|能报|能上|比较|对比|强项|背景)/.test(source))return'school_major_history';
  const ordinalObjectFollowup=/(第一|第二|第三|第四|第五|第一个|第二个|第三个|第四个|第五个).{0,10}(呢|怎么样|如何|咋样|看看)?[？?]?$/.test(source);
  if(ordinalObjectFollowup&&!/(只看|只留|筛|保留|缩到|收窄)/.test(source)){
    if(schools.length&&majors.length)return'school_major_history';
    if(schools.length)return'school_history';
  }
  if(looksBackground(source)||(looksWorth(source)&&/(省内|辽宁|专业|方向)/.test(source))){
    if(major&&/(哪些学校|哪个学校|省内.{0,8}(学校|高校)|学校.{0,8}(有背景|强)|哪里.{0,8}(强|有背景))/.test(source))return'major_background';
    if(schools.length&&(/(这所|这个学校|学校|大学|学院|该校).{0,16}(强项|优势|背景|专业底子|更有底子|哪个专业|哪些专业)|强项.{0,8}(专业|方向)|有哪些.{0,8}(强项|优势|专业底子)|哪个专业.{0,6}(最好|最强|有底子)/.test(source)))return'school_background';
    if(looksWorth(source)||/(省内|辽宁).{0,12}(专业|方向)/.test(source))return explicitScoreUsage(source,workspace)==='active'?'background_fit_discovery':'background_discovery';
    return'background_discovery';
  }
  if(!school&&explicitMajors.length&&looksHistory(source)&&!looksFit(source))return'major_region_history';
  if(school&&explicitMajors.length&&looksHistory(source))return'school_major_history';
  if(school&&looksHistory(source))return'school_history';
  if(shortFollowup&&['school_major_history','school_history'].includes(priorTask)&&school){if(major||focus.major)return'school_major_history';return'school_history';}
  if(explicitScoreUsage(source,workspace)==='suspended'){
    if(['school_major_history','school_history','school_research','school_official_qa','school_experience','school_background','major_background','background_discovery','school_comparison','major_comparison'].includes(priorTask))return priorTask;
    if(school&&major)return'school_major_history';
    if(school)return'school_history';
  }
  if(looksVerify(source))return'evidence_verification';
  if(candidateIntent){
    const hasActive=Boolean(workspace?.activeView?.score||(workspace?.activeView?.majorKeywords||[]).length||(workspace?.activeView?.schoolNames||[]).length||((workspace?.activeView?.regionKeys||[]).length&&!workspace.activeView.regionKeys.includes('all')));
    return hasActive?'candidate_refinement':'candidate_discovery';
  }
  return'general_advice';
}
export function validateAgentTask(value,fallback='general_advice'){const task=clean(value,60);return AGENT_TASKS.includes(task)?task:fallback;}

export function taskExecutionPolicy(task,scoreUsage='remembered'){
  const score=CONTEXT_STATES.includes(scoreUsage)?scoreUsage:'remembered';
  switch(task){
    case'candidate_discovery':case'candidate_refinement':return{score:'active',region:'active',major:'active',school:'active',bottomLine:'active',commitView:true};
    case'major_region_history':return{score:'suspended',region:'active',major:'active',school:'remembered',bottomLine:'remembered',commitView:true};
    case'region_school_directory':return{score:score==='suspended'?'suspended':'remembered',region:'active',major:'remembered',school:'remembered',bottomLine:'remembered',commitView:false};
    case'fit_assessment':return{score:'active',region:'remembered',major:'active',school:'active',bottomLine:'remembered',commitView:false};
    case'background_fit_discovery':return{score:'active',region:'active',major:'remembered',school:'remembered',bottomLine:'remembered',commitView:false};
    case'knowledge_explain':return{score:score==='active'?'active':'remembered',region:'remembered',major:'remembered',school:'remembered',bottomLine:'remembered',commitView:false};
    case'school_major_history':case'school_history':case'school_research':case'school_official_qa':case'school_experience':case'student_voice':case'school_background':case'major_background':case'background_discovery':return{score:score==='suspended'?'suspended':'remembered',region:'remembered',major:'active',school:'active',bottomLine:'remembered',commitView:false};
    case'fact_rank_lookup':return{score:'active',region:'remembered',major:'remembered',school:'remembered',bottomLine:'remembered',commitView:false};
    default:return{score,region:'remembered',major:'remembered',school:'remembered',bottomLine:'remembered',commitView:false};
  }
}

export function agentTaskLabel(task){return({candidate_discovery:'建立可行范围',candidate_refinement:'继续收窄候选',fact_rank_lookup:'查询分数位次',school_major_history:'查询学校专业历史',school_history:'查询学校招生历史',major_region_history:'查询专业地区历史分数',region_school_directory:'查询地区高校目录',school_research:'研究这所学校',school_official_qa:'查询学校官方信息',school_experience:'查看学校环境与同学体验',student_voice:'查看大学生声音',fit_assessment:'判断当前分数是否够得着',school_comparison:'比较学校',major_comparison:'比较专业',background_discovery:'发现专业背景方向',background_fit_discovery:'找有背景且当前可达的方向',school_background:'看学校强项背景',major_background:'看专业对应学校背景',knowledge_explain:'解释教育/招生知识',evidence_verification:'核验招生事实',plan_review:'检查家庭方案',general_advice:'继续高报讨论',restore_view:'恢复前一批',save_family:'保存家庭长期条件'})[task]||'继续讨论';}

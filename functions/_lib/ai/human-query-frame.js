export const AI_HUMAN_QUERY_FRAME_VERSION='ai-human-query-frame-v0.04';

const SCORE_MIN=150;
const SCORE_MAX=750;
const ALL_SCHOOL_MAJOR_SCOPE_RE=/(?:所有|全部|全校|该校|这所学校|各个|各|每个|每一)(?:的)?(?:招生)?专业/;
const SCHOOL_TOPIC_PATTERNS=Object.freeze([
  Object.freeze({kind:'all_school_majors',re:ALL_SCHOOL_MAJOR_SCOPE_RE}),
  Object.freeze({kind:'school_background',re:/(?:哪个|哪些|什么|啥)(?:的)?专业.{0,10}(?:更有积累|有积累|最强|最好|有底子|更有底子|有背景|更强|优势)|(?:强项|优势|特色)(?:专业|方向)|(?:专业|学科)(?:优势|背景|底子|积累)|专业底蕴|有背景的专业|(?:有什么|有啥|有没有|有无)(?:专业|学科)?(?:背景|底子|积累|强项|优势)|(?:背景|底子|积累|强项|优势).{0,4}(?:怎么样|如何|咋样|呢)/}),
  Object.freeze({kind:'school_experience',re:/(?:学校|校园)(?:环境|氛围)|学习氛围|人文关怀|管理(?:人性|严格)|老师负责|辅导员|同学(?:评价|体验)|学生(?:评价|口碑)|真实体验|在校体验|宿舍|住宿|食堂|食宿|寝室|公寓/}),
  Object.freeze({kind:'school_official',re:/(?:官方|阳光高考|招生章程|官网|官方资料|官方页面)|办学性质|主管部门|校区|学费|收费|奖学金|助学金|联系方式|招生电话|录取规则|转专业|体检要求/}),
  Object.freeze({kind:'school_history',re:/(?:最低录取分|最低投档分|最低分|投档分|录取分|分数线|位次|排名|去年|往年|历年|所有专业|全部专业|全校专业|招生专业|专业都多少分|各专业多少分|分都多少分|大概都多少分|大约都多少分|都多少分|多少分)/}),
  Object.freeze({kind:'school_research',re:/(?:学校简介|学校介绍|学校定位|办学定位|什么学校|什么来头|整体怎么样|总体怎么样|大概怎么样|怎么样|如何|咋样)/})
]);
const MAJOR_TOPIC_PATTERNS=Object.freeze([
  Object.freeze({kind:'major_background',re:/(?:哪些|哪个|什么|啥)(?:学校|大学|高校|院校).{0,12}(?:有积累|更有积累|有背景|更有背景|有底子|底子好|更强|最强|有优势|优势大|更有优势)|(?:这个|该|这种)?专业.{0,10}(?:哪些|哪个|什么|啥)(?:学校|大学|高校|院校).{0,10}(?:强|有积累|有背景|有底子|有优势)|(?:在|于)?(?:辽宁|辽宁省|省内|沈阳|大连).{0,8}(?:哪里|哪些学校|哪个学校).{0,10}(?:强|有积累|有背景|有底子|有优势)|(?:哪里|哪儿).{0,8}(?:强|有积累|有背景|有底子|有优势)|(?:专业|方向).{0,8}(?:学校背景|院校背景|学校积累|院校积累)/}),
  Object.freeze({kind:'major_history',re:/(?:多少分|最低分|最低录取分|最低投档分|投档分|录取分|分数线|位次|排名|去年|往年|历年|从高到低|从高到底|最高到最低)/}),
  Object.freeze({kind:'major_school_list',re:/(?:哪些|哪个|什么|啥)(?:学校|大学|高校|院校)(?:有|开|招)(?:这个|该)?专业|(?:这个|该)?专业.{0,8}(?:哪些|哪个|什么|啥)(?:学校|大学|高校|院校)(?:有|开|招)?/})
]);

function text(value){return String(value==null?'':value).normalize('NFKC').trim();}
function validScore(value){const n=Math.round(Number(value));return Number.isFinite(n)&&n>=SCORE_MIN&&n<=SCORE_MAX?n:null;}
function normalizedRange(a,b){const left=validScore(a),right=validScore(b);if(left===null||right===null)return null;return left<=right?{min:left,max:right}:{min:right,max:left};}
function firstTopic(source,patterns){let best=null;for(const item of patterns){const match=item.re.exec(source);if(!match)continue;const candidate={kind:item.kind,explicit:true,index:match.index,token:match[0]};if(!best||candidate.index<best.index||(candidate.index===best.index&&candidate.token.length>best.token.length))best=candidate;}return best||{kind:'none',explicit:false,index:-1,token:''};}

export function scoreConstraintFromText(value=''){
  const source=text(value);
  if(!source)return{kind:'none',explicit:false,min:null,max:null,value:null,sourceText:''};

  const range=source.match(/(?:^|[^\d])(\d{3})\s*分?\s*(?:-|—|–|－|~|～|至|到)\s*(\d{3})\s*分?(?=$|[^\d])/);
  if(range){const normalized=normalizedRange(range[1],range[2]);if(normalized)return{kind:'range',explicit:true,...normalized,value:null,sourceText:range[0].trim()};}

  const lowerA=source.match(/(?:^|[^\d])(\d{3})\s*分?\s*(?:及以上|以上|往上|起步|起)(?=$|[^\d])/);
  const lowerB=source.match(/(?:不低于|至少|最低(?:要|得)?|下限(?:是|为)?)[^\d]{0,4}(\d{3})\s*分?/);
  const lower=validScore(lowerA?.[1]??lowerB?.[1]);
  if(lower!==null)return{kind:'min',explicit:true,min:lower,max:null,value:null,sourceText:(lowerA?.[0]||lowerB?.[0]||'').trim()};

  const upperA=source.match(/(?:^|[^\d])(\d{3})\s*分?\s*(?:及以下|以下|以内|往下)(?=$|[^\d])/);
  const upperB=source.match(/(?:不高于|至多|最高(?:到|是|为)?|上限(?:是|为)?)[^\d]{0,4}(\d{3})\s*分?/);
  const upper=validScore(upperA?.[1]??upperB?.[1]);
  if(upper!==null)return{kind:'max',explicit:true,min:null,max:upper,value:null,sourceText:(upperA?.[0]||upperB?.[0]||'').trim()};

  const pointMatch=source.match(/(?:^|[^\d])(\d{3})(?:\s*分)?(?=$|[^\d])/),point=validScore(pointMatch?.[1]);
  if(point!==null)return{kind:'point',explicit:true,min:point,max:point,value:point,sourceText:pointMatch[0].trim()};
  return{kind:'none',explicit:false,min:null,max:null,value:null,sourceText:''};
}

export function isScoreWindow(constraint={}){return['range','min','max'].includes(String(constraint?.kind||''));}
export function scoreWithinConstraint(score,constraint={}){
  const value=validScore(score);if(value===null)return false;
  const min=validScore(constraint?.min),max=validScore(constraint?.max);
  if(min!==null&&value<min)return false;
  if(max!==null&&value>max)return false;
  return Boolean(min!==null||max!==null);
}

export function backgroundScopeFromText(value=''){
  const source=text(value);
  if(!source)return{scope:'auto',explicit:false,index:-1,token:''};
  const backgroundLanguage=/(?:背景|底子|积累|强项|优势|建设学科|专业方向|学科方向)/.test(source);
  if(!backgroundLanguage)return{scope:'auto',explicit:false,index:-1,token:''};
  const match211=/(?:211(?:院校|高校|学校|里|范围|背景|专业背景)|(?:只看|看看|查询|查|在|从).{0,5}211)/.exec(source);
  const matchLiaoning=/(?:省内背景|辽宁(?:省)?(?:背景|院校|高校|学校|范围)?|省内(?:院校|高校|学校|范围)?)/.exec(source);
  if(match211&&(!matchLiaoning||match211.index<=matchLiaoning.index))return{scope:'211',explicit:true,index:match211.index,token:match211[0]};
  if(matchLiaoning)return{scope:'liaoning',explicit:true,index:matchLiaoning.index,token:matchLiaoning[0]};
  return{scope:'auto',explicit:false,index:-1,token:''};
}

export function collectionScopeFromText(value=''){
  const source=text(value),match=ALL_SCHOOL_MAJOR_SCOPE_RE.exec(source);
  if(match)return{kind:'all_school_majors',explicit:true,index:match.index,token:match[0]};
  return{kind:'none',explicit:false,index:-1,token:''};
}

export function schoolTopicBoundaryFromText(value=''){return firstTopic(text(value),SCHOOL_TOPIC_PATTERNS);}
export function majorTopicBoundaryFromText(value=''){return firstTopic(text(value),MAJOR_TOPIC_PATTERNS);}

export const HUMAN_QUERY_FRAME_TESTING=Object.freeze({SCORE_MIN,SCORE_MAX,ALL_SCHOOL_MAJOR_SCOPE_RE,SCHOOL_TOPIC_PATTERNS,MAJOR_TOPIC_PATTERNS});

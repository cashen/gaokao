export const AI_HUMAN_QUERY_FRAME_VERSION='ai-human-query-frame-v0.01';

const SCORE_MIN=150;
const SCORE_MAX=750;
const ALL_SCHOOL_MAJOR_SCOPE_RE=/(?:所有|全部|全校|该校|这所学校|各个|各|每个|每一)(?:的)?(?:招生)?专业/;

function text(value){return String(value==null?'':value).normalize('NFKC').trim();}
function validScore(value){const n=Math.round(Number(value));return Number.isFinite(n)&&n>=SCORE_MIN&&n<=SCORE_MAX?n:null;}
function normalizedRange(a,b){const left=validScore(a),right=validScore(b);if(left===null||right===null)return null;return left<=right?{min:left,max:right}:{min:right,max:left};}

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

export function collectionScopeFromText(value=''){
  const source=text(value),match=ALL_SCHOOL_MAJOR_SCOPE_RE.exec(source);
  if(match)return{kind:'all_school_majors',explicit:true,index:match.index,token:match[0]};
  return{kind:'none',explicit:false,index:-1,token:''};
}

export const HUMAN_QUERY_FRAME_TESTING=Object.freeze({SCORE_MIN,SCORE_MAX,ALL_SCHOOL_MAJOR_SCOPE_RE});

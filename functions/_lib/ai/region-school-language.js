export const AI_REGION_SCHOOL_LANGUAGE_VERSION='ai-region-school-language-v0.02';

function clean(value){return String(value||'').normalize('NFKC').trim();}
function compact(value){return clean(value).replace(/[\s，,。！!；;：:]/g,'');}

export function looksRegionSchoolDirectoryLanguage(text=''){
  const source=compact(text);
  if(!source)return false;
  if(/(?:多少分|最低分|投档分|录取分|分数线|位次|排名)/.test(source))return false;
  if(/(?:大学|学院|专科学校|高等专科学校).{0,8}(?:有哪些|有那些|有什么|有啥).{0,8}(?:专业|强项|优势|学科|学院|校区|宿舍|食堂|背景)/.test(source))return false;
  return /(?:(?:有哪些|有那些|都有(?:哪些|那些|什么|啥)|有什么|有啥|有多少|多少所|几所).{0,10}(?:大学|高校|院校|学校|本科(?:院校|大学)?|专科(?:院校|学校)?|高职(?:院校)?)|(?:大学|高校|院校|学校).{0,8}(?:有哪些|有那些|都有(?:哪些|那些|什么|啥)|名单|列表|名录|数量|总数|一共多少所|共有多少所|有多少所|几所|多不多)|(?:列一下|列出|给我看|给我看看|看看).{0,8}(?:大学|高校|院校|学校)|(?:所有|全部).{0,5}(?:本科院校|本科大学|专科院校|高职院校))/.test(source);
}

export function regionSchoolLevelFromText(text=''){
  const source=compact(text);
  if(/本科|本科院校|本科大学/.test(source))return'本科';
  if(/专科|高职|专科学校|高职院校/.test(source))return'专科';
  return'all';
}

export function looksRegionSchoolDirectoryFollowup(text=''){
  const source=compact(text);
  return /^(?:本科|本科院校|本科大学|专科|高职|专科院校|高职院校|全部|所有|都要|都有哪些|还有哪些|多少所|几所)(?:呢|有哪些|有那些|有多少|多少|吗)?[？?]?$/.test(source);
}

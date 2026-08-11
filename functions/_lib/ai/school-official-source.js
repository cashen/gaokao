export const AI_SCHOOL_OFFICIAL_SOURCE_VERSION='ai-school-official-source-v3990_2';
export const AI_SCHOOL_OFFICIAL_ORIGIN='https://gaokao.chsi.com.cn';

const TOPIC_LABELS=Object.freeze({
  profile:'学校简介',charter:'招生章程',admission_rule:'录取规则',living:'食宿条件',fees:'收费项目',contact:'联系办法',scholarship:'奖学金设置',departments:'院系设置',major_intro:'专业介绍',faq:'答考生问',employment:'毕业生就业',health:'体检要求'
});
const TOPIC_NAV_LABELS=Object.freeze({
  profile:['学校简介','院校简介'],charter:['招生章程'],admission_rule:['录取规则'],living:['食宿条件','住宿条件'],fees:['收费项目','收费标准'],contact:['联系办法','联系方式'],scholarship:['奖学金设置','奖助学金'],departments:['院系设置'],major_intro:['专业介绍'],faq:['答考生问'],employment:['毕业生就业','就业情况'],health:['体检要求']
});

function clean(value,max=500){return String(value==null?'':value).trim().slice(0,max);}
function normalizeSchoolName(value){return clean(value,160).normalize('NFKC').replace(/[\s·•（）()【】\[\]“”"'‘’]/g,'').toLowerCase();}
function decodeHtml(value=''){
  return String(value).replace(/&#x([0-9a-f]+);/gi,(_,hex)=>String.fromCodePoint(parseInt(hex,16))).replace(/&#(\d+);/g,(_,num)=>String.fromCodePoint(Number(num))).replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&quot;/gi,'"').replace(/&apos;|&#39;/gi,"'");
}
function absoluteOfficialUrl(href=''){
  const value=decodeHtml(clean(href,1200));
  if(!value)return'';
  try{const url=new URL(value,AI_SCHOOL_OFFICIAL_ORIGIN);return url.origin===AI_SCHOOL_OFFICIAL_ORIGIN?url.toString():'';}catch{return'';}
}
function anchorEntries(html=''){
  const entries=[];const source=String(html||'');const re=/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;let match;
  while((match=re.exec(source))){const href=absoluteOfficialUrl(match[1]);if(!href)continue;const text=htmlToOfficialPlainText(match[2]).replace(/\s+/g,' ').trim();if(text)entries.push({href,text});}
  return entries;
}
export function htmlToOfficialPlainText(html=''){
  let source=String(html||'');
  source=source.replace(/<!--[\s\S]*?-->/g,' ').replace(/<(script|style|noscript|svg|template)\b[\s\S]*?<\/\1>/gi,' ');
  source=source.replace(/<(br|hr)\s*\/?\s*>/gi,'\n').replace(/<\/(p|div|li|tr|td|th|section|article|h[1-6]|dl|dt|dd|ul|ol)>/gi,'\n');
  source=source.replace(/<[^>]+>/g,' ');source=decodeHtml(source);
  return source.replace(/\r/g,'').replace(/[\t\f\v ]+/g,' ').replace(/ *\n */g,'\n').replace(/\n{3,}/g,'\n\n').trim();
}
export function schoolOfficialTopic(question=''){
  const source=String(question||'');
  if(/(招生章程|章程)/.test(source))return'charter';
  if(/(录取规则|调档|退档|专业级差|志愿级差|转专业|录取原则)/.test(source))return'admission_rule';
  if(/(宿舍|住宿|食堂|食宿|寝室)/.test(source))return'living';
  if(/(学费|收费|费用|住宿费)/.test(source))return'fees';
  if(/(电话|联系方式|联系办法|招生办|招生网址|学校官网)/.test(source))return'contact';
  if(/(奖学金|助学金|奖助|资助)/.test(source))return'scholarship';
  if(/(院系|学院设置|院系设置)/.test(source))return'departments';
  if(/(专业介绍|专业设置|开设专业)/.test(source))return'major_intro';
  if(/(答考生问|常见问题|考生问)/.test(source))return'faq';
  if(/(就业|毕业去向|毕业生)/.test(source))return'employment';
  if(/(体检|身体条件|色盲|色弱|视力)/.test(source))return'health';
  return'profile';
}
export function schoolOfficialTopicLabel(topic='profile'){return TOPIC_LABELS[topic]||TOPIC_LABELS.profile;}

export function extractOfficialSchoolSearchMatch(html='',school=''){
  const target=normalizeSchoolName(school),candidates=[];
  for(const entry of anchorEntries(html)){
    const match=entry.href.match(/\/sch\/schoolInfo--schId-(\d+)/i);if(!match)continue;
    const normalized=normalizeSchoolName(entry.text);if(!normalized)continue;
    let score=0;if(normalized===target)score=1000;else if(normalized.includes(target)||target.includes(normalized))score=700-Math.abs(normalized.length-target.length);else{const chars=[...new Set([...target].filter(ch=>/[\u4e00-\u9fa5]/.test(ch)))],hits=chars.filter(ch=>normalized.includes(ch)).length;score=chars.length?Math.round(hits/chars.length*400):0;}
    if(score>0)candidates.push({schId:match[1],name:entry.text,href:entry.href,score});
  }
  candidates.sort((a,b)=>b.score-a.score||a.name.length-b.name.length);
  const best=candidates[0];if(!best||best.score<650)return null;return{schId:best.schId,name:best.name,href:best.href};
}
export function extractOfficialSchoolNavigation(html='',schId=''){
  const id=String(schId||''),out=[];const seen=new Set();
  for(const entry of anchorEntries(html)){
    if(id&&!new RegExp(`schId[-=]${id}(?:[^0-9]|$)`).test(entry.href))continue;
    const key=`${entry.text}|${entry.href}`;if(seen.has(key))continue;seen.add(key);out.push(entry);
  }
  return out;
}
export function extractLatestCharterLink(html='',school='',schId=''){
  const schoolNorm=normalizeSchoolName(school),id=String(schId||''),items=[];
  for(const entry of anchorEntries(html)){
    if(!/\/zsgs\/zhangcheng\//.test(entry.href))continue;
    if(!/(章程|招生)/.test(entry.text))continue;
    const textNorm=normalizeSchoolName(entry.text);const schoolScore=schoolNorm&&textNorm.includes(schoolNorm)?200:0;const idScore=id&&new RegExp(`schId[-=]${id}(?:[^0-9]|$)`).test(entry.href)?160:0;const year=Number((entry.text.match(/20\d{2}/)||[])[0]||0);items.push({...entry,score:schoolScore+idScore+year,year});
  }
  items.sort((a,b)=>b.year-a.year||b.score-a.score);return items[0]||null;
}
function selectedNavigationUrl(nav=[],topic='profile'){
  const labels=TOPIC_NAV_LABELS[topic]||TOPIC_NAV_LABELS.profile;
  for(const label of labels){const exact=nav.find(item=>item.text.trim()===label);if(exact)return exact.href;const partial=nav.find(item=>item.text.includes(label));if(partial)return partial.href;}
  return'';
}
function updatedAtFromText(text=''){
  const source=String(text||'');const patterns=[/学校信息更新时间[：:]?\s*(20\d{2}[-/.年]\d{1,2}[-/.月]\d{1,2}(?:日)?(?:\s+\d{1,2}:\d{2})?)/,/更新时间[：:]?\s*(20\d{2}[-/.年]\d{1,2}[-/.月]\d{1,2}(?:日)?(?:\s+\d{1,2}:\d{2})?)/,/(20\d{2}年\d{1,2}月\d{1,2}日)/];
  for(const re of patterns){const m=source.match(re);if(m?.[1])return clean(m[1],80);}return'';
}
function focusEvidenceText(text='',topic='profile',question=''){
  const source=String(text||'').replace(/\n{3,}/g,'\n\n').trim();if(source.length<=15000)return source;
  const needles=[schoolOfficialTopicLabel(topic),...String(question||'').match(/[\u4e00-\u9fa5]{2,8}/g)||[]].filter(Boolean);let at=-1;for(const needle of needles){at=source.indexOf(needle);if(at>=0)break;}if(at<0)at=0;const start=Math.max(0,at-1800);return source.slice(start,start+15000).trim();
}
async function fetchOfficialHtml(url,fetchImpl=fetch){
  const target=new URL(url,AI_SCHOOL_OFFICIAL_ORIGIN);if(target.origin!==AI_SCHOOL_OFFICIAL_ORIGIN)throw new Error('官方来源域名不在允许范围。');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),9000);
  try{
    const response=await fetchImpl(target.toString(),{method:'GET',headers:{accept:'text/html,application/xhtml+xml','user-agent':'Mozilla/5.0 (compatible; GaokaoAIPlus/1.0; +https://gaokao.powers.org.cn)'},signal:controller.signal,cf:{cacheEverything:true,cacheTtl:900}});
    if(!response?.ok)throw new Error(`阳光高考 HTTP ${response?.status||0}`);const text=await response.text();if(!text||text.length<200)throw new Error('阳光高考页面内容为空。');return{text,url:target.toString()};
  }finally{clearTimeout(timer);}
}
function searchUrlForSchool(school=''){const url=new URL('/sch/search.do',AI_SCHOOL_OFFICIAL_ORIGIN);url.searchParams.set('searchType','1');url.searchParams.set('yxmc',clean(school,120));url.searchParams.set('zymc','');url.searchParams.set('sySsdm','');url.searchParams.set('ssdm','');url.searchParams.set('yxls','');url.searchParams.set('yxlx','');url.searchParams.set('xlcc','');url.searchParams.set('bxlx','');return url.toString();}
function charterIndexUrls(school='',schId=''){const encodedSchool=encodeURIComponent(clean(school,120)),id=encodeURIComponent(String(schId||''));return[`${AI_SCHOOL_OFFICIAL_ORIGIN}/zsgs/zhangcheng/listVerifedZszc.do?method=index&yxmc=${encodedSchool}`,`${AI_SCHOOL_OFFICIAL_ORIGIN}/zsgs/zhangcheng/listVerifedZszc--method-index,schId-${id}.dhtml`];}

export async function loadOfficialSchoolEvidence({school,question='',fetchImpl=fetch}={}){
  const requestedSchool=clean(school,120);if(!requestedSchool)return{ok:false,code:'school_required',message:'需要先明确一所学校。'};
  const topic=schoolOfficialTopic(question),topicLabel=schoolOfficialTopicLabel(topic),search=await fetchOfficialHtml(searchUrlForSchool(requestedSchool),fetchImpl),match=extractOfficialSchoolSearchMatch(search.text,requestedSchool);
  if(!match)return{ok:false,code:'official_school_not_found',message:`阳光高考院校库暂未可靠匹配“${requestedSchool}”。`};
  const home=await fetchOfficialHtml(match.href,fetchImpl),nav=extractOfficialSchoolNavigation(home.text,match.schId);let selectedUrl=topic==='profile'?home.url:selectedNavigationUrl(nav,topic),selectedText='';let sourceScope=topicLabel;
  if(topic==='charter'){
    for(const indexUrl of charterIndexUrls(match.name,match.schId)){
      try{const indexPage=await fetchOfficialHtml(indexUrl,fetchImpl),charter=extractLatestCharterLink(indexPage.text,match.name,match.schId);if(charter){selectedUrl=charter.href;sourceScope=charter.text;break;}}catch{}
    }
    if(!selectedUrl){selectedUrl=selectedNavigationUrl(nav,'admission_rule');sourceScope='招生章程暂未定位，退回阳光高考录取规则';}
  }
  if(selectedUrl&&selectedUrl!==home.url){try{selectedText=(await fetchOfficialHtml(selectedUrl,fetchImpl)).text;}catch{selectedText='';}}
  const html=selectedText||home.text,plain=htmlToOfficialPlainText(html),evidenceText=focusEvidenceText(plain,topic,question),updatedAt=updatedAtFromText(plain)||updatedAtFromText(htmlToOfficialPlainText(home.text));
  if(!evidenceText)return{ok:false,code:'official_school_empty',message:`阳光高考暂未返回${match.name}的可读${topicLabel}。`};
  const selectedSource=selectedUrl||home.url,sources=[{sourceName:'阳光高考·院校信息库',sourceUrl:selectedSource,scope:sourceScope,updatedAt}];if(selectedSource!==home.url)sources.push({sourceName:'阳光高考·学校主页',sourceUrl:home.url,scope:'学校主页',updatedAt:updatedAtFromText(htmlToOfficialPlainText(home.text))});
  return{ok:true,sourceVersion:AI_SCHOOL_OFFICIAL_SOURCE_VERSION,school:match.name,schId:match.schId,topic,topicLabel,updatedAt,evidenceText,sources,fetchedAt:new Date().toISOString(),boundary:'只使用阳光高考公开页面作为本轮学校官方信息依据；未抓到的事实不补猜，录取分数和位次仍由站内确定性招生数据执行。'};
}

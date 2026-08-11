export const AI_SCHOOL_OFFICIAL_SOURCE_VERSION='ai-school-official-source-v3990_2';
export const AI_SCHOOL_OFFICIAL_ORIGIN='https://gaokao.chsi.com.cn';
export const AI_SCHOOL_OFFICIAL_READER_ORIGIN='https://r.jina.ai';
export const AI_SCHOOL_OFFICIAL_TRANSPORT_VERSION='chsi-only-reader-v3990_2';

const TOPIC_LABELS=Object.freeze({
  profile:'学校简介',charter:'招生章程',admission_rule:'录取规则',living:'食宿条件',fees:'收费项目',contact:'联系办法',scholarship:'奖学金设置',departments:'院系设置',major_intro:'专业介绍',faq:'答考生问',employment:'毕业生就业',health:'体检要求'
});
const TOPIC_NAV_LABELS=Object.freeze({
  profile:['学校简介','院校简介'],charter:['招生章程'],admission_rule:['录取规则'],living:['食宿条件','住宿条件'],fees:['收费项目','收费标准'],contact:['联系办法','联系方式'],scholarship:['奖学金设置','奖助学金'],departments:['院系设置'],major_intro:['专业介绍'],faq:['答考生问'],employment:['毕业生就业','就业情况'],health:['体检要求']
});
const TOPIC_MINDEX=Object.freeze({profile:1,departments:2,major_intro:3,admission_rule:4,scholarship:5,living:6,contact:7,faq:8});

function clean(value,max=500){return String(value==null?'':value).trim().slice(0,max);}
function normalizeSchoolName(value){return clean(value,160).normalize('NFKC').replace(/[\s·•（）()【】\[\]“”"'‘’]/g,'').toLowerCase();}
function decodeHtml(value=''){
  return String(value).replace(/&#x([0-9a-f]+);/gi,(_,hex)=>String.fromCodePoint(parseInt(hex,16))).replace(/&#(\d+);/g,(_,num)=>String.fromCodePoint(Number(num))).replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&quot;/gi,'"').replace(/&apos;|&#39;/gi,"'");
}
function absoluteOfficialUrl(href=''){
  const value=decodeHtml(clean(href,1600));
  if(!value)return'';
  try{const url=new URL(value,AI_SCHOOL_OFFICIAL_ORIGIN);return url.origin===AI_SCHOOL_OFFICIAL_ORIGIN?url.toString():'';}catch{return'';}
}
function pushAnchor(entries,seen,href,text){
  const official=absoluteOfficialUrl(href),label=htmlToOfficialPlainText(text).replace(/\s+/g,' ').trim();if(!official||!label)return;
  const key=`${label}|${official}`;if(seen.has(key))return;seen.add(key);entries.push({href:official,text:label});
}
function anchorEntries(input=''){
  const entries=[],seen=new Set(),source=String(input||'');let match;
  const htmlRe=/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  while((match=htmlRe.exec(source)))pushAnchor(entries,seen,match[1],match[2]);
  const markdownRe=/(?<!!)\[([^\]\n]{1,220})\]\((https:\/\/gaokao\.chsi\.com\.cn\/[^)\s]+)\)/gi;
  while((match=markdownRe.exec(source)))pushAnchor(entries,seen,match[2],match[1]);
  return entries;
}
export function htmlToOfficialPlainText(html=''){
  let source=String(html||'');
  source=source.replace(/<!--[\s\S]*?-->/g,' ').replace(/<(script|style|noscript|svg|template)\b[\s\S]*?<\/\1>/gi,' ');
  source=source.replace(/<(br|hr)\s*\/?\s*>/gi,'\n').replace(/<\/(p|div|li|tr|td|th|section|article|h[1-6]|dl|dt|dd|ul|ol)>/gi,'\n').replace(/<[^>]+>/g,' ');
  source=decodeHtml(source).replace(/^Title:.*$/gmi,' ').replace(/^URL Source:.*$/gmi,' ').replace(/^Markdown Content:\s*$/gmi,' ');
  source=source.replace(/!\[[^\]]*\]\([^)]*\)/g,' ').replace(/\[([^\]]+)\]\(https:\/\/gaokao\.chsi\.com\.cn\/[^)]+\)/g,'$1').replace(/\*\*|__|`/g,'');
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

export function extractOfficialSchoolSearchMatch(content='',school=''){
  const target=normalizeSchoolName(school),candidates=[];
  for(const entry of anchorEntries(content)){
    const match=entry.href.match(/\/sch\/schoolInfo--schId-(\d+)/i);if(!match)continue;
    const normalized=normalizeSchoolName(entry.text);if(!normalized)continue;
    let score=0;if(normalized===target)score=1000;else if(normalized.includes(target)||target.includes(normalized))score=700-Math.abs(normalized.length-target.length);else{const chars=[...new Set([...target].filter(ch=>/[\u4e00-\u9fa5]/.test(ch)))],hits=chars.filter(ch=>normalized.includes(ch)).length;score=chars.length?Math.round(hits/chars.length*400):0;}
    if(score>0)candidates.push({schId:match[1],name:entry.text,href:entry.href,score});
  }
  candidates.sort((a,b)=>b.score-a.score||a.name.length-b.name.length);
  const best=candidates[0];if(!best||best.score<650)return null;return{schId:best.schId,name:best.name,href:best.href};
}
export function extractOfficialSchoolNavigation(content='',schId=''){
  const id=String(schId||''),out=[];const seen=new Set();
  for(const entry of anchorEntries(content)){
    if(id&&!new RegExp(`schId[-=]${id}(?:[^0-9]|$)`).test(entry.href))continue;
    const key=`${entry.text}|${entry.href}`;if(seen.has(key))continue;seen.add(key);out.push(entry);
  }
  return out;
}
export function extractLatestCharterLink(content='',school='',schId=''){
  const schoolNorm=normalizeSchoolName(school),id=String(schId||''),items=[];
  for(const entry of anchorEntries(content)){
    if(!/\/zsgs\/zhangcheng\//.test(entry.href)||!/(章程|招生)/.test(entry.text))continue;
    const textNorm=normalizeSchoolName(entry.text),schoolScore=schoolNorm&&textNorm.includes(schoolNorm)?200:0,idScore=id&&new RegExp(`schId[-=]${id}(?:[^0-9]|$)`).test(entry.href)?160:0,year=Number((entry.text.match(/20\d{2}/)||[])[0]||0);items.push({...entry,score:schoolScore+idScore+year,year});
  }
  items.sort((a,b)=>b.year-a.year||b.score-a.score);return items[0]||null;
}
function selectedNavigationUrl(nav=[],topic='profile'){
  const labels=TOPIC_NAV_LABELS[topic]||TOPIC_NAV_LABELS.profile;
  for(const label of labels){const exact=nav.find(item=>item.text.trim()===label);if(exact)return exact.href;const partial=nav.find(item=>item.text.includes(label));if(partial)return partial.href;}
  return'';
}
function schoolInfoUrlForTopic(homeUrl='',topic='profile'){
  const mindex=TOPIC_MINDEX[topic];if(!mindex)return'';
  const official=absoluteOfficialUrl(homeUrl);if(!official)return'';
  if(/mindex-\d+/i.test(official))return official.replace(/mindex-\d+/i,`mindex-${mindex}`);
  return'';
}
function updatedAtFromText(text=''){
  const source=String(text||''),patterns=[/学校信息更新时间[：:]?\s*(20\d{2}[-/.年]\d{1,2}[-/.月]\d{1,2}(?:日)?(?:\s+\d{1,2}:\d{2})?)/,/更新时间[：:]?\s*(20\d{2}[-/.年]\d{1,2}[-/.月]\d{1,2}(?:日)?(?:\s+\d{1,2}:\d{2})?)/,/(20\d{2}年\d{1,2}月\d{1,2}日)/];
  for(const re of patterns){const m=source.match(re);if(m?.[1])return clean(m[1],80);}return'';
}
function focusEvidenceText(text='',topic='profile',question=''){
  const source=String(text||'').replace(/\n{3,}/g,'\n\n').trim();if(source.length<=15000)return source;
  const needles=[schoolOfficialTopicLabel(topic),...(String(question||'').match(/[\u4e00-\u9fa5]{2,8}/g)||[])].filter(Boolean);let at=-1;for(const needle of needles){at=source.indexOf(needle);if(at>=0)break;}if(at<0)at=0;return source.slice(Math.max(0,at-1800),Math.max(0,at-1800)+15000).trim();
}
function readerSourceUrl(text=''){
  const match=String(text||'').match(/^URL Source:\s*(https:\/\/gaokao\.chsi\.com\.cn\/\S+)/mi);return match?.[1]?absoluteOfficialUrl(match[1]):'';
}
function readerUrlForOfficial(target){return `${AI_SCHOOL_OFFICIAL_READER_ORIGIN}/${target.toString()}`;}
async function fetchOfficialHtml(url,fetchImpl=fetch){
  const target=new URL(url,AI_SCHOOL_OFFICIAL_ORIGIN);if(target.origin!==AI_SCHOOL_OFFICIAL_ORIGIN)throw new Error('官方来源域名不在允许范围。');
  const readerUrl=readerUrlForOfficial(target),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),28000);
  try{
    const response=await fetchImpl(readerUrl,{method:'GET',headers:{accept:'text/plain','x-timeout':'18'},signal:controller.signal,cf:{cacheEverything:true,cacheTtl:900}});
    if(!response?.ok)throw new Error(`官方页面 Reader HTTP ${response?.status||0}`);
    const text=await response.text();if(!text||text.length<80)throw new Error('阳光高考页面内容为空。');
    const sourceUrl=readerSourceUrl(text);if(!sourceUrl)throw new Error('Reader 未返回可验证的阳光高考 URL Source。');
    return{text,url:sourceUrl,targetUrl:target.toString(),transport:AI_SCHOOL_OFFICIAL_TRANSPORT_VERSION};
  }finally{clearTimeout(timer);}
}
function searchUrlForSchool(school=''){const url=new URL('/sch/search.do',AI_SCHOOL_OFFICIAL_ORIGIN);url.searchParams.set('searchType','1');url.searchParams.set('yxmc',clean(school,120));url.searchParams.set('zymc','');url.searchParams.set('sySsdm','');url.searchParams.set('ssdm','');url.searchParams.set('yxls','');url.searchParams.set('yxlx','');url.searchParams.set('xlcc','');url.searchParams.set('bxlx','');return url.toString();}
function charterIndexUrls(school='',schId=''){const encodedSchool=encodeURIComponent(clean(school,120)),id=encodeURIComponent(String(schId||''));return[`${AI_SCHOOL_OFFICIAL_ORIGIN}/zsgs/zhangcheng/listVerifedZszc.do?method=index&yxmc=${encodedSchool}`,`${AI_SCHOOL_OFFICIAL_ORIGIN}/zsgs/zhangcheng/listVerifedZszc--method-index,schId-${id}.dhtml`];}

export async function loadOfficialSchoolEvidence({school,question='',fetchImpl=fetch}={}){
  const requestedSchool=clean(school,120);if(!requestedSchool)return{ok:false,code:'school_required',message:'需要先明确一所学校。'};
  const topic=schoolOfficialTopic(question),topicLabel=schoolOfficialTopicLabel(topic),search=await fetchOfficialHtml(searchUrlForSchool(requestedSchool),fetchImpl),match=extractOfficialSchoolSearchMatch(search.text,requestedSchool);
  if(!match)return{ok:false,code:'official_school_not_found',message:`阳光高考院校库暂未可靠匹配“${requestedSchool}”。`};
  let homeUrl=match.href,homeText='',selectedUrl=topic==='profile'?homeUrl:schoolInfoUrlForTopic(homeUrl,topic),selectedText='',sourceScope=topicLabel;
  if(topic==='fees'){selectedUrl='';sourceScope='收费项目/招生章程';}
  if(topic==='health'){selectedUrl=schoolInfoUrlForTopic(homeUrl,'admission_rule');sourceScope='体检要求/录取规则';}
  if(topic==='charter'||topic==='fees'){
    for(const indexUrl of charterIndexUrls(match.name,match.schId)){
      try{const indexPage=await fetchOfficialHtml(indexUrl,fetchImpl),charter=extractLatestCharterLink(indexPage.text,match.name,match.schId);if(charter){selectedUrl=charter.href;sourceScope=charter.text;break;}}catch{}
    }
  }
  if(!selectedUrl||topic==='employment'){
    const home=await fetchOfficialHtml(homeUrl,fetchImpl);homeUrl=home.url;homeText=home.text;
    const nav=extractOfficialSchoolNavigation(home.text,match.schId);selectedUrl=selectedUrl||selectedNavigationUrl(nav,topic);if(topic==='employment')selectedUrl=selectedNavigationUrl(nav,'employment')||home.url;
  }
  if(!selectedUrl){selectedUrl=homeUrl;sourceScope=`${topicLabel}暂未定位，退回阳光高考学校主页`;}
  if(selectedUrl===homeUrl&&homeText)selectedText=homeText;else{try{selectedText=(await fetchOfficialHtml(selectedUrl,fetchImpl)).text;}catch{if(!homeText){try{const home=await fetchOfficialHtml(homeUrl,fetchImpl);homeUrl=home.url;homeText=home.text;}catch{}}selectedText=homeText;selectedUrl=homeUrl;sourceScope=`${topicLabel}页面暂不可读，退回阳光高考学校主页`;}}
  const plain=htmlToOfficialPlainText(selectedText),homePlain=homeText?htmlToOfficialPlainText(homeText):'',evidenceText=focusEvidenceText(plain,topic,question),updatedAt=updatedAtFromText(plain)||updatedAtFromText(homePlain);
  if(!evidenceText)return{ok:false,code:'official_school_empty',message:`阳光高考暂未返回${match.name}的可读${topicLabel}。`};
  const sources=[{sourceName:'阳光高考·院校信息库',sourceUrl:selectedUrl,scope:sourceScope,updatedAt}];if(homeUrl&&selectedUrl!==homeUrl)sources.push({sourceName:'阳光高考·学校主页',sourceUrl:homeUrl,scope:'学校主页',updatedAt:updatedAtFromText(homePlain)});
  return{ok:true,sourceVersion:AI_SCHOOL_OFFICIAL_SOURCE_VERSION,transportVersion:AI_SCHOOL_OFFICIAL_TRANSPORT_VERSION,school:match.name,schId:match.schId,topic,topicLabel,updatedAt,evidenceText,sources,fetchedAt:new Date().toISOString(),boundary:'本轮事实只来自阳光高考公开页面；网页读取通过 CHSI-only 只读 Reader 完成，来源链接仍指向阳光高考原页。未抓到的事实不补猜，家长问题、分数和位次不会发送给 Reader；录取分数和位次仍由站内确定性招生数据执行。'};
}

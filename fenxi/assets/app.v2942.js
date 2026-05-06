const DATA_FILES={
  manifest:'data/manifest.json',
  rank:'data/rank_2025_physics.json',
  taxonomy:'data/taxonomy_runtime/major_taxonomy.json',
  rawMajorAlias:'data/taxonomy_runtime/raw_major_alias.json',
  subjectGroups:'data/taxonomy_runtime/subject_groups.json',
  admissionReview:'data/taxonomy_runtime/admission_major_review_v2942.json',
  officialCatalog:'data/taxonomy_runtime/official_undergraduate_catalog_2026.json'
};
const CHUNK_CACHE = new Map();
let MANIFEST = null;
let loadedChunkIds = new Set();
let dataEngineReady = false;
let TAXONOMY_MAP = new Map();
let RAW_MAJOR_ALIAS = {};
let SUBJECT_GROUPS = [];
let ADMISSION_REVIEW_MAP = new Map();
let TAXONOMY_READY = false;
let OFFICIAL_CATALOG_2026 = null;
let DATA=[],META={},RANK2025={},currentRank=null,filtered=[],candidates=[],currentPage=1,pageSize=12,currentStrategy='employment',exclusionStats={'区域排除':0,'预算排除':0,'画像排除':0,'低匹配排除':0};
const PROVINCES=['北京','天津','河北','山西','内蒙古','辽宁','吉林','黑龙江','上海','江苏','浙江','安徽','福建','江西','山东','河南','湖北','湖南','广东','广西','海南','重庆','四川','贵州','云南','西藏','陕西','甘肃','青海','宁夏','新疆'];
const REGION_GROUPS={'辽宁省内':['辽宁'],'东北':['辽宁','吉林','黑龙江'],'京津冀':['北京','天津','河北'],'长三角':['上海','江苏','浙江','安徽'],'珠三角':['广东'],'成渝':['重庆','四川'],'全国':PROVINCES};
const LIAONING_PUBLIC=['辽宁大学','大连理工大学','东北大学','大连海事大学','中国医科大学','大连医科大学','沈阳药科大学','辽宁师范大学','沈阳师范大学','沈阳工业大学','沈阳航空航天大学','沈阳理工大学','辽宁科技大学','辽宁工程技术大学','辽宁石油化工大学','沈阳化工大学','大连交通大学','大连工业大学','沈阳建筑大学','沈阳农业大学','大连海洋大学','沈阳工程学院','沈阳大学','大连大学','辽宁工业大学','营口理工学院','辽东学院','鞍山师范学院','沈阳医学院','锦州医科大学','辽宁中医药大学','辽宁警察学院'];
const provinceHints=[['辽宁',/辽宁|沈阳|大连|鞍山|抚顺|锦州|营口|阜新|辽阳|盘锦|葫芦岛|本溪|丹东|东北大学|大连理工|大连海事|中国医科/],['吉林',/吉林|长春|延边|东北师范|东北电力|长春理工/],['黑龙江',/黑龙江|哈尔滨|东北林业|东北农业|哈尔滨工业|哈尔滨工程|齐齐哈尔|佳木斯/],['北京',/北京|清华|中国人民大学|中央财经|对外经济贸易|北京航空|北京理工|中国农业|北京师范|北京交通|北京邮电|北京科技|首都/],['天津',/天津|南开|河北工业/],['河北',/河北|石家庄|燕山|华北理工|保定|唐山/],['上海',/上海|复旦|同济|华东师范|上海交通|华东理工|东华|上海财经|上海大学/],['江苏',/江苏|南京|苏州|无锡|常州|扬州|南通|徐州|河海|东南|江南|中国矿业|南京航空|南京理工/],['浙江',/浙江|杭州|宁波|温州|嘉兴|湖州|绍兴|金华/],['安徽',/安徽|合肥|中国科学技术|安徽大学|合肥工业/],['广东',/广东|广州|深圳|华南理工|暨南|中山|南方科技|香港中文大学/],['重庆',/重庆|西南大学/],['四川',/四川|成都|电子科技|西南交通|西南财经|四川大学/],['山东',/山东|济南|青岛|烟台|威海|曲阜|中国海洋|中国石油大学/],['陕西',/陕西|西安|长安大学|西北大学|西安交通|西北工业|西安电子|陕西师范/],['湖北',/湖北|武汉|华中科技|华中师范|武汉理工|中国地质|中南财经政法/],['湖南',/湖南|长沙|中南大学|湖南大学|湘潭/],['河南',/河南|郑州|洛阳|新乡|开封/],['福建',/福建|厦门|福州|华侨/],['江西',/江西|南昌|赣南|九江/],['广西',/广西|桂林|南宁/],['海南',/海南|海口|三亚/],['山西',/山西|太原|中北/],['内蒙古',/内蒙古|呼和浩特|包头/],['贵州',/贵州|贵阳/],['云南',/云南|昆明/],['甘肃',/甘肃|兰州/],['新疆',/新疆|乌鲁木齐|石河子/]];
function fmt(n){return n===undefined||n===null||Number.isNaN(n)?'-':Number(n).toLocaleString('zh-CN')}
function debounce(fn,wait=280){let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),wait)}}
const debouncedAutoRefresh=debounce(autoRefresh,300);



function pageBaseUrl(){
  const u = new URL(window.location.href);
  u.hash = '';
  u.search = '';
  // /zxf/ 直接用；/zxf/index.html 去掉 index.html；/zxf 当成目录补 /
  if(u.pathname.endsWith('/')){
    return u.href;
  }
  if(/\.html?$/i.test(u.pathname)){
    u.pathname = u.pathname.replace(/[^/]+$/, '');
    return u.href;
  }
  u.pathname = u.pathname + '/';
  return u.href;
}
function dataUrl(file){
  const url = new URL(file, pageBaseUrl());
  url.searchParams.set('v','2942');
  return url.href;
}
async function loadJsonFile(file, label){
  const url = dataUrl(file);
  const r = await fetch(url, {cache:'no-store'});
  if(!r.ok){
    throw new Error(`${label}加载失败：${r.status} ${r.statusText} @ ${url}`);
  }
  try{
    return await r.json();
  }catch(e){
    throw new Error(`${label}不是有效JSON：${url}；${e.message}`);
  }
}





function cleanMajorFallback(raw){
  let s=String(raw||'').replace(/\s/g,'');
  s=s.replace(/[\(（][^()（）]*[\)）]/g,'');
  const alias={'电气工程及自动化':'电气工程及其自动化','机械设计制造及自动化':'机械设计制造及其自动化','计算机科学技术':'计算机科学与技术','大数据管理和应用':'大数据管理与应用'};
  return alias[s]||s;
}
function initTaxonomy(taxObj, aliasObj, groupObj, reviewObj){
  TAXONOMY_MAP = new Map();
  (taxObj.items||[]).forEach(x=>TAXONOMY_MAP.set(x.cleanMajor,x));
  RAW_MAJOR_ALIAS = (aliasObj&&aliasObj.items)||{};
  SUBJECT_GROUPS = (groupObj&&groupObj.groups)||[];
  ADMISSION_REVIEW_MAP = new Map();
  ((reviewObj&&reviewObj.items)||[]).forEach(x=>ADMISSION_REVIEW_MAP.set(x.rawMajor,x));
  TAXONOMY_READY = true;
  populateSubjectGroupFilter();
  const el=document.getElementById('taxonomySummary');
  if(el){
    el.textContent=`本科目录校准：已加载 ${fmt(TAXONOMY_MAP.size)} 个标准专业/专业类；原始专业别名 ${fmt(Object.keys(RAW_MAJOR_ALIAS).length)} 个；招生名复核 ${fmt(ADMISSION_REVIEW_MAP.size)} 个。`;
  }
}
function populateSubjectGroupFilter(){
  const sel=document.getElementById('filterSubjectGroup');
  if(!sel)return;
  const current=sel.value||'';
  const options=['<option value="">全部学科群</option>'].concat(
    SUBJECT_GROUPS.map(g=>`<option value="${g.name}">${g.name}（${fmt(g.recordCount)}）</option>`)
  );
  sel.innerHTML=options.join('');
  if(current)sel.value=current;
}
function taxonomyForMajor(raw){
  const alias=RAW_MAJOR_ALIAS[raw]||null;
  const clean=alias?.cleanMajor || cleanMajorFallback(raw);
  const item=TAXONOMY_MAP.get(clean);
  if(item)return {cleanMajor:clean, alias, item};
  return {
    cleanMajor:clean,
    alias,
    item:{
      cleanMajor:clean,
      majorKind: clean.endsWith('类')?'本科专业类':'本科专业',
      undergradDiscipline:null,
      undergradCategory:null,
      undergradMajor: clean.endsWith('类')?null:{name:clean},
      primaryDisciplines:[],
      subjectGroup:'其他/需复核',
      explain:'该专业尚未进入高置信映射表，建议人工复核。',
      warnings:['需人工复核'],
      overallConfidence:'low',
      matchMethod:'fallback',
      officialUndergrad2026:{kind:'unmatched',confidence:'low',source:'fallback',disciplineCode:'',disciplineName:'',categoryCode:'',categoryName:'',majorCode:'',majorName:'',flags:'',note:'未在2026本科专业目录中高置信匹配'}
    }
  };
}
function attachTaxonomy(r){
  const t=taxonomyForMajor(r.major);
  r.cleanMajor=t.cleanMajor;
  r.rawMajorAlias=t.alias;
  r.majorTaxonomy=t.item;
  r.officialUndergrad2026=t.item.officialUndergrad2026||null;
  r.subjectGroup=t.item.subjectGroup||'其他/需复核';
  r.taxonomyConfidence=(r.officialUndergrad2026?.confidence)||t.item.overallConfidence||'low';
  r.undergradDisciplineName=t.item.undergradDiscipline?.name||r.officialUndergrad2026?.disciplineName||'';
  r.undergradCategoryName=t.item.undergradCategory?.name||r.officialUndergrad2026?.categoryName||'';
  r.officialDisciplineCode=r.officialUndergrad2026?.disciplineCode||t.item.undergradDiscipline?.code||'';
  r.officialCategoryCode=r.officialUndergrad2026?.categoryCode||t.item.undergradCategory?.code||'';
  r.officialMajorCode=r.officialUndergrad2026?.majorCode||t.item.undergradMajor?.code||'';
  r.officialMajorName=r.officialUndergrad2026?.majorName||t.item.undergradMajor?.name||'';
  r.officialCatalogKind=r.officialUndergrad2026?.kind||'unmatched';
  r.officialFlags=r.officialUndergrad2026?.flags||'';
  r.primaryDisciplineNames=(t.item.primaryDisciplines||[]).map(x=>x.name).join(' / ');
  r.primaryDisciplineCodes=(t.item.primaryDisciplines||[]).map(x=>x.code).join(' / ');
  r.isMajorGroup=t.item.majorKind==='本科专业类'||r.officialCatalogKind==='category';
  r.taxonomyWarnings=t.item.warnings||[];
  return r;
}
function confidenceLabel(c){
  return c==='high'?'高可信':c==='medium'?'中可信':'需复核';
}

function admissionReviewLabel(r){
  const rv=r.admissionReview;
  if(!rv)return '<span class="review">招生名：待复核</span>';
  const cls=rv.confidence==='high'?'primary':(rv.confidence==='medium'?'review':'review');
  const txt=rv.tags?.length?rv.tags.join(' / '):(rv.status==='official_exact_or_cleaned'?'已按目录校准':'需看说明');
  return `<span class="${cls}">招生名复核：${txt}</span>`;
}
function renderAdmissionReviewDetail(r){
  const rv=r.admissionReview;
  if(!rv)return '<div class="tax-warn">招生专业名尚未进入复核表，建议人工核验。</div>';
  const comps=(rv.componentMajors||[]).slice(0,8).map(x=>`<div><span>${x.matched?'已识别':'未识别'}</span><b>${x.name}${x.matched?` → ${x.categoryCode||''}${x.categoryName||''} ${x.majorCode||''}${x.majorName||''}`:''}</b></div>`).join('');
  const warns=(rv.warnings||[]).map(x=>`<div class="tax-warn">${x}</div>`).join('');
  return `<div class="tax-grid"><div><span>招生名复核状态</span><b>${rv.status}｜${rv.confidence}</b></div><div><span>复核标签</span><b>${(rv.tags||[]).join(' / ')||'标准名称'}</b></div>${comps}</div>${warns}<div class="tax-warn">说明：试验班、大类混合招生、方向班、中外合作等，不改变本科目录口径；但会影响培养路径、分流、学费和就业理解，需以学校当年招生章程为准。</div>`;
}

function renderTaxonomyLine(r){
  const off=r.officialUndergrad2026;
  if(!off||off.kind==='unmatched')return '<div class="taxonomy-line"><span class="review">本科目录：需复核</span></div>';
  const officialPath=[`${off.disciplineCode||''}${off.disciplineName||''}`,`${off.categoryCode||''}${off.categoryName||''}`,off.majorCode?`${off.majorCode} ${off.majorName}`:'专业类招生'].filter(Boolean).join(' / ');
  const primary=r.primaryDisciplineNames||'研一级需复核';
  const cls=r.taxonomyConfidence==='low'?'review':'primary';
  const flagText=off.flags?` ${off.flags}`:'';
  return `<div class="taxonomy-line">
    <span class="path">本科目录2026：${officialPath}${flagText}</span>
    <span class="${cls}">研一级参考：${primary}</span>
    <span class="${cls}">${confidenceLabel(r.taxonomyConfidence)}</span>
  </div>`;
}
function renderTaxonomyDetail(r){
  const t=r.majorTaxonomy;
  if(!t)return '';
  const off=r.officialUndergrad2026||{};
  const warns=(r.taxonomyWarnings||[]).map(x=>`<div class="tax-warn">${x}</div>`).join('');
  const aliasNote=r.rawMajorAlias?.removedText?.length?`清洗备注：去除/保留识别项「${r.rawMajorAlias.removedText.join('；')}」`:'';
  const officialText=off.kind&&off.kind!=='unmatched'
    ? `${off.disciplineCode||''}${off.disciplineName||''} / ${off.categoryCode||''}${off.categoryName||''}${off.majorCode?` / ${off.majorCode} ${off.majorName}`:' / 专业类招生'}`
    : '2026本科专业目录未高置信命中，需人工复核';
  return `<details class="taxonomy-detail">
    <summary>查看本科目录与研一级参考</summary>
    <div class="tax-grid">
      <div><span>原始招生专业</span><b>${r.major||'-'}</b></div>
      <div><span>标准专业/专业类</span><b>${r.cleanMajor||'-'}</b></div>
      <div><span>官方本科目录2026</span><b>${officialText}</b></div>
      <div><span>T/K标记</span><b>${off.flags||'无'}${off.isSpecial?'｜特设专业':''}${off.isNationalControlled?'｜国家控制布点':''}</b></div>
      <div><span>研一级参考（非官方）</span><b>${r.primaryDisciplineNames||'需复核'}</b></div>
      <div><span>学科群</span><b>${r.subjectGroup||'其他/需复核'}</b></div>
      <div><span>目录匹配</span><b>${confidenceLabel(r.taxonomyConfidence)}｜${off.source||t.matchMethod||''}</b></div>
    </div>
    ${aliasNote?`<div class="tax-warn">${aliasNote}</div>`:''}
    ${warns}
    ${renderAdmissionReviewDetail(r)}
    <div class="tax-warn">说明：本科官方口径是“学科门类/专业类/本科专业”；本工具中的“研一级参考”仅用于高报理解与学科实力联想，不是本科专业目录的官方层级。</div>
  </details>`;
}

function guessSimpleCity(r){
  const s=(r.school||'')+' '+(r.major||'');
  if(/沈阳|东北大学|中国医科|沈阳药科|辽宁大学|辽宁中医药/.test(s))return '沈阳';
  if(/大连|大连理工|大连海事|东北财经/.test(s))return '大连';
  if((r.schoolProvince||'')==='辽宁')return '辽宁其他';
  return '省外';
}
function enrichRecord(r){
  return enrich(r);
}

function inferProvince(s){for(const [p,re] of provinceHints){if(re.test(s||''))return p}return ''}
const SCHOOL_NATURE_EXACT_MAP = {
  "东北大学": "public",
  "东北财经大学": "public",
  "中国医科大学": "public",
  "大连交通大学": "public",
  "大连医科大学": "public",
  "大连外国语大学": "public",
  "大连大学": "public",
  "大连工业大学": "public",
  "大连海事大学": "public",
  "大连海洋大学": "public",
  "大连理工大学": "public",
  "沈阳体育学院": "public",
  "沈阳农业大学": "public",
  "沈阳化工大学": "public",
  "沈阳医学院": "public",
  "沈阳大学": "public",
  "沈阳工业大学": "public",
  "沈阳工程学院": "public",
  "沈阳师范大学": "public",
  "沈阳建筑大学": "public",
  "沈阳理工大学": "public",
  "沈阳航空航天大学": "public",
  "沈阳药科大学": "public",
  "沈阳音乐学院": "public",
  "渤海大学": "public",
  "营口理工学院": "public",
  "辽东学院": "public",
  "辽宁中医药大学": "public",
  "辽宁大学": "public",
  "辽宁工业大学": "public",
  "辽宁工程技术大学": "public",
  "辽宁师范大学": "public",
  "辽宁石油化工大学": "public",
  "辽宁科技大学": "public",
  "辽宁科技学院": "public",
  "辽宁警察学院": "public",
  "锦州医科大学": "public",
  "鞍山师范学院": "public",
  "鲁迅美术学院": "public",
  "三亚学院": "private",
  "三峡大学科技学院": "private",
  "三江学院": "private",
  "上海中侨职业技术大学": "private",
  "上海外国语大学贤达经济人文学院": "private",
  "上海师范大学天华学院": "private",
  "上海建桥学院": "private",
  "上海杉达学院": "private",
  "上海视觉艺术学院": "private",
  "东南大学成贤学院": "private",
  "东莞城市学院": "private",
  "中国矿业大学徐海学院": "private",
  "中国计量大学现代科技学院": "private",
  "丽江文化旅游学院": "private",
  "云南经济管理学院": "private",
  "保定理工学院": "private",
  "兰州信息科技学院": "private",
  "兰州博文科技学院": "private",
  "北京中医药大学东方学院": "private",
  "北京城市学院": "private",
  "北京工业大学耿丹学院": "private",
  "北京科技大学天津学院": "private",
  "华北理工大学轻工学院": "private",
  "南京医科大学康达学院": "private",
  "南京审计大学金审学院": "private",
  "南京工业大学浦江学院": "private",
  "南京理工大学泰州科技学院": "private",
  "南京理工大学紫金学院": "private",
  "南京航空航天大学金城学院": "private",
  "南京财经大学红山学院": "private",
  "南京邮电大学通达学院": "private",
  "南华大学船山学院": "private",
  "南宁学院": "private",
  "南宁理工学院": "private",
  "南昌交通学院": "private",
  "南昌大学科学技术学院": "private",
  "南昌工学院": "private",
  "南昌理工学院": "private",
  "南昌航空大学科技学院": "private",
  "厦门华厦学院": "private",
  "厦门大学嘉庚学院": "private",
  "厦门工学院": "private",
  "合肥城市学院": "private",
  "吉利学院": "private",
  "吉林动画学院": "private",
  "吉林外国语大学": "private",
  "吉林师范大学博达学院": "private",
  "吉林建筑科技学院": "private",
  "哈尔滨信息工程学院": "private",
  "哈尔滨剑桥学院": "private",
  "哈尔滨华德学院": "private",
  "哈尔滨广厦学院": "private",
  "哈尔滨石油学院": "private",
  "哈尔滨远东理工学院": "private",
  "四川传媒学院": "private",
  "四川大学锦江学院": "private",
  "四川工业科技学院": "private",
  "大连东软信息学院": "private",
  "大连医科大学中山学院": "private",
  "大连工业大学艺术与信息工程学院": "private",
  "大连理工大学城市学院": "private",
  "大连科技学院": "private",
  "大连艺术学院": "private",
  "大连财经学院": "private",
  "天津仁爱学院": "private",
  "天津医科大学临床医学院": "private",
  "天津商业大学宝德学院": "private",
  "天津外国语大学滨海外事学院": "private",
  "天津天狮学院": "private",
  "天津理工大学中环信息学院": "private",
  "天津财经大学珠江学院": "private",
  "宁夏理工学院": "private",
  "安徽医科大学临床医学院": "private",
  "安徽新华学院": "private",
  "山东协和学院": "private",
  "山东工程职业技术大学": "private",
  "山东现代学院": "private",
  "山东英才学院": "private",
  "山东财经大学东方学院": "private",
  "山西工商学院": "private",
  "山西晋中理工学院": "private",
  "广东东软学院": "private",
  "广东外语外贸大学南国商学院": "private",
  "广东理工学院": "private",
  "广州华立学院": "private",
  "广州南方学院": "private",
  "广州商学院": "private",
  "广州城市理工学院": "private",
  "广州工商学院": "private",
  "广州新华学院": "private",
  "广州理工学院": "private",
  "广州软件学院": "private",
  "广西中医药大学赛恩斯新医药学院": "private",
  "广西外国语学院": "private",
  "成都东软学院": "private",
  "成都外国语学院": "private",
  "成都理工大学工程技术学院": "private",
  "成都银杏酒店管理学院": "private",
  "成都锦城学院": "private",
  "扬州大学广陵学院": "private",
  "新疆天山职业技术大学": "private",
  "无锡太湖学院": "private",
  "昆明医科大学海源学院": "private",
  "昆明文理学院": "private",
  "昆明理工大学津桥学院": "private",
  "晋中信息学院": "private",
  "柳州工学院": "private",
  "桂林信息科技学院": "private",
  "武昌理工学院": "private",
  "武汉城市学院": "private",
  "武汉学院": "private",
  "武汉工程大学邮电与信息工程学院": "private",
  "武汉生物工程学院": "private",
  "江苏科技大学苏州理工学院": "private",
  "江西农业大学南昌商学院": "private",
  "江西工程学院": "private",
  "江西师范大学科学技术学院": "private",
  "江西应用科技学院": "private",
  "江西科技学院": "private",
  "江西财经大学现代经济管理学院": "private",
  "沈阳城市学院": "private",
  "沈阳城市建设学院": "private",
  "沈阳工学院": "private",
  "沈阳科技学院": "private",
  "沧州交通学院": "private",
  "河北东方学院": "private",
  "河北医科大学临床学院": "private",
  "河北地质大学华信学院": "private",
  "河北外国语学院": "private",
  "河北工程大学科信学院": "private",
  "河北工程技术学院": "private",
  "河北师范大学汇华学院": "private",
  "河北科技学院": "private",
  "河北经贸大学经济管理学院": "private",
  "河南开封科技传媒学院": "private",
  "泉州信息工程学院": "private",
  "浙江工商大学杭州商学院": "private",
  "海口经济学院": "private",
  "湖北医药学院药护学院": "private",
  "湖北大学知行学院": "private",
  "湖南涉外经济学院": "private",
  "湖南科技大学潇湘学院": "private",
  "滇池学院": "private",
  "潍坊科技学院": "private",
  "烟台南山学院": "private",
  "烟台理工学院": "private",
  "烟台科技学院": "private",
  "珠海科技学院": "private",
  "电子科技大学成都学院": "private",
  "皖江工学院": "private",
  "石家庄铁道大学四方学院": "private",
  "福州外语外贸学院": "private",
  "福州大学至诚学院": "private",
  "茅台学院": "private",
  "西南交通大学希望学院": "private",
  "西南财经大学天府学院": "private",
  "西安交通大学城市学院": "private",
  "西安交通工程学院": "private",
  "西安外事学院": "private",
  "西安工商学院": "private",
  "西安建筑科技大学华清学院": "private",
  "西安明德理工学院": "private",
  "西安欧亚学院": "private",
  "西安科技大学高新学院": "private",
  "西安翻译学院": "private",
  "贵州黔南经济学院": "private",
  "贵阳信息科技学院": "private",
  "赣南师范大学科技学院": "private",
  "辽宁中医药大学杏林学院": "private",
  "辽宁传媒学院": "private",
  "辽宁何氏医学院": "private",
  "辽宁对外经贸学院": "private",
  "辽宁师范大学海华学院": "private",
  "辽宁理工学院": "private",
  "辽宁财贸学院": "private",
  "运城职业技术大学": "private",
  "郑州升达经贸管理学院": "private",
  "郑州商学院": "private",
  "郑州工业应用技术学院": "private",
  "郑州财经学院": "private",
  "重庆外语外事学院": "private",
  "重庆对外经贸学院": "private",
  "重庆移通学院": "private",
  "重庆财经学院": "private",
  "锦州医科大学医疗学院": "private",
  "长春人文学院": "private",
  "长春光华学院": "private",
  "长春大学旅游学院": "private",
  "长春工业大学人文信息学院": "private",
  "长春建筑学院": "private",
  "长春电子科技学院": "private",
  "长春科技学院": "private",
  "长春财经学院": "private",
  "长江大学文理学院": "private",
  "长沙医学院": "private",
  "长沙理工大学城南学院": "private",
  "闽南理工学院": "private",
  "陕西国际商贸学院": "private",
  "集美大学诚毅学院": "private",
  "青岛农业大学海都学院": "private",
  "青岛城市学院": "private",
  "青岛工学院": "private",
  "青岛恒星科技学院": "private",
  "青岛滨海学院": "private",
  "青岛黄海学院": "private",
  "香港珠海学院": "private",
  "黑龙江东方学院": "private",
  "黑龙江外国语学院": "private",
  "黑龙江工商学院": "private",
  "黑龙江工程学院昆仑旅游学院": "private",
  "黑龙江财经学院": "private",
  "齐鲁医药学院": "private",
  "齐鲁理工学院": "private",
  "齐齐哈尔工程学院": "private"
};


function guessSchoolNature(school){
  if(!school)return {label:'需核验',cls:'unknown',score:0};
  const normalized = school.replace(/[（(].*?[）)]/g,'').trim();

  const exact = SCHOOL_NATURE_EXACT_MAP[school] || SCHOOL_NATURE_EXACT_MAP[normalized];
  if(exact==='private')return {label:'民办/独立倾向',cls:'private',score:-30};
  if(exact==='public')return {label:'公办倾向',cls:'',score:20};

  const privateRe=/独立学院|民办|艺术与信息工程学院|贤达经济人文学院|天华学院|成贤学院|徐海学院|现代科技学院|耿丹学院|轻工学院|康达学院|金审学院|浦江学院|紫金学院|金城学院|红山学院|通达学院|船山学院|嘉庚学院|博达学院|锦江学院|中山学院|宝德学院|滨海外事学院|中环信息学院|珠江学院|南国商学院|赛恩斯新医药学院|工程技术学院|银杏酒店管理学院|广陵学院|海源学院|津桥学院|邮电与信息工程学院|南昌商学院|现代经济管理学院|华信学院|汇华学院|经济管理学院|药护学院|知行学院|潇湘学院|四方学院|至诚学院|希望学院|天府学院|华清学院|高新学院|医疗学院|人文信息学院|城南学院|诚毅学院|海都学院|昆仑旅游学院/;
  if(privateRe.test(school))return {label:'民办/独立倾向',cls:'private',score:-30};

  return {label:'需核验',cls:'unknown',score:0};
}


const SCHOOL_TIER_985 = new Set(["上海交通大学", "上海交通大学医学院", "东北大学", "东南大学", "中南大学", "中国人民大学", "中国人民解放军国防科技大学", "中国农业大学", "中国海洋大学", "中国科学技术大学", "中央民族大学", "中山大学", "兰州大学", "北京大学", "北京大学医学部", "北京师范大学", "北京理工大学", "北京航空航天大学", "华东师范大学", "华中科技大学", "华南理工大学", "南京大学", "南开大学", "厦门大学", "吉林大学", "同济大学", "哈尔滨工业大学", "四川大学", "国防科技大学", "复旦大学", "复旦大学上海医学院", "大连理工大学", "天津大学", "山东大学", "武汉大学", "浙江大学", "清华大学", "湖南大学", "电子科技大学", "西北农林科技大学", "西北工业大学", "西安交通大学", "重庆大学"]);
const SCHOOL_TIER_211 = new Set(["上海外国语大学", "上海大学", "上海财经大学", "东北农业大学", "东北师范大学", "东北林业大学", "东华大学", "中南财经政法大学", "中国人民解放军海军军医大学", "中国人民解放军空军军医大学", "中国传媒大学", "中国地质大学(北京)", "中国地质大学(武汉)", "中国政法大学", "中国石油大学(北京)", "中国石油大学(华东)", "中国矿业大学", "中国矿业大学(北京)", "中国药科大学", "中央财经大学", "中央音乐学院", "云南大学", "内蒙古大学", "北京中医药大学", "北京交通大学", "北京体育大学", "北京化工大学", "北京外国语大学", "北京工业大学", "北京林业大学", "北京科技大学", "北京邮电大学", "华东理工大学", "华中农业大学", "华中师范大学", "华北电力大学", "华南师范大学", "南京农业大学", "南京师范大学", "南京理工大学", "南京航空航天大学", "南昌大学", "合肥工业大学", "哈尔滨工程大学", "四川农业大学", "大连海事大学", "天津医科大学", "太原理工大学", "宁夏大学", "安徽大学", "对外经济贸易大学", "广西大学", "延边大学", "新疆大学", "暨南大学", "武汉理工大学", "江南大学", "河北工业大学", "河海大学", "海军军医大学", "海南大学", "湖南师范大学", "石河子大学", "福州大学", "空军军医大学", "第二军医大学", "第四军医大学", "苏州大学", "西北大学", "西南交通大学", "西南大学", "西南财经大学", "西安电子科技大学", "西藏大学", "贵州大学", "辽宁大学", "郑州大学", "长安大学", "陕西师范大学", "青海大学"]);
const SCHOOL_TIER_ALIAS = {
  "哈尔滨工业大学（深圳）":"哈尔滨工业大学","哈尔滨工业大学(深圳)":"哈尔滨工业大学","哈尔滨工业大学（威海）":"哈尔滨工业大学","哈尔滨工业大学(威海)":"哈尔滨工业大学",
  "山东大学（威海）":"山东大学","山东大学(威海)":"山东大学","山东大学威海分校":"山东大学","东北大学秦皇岛分校":"东北大学",
  "大连理工大学盘锦校区":"大连理工大学","大连理工大学（盘锦校区）":"大连理工大学","大连理工大学(盘锦校区)":"大连理工大学",
  "电子科技大学（沙河校区）":"电子科技大学","电子科技大学(沙河校区)":"电子科技大学",
  "合肥工业大学（宣城校区）":"合肥工业大学","合肥工业大学(宣城校区)":"合肥工业大学",
  "北京交通大学（威海校区）":"北京交通大学","北京交通大学(威海校区)":"北京交通大学",
  "北京邮电大学（宏福校区）":"北京邮电大学","北京邮电大学(宏福校区)":"北京邮电大学",
  "中国石油大学（北京）克拉玛依校区":"中国石油大学(北京)","中国石油大学(北京)克拉玛依校区":"中国石油大学(北京)",
  "华北电力大学（保定）":"华北电力大学","华北电力大学(保定)":"华北电力大学",
  "中国地质大学（北京）":"中国地质大学(北京)","中国地质大学（武汉）":"中国地质大学(武汉)",
  "中国矿业大学（北京）":"中国矿业大学(北京)","中国石油大学（北京）":"中国石油大学(北京)","中国石油大学（华东）":"中国石油大学(华东)"
};
function normalizeSchoolTierName(s){
  let raw=String(s||'').trim().replace(/\s+/g,'');
  if(SCHOOL_TIER_ALIAS[raw])return SCHOOL_TIER_ALIAS[raw];
  let noCampus=raw.replace(/[（(](盘锦校区|深圳校区|威海校区|沙河校区|宏福校区|宣城校区|保定校区|克拉玛依校区)[）)]/g,'').replace(/(盘锦校区|深圳校区|威海校区|沙河校区|宏福校区|宣城校区|保定校区|克拉玛依校区)$/g,'');
  return SCHOOL_TIER_ALIAS[noCampus]||noCampus;
}
function looksPublicLikeSchool(s){
  if(!s)return false;
  if(/独立学院|民办|艺术与信息工程学院|贤达经济人文学院|天华学院|成贤学院|徐海学院|现代科技学院|耿丹学院|轻工学院|康达学院|金审学院|浦江学院|紫金学院|金城学院|红山学院|通达学院|船山学院|嘉庚学院|博达学院|锦江学院|中山学院|宝德学院|滨海外事学院|中环信息学院|珠江学院|南国商学院|赛恩斯新医药学院|工程技术学院|银杏酒店管理学院|广陵学院|海源学院|津桥学院|邮电与信息工程学院|南昌商学院|现代经济管理学院|华信学院|汇华学院|经济管理学院|药护学院|知行学院|潇湘学院|四方学院|至诚学院|希望学院|天府学院|华清学院|高新学院|医疗学院|人文信息学院|城南学院|诚毅学院|海都学院|昆仑旅游学院/.test(s))return false;
  return /(大学|学院|医学院|师范学院|理工学院|工程学院|职业技术大学)$/.test(s);
}
function guessSchoolTier(school,nature){
  const raw=String(school||'').trim().replace(/\s+/g,'');
  const norm=normalizeSchoolTierName(raw);
  const n2=norm.replace(/[（(].*?[）)]/g,'');
  const natureLabel=nature?.label||'';
  const natureCls=nature?.cls||'';
  if(natureCls==='private' || /民办|独立/.test(natureLabel))return {label:'民办/独立',cls:'tier-private',level:'private',score:-30};
  const candidates=[raw,norm,n2,SCHOOL_TIER_ALIAS[raw],SCHOOL_TIER_ALIAS[norm]].filter(Boolean);
  if(candidates.some(x=>SCHOOL_TIER_985.has(x)))return {label:'985/211',cls:'tier-985',level:'985',score:60};
  if(candidates.some(x=>SCHOOL_TIER_211.has(x)))return {label:'211',cls:'tier-211',level:'211',score:45};
  if(/公办/.test(natureLabel))return {label:'双非公办',cls:'tier-public',level:'public',score:20};
  if(looksPublicLikeSchool(raw))return {label:'双非公办倾向',cls:'tier-public-soft',level:'publicSoft',score:8};
  return {label:'层级待核验',cls:'tier-unknown',level:'unknown',score:0};
}
function schoolTierLabel(r){return r?.schoolTier?.label||'层级待核验'}

function hasHighFee(r){const s=(r.major||'')+' '+(r.riskFlags||[]).join(' ');return /中外合作|高收费|合作办学|国际|学术互认|联合培养|中美|中英|中澳|中俄|中法|中德/.test(s)}
function enrich(r){r.schoolProvince=r.schoolProvince||inferProvince(r.school);r.schoolNature=r.schoolNatureLabel?{label:r.schoolNatureLabel,cls:r.schoolNatureCls||'unknown',score:r.schoolNatureScore||0}:guessSchoolNature(r.school);r.schoolTier=guessSchoolTier(r.school,r.schoolNature);r.majorText=(r.major||'').replace(/\s/g,'');r.isHighFee=hasHighFee(r);attachTaxonomy(r);return r}
function unlock(){if(document.getElementById('accessCode').value.trim()==='ln2025'){document.getElementById('app').classList.remove('locked');document.getElementById('gateBox').classList.add('hide');localStorage.setItem('ln_access_ok','1')}else alert('访问码不正确')}
function bootChips(){const pc=document.getElementById('provinceChips');pc.innerHTML=PROVINCES.map(p=>`<span class="chip" data-province="${p}">${p}</span>`).join('');selectRegionGroup('东北',true);document.querySelectorAll('.chip').forEach(ch=>{ch.addEventListener('click',()=>{const p=ch.parentElement;if(p.classList.contains('single')){p.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));ch.classList.add('active')}else ch.classList.toggle('active');if(ch.dataset.regionGroup){selectRegionGroup(ch.dataset.regionGroup,ch.classList.contains('active'))}autoRefresh()})})}
function selectedProvinces(){return[...document.querySelectorAll('#provinceChips .chip.active')].map(x=>x.dataset.province)}
function selectRegionGroup(g,active=true){const arr=REGION_GROUPS[g]||[];if(g==='全国'){document.querySelectorAll('#provinceChips .chip').forEach(c=>c.classList.toggle('active',active));return}document.querySelectorAll('#provinceChips .chip').forEach(c=>{if(arr.includes(c.dataset.province))c.classList.toggle('active',active)})}
function clearProvinces(){document.querySelectorAll('#provinceChips .chip,#regionGroupChips .chip').forEach(c=>c.classList.remove('active'))}
function setSingle(group,value){const box=document.querySelector(`[data-group="${group}"]`);if(!box)return;box.querySelectorAll('.chip').forEach(c=>c.classList.toggle('active',c.dataset.value===value))}
function getGroup(group){return document.querySelector(`[data-group="${group}"] .chip.active`)?.dataset.value||''}
function selectedRejects(){return[...document.querySelectorAll('#rejectChips .chip.active')].map(x=>x.dataset.reject)}
function applyStrategy(type){currentStrategy=type;document.querySelectorAll('.strategy-card').forEach(c=>c.classList.toggle('active',c.dataset.strategy===type));clearProvinces();document.querySelectorAll('#rejectChips .chip').forEach(c=>c.classList.remove('active'));document.getElementById('regionMode').value='hard';document.getElementById('budget').value='normal';document.getElementById('mentorMode').value='standard';document.getElementById('familyTolerance').value='low';document.getElementById('gradPlan').value='maybe';document.getElementById('timePressure').value='normal';setSingle('outProvince','yes');setSingle('medicine','neutral');setSingle('teacher','neutral');setSingle('liberal','neutral');setSingle('chem','neutral');setSingle('physics','neutral');setSingle('gridPower','neutral');
 if(type==='employment'){selectRegionGroup('东北');setSingle('outProvince','no');document.getElementById('priority').value='employment'}
 if(type==='grid'){selectRegionGroup('辽宁省内');setSingle('outProvince','no');setSingle('gridPower','prefer');setSingle('physics','prefer');document.getElementById('priority').value='grid';document.querySelector('[data-reject="高收费"]')?.classList.add('active')}
 if(type==='medical'){selectRegionGroup('全国');setSingle('medicine','prefer');setSingle('chem','prefer');document.getElementById('priority').value='employment';document.getElementById('gradPlan').value='yes';document.getElementById('timePressure').value='long'}
 if(type==='exam'){selectRegionGroup('全国');setSingle('liberal','prefer');document.getElementById('priority').value='exam'}
 if(type==='city'){selectRegionGroup('长三角');document.getElementById('priority').value='city'}
 if(type==='publicLow'){selectRegionGroup('东北');setSingle('outProvince','no');document.getElementById('priority').value='publicLow';document.getElementById('mentorMode').value='strict';document.querySelector('[data-reject="高收费"]')?.classList.add('active')}
 if(type==='school'){selectRegionGroup('全国');document.getElementById('regionMode').value='none';document.getElementById('priority').value='school'}
 if(type==='broad'){selectRegionGroup('全国');document.getElementById('regionMode').value='none';document.getElementById('priority').value='employment'}
 autoRefresh()}
function resetAll(){location.reload()}
function isMed(m){return/临床|口腔|医学|麻醉|儿科|药学|中医|护理|影像|眼视光|预防|基础医学|精神医学|针灸/.test(m)}
function isTeacher(m){return/师范|教育|小学教育|学前教育|特殊教育/.test(m)}
function isLiberal(m){return/法学|金融|经济|会计|财务|工商|管理|外语|英语|日语|俄语|法语|德语|西班牙|新闻|传播|汉语言|汉语国际|历史|哲学|社会|图书馆|档案|旅游/.test(m)}
function isChem(m){return/化学|化工|材料|环境|制药|药学|生物|食品|轻化|高分子|能源化学/.test(m)}
function isPhys(m){return/物理|力学|机械|车辆|航空|航天|飞行器|船舶|兵器|土木|测绘|建筑环境|能源与动力|过程装备/.test(m)}
function isGrid(m){return/电气|智能电网|能源与动力|新能源|储能|自动化|测控|电子信息|通信|核工程|电力|能源/.test(m)}
function isComp(m){return/计算机|软件|网络空间|人工智能|数据科学|物联网|信息安全|电子信息/.test(m)}
function isFinance(m){return/金融|经济|投资|保险|资产评估|国际经济与贸易/.test(m)}
function topFinance(s,rank){return/北京大学|清华大学|中国人民大学|复旦|上海交通|中央财经|上海财经|对外经济贸易|南开|厦门|西南财经|中南财经政法/.test(s||'')||(rank&&rank<8000)}
function isDeepTrap(m){return/环境科学|生态学|基础医学|心理学|生物科学|生物技术/.test(m)||/^(化学|应用化学|材料科学与工程|材料类)$/.test(m)}
function mentorRule(r,m){const mode=document.getElementById('mentorMode').value;if(mode==='off')return{delta:0,tags:[],notes:[],breakdown:[],exclude:false};const factor=mode==='mild'?.55:mode==='strict'?1.25:1;const fam=document.getElementById('familyTolerance').value,grad=document.getElementById('gradPlan').value,time=document.getElementById('timePressure').value,priority=document.getElementById('priority').value,rejects=selectedRejects();let delta=0,tags=[],notes=[],breakdown=[],exclude=false;function add(d,tag,note){delta+=d;tags.push(tag);notes.push(note);breakdown.push({delta:d,tag,note})}
 if(isGrid(m)){add(priority==='grid'?16:10,'电气/能源/自动化','路径清晰，普通家庭友好')}; if(isMed(m)){add(getGroup('medicine')==='prefer'?8:3,'医学执照路径','医学有执照保护，但周期长')}; if(isComp(m)){add(8,'技术路径','计算机仍有性价比，但要叠加AI能力')}; if(isTeacher(m)){add(7,'稳定路径','师范/教育可走稳定路径')}; if(isGrid(m)||/新能源|储能|核工程|能源与动力/.test(m))add(8,'AI低替代/受益','电力能源和AI基础设施相关') 
 if(/新闻|传播|俄语|日语|法语|德语|西班牙语|翻译/.test(m))add(-16,'AI冲击高','新闻/小语种基础岗位受AI影响'); if(isFinance(m)&&!topFinance(r.school,r.rank2025))add(fam==='low'?-18:-8,'强资源依赖','普通院校财经金融资源依赖高'); if(/工商管理|市场营销|行政管理|旅游管理|酒店管理|电子商务/.test(m))add(-12,'管理本科风险','本科管理类缺少硬技能'); if(isDeepTrap(m))add(-15,'深造依赖','本科就业弹性较弱，往往依赖读研读博'); if(/建筑学|工程造价|风景园林|园林|城乡规划/.test(m))add(-12,'行业周期风险','需复核行业周期')
 if(priority==='publicLow'){if(r.schoolNature.label==='公办倾向')add(25,'公办本科优先','低分段先保公办本科身份'); if(r.schoolNature.label==='民办/独立倾向')add(-30,'民办/独立倾向降权','当前策略优先保公办本科'); if(['辽宁','吉林','黑龙江'].includes(r.schoolProvince))add(10,'省内/东北优先','兼顾距离和家庭承受'); if(r.isHighFee)add(-40,'高收费强降权','不建议把高收费作为主体'); if(/食品|过程装备|测控|机械|材料成型|无机非金属|化工|工业工程|物流工程|工程管理/.test(m))add(8,'专业可让步方向','可作为保公办本科的复核方向')}
 if(fam==='low'&&r.isHighFee)add(-20,'成本风险','普通家庭不宜默认承担高收费项目'); if(grad==='no'&&isDeepTrap(m))add(-15,'不读研冲突','不想读研时不宜选择深造依赖专业'); if(time==='fast'&&isMed(m))add(-14,'时间压力冲突','医学培养周期较长'); if(rejects.includes('高收费')&&r.isHighFee){exclude=true;tags.push('拒绝项：高收费')}; if(rejects.includes('长学制')&&isMed(m))add(-22,'拒绝项：长学制','已选择不接受长学制/规培'); if(rejects.includes('工地现场')&&/土木|建筑环境|采矿|石油|油气|地质|测绘|过程装备/.test(m))add(-14,'拒绝项：现场环境','可能涉及现场或艰苦环境'); if(rejects.includes('夜班')&&/护理|临床|医学|急诊|麻醉/.test(m))add(-10,'拒绝项：夜班','可能存在夜班值班'); if(rejects.includes('销售')&&/金融|市场营销|保险|国际经济与贸易|电子商务/.test(m))add(-10,'拒绝项：销售','中位数岗位可能含营销属性')
 delta=Math.round(delta*factor); return{delta,tags:[...new Set(tags)].slice(0,6),notes:[...new Set(notes)].slice(0,3),breakdown:breakdown.slice(0,9),exclude}}
function profileScore(r){const m=r.majorText;let score=50,reasons=[],excludes=[];const provinces=selectedProvinces(),regionMode=document.getElementById('regionMode').value;if(regionMode!=='none'&&provinces.length){if(provinces.includes(r.schoolProvince)){score+=14;reasons.push('目标区域匹配')}else if(regionMode==='hard')excludes.push('不在目标区域');else score-=10}; if(getGroup('outProvince')==='no'&&r.schoolProvince&&r.schoolProvince!=='辽宁'){score-=18;reasons.push('省外降权')}; if(r.isHighFee&&document.getElementById('budget').value==='normal')excludes.push('高收费/中外合作不符合预算')
 if(isMed(m)){if(getGroup('medicine')==='prefer'){score+=18;reasons.push('医学意向匹配')}else if(getGroup('medicine')==='avoid')excludes.push('不学医')}; if(isTeacher(m)){if(getGroup('teacher')==='prefer'){score+=14;reasons.push('师范意向匹配')}else if(getGroup('teacher')==='avoid')excludes.push('不考虑师范')}; if(isLiberal(m)&&getGroup('liberal')==='avoid'){score-=18;reasons.push('经管法外语降权')}; if(isChem(m)&&getGroup('chem')==='avoid'){score-=22;reasons.push('化学/材料/生物降权')}; if(isPhys(m)&&getGroup('physics')==='prefer'){score+=14;reasons.push('物理/机械倾向匹配')}; if(isGrid(m)&&getGroup('gridPower')==='prefer'){score+=20;reasons.push('电气/电网/能源强相关')}; if((r.keySubjectHints||[]).length){score+=4;reasons.push('有重点学科提醒')}
 const z=mentorRule(r,m);score+=z.delta;reasons.push(...z.tags);if(z.exclude)excludes.push('网报名师规则排除项');score=Math.max(0,Math.min(100,score));return{score,reasons:[...new Set(reasons)].slice(0,7),excludes:[...new Set(excludes)],mentor:z}}
function resolveRank(){const r=Number(document.getElementById('myRank').value);if(r>0)return r;const s=String(Number(document.getElementById('myScore').value));return RANK2025[s]?Number(RANK2025[s]):null}
function getBandModel(){const m=document.getElementById('model').value;if(m==='safe')return{chong:[.93,.98],match:[.98,1.05],steady:[1.05,1.20],safe:[1.20,1.45]};if(m==='bold')return{chong:[.82,.97],match:[.97,1.06],steady:[1.06,1.18],safe:[1.18,1.35]};return{chong:[.88,.97],match:[.97,1.05],steady:[1.05,1.18],safe:[1.18,1.35]}}
function bandText(p){return currentRank?`${fmt(Math.round(currentRank*p[0]))} — ${fmt(Math.round(currentRank*p[1]))} 位`:'-'}
function classify(rank){if(!currentRank||!rank)return'';const b=getBandModel(),r=currentRank;if(rank<r*b.chong[0])return'超冲';if(rank>=r*b.chong[0]&&rank<=r*b.chong[1])return'可冲';if(rank>r*b.match[0]&&rank<=r*b.match[1])return'匹配';if(rank>r*b.steady[0]&&rank<=r*b.steady[1])return'稳妥';if(rank>r*b.safe[0]&&rank<=r*b.safe[1])return'保底';if(rank>r*b.safe[1])return'过低';return''}

function chunkIdsForRank(rank){
  if(!MANIFEST || !rank)return [];
  const model = document.getElementById('model')?.value || 'normal';
  const multiplier = model==='bold' ? [0.78,1.42] : model==='safe' ? [0.90,1.55] : [0.84,1.45];
  const minR = Math.max(0, Math.floor(rank * multiplier[0]));
  const maxR = Math.ceil(rank * multiplier[1]);
  return (MANIFEST.chunks||[]).filter(c => !(c.maxRank < minR || c.minRank > maxR)).map(c=>c.id);
}
async function loadChunkById(id){
  if(CHUNK_CACHE.has(id))return CHUNK_CACHE.get(id);
  const chunk = (MANIFEST.chunks||[]).find(c=>c.id===id);
  if(!chunk)return [];
  const obj = await loadJsonFile(chunk.file, '分块数据 '+id);
  const rows = (obj.records||[]).map(enrich);
  CHUNK_CACHE.set(id, rows);
  loadedChunkIds.add(id);
  return rows;
}
async function ensureDataForCurrentRank(){
  if(!MANIFEST)return;
  const rank = resolveRank();
  const metaEl = document.getElementById('metaRecords');
  if(!rank){
    DATA=[]; filtered=[];
    if(metaEl)metaEl.textContent=`已就绪｜总数据 ${fmt(MANIFEST.totalRecords)} 条｜2026本科目录+招生名已复核｜输入位次后加载对应分段`;
    return;
  }
  const ids = chunkIdsForRank(rank);
  if(metaEl)metaEl.textContent=`正在加载位次相关分段：${ids.join('、') || '无'}`;
  const parts = await Promise.all(ids.map(loadChunkById));
  const byId = new Map();
  parts.flat().forEach(r=>byId.set(r.id,r));
  DATA=[...byId.values()];
  if(metaEl)metaEl.textContent=`已加载 ${fmt(DATA.length)} 条相关数据｜全量 ${fmt(MANIFEST.totalRecords)} 条｜分块 ${ids.length} 个`;
}
async function autoRefreshAsync(){
  currentRank=resolveRank();
  if(currentRank){
    const b=getBandModel();
    document.getElementById('rankSummary').textContent=`当前参考位次：${fmt(currentRank)}。系统已按位次段加载数据。位次数值越小，要求越高。`;
    document.getElementById('bandChong').textContent=bandText(b.chong);
    document.getElementById('bandMatch').textContent=bandText(b.match);
    document.getElementById('bandSteady').textContent=bandText(b.steady);
    document.getElementById('bandSafe').textContent=bandText(b.safe);
  }else{
    const rs=document.getElementById('rankSummary');
    if(rs)rs.textContent='请输入位次或分数，系统会按位次段加载相关数据。';
  }
  await ensureDataForCurrentRank();
  applyFilters();
}
function autoRefresh(){
  autoRefreshAsync().catch(e=>{
    document.getElementById('metaRecords').textContent='计算失败';
    const fs=document.getElementById('filterSummary');
    if(fs)fs.innerHTML='计算失败：'+String(e.message).replace(/\n/g,'<br>');
    console.error(e);
  });
}


function confidence(r){
  if(r.status==='both' && r.rank2025 && r.rank2024 && !r.isHighFee)return {label:'高可信', cls:'high'};
  if(r.status==='both')return {label:'需复核', cls:'mid'};
  return {label:'谨慎看', cls:'low'};
}
function levelPill(level){
  return `<span class="level-pill ${level||''}">${level||'检索'}</span>`;
}
function renderRule(r){
  const lines=(r._mentor?.breakdown||r._zxf?.breakdown||[]).filter(x=>x.delta!==0);
  if(!lines.length)return '';
  return `<details class="rule-breakdown">
    <summary><span>网报名师规则明细</span></summary>
    <div class="rule-lines">${lines.map(x=>`<div class="rule-line ${x.delta>=0?'plus':'minus'}">
      <div class="sign">${x.delta>=0?'+':''}${x.delta}</div>
      <div><div class="tagtxt">${x.tag||'规则调整'}</div><div class="why">${x.note||''}</div></div>
    </div>`).join('')}</div>
  </details>`;
}
function judge(r){
  const parts=[];
  if(r._level==='匹配')parts.push('与当前位次接近，适合作为主体候选。');
  else if(r._level==='稳妥')parts.push('录取把握更高，适合中后段兜住。');
  else if(r._level==='保底')parts.push('偏保底，用来防滑档，但仍需看专业质量。');
  else if(r._level==='可冲')parts.push('可作为前段冲击对象，但不要押宝。');
  else if(r._level==='超冲')parts.push('明显偏冲，只适合少量观察。');
  else if(r._level==='过低')parts.push('位次放宽较多，不建议只因稳而选择。');
  if((r._reasons||[]).length)parts.push('匹配点：'+r._reasons.slice(0,3).join('；')+'。');
  if(r.rankChangeLabel)parts.push(r.rankChangeLabel+'，需结合计划变化复核。');
  return parts.join('');
}
function updateCounts(){
  const c={'可冲':0,'匹配':0,'稳妥':0,'保底':0,'超冲':0,'过低':0};
  (filtered||[]).forEach(r=>{ if(c[r._level]!==undefined)c[r._level]++; });
  const set=(id,val)=>{const el=document.getElementById(id); if(el)el.textContent=fmt(val);};
  set('cntAll',(filtered||[]).length);
  set('cntChong',c['可冲']);
  set('cntMatch',c['匹配']);
  set('cntSteady',c['稳妥']);
  set('cntSafe',c['保底']);
  const ex=exclusionStats||{'区域排除':0,'预算排除':0,'画像排除':0,'低匹配排除':0};
  set('exRegion',ex['区域排除']||0);
  set('exBudget',ex['预算排除']||0);
  set('exProfile',ex['画像排除']||0);
  set('exLowScore',ex['低匹配排除']||0);
  const fs=document.getElementById('filterSummary');
  if(fs){
    if(!currentRank) fs.textContent='已加载轻量索引。请输入分数或位次后，再加载对应位次段数据。';
    else fs.textContent=`当前结果：${fmt((filtered||[]).length)} 条。已按位次段加载相关数据；结果太多就收窄区域/偏好，太少就放宽条件。`;
  }
  updateNarrowGuide();
  renderDebugPanel();
}
function updateLive(){
  const set=(id,val)=>{const el=document.getElementById(id); if(el)el.textContent=fmt(val);};
  set('liveRank',currentRank||'-');
  set('liveTotal',(filtered||[]).length);
  set('liveMain',(filtered||[]).filter(r=>['匹配','稳妥'].includes(r._level)).length);
  set('liveSafe',(filtered||[]).filter(r=>r._level==='保底').length);
  set('cntSY',(filtered||[]).filter(r=>guessSimpleCity(r)==='沈阳').length);
  set('cntDL',(filtered||[]).filter(r=>guessSimpleCity(r)==='大连').length);
  set('cntLNOther',(filtered||[]).filter(r=>guessSimpleCity(r)==='辽宁其他').length);
  set('cntOut',(filtered||[]).filter(r=>guessSimpleCity(r)==='省外').length);
  const note=document.getElementById('lowPublicNote');
  if(note)note.classList.toggle('hide',currentStrategy!=='publicLow');
  const st=document.getElementById('liveStatus'),ad=document.getElementById('liveAdvice');
  if(!st||!ad)return;
  if(!currentRank){
    st.textContent='等待位次'; st.className='realtime-status warn';
    ad.textContent='请输入2025位次，或输入可换算的一分一段分数。';
  }else if((filtered||[]).length<20){
    st.textContent='结果偏少'; st.className='realtime-status danger';
    ad.textContent='当前结果偏少，建议放宽区域、关闭严格画像缩水，或减少拒绝项。';
  }else if((filtered||[]).length>300){
    st.textContent='结果偏多'; st.className='realtime-status warn';
    ad.textContent='当前结果偏多，建议继续限定区域、策略或明确不接受项。';
  }else{
    st.textContent='范围适中'; st.className='realtime-status';
    ad.textContent='结果数量适中。建议先看A/B/C三方案，再看匹配和稳妥候选。';
  }
}

function applyFilters(){
  const qS=document.getElementById('qSchool')?.value.trim()||'',
        qM=document.getElementById('qMajor')?.value.trim()||'',
        fLevel=document.getElementById('filterLevel')?.value||'',
        onlyKey=document.getElementById('onlyKey')?.checked,
        strict=document.getElementById('strictProfile')?.checked,
        sortBy=document.getElementById('sortBy')?.value||'profile',
        fSubject=document.getElementById('filterSubjectGroup')?.value||'',
        fPrimary=document.getElementById('filterPrimary')?.value.trim()||'',
        fTaxConfidence=document.getElementById('filterTaxConfidence')?.value||'',
        fSchoolTier=document.getElementById('filterSchoolTier')?.value||'';

  const exStats={'区域排除':0,'预算排除':0,'画像排除':0,'低匹配排除':0};

  let arr=DATA.map(r=>{
    const level=classify(r.rank2025), p=profileScore(r);
    const obj={...r,_level:level,_fit:currentRank&&r.rank2025?Math.abs(r.rank2025-currentRank):999999999,_profile:p.score,_reasons:p.reasons,_excludes:p.excludes,_mentor:p.mentor};
    obj._confidence=confidence(obj);
    return obj;
  });

  arr=arr.filter(r=>{
    if(qS&&!(r.school||'').includes(qS))return false;
    if(qM&&!((r.major||'').includes(qM)||(r.cleanMajor||'').includes(qM)||(r.primaryDisciplineNames||'').includes(qM)||(r.subjectGroup||'').includes(qM)))return false;
    if(fSubject&&r.subjectGroup!==fSubject)return false;
    if(fPrimary&&!((r.primaryDisciplineNames||'').includes(fPrimary)||(r.primaryDisciplineCodes||'').includes(fPrimary)||(r.cleanMajor||'').includes(fPrimary)||(r.undergradCategoryName||'').includes(fPrimary)||(r.officialCategoryCode||'').includes(fPrimary)||(r.officialMajorCode||'').includes(fPrimary)||(r.officialDisciplineCode||'').includes(fPrimary)||(r.officialMajorName||'').includes(fPrimary)))return false;
    const taxRank={high:3,medium:2,low:1,unknown:0};
    if(fTaxConfidence==='high'&&r.taxonomyConfidence!=='high')return false;
    if(fTaxConfidence==='medium'&&(taxRank[r.taxonomyConfidence]||0)<2)return false;
    if(fTaxConfidence==='review'&&!['low','unknown'].includes(r.taxonomyConfidence))return false;
    if(fSchoolTier==='985'&&r.schoolTier?.level!=='985')return false;
    if(fSchoolTier==='211'&&r.schoolTier?.level!=='211')return false;
    if(fSchoolTier==='public'&&!['public','publicSoft'].includes(r.schoolTier?.level))return false;
    if(fSchoolTier==='private'&&r.schoolTier?.level!=='private')return false;
    if(fSchoolTier==='unknown'&&r.schoolTier?.level!=='unknown')return false;
    if(fLevel&&r._level!==fLevel)return false;
    if(onlyKey&&!(r.keySubjectHints||[]).length)return false;
    if(strict&&r._excludes.length){
      const b=typeof exclusionBucket==='function'?exclusionBucket(r._excludes):'画像排除';
      exStats[b]=(exStats[b]||0)+1;
      return false;
    }
    if(strict&&r._profile<32){
      exStats['低匹配排除']=(exStats['低匹配排除']||0)+1;
      return false;
    }
    return true;
  });

  exclusionStats=exStats;

  arr.sort((a,b)=>sortBy==='rank2025'
    ? (a.rank2025||999999999)-(b.rank2025||999999999)
    : sortBy==='rankDiffHot'
      ? (a.rankDiff??999999999)-(b.rankDiff??999999999)
      : sortBy==='rankDiffLoose'
        ? (b.rankDiff??-999999999)-(a.rankDiff??-999999999)
        : sortBy==='fit'
          ? a._fit-b._fit
          : (b._profile-a._profile)||(a._fit-b._fit));

  filtered=arr;
  currentPage=1;
  updateCounts();
  renderPlanABC();
  renderCards();
  updateLive();
  if(typeof updateGuideState==='function')updateGuideState();
}
function parentLine(r){
  if(r._level==='匹配')return '这条与当前位次接近，适合作为主体候选，需要精读招生计划和专业组。';
  if(r._level==='稳妥')return '这条录取把握更高，适合放在中后段兜住，但仍要看专业质量。';
  if(r._level==='保底')return '这条偏保底，用来防滑档，不建议只因稳就盲选。';
  if(r._level==='可冲')return '这条是可冲候选，适合少量放在前段，不建议押宝。';
  if(r._level==='超冲')return '这条明显偏冲，除非特别喜欢，否则不要占用太多志愿位。';
  if(r._level==='过低')return '这条位次放宽较多，可以做兜底核验，但要防止专业和学校质量让步过大。';
  return '未输入位次时仅作检索参考。';
}
function exclusionBucket(ex){
  if(ex.some(x=>String(x).includes('区域')||String(x).includes('不在目标区域')))return '区域排除';
  if(ex.some(x=>String(x).includes('预算')||String(x).includes('高收费')))return '预算排除';
  if(ex.some(x=>String(x).includes('不学医')||String(x).includes('师范')||String(x).includes('画像')))return '画像排除';
  return '低匹配排除';
}

function renderCards(){const start=(currentPage-1)*pageSize,rows=filtered.slice(start,start+pageSize),el=document.getElementById('cards');el.innerHTML=rows.map(r=>{const reasons=(r._reasons||[]).slice(0,5).map(x=>`<span class="pill purple">${x}</span>`).join('');const risks=(r.riskFlags||[]).map(x=>`<span class="pill red">${x}</span>`).join('');const keys=(r.keySubjectHints||[]).slice(0,2).map(x=>`<span class="pill green">重点：${x}</span>`).join('');return`<div class="card level-${r._level}"><div class="cardTop"><div><div class="school">${r.school} <span class="pill">${r.schoolProvince||'省份待识别'}</span> <span class="pill nature-pill ${r.schoolNature.cls||'unknown'}">${r.schoolNature.label}</span> <span class="pill tier-pill ${r.schoolTier?.cls||'tier-unknown'}">${r.schoolTier?.label||'层级待核验'}</span></div><div class="major">${r.major}</div>${renderTaxonomyLine(r)}</div><div class="level">${levelPill(r._level)}</div></div><div style="margin-top:8px"><span class="pill blue">画像 ${Math.round(r._profile)}分</span>${r.rankChangeLabel?`<span class="pill blue">${r.rankChangeLabel}</span>`:''}</div><div class="score-meter"><i style="width:${Math.round(r._profile)}%"></i></div><div class="kv"><div><span>2025分/位</span><b>${fmt(r.score2025)} / ${fmt(r.rank2025)}</b></div><div><span>2024分/位</span><b>${fmt(r.score2024)} / ${fmt(r.rank2024)}</b></div><div><span>分差</span><b>${fmt(r.scoreDiff)}</b></div><div><span>位次差</span><b>${fmt(r.rankDiff)}</b></div></div><div>${reasons}${risks||'<span class="pill green">暂无风险标签</span>'}${keys}</div>${renderTaxonomyDetail(r)}<div class="judge"><b>高报师判断：</b>${judge(r)}</div>${renderRule(r)}<div class="row" style="margin-top:10px"><button class="secondary slim" onclick="addCandidate('${r.id}')">加入候选</button></div></div>`}).join('')||'<div class="notice">没有命中结果。可以放宽目标区域、关闭严格画像缩水，或清空关键词。</div>';const pages=Math.max(1,Math.ceil(filtered.length/pageSize));document.getElementById('pageInfo').textContent=`${currentPage} / ${pages}`}
function renderPlanABC(){const box=document.getElementById('planABC');if(!currentRank){box.innerHTML='';return}const usable=filtered.filter(r=>!r._excludes?.length);function pick(ls){return usable.filter(r=>ls.includes(r._level)).sort((a,b)=>(b._profile-a._profile)||(a._fit-b._fit))[0]}const A=pick(['可冲','超冲']),B=pick(['匹配','稳妥']),C=pick(['保底','稳妥']);function item(x,cls,title,txt){return x?`<div class="plan-card ${cls}"><h3>${title}</h3><b>${x.school}</b><p>${x.major}</p><p>${txt}｜${x._level}｜画像${Math.round(x._profile)}分｜2025位次${fmt(x.rank2025)}</p><p><b>为什么：</b>${(x._reasons||[]).slice(0,3).join('；')||'画像匹配度较高'}</p></div>`:`<div class="plan-card ${cls}"><h3>${title}</h3><p>暂无合适候选。可放宽区域或调整八连问。</p></div>`}box.innerHTML=item(A,'a','方案A：冲','只适合放前段，不押宝')+item(B,'b','方案B：稳','优先精读和核验')+item(C,'c','方案C：保','防滑档，但仍看专业质量')}
function nextPage(){const pages=Math.max(1,Math.ceil(filtered.length/pageSize));if(currentPage<pages){currentPage++;renderCards();document.getElementById('cards').scrollIntoView({behavior:'smooth'})}}function prevPage(){if(currentPage>1){currentPage--;renderCards();document.getElementById('cards').scrollIntoView({behavior:'smooth'})}}function toggleAdvanced(){document.getElementById('advancedFilters').classList.toggle('open')}
function addCandidate(id){const r=DATA.find(x=>x.id===id);if(r&&!candidates.find(x=>x.id===id))candidates.push(r);localStorage.setItem('ln_candidates_v292',JSON.stringify(candidates));renderCandidates();renderStructure()}
function renderStructure(){
  const el=document.getElementById('structureList'); if(!el)return;
  if(!candidates.length){el.innerHTML='<div class="structure-item">候选为空</div>';return;}
  const rows=candidates.map(r=>DATA.find(x=>x.id===r.id)||r).map(r=>typeof enrichRecord==='function'?enrichRecord(r):enrich(r));
  const count=fn=>rows.filter(fn).length;
  const warnings=[];
  if(count(r=>classify(r.rank2025)==='保底')===0)warnings.push('提醒：缺少保底');
  if(count(r=>['可冲','超冲'].includes(classify(r.rank2025)))>rows.length*0.45)warnings.push('提醒：冲得偏多');
  if(count(r=>r.isHighFee)>0)warnings.push('提醒：含高收费');
  if(count(r=>r.schoolProvince!=='辽宁')>rows.length*0.6)warnings.push('提醒：省外比例较高');
  const items=[`总数 ${rows.length}`,`冲 ${count(r=>['可冲','超冲'].includes(classify(r.rank2025)))}`,`稳/匹配 ${count(r=>['匹配','稳妥'].includes(classify(r.rank2025)))}`,`保底 ${count(r=>classify(r.rank2025)==='保底')}`,`公办倾向 ${count(r=>r.schoolNature?.label==='公办倾向')}`,`沈阳 ${count(r=>r.lnArea==='沈阳')} / 大连 ${count(r=>r.lnArea==='大连')}`,...warnings];
  el.innerHTML=items.map(x=>`<div class="structure-item">${x}</div>`).join('');
}

function renderCandidates(){document.getElementById('candidateList').innerHTML=candidates.map(r=>`<div class="candidate"><b>${r.school}</b><div>${r.major}</div><div class="small">2025：${fmt(r.score2025)} 分 / ${fmt(r.rank2025)} 位</div><button class="ghost slim" style="margin-top:8px" onclick="removeCandidate('${r.id}')">移除</button></div>`).join('')||'<p class="small">还没有加入候选。</p>'}function removeCandidate(id){candidates=candidates.filter(x=>x.id!==id);localStorage.setItem('ln_candidates_v292',JSON.stringify(candidates));renderCandidates()}function clearCandidates(){candidates=[];localStorage.removeItem('ln_candidates_v292');renderCandidates()}
function csvEscape(v){if(v==null)v='';v=String(v);return/[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v}function rowsToCsv(rows){
  const head=['学校','学校性质','院校层级','专业','标准专业','学科门类','专业类代码','本科专业类','专业代码','研一级参考','目录可信度','招生名复核','2025分','2025位次','2024分','2024位次','层级','画像分','风险'];
  const body=(rows||[]).map(r=>{
    r=enrich(r);
    return [r.school,r.schoolNature?.label||'',r.schoolTier?.label||'',r.major,r.cleanMajor,r.undergradDisciplineName,r.officialCategoryCode,r.undergradCategoryName,r.officialMajorCode,r.primaryDisciplineNames,confidenceLabel(r.taxonomyConfidence),r.admissionReviewTags||'',r.score2025,r.rank2025,r.score2024,r.rank2024,r._level||'',Math.round(r._profile||0),(r.riskFlags||[]).join('|')]
      .map(x=>`"${String(x??'').replace(/"/g,'""')}"`).join(',');
  });
  return [head.join(','),...body].join('\n');
}function download(name,text){const b=new Blob([text],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;a.click();URL.revokeObjectURL(a.href)}function exportFiltered(){download('辽宁物理类_V2.9.4.2筛选结果_本科目录校准.csv',rowsToCsv(filtered))}function exportCandidates(){download('辽宁物理类_V2.9.4.2候选清单_本科目录校准.csv',rowsToCsv(candidates.map(enrich)))}

function textVal(id){return document.getElementById(id)?.value||''}
function activeStrategyText(){
  return document.querySelector('#strategyCards .strategy-card.active .title')?.textContent?.trim()
      || document.querySelector('#strategyCards .strategy-card.active')?.textContent?.trim()
      || currentStrategy || '-';
}
function activeChips(boxId){
  return [...document.querySelectorAll(`#${boxId} .chip.active`)].map(x=>x.textContent.trim()).filter(Boolean);
}
function pickedSummary(){
  const provinces=selectedProvinces();
  return {
    score:textVal('myScore')||'-',
    rank: currentRank || resolveRank() || '-',
    strategy: activeStrategyText(),
    priority: textVal('priority')||'-',
    model: textVal('model')||'-',
    budget: textVal('budget')||'-',
    regionMode: textVal('regionMode')||'-',
    provinces: provinces.length ? (provinces.length<=8 ? provinces.join('、') : provinces.slice(0,8).join('、')+' 等'+provinces.length+'省') : '未限定',
    mentorMode: textVal('mentorMode')||'-',
    familyTolerance: textVal('familyTolerance')||'-',
    gradPlan: textVal('gradPlan')||'-',
    timePressure: textVal('timePressure')||'-',
    rejects: activeChips('rejectChips').join('、') || '无',
    schoolKeyword: textVal('qSchool')||'无',
    majorKeyword: textVal('qMajor')||'无',
    subjectGroup: textVal('filterSubjectGroup')||'全部',
    primary: textVal('filterPrimary')||'无',
    taxConfidence: textVal('filterTaxConfidence')||'全部',
    schoolTier: textVal('filterSchoolTier')||'全部',
    level: textVal('filterLevel')||'全部'
  };
}
function pickPlanRows(){
  const usable=(filtered||[]).filter(r=>!r._excludes?.length);
  const pick=(ls)=>usable.filter(r=>ls.includes(r._level)).sort((a,b)=>(b._profile-a._profile)||(a._fit-b._fit))[0]||null;
  return {
    A: pick(['可冲','超冲']),
    B: pick(['匹配','稳妥']),
    C: pick(['保底','稳妥'])
  };
}
function formatLevelText(r){return r?`${r._level||'-'}｜画像${Math.round(r._profile||0)}分｜2025位次${fmt(r.rank2025)}`:'暂无';}
function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight, color='#1f2d3d', font='28px sans-serif', maxLines=999){
  ctx.fillStyle=color; ctx.font=font;
  const raw=String(text??'');
  const paragraphs=raw.split(/\n/);
  let lines=[];
  paragraphs.forEach(p=>{
    let line='';
    for(const ch of p){
      const test=line+ch;
      if(ctx.measureText(test).width>maxWidth && line){ lines.push(line); line=ch; }
      else line=test;
    }
    if(line) lines.push(line);
    if(!p) lines.push('');
  });
  let drawn=0;
  for(let i=0;i<lines.length && drawn<maxLines;i++){
    let txt=lines[i];
    if(drawn===maxLines-1 && i<lines.length-1) txt=txt.replace(/.$/,'')+'…';
    ctx.fillText(txt,x,y+drawn*lineHeight);
    drawn++;
  }
  return drawn;
}
function roundRect(ctx,x,y,w,h,r,fill,stroke){
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
  if(fill){ctx.fillStyle=fill;ctx.fill();}
  if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}
}
function levelColor(level){
  return level==='匹配'?'#2e7d32':level==='稳妥'?'#1976d2':level==='保底'?'#f57c00':level==='可冲'?'#8e24aa':level==='超冲'?'#d32f2f':'#607d8b';
}
function drawTag(ctx,x,y,text,bg='#eef4ff',fg='#234'){ ctx.font='24px sans-serif'; const w=ctx.measureText(text).width+26; roundRect(ctx,x,y,Math.min(w,520),36,18,bg,null); ctx.fillStyle=fg; ctx.fillText(text,x+13,y+24); return Math.min(w,520)+10; }

function exportSummaryPng(kind='filtered'){
  const rows=(kind==='candidates' ? (candidates||[]).map(enrich) : (filtered||[]).map(enrich));
  if(!rows.length){
    alert(kind==='candidates'?'候选清单为空，无法导出 PNG。':'当前筛选结果为空，无法导出 PNG。');
    return;
  }

  const info=pickedSummary();
  const plan=pickPlanRows();
  const topRows=(kind==='candidates' ? rows : rows.slice(0,12));

  const W=1600, M=64, contentW=W-M*2;
  const rowH=128;
  const headerH=170;
  const summaryH=306;
  const planH=236;
  const statsH=96;
  const listH=92 + topRows.length*rowH;
  const footerH=120;
  const H=M + headerH + 24 + summaryH + 24 + planH + 24 + statsH + 24 + listH + footerH;

  const canvas=document.createElement('canvas');
  canvas.width=W;
  canvas.height=H;
  const ctx=canvas.getContext('2d');

  const grad=ctx.createLinearGradient(0,0,W,H);
  grad.addColorStop(0,'#f7fbff');
  grad.addColorStop(1,'#eef5ff');
  ctx.fillStyle=grad;
  ctx.fillRect(0,0,W,H);

  function safeText(v){return String(v??'').replace(/\s+/g,' ').trim();}
  function drawSectionTitle(title,x,y){
    ctx.fillStyle='#17324d';
    ctx.font='bold 30px sans-serif';
    ctx.fillText(title,x,y);
  }
  function drawInfoCard(x,y,w,h,label,value,opts={}){
    const bg=opts.bg||'#ffffff';
    const border=opts.border||'rgba(47,91,176,.12)';
    roundRect(ctx,x,y,w,h,18,bg,border);
    ctx.fillStyle='#7a8ca3';
    ctx.font='21px sans-serif';
    ctx.fillText(label,x+18,y+30);
    ctx.fillStyle=opts.valueColor||'#17324d';
    ctx.font=opts.valueFont||'bold 25px sans-serif';
    wrapCanvasText(ctx,value||'-',x+18,y+64,w-36,30,opts.valueColor||'#17324d',opts.valueFont||'bold 25px sans-serif',2);
  }
  function drawKVGrid(items,x,y,w,colCount,rowH){
    const gap=14;
    const colW=(w-gap*(colCount-1))/colCount;
    items.forEach((it,i)=>{
      const cx=x+(i%colCount)*(colW+gap);
      const cy=y+Math.floor(i/colCount)*rowH;
      drawInfoCard(cx,cy,colW,rowH-12,it[0],it[1],it[2]||{});
    });
  }

  let y=M;
  roundRect(ctx,M,y,contentW,headerH,30,'#183153',null);
  ctx.fillStyle='#fff';
  ctx.font='bold 44px sans-serif';
  ctx.fillText(kind==='candidates'?'辽宁物理类志愿工具｜候选清单 PNG 摘要':'辽宁物理类志愿工具｜当前筛选 PNG 摘要',M+38,y+58);
  ctx.font='24px sans-serif';
  ctx.fillStyle='rgba(255,255,255,.92)';
  ctx.fillText(`版本：V2.9.4.2｜生成时间：${new Date().toLocaleString('zh-CN')}`,M+38,y+100);
  wrapCanvasText(ctx,'说明：PNG 为当前页面摘要图，便于转发沟通；正式填报仍需复核招生计划、校区、体检、学费与专业组。',M+38,y+136,contentW-76,30,'rgba(255,255,255,.88)','23px sans-serif',1);
  y += headerH + 24;

  roundRect(ctx,M,y,contentW,summaryH,26,'#ffffff','rgba(47,91,176,.12)');
  drawSectionTitle('一、筛选条件摘要',M+26,y+42);

  const summaryItems=[
    ['成绩',`${info.score} 分`,{bg:'#f3f7ff'}],
    ['位次',`${fmt(info.rank)} 位`,{bg:'#f3f7ff'}],
    ['策略',safeText(info.strategy),{bg:'#f8fbff'}],
    ['优先级',safeText(info.priority),{bg:'#f8fbff'}],
    ['预算',safeText(info.budget),{bg:'#fffaf2'}],
    ['区域模式',safeText(info.regionMode),{bg:'#f8fbff'}],
    ['目标省份',safeText(info.provinces),{bg:'#f8fbff'}],
    ['规则强度',safeText(info.mentorMode),{bg:'#f8fbff'}]
  ];
  drawKVGrid(summaryItems,M+26,y+62,contentW-52,4,86);

  const longY=y+62+86*2+10;
  roundRect(ctx,M+26,longY,contentW-52,92,18,'#f9fbff','rgba(47,91,176,.10)');
  ctx.fillStyle='#7a8ca3';
  ctx.font='21px sans-serif';
  ctx.fillText('已启用细化条件',M+46,longY+30);
  const condText=[
    `拒绝项：${safeText(info.rejects)||'无'}`,
    `学科群：${safeText(info.subjectGroup)||'全部'}`,
    `专业类/研一级：${safeText(info.primary)||'无'}`,
    `学科可信度：${safeText(info.taxConfidence)||'全部'}`,
    `院校层级：${safeText(info.schoolTier)||'全部'}`,
    `层级：${safeText(info.level)||'全部'}`,
    `学校关键词：${safeText(info.schoolKeyword)||'无'}`,
    `专业关键词：${safeText(info.majorKeyword)||'无'}`
  ].join(' ｜ ');
  wrapCanvasText(ctx,condText,M+46,longY+62,contentW-92,28,'#314762','22px sans-serif',2);
  y += summaryH + 24;

  roundRect(ctx,M,y,contentW,planH,26,'#ffffff','rgba(47,91,176,.12)');
  drawSectionTitle('二、A / B / C 方案概览',M+26,y+42);
  const cols=[['A：冲',plan.A,'#f4e9ff','#7b1fa2'],['B：稳',plan.B,'#eaf3ff','#1565c0'],['C：保',plan.C,'#fff4e6','#ef6c00']];
  cols.forEach((it,idx)=>{
    const x=M+26+idx*((contentW-52)/3), yy=y+66, w=(contentW-92)/3;
    roundRect(ctx,x,yy,w,150,20,it[2],'rgba(0,0,0,.03)');
    ctx.fillStyle=it[3];
    ctx.font='bold 27px sans-serif';
    ctx.fillText(it[0],x+20,yy+36);
    const r=it[1];
    wrapCanvasText(ctx,r?String(r.school):'暂无合适候选',x+20,yy+72,w-40,28,'#183153','bold 24px sans-serif',1);
    wrapCanvasText(ctx,r?`${r.major}`:'可放宽区域或条件再筛选。',x+20,yy+104,w-40,26,'#334b68','22px sans-serif',1);
    wrapCanvasText(ctx,formatLevelText(r),x+20,yy+134,w-40,24,'#627b97','20px sans-serif',1);
  });
  y += planH + 24;

  roundRect(ctx,M,y,contentW,statsH,26,'#ffffff','rgba(47,91,176,.12)');
  drawSectionTitle('三、结果概况',M+26,y+40);
  const statItems=[
    ['当前结果',fmt((filtered||[]).length)],
    ['可冲',fmt((filtered||[]).filter(r=>r._level==='可冲').length)],
    ['匹配',fmt((filtered||[]).filter(r=>r._level==='匹配').length)],
    ['稳妥',fmt((filtered||[]).filter(r=>r._level==='稳妥').length)],
    ['保底',fmt((filtered||[]).filter(r=>r._level==='保底').length)]
  ];
  let statX=M+210;
  statItems.forEach(([k,v])=>{
    statX += drawTag(ctx,statX,y+20,`${k} ${v}`,'#f5f8fd','#38506a');
  });
  y += statsH + 24;

  roundRect(ctx,M,y,contentW,listH,26,'#ffffff','rgba(47,91,176,.12)');
  drawSectionTitle(kind==='candidates'?'四、候选清单':'四、前排结果摘要',M+26,y+42);
  wrapCanvasText(ctx,kind==='candidates'?'展示当前候选清单全部条目（若过多建议先清理）。':'为保证易读性，PNG 默认展示当前排序下前 12 条。',M+26,y+74,contentW-52,28,'#61778e','22px sans-serif',1);

  let yy=y+94;
  topRows.forEach((r,i)=>{
    const color=levelColor(r._level);
    roundRect(ctx,M+22,yy,contentW-44,rowH-14,18,'#fbfdff','rgba(23,49,83,.08)');
    roundRect(ctx,M+40,yy+18,92,32,16,color,null);
    ctx.fillStyle='#fff';
    ctx.font='bold 20px sans-serif';
    ctx.fillText(r._level||'-',M+60,yy+40);

    wrapCanvasText(ctx,`${i+1}. ${r.school}｜${r.schoolTier?.label||'层级待核验'}`,M+154,yy+36,560,28,'#17324d','bold 25px sans-serif',1);
    wrapCanvasText(ctx,`${r.major}`,M+154,yy+70,640,26,'#334b68','22px sans-serif',1);
    wrapCanvasText(ctx,`2025：${fmt(r.score2025)}分 / ${fmt(r.rank2025)}位｜2024：${fmt(r.score2024)}分 / ${fmt(r.rank2024)}位｜画像 ${Math.round(r._profile||0)}分`,M+154,yy+100,700,24,'#5f7691','20px sans-serif',1);

    wrapCanvasText(ctx,`本科类：${r.officialCategoryCode||''}${r.undergradCategoryName||'待复核'}｜研一级：${r.primaryDisciplineNames||'待复核'}｜招生名：${r.admissionReviewTags||'已校准'}`,M+900,yy+40,contentW-980,24,'#24507b','20px sans-serif',2);
    wrapCanvasText(ctx,`判断：${judge(r)||'—'}`,M+900,yy+92,contentW-980,23,'#6b7f93','19px sans-serif',2);
    yy += rowH;
  });
  y += listH + 24;

  wrapCanvasText(ctx,'注：本摘要图用于初选沟通，不替代正式志愿表。中外合作、高收费、专业类分流、一级学科映射置信度低等情况，请务必再做人工核验。',M,y+26,contentW,28,'#627b97','20px sans-serif',2);

  const name=kind==='candidates'?'辽宁物理类_V2.9.4.2_候选清单摘要.png':'辽宁物理类_V2.9.4.2_筛选摘要.png';
  const a=document.createElement('a');
  a.href=canvas.toDataURL('image/png');
  a.download=name;
  a.click();
}
function exportFilteredPng(){ exportSummaryPng('filtered'); }
function exportCandidatesPng(){ exportSummaryPng('candidates'); }

function openExportSheet(){document.getElementById('exportSheet')?.classList.remove('hide');document.getElementById('exportSheetMask')?.classList.remove('hide')}
function closeExportSheet(){document.getElementById('exportSheet')?.classList.add('hide');document.getElementById('exportSheetMask')?.classList.add('hide')}
function activeConditionCount(){
  let n=0;
  ['qSchool','qMajor','filterSubjectGroup','filterPrimary','filterTaxConfidence','filterLevel'].forEach(id=>{if((document.getElementById(id)?.value||'').trim())n++});
  if(selectedRejects().length)n++;
  if(selectedProvinces().length)n++;
  if(document.getElementById('onlyKey')?.checked)n++;
  return n;
}
function quickNarrow(action){
  if(action==='ln'){
    clearProvinces();selectRegionGroup('辽宁省内',true);document.getElementById('regionMode').value='hard';setSingle('outProvince','no');
  }
  if(action==='northeast'){
    clearProvinces();selectRegionGroup('东北',true);document.getElementById('regionMode').value='hard';
  }
  if(action==='tech'){
    const sel=document.getElementById('filterSubjectGroup'); if(sel) sel.value='电子信息与通信';
  }
  if(action==='grid'){
    const sel=document.getElementById('filterSubjectGroup'); if(sel) sel.value='电气能源与自动化'; setSingle('gridPower','prefer');
  }
  if(action==='computer'){
    const sel=document.getElementById('filterSubjectGroup'); if(sel) sel.value='计算机与软件';
  }
  if(action==='noHighFee'){
    document.getElementById('budget').value='normal'; document.querySelector('[data-reject="高收费"]')?.classList.add('active');
  }
  if(action==='clearKeywords'){
    ['qSchool','qMajor','filterPrimary'].forEach(id=>{const el=document.getElementById(id); if(el)el.value=''});
    const sg=document.getElementById('filterSubjectGroup'); if(sg)sg.value='';
    const tc=document.getElementById('filterTaxConfidence'); if(tc)tc.value='';
  }
  autoRefresh();
  document.getElementById('resultBox')?.scrollIntoView({behavior:'smooth',block:'start'});
}
function updateNarrowGuide(){
  const el=document.getElementById('narrowGuide'); if(!el)return;
  if(!currentRank){el.className='narrow-guide hide';el.innerHTML='';return;}
  const total=(filtered||[]).length;
  if(total===0){
    el.className='narrow-guide danger';
    el.innerHTML=`<b>没有命中结果。</b><br/>建议放宽区域、清空关键词，或关闭严格画像缩水。<div class="guide-actions"><button onclick="quickNarrow('clearKeywords')">清空学科/关键词</button><button onclick="document.getElementById('strictProfile').checked=false;autoRefresh()">关闭严格画像</button><button onclick="clearProvinces();document.getElementById('regionMode').value='none';autoRefresh()">放宽区域</button></div>`;
  }else if(total>500){
    el.className='narrow-guide';
    el.innerHTML=`<b>结果偏多：${fmt(total)} 条。</b><br/>建议先按“区域 / 学科群 / 预算风险”做第一轮收窄，手机端会更好读。<div class="guide-actions"><button onclick="quickNarrow('ln')">只看辽宁</button><button onclick="quickNarrow('northeast')">东北优先</button><button onclick="quickNarrow('computer')">计算机</button><button onclick="quickNarrow('tech')">电子信息</button><button onclick="quickNarrow('grid')">电气能源</button><button class="warn" onclick="quickNarrow('noHighFee')">排除高收费</button></div>`;
  }else if(total<=80){
    el.className='narrow-guide good';
    el.innerHTML=`<b>结果范围适合精读：${fmt(total)} 条。</b><br/>可以逐条看专业归属、学科置信度和风险标签，再加入候选。`;
  }else{
    el.className='narrow-guide good';
    el.innerHTML=`<b>结果范围可用：${fmt(total)} 条。</b><br/>建议优先查看 A/B/C 方案，再按学科群或学校性质二次筛选。`;
  }
}
function debugEnabled(){return new URLSearchParams(location.search).has('debug')}
function renderDebugPanel(){
  const panel=document.getElementById('debugPanel'); if(!panel)return;
  if(!debugEnabled()){panel.classList.add('hide');return;}
  panel.classList.remove('hide');
  const overflow=document.documentElement.scrollWidth>window.innerWidth+2;
  const loaded=[...loadedChunkIds].join('、')||'无';
  panel.innerHTML=`<b>V2.9.4.2 Debug</b><br/>
  viewport：<code>${window.innerWidth}×${window.innerHeight}</code><br/>
  scrollWidth：<code>${document.documentElement.scrollWidth}</code>｜横向溢出：<span class="${overflow?'bad':'ok'}">${overflow?'是':'否'}</span><br/>
  manifest：<code>${MANIFEST?MANIFEST.version:'未加载'}</code>｜rank：<code>${RANK2025?'已加载':'未加载'}</code><br/>
  taxonomy：<code>${TAXONOMY_READY?TAXONOMY_MAP.size+' 项':'未加载'}</code><br/>
  currentRank：<code>${currentRank||'-'}</code>｜DATA：<code>${DATA.length}</code>｜filtered：<code>${filtered.length}</code><br/>
  chunks：<code>${loaded}</code><br/>
  条件数：<code>${activeConditionCount()}</code><br/>
  app.js：<code>app.v292.js</code>｜app.css：<code>app.v292.css</code>`;
}
function initV292UX(){
  if(debugEnabled())renderDebugPanel();
  window.addEventListener('resize',()=>{renderDebugPanel();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeExportSheet();});
}

async function boot(){
  bootChips();
  initV292UX();
  try{
    MANIFEST = await loadJsonFile(DATA_FILES.manifest,'数据清单');
    RANK2025 = await loadJsonFile(DATA_FILES.rank,'一分一段数据');
    const taxonomyObj = await loadJsonFile(DATA_FILES.taxonomy,'专业学科映射');
    const aliasObj = await loadJsonFile(DATA_FILES.rawMajorAlias,'专业名清洗别名');
    const groupObj = await loadJsonFile(DATA_FILES.subjectGroups,'学科群字典');
    const reviewObj = await loadJsonFile(DATA_FILES.admissionReview,'招生专业名复核');
    OFFICIAL_CATALOG_2026 = await loadJsonFile(DATA_FILES.officialCatalog,'2026本科专业目录');
    initTaxonomy(taxonomyObj, aliasObj, groupObj, reviewObj);
    dataEngineReady = true;
    const metaEl=document.getElementById('metaRecords');
    if(metaEl)metaEl.textContent=`已就绪｜总数据 ${fmt(MANIFEST.totalRecords)} 条｜2026本科目录+招生名已复核｜输入位次后加载对应分段`;
    candidates=JSON.parse(localStorage.getItem('ln_candidates_v292')||'[]');
    renderCandidates();
    document.querySelectorAll('#strategyCards .strategy-card').forEach(b=>b.onclick=()=>applyStrategy(b.dataset.strategy));
    document.querySelectorAll('input,select,textarea').forEach(x=>x.addEventListener('input',debouncedAutoRefresh));
    document.querySelectorAll('select,input[type=checkbox]').forEach(x=>x.addEventListener('change',autoRefresh));
    autoRefresh();
  }catch(e){
    document.getElementById('metaRecords').textContent='页面初始化失败';
    const fs=document.getElementById('filterSummary');
    if(fs)fs.innerHTML='页面初始化失败：'+String(e.message).replace(/\n/g,'<br>');
    console.error(e);
  }
}
if(localStorage.getItem('ln_access_ok')==='1'){setTimeout(()=>{document.getElementById('app').classList.remove('locked');document.getElementById('gateBox').classList.add('hide')},0)}

function unlockFromTop(){
  const v=document.getElementById('accessCodeTop')?.value.trim();
  if(v==='ln2025'){
    document.getElementById('app')?.classList.remove('locked');
    document.getElementById('gateBox')?.classList.add('hide');
    localStorage.setItem('ln_access_ok','1');
    const stateEl=document.getElementById('accessState'); if(stateEl)stateEl.textContent='已开启：可以填写位次并筛选。';
    autoRefresh();
  }else{
    alert('访问码不正确，请输入 ln2025');
  }
}
function resetAccess(){
  localStorage.removeItem('ln_access_ok');
  document.getElementById('app')?.classList.add('locked');
  document.getElementById('gateBox')?.classList.remove('hide');
  const top=document.getElementById('accessCodeTop'); if(top)top.value='';
  const stateEl=document.getElementById('accessState'); if(stateEl)stateEl.textContent='已清除本机开启状态，请重新输入 ln2025。';
}
function manualExecute(){
  currentRank=resolveRank();
  autoRefresh();
  const box=document.getElementById('resultBox');
  if(box)box.scrollIntoView({behavior:'smooth',block:'start'});
}
window.addEventListener('error', function(e){
  const el=document.getElementById('cards');
  if(el){
    el.innerHTML='<div class="result-error"><b>页面执行出现错误：</b><br>'+String(e.message||e.error||'未知错误')+'<br>请检查是否上传了 data 文件夹，或点击“开始筛选 / 重新筛选”。</div>';
  }
});
function syncAccessState(){
  const stateEl=document.getElementById('accessState');
  if(!stateEl)return;
  if(localStorage.getItem('ln_access_ok')==='1'){
    stateEl.textContent='已开启：如果想重新输入访问码，可以点“重新输入”。';
  }else{
    stateEl.textContent='未开启时下方内容会被锁定；请输入 ln2025。';
  }
}


function toggleSection(id){
  const el=document.getElementById(id);
  if(el) el.classList.toggle('collapsed');
}
function updateGuideState(){
  const rank = (typeof resolveRank==='function') ? resolveRank() : null;
  const links=[...document.querySelectorAll('#guideNav a')];
  links.forEach(a=>a.classList.remove('active','done'));
  const one=document.querySelector('#guideNav a[data-guide="1"]');
  const two=document.querySelector('#guideNav a[data-guide="2"]');
  const three=document.querySelector('#guideNav a[data-guide="3"]');
  const five=document.querySelector('#guideNav a[data-guide="5"]');
  if(rank){
    one&&one.classList.add('done');
    two&&two.classList.add('done');
    three&&three.classList.add('active');
  }else{
    one&&one.classList.add('active');
  }
  if((window.candidates||candidates||[]).length){
    five&&five.classList.add('done');
  }
}

boot();
setInterval(updateGuideState, 1000);
setTimeout(syncAccessState, 0);

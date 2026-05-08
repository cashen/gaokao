const DATA_FILES={
  manifest:'data/manifest.json',
  rank:'data/rank_2025_physics.json',
  taxonomy:'data/taxonomy_runtime/major_taxonomy.json',
  rawMajorAlias:'data/taxonomy_runtime/raw_major_alias.json',
  subjectGroups:'data/taxonomy_runtime/subject_groups.json',
  admissionReview:'data/taxonomy_runtime/admission_major_review_v2942.json',
  officialCatalog:'data/taxonomy_runtime/official_undergraduate_catalog_2026.json',
  graduateCatalog:'data/taxonomy_runtime/graduate_catalog_2022_2025.json',
  schoolGeoManifest:'data/school_geo_model/v29471_manifest.json',
  schoolGeoReference:'data/school_geo_model/school_geo_reference_v29471.json',
  schoolGeoAlias:'data/school_geo_model/school_name_alias_v29471.json',
  studentProfileRules:'data/student_profile_model/student_profile_rules_v29471.json'
};
const APP_VERSION_V29472 = 'V2.9.4.7.5.fix｜A/B/C 多候选方案盘修正版';
const CITY_GEO_NOTE_V29472 = '城市为学校官方所在地，具体专业就读校区以招生章程为准';
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
let GRADUATE_CATALOG_2022_2025 = null;
let DATA=[],META={},RANK2025={},currentRank=null,filtered=[],candidates=[],currentPage=1,pageSize=12,currentStrategy='employment',exclusionStats={'区域排除':0,'预算排除':0,'画像排除':0,'低匹配排除':0};
let CONFUSABLE_MODEL_2946=null;
let SCHOOL_GEO_MODEL_29471=null;
let STUDENT_PROFILE_MODEL_29471=null;
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
  url.searchParams.set('v','29475');
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
    el.textContent=`本科目录校准：${fmt(TAXONOMY_MAP.size)} 个；招生名复核 ${fmt(ADMISSION_REVIEW_MAP.size)} 个；研究生学科参考已增强。`;
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

function gradItemText(x){
  if(!x)return '';
  if(x.fieldCode)return `${x.categoryCode}${x.categoryName}→${x.fieldCode}${x.fieldName}`;
  if(x.categoryCode)return `${x.categoryCode}${x.categoryName}`;
  return `${x.code||''}${x.name||''}`;
}
function gradListText(arr,limit=3){
  const a=(arr||[]).filter(Boolean).map(gradItemText);
  if(!a.length)return '';
  return a.slice(0,limit).join(' / ')+(a.length>limit?` 等${a.length}项`:'');
}
function attachGraduateReference(r,t){
  const gr=t.item.graduateReference||{};
  r.graduateReference=gr;
  r.gradAcademicText=gradListText(gr.academicPrimary||[],4);
  r.gradProfessionalText=gradListText(gr.professionalDegree||[],4);
  r.gradSecondaryText=gradListText(gr.secondaryExamples||[],4);
  r.gradReferenceShort=[r.gradAcademicText?`学硕：${r.gradAcademicText}`:'',r.gradProfessionalText?`专硕：${r.gradProfessionalText}`:''].filter(Boolean).join('｜')||'研究生参考需复核';
  r.gradReferenceConfidence=gr.confidence||'low';
}

function attachTaxonomy(r){
  const t=taxonomyForMajor(r.major);
  r.cleanMajor=t.cleanMajor;
  r.rawMajorAlias=t.alias;
  r.majorTaxonomy=t.item;
  attachGraduateReference(r,t);
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
  const cls=r.gradReferenceConfidence==='low'?'review':'primary';
  const flagText=off.flags?` ${off.flags}`:'';
  return `<div class="taxonomy-line">
    <span class="path">本科目录2026：${officialPath}${flagText}</span>
    <span class="${cls}">研究生参考：${r.gradReferenceShort||'需复核'}</span>
    <span class="${cls}">${confidenceLabel(r.gradReferenceConfidence||r.taxonomyConfidence)}</span>
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
    <summary>查看本科目录与研究生参考</summary>
    <div class="tax-grid">
      <div><span>原始招生专业</span><b>${r.major||'-'}</b></div>
      <div><span>标准专业/专业类</span><b>${r.cleanMajor||'-'}</b></div>
      <div><span>官方本科目录2026</span><b>${officialText}</b></div>
      <div><span>T/K标记</span><b>${off.flags||'无'}${off.isSpecial?'｜特设专业':''}${off.isNationalControlled?'｜国家控制布点':''}</b></div>
      <div><span>学硕一级/跨门类参考</span><b>${r.gradAcademicText||'需复核'}</b></div>
      <div><span>专硕类别/领域参考</span><b>${r.gradProfessionalText||'需复核'}</b></div>
      <div><span>二级学科示例</span><b>${r.gradSecondaryText||'无固定示例'}</b></div>
      <div><span>学科群</span><b>${r.subjectGroup||'其他/需复核'}</b></div>
      <div><span>目录匹配</span><b>${confidenceLabel(r.taxonomyConfidence)}｜${off.source||t.matchMethod||''}</b></div>
    </div>
    ${aliasNote?`<div class="tax-warn">${aliasNote}</div>`:''}
    ${warns}
    ${renderAdmissionReviewDetail(r)}
    <div class="tax-warn">说明：本科官方口径是“学科门类/专业类/本科专业”；本工具中的“研究生参考”包含学硕一级/跨门类编制一级学科与专硕类别/领域，仅用于高报理解、学科实力和考研路径联想，不是本科专业目录的官方层级。</div>
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

function normalizeSchoolNameV29471(name){
  return String(name||'').replace(/\s+/g,'').replace(/[（(](中外合作办学|较高收费|高收费|国际项目|.*?校区)[）)]/g,'').trim();
}
function schoolGeoForV29471(school){
  if(!SCHOOL_GEO_MODEL_29471 || !school) return null;
  const raw=String(school).trim();
  const norm=normalizeSchoolNameV29471(raw);
  return SCHOOL_GEO_MODEL_29471.map.get(raw) || SCHOOL_GEO_MODEL_29471.map.get(norm) || null;
}
function applySchoolGeoV29471(r){
  const geo=schoolGeoForV29471(r.school);
  if(!geo) return r;
  if(!r.schoolProvince || r.schoolProvince==='待核验') r.schoolProvince=geo.province||r.schoolProvince||'';
  if(!r.schoolCity || r.schoolCity==='待核验') r.schoolCity=geo.city||r.schoolCity||'';
  r.schoolRegion = geo.region || r.schoolRegion || '';
  r.schoolGeoConfidence = geo.confidence || 'low';
  r.schoolGeoSourceMethod = geo.source_method || '';
  if(r.schoolProvince==='辽宁'){
    if(/沈阳/.test(r.schoolCity||r.school)) r.lnArea='沈阳';
    else if(/大连/.test(r.schoolCity||r.school)) r.lnArea='大连';
    else r.lnArea='辽宁其他';
  }else if(r.schoolProvince){
    r.lnArea='省外';
  }
  return r;
}

function geoDisplayV29472(r){
  const p=String(r.schoolProvince||'').trim();
  const c=String(r.schoolCity||'').trim();
  if(p && c) return `${p} · ${c}`;
  return p || c || '地域待核验';
}
function normalizeCityTokenV29472(v){
  return String(v||'').trim().replace(/[，、；;|/]+/g,' ').replace(/\s+/g,' ').replace(/市$/,'');
}
function selectedCitiesV29472(){
  const raw=document.getElementById('targetCities')?.value||'';
  return normalizeCityTokenV29472(raw).split(' ').map(x=>x.trim()).filter(Boolean);
}
function cityModeV29472(){ return document.getElementById('cityMode')?.value || 'none'; }
function cityMatchesV29472(r, targets=selectedCitiesV29472()){
  if(!targets.length) return true;
  const c=normalizeCityTokenV29472(r.schoolCity||'');
  if(!c) return false;
  return targets.some(t=>c===t || c.includes(t) || t.includes(c));
}
function cityPreferenceHintV29472(r){
  const targets=selectedCitiesV29472();
  const mode=cityModeV29472();
  if(!targets.length || mode==='none') return {state:'none', label:'未设置城市偏好', cls:'mid'};
  if(cityMatchesV29472(r, targets)) return {state:'match', label:'符合城市偏好', cls:'ok'};
  return {state:'miss', label:mode==='hard'?'不在目标城市':'非目标城市，仅作提醒', cls:mode==='hard'?'danger':'warn'};
}
function populateCityDatalistV29472(){
  const dl=document.getElementById('cityDatalist');
  if(!dl || !SCHOOL_GEO_MODEL_29471) return;
  const cities=[...new Set((SCHOOL_GEO_MODEL_29471.items||[]).map(x=>x.city).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'zh-CN'));
  dl.innerHTML=cities.map(c=>`<option value="${htmlSafeV2945(c)}"></option>`).join('');
}
function renderGeoHintV29472(r){
  const hint=cityPreferenceHintV29472(r);
  const src=r.schoolGeoSourceMethod||'official_xls';
  const conf=confidenceLabel(r.schoolGeoConfidence||'high');
  const pref=hint.state==='none'?'':`<br>${htmlSafeV2945(hint.label)}`;
  return `<div class="pi-box ${hint.cls} geo-box-v29472"><label>学校地域</label><strong>${htmlSafeV2945(geoDisplayV29472(r))}</strong><p>${CITY_GEO_NOTE_V29472}。来源：${htmlSafeV2945(src)}，置信度：${htmlSafeV2945(conf)}。${pref}</p></div>`;
}
function studentProfileV29471(){
  const val=id=>document.getElementById(id)?.value || 'unknown';
  return {
    gender: val('studentGender') || 'unspecified',
    codeAcceptance: val('codeAcceptance'),
    mathTolerance: val('mathTolerance'),
    fieldWorkAcceptance: val('fieldWorkAcceptance'),
    gradWillingnessV29471: val('gradWillingnessV29471')
  };
}
function profileConditionPassV29471(rule, profile){
  const c=rule.condition||{};
  return Object.entries(c).every(([k,arr])=>!Array.isArray(arr)||!arr.length||arr.includes(profile[k]||'unknown'));
}
function majorMatchesProfileRuleV29471(r, rule){
  const m=String(r.major||'')+String(r.cleanMajor||'')+String(r.undergradCategoryName||'')+String(r.undergradDisciplineName||'');
  const code=String(r.officialCategoryCode||r.officialMajorCode||'');
  const prefixes=rule.trigger_codes_prefix||[];
  const keywords=rule.trigger_keywords||[];
  const codeHit=prefixes.length?prefixes.some(p=>code.startsWith(String(p))):false;
  const kwHit=keywords.length?keywords.some(k=>m.includes(k)):false;
  return codeHit || kwHit || (!prefixes.length && !keywords.length);
}
function studentProfileHintsV29471(r){
  if(!STUDENT_PROFILE_MODEL_29471) return [];
  const profile=studentProfileV29471();
  const rules=STUDENT_PROFILE_MODEL_29471.rules||[];
  const hints=[];
  for(const rule of rules){
    if(rule.trigger_when_gender && rule.trigger_when_gender!==profile.gender) continue;
    if(!profileConditionPassV29471(rule, profile)) continue;
    if(!majorMatchesProfileRuleV29471(r, rule)) continue;
    hints.push({rule_id:rule.rule_id, priority:rule.priority||'medium', message:rule.message});
  }
  const order={high:1,medium:2,low:3,info:4};
  return hints.sort((a,b)=>(order[a.priority]||9)-(order[b.priority]||9)).slice(0,4);
}
function renderStudentProfileHintsV29471(r){
  const hints=studentProfileHintsV29471(r);
  if(!hints.length) return '';
  return `<div class="pi-box mid profile-fit-v29471"><label>学生适配提醒</label><strong>只提示，不替孩子下结论</strong><p>${hints.map(h=>htmlSafeV2945(h.message)).join('<br>')}</p></div>`;
}

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

function normalizeMajorMainV29475(raw){
  let s=String(raw||'').replace(/\s+/g,'').trim();
  s=s.replace(/[（(][^）)]*(中外合作办学|中外合作|合作办学|国际|ACCA|CIMA|CPA|ISEC|学术互认|联合培养|中美|中英|中澳|中俄|中法|中德|高收费)[^）)]*[）)]/ig,'');
  s=s.replace(/[（(][^）)]*(方向|实验班|试验班|卓越|拔尖|创新班|基地班|师范|非师范)[^）)]*[）)]/ig,'');
  s=s.replace(/（.*?）|\(.*?\)/g,'');
  return s || String(raw||'').replace(/\s+/g,'').trim();
}
function isCoopProgramV29475(r){
  const s=[r.major,r.cleanMajor,r.admissionMajor,r.remark,(r.riskFlags||[]).join(' ')].map(x=>String(x||'')).join(' ');
  return /中外合作|合作办学|学术互认|联合培养|中美|中英|中澳|中俄|中法|中德|国际课程|国际会计|ACCA|CIMA|ISEC/.test(s);
}
function isPrivateProgramV29475(r){
  const txt=[r.schoolNature?.label,r.schoolTier?.level,r.schoolTier?.label,r.schoolNatureLabel].map(x=>String(x||'')).join(' ');
  return /民办|独立|private/.test(txt);
}
function feeTypeLabelV29475(r){
  if(r.isCoopV29475)return '中外合作/高收费';
  if(r.isHighFee)return '高收费';
  if(r.isPrivateV29475)return '民办本科';
  return '普通学费/普通专业';
}
function majorSearchBlobV29475(r){
  return [r.major,r.cleanMajor,r.mainMajorV29475,r.officialMajorName,r.undergradMajorName,r.undergradCategoryName,r.officialCategoryName,r.primaryDisciplineNames,r.subjectGroup,feeTypeLabelV29475(r)].map(x=>String(x||'')).join(' ').replace(/\s+/g,'');
}
function majorMatchesV29475(r,q){
  const kw=String(q||'').replace(/\s+/g,'');
  if(!kw)return true;
  const blob=majorSearchBlobV29475(r);
  if(blob.includes(kw))return true;
  const alt=kw.replace(/学$/,'');
  if(alt && alt.length>=2 && blob.includes(alt))return true;
  return false;
}
function isCoopIntentV29475(){
  const budget=document.getElementById('budget')?.value||'normal';
  const fee=document.getElementById('filterFeeType')?.value||'all';
  return budget==='coop'||fee==='coopCompare'||fee==='coopOnly';
}
function liftValueScoreV29475(r){
  let sc=0;
  if(['985','211'].includes(r.schoolTier?.level))sc+=36;
  if(r.schoolTier?.level==='public'||r.schoolTier?.level==='publicSoft')sc+=16;
  if(r.isCoopV29475||r.isHighFee)sc+=18;
  if(['沈阳','大连','北京','天津','上海','南京','杭州','苏州','广州','深圳','青岛','济南'].includes(r.schoolCity))sc+=12;
  if(r.isPrivateV29475)sc-=8;
  sc+=(r._profile||0)*0.2;
  sc-=Math.min((r._fit||0)/3000,30);
  return sc;
}
function specialPlanStatusV29474(){return document.getElementById('specialPlanStatus')?.value || 'unreviewed'}
function specialPlanApprovedV29474(){return specialPlanStatusV29474()==='approved'}
function hasCollegeSpecialPlanV29474(r){const s=[r.major,r.cleanMajor,r.admissionMajor,r.planType,r.batch,r.remark,(r.riskFlags||[]).join(' ')].map(x=>String(x||'')).join(' ');return /辽宁省高校专项计划|高校专项计划/.test(s)}
function specialPlanTextV29474(){const v=specialPlanStatusV29474();if(v==='approved')return '已通过高校专项计划审核';if(v==='unknown')return '不确定，暂按未审核处理';return '未通过 / 未审核'}
function enrich(r){r.schoolProvince=r.schoolProvince||inferProvince(r.school);applySchoolGeoV29471(r);r.schoolNature=r.schoolNatureLabel?{label:r.schoolNatureLabel,cls:r.schoolNatureCls||'unknown',score:r.schoolNatureScore||0}:guessSchoolNature(r.school);r.schoolTier=guessSchoolTier(r.school,r.schoolNature);r.majorText=(r.major||'').replace(/\s/g,'');r.isHighFee=hasHighFee(r);r.isCoopV29475=isCoopProgramV29475(r);r.isPrivateV29475=isPrivateProgramV29475(r);r.mainMajorV29475=normalizeMajorMainV29475(r.cleanMajor||r.major);r.feeTypeLabelV29475=feeTypeLabelV29475(r);r.isCollegeSpecialPlanV29474=hasCollegeSpecialPlanV29474(r);attachTaxonomy(r);r.studentProfileHints=studentProfileHintsV29471(r);return r}
function unlock(){if(document.getElementById('accessCode').value.trim()==='ln2025'){document.getElementById('app').classList.remove('locked');document.getElementById('gateBox').classList.add('hide');localStorage.setItem('ln_access_ok','1')}else alert('访问码不正确')}
function bootChips(){const pc=document.getElementById('provinceChips');pc.innerHTML=PROVINCES.map(p=>`<span class="chip" data-province="${p}">${p}</span>`).join('');selectRegionGroup('东北',true);document.querySelectorAll('.chip').forEach(ch=>{ch.addEventListener('click',()=>{const p=ch.parentElement;if(p.classList.contains('single')){p.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));ch.classList.add('active')}else ch.classList.toggle('active');if(ch.dataset.regionGroup){selectRegionGroup(ch.dataset.regionGroup,ch.classList.contains('active'))}autoRefresh()})})}
function selectedProvinces(){return[...document.querySelectorAll('#provinceChips .chip.active')].map(x=>x.dataset.province)}
function setTargetCitiesV29472(value, mode='soft'){const el=document.getElementById('targetCities');if(el)el.value=value||'';const m=document.getElementById('cityMode');if(m)m.value=mode||'soft';}
function selectRegionGroup(g,active=true){const arr=REGION_GROUPS[g]||[];if(g==='全国'){document.querySelectorAll('#provinceChips .chip').forEach(c=>c.classList.toggle('active',active));return}document.querySelectorAll('#provinceChips .chip').forEach(c=>{if(arr.includes(c.dataset.province))c.classList.toggle('active',active)})}
function clearProvinces(){document.querySelectorAll('#provinceChips .chip,#regionGroupChips .chip').forEach(c=>c.classList.remove('active'))}
function setSingle(group,value){const box=document.querySelector(`[data-group="${group}"]`);if(!box)return;box.querySelectorAll('.chip').forEach(c=>c.classList.toggle('active',c.dataset.value===value))}
function getGroup(group){return document.querySelector(`[data-group="${group}"] .chip.active`)?.dataset.value||''}
function selectedRejects(){return[...document.querySelectorAll('#rejectChips .chip.active')].map(x=>x.dataset.reject)}
function applyStrategy(type){currentStrategy=type;document.querySelectorAll('.strategy-card').forEach(c=>c.classList.toggle('active',c.dataset.strategy===type));clearProvinces();document.querySelectorAll('#rejectChips .chip').forEach(c=>c.classList.remove('active'));document.getElementById('regionMode').value='hard';document.getElementById('budget').value='normal';document.getElementById('mentorMode').value='standard';document.getElementById('familyTolerance').value='low';document.getElementById('gradPlan').value='maybe';document.getElementById('timePressure').value='normal';setTargetCitiesV29472('', 'none');setSingle('outProvince','yes');setSingle('medicine','neutral');setSingle('teacher','neutral');setSingle('liberal','neutral');setSingle('chem','neutral');setSingle('physics','neutral');setSingle('gridPower','neutral');
 if(type==='employment'){selectRegionGroup('东北');setSingle('outProvince','no');document.getElementById('priority').value='employment'}
 if(type==='grid'){selectRegionGroup('辽宁省内');setSingle('outProvince','no');setSingle('gridPower','prefer');setSingle('physics','prefer');document.getElementById('priority').value='grid';document.querySelector('[data-reject="高收费"]')?.classList.add('active')}
 if(type==='medical'){selectRegionGroup('全国');setSingle('medicine','prefer');setSingle('chem','prefer');document.getElementById('priority').value='employment';document.getElementById('gradPlan').value='yes';document.getElementById('timePressure').value='long'}
 if(type==='exam'){selectRegionGroup('全国');setSingle('liberal','prefer');document.getElementById('priority').value='exam'}
 if(type==='city'){selectRegionGroup('长三角');document.getElementById('priority').value='city';document.getElementById('cityMode').value='soft'}
 if(type==='shenyang'){clearProvinces();selectRegionGroup('辽宁省内');setSingle('outProvince','no');setTargetCitiesV29472('沈阳','soft');document.getElementById('priority').value='city'}
 if(type==='dalian'){clearProvinces();selectRegionGroup('辽宁省内');setSingle('outProvince','no');setTargetCitiesV29472('大连','soft');document.getElementById('priority').value='city'}
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
function profileScore(r){const m=r.majorText;let score=50,reasons=[],excludes=[];const provinces=selectedProvinces(),regionMode=document.getElementById('regionMode').value;if(regionMode!=='none'&&provinces.length){if(provinces.includes(r.schoolProvince)){score+=14;reasons.push('目标区域匹配')}else if(regionMode==='hard')excludes.push('不在目标区域');else score-=10}; const cityTargets=selectedCitiesV29472(), cityMode=cityModeV29472(); if(cityMode!=='none'&&cityTargets.length){if(cityMatchesV29472(r,cityTargets)){score+=10;reasons.push('目标城市匹配')}else if(cityMode==='hard')excludes.push('不在目标城市');else {score-=6;reasons.push('非目标城市，已降权提醒')}}; if(getGroup('outProvince')==='no'&&r.schoolProvince&&r.schoolProvince!=='辽宁'){score-=18;reasons.push('省外降权')}; if(r.isHighFee&&document.getElementById('budget').value==='normal')excludes.push('高收费/中外合作不符合预算'); if(r.isCollegeSpecialPlanV29474&&specialPlanApprovedV29474()){score+=3;reasons.push('高校专项资格候选')}
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

function updateSpecialPlanNoticeV29474(){
  const el=document.getElementById('specialPlanNoticeV29474');
  if(!el)return;
  const hidden=(exclusionStats&&exclusionStats['高校专项隐藏'])||0;
  const status=specialPlanStatusV29474();
  if(!currentRank){el.innerHTML='';el.className='special-plan-notice-v29474 hide';return;}
  if(status==='approved'){
    const shown=(filtered||[]).filter(r=>r.isCollegeSpecialPlanV29474).length;
    el.className='special-plan-notice-v29474 approved';
    el.innerHTML=`<b>高校专项资格：已通过审核。</b> 已显示高校专项计划候选 ${fmt(shown)} 条。正式填报前仍需复核资格审核结果、公示名单和当年招生计划。`;
  }else{
    el.className='special-plan-notice-v29474 protected';
    const statusText=status==='unknown'?'当前选择“不确定”，系统暂按未审核处理。':'当前默认“未通过 / 未审核”。';
    el.innerHTML=`<b>高校专项计划默认保护：</b>${statusText} 已隐藏高校专项计划候选 ${fmt(hidden)} 条；这些不是普通考生“分够就能报”的入口。`;
  }
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
  set('exSpecial',ex['高校专项隐藏']||0);
  updateSpecialPlanNoticeV29474();
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
  set('cntSY',(filtered||[]).filter(r=>r.schoolProvince==='辽宁' && r.schoolCity==='沈阳').length);
  set('cntDL',(filtered||[]).filter(r=>r.schoolProvince==='辽宁' && r.schoolCity==='大连').length);
  set('cntLNOther',(filtered||[]).filter(r=>r.schoolProvince==='辽宁' && !['沈阳','大连'].includes(r.schoolCity)).length);
  set('cntOut',(filtered||[]).filter(r=>r.schoolProvince && r.schoolProvince!=='辽宁').length);
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
        fSchoolTier=document.getElementById('filterSchoolTier')?.value||'',
        fFeeType=document.getElementById('filterFeeType')?.value||'all',
        fConfusableGroup=document.getElementById('filterConfusableGroup')?.value||'',
        onlyConfusable=document.getElementById('onlyConfusable')?.checked,
        fCityQuick=selectedCitiesV29472(),
        fCityMode=cityModeV29472();

  const exStats={'区域排除':0,'预算排除':0,'画像排除':0,'低匹配排除':0,'高校专项隐藏':0};

  let arr=DATA.map(r=>{
    const level=classify(r.rank2025), p=profileScore(r);
    const obj={...r,_level:level,_fit:currentRank&&r.rank2025?Math.abs(r.rank2025-currentRank):999999999,_profile:p.score,_reasons:p.reasons,_excludes:p.excludes,_mentor:p.mentor};
    obj._confidence=confidence(obj);
    return obj;
  });

  const specialStatusV29474=specialPlanStatusV29474();
  arr=arr.filter(r=>{
    if(r.isCollegeSpecialPlanV29474 && specialStatusV29474!=='approved'){exStats['高校专项隐藏']=(exStats['高校专项隐藏']||0)+1;return false;}
    if(qS&&!(r.school||'').includes(qS))return false;
    if(qM&&!majorMatchesV29475(r,qM))return false;
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
    if(fFeeType==='normal'&&(r.isHighFee||r.isCoopV29475||r.isPrivateV29475)){exStats['预算排除']=(exStats['预算排除']||0)+1;return false;}
    if(fFeeType==='coopOnly'&&!(r.isCoopV29475||r.isHighFee)){exStats['预算排除']=(exStats['预算排除']||0)+1;return false;}
    if(fFeeType==='excludeHighPrivate'&&(r.isHighFee||r.isCoopV29475||r.isPrivateV29475)){exStats['预算排除']=(exStats['预算排除']||0)+1;return false;}
    if(onlyConfusable && !hasConfusableMajorV2946(r))return false;
    if(fConfusableGroup && !hasConfusableGroupV2946(r,fConfusableGroup))return false;
    if(fLevel&&r._level!==fLevel)return false;
    if(fCityMode==='hard' && fCityQuick.length && !cityMatchesV29472(r,fCityQuick)){exStats['区域排除']=(exStats['区域排除']||0)+1;return false;}
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
          : sortBy==='lift'
            ? liftValueScoreV29475(b)-liftValueScoreV29475(a)
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


/* V2.9.4.6.2 卡片折叠与信息密度优化：只改展示层，不改 4.6 数据模型。 */
const CARD_VIEW_MODE_KEY_V29461 = 'ln_card_view_mode_v29461';
function isMobileV29461(){ return window.matchMedia && window.matchMedia('(max-width:760px)').matches; }
function defaultCardViewModeV29461(){ return isMobileV29461() ? 'compact' : 'standard'; }
function getCardViewModeV29461(){
  const v = localStorage.getItem(CARD_VIEW_MODE_KEY_V29461);
  return ['compact','standard','detailed'].includes(v) ? v : defaultCardViewModeV29461();
}
function setCardViewModeV29461(mode){
  if(!['compact','standard','detailed'].includes(mode)) mode = defaultCardViewModeV29461();
  localStorage.setItem(CARD_VIEW_MODE_KEY_V29461, mode);
  applyCardViewModeClassV29461();
  syncCardViewModeButtonsV29461();
  if(typeof renderCards === 'function') renderCards();
}
function applyCardViewModeClassV29461(){
  const mode = getCardViewModeV29461();
  document.body.classList.remove('card-mode-compact','card-mode-standard','card-mode-detailed');
  document.body.classList.add('card-mode-' + mode);
}
function cardDetailOpenV29461(section){
  const mode = getCardViewModeV29461();
  if(mode === 'detailed') return section !== 'debug';
  return false;
}
function syncCardViewModeButtonsV29461(){
  const mode = getCardViewModeV29461();
  document.querySelectorAll('[data-card-view-mode]').forEach(btn=>{
    btn.classList.toggle('active', btn.dataset.cardViewMode === mode);
  });
  const label = document.getElementById('cardViewModeLabelV29461');
  if(label){
    const map = {compact:'紧凑：先快筛', standard:'标准：摘要+风险', detailed:'详细：默认展开'};
    label.textContent = map[mode] || map.standard;
  }
}
function ensureCardViewModeToolbarV29461(){
  if(document.getElementById('cardViewModeToolbarV29461')) { syncCardViewModeButtonsV29461(); return; }
  const anchor = document.getElementById('filterSummary') || document.getElementById('cards');
  if(!anchor || !anchor.parentElement) return;
  const bar = document.createElement('div');
  bar.id = 'cardViewModeToolbarV29461';
  bar.className = 'view-mode-toolbar-v29461';
  bar.innerHTML = `
    <div class="view-mode-left-v29461">
      <b>卡片显示</b>
      <span id="cardViewModeLabelV29461">标准：摘要+风险</span>
    </div>
    <div class="view-mode-buttons-v29461" role="group" aria-label="卡片显示模式">
      <button type="button" data-card-view-mode="compact" onclick="setCardViewModeV29461('compact')">紧凑</button>
      <button type="button" data-card-view-mode="standard" onclick="setCardViewModeV29461('standard')">标准</button>
      <button type="button" data-card-view-mode="detailed" onclick="setCardViewModeV29461('detailed')">详细</button>
    </div>
    <div class="view-mode-tip-v29461">风险标签默认外露，解释内容按需展开；PNG 导出跟随当前展开状态。</div>`;
  anchor.parentElement.insertBefore(bar, anchor);
  syncCardViewModeButtonsV29461();
}
function firstUsefulV29461(list, n){ return (Array.isArray(list)?list:[]).filter(Boolean).slice(0,n); }
function riskBadgesV29461(r){
  const out=[];
  const pairs = (typeof confusablePairsForRecordV2946 === 'function') ? confusablePairsForRecordV2946(r) : [];
  if(r.isCollegeSpecialPlanV29474) out.push({text:'高校专项资格', cls:'warn'});
  if(r.isCoopV29475) out.push({text:'中外合作', cls:'danger'});
  else if(r.isHighFee) out.push({text:'高收费', cls:'danger'});
  if(r.isPrivateV29475) out.push({text:'民办本科', cls:'warn'});
  if(pairs.length) out.push({text:'易混专业', cls:'warn'});
  const idn = (typeof admissionIdentityV2945 === 'function') ? admissionIdentityV2945(r) : null;
  if(idn && ['大类招生','试验班/特色班','中外合作/高收费','专项/特殊入口'].includes(idn.label)) out.push({text:idn.label, cls:idn.cls==='danger'?'danger':'warn'});
  const cost = (typeof costInsightV2945 === 'function') ? costInsightV2945(r) : null;
  if(cost && ['danger','warn'].includes(cost.cls)) out.push({text:cost.label, cls:cost.cls});
  if(r.undergradDisciplineName) out.push({text:r.undergradDisciplineName, cls:'soft'});
  if(r.undergradCategoryName) out.push({text:r.undergradCategoryName, cls:'soft'});
  const gh=cityPreferenceHintV29472(r);
  if(gh.state==='match') out.push({text:'城市匹配', cls:'soft'});
  if(gh.state==='miss' && cityModeV29472()==='soft') out.push({text:'非目标城市', cls:'warn'});
  const sh = (typeof studentProfileHintsV29471==='function') ? studentProfileHintsV29471(r) : [];
  if(sh.some(x=>['high','medium'].includes(x.priority))) out.push({text:'学生适配提醒', cls:'warn'});
  const seen=new Set();
  return out.filter(x=>{const k=x.text; if(seen.has(k))return false; seen.add(k); return true;}).slice(0,6);
}
function primarySummaryV29461(r){
  const pairs = (typeof confusablePairsForRecordV2946 === 'function') ? confusablePairsForRecordV2946(r) : [];
  if(pairs.length){
    const p=pairs[0];
    const current=(p.items||[]).find(x=>x.record_id===r.id)||(p.items||[])[0]||{};
    if(current && current.catalog_major_code){
      return `易混提醒：${current.catalog_major_code}｜${current.discipline_category_name||'门类待复核'}｜${current.major_class_name||'专业大类待复核'}。${current.warning_summary_v29462 || p.parent_warning || '名字相近，但方向可能不同。'}`;
    }
    return '易混提醒：名字相近，但方向可能不同，建议看本科代码和专业大类。';
  }
  const traps = (typeof nameTrapV2945 === 'function') ? nameTrapV2945(r) : [];
  if(traps.length) return traps[0];
  const idn = (typeof admissionIdentityV2945 === 'function') ? admissionIdentityV2945(r) : null;
  if(idn) return idn.text;
  return '建议结合本科代码、招生备注、学费和位次变化一起判断，不要只看专业名称。';
}
function compactOfficialLineV29461(r){
  const code = r.officialMajorCode || r.undergradMajorCode || r.catalog_major_code || '';
  const disc = r.undergradDisciplineName || '';
  const cat = r.undergradCategoryName || '';
  const parts = [code, disc, cat].filter(Boolean);
  return parts.length ? parts.join('｜') : '本科目录口径待复核';
}


/* V2.9.4.6 家长关心点表达增强层：不新增外部保研率数据，只把 2.9.4.4 现有字段翻译成家长可读判断。 */
function htmlSafeV2945(v){
  return String(v ?? '').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}
function moneyTextV2945(v){
  if(v == null || v === '' || v === '待核验') return '待核验';
  const n = Number(String(v).replace(/[^\d.]/g,''));
  if(!Number.isFinite(n) || n<=0) return String(v);
  return n >= 10000 ? `${Math.round(n/1000)/10}万/年` : `${Math.round(n)}元/年`;
}
function admissionIdentityV2945(r){
  const raw = String(r.major || '');
  const clean = String(r.cleanMajor || raw);
  const review = String(r.admissionReviewStatus || r.admissionReviewTags || r.reviewStatus || '');
  const off = r.officialUndergrad2026 || {};
  const attrs = [];
  if(r.isHighFee || /中外合作|合作办学|高收费|国际|联合培养/.test(raw)) attrs.push('中外合作/高收费');
  if(/试验班|实验班|拔尖|卓越|强基|基地班|英才班/.test(raw)) attrs.push('试验班/特色班');
  if(/预科|民族班|定向|专项/.test(raw)) attrs.push('专项/特殊入口');
  if(/类(?:\(|（|$)|工科试验|理科试验/.test(clean) || off.kind === 'category' || /category|大类|专业类/.test(review)) attrs.push('大类招生');
  if(/方向|校企|智能|创新|实验|特色/.test(raw) && !attrs.includes('试验班/特色班')) attrs.push('方向/培养模式');
  if(!attrs.length) attrs.push('具体专业倾向');
  let label = attrs[0], cls='ok', text='招生名与本科目录专业较接近，但仍要保留原始招生名，避免丢失校区、学费、备注、体检等限制。';
  if(label==='大类招生'){cls='warn';text='这不是最终毕业专业，通常还要看入校后的专业分流规则。不要默认等于其中某一个热门专业。';}
  if(label==='试验班/特色班'){cls='warn';text='这是招生入口或培养模式名称，不宜直接等同单一本科目录专业。重点核验分流、退出和转专业规则。';}
  if(label==='中外合作/高收费'){cls='danger';text='专业本体可校准，但收费、培养方案、证书说明和转专业政策需要单独核验，不能按普通同名专业理解。';}
  if(label==='专项/特殊入口'){cls='warn';text='这类入口通常有资格、培养或政策条件，不能直接和普通专业混排理解。';}
  if(label==='方向/培养模式'){cls='mid';text='目录校准只识别专业本体，括号内方向或培养模式要作为招生属性单独保留。';}
  return {label, cls, attrs, text, raw, clean};
}
function rankTrendV2945(r){
  const d = Number(r.rankDiff);
  if(!Number.isFinite(d)) return {label:'缺少对比', cls:'mid', text:'缺少 2024/2025 连续对比，先按 2025 位次作为主参考。'};
  const abs = Math.abs(d);
  const base = Number(r.rank2024)||Number(r.rank2025)||0;
  const pct = base ? abs/base : 0;
  if(abs < 300 || pct < 0.03) return {label:'基本稳定', cls:'ok', text:`2024→2025 位次变化较小（${d>0?'+':''}${fmt(d)}），主要看自身位次匹配。`};
  if(d < 0) return {label:'竞争增强', cls:pct>0.18?'danger':'warn', text:`2025 位次比 2024 前移 ${fmt(abs)} 位，说明这条更难进了，放入“冲/稳”时要更保守。`};
  return {label:'位次放宽', cls:'ok', text:`2025 位次比 2024 后移 ${fmt(abs)} 位，相对更好进，但要复核是否有扩招、学费、校区或专业属性变化。`};
}
function costInsightV2945(r){
  const fee = moneyTextV2945(r.tuition2025);
  const isPrivate = /民办|独立/.test(String(r.schoolNature?.label || r.schoolNatureLabel || ''));
  if(r.isHighFee || /中外合作|高收费/.test(String(r.major||'') + String(r.tuitionStatus||''))){
    return {label:'成本风险高', cls:'danger', text:`学费/收费属性：${fee}。普通家庭不要只看学校名，必须单独核验总成本、证书说明和转专业政策。`};
  }
  if(isPrivate){
    return {label:'民办成本需核验', cls:'warn', text:`学校性质倾向：${r.schoolNature?.label||'民办/独立'}；学费：${fee}。建议把四年总成本和就业预期一起算。`};
  }
  if(fee === '待核验') return {label:'学费待核验', cls:'mid', text:'当前学费字段待核验。正式填报前建议回到招生计划或学校招生章程确认。'};
  return {label:'成本风险较低', cls:'ok', text:`学费参考：${fee}。仍需复核住宿、校区和专业特殊收费。`};
}
function nameTrapV2945(r){
  const m = String(r.major || '');
  const traps = [];
  if(/智能医学工程|医学影像技术|医学检验技术|康复治疗|护理|生物医学工程/.test(m)) traps.push('医学相关不等于临床医生路径，能否当医生要看具体专业和执业资格。');
  if(/计算机类/.test(m)) traps.push('计算机类不等于一定分到计算机科学与技术，关键看分流规则。');
  if(/电子信息类/.test(m)) traps.push('电子信息类可能含通信、电子、光电、集成电路等方向，不等于纯计算机。');
  if(/电气类/.test(m)) traps.push('电气类不等于必然进入电网，学校平台、专业方向和招聘口径都要看。');
  if(/管理科学与工程|工程管理|工业工程|物流工程/.test(m)) traps.push('名称偏“工程”，但就业口径可能偏管理/流程/现场，需看培养方案。');
  if(/材料|化学|化工|环境|食品|生物/.test(m)) traps.push('化学材料生物食品环境类差异很大，建议结合是否读研和行业接受度判断。');
  if(/建筑学|城乡规划|风景园林/.test(m)) traps.push('建筑规划园林通常有作品、周期或行业景气因素，不能只看学校层级。');
  if(/法学|公安|侦查|治安|警务/.test(m)) traps.push('法学/公安相关路径差异大，需核验是否公安院校、是否有入警政策或体检要求。');
  return traps.slice(0,2);
}
function routeTagsV2945(r){
  const tags=[];
  if(r.isComputer || /计算机|软件|网络|数据|人工智能/.test(r.majorText||r.major||'')) tags.push('偏代码/数字化');
  if(r.isGrid || /电气|智能电网|能源与动力/.test(r.majorText||r.major||'')) tags.push('电力能源相关');
  if(isMed(r.majorText||r.major||'')) tags.push('医学/健康路径');
  if(isTeacher(r.majorText||r.major||'')) tags.push('师范教育路径');
  if(isChem(r.majorText||r.major||'')) tags.push('化学材料生物环境');
  if(isPhys(r.majorText||r.major||'')) tags.push('工科现场/制造相关');
  if(isLiberal(r.majorText||r.major||'')) tags.push('经管法文社科');
  if(r.gradReferenceShort && r.gradReferenceShort !== '需复核') tags.push('考研方向可参考');
  return [...new Set(tags)].slice(0,4);
}
function candidateAdviceV2945(r){
  const reasons=[];
  const identity=admissionIdentityV2945(r);
  const cost=costInsightV2945(r);
  const trend=rankTrendV2945(r);
  let score=0;
  const level=r._level || classify(r.rank2025);
  if(level==='匹配') {score+=22; reasons.push('位次接近，可作为主体候选');}
  if(level==='稳妥') {score+=24; reasons.push('位次更稳，适合中后段');}
  if(level==='保底') {score+=16; reasons.push('有兜底作用');}
  if(level==='可冲') {score+=8; reasons.push('可少量前置冲击');}
  if(level==='超冲') {score-=18; reasons.push('明显偏冲');}
  if(level==='过低') {score-=10; reasons.push('位次放宽较多，要防止只图稳');}
  if((r._profile||0)>=70) {score+=16; reasons.push('画像匹配较高');}
  else if((r._profile||0)<45) {score-=12; reasons.push('画像匹配偏低');}
  if(cost.cls==='danger') {score-=28; reasons.push('成本/高收费风险');}
  else if(cost.cls==='warn') {score-=12; reasons.push('成本需核验');}
  if(['大类招生','试验班/特色班','专项/特殊入口'].includes(identity.label)) {score-=13; reasons.push('招生入口不等于最终专业');}
  if(identity.label==='中外合作/高收费') {score-=18; reasons.push('合作办学需单独核验');}
  if(trend.cls==='danger') {score-=10; reasons.push('竞争明显增强');}
  if((r.riskFlags||[]).length) {score-=8; reasons.push('已有风险标签');}
  if((r.keySubjectHints||[]).length) {score+=6; reasons.push('有重点学科提醒');}
  let label='建议保留', cls='ok';
  if(score>=35){label='建议保留';cls='ok';}
  else if(score>=12){label='谨慎保留';cls='mid';}
  else if(score>=-8){label='复核后再保留';cls='warn';}
  else {label='暂不优先';cls='danger';}
  return {label, cls, reasons:[...new Set(reasons)].slice(0,4), score};
}
function renderParentInterestPanelV2945(r){
  const idn=admissionIdentityV2945(r), trend=rankTrendV2945(r), cost=costInsightV2945(r), advice=candidateAdviceV2945(r), traps=nameTrapV2945(r), tags=routeTagsV2945(r);
  const profileHintsV29471 = (typeof studentProfileHintsV29471==='function') ? studentProfileHintsV29471(r) : [];
  const open = cardDetailOpenV29461('parentRead') ? ' open' : '';
  const summaryBullets = [];
  if(traps.length) summaryBullets.push(traps[0]);
  else summaryBullets.push(idn.text);
  if(cost.cls==='danger' || cost.cls==='warn') summaryBullets.push(cost.text);
  if(profileHintsV29471.length) summaryBullets.push(profileHintsV29471[0].message);
  summaryBullets.push(parentLine(r));
  const bulletHtml = firstUsefulV29461(summaryBullets, 3).map(x=>`<li>${htmlSafeV2945(x)}</li>`).join('');
  const trapHtml = traps.length ? traps.map(x=>`<div class="pi-note danger-note">${htmlSafeV2945(x)}</div>`).join('') : '<div class="pi-note ok-note">暂未识别明显名称陷阱，但仍建议看招生章程中的校区、学费、体检和分流说明。</div>';
  const tagHtml = tags.length ? tags.map(x=>`<span class="pi-tag">${htmlSafeV2945(x)}</span>`).join('') : '<span class="pi-tag">方向待复核</span>';
  return `<details class="parent-insight-v2945 parent-insight-v29461"${open}>
    <summary>
      <div class="pi-summary-title"><b>家长必读</b><span>默认只看摘要，展开后看完整解释</span></div>
      <em class="advice ${advice.cls}">${htmlSafeV2945(advice.label)}</em>
      <ul class="pi-summary-bullets">${bulletHtml}</ul>
    </summary>
    <div class="pi-body-v29461">
      <div class="pi-grid">
        <div class="pi-box ${idn.cls}">
          <label>这是真专业吗？</label>
          <strong>${htmlSafeV2945(idn.label)}</strong>
          <p>${htmlSafeV2945(idn.text)}</p>
        </div>
        <div class="pi-box ${trend.cls}">
          <label>2025 变难还是变好进？</label>
          <strong>${htmlSafeV2945(trend.label)}</strong>
          <p>${htmlSafeV2945(trend.text)}</p>
        </div>
        <div class="pi-box ${cost.cls}">
          <label>普通家庭成本提示</label>
          <strong>${htmlSafeV2945(cost.label)}</strong>
          <p>${htmlSafeV2945(cost.text)}</p>
        </div>
        ${renderGeoHintV29472(r)}
        ${renderStudentProfileHintsV29471(r)}
      </div>
      <div class="pi-subgrid">
        <div>
          <label>名称风险提示</label>
          ${trapHtml}
        </div>
        <div>
          <label>方向理解</label>
          <div class="pi-tags">${tagHtml}</div>
          <div class="pi-note mid-note">研究生参考只用于理解升学方向，不能反推该校本科专业实力。</div>
        </div>
        <div>
          <label>为什么给这个候选建议</label>
          <div class="pi-tags">${advice.reasons.map(x=>`<span class="pi-tag ${advice.cls}">${htmlSafeV2945(x)}</span>`).join('') || '<span class="pi-tag">等待更多条件</span>'}</div>
        </div>
      </div>
    </div>
  </details>`;
}



/* V2.9.4.6 易混专业筛选与辨析展示层：只提示“容易看错”，不做专业好坏排序。 */
function confusablePairsForRecordV2946(r){
  if(!CONFUSABLE_MODEL_2946 || !CONFUSABLE_MODEL_2946.recordPairs) return [];
  const list = CONFUSABLE_MODEL_2946.recordPairs.get(r.id) || [];
  return list.filter(p=>p && p.front_display !== false).sort((a,b)=>(b.risk_score||0)-(a.risk_score||0));
}
function hasConfusableMajorV2946(r){ return confusablePairsForRecordV2946(r).length>0; }
function hasConfusableGroupV2946(r,gid){ return confusablePairsForRecordV2946(r).some(p=>p.group_id===gid); }
function riskLabelV2946(level){
  if(level==='high') return '高风险易混';
  if(level==='medium_high') return '中高风险易混';
  if(level==='medium') return '中风险易混';
  return '易混提醒';
}
function fmtMiniV2946(v){ return v===undefined||v===null||v===''?'-':String(v).replace(/\.0$/,''); }
function escapeV2946(v){ return htmlSafeV2945(v); }
function renderConfusableMajorPanelV2946(r){
  const pairs = confusablePairsForRecordV2946(r);
  if(!pairs.length) return '';
  const p = pairs[0];
  const current = (p.items||[]).find(x=>x.record_id===r.id) || (p.items||[])[0] || {};
  const peers = (p.items||[]).filter(x=>x.record_id!==r.id).slice(0,2);
  const peer = peers[0] || {};
  const basis = (p.basis||[]).slice(0,4).map(x=>`<li>${escapeV2946(x)}</li>`).join('');
  const peerRows = peers.map(x=>`<tr>
    <td>${escapeV2946(x.admission_major_name_raw)}</td>
    <td>${escapeV2946(x.catalog_major_code||'待复核')}</td>
    <td>${escapeV2946(x.discipline_category_name||'待复核')}</td>
    <td>${escapeV2946(x.major_class_name||'待复核')}</td>
    <td>${escapeV2946(x.plain_label||'需结合培养方案复核')}</td>
    <td>${fmtMiniV2946(x.score_2025)} / ${fmtMiniV2946(x.rank_2025)}</td>
  </tr>`).join('');
  const open = cardDetailOpenV29461('confusable') ? ' open' : '';
  const sideWarning = current.warning_summary_v29462 || p.parent_warning || '该专业容易与同校或同主题专业混淆，建议对比本科代码和专业大类。';
  const summaryLine = current.catalog_major_code
    ? `${current.catalog_major_code}｜${current.discipline_category_name||'门类待复核'}｜${current.major_class_name||'专业大类待复核'}；${sideWarning}`
    : sideWarning;
  return `<details class="confusable-v2946 confusable-v29461"${open}>
    <summary>
      <span>${riskLabelV2946(p.risk_level)}</span><b>名字相近，方向可能不同</b><em>${escapeV2946(p.group_name||'易混专业')}</em>
      <p>${escapeV2946(summaryLine)}</p>
    </summary>
    <div class="confusable-body">
      <div class="confusable-warning">${escapeV2946(sideWarning)}</div>
      <div class="confusable-grid">
        <div><span>当前专业官方口径</span><b>${escapeV2946(current.catalog_major_code||'待复核')}｜${escapeV2946(current.discipline_category_name||'待复核')}｜${escapeV2946(current.major_class_name||'待复核')}</b><p>${escapeV2946(current.plain_label||'需结合培养方案复核')}</p></div>
        <div><span>容易混淆对象</span><b>${escapeV2946(peer.admission_major_name_raw||'同校/同主题相近专业')}</b><p>${escapeV2946(peer.catalog_major_code||'待复核')}｜${escapeV2946(peer.discipline_category_name||'待复核')}｜${escapeV2946(peer.major_class_name||'待复核')}</p></div>
      </div>
      <div class="confusable-table-wrap"><table class="confusable-table"><thead><tr><th>对比专业</th><th>本科代码</th><th>门类</th><th>专业大类</th><th>家长理解</th><th>2025分/位</th></tr></thead><tbody>
        <tr><td>${escapeV2946(current.admission_major_name_raw||r.major)}</td><td>${escapeV2946(current.catalog_major_code||'待复核')}</td><td>${escapeV2946(current.discipline_category_name||'待复核')}</td><td>${escapeV2946(current.major_class_name||'待复核')}</td><td>${escapeV2946(current.plain_label||'需结合培养方案复核')}</td><td>${fmtMiniV2946(current.score_2025)} / ${fmtMiniV2946(current.rank_2025)}</td></tr>
        ${peerRows}
      </tbody></table></div>
      <div class="confusable-basis"><b>判断依据：</b><ul>${basis}</ul></div>
      <div class="confusable-note">说明：这是“易混提醒”，只在容易被误认的一侧显示；正主专业只作为对比参照，不主动打提醒。具体课程、分流、转专业、校区、学费仍需查学校招生章程和培养方案。</div>
    </div>
  </details>`;
}

function populateConfusableGroupFilterV2946(){
  const sel=document.getElementById('filterConfusableGroup');
  if(!sel || !CONFUSABLE_MODEL_2946) return;
  const current=sel.value||'';
  const groups=(CONFUSABLE_MODEL_2946.groups?.items||[]).slice().sort((a,b)=>String(a.group_name).localeCompare(String(b.group_name),'zh-CN'));
  sel.innerHTML='<option value="">全部易混主题</option>'+groups.map(g=>`<option value="${escapeV2946(g.group_id)}">${escapeV2946(g.group_name)}</option>`).join('');
  if(current) sel.value=current;
}

function renderCards(){
  ensureCardViewModeToolbarV29461();
  applyCardViewModeClassV29461();
  const start=(currentPage-1)*pageSize,rows=filtered.slice(start,start+pageSize),el=document.getElementById('cards');
  el.innerHTML=rows.map(r=>{
    const reasons=(r._reasons||[]).slice(0,3).map(x=>`<span class="pill purple">${x}</span>`).join('');
    const risks=(r.riskFlags||[]).slice(0,3).map(x=>`<span class="pill red">${x}</span>`).join('');
    const keys=(r.keySubjectHints||[]).slice(0,2).map(x=>`<span class="pill green">重点：${x}</span>`).join('');
    const badges=riskBadgesV29461(r).map(x=>`<span class="pill v29461-risk ${x.cls}">${htmlSafeV2945(x.text)}</span>`).join('');
    const summary=primarySummaryV29461(r);
    const official=compactOfficialLineV29461(r);
    return`<div class="card card-v29461 level-${r._level}">
      <div class="cardTop">
        <div><div class="school">${r.school} <span class="pill geo-city-v29472">${htmlSafeV2945(geoDisplayV29472(r))}</span> <span class="pill nature-pill ${r.schoolNature.cls||'unknown'}">${r.schoolNature.label}</span> <span class="pill tier-pill ${r.schoolTier?.cls||'tier-unknown'}">${r.schoolTier?.label||'层级待核验'}</span></div><div class="major">${r.major}</div><div class="official-mini-v29461">${htmlSafeV2945(official)}</div>${renderTaxonomyLine(r)}</div>
        <div class="level">${levelPill(r._level)}</div>
      </div>
      <div class="card-meta-v29461"><span class="pill blue">画像 ${Math.round(r._profile)}分</span>${r.rankChangeLabel?`<span class="pill blue">${r.rankChangeLabel}</span>`:''}${badges}</div>
      <div class="score-meter"><i style="width:${Math.round(r._profile)}%"></i></div>
      <div class="kv kv-v29461"><div><span>2025分/位</span><b>${fmt(r.score2025)} / ${fmt(r.rank2025)}</b></div><div><span>2024分/位</span><b>${fmt(r.score2024)} / ${fmt(r.rank2024)}</b></div><div><span>分差</span><b>${fmt(r.scoreDiff)}</b></div><div><span>位次差</span><b>${fmt(r.rankDiff)}</b></div></div>
      <div class="summary-v29461">${htmlSafeV2945(summary)}</div>
      <div class="secondary-pills-v29461">${reasons}${risks}${keys}</div>
      ${renderConfusableMajorPanelV2946(r)}
      ${renderParentInterestPanelV2945(r)}
      ${renderTaxonomyDetail(r)}
      <div class="judge"><b>高报师判断：</b>${judge(r)}</div>
      ${renderRule(r)}
      <div class="row action-row-v29461"><button class="secondary slim" onclick="addCandidate('${r.id}')">加入候选</button></div>
    </div>`
  }).join('')||'<div class="notice">没有命中结果。可以放宽目标区域、关闭严格画像缩水，或清空关键词。</div>';
  const pages=Math.max(1,Math.ceil(filtered.length/pageSize));
  document.getElementById('pageInfo').textContent=`${currentPage} / ${pages}`;
  syncCardViewModeButtonsV29461();
}

function renderPlanABC(){const box=document.getElementById('planABC');if(!currentRank){box.innerHTML='';return}const usable=filtered.filter(r=>!r._excludes?.length);function pick(ls){return usable.filter(r=>ls.includes(r._level)).sort((a,b)=>(b._profile-a._profile)||(a._fit-b._fit))[0]}const A=pick(['可冲','超冲']),B=pick(['匹配','稳妥']),C=pick(['保底','稳妥']);function item(x,cls,title,txt){return x?`<div class="plan-card ${cls}"><h3>${title}</h3><b>${x.school}</b><p>${x.major}</p><p>${geoDisplayV29472(x)}｜${txt}｜${x._level}｜画像${Math.round(x._profile)}分｜2025位次${fmt(x.rank2025)}</p><p><b>为什么：</b>${(x._reasons||[]).slice(0,3).join('；')||'画像匹配度较高'}</p></div>`:`<div class="plan-card ${cls}"><h3>${title}</h3><p>暂无合适候选。可放宽区域或调整八连问。</p></div>`}box.innerHTML=item(A,'a','方案A：冲','只适合放前段，不押宝')+item(B,'b','方案B：稳','优先精读和核验')+item(C,'c','方案C：保','防滑档，但仍看专业质量')}
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
  if(count(r=>r.isCollegeSpecialPlanV29474)>0)warnings.push('提醒：含高校专项资格候选');
  if(count(r=>r.schoolProvince!=='辽宁')>rows.length*0.6)warnings.push('提醒：省外比例较高');
  const items=[`总数 ${rows.length}`,`冲 ${count(r=>['可冲','超冲'].includes(classify(r.rank2025)))}`,`稳/匹配 ${count(r=>['匹配','稳妥'].includes(classify(r.rank2025)))}`,`保底 ${count(r=>classify(r.rank2025)==='保底')}`,`公办倾向 ${count(r=>r.schoolNature?.label==='公办倾向')}`,`沈阳 ${count(r=>r.lnArea==='沈阳')} / 大连 ${count(r=>r.lnArea==='大连')}`,...warnings];
  el.innerHTML=items.map(x=>`<div class="structure-item">${x}</div>`).join('');
}

function renderCandidates(){document.getElementById('candidateList').innerHTML=candidates.map(r=>`<div class="candidate"><b>${r.school}</b><div>${r.major}</div><div class="small">${geoDisplayV29472(enrich(r))}｜2025：${fmt(r.score2025)} 分 / ${fmt(r.rank2025)} 位</div><button class="ghost slim" style="margin-top:8px" onclick="removeCandidate('${r.id}')">移除</button></div>`).join('')||'<p class="small">还没有加入候选。</p>'}function removeCandidate(id){candidates=candidates.filter(x=>x.id!==id);localStorage.setItem('ln_candidates_v292',JSON.stringify(candidates));renderCandidates()}function clearCandidates(){candidates=[];localStorage.removeItem('ln_candidates_v292');renderCandidates()}
function csvEscape(v){if(v==null)v='';v=String(v);return/[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v}function rowsToCsv(rows){
  const head=['学校','省份','城市','区域','学校地域来源','地域置信度','学校性质','院校层级','专业','标准专业','学科门类','专业类代码','本科专业类','专业代码','学硕一级/跨门类参考','专硕类别/领域参考','二级学科示例','目录可信度','招生名复核','易混主题','2025分','2025位次','2024分','2024位次','层级','画像分','风险','地域说明'];
  const body=(rows||[]).map(r=>{
    r=enrich(r);
    return [r.school,r.schoolProvince||'',r.schoolCity||'',r.schoolRegion||'',r.schoolGeoSourceMethod||'',confidenceLabel(r.schoolGeoConfidence||'low'),r.schoolNature?.label||'',r.schoolTier?.label||'',r.major,r.cleanMajor,r.undergradDisciplineName,r.officialCategoryCode,r.undergradCategoryName,r.officialMajorCode,r.gradAcademicText,r.gradProfessionalText,r.gradSecondaryText,confidenceLabel(r.gradReferenceConfidence||r.taxonomyConfidence),r.admissionReviewTags||'', confusablePairsForRecordV2946(r).map(p=>p.group_name).join('|'), r.score2025,r.rank2025,r.score2024,r.rank2024,r._level||'',Math.round(r._profile||0),(r.riskFlags||[]).join('|'),CITY_GEO_NOTE_V29472]
      .map(x=>`"${String(x??'').replace(/"/g,'""')}"`).join(',');
  });
  return [head.join(','),...body].join('\n');
}function download(name,text){const b=new Blob([text],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;a.click();URL.revokeObjectURL(a.href)}function exportFiltered(){download('辽宁物理类_V2.9.4.7.5_筛选结果_高报师方案.csv',rowsToCsv(filtered))}function exportCandidates(){download('辽宁物理类_V2.9.4.7.5_候选清单_高报师方案.csv',rowsToCsv(candidates.map(enrich)))}

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
    feeType: textVal('filterFeeType')||'全部',
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
  ctx.fillText(`版本：V2.9.4.7.5｜生成时间：${new Date().toLocaleString('zh-CN')}`,M+38,y+100);
  wrapCanvasText(ctx,'说明：PNG 为当前页面摘要图，便于转发沟通；正式填报仍需复核招生计划、专业实际校区、体检、学费与专业组。',M+38,y+136,contentW-76,30,'rgba(255,255,255,.88)','23px sans-serif',1);
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
    ['目标城市',safeText(info.targetCities),{bg:'#f8fbff'}],
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
    `城市方式：${safeText(info.cityMode)||'不限'}`,
    `学校关键词：${safeText(info.schoolKeyword)||'无'}`,
    `专业关键词：${safeText(info.majorKeyword)||'无'}`,
    `办学/收费：${safeText(info.feeType)||'全部'}`
  ].join(' ｜ ');
  wrapCanvasText(ctx,condText,M+46,longY+62,contentW-92,28,'#314762','22px sans-serif',2);
  y += summaryH + 24;

  roundRect(ctx,M,y,contentW,planH,26,'#ffffff','rgba(47,91,176,.12)');
  drawSectionTitle('二、A / B / C 方案概览',M+26,y+42);
  const cols=[['A：稳妥公办',plan.A,'#fff4e6','#ef6c00'],['B：专业路径',plan.B,'#eaf3ff','#1565c0'],['C：城市/层级',plan.C,'#f4e9ff','#7b1fa2']];
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

    wrapCanvasText(ctx,`${i+1}. ${r.school}｜${geoDisplayV29472(r)}｜${r.schoolTier?.label||'层级待核验'}`,M+154,yy+36,560,28,'#17324d','bold 25px sans-serif',1);
    wrapCanvasText(ctx,`${r.major}`,M+154,yy+70,640,26,'#334b68','22px sans-serif',1);
    wrapCanvasText(ctx,`2025：${fmt(r.score2025)}分 / ${fmt(r.rank2025)}位｜2024：${fmt(r.score2024)}分 / ${fmt(r.rank2024)}位｜画像 ${Math.round(r._profile||0)}分`,M+154,yy+100,700,24,'#5f7691','20px sans-serif',1);

    wrapCanvasText(ctx,`本科类：${r.officialCategoryCode||''}${r.undergradCategoryName||'待复核'}｜研一级：${r.primaryDisciplineNames||'待复核'}｜招生名：${r.admissionReviewTags||'已校准'}`,M+900,yy+40,contentW-980,24,'#24507b','20px sans-serif',2);
    wrapCanvasText(ctx,`判断：${judge(r)||'—'}`,M+900,yy+92,contentW-980,23,'#6b7f93','19px sans-serif',2);
    yy += rowH;
  });
  y += listH + 24;

  wrapCanvasText(ctx,'注：本摘要图用于初选沟通，不替代正式志愿表。中外合作、高收费、专业类分流、一级学科映射置信度低等情况，请务必再做人工核验。',M,y+26,contentW,28,'#627b97','20px sans-serif',2);

  const name=kind==='candidates'?'辽宁物理类_V2.9.4.7.5_候选清单摘要.png':'辽宁物理类_V2.9.4.7.5_筛选摘要.png';
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
  ['qSchool','qMajor','filterSubjectGroup','filterPrimary','filterTaxConfidence','filterLevel','targetCities'].forEach(id=>{if((document.getElementById(id)?.value||'').trim())n++});
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
    ['qSchool','qMajor','filterPrimary','targetCities'].forEach(id=>{const el=document.getElementById(id); if(el)el.value=''});
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
  const cityStats=(filtered||[]).reduce((m,r)=>{const k=geoDisplayV29472(r);m[k]=(m[k]||0)+1;return m;},{});
  const topCity=Object.entries(cityStats).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k,v])=>`${k}:${v}`).join('｜')||'无';
  panel.innerHTML=`<b>V2.9.4.7.5 Debug</b><br/>
  viewport：<code>${window.innerWidth}×${window.innerHeight}</code><br/>
  scrollWidth：<code>${document.documentElement.scrollWidth}</code>｜横向溢出：<span class="${overflow?'bad':'ok'}">${overflow?'是':'否'}</span><br/>
  manifest：<code>${MANIFEST?MANIFEST.version:'未加载'}</code>｜rank：<code>${RANK2025?'已加载':'未加载'}</code><br/>
  taxonomy：<code>${TAXONOMY_READY?TAXONOMY_MAP.size+' 项':'未加载'}</code><br/>
  currentRank：<code>${currentRank||'-'}</code>｜DATA：<code>${DATA.length}</code>｜filtered：<code>${filtered.length}</code><br/>
  chunks：<code>${loaded}</code><br/>
  条件数：<code>${activeConditionCount()}</code>｜城市模式：<code>${cityModeV29472()}</code>｜目标城市：<code>${selectedCitiesV29472().join('、')||'不限'}</code><br/>
  当前结果城市Top：<code>${topCity}</code><br/>
  易混模型：<code>${CONFUSABLE_MODEL_2946?((CONFUSABLE_MODEL_2946.detectedPairs?.count||0)+' 对 / '+(CONFUSABLE_MODEL_2946.recordIndex?.count||0)+' 条索引'):'未加载'}</code><br/>学校地域：<code>${SCHOOL_GEO_MODEL_29471?(SCHOOL_GEO_MODEL_29471.items.length+' 所，city全量'):'未加载'}</code>｜学生画像：<code>${STUDENT_PROFILE_MODEL_29471?((STUDENT_PROFILE_MODEL_29471.rules||[]).length+' 条规则'):'未加载'}</code><br/>app.js：<code>app.v29475.js</code>｜app.css：<code>app.v29475.css</code>`;
}
function initV292UX(){
  applyCardViewModeClassV29461();
  ensureCardViewModeToolbarV29461();
  if(debugEnabled())renderDebugPanel();
  window.addEventListener('resize',()=>{applyCardViewModeClassV29461();syncCardViewModeButtonsV29461();renderDebugPanel();});
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
    GRADUATE_CATALOG_2022_2025 = await loadJsonFile(DATA_FILES.graduateCatalog,'研究生学科代码表');
    try{
      if(window.loadConfusableMajorModelV2946){
        CONFUSABLE_MODEL_2946 = await window.loadConfusableMajorModelV2946();
        populateConfusableGroupFilterV2946();
      }
    }catch(confErr){
      console.warn('[V2.9.4.6] 易混专业模型加载失败，不影响主筛选：', confErr);
      CONFUSABLE_MODEL_2946 = null;
    }

    try{
      const geoManifest = await loadJsonFile(DATA_FILES.schoolGeoManifest,'学校地域模型清单');
      const geoRef = await loadJsonFile(DATA_FILES.schoolGeoReference,'学校地域标准表');
      const geoAlias = await loadJsonFile(DATA_FILES.schoolGeoAlias,'学校别名表');
      const map = new Map();
      (geoRef.items||[]).forEach(x=>{ map.set(x.school_name,x); if(x.standard_school_name) map.set(x.standard_school_name,x); });
      (geoAlias.items||[]).forEach(a=>{ const target=map.get(a.standard_school_name); if(target) map.set(a.raw_school_name,target); });
      SCHOOL_GEO_MODEL_29471={manifest:geoManifest, items:geoRef.items||[], alias:geoAlias.items||[], map};
      populateCityDatalistV29472();
    }catch(geoErr){
      console.warn('[V2.9.4.7.1] 学校地域模型加载失败，回退旧识别：', geoErr);
      SCHOOL_GEO_MODEL_29471=null;
    }
    try{
      STUDENT_PROFILE_MODEL_29471 = await loadJsonFile(DATA_FILES.studentProfileRules,'学生画像规则');
    }catch(profileErr){
      console.warn('[V2.9.4.7.1] 学生画像规则加载失败，不影响主筛选：', profileErr);
      STUDENT_PROFILE_MODEL_29471=null;
    }
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



/* =========================
 * V2.9.4.7.5 高报师工作流：冲突诊断 + A/B/C 方案框架
 * 说明：不推翻 V2.9.4.7.2 的筛选逻辑，只在结果解释层增加“问底线 → 看位次 → 冲突诊断 → 三方案 → 复核清单”。
 * ========================= */
function scoreBandV29473(){
  const s=Number(document.getElementById('myScore')?.value||0);
  if(s>=650)return '700—650 / 650+ 高分段';
  if(s>=620)return '650—620';
  if(s>=580)return '620—580';
  if(s>=540)return '580—540';
  if(s>=500)return '540—500';
  if(s>=450)return '500—450';
  if(s>=400)return '450—400';
  if(s>=350)return '400—350';
  const r=currentRank||resolveRank();
  if(!r)return '未定位';
  if(r<6500)return '650+ 高分段';
  if(r<15000)return '650—620';
  if(r<30000)return '620—580';
  if(r<47000)return '580—540';
  if(r<65000)return '540—500';
  if(r<90000)return '500—450';
  if(r<115000)return '450—400';
  return '400—350 / 本科边缘';
}
function selectedRejectSetV29473(){return new Set(selectedRejects ? selectedRejects() : []);}
function conditionSnapshotV29473(){
  const provinces = typeof selectedProvinces==='function' ? selectedProvinces() : [];
  const cities = typeof selectedCitiesV29472==='function' ? selectedCitiesV29472() : [];
  const rejectSet = selectedRejectSetV29473();
  const budget = document.getElementById('budget')?.value || 'normal';
  const priority = document.getElementById('priority')?.value || 'employment';
  const regionMode = document.getElementById('regionMode')?.value || 'none';
  const cityMode = cityModeV29472 ? cityModeV29472() : 'none';
  const strongProvince = getGroup('outProvince')==='no' || (regionMode==='hard' && provinces.length===1 && provinces[0]==='辽宁') || ['shenyang','dalian','publicLow','grid'].includes(currentStrategy);
  const strongCity = priority==='city' || cityMode!=='none' || cities.length>0 || ['shenyang','dalian','city'].includes(currentStrategy);
  const qMajor = (document.getElementById('qMajor')?.value||'') + ' ' + (document.getElementById('filterSubjectGroup')?.value||'');
  const hotMajor = /计算机|软件|人工智能|数据|信息安全|网络|电气|电子|临床|口腔|医学|师范|法学/.test(qMajor) || ['grid','medical','exam'].includes(currentStrategy) || ['grid','exam'].includes(priority);
  const normalFamily = budget==='normal' || document.getElementById('familyTolerance')?.value==='low';
  const budgetWide = budget==='high' || budget==='coop' || document.getElementById('familyTolerance')?.value==='high';
  const coopIntent = budget==='coop' || (document.getElementById('filterFeeType')?.value||'all').includes('coop');
  const noHighFee = budget==='normal' || rejectSet.has('高收费') || (document.getElementById('filterFeeType')?.value==='excludeHighPrivate');
  const strict = !!document.getElementById('strictProfile')?.checked;
  const scoreBand = scoreBandV29473();
  const lowScore = /540—500|500—450|450—400|400—350|本科边缘/.test(scoreBand);
  const edgeScore = /500—450|450—400|400—350|本科边缘/.test(scoreBand);
  const highScore = /650\+|650—620|700/.test(scoreBand);
  const specialStatus=specialPlanStatusV29474();
  return {provinces,cities,rejectSet,budget,priority,regionMode,cityMode,strongProvince,strongCity,hotMajor,normalFamily,budgetWide,coopIntent,noHighFee,strict,scoreBand,lowScore,edgeScore,highScore,specialStatus};
}
function strengthRowsV29473(s){
  const rows=[];
  rows.push(['家庭成本',s.noHighFee?'硬底线/强保护':s.budgetWide?'预算较宽，可比较高收费':'普通偏好']);
  rows.push(['地域范围',s.strongProvince?'强省内/近省':'可全国比较']);
  rows.push(['城市要求',s.strongCity?(s.cityMode==='hard'?'指定城市硬筛':'城市优先/软筛'):'不限制城市']);
  rows.push(['专业热度',s.hotMajor?'热门/目标方向较强':'未强限定']);
  rows.push(['民办路径',s.budgetWide||s.edgeScore?'可进入比较，需复核':'默认不优先']);
  rows.push(['中外合作',s.coopIntent?'明确提档路径，强复核':s.budgetWide?'可作为提档方案，需复核':'普通家庭谨慎']);
  rows.push(['高校专项资格',s.specialStatus==='approved'?'已通过审核，专项候选可比较':s.specialStatus==='unknown'?'不确定，暂按未审核隐藏':'未审核/未通过，默认隐藏']);
  return rows;
}
function applyStageV29473(rows, name, fn, funnel){
  const before=rows.length;
  const out=rows.filter(fn);
  funnel.push({step:name,count:out.length,drop:before-out.length,before});
  return out;
}
function buildFunnelV29473(){
  const funnel=[];
  let rows=DATA.map(r=>{
    const level=classify(r.rank2025), p=profileScore(r);
    return {...r,_level:level,_fit:currentRank&&r.rank2025?Math.abs(r.rank2025-currentRank):999999999,_profile:p.score,_reasons:p.reasons,_excludes:p.excludes,_mentor:p.mentor,_confidence:confidence(r)};
  });
  funnel.push({step:'位次分段加载',count:rows.length,drop:0,before:rows.length});
  if(specialPlanStatusV29474()!=='approved'){
    rows=applyStageV29473(rows,'高校专项资格保护',r=>!r.isCollegeSpecialPlanV29474,funnel);
  }else{
    funnel.push({step:'高校专项资格保护',count:rows.length,drop:0,before:rows.length,note:'已通过审核，专项候选进入比较'});
  }
  const qS=document.getElementById('qSchool')?.value.trim()||'', qM=document.getElementById('qMajor')?.value.trim()||'';
  const fSubject=document.getElementById('filterSubjectGroup')?.value||'', fPrimary=document.getElementById('filterPrimary')?.value.trim()||'';
  if(qS||qM||fSubject||fPrimary){
    rows=applyStageV29473(rows,'关键词/学科筛选',r=>{
      if(qS&&!(r.school||'').includes(qS))return false;
      if(qM&&!majorMatchesV29475(r,qM))return false;
      if(fSubject&&r.subjectGroup!==fSubject)return false;
      if(fPrimary&&!((r.primaryDisciplineNames||'').includes(fPrimary)||(r.primaryDisciplineCodes||'').includes(fPrimary)||(r.cleanMajor||'').includes(fPrimary)||(r.undergradCategoryName||'').includes(fPrimary)||(r.officialCategoryCode||'').includes(fPrimary)||(r.officialMajorCode||'').includes(fPrimary)||(r.officialDisciplineCode||'').includes(fPrimary)||(r.officialMajorName||'').includes(fPrimary)))return false;
      return true;
    },funnel);
  }
  const provinces=selectedProvinces ? selectedProvinces() : [];
  const regionMode=document.getElementById('regionMode')?.value||'none';
  if(regionMode==='hard' && provinces.length){
    rows=applyStageV29473(rows,'区域硬筛',r=>provinces.includes(r.schoolProvince),funnel);
  }else if(regionMode==='soft' && provinces.length){
    funnel.push({step:'区域软筛',count:rows.length,drop:0,before:rows.length,note:'软筛不排除，只影响画像和提醒'});
  }
  const cities=selectedCitiesV29472 ? selectedCitiesV29472() : [];
  const cMode=cityModeV29472 ? cityModeV29472() : 'none';
  if(cMode==='hard' && cities.length){
    rows=applyStageV29473(rows,'城市硬筛',r=>cityMatchesV29472(r,cities),funnel);
  }else if(cMode==='soft' && cities.length){
    funnel.push({step:'城市软筛',count:rows.length,drop:0,before:rows.length,note:'软筛不排除，只影响画像和提醒'});
  }
  const fSchoolTier=document.getElementById('filterSchoolTier')?.value||'';
  if(fSchoolTier){
    rows=applyStageV29473(rows,'学校性质/层级筛选',r=>{
      if(fSchoolTier==='985')return r.schoolTier?.level==='985';
      if(fSchoolTier==='211')return r.schoolTier?.level==='211';
      if(fSchoolTier==='public')return ['public','publicSoft'].includes(r.schoolTier?.level);
      if(fSchoolTier==='private')return r.schoolTier?.level==='private';
      if(fSchoolTier==='unknown')return r.schoolTier?.level==='unknown';
      return true;
    },funnel);
  }
  const strict=!!document.getElementById('strictProfile')?.checked;
  const budget=document.getElementById('budget')?.value||'normal';
  if(strict && budget==='normal'){
    rows=applyStageV29473(rows,'预算/高收费保护',r=>!(r._excludes||[]).some(x=>/高收费|预算/.test(x)),funnel);
  }
  if(strict){
    rows=applyStageV29473(rows,'画像拒绝项缩水',r=>!(r._excludes||[]).length,funnel);
    rows=applyStageV29473(rows,'低画像匹配排除',r=>(r._profile||0)>=32,funnel);
  }else{
    funnel.push({step:'画像规则',count:rows.length,drop:0,before:rows.length,note:'严格画像未开启'});
  }
  return funnel;
}
function topPressureV29473(funnel){
  return (funnel||[]).filter(x=>x.drop>0).sort((a,b)=>b.drop-a.drop).slice(0,3);
}
function diagnoseV29473(){
  const s=conditionSnapshotV29473();
  const funnel=buildFunnelV29473();
  const top=topPressureV29473(funnel);
  const few=(filtered||[]).length<20 && !!currentRank;
  const many=(filtered||[]).length>260 && !!currentRank;
  const conflicts=[];
  const add=(id,title,diagnosis,relax,avoid,review,schemes)=>conflicts.push({id,title,diagnosis,relax,avoid,review,schemes});
  const publicFirst=currentStrategy==='publicLow'||s.priority==='publicLow'||document.getElementById('filterSchoolTier')?.value==='public';
  const strongEmployment=['employment','grid'].includes(s.priority)||['employment','grid'].includes(currentStrategy);
  if(s.lowScore && publicFirst && s.strongCity && (s.hotMajor||s.strongProvince) && s.noHighFee){
    add('low_perfect','低分段多重约束','公办、好城市、热门专业、不出省、普通学费同时满足难度较高。',['先把城市从硬条件改为软偏好','把热门专业扩展到相近专业','从只看辽宁扩展到东北/近省'],['不建议先放宽家庭成本底线','不建议直接接受未核验高收费','不建议牺牲孩子明显不适配项'],['学费','校区','专业可读性','学校性质'],['A 省内公办稳妥','B 专业路径扩展','C 东北近省比较']);
  }
  if(few && s.strongProvince && strongEmployment){
    add('province_employment','强省内 + 强就业冲突','省内范围较窄，就业导向专业竞争较强，候选容易偏少。',['辽宁省内扩展到东北/近省','沈阳/大连扩展到辽宁其他城市','热门正主专业扩展到相近专业'],['不建议先接受高收费','不建议降到明显不适配专业'],['学校行业背景','就业半径','实际校区'],['A 省内稳妥','B 专业路径','C 近省扩展']);
  }
  if(few && s.normalFamily && s.strongCity){
    add('ordinary_city','普通家庭 + 强城市冲突','城市偏好正在挤压公办、成本和专业适配空间。',['城市硬筛改为软提醒','目标城市扩展到同省/近省其他城市','热门专业改为相近专业'],['不建议为了城市直接接受高收费','不建议为城市牺牲孩子明显不适配项'],['学费','学校性质','实际校区','城市生活成本'],['A 成本可控','B 专业路径','C 城市软筛']);
  }
  if((s.budgetWide||s.coopIntent) && (s.priority==='school'||s.priority==='city'||s.strongCity||s.coopIntent)){
    add('budget_coop',s.coopIntent?'中外合作提档复核':'预算宽 + 提档复核',s.coopIntent?'当前已进入中外合作提档路径：重点不是能不能花钱，而是钱是否换来了学校层级、城市资源或专业机会。':'预算较宽可以比较中外合作或民办城市方案，但重点是钱是否换来有效提升。',['普通批公办方案与中外合作并列比较','核验证书/培养地点后再定','把民办城市专业作为备选路径'],['不建议只看学校名字','不建议忽略专业适配','不建议未核验证书就当真提档'],['证书','学费','培养地点','是否必须出国','外语要求'],['A 普通批公办','B 专业匹配','C 中外合作/民办提档']);
  }
  const mathLow=document.getElementById('mathTolerance')?.value==='low', fieldReject=document.getElementById('fieldWorkAcceptance')?.value==='reject', gradNo=(document.getElementById('gradPlan')?.value==='no'||document.getElementById('gradWillingnessV29471')?.value==='no');
  if(publicFirst && (mathLow||fieldReject||gradNo)){
    add('public_fit','公办执念 + 专业适配风险','公办身份有价值，但当前孩子画像显示部分专业可读性需要二次确认。',['公办冷门专业扩展到相近可读专业','省内公办扩展到近省公办','必要时比较民办匹配专业'],['不建议无脑接受强工科','不建议把孩子完全不适配项当作让步项'],['课程难度','工程现场','读研依赖','孩子接受度'],['A 公办保底线','B 可读专业','C 民办匹配专业比较']);
  }
  if(s.edgeScore && (s.budgetWide || document.getElementById('filterSchoolTier')?.value==='private')){
    add('private_path','民办现实路径','民办可以进入比较，但不能只为本科标签选择。',['民办作为路径比较','专业路径优先','同步比较优质高职/专升本路径'],['不建议只看本科身份','不建议忽略四年成本','不建议忽略孩子自律'],['学费','学校管理','就业资源','考研/考公路径'],['A 公办机会','B 民办本科路径','C 高职/专升本对照']);
  }
  if((document.getElementById('gradPlan')?.value==='yes'||s.priority==='postgrad') && (mathLow||s.lowScore)){
    add('postgrad_trap','考研兜底幻觉','考研可以拓展路径，但不能弥补所有本科选择问题。',['深造依赖专业增加本科就业兜底','弱平台深造依赖改为平台更稳','把考研目标拆成专业和学校'],['不建议把考研当默认兜底','不建议用考研解释所有冷门专业'],['学习耐力','本科平台','考研失败兜底'],['A 本科就业可兜底','B 深造友好','C 平台上限']);
  }
  if(s.priority==='grid'||currentStrategy==='grid'){
    add('grid_imagination','电网想象复核','电气类更接近电网方向，但自动化、测控、能源动力、电子信息不能直接等同电气正主。',['电气正主、泛电类、能源相关、自动化相关分层比较'],['不建议把所有“电/能源/自动化”都当电网正主'],['专业代码','学校电力背景','国网招聘口径'],['A 电气正主','B 泛电类相关','C 能源/自动化扩展']);
  }
  if(currentStrategy==='medical'||getGroup('medicine')==='prefer'){
    add('medical_path','医学路径误认复核','带“医学”不等于医生路径，需要分清临床医生、医学技术、护理康复、药学检验。',['医生路径、医学技术路径、护理康复路径分层比较'],['不建议把医学技术当临床医生路径','不建议忽略长周期和执业资格'],['执业资格','规培周期','培养方案','是否医生路径'],['A 医生路径','B 医学技术','C 护理康复/药学检验']);
  }
  if(many && currentStrategy==='broad'){
    add('too_broad','全量观察过宽','当前不是条件过紧，而是条件过宽，需要先确定底线。',['先问学费、省内、民办/中外合作、专业排斥','再看位次和路径'],['不建议直接看大列表','不建议只按最低分排序'],['家庭底线','专业路径','复核清单'],['A 成本优先缩小','B 地域优先缩小','C 专业路径缩小']);
  }
  if(s.specialStatus!=='approved' && (exclusionStats&&exclusionStats['高校专项隐藏']>0)){
    add('special_plan_protect','高校专项默认保护','当前未选择“已通过高校专项计划审核”，系统已隐藏相关候选，避免把普通考生不能报的入口混入 A/B/C 方案。',['如果已通过资格审核，可在第一步改为“已通过高校专项计划审核”','如不确定，继续按未审核处理更稳'],['不建议把高校专项计划当作普通候选','不建议用专项计划缓解普通批结果偏少'],['资格审核结果','公示名单','招生计划','招生章程'],['普通候选 A/B/C','专项资格候选单独复核']);
  }
  if(!conflicts.length){
    const p=top.map(x=>x.step).join('、')||'暂无明显压缩点';
    add('general','当前条件暂无明显冲突',few?`当前结果偏少，主要压缩点可能是：${p}。`:`当前结果数量基本可用，建议先按 A/B/C 三方案看取舍。`,['若结果偏少，先放宽压缩最大的偏好项','若结果偏多，先明确成本、地域和专业底线'],['不要先放宽家庭成本底线','不要忽略专业实际校区'],['招生章程','学费','校区','专业路径'],['A 稳妥公办','B 专业路径','C 城市/学校层级']);
  }
  return {snapshot:s,funnel,top,conflicts:conflicts.slice(0,3)};
}
function rowPlanScoreV29473(r,type,chosen){
  let sc=0; const m=r.majorText||r.major||''; const s=conditionSnapshotV29473();
  if(type==='A'){
    if(['匹配','稳妥','保底'].includes(r._level))sc+=25;
    if(r.schoolNature?.label==='公办倾向')sc+=30;
    if(!r.isHighFee)sc+=16;
    if(['辽宁','吉林','黑龙江'].includes(r.schoolProvince))sc+=8;
    sc+=(r._profile||0)*0.35; sc-=((r._excludes||[]).length*18);
  }else if(type==='B'){
    if(['匹配','稳妥'].includes(r._level))sc+=18;
    if(s.priority==='grid'&&isGrid(m))sc+=35;
    else if(currentStrategy==='medical'&&isMed(m))sc+=35;
    else if(s.priority==='exam'&&(isLiberal(m)||isComp(m)||isTeacher(m)))sc+=28;
    else if(isGrid(m)||isComp(m)||isTeacher(m)||isMed(m))sc+=18;
    if((r._reasons||[]).length)sc+=Math.min(22,(r._reasons||[]).length*5);
    if(isDeepTrap(m)&&document.getElementById('gradPlan')?.value==='no')sc-=18;
    sc+=(r._profile||0)*0.45;
  }else{
    if(['可冲','匹配','稳妥'].includes(r._level))sc+=18;
    if(['985','211'].includes(r.schoolTier?.level))sc+=25;
    if(s.cities.length && cityMatchesV29472(r,s.cities))sc+=28;
    if(s.strongCity && ['沈阳','大连'].includes(r.schoolCity))sc+=10;
    if((s.budgetWide||s.coopIntent) && (r.isHighFee||r.isCoopV29475))sc+=18;
    if(r.isHighFee && !(s.budgetWide||s.coopIntent))sc-=25;
    sc+=(100-(r._fit||999999)/1000)*0.08;
    sc+=(r._profile||0)*0.25;
  }
  if(chosen && chosen.has(r.id))sc-=9999;
  return sc;
}
function pickSchemeRowsV29473(){
  const usable=(filtered||[]).filter(r=>!(r._excludes||[]).length);
  const chosen=new Set();
  function pick(type){
    const row=usable.slice().sort((a,b)=>rowPlanScoreV29473(b,type,chosen)-rowPlanScoreV29473(a,type,chosen))[0]||null;
    if(row)chosen.add(row.id); return row;
  }
  return {A:pick('A'),B:pick('B'),C:pick('C')};
}
function planReviewTagsV29473(r,type){
  const tags=['招生章程','专业代码'];
  if(!r)return tags;
  if(type==='A')tags.push('学校性质','普通学费','实际校区','专业可读性');
  if(type==='B')tags.push('培养方案','就业去向','是否读研依赖','行业背景');
  if(type==='C')tags.push('学费/证书','大类分流','实际校区','转专业政策');
  if(r.isHighFee)tags.push('高收费/中外合作');
  if(r.isCollegeSpecialPlanV29474)tags.push('专项资格审核');
  if(isMed(r.majorText||r.major))tags.push('医学执业路径');
  if(isGrid(r.majorText||r.major))tags.push('电网招聘口径');
  if(hasConfusableMajorV2946 && hasConfusableMajorV2946(r))tags.push('易混专业');
  return [...new Set(tags)].slice(0,7);
}
function planCardV29473(type,row){
  const meta={
    A:{cls:'a',title:'A：稳妥公办方案',fit:'普通家庭、低容错、强省内、公办优先家庭',sacrifice:'可能牺牲城市、专业热度和学校层级',risk:'公办不等于一定适配，低分段要看孩子能不能读下去',line:'优先保公办、普通学费和基本路径，适合先守住底线。'},
    B:{cls:'b',title:'B：专业路径方案',fit:'强就业、强考研、强体制或孩子有明确兴趣的家庭',sacrifice:'可能牺牲学校层级、城市和省内偏好',risk:'专业名可能误认，部分方向依赖读研、行业背景或资格路径',line:'优先看专业是否看得准、孩子是否学得动、毕业后路径是否清楚。'},
    C:{cls:'c',title:'C：城市 / 学校层级方案',fit:'预算较宽、强城市、高分段或想争取平台上限的家庭',sacrifice:'可能牺牲专业确定性、普通学费和省内照应',risk:'高收费、证书、校区、大类分流和专业适配必须复核',line:'争取城市资源和学校平台，但不等于天然更优。'}
  }[type];
  if(!row){return `<div class="plan-card-v29473 ${meta.cls}"><h3>${meta.title}</h3><p class="plan-line">暂无合适候选。建议先查看冲突诊断，放宽压缩最大的偏好项。</p><div class="plan-grid-small"><b>适合</b><span>${meta.fit}</span><b>牺牲</b><span>${meta.sacrifice}</span><b>风险</b><span>${meta.risk}</span></div></div>`;}
  const tags=planReviewTagsV29473(row,type).map(x=>`<span>${htmlSafeV2945(x)}</span>`).join('');
  const why=(row._reasons||[]).slice(0,3).join('；')||'位次和画像匹配度较高';
  return `<div class="plan-card-v29473 ${meta.cls}">
    <div class="plan-head"><h3>${meta.title}</h3><span>${row._level||'观察'}</span></div>
    <p class="plan-line">${meta.line}</p>
    <div class="plan-pick"><b>${htmlSafeV2945(row.school)}</b><em>${htmlSafeV2945(row.major)}</em><small>${htmlSafeV2945(geoDisplayV29472(row))}｜${row.schoolNature?.label||'性质待核验'}｜画像${Math.round(row._profile||0)}分｜2025位次${fmt(row.rank2025)}</small></div>
    <div class="plan-grid-small"><b>适合</b><span>${meta.fit}</span><b>牺牲</b><span>${meta.sacrifice}</span><b>主要风险</b><span>${meta.risk}</span><b>为什么入选</b><span>${htmlSafeV2945(why)}</span></div>
    <div class="review-tags-v29473"><strong>需复核</strong>${tags}</div>
  </div>`;
}
function renderDiagnosisV29473(diag){
  const box=document.getElementById('conflictDiagnosisV29473'); if(!box)return;
  if(!currentRank){box.innerHTML='';return;}
  const main=diag.conflicts[0];
  const pressure=diag.top.map(x=>`<span>${htmlSafeV2945(x.step)}：减少 ${fmt(x.drop)}</span>`).join('') || '<span>暂无明显压缩点</span>';
  const strength=strengthRowsV29473(diag.snapshot).map(x=>`<div><b>${x[0]}</b><span>${x[1]}</span></div>`).join('');
  const relax=(main.relax||[]).map(x=>`<li>${htmlSafeV2945(x)}</li>`).join('');
  const avoid=(main.avoid||[]).map(x=>`<li>${htmlSafeV2945(x)}</li>`).join('');
  const funnel=(diag.funnel||[]).map(x=>`<div class="funnel-step"><b>${htmlSafeV2945(x.step)}</b><span>${fmt(x.count)} 条</span>${x.drop?`<em>−${fmt(x.drop)}</em>`:''}</div>`).join('');
  box.innerHTML=`<div class="diagnosis-v29473">
    <div class="diag-main"><div><span class="diag-kicker">高报师诊断</span><h3>${htmlSafeV2945(main.title)}</h3><p>${htmlSafeV2945(main.diagnosis)}</p></div><div class="diag-band">${htmlSafeV2945(diag.snapshot.scoreBand)}</div></div>
    <div class="pressure-tags-v29473"><b>候选压缩：</b>${pressure}</div>
    <details class="diag-details-v29473"><summary>查看条件强度与候选漏斗</summary><div class="strength-grid-v29473">${strength}</div><div class="funnel-grid-v29473">${funnel}</div></details>
    <div class="diag-advice-grid"><div><h4>建议优先放宽</h4><ol>${relax}</ol></div><div><h4>不建议先放宽</h4><ol>${avoid}</ol></div></div>
  </div>`;
}
function renderPlanABC(){
  const box=document.getElementById('planABC'); if(!box)return;
  if(!currentRank){box.innerHTML=''; const d=document.getElementById('conflictDiagnosisV29473'); if(d)d.innerHTML=''; return;}
  const diag=diagnoseV29473();
  renderDiagnosisV29473(diag);
  const plan=pickSchemeRowsV29473();
  box.innerHTML=planCardV29473('A',plan.A)+planCardV29473('B',plan.B)+planCardV29473('C',plan.C);
}
function pickPlanRows(){
  const p=pickSchemeRowsV29473();
  return {A:p.A,B:p.B,C:p.C};
}


/* V2.9.4.7.5: 预算宽路径 + A/B/C 紧凑方案盘增强层 */
function levelKindV29475(r,type){
  if(!r)return '观察';
  if(type==='C' && (r.isHighFee||r.isCoopV29475||r.isPrivateV29475))return '比较';
  return r._level||'观察';
}
function pathMetaV29475(type){
  const s=typeof conditionSnapshotV29473==='function'?conditionSnapshotV29473():{};
  const cTitle=(s.coopIntent||s.budget==='coop')?'C：城市 / 学校层级 / 中外合作提档':'C：城市 / 学校层级 / 提档路径';
  return {
    A:{cls:'a',title:'A：稳妥公办路径',line:'优先保公办、普通学费和基本路径，适合先守住底线。',fit:'普通家庭、低容错、强省内、公办优先家庭',sacrifice:'可能牺牲城市、专业热度和学校层级',risk:'公办不等于一定适配，低分段要看孩子能不能读下去'},
    B:{cls:'b',title:'B：专业路径',line:'优先看专业是否看得准、孩子是否学得动、毕业后路径是否清楚。',fit:'强就业、强考研、强体制或孩子有明确兴趣的家庭',sacrifice:'可能牺牲学校层级、城市和省内偏好',risk:'专业名可能误认，部分方向依赖读研、行业背景或资格路径'},
    C:{cls:'c',title:cTitle,line:(s.coopIntent?'把普通批更高层级、中外合作提档、民办城市专业并列比较。':'争取城市资源和学校平台，但不等于天然更优。'),fit:'预算较宽、强城市、高分段或想争取平台上限的家庭',sacrifice:'可能牺牲专业确定性、普通学费和省内照应',risk:'高收费、证书、校区、大类分流和专业适配必须复核'}
  }[type];
}
function planRiskTextV29475(r,type){
  if(!r)return '';
  if(r.isCoopV29475)return '中外合作不是天然提档，证书、校区、培养模式必须复核';
  if(r.isPrivateV29475)return '民办本科要核算四年成本、学校资源和孩子自律';
  if(type==='A' && r.isHighFee)return '高收费不适合直接当稳妥方案，需复核家庭承受力';
  if(type==='B' && hasConfusableMajorV2946 && hasConfusableMajorV2946(r))return '专业名称存在易混点，必须看本科代码和培养方案';
  if(type==='C')return '上限更高但不确定性更强，需复核校区、学费和专业归属';
  if(type==='A')return '稳妥不等于无风险，仍要看孩子能不能读下去';
  return '专业路径需结合培养方案、就业去向和孩子适配复核';
}
function whyPlanV29475(r,type){
  if(!r)return '';
  if(type==='A'){
    if(!r.isHighFee && ['public','publicSoft'].includes(r.schoolTier?.level))return '公办和普通学费属性更适合先保底线。';
    return '位次和画像较稳，适合作为低风险比较项。';
  }
  if(type==='B'){
    const q=(document.getElementById('qMajor')?.value||'').trim();
    if(q && majorMatchesV29475(r,q))return `与“${htmlSafeV2945(q)}”主专业口径相关，适合做专业路径比较。`;
    return (r._reasons||[]).slice(0,2).join('；')||'专业方向相对清楚，适合精读培养方案。';
  }
  if(r.isCoopV29475||r.isHighFee)return '适合预算较宽家庭比较“成本换层级/城市/机会”的提档价值。';
  if(r.isPrivateV29475)return '适合作为城市或专业路径的补充比较，不宜只看本科标签。';
  if(['985','211'].includes(r.schoolTier?.level))return '学校层级更高，适合争取平台上限。';
  if(cityModeV29472()!=='none' && selectedCitiesV29472().length && cityMatchesV29472(r,selectedCitiesV29472()))return '城市资源匹配，适合做城市路径比较。';
  return '适合比较城市、学校层级或上限空间。';
}
function planScoreV29475(r,type,chosen){
  let sc=0; const m=r.majorText||r.major||''; const s=conditionSnapshotV29473();
  if(chosen&&chosen.has(r.id))sc-=9999;
  if(type==='A'){
    if(['匹配','稳妥','保底'].includes(r._level))sc+=32;
    if(['public','publicSoft'].includes(r.schoolTier?.level))sc+=30;
    if(!r.isHighFee&&!r.isCoopV29475)sc+=22;
    if(['辽宁','吉林','黑龙江'].includes(r.schoolProvince))sc+=10;
    if(r.isPrivateV29475)sc-=28;
    if(r.isHighFee||r.isCoopV29475)sc-=35;
    sc+=(r._profile||0)*.35;
  }else if(type==='B'){
    if(['匹配','稳妥','可冲'].includes(r._level))sc+=18;
    const q=(document.getElementById('qMajor')?.value||'').trim();
    if(q&&majorMatchesV29475(r,q))sc+=36;
    if(s.priority==='grid'&&isGrid(m))sc+=32;
    else if(currentStrategy==='medical'&&isMed(m))sc+=32;
    else if(s.priority==='exam'&&(isLiberal(m)||isComp(m)||isTeacher(m)))sc+=26;
    else if(isGrid(m)||isComp(m)||isTeacher(m)||isMed(m)||isLiberal(m))sc+=15;
    if(hasConfusableMajorV2946 && hasConfusableMajorV2946(r))sc-=6;
    sc+=(r._profile||0)*.45;
  }else{
    if(['可冲','匹配','稳妥'].includes(r._level))sc+=20;
    if(['985','211'].includes(r.schoolTier?.level))sc+=36;
    if(s.cities.length && cityMatchesV29472(r,s.cities))sc+=30;
    if(s.strongCity && ['沈阳','大连'].includes(r.schoolCity))sc+=10;
    if(s.coopIntent && (r.isCoopV29475||r.isHighFee))sc+=40;
    else if(s.budgetWide && (r.isCoopV29475||r.isHighFee))sc+=20;
    if(r.isPrivateV29475 && (s.budgetWide||s.edgeScore||document.getElementById('filterFeeType')?.value==='privateCompare'))sc+=16;
    if((r.isCoopV29475||r.isHighFee) && !(s.budgetWide||s.coopIntent))sc-=30;
    sc+=liftValueScoreV29475(r)*.55;
  }
  return sc;
}
function pickBucketV29475(type,limit=4){
  const usable=(filtered||[]).filter(r=>!(r._excludes||[]).length);
  const seen=new Set();
  const scored=usable.slice().sort((a,b)=>planScoreV29475(b,type,null)-planScoreV29475(a,type,null));
  const out=[];
  for(const r of scored){
    const key=(r.id||'')+'|'+(r.school||'')+'|'+(r.major||'')+'|'+(r.rank2025||'');
    if(seen.has(key))continue;
    // A 是稳妥路径，默认不把高收费/民办/中外合作放在前两张；但如果用户预算宽且候选不足，允许补足对照。
    if(type==='A' && (r.isHighFee||r.isCoopV29475||r.isPrivateV29475) && out.length<2){
      const plain=out.filter(x=>!(x.isHighFee||x.isCoopV29475||x.isPrivateV29475)).length;
      if(plain<2)continue;
    }
    out.push(r); seen.add(key);
    if(out.length>=limit)break;
  }
  // 如果 A 因稳妥保护不足 2 条，再放宽限制补齐，避免方案盘空。
  if(out.length<Math.min(2,usable.length)){
    for(const r of scored){
      const key=(r.id||'')+'|'+(r.school||'')+'|'+(r.major||'')+'|'+(r.rank2025||'');
      if(seen.has(key))continue;
      out.push(r); seen.add(key);
      if(out.length>=limit)break;
    }
  }
  return out;
}
function pickSchemeBucketsV29475(){
  // V2.9.4.7.5.fix：A/B/C 是三条路径，不是三个互斥坑位。
  // 每条路径独立选 2-4 个代表候选，避免旧版全局 chosen 导致每列只剩 1 张卡。
  return {A:pickBucketV29475('A',4),B:pickBucketV29475('B',4),C:pickBucketV29475('C',4)};
}
function planStatsV29475(rows,type){
  const count=k=>rows.filter(r=>levelKindV29475(r,type)===k).length;
  const cmp=rows.filter(r=>levelKindV29475(r,type)==='比较').length;
  return `共 ${fmt(rows.length)} 条｜冲 ${fmt(rows.filter(r=>['可冲','超冲'].includes(r._level)).length)}｜稳 ${fmt(rows.filter(r=>['匹配','稳妥'].includes(r._level)).length)}｜保 ${fmt(rows.filter(r=>r._level==='保底').length)}${cmp?`｜比较 ${fmt(cmp)}`:''}`;
}
function compactPlanItemV29475(r,type){
  const kind=levelKindV29475(r,type);
  const tags=planReviewTagsV29473(r,type).slice(0,5).map(x=>`<span>${htmlSafeV2945(x)}</span>`).join('');
  const meta=[geoDisplayV29472(r),r.schoolNature?.label||'性质待核验',r.feeTypeLabelV29475||feeTypeLabelV29475(r),`2025位次${fmt(r.rank2025)}`].filter(Boolean).join('｜');
  return `<div class="plan-mini-v29475 ${type.toLowerCase()}">
    <div class="mini-top"><span class="mini-level">${htmlSafeV2945(kind)}</span><b>${htmlSafeV2945(r.school)}</b></div>
    <div class="mini-major">${htmlSafeV2945(r.major)}</div>
    <div class="mini-meta">${htmlSafeV2945(meta)}</div>
    <p><strong>为什么：</strong>${whyPlanV29475(r,type)}</p>
    <p><strong>风险：</strong>${htmlSafeV2945(planRiskTextV29475(r,type))}</p>
    <div class="review-tags-v29473"><strong>复核</strong>${tags}</div>
  </div>`;
}
function planColumnV29475(type,rows){
  const meta=pathMetaV29475(type);
  const shown=(rows||[]).slice(0,4);
  const body=shown.length?shown.map(r=>compactPlanItemV29475(r,type)).join(''):`<div class="plan-empty-v29475">暂无代表候选。建议查看冲突诊断，优先放宽压缩最大的偏好项。</div>`;
  return `<div class="plan-col-v29475 ${meta.cls}">
    <div class="plan-col-head"><div><h3>${meta.title}</h3><p>${meta.line}</p></div><span>${planStatsV29475(rows||[],type)}</span></div>
    <details class="plan-meta-v29475"><summary>适合 / 牺牲 / 风险</summary><div class="plan-grid-small"><b>适合</b><span>${meta.fit}</span><b>牺牲</b><span>${meta.sacrifice}</span><b>风险</b><span>${meta.risk}</span></div></details>
    <div class="plan-mini-list-v29475">${body}</div>
    ${(rows||[]).length>4?`<div class="plan-more-v29475">还有 ${fmt(rows.length-4)} 条，可在下方详细候选继续查看。</div>`:''}
  </div>`;
}
function renderPlanABC(){
  const box=document.getElementById('planABC'); if(!box)return;
  box.classList.add('abc-board-v29475fix');
  if(!currentRank){box.innerHTML=''; const d=document.getElementById('conflictDiagnosisV29473'); if(d)d.innerHTML=''; return;}
  const diag=diagnoseV29473();
  renderDiagnosisV29473(diag);
  const buckets=pickSchemeBucketsV29475();
  const total=(buckets.A.length+buckets.B.length+buckets.C.length);
  box.setAttribute('data-total-cards', String(total));
  box.innerHTML=planColumnV29475('A',buckets.A)+planColumnV29475('B',buckets.B)+planColumnV29475('C',buckets.C);
}
function pickPlanRows(){
  const b=pickSchemeBucketsV29475();
  return {A:(b.A||[])[0]||null,B:(b.B||[])[0]||null,C:(b.C||[])[0]||null};
}


/* V2.9.4.7.5.fix: A/B/C 多候选方案盘修正版
   - 每条路径独立选择 2-4 个代表候选；
   - 不再用全局 chosen 把 A/B/C 压缩成单卡；
   - PC 三列、Pad/Android 自适应堆叠；
   - 保留 V2.9.4.7.4 高校专项默认保护与 V2.9.4.7.5 预算宽/中外提档逻辑。 */

boot();
setInterval(updateGuideState, 1000);
setTimeout(syncAccessState, 0);

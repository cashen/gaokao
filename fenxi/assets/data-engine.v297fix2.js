// V2.9.5.4 data-engine: data fetch, taxonomy, geo/profile helpers
function fmt(n){return n===undefined||n===null||Number.isNaN(n)?'-':Number(n).toLocaleString('zh-CN')}



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
  url.searchParams.set('v','2952');
  return url.href;
}
async function loadJsonFile(file, label){
  const url = dataUrl(file);
  const t = (window.performance&&performance.now)?performance.now():Date.now();
  const r = await fetch(url, {cache:'default'});
  const fetchMs = ((window.performance&&performance.now)?performance.now():Date.now())-t;
  if(!r.ok){
    throw new Error(`${label}加载失败：${r.status} ${r.statusText} @ ${url}`);
  }
  try{
    const j = await r.json();
    const totalMs = ((window.performance&&performance.now)?performance.now():Date.now())-t;
    try{window.LN_DEBUG_V2983?.detail?.('dataLoad:'+String(label||file),{file,label,fetchMs:Math.round(fetchMs),totalMs:Math.round(totalMs),rows:(j.records||j.items||[]).length||undefined});}catch(e){}
    return j;
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



window.LN_DATA_ENGINE = {
  dataUrl, loadJsonFile,
  attachTaxonomy, initTaxonomy, taxonomyForMajor,
  schoolGeoForV29471, applySchoolGeoV29471,
  studentProfileHintsV29471
};

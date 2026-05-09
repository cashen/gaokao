// V2.9.5.3.fix5 app: cache-isolated init-safe access gate, state orchestration, event binding and app boot

function debounce(fn, delay){
  let timer=null;
  return function(...args){
    if(timer) clearTimeout(timer);
    timer=setTimeout(()=>fn.apply(this,args), delay);
  };
}

function initBaselineTouchTrackingV2951(){
  const base=document.getElementById('familyBaseline'); if(!base)return;
  base.querySelectorAll('select,input,textarea').forEach(el=>{
    el.addEventListener('change',()=>markBaselineTouchedV2951(el.id||'all'));
    el.addEventListener('input',()=>markBaselineTouchedV2951(el.id||'all'));
  });
  base.addEventListener('click',e=>{ if(e.target?.classList?.contains('chip')) markBaselineTouchedV2951('chips'); }, true);
}
function setValueIfAllowedV2951(id,value,source){
  const el=document.getElementById(id); if(!el || value===undefined || value===null)return false;
  const hard=['specialPlanStatus'];
  if(hard.includes(id) && hasTouchedV2951(id))return false;
  if(hasTouchedV2951(id) && ['budget','regionMode','cityMode','targetCities'].includes(id))return false;
  el.value=value; return true;
}
function mapBudgetV2951(v){
  if(v==='normal')return 'normal'; if(v==='medium'||v==='flex')return 'flex'; if(v==='wide'||v==='high')return 'high'; if(v==='coop')return 'coop'; return null;
}
function applyScenarioRegionV2951(rule){
  if(!rule?.regionSuggestion || hasTouchedV2951('chips'))return [];
  const skipped=[];
  const rs=rule.regionSuggestion;
  if(rs.mode && document.getElementById('regionMode')) document.getElementById('regionMode').value=rs.mode;
  if(Array.isArray(rs.preferGroups) && rs.preferGroups.length){
    clearProvinces();
    rs.preferGroups.forEach(g=>selectRegionGroup(g,true));
  }
  return skipped;
}
function applyScenarioPresetV2951(type){
  const rule=scenarioRuleV2951(type); if(!rule)return;
  currentStrategy=type;
  document.querySelectorAll('.strategy-card').forEach(c=>c.classList.toggle('active',c.dataset.strategy===type));
  const skipped=[];
  const pref=rule.preference||{};
  if(pref.priority && !setPreferenceValueV2952(pref.priority,'scenario')) skipped.push('目标路径');
  if(pref.mentorMode) setValueIfAllowedV2951('mentorMode',pref.mentorMode,'preference');
  if(pref.gradPlan) setValueIfAllowedV2951('gradPlan',pref.gradPlan,'preference');
  if(pref.timePressure) setValueIfAllowedV2951('timePressure',pref.timePressure,'preference');
  ['gridPower','physics','medicine','chem','liberal','teacher'].forEach(k=>{ if(pref[k]) setSingle(k,pref[k]); });
  const b=rule.baselineSuggestion||{};
  const budget=mapBudgetV2951(b.budget);
  if(budget && !setValueIfAllowedV2951('budget',budget,'baseline')) skipped.push('预算');
  if(b.acceptCoop==='yes'||b.acceptCoop==='compare'){
    if(!hasTouchedV2951('filterFeeType')) setValueIfAllowedV2951('filterFeeType','coopCompare','baseline'); else skipped.push('办学/收费类型');
  }
  if(b.acceptPrivate==='yes'||b.acceptPrivate==='compare'){
    if(!hasTouchedV2951('filterFeeType') && (document.getElementById('filterFeeType')?.value||'all')==='all') setValueIfAllowedV2951('filterFeeType','privateCompare','baseline');
  }
  applyScenarioRegionV2951(rule);
  renderScenarioNoticeV2951(rule,skipped);
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
  renderStrategyCardsV2951();
  renderPreferenceSelectV2952();
  initBaselineTouchTrackingV2951();
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
    renderScenarioNoticeV2951(scenarioRuleV2951(currentStrategy)||scenarioRuleV2951(rulesV2951().defaults?.selectedScenario||'employment')||{});
    document.querySelectorAll('input,select,textarea').forEach(x=>x.addEventListener('input',window.debouncedAutoRefreshV2953Fix5));
    document.querySelectorAll('select,input[type=checkbox]').forEach(x=>x.addEventListener('change',autoRefresh));
    autoRefresh();
  }catch(e){
    document.getElementById('metaRecords').textContent='数据暂未准备好：仍可输入访问码，稍后请检查 data 文件是否完整。';
    const fs=document.getElementById('filterSummary');
    if(fs)fs.innerHTML='页面初始化未完成：'+String(e.message).replace(/\n/g,'<br>');
    console.error(e);
  }
}
if(localStorage.getItem('ln_access_ok')==='1'){
  setTimeout(()=>{
    document.getElementById('app')?.classList.remove('locked');
    syncAccessState();
  },0);
}

function accessCodeExpectedV2953Fix1(){
  return (window.LN_CONFIG && window.LN_CONFIG.accessCode) || 'ln2025';
}
function unlockAccess(){
  const top=document.getElementById('accessCodeTop');
  const v=(top?.value||'').trim();
  const expected=accessCodeExpectedV2953Fix1();
  const stateEl=document.getElementById('accessState');
  if(v===expected){
    document.getElementById('app')?.classList.remove('locked');
    localStorage.setItem('ln_access_ok','1');
    if(stateEl)stateEl.textContent='已进入：可以填写位次并查看方案。';
    if(top)top.value='';
    if(typeof autoRefresh==='function') autoRefresh();
  }else{
    if(stateEl)stateEl.textContent='访问码未通过，请核对后再试。';
    top?.focus();
  }
}
function resetAccess(){
  localStorage.removeItem('ln_access_ok');
  document.getElementById('app')?.classList.add('locked');
  const top=document.getElementById('accessCodeTop'); if(top)top.value='';
  const stateEl=document.getElementById('accessState'); if(stateEl)stateEl.textContent='已清除本机开启状态，请重新输入 ln2025。';
}
function bindAccessEnterV2953Fix1(){
  const top=document.getElementById('accessCodeTop');
  if(!top || top.dataset.enterBound==='1')return;
  top.dataset.enterBound='1';
  top.addEventListener('keydown',(e)=>{
    if(e.key==='Enter'){
      e.preventDefault();
      unlockAccess();
    }
  });
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
    el.innerHTML='<div class="result-error"><b>页面运行遇到问题：</b><br>'+String(e.message||e.error||'未知错误')+'<br>请检查是否上传了 data 文件夹，或点击“查看方案 / 重新计算”。</div>';
  }
});
function syncAccessState(){
  const stateEl=document.getElementById('accessState');
  if(!stateEl)return;
  if(localStorage.getItem('ln_access_ok')==='1'){
    stateEl.textContent='已进入：可以填写位次并查看方案。';
  }else{
    stateEl.textContent='请输入访问码 ln2025 后进入工具。';
  }
}


function toggleSection(id){
  const el=document.getElementById(id);
  if(el) el.classList.toggle('collapsed');
}

function updateGuideState(){
  const rank=(typeof resolveRank==='function')?resolveRank():null;
  const links=[...document.querySelectorAll('#guideNav a')]; links.forEach(a=>a.classList.remove('active','done'));
  const step=rank?4:1;
  links.forEach(a=>{const g=Number(a.dataset.guide||0); if(g<step)a.classList.add('done'); if(g===step)a.classList.add('active');});
  if((window.candidates||candidates||[]).length){document.querySelector('#guideNav a[data-guide="5"]')?.classList.add('done');}
}
function autoRefresh(){
  autoRefreshAsync().then(()=>{renderBaselineSummaryV2950();applySimpleModeV2950();}).catch(e=>{
    document.getElementById('metaRecords').textContent='本次计算未完成';
    const fs=document.getElementById('filterSummary'); if(fs)fs.innerHTML='本次计算未完成：'+String(e.message).replace(/\n/g,'<br>');
    console.error(e);
  });
}
setTimeout(()=>{try{initSimpleModeV2950();renderBaselineSummaryV2950();}catch(e){console.warn('[V2.9.5.3.fix5] 简洁模式初始化失败',e)}},0);

/* V2.9.5.2：场景与目标路径统一；策略只给建议，底线优先。 */
function applyStrategy(type){
  applyScenarioPresetV2951(type);
  renderBaselineSummaryV2950();
  autoRefresh();
}



window.debouncedAutoRefreshV2953Fix5 = debounce(autoRefresh, (window.LN_CONFIG && window.LN_CONFIG.debounceMs) || 300);

function scrollToTargetV2953(id){
  const el=document.getElementById(id);
  if(el) el.scrollIntoView({behavior:'smooth', block:'start'});
}
function handleActionV2953(action, el){
  switch(action){
    case 'unlock-top':
    case 'unlock': return unlockAccess();
    case 'reset-access': return resetAccess();
    case 'reset-all': return resetAll();
    case 'manual-execute': return manualExecute();
    case 'toggle-advanced': return toggleAdvanced();
    case 'open-advanced': return toggleAdvanced(true);
    case 'switch-full-mode': return switchFullModeV2951();
    case 'export-filtered': return exportFiltered();
    case 'export-filtered-png': return exportFilteredPng();
    case 'export-candidates': return exportCandidates();
    case 'export-candidates-png': return exportCandidatesPng();
    case 'open-export-sheet': return openExportSheet();
    case 'close-export-sheet': return closeExportSheet();
    case 'clear-candidates': return clearCandidates();
    case 'prev-page': return prevPage();
    case 'next-page': return nextPage();
    case 'toggle-section': return toggleSection(el?.dataset?.sectionTarget);
    case 'quick-narrow': return quickNarrow(el?.dataset?.quick || '');
    default: return null;
  }
}
function bindGlobalEventsV2953(){
  document.addEventListener('click', (event)=>{
    const scrollEl=event.target.closest('[data-scroll-target]');
    if(scrollEl){ event.preventDefault(); scrollToTargetV2953(scrollEl.dataset.scrollTarget); return; }
    const actionEl=event.target.closest('[data-action]');
    if(actionEl){ event.preventDefault(); event.stopPropagation(); handleActionV2953(actionEl.dataset.action, actionEl); return; }
  });
}

function startV2953Fix5(){
  bindGlobalEventsV2953();
  bindAccessEnterV2953Fix1();
  boot();
  setInterval(updateGuideState, 1000);
  setTimeout(syncAccessState, 0);
  setTimeout(()=>{try{initSimpleModeV2950();renderBaselineSummaryV2950();}catch(e){console.warn('[V2.9.5.3.fix5] 简洁模式初始化失败',e)}},0);
}

window.LN_APP = { start: startV2953Fix5, refresh: autoRefresh, applyScenarioPreset: applyStrategy, unlockAccess };
startV2953Fix5();

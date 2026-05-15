// V2.9.6 app: entry gate, child interest, state orchestration, event binding and app boot
// V2.9.6: keep Pages Functions auth and add child interest rule runtime.
let appBootedV2954Fix3 = false;
let sessionCheckedV2954Fix3 = false;


function setMetaStatusV297Fix2(text,status){
  const el=document.getElementById('metaRecords');
  if(!el)return;
  el.textContent=text;
  el.classList.remove('meta-status-ready','meta-status-loading','meta-status-idle','meta-status-error');
  if(status)el.classList.add('meta-status-'+status);
}
window.LN_SET_META_STATUS_V297=setMetaStatusV297Fix2;

function debounce(fn, delay){
  let timer=null;
  return function(...args){
    if(timer) clearTimeout(timer);
    timer=setTimeout(()=>fn.apply(this,args), delay);
  };
}

function initBaselineTouchTrackingV2951(){
  const watchIds=['budget','regionMode','cityMode','targetCities','filterFeeType','mentorMode','familyTolerance','gradPlan','timePressure','priority'];
  watchIds.forEach(id=>{
    const el=document.getElementById(id); if(!el)return;
    el.addEventListener('change',()=>markBaselineTouchedV2951(id));
    el.addEventListener('input',()=>markBaselineTouchedV2951(id));
  });
  document.addEventListener('click',e=>{
    if(e.target?.classList?.contains('chip')) markTouchedByElementV2954Fix2(e.target);
  }, true);
}
function setValueIfAllowedV2951(id,value,source){
  const el=document.getElementById(id); if(!el || value===undefined || value===null)return false;
  if(source==='scenario' || source==='baseline' || source==='preference'){
    if(hasTouchedV2951(id)) return false;
  }
  el.value=value; return true;
}
function mapBudgetV2951(v){
  if(v==='normal')return 'normal'; if(v==='medium'||v==='flex')return 'flex'; if(v==='wide'||v==='high')return 'high'; if(v==='coop')return 'coop'; return null;
}
function applyScenarioRegionV2951(rule){
  if(!rule?.regionSuggestion)return [];
  const skipped=[];
  const rs=rule.regionSuggestion;
  if(rs.mode && document.getElementById('regionMode')){
    if(!hasTouchedV2951('regionMode')) document.getElementById('regionMode').value=rs.mode;
    else skipped.push('区域筛选方式');
  }
  if(Array.isArray(rs.preferGroups) && rs.preferGroups.length){
    if(!hasTouchedV2951('provinceChips') && !hasTouchedV2951('regionGroupChips')){
      clearProvinces();
      rs.preferGroups.forEach(g=>selectRegionGroup(g,true));
    }else skipped.push('省份/区域选择');
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
  if(pref.mentorMode && !setValueIfAllowedV2951('mentorMode',pref.mentorMode,'preference')) skipped.push('规则强度');
  if(pref.gradPlan && !setValueIfAllowedV2951('gradPlan',pref.gradPlan,'preference')) skipped.push('升学规划');
  if(pref.timePressure && !setValueIfAllowedV2951('timePressure',pref.timePressure,'preference')) skipped.push('回报周期');
  ['gridPower','physics','medicine','chem','liberal','teacher'].forEach(k=>{
    if(pref[k]){
      if(!hasTouchedV2951('group:'+k)) setSingle(k,pref[k]);
      else skipped.push('专业偏好');
    }
  });
  const b=rule.baselineSuggestion||{};
  const budget=mapBudgetV2951(b.budget);
  if(budget && !setValueIfAllowedV2951('budget',budget,'baseline')) skipped.push('预算');
  const feeEl=document.getElementById('filterFeeType');
  if((b.acceptCoop==='yes'||b.acceptCoop==='compare'||b.acceptPrivate==='yes'||b.acceptPrivate==='compare') && feeEl){
    if(!hasTouchedV2951('filterFeeType')){
      const next=(b.acceptPrivate==='yes'||b.acceptPrivate==='compare') && !(b.acceptCoop==='yes'||b.acceptCoop==='compare') ? 'privateCompare' : 'coopCompare';
      setValueIfAllowedV2951('filterFeeType', next, 'baseline');
    }else skipped.push('办学/收费类型');
    const highFeeChip=document.querySelector('#rejectChips .chip[data-reject="高收费"]');
    if(highFeeChip?.classList?.contains('active')){
      if(!highFeeRejectTouchedV2954Fix2()) highFeeChip.classList.remove('active');
      else skipped.push('高收费拒绝项');
    }
  }
  skipped.push(...applyScenarioRegionV2951(rule));
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
  if(window.LN_CHILD_INTEREST_RUNTIME_V296?.render) window.LN_CHILD_INTEREST_RUNTIME_V296.render();
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
      if(window.loadMajorNameModelV2944){
        await window.loadMajorNameModelV2944({withEntryIndex:false});
      }
    }catch(majorErr){
      console.warn('[V2.9.7] 招生名/本科目录模型加载失败，不影响主筛选：', majorErr);
    }
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
    setMetaStatusV297Fix2(`已就绪｜总数据 ${fmt(MANIFEST.totalRecords)} 条｜本科目录与招生名已复核｜输入位次后加载对应分段`,'ready');
    candidates=JSON.parse(localStorage.getItem('ln_candidates_v292')||'[]');
    renderCandidates();
    document.querySelectorAll('#strategyCards .strategy-card').forEach(b=>b.onclick=()=>applyStrategy(b.dataset.strategy));
    renderScenarioNoticeV2951(scenarioRuleV2951(currentStrategy)||scenarioRuleV2951(rulesV2951().defaults?.selectedScenario||'employment')||{});
    document.querySelectorAll('input,select,textarea').forEach(x=>x.addEventListener('input',window.debouncedAutoRefreshV2953Fix5));
    document.querySelectorAll('select,input[type=checkbox]').forEach(x=>x.addEventListener('change',()=>requestRefreshV296('baseline-change','soft',120)));
    autoRefresh('boot');
  }catch(e){
    setMetaStatusV297Fix2('数据暂未准备好：可先输入访问凭证，稍后请检查 data 文件是否完整。','error');
    const fs=document.getElementById('filterSummary');
    if(fs)fs.innerHTML='页面初始化未完成：'+String(e.message).replace(/\n/g,'<br>');
    console.error(e);
  }
}
function authBaseV2954Fix3(){
  return (window.LN_CONFIG && window.LN_CONFIG.authBasePath) || (location.pathname.startsWith('/fenxi') ? '/fenxi' : '/fenxi');
}
function authUrlV2954Fix3(path){
  return authBaseV2954Fix3().replace(/\/$/,'') + path;
}
async function checkServerSessionV2954Fix3(){
  if(!(window.LN_CONFIG && window.LN_CONFIG.serverAuth)){
    return localStorage.getItem('ln_access_ok')==='1';
  }
  try{
    const res=await fetch(authUrlV2954Fix3('/api/session'),{credentials:'same-origin',cache:'no-store'});
    if(!res.ok)return false;
    const json=await res.json().catch(()=>({ok:false}));
    return !!json.ok;
  }catch(e){
    console.warn('[V2.9.5.4.fix3] 会话检查失败：',e);
    return false;
  }
}
function bootOnceV2954Fix3(){
  if(appBootedV2954Fix3)return;
  appBootedV2954Fix3=true;
  boot();
}
async function initAuthAndBootV2954Fix3(){
  const stateEl=document.getElementById('accessState');
  if(stateEl)stateEl.textContent='正在核验访问状态...';
  const ok=await checkServerSessionV2954Fix3();
  sessionCheckedV2954Fix3=true;
  if(ok){
    localStorage.setItem('ln_access_ok','1');
    document.getElementById('app')?.classList.remove('locked');
    if(stateEl)stateEl.textContent='已进入：可以填写位次并查看方案。';
    bootOnceV2954Fix3();
  }else{
    localStorage.removeItem('ln_access_ok');
    document.getElementById('app')?.classList.add('locked');
    setMetaStatusV297Fix2('请输入访问凭证后进入工具。','idle');
    if(stateEl)stateEl.textContent='请输入访问凭证后进入工具。';
  }
}
async function unlockAccess(){
  const top=document.getElementById('accessCodeTop');
  const v=(top?.value||'').trim();
  const stateEl=document.getElementById('accessState');
  if(!v){
    if(stateEl)stateEl.textContent='请输入访问凭证后进入工具。';
    top?.focus(); return;
  }
  if(window.LN_CONFIG && window.LN_CONFIG.serverAuth){
    try{
      if(stateEl)stateEl.textContent='正在核验访问凭证...';
      const res=await fetch(authUrlV2954Fix3('/api/login'),{
        method:'POST',credentials:'same-origin',cache:'no-store',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({password:v})
      });
      const json=await res.json().catch(()=>({ok:false}));
      if(res.ok && json.ok){
        document.getElementById('app')?.classList.remove('locked');
        localStorage.setItem('ln_access_ok','1');
        if(stateEl)stateEl.textContent='已进入：可以填写位次并查看方案。';
        if(top)top.value='';
        bootOnceV2954Fix3();
        if(typeof autoRefresh==='function' && dataEngineReady) autoRefresh('manual-execute');
        return;
      }
      if(json.reason==='server_not_configured'){
        if(stateEl)stateEl.textContent='服务端访问保护尚未配置，请先在 Cloudflare Pages 变量中设置访问凭证。';
        return;
      }
    }catch(e){
      console.warn('[V2.9.5.4.fix3] 访问凭证核验失败：',e);
    }
    if(stateEl)stateEl.textContent='访问凭证未通过，请核对后再试。';
    top?.focus(); return;
  }
  if(stateEl)stateEl.textContent='当前版本需要通过 Cloudflare Pages Functions 校验访问凭证。';
  top?.focus();
}
async function resetAccess(){
  if(window.LN_CONFIG && window.LN_CONFIG.serverAuth){
    try{await fetch(authUrlV2954Fix3('/api/logout'),{method:'POST',credentials:'same-origin',cache:'no-store'});}catch(e){}
  }
  localStorage.removeItem('ln_access_ok');
  document.getElementById('app')?.classList.add('locked');
  const top=document.getElementById('accessCodeTop'); if(top)top.value='';
  const stateEl=document.getElementById('accessState'); if(stateEl)stateEl.textContent='已清除本机开启状态，请重新输入访问凭证。';
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
  autoRefresh('manual-execute');
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
    stateEl.textContent='请输入访问凭证后进入工具。';
  }
}


function toggleSection(id){
  const el=document.getElementById(id);
  if(el) el.classList.toggle('collapsed');
}

function updateGuideState(){
  const rank=(typeof resolveRank==='function')?resolveRank():null;
  const links=[...document.querySelectorAll('#guideNav a')]; links.forEach(a=>a.classList.remove('active','done'));
  const childSelected = window.LN_CHILD_INTEREST_RUNTIME_V296?.readState?.().mode === 'selected';
  const step=rank ? (childSelected ? 5 : 3) : 1;
  links.forEach(a=>{const g=Number(a.dataset.guide||0); if(g<step)a.classList.add('done'); if(g===step)a.classList.add('active');});
  if((window.candidates||candidates||[]).length){document.querySelector('#guideNav a[data-guide="5"]')?.classList.add('done');}
}
function autoRefreshDirectV296(reason){
  return autoRefreshAsync().then(()=>{
    renderBaselineSummaryV2950();
    window.LN_QUALIFICATION_GATE_UI_V296?.renderSummary?.();window.LN_STUDENT_PROFILE_UI_V2975?.renderSummary?.();
    applySimpleModeV2950();
    return {ok:true, reason:reason||'direct'};
  }).catch(e=>{
    setMetaStatusV297Fix2('本次计算未完成','error');
    const fs=document.getElementById('filterSummary'); if(fs)fs.innerHTML='本次计算未完成：'+String(e.message||e).replace(/\n/g,'<br>');
    console.error(e);
    throw e;
  });
}
function requestRefreshV296(reason, level, delay){
  const req={reason:reason||'auto-refresh', level:level||'soft', delay:delay??180, run:()=>autoRefreshDirectV296(reason)};
  if(window.LN_REFRESH_SCHEDULER_V296 && typeof window.LN_REFRESH_SCHEDULER_V296.request==='function'){
    return window.LN_REFRESH_SCHEDULER_V296.request(req);
  }
  return autoRefreshDirectV296(reason);
}
function autoRefresh(reason){
  return requestRefreshV296(reason||'autoRefresh','full',0);
}
window.__LN_AUTO_REFRESH_DIRECT__ = autoRefreshDirectV296;
setTimeout(()=>{try{initSimpleModeV2950();renderBaselineSummaryV2950();window.LN_QUALIFICATION_GATE_UI_V296?.renderSummary?.();window.LN_STUDENT_PROFILE_UI_V2975?.renderSummary?.();}catch(e){console.warn('[V2.9.7] 简洁模式初始化失败',e)}},0);

/* V2.9.5.4.fix3：场景与目标路径统一；策略只给建议，已手动设置的底线优先。 */
function applyStrategy(type){
  applyScenarioPresetV2951(type);
  renderBaselineSummaryV2950();
  window.LN_QUALIFICATION_GATE_UI_V296?.renderSummary?.();window.LN_STUDENT_PROFILE_UI_V2975?.renderSummary?.();
  if(window.LN_DRAWER_V296?.isOpen?.()) window.LN_SCENARIO_UI_V296?.openDrawer?.();
  requestRefreshV296('scenario-change','soft',180);
}



window.debouncedAutoRefreshV2953Fix5 = debounce(()=>requestRefreshV296('baseline-change','soft',220), (window.LN_CONFIG && window.LN_CONFIG.debounceMs) || 300);

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
    case 'drawer-close': return window.LN_DRAWER_V296?.close?.();
    case 'open-scenario-drawer': return window.LN_SCENARIO_UI_V296?.openDrawer?.();
    case 'open-student-profile': return window.LN_STUDENT_PROFILE_UI_V2975?.openDrawer?.();
    case 'open-qualification-gate': return window.LN_QUALIFICATION_GATE_UI_V296?.openDrawer?.();
    case 'qualification-gate-change': return window.LN_QUALIFICATION_GATE_UI_V296?.change?.(el?.dataset?.gateId, el?.value);
    case 'abc-select': return window.LN_ABC_VIEW_V296?.select?.(el?.dataset?.abc || 'A');
    case 'child-interest-start':
    case 'child-interest-undecided':
    case 'child-interest-remove': return window.LN_CHILD_INTEREST_RUNTIME_V296?.handle?.(action, el);
    default: return null;
  }
}
function bindGlobalEventsV2953(){
  document.addEventListener('click', (event)=>{
    const childGroupEl=event.target.closest('[data-child-interest-group]');
    if(childGroupEl){
      event.preventDefault();
      const res=window.LN_CHILD_INTEREST_RUNTIME_V296?.toggleGroup?.(childGroupEl.dataset.childInterestGroup);
      if(res && res.ok===false && res.reason==='max'){
        const box=document.getElementById('childInterestBoxV296');
        if(box){ const tip=document.createElement('div'); tip.className='child-interest-toast-v296'; tip.textContent='建议先选 1—3 个最有兴趣的方向，想换方向可以先删除一个。'; box.prepend(tip); setTimeout(()=>tip.remove(),2600); }
      }
      return;
    }
    const strategyEl=event.target.closest('[data-strategy]');
    if(strategyEl){ event.preventDefault(); applyStrategy(strategyEl.dataset.strategy); return; }
    const scrollEl=event.target.closest('[data-scroll-target]');
    if(scrollEl){ event.preventDefault(); scrollToTargetV2953(scrollEl.dataset.scrollTarget); return; }
    const actionEl=event.target.closest('[data-action]');
    if(actionEl){ event.preventDefault(); event.stopPropagation(); handleActionV2953(actionEl.dataset.action, actionEl); return; }
  });
}

function startV2953Fix5(){
  bindGlobalEventsV2953();
  bindAccessEnterV2953Fix1();
  initAuthAndBootV2954Fix3();
  setInterval(updateGuideState, 3000);
  setTimeout(syncAccessState, 0);
  setTimeout(()=>{try{initSimpleModeV2950();renderBaselineSummaryV2950();window.LN_QUALIFICATION_GATE_UI_V296?.renderSummary?.();window.LN_STUDENT_PROFILE_UI_V2975?.renderSummary?.();}catch(e){console.warn('[V2.9.7] 简洁模式初始化失败',e)}},0);
}

window.autoRefresh = autoRefresh;
window.LN_APP = { start: startV2953Fix5, refresh: autoRefresh, requestRefresh: requestRefreshV296, applyScenarioPreset: applyStrategy, unlockAccess, resetAccess, checkServerSession: checkServerSessionV2954Fix3, ready:true };
if(!document.body || document.body.dataset.diagnostics !== '1') startV2953Fix5();

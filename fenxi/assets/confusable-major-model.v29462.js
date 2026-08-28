/* V2.9.4.6.2 易混专业模型加载器：正主保护 + 提醒侧过滤。保持 V2946 全局接口，兼容主程序。 */
/* V2.91RC0.model-lazy1: keep detectedPairs/recordIndex blocking; move qualityReport + parentExpectationPaths into cold supplement when lazy is enabled. */
(function(){
  const FILES = {
    manifest: 'data/confusable_major_model/v29462_manifest.json',
    groups: 'data/confusable_major_model/confusable_major_groups_v2946.json',
    members: 'data/confusable_major_model/confusable_major_members_v2946.json',
    detectedPairs: 'data/confusable_major_model/confusable_major_detected_pairs_v29462.json',
    schoolIndex: 'data/confusable_major_model/confusable_major_school_index_v2946.json',
    recordIndex: 'data/confusable_major_model/confusable_major_record_index_v29462.json',
    parentExpectationPaths: 'data/confusable_major_model/parent_expectation_paths_v2946.json',
    qualityReport: 'data/confusable_major_model/confusable_warning_side_quality_report_v29462.json',
    anchorRules: 'data/confusable_major_model/confusable_anchor_rules_v29462.json',
    manualConfirmed: 'data/confusable_major_model/manual_confirmed_pairs_v2946.json',
    manualExcluded: 'data/confusable_major_model/manual_excluded_pairs_v2946.json'
  };
  const LAZY_VERSION = '291rc0-model-lazy1-20260513';
  function baseUrl(){
    const u = new URL(window.location.href); u.hash=''; u.search='';
    if(u.pathname.endsWith('/')) return u.href;
    if(/\.html?$/i.test(u.pathname)){ u.pathname = u.pathname.replace(/[^/]+$/, ''); return u.href; }
    u.pathname += '/'; return u.href;
  }
  function dataUrl(file){ const u = new URL(file, baseUrl()); u.searchParams.set('v','29462'); return u.href; }
  async function getJson(file){ const r = await fetch(dataUrl(file), {cache:'default'}); if(!r.ok) throw new Error(file+' '+r.status); return r.json(); }
  function lazyEnabled(){ return window.LN_MODEL_LAZY_OPT !== false; }
  function buildModel(parts, meta){
    const [manifest, groups, members, detectedPairs, schoolIndex, recordIndex, parentExpectationPaths, qualityReport, anchorRules, manualConfirmed, manualExcluded] = parts;
    const model = {manifest, groups, members, detectedPairs, schoolIndex, recordIndex, parentExpectationPaths: parentExpectationPaths || {items:[], lazy:true}, qualityReport: qualityReport || {lazy:true}, anchorRules, manualConfirmed, manualExcluded, version:'V2.9.4.6.2', __modelLazyVersion:LAZY_VERSION, __coldSupplementReady:!!(parentExpectationPaths&&qualityReport), __modelLazyCoreOnly:!(parentExpectationPaths&&qualityReport)};
    const pairsById = new Map((detectedPairs.items||[]).map(x=>[x.pair_id,x]));
    const groupsById = new Map((groups.items||[]).map(x=>[x.group_id,x]));
    const recordPairs = new Map();
    (recordIndex.items||[]).forEach(x=>{
      const full = (x.pairs||[]).map(p=>pairsById.get(p.pair_id)).filter(Boolean).sort((a,b)=>(b.risk_score||0)-(a.risk_score||0));
      recordPairs.set(x.record_id, full);
    });
    const schoolPairs = new Map();
    (schoolIndex.items||[]).forEach(x=>{
      schoolPairs.set(x.school, (x.pair_ids||[]).map(id=>pairsById.get(id)).filter(Boolean).sort((a,b)=>(b.risk_score||0)-(a.risk_score||0)));
    });
    Object.assign(model, {pairsById, groupsById, recordPairs, schoolPairs});
    window.LN_CONFUSABLE_MAJOR_MODEL_2946 = model;
    window.LN_CONFUSABLE_MAJOR_MODEL_2946_READY = true;
    return model;
  }
  let coldPromise = null;
  async function loadConfusableMajorColdSupplementV2946(reason){
    const model = window.LN_CONFUSABLE_MAJOR_MODEL_2946;
    if(!model) return null;
    if(model.__coldSupplementReady) return model;
    if(coldPromise) return coldPromise;
    const t0=performance.now();
    try{ const st=window.LN_MODEL_LAZY_STATUS; if(st){st.coldModels.confusableSupplement.status='loading';st.coldModels.confusableSupplement.reason=reason||'ensure';} window.LN_MODEL_LAZY?.saveDetail?.(); }catch(e){}
    coldPromise = Promise.all([getJson(FILES.parentExpectationPaths), getJson(FILES.qualityReport)]).then(([parentExpectationPaths, qualityReport])=>{
      model.parentExpectationPaths = parentExpectationPaths;
      model.qualityReport = qualityReport;
      model.__coldSupplementReady = true;
      model.__modelLazyCoreOnly = false;
      try{ const st=window.LN_MODEL_LAZY_STATUS; if(st){st.coldModels.confusableSupplement.status='ready';st.coldModels.confusableSupplement.ms=Math.round(performance.now()-t0);st.coldModels.confusableSupplement.ready=true;} window.LN_MODEL_LAZY?.saveDetail?.(); }catch(e){}
      return model;
    }).catch(err=>{
      try{ const st=window.LN_MODEL_LAZY_STATUS; if(st){st.coldModels.confusableSupplement.status='failed';st.coldModels.confusableSupplement.error=String(err&&err.message||err);st.coldModels.confusableSupplement.ms=Math.round(performance.now()-t0);} window.LN_MODEL_LAZY?.saveDetail?.(); }catch(e){}
      throw err;
    });
    return coldPromise;
  }
  async function loadConfusableMajorModelV2946(options){
    if(window.LN_CONFUSABLE_MAJOR_MODEL_2946_READY && window.LN_CONFUSABLE_MAJOR_MODEL_2946){
      if((options&&options.withCold===true) && !window.LN_CONFUSABLE_MAJOR_MODEL_2946.__coldSupplementReady) await loadConfusableMajorColdSupplementV2946('withCold-existing');
      return window.LN_CONFUSABLE_MAJOR_MODEL_2946;
    }
    const loadColdNow = !lazyEnabled() || (options && options.withCold === true);
    const jobs = [
      getJson(FILES.manifest), getJson(FILES.groups), getJson(FILES.members), getJson(FILES.detectedPairs), getJson(FILES.schoolIndex), getJson(FILES.recordIndex)
    ];
    if(loadColdNow) jobs.push(getJson(FILES.parentExpectationPaths), getJson(FILES.qualityReport));
    else jobs.push(Promise.resolve(null), Promise.resolve(null));
    jobs.push(getJson(FILES.anchorRules), getJson(FILES.manualConfirmed), getJson(FILES.manualExcluded));
    const parts = await Promise.all(jobs);
    return buildModel(parts);
  }
  window.loadConfusableMajorModelV2946 = loadConfusableMajorModelV2946;
  window.loadConfusableMajorColdSupplementV2946 = loadConfusableMajorColdSupplementV2946;
  window.LN_CONFUSABLE_MAJOR_MODEL_2946_FILES = FILES;
  window.LN_CONFUSABLE_MAJOR_MODEL_2946_READY = false;
  window.LN_CONFUSABLE_MAJOR_MODEL_2946_DEFERRED = true;
})();

/* V2.9.4.5 wrapper: reuse V2.9.4.4 major-name model data; add parent-interest expression in app.v2945.js. */
/* V2.91RC0.model-lazy1: keep core mapping load stable; move graduateSubjectReference + qualityReport into cold supplement unless explicitly requested. */
(function(){
  const FILES = {
    manifest: 'data/major_name_model/v2944_manifest.json',
    admissionMajorRaw: 'data/major_name_model/admission_major_raw_v2944.json',
    undergraduateCatalogMajor: 'data/major_name_model/undergraduate_catalog_major_v2944.json',
    admissionToCatalogMap: 'data/major_name_model/admission_to_catalog_map_v2944.json',
    graduateSubjectReference: 'data/major_name_model/graduate_subject_reference_v2944.json',
    admissionEntryMajorIndex: 'data/major_name_model/admission_entry_major_index_v2944.json',
    qualityReport: 'data/major_name_model/quality_report_v2944.json'
  };
  const LAZY_VERSION = '291rc0-model-lazy1-20260513';
  function baseUrl(){
    const u = new URL(window.location.href); u.hash=''; u.search='';
    if(u.pathname.endsWith('/')) return u.href;
    if(/\.html?$/i.test(u.pathname)){ u.pathname = u.pathname.replace(/[^/]+$/, ''); return u.href; }
    u.pathname += '/'; return u.href;
  }
  function dataUrl(file){ const u = new URL(file, baseUrl()); u.searchParams.set('v','2944'); return u.href; }
  async function getJson(file){ const r = await fetch(dataUrl(file), {cache:'default'}); if(!r.ok) throw new Error(file+' '+r.status); return r.json(); }
  function lazyEnabled(){ return window.LN_MODEL_LAZY_OPT !== false; }
  function ensureArrays(obj){ return obj && Array.isArray(obj.items) ? obj : {items:[], lazy:true}; }
  function rebuildDerived(model){
    const admissionMajorRaw = ensureArrays(model.admissionMajorRaw);
    const undergraduateCatalogMajor = ensureArrays(model.undergraduateCatalogMajor);
    const admissionToCatalogMap = ensureArrays(model.admissionToCatalogMap);
    const graduateSubjectReference = ensureArrays(model.graduateSubjectReference);
    const byRaw = new Map((admissionMajorRaw.items||[]).map(x=>[x.admission_major_name_raw,x]));
    const mapsByKey = new Map();
    (admissionToCatalogMap.items||[]).forEach(x=>{
      if(!mapsByKey.has(x.admission_major_key)) mapsByKey.set(x.admission_major_key,[]);
      mapsByKey.get(x.admission_major_key).push(x);
    });
    const catalogByCode = new Map((undergraduateCatalogMajor.items||[]).map(x=>[x.catalog_major_code,x]));
    const gradByMajorCode = new Map();
    (graduateSubjectReference.items||[]).forEach(x=>{
      if(!gradByMajorCode.has(x.catalog_major_code)) gradByMajorCode.set(x.catalog_major_code,[]);
      gradByMajorCode.get(x.catalog_major_code).push(x);
    });
    Object.assign(model, {byRaw, mapsByKey, catalogByCode, gradByMajorCode});
    return model;
  }
  let coldPromise = null;
  async function loadMajorNameColdSupplementV2944(reason){
    const model = window.LN_MAJOR_NAME_MODEL_2944;
    if(!model) return null;
    if(model.__coldSupplementReady) return model;
    if(coldPromise) return coldPromise;
    const state = window.LN_MODEL_LAZY_STATUS;
    try{ state && (state.coldModels.majorNameSupplement.status='loading', state.coldModels.majorNameSupplement.reason=reason||'ensure'); window.LN_MODEL_LAZY?.saveDetail?.(); }catch(e){}
    const t0 = performance.now();
    coldPromise = Promise.all([getJson(FILES.graduateSubjectReference), getJson(FILES.qualityReport)]).then(([graduateSubjectReference, qualityReport])=>{
      model.graduateSubjectReference = graduateSubjectReference;
      model.qualityReport = qualityReport;
      model.__coldSupplementReady = true;
      model.__coldSupplementVersion = LAZY_VERSION;
      rebuildDerived(model);
      try{ const st=window.LN_MODEL_LAZY_STATUS; if(st){st.coldModels.majorNameSupplement.status='ready';st.coldModels.majorNameSupplement.ms=Math.round(performance.now()-t0);st.coldModels.majorNameSupplement.ready=true;} window.LN_MODEL_LAZY?.saveDetail?.(); }catch(e){}
      return model;
    }).catch(err=>{
      try{ const st=window.LN_MODEL_LAZY_STATUS; if(st){st.coldModels.majorNameSupplement.status='failed';st.coldModels.majorNameSupplement.error=String(err&&err.message||err);st.coldModels.majorNameSupplement.ms=Math.round(performance.now()-t0);} window.LN_MODEL_LAZY?.saveDetail?.(); }catch(e){}
      throw err;
    });
    return coldPromise;
  }
  async function loadMajorNameModelV2944(options){
    const opt = Object.assign({withEntryIndex:false, withCold:false}, options||{});
    if(window.LN_MAJOR_NAME_MODEL_2944_READY && window.LN_MAJOR_NAME_MODEL_2944){
      if((opt.withCold || !lazyEnabled()) && !window.LN_MAJOR_NAME_MODEL_2944.__coldSupplementReady) await loadMajorNameColdSupplementV2944('withCold-existing');
      return window.LN_MAJOR_NAME_MODEL_2944;
    }
    const loadColdNow = !lazyEnabled() || opt.withCold === true || opt.blockingCold === true;
    const coreJobs = [getJson(FILES.manifest), getJson(FILES.admissionMajorRaw), getJson(FILES.undergraduateCatalogMajor), getJson(FILES.admissionToCatalogMap)];
    if(loadColdNow) coreJobs.push(getJson(FILES.graduateSubjectReference), getJson(FILES.qualityReport));
    const parts = await Promise.all(coreJobs);
    const [manifest, admissionMajorRaw, undergraduateCatalogMajor, admissionToCatalogMap, graduateSubjectReference, qualityReport] = parts;
    const model = {
      manifest, admissionMajorRaw, undergraduateCatalogMajor, admissionToCatalogMap,
      graduateSubjectReference: graduateSubjectReference || {items:[], lazy:true},
      qualityReport: qualityReport || {lazy:true},
      __coldSupplementReady: !!graduateSubjectReference,
      __modelLazyCoreOnly: !graduateSubjectReference,
      __modelLazyVersion: LAZY_VERSION
    };
    if(opt.withEntryIndex) model.admissionEntryMajorIndex = await getJson(FILES.admissionEntryMajorIndex);
    rebuildDerived(model);
    window.LN_MAJOR_NAME_MODEL_2944 = model;
    window.LN_MAJOR_NAME_MODEL_2944_READY = true;
    return model;
  }
  window.loadMajorNameModelV2944 = loadMajorNameModelV2944;
  window.loadMajorNameColdSupplementV2944 = loadMajorNameColdSupplementV2944;
  window.LN_MAJOR_NAME_MODEL_2944_FILES = FILES;
  window.LN_MAJOR_NAME_MODEL_2944_READY = false;
  window.LN_MAJOR_NAME_MODEL_2944_DEFERRED = true;
})();

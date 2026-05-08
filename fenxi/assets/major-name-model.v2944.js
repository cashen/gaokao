/* V2.9.4.4 major-name model optional loader. Keeps V2.9.4.3 main app unchanged. */
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
  function baseUrl(){
    const u = new URL(window.location.href); u.hash=''; u.search='';
    if(u.pathname.endsWith('/')) return u.href;
    if(/\.html?$/i.test(u.pathname)){ u.pathname = u.pathname.replace(/[^/]+$/, ''); return u.href; }
    u.pathname += '/'; return u.href;
  }
  function dataUrl(file){ const u = new URL(file, baseUrl()); u.searchParams.set('v','2944'); return u.href; }
  async function getJson(file){ const r = await fetch(dataUrl(file), {cache:'no-store'}); if(!r.ok) throw new Error(file+' '+r.status); return r.json(); }
  async function loadMajorNameModelV2944(options){
    const opt = Object.assign({withEntryIndex:false}, options||{});
    const [manifest, admissionMajorRaw, undergraduateCatalogMajor, admissionToCatalogMap, graduateSubjectReference, qualityReport] = await Promise.all([
      getJson(FILES.manifest), getJson(FILES.admissionMajorRaw), getJson(FILES.undergraduateCatalogMajor), getJson(FILES.admissionToCatalogMap), getJson(FILES.graduateSubjectReference), getJson(FILES.qualityReport)
    ]);
    const model = {manifest, admissionMajorRaw, undergraduateCatalogMajor, admissionToCatalogMap, graduateSubjectReference, qualityReport};
    if(opt.withEntryIndex) model.admissionEntryMajorIndex = await getJson(FILES.admissionEntryMajorIndex);
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
    window.LN_MAJOR_NAME_MODEL_2944 = model;
    window.LN_MAJOR_NAME_MODEL_2944_READY = true;
    return model;
  }
  window.loadMajorNameModelV2944 = loadMajorNameModelV2944;
  window.LN_MAJOR_NAME_MODEL_2944_FILES = FILES;
  window.LN_MAJOR_NAME_MODEL_2944_READY = false;
  // Optional lightweight preload: no entry index, so it will not affect the chunk engine.
  loadMajorNameModelV2944({withEntryIndex:false}).catch(err=>{
    window.LN_MAJOR_NAME_MODEL_2944_ERROR = String(err && err.message || err);
    console.warn('[V2.9.4.4] major-name model preload failed:', err);
  });
})();

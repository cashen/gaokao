/* V2.9.4.6 易混专业模型加载器：同校近分 + 本科代码/门类/专业大类差异 + 家长期望路径错位。 */
(function(){
  const FILES = {
    manifest: 'data/confusable_major_model/v2946_manifest.json',
    groups: 'data/confusable_major_model/confusable_major_groups_v2946.json',
    members: 'data/confusable_major_model/confusable_major_members_v2946.json',
    detectedPairs: 'data/confusable_major_model/confusable_major_detected_pairs_v2946.json',
    schoolIndex: 'data/confusable_major_model/confusable_major_school_index_v2946.json',
    recordIndex: 'data/confusable_major_model/confusable_major_record_index_v2946.json',
    parentExpectationPaths: 'data/confusable_major_model/parent_expectation_paths_v2946.json',
    qualityReport: 'data/confusable_major_model/confusable_major_quality_report_v2946.json',
    manualConfirmed: 'data/confusable_major_model/manual_confirmed_pairs_v2946.json',
    manualExcluded: 'data/confusable_major_model/manual_excluded_pairs_v2946.json'
  };
  function baseUrl(){
    const u = new URL(window.location.href); u.hash=''; u.search='';
    if(u.pathname.endsWith('/')) return u.href;
    if(/\.html?$/i.test(u.pathname)){ u.pathname = u.pathname.replace(/[^/]+$/, ''); return u.href; }
    u.pathname += '/'; return u.href;
  }
  function dataUrl(file){ const u = new URL(file, baseUrl()); u.searchParams.set('v','2946'); return u.href; }
  async function getJson(file){ const r = await fetch(dataUrl(file), {cache:'no-store'}); if(!r.ok) throw new Error(file+' '+r.status); return r.json(); }
  function buildModel(parts){
    const [manifest, groups, members, detectedPairs, schoolIndex, recordIndex, parentExpectationPaths, qualityReport, manualConfirmed, manualExcluded] = parts;
    const model = {manifest, groups, members, detectedPairs, schoolIndex, recordIndex, parentExpectationPaths, qualityReport, manualConfirmed, manualExcluded};
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
  async function loadConfusableMajorModelV2946(){
    if(window.LN_CONFUSABLE_MAJOR_MODEL_2946_READY && window.LN_CONFUSABLE_MAJOR_MODEL_2946) return window.LN_CONFUSABLE_MAJOR_MODEL_2946;
    const parts = await Promise.all([
      getJson(FILES.manifest), getJson(FILES.groups), getJson(FILES.members), getJson(FILES.detectedPairs), getJson(FILES.schoolIndex), getJson(FILES.recordIndex), getJson(FILES.parentExpectationPaths), getJson(FILES.qualityReport), getJson(FILES.manualConfirmed), getJson(FILES.manualExcluded)
    ]);
    return buildModel(parts);
  }
  window.loadConfusableMajorModelV2946 = loadConfusableMajorModelV2946;
  window.LN_CONFUSABLE_MAJOR_MODEL_2946_FILES = FILES;
  window.LN_CONFUSABLE_MAJOR_MODEL_2946_READY = false;
  loadConfusableMajorModelV2946().catch(err=>{
    window.LN_CONFUSABLE_MAJOR_MODEL_2946_ERROR = String(err && err.message || err);
    console.warn('[V2.9.4.6] confusable-major model preload failed:', err);
  });
})();

// V2.93RC1｜轻量模型与安全性能保护合并包
// 合并范围：易混专业轻量索引、安全性能保护。不改完整易混模型、不改候选池与计算公式。
(function(){
  window.LN_V293RC1_MERGE = window.LN_V293RC1_MERGE || {};
  window.LN_V293RC1_MERGE.modelLight = {ready:false, files:2, stamp:'293rc1-20260515'};
})();


/* ===== BEGIN assets/confusable-light.v292rc1.js ===== */
// V2.92RC1｜易混专业轻量索引：启动只加载 recordIndex，完整 pairs 在展开详情时加载
(function(){
  if(window.LN_CONFUSABLE_LIGHT_DISABLE===true) return;
  var VERSION='v293rc1-confusable-light';
  var STAMP='293rc1-20260515';
  var FILES={
    manifest:'data/confusable_major_model/v29462_manifest.json',
    groups:'data/confusable_major_model/confusable_major_groups_v2946.json',
    members:'data/confusable_major_model/confusable_major_members_v2946.json',
    detectedPairs:'data/confusable_major_model/confusable_major_detected_pairs_v29462.json',
    schoolIndex:'data/confusable_major_model/confusable_major_school_index_v2946.json',
    recordIndex:'data/confusable_major_model/confusable_major_record_index_v29462.json',
    parentExpectationPaths:'data/confusable_major_model/parent_expectation_paths_v2946.json',
    qualityReport:'data/confusable_major_model/confusable_warning_side_quality_report_v29462.json',
    anchorRules:'data/confusable_major_model/confusable_anchor_rules_v29462.json',
    manualConfirmed:'data/confusable_major_model/manual_confirmed_pairs_v2946.json',
    manualExcluded:'data/confusable_major_model/manual_excluded_pairs_v2946.json'
  };
  function baseUrl(){
    var u=new URL(window.location.href); u.hash=''; u.search='';
    if(u.pathname.endsWith('/')) return u.href;
    if(/\.html?$/i.test(u.pathname)){u.pathname=u.pathname.replace(/[^/]+$/,''); return u.href;}
    u.pathname+='/'; return u.href;
  }
  function dataUrl(file){var u=new URL(file,baseUrl()); u.searchParams.set('v','292rc1'); return u.href;}
  async function getJson(file){var r=await fetch(dataUrl(file),{cache:'default'}); if(!r.ok) throw new Error(file+' '+r.status); return r.json();}
  function setStatus(status, extra){
    try{
      window.__LN_CONFUSABLE_LIGHT_STATE__=Object.assign(window.__LN_CONFUSABLE_LIGHT_STATE__||{}, {version:VERSION,stamp:STAMP,status:status}, extra||{});
      window.LN_DEBUG_V2983?.setFlags?.({confusableLight:status, confusableLightVersion:VERSION});
    }catch(e){}
  }
  function buildLight(parts){
    var manifest=parts[0], groups=parts[1], members=parts[2], schoolIndex=parts[3], recordIndex=parts[4], anchorRules=parts[5], manualConfirmed=parts[6], manualExcluded=parts[7];
    var groupsById=new Map((groups.items||[]).map(function(x){return [x.group_id,x];}));
    var recordPairs=new Map();
    (recordIndex.items||[]).forEach(function(x){
      var list=(x.pairs||[]).map(function(p){
        var g=groupsById.get(p.group_id)||{};
        return {
          __light:true,
          pair_id:p.pair_id,
          group_id:p.group_id,
          group_name:g.group_name||g.name||p.group_id||'易混专业',
          risk_level:p.risk_level||'medium',
          risk_score:p.risk_score||60,
          front_display:true,
          parent_warning:p.warning_side_reason||'该专业存在易混点，展开后加载完整依据。',
          basis:[p.warning_side_reason||'启动阶段使用轻量易混索引，完整依据展开后加载。'],
          items:[{record_id:x.record_id, admission_major_name_raw:'当前候选', plain_label:p.peer_major?('需与 '+p.peer_major+' 区分'):'需复核专业代码和培养方案', warning_summary_v29462:p.warning_side_reason||''}]
        };
      }).sort(function(a,b){return (b.risk_score||0)-(a.risk_score||0);});
      recordPairs.set(x.record_id,list);
    });
    var model={manifest:manifest,groups:groups,members:members,detectedPairs:{items:[],lazy:true,light:true},schoolIndex:schoolIndex,recordIndex:recordIndex,parentExpectationPaths:{items:[],lazy:true},qualityReport:{lazy:true},anchorRules:anchorRules,manualConfirmed:manualConfirmed,manualExcluded:manualExcluded,groupsById:groupsById,recordPairs:recordPairs,schoolPairs:new Map(),version:'V2.92RC1-light',__lightReady:true,__fullReady:false,__modelLazyVersion:STAMP};
    window.LN_CONFUSABLE_MAJOR_MODEL_2946=model;
    window.LN_CONFUSABLE_MAJOR_MODEL_2946_READY=true;
    try{CONFUSABLE_MODEL_2946=model;}catch(e){}
    setStatus('light-ready',{recordCount:recordPairs.size});
    return model;
  }
  function buildFull(parts){
    var manifest=parts[0], groups=parts[1], members=parts[2], detectedPairs=parts[3], schoolIndex=parts[4], recordIndex=parts[5], parentExpectationPaths=parts[6], qualityReport=parts[7], anchorRules=parts[8], manualConfirmed=parts[9], manualExcluded=parts[10];
    var pairsById=new Map((detectedPairs.items||[]).map(function(x){return [x.pair_id,x];}));
    var groupsById=new Map((groups.items||[]).map(function(x){return [x.group_id,x];}));
    var recordPairs=new Map();
    (recordIndex.items||[]).forEach(function(x){
      var full=(x.pairs||[]).map(function(p){return pairsById.get(p.pair_id);}).filter(Boolean).sort(function(a,b){return (b.risk_score||0)-(a.risk_score||0);});
      recordPairs.set(x.record_id,full);
    });
    var schoolPairs=new Map();
    (schoolIndex.items||[]).forEach(function(x){schoolPairs.set(x.school,(x.pair_ids||[]).map(function(id){return pairsById.get(id);}).filter(Boolean).sort(function(a,b){return (b.risk_score||0)-(a.risk_score||0);}));});
    var model={manifest:manifest,groups:groups,members:members,detectedPairs:detectedPairs,schoolIndex:schoolIndex,recordIndex:recordIndex,parentExpectationPaths:parentExpectationPaths||{items:[],lazy:true},qualityReport:qualityReport||{lazy:true},anchorRules:anchorRules,manualConfirmed:manualConfirmed,manualExcluded:manualExcluded,pairsById:pairsById,groupsById:groupsById,recordPairs:recordPairs,schoolPairs:schoolPairs,version:'V2.92RC1-full',__lightReady:true,__fullReady:true,__modelLazyVersion:STAMP};
    window.LN_CONFUSABLE_MAJOR_MODEL_2946=model;
    window.LN_CONFUSABLE_MAJOR_MODEL_2946_READY=true;
    try{CONFUSABLE_MODEL_2946=model;}catch(e){}
    setStatus('full-ready',{recordCount:recordPairs.size,pairCount:(detectedPairs.items||[]).length});
    return model;
  }
  var lightPromise=null, fullPromise=null;
  async function loadLight(){
    var cur=window.LN_CONFUSABLE_MAJOR_MODEL_2946;
    if(cur && cur.__lightReady) return cur;
    if(lightPromise) return lightPromise;
    setStatus('light-loading');
    lightPromise=Promise.all([getJson(FILES.manifest),getJson(FILES.groups),getJson(FILES.members),getJson(FILES.schoolIndex),getJson(FILES.recordIndex),getJson(FILES.anchorRules),getJson(FILES.manualConfirmed),getJson(FILES.manualExcluded)]).then(buildLight).catch(function(e){setStatus('light-failed',{error:String(e&&e.message||e)}); throw e;});
    return lightPromise;
  }
  async function loadFull(reason){
    var cur=window.LN_CONFUSABLE_MAJOR_MODEL_2946;
    if(cur && cur.__fullReady) return cur;
    if(fullPromise) return fullPromise;
    setStatus('full-loading',{reason:reason||'ensure'});
    fullPromise=Promise.all([getJson(FILES.manifest),getJson(FILES.groups),getJson(FILES.members),getJson(FILES.detectedPairs),getJson(FILES.schoolIndex),getJson(FILES.recordIndex),getJson(FILES.parentExpectationPaths),getJson(FILES.qualityReport),getJson(FILES.anchorRules),getJson(FILES.manualConfirmed),getJson(FILES.manualExcluded)]).then(buildFull).catch(function(e){setStatus('full-failed',{error:String(e&&e.message||e)}); throw e;});
    return fullPromise;
  }
  window.loadConfusableMajorModelV2946=function(options){
    if(options && (options.full===true || options.withFull===true || options.withCold===true)) return loadFull('api-full');
    return loadLight();
  };
  window.loadConfusableMajorFullV2946=loadFull;
  window.LN_CONFUSABLE_LIGHT_V293RC1={ready:true,version:VERSION,stamp:STAMP,loadLight:loadLight,loadFull:loadFull};
})();
/* ===== END assets/confusable-light.v292rc1.js ===== */


/* ===== BEGIN assets/safeperf.v29rc1.js ===== */
// V2.9RC.fix-safeperf1: conservative performance guard.
// Boundary: do not change formulas, A/B/C rules, ranking, click behavior or V3. Only make major_name_model non-blocking and record model/resource timing.
(function(){
  const VERSION = '29rc-safeperf1-20260513';
  if (window.LN_SAFE_PERF_STATE && window.LN_SAFE_PERF_STATE.version === VERSION) return;
  window.LN_SAFE_PERF_OPT = (window.LN_SAFE_PERF_OPT !== false);
  window.LN_SAFE_PERF_VERSION = VERSION;
  const state = window.LN_SAFE_PERF_STATE = {
    version: VERSION,
    enabled: !!window.LN_SAFE_PERF_OPT,
    majorNameModel: {status:'idle', loadMs:null, scheduled:false, error:null, nonBlocking:true},
    confusableModel: {status:'idle', loadMs:null, scheduled:false, error:null, blocking:true},
    notes: [
      'major_name_model is scheduled as a non-blocking enhancement model when safe perf is enabled.',
      'confusable_major_model remains blocking because plan-engine uses hasConfusableMajorV2946 in A/B/C scoring.'
    ]
  };
  function now(){return Math.round(performance.now());}
  function saveDetail(){
    try{
      window.LN_DEBUG_V2983?.detail?.('safePerf', {
        enabled: !!window.LN_SAFE_PERF_OPT,
        version: VERSION,
        majorNameModel: Object.assign({}, state.majorNameModel, {ready: !!window.LN_MAJOR_NAME_MODEL_2944_READY}),
        confusableModel: Object.assign({}, state.confusableModel, {ready: !!window.LN_CONFUSABLE_MAJOR_MODEL_2946_READY}),
        ts: new Date().toLocaleTimeString()
      });
      window.LN_DEBUG_V2983?.setFlags?.({safePerfOpt: !!window.LN_SAFE_PERF_OPT, safePerfVersion: VERSION});
    }catch(e){}
  }
  function idle(fn, delay){
    const d = Number.isFinite(delay) ? delay : 1200;
    if ('requestIdleCallback' in window) {
      setTimeout(()=>requestIdleCallback(fn,{timeout:3500}), d);
    } else {
      setTimeout(fn, d);
    }
  }
  const originalMajor = window.loadMajorNameModelV2944;
  if (typeof originalMajor === 'function' && !originalMajor.__safePerfWrapped) {
    let majorPromise = null;
    function runMajor(options){
      if (window.LN_MAJOR_NAME_MODEL_2944_READY && window.LN_MAJOR_NAME_MODEL_2944) {
        state.majorNameModel.status = 'ready'; saveDetail(); return Promise.resolve(window.LN_MAJOR_NAME_MODEL_2944);
      }
      if (majorPromise) return majorPromise;
      state.majorNameModel.status = 'loading'; state.majorNameModel.error = null; const t0 = performance.now(); saveDetail();
      majorPromise = Promise.resolve().then(()=>originalMajor.call(window, options || {withEntryIndex:false})).then(model=>{
        state.majorNameModel.status = 'ready'; state.majorNameModel.loadMs = Math.round(performance.now()-t0); saveDetail(); return model;
      }).catch(err=>{
        state.majorNameModel.status = 'failed'; state.majorNameModel.error = String(err && err.message || err); state.majorNameModel.loadMs = Math.round(performance.now()-t0); saveDetail();
        // Enhancement model failure must not break the main candidate pool.
        return null;
      });
      return majorPromise;
    }
    function scheduleMajor(options){
      if (state.majorNameModel.scheduled || state.majorNameModel.status === 'ready' || state.majorNameModel.status === 'loading') return majorPromise || Promise.resolve(window.LN_MAJOR_NAME_MODEL_2944 || null);
      state.majorNameModel.scheduled = true; state.majorNameModel.status = 'scheduled'; state.majorNameModel.scheduledAt = now(); saveDetail();
      idle(()=>runMajor(options || {withEntryIndex:false}), 1200);
      return Promise.resolve(window.LN_MAJOR_NAME_MODEL_2944_READY ? window.LN_MAJOR_NAME_MODEL_2944 : null);
    }
    const wrappedMajor = function(options){
      if (!window.LN_SAFE_PERF_OPT || (options && (options.blocking === true || options.forceBlocking === true))) return runMajor(options);
      // Keep boot non-blocking: schedule this enhancement model and return immediately.
      return scheduleMajor(options || {withEntryIndex:false});
    };
    wrappedMajor.__safePerfWrapped = true;
    wrappedMajor.__original = originalMajor;
    window.loadMajorNameModelV2944 = wrappedMajor;
    window.LN_SAFE_PERF_MAJOR_NAME = {ensure: runMajor, warmup: scheduleMajor, state: state.majorNameModel, version: VERSION};
  }
  const originalConf = window.loadConfusableMajorModelV2946;
  if (typeof originalConf === 'function' && !originalConf.__safePerfTimed) {
    let confPromise = null;
    const wrappedConf = function(){
      if (window.LN_CONFUSABLE_MAJOR_MODEL_2946_READY && window.LN_CONFUSABLE_MAJOR_MODEL_2946) {
        state.confusableModel.status = 'ready'; saveDetail(); return Promise.resolve(window.LN_CONFUSABLE_MAJOR_MODEL_2946);
      }
      if (confPromise) return confPromise;
      state.confusableModel.status = 'loading'; state.confusableModel.error = null; const t0 = performance.now(); saveDetail();
      confPromise = Promise.resolve().then(()=>originalConf.apply(window, arguments)).then(model=>{
        state.confusableModel.status = 'ready'; state.confusableModel.loadMs = Math.round(performance.now()-t0); saveDetail(); return model;
      }).catch(err=>{
        state.confusableModel.status = 'failed'; state.confusableModel.error = String(err && err.message || err); state.confusableModel.loadMs = Math.round(performance.now()-t0); saveDetail(); throw err;
      });
      return confPromise;
    };
    wrappedConf.__safePerfTimed = true;
    wrappedConf.__original = originalConf;
    window.loadConfusableMajorModelV2946 = wrappedConf;
    window.LN_SAFE_PERF_CONFUSABLE = {ensure: wrappedConf, state: state.confusableModel, version: VERSION, blocking:true};
  }
  function collectResources(){
    try{
      const resources = performance.getEntriesByType('resource') || [];
      const summary = {};
      for (const r of resources) {
        const m = String(r.name||'').split('?')[0].match(/\.([a-z0-9]+)$/i);
        const ext = m ? m[1].toLowerCase() : 'no_ext';
        summary[ext] = summary[ext] || {count:0, transferSize:0, encodedBodySize:0, decodedBodySize:0, totalDuration:0};
        summary[ext].count += 1;
        summary[ext].transferSize += r.transferSize || 0;
        summary[ext].encodedBodySize += r.encodedBodySize || 0;
        summary[ext].decodedBodySize += r.decodedBodySize || 0;
        summary[ext].totalDuration += r.duration || 0;
      }
      const topSlow = resources.slice().sort((a,b)=>(b.duration||0)-(a.duration||0)).slice(0,12).map(r=>({name:String(r.name||'').split('/').slice(-3).join('/'), type:r.initiatorType, ms:Math.round(r.duration||0), decodedBodySize:r.decodedBodySize||0, transferSize:r.transferSize||0}));
      const topBig = resources.slice().sort((a,b)=>(b.decodedBodySize||0)-(a.decodedBodySize||0)).slice(0,12).map(r=>({name:String(r.name||'').split('/').slice(-3).join('/'), type:r.initiatorType, ms:Math.round(r.duration||0), decodedBodySize:r.decodedBodySize||0, transferSize:r.transferSize||0}));
      const nav = performance.getEntriesByType('navigation')[0];
      const paints = performance.getEntriesByType('paint').map(p=>({name:p.name, ms:Math.round(p.startTime||0)}));
      const out = {summary, topSlow, topBig, paints, navigation: nav ? {domInteractive:Math.round(nav.domInteractive||0), domContentLoaded:Math.round(nav.domContentLoadedEventEnd||0), loadEventEnd:Math.round(nav.loadEventEnd||0), responseStart:Math.round(nav.responseStart||0), responseEnd:Math.round(nav.responseEnd||0)} : null};
      window.LN_DEBUG_V2983?.detail?.('resourceSummary', out);
      return out;
    }catch(e){return {error:String(e&&e.message||e)};}
  }
  window.LN_SAFE_PERF_COLLECT_RESOURCES = collectResources;
  setTimeout(()=>{saveDetail(); collectResources();}, 1800);
  window.addEventListener('load',()=>setTimeout(()=>{saveDetail(); collectResources();}, 300));
  saveDetail();
})();
/* ===== END assets/safeperf.v29rc1.js ===== */


/* ===== V2.93RC1 modelLight final marker ===== */
(function(){
  try{
    window.LN_V293RC1_MERGE = window.LN_V293RC1_MERGE || {};
    window.LN_V293RC1_MERGE.modelLight.ready = true;
    window.LN_DEBUG_V2983 && window.LN_DEBUG_V2983.setFlags && window.LN_DEBUG_V2983.setFlags({v293rc1:true, modelLight:'v293rc1', confusableLightVersion:'v293rc1-confusable-light'});
  }catch(e){}
})();

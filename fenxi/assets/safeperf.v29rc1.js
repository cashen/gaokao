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

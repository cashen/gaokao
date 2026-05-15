// V2.91RC0.model-lazy1: non-first-screen model warmup coordinator.
// Boundary: does not change formulas, candidate pool, sorting, A/B/C, interest real-hit, region hard or model data contents.
(function(){
  const VERSION='291rc0-model-lazy1-20260513';
  const NAME='v291rc0lazy1';
  if(window.LN_MODEL_LAZY_STATUS && window.LN_MODEL_LAZY_STATUS.version===VERSION) return;
  window.LN_MODEL_LAZY_OPT = (window.LN_MODEL_LAZY_OPT !== false);
  window.LN_MODEL_LAZY_VERSION = VERSION;
  const state = window.LN_MODEL_LAZY_STATUS = {
    version: VERSION,
    enabled: !!window.LN_MODEL_LAZY_OPT,
    policy: {doesModifyFormula:false, doesModifyData:false, doesShard:false, doesChangeCandidatePool:false, doesChangeSorting:false, onlyColdModels:true},
    schedule: {scheduled:false, reason:'', at:null, delayMs:1000, idleTimeoutMs:3000, runs:0},
    coldModels: {
      graduateCatalog: {status:'idle', ready:false, ms:null, error:null, role:'研究生目录参考；详情/报告解释增强'},
      majorNameSupplement: {status:'idle', ready:false, ms:null, error:null, role:'graduateSubjectReference + qualityReport；专业详情解释增强'},
      confusableSupplement: {status:'idle', ready:false, ms:null, error:null, role:'parentExpectationPaths + warning quality report；易混解释增强'}
    },
    ui: {detailFallbackText:'专业解释正在补全，不影响当前筛选结果。', exportWaitLimitMs:3000},
    counters:{ensureAll:0, schedule:0, renderCardsHook:0}
  };
  function now(){return Math.round(performance&&performance.now?performance.now():Date.now());}
  function saveDetail(){
    try{
      window.LN_DEBUG_V2983?.detail?.('modelLazy', JSON.parse(JSON.stringify(state)));
      window.LN_DEBUG_V2983?.setFlags?.({modelLazy:NAME, modelLazyOpt:!!window.LN_MODEL_LAZY_OPT, modelLazyVersion:VERSION, coldModelStatus: overallStatus(), coldModelPreloadScheduled: !!state.schedule.scheduled});
    }catch(e){}
  }
  function overallStatus(){
    const vals=Object.values(state.coldModels).map(x=>x.status);
    if(vals.some(x=>x==='failed')) return 'failed';
    if(vals.every(x=>x==='ready')) return 'ready';
    if(vals.some(x=>x==='loading')) return 'loading';
    if(state.schedule.scheduled) return 'scheduled';
    return 'idle';
  }
  function idle(fn, delay, timeout){
    const d=Number.isFinite(delay)?delay:1000;
    const t=Number.isFinite(timeout)?timeout:3000;
    setTimeout(()=>{
      if('requestIdleCallback' in window) requestIdleCallback(fn,{timeout:t});
      else setTimeout(fn, 300);
    }, d);
  }
  async function ensureGraduateCatalog(reason){
    if(!window.LN_MODEL_LAZY_OPT) return null;
    const item=state.coldModels.graduateCatalog;
    if(item.status==='ready') return item.value || null;
    if(item.promise) return item.promise;
    if(!window.DATA_FILES || !window.DATA_FILES.graduateCatalog || typeof window.loadJsonFile!=='function') { item.status='idle'; saveDetail(); return null; }
    item.status='loading'; item.reason=reason||'ensure'; item.startedAt=now(); saveDetail();
    const t0=performance.now();
    item.promise = window.loadJsonFile(window.DATA_FILES.graduateCatalog,'研究生学科代码表（延后）').then(obj=>{
      try{ GRADUATE_CATALOG_2022_2025 = obj; }catch(e){ window.GRADUATE_CATALOG_2022_2025_LAZY = obj; }
      item.status='ready'; item.ready=true; item.ms=Math.round(performance.now()-t0); item.valueSummary={items:(obj&&obj.items||obj&&obj.records||[]).length||undefined}; saveDetail(); return obj;
    }).catch(err=>{ item.status='failed'; item.error=String(err&&err.message||err); item.ms=Math.round(performance.now()-t0); saveDetail(); return null; });
    return item.promise;
  }
  async function ensureMajorSupplement(reason){
    if(!window.LN_MODEL_LAZY_OPT) return null;
    if(typeof window.loadMajorNameColdSupplementV2944==='function') return window.loadMajorNameColdSupplementV2944(reason||'model-lazy');
    return null;
  }
  async function ensureConfusableSupplement(reason){
    if(!window.LN_MODEL_LAZY_OPT) return null;
    if(typeof window.loadConfusableMajorColdSupplementV2946==='function') return window.loadConfusableMajorColdSupplementV2946(reason||'model-lazy');
    return null;
  }
  function ensureAll(reason){
    state.counters.ensureAll++; saveDetail();
    if(!window.LN_MODEL_LAZY_OPT) return Promise.resolve({disabled:true});
    return Promise.allSettled([ensureGraduateCatalog(reason), ensureMajorSupplement(reason), ensureConfusableSupplement(reason)]).then(res=>{saveDetail();return {ok:true, results:res.map(x=>x.status)};});
  }
  function schedule(reason, opts){
    if(!window.LN_MODEL_LAZY_OPT) return {ok:false, disabled:true};
    if(state.schedule.scheduled || overallStatus()==='ready' || overallStatus()==='loading') return {ok:true, already:true, status:overallStatus()};
    const delay = opts && Number.isFinite(opts.delayMs) ? opts.delayMs : 1000;
    state.schedule.scheduled=true; state.schedule.reason=reason||'first-result'; state.schedule.at=now(); state.schedule.delayMs=delay; state.counters.schedule++; saveDetail();
    idle(()=>{state.schedule.runs++; saveDetail(); ensureAll(reason||'scheduled');}, delay, 3000);
    return {ok:true, scheduled:true, delayMs:delay};
  }
  function hookRenderCards(){
    if(window.__LN_MODEL_LAZY_RENDER_HOOKED) return;
    const original = window.renderCards;
    if(typeof original !== 'function') return;
    window.__LN_MODEL_LAZY_RENDER_HOOKED = true;
    window.renderCards = function(){
      const res = original.apply(this, arguments);
      try{
        state.counters.renderCardsHook++;
        const count = Array.isArray(window.filtered) ? window.filtered.length : (window.LN_DEBUG_V2983?.state?.pools?.filtered || 0);
        if(count>0) schedule('renderCards-after-first-result',{delayMs:1000});
      }catch(e){}
      return res;
    };
  }
  function hookWhenReady(){
    let tries=0;
    const timer=setInterval(()=>{tries++; hookRenderCards(); if(window.__LN_MODEL_LAZY_RENDER_HOOKED || tries>80) clearInterval(timer);},100);
  }
  const api = window.LN_MODEL_LAZY = {version:VERSION, stamp:VERSION, state, schedule, ensureAll, ensureGraduateCatalog, ensureMajorSupplement, ensureConfusableSupplement, saveDetail, overallStatus, hookRenderCards};
  hookWhenReady();
  setTimeout(()=>{hookRenderCards(); saveDetail();}, 1500);
  window.addEventListener('load',()=>setTimeout(()=>{hookRenderCards(); saveDetail();}, 600));
  saveDetail();
})();

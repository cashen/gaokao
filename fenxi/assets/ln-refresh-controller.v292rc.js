/*
 * V2.92RC2.4.audit-data-safe-runner｜统一刷新控制器
 * 目标：不改变 compute-pipeline / plan-engine / rules-closure4 的业务结果，
 * 在所有历史 SP wrapper 加载完成后，把 window.applyFilters 收口为一个统一入口。
 * 保留旧 interact-stability / interact-dedupe 的事件监听与指纹思想，但不再让 applyFilters 多层嵌套。
 */
(function(){
  'use strict';
  const VERSION='V2.92RC2.4.audit-data-safe-runner.refresh-controller';
  const STAMP='292rc24-refresh-controller-20260521';
  const state={
    version:VERSION,
    stamp:STAMP,
    ready:true,
    managed:false,
    finalizedAt:null,
    finalizeReason:'',
    requests:[],
    timings:[],
    skips:[],
    capturedChain:[],
    coreHash:'',
    lastFingerprint:'',
    lastApplyAt:0,
    lastReason:'',
    lastApplyMs:0,
    applied:0,
    skipped:0,
    scheduledRenderLight:0,
    notes:[
      '本控制器在旧补丁全部完成后后置接管 applyFilters。',
      '业务计算仍调用 LN_COMPUTE_PIPELINE_V2983.applyFilters，不重写公式、筛选、A/B/C 或详情规则。'
    ]
  };
  const perf=()=>window.performance&&performance.now?performance.now():Date.now();
  function hashText(s){s=String(s||'');let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=(h*16777619)>>>0;}return h.toString(16);}
  function fnHash(fn){try{return hashText(Function.prototype.toString.call(fn).slice(0,2200));}catch(e){return '';}}
  function emit(name,data){try{window.LN_DEBUG_V2983?.detail?.(name,Object.assign({version:STAMP},data||{}));}catch(e){}}
  function flags(data){try{window.LN_DEBUG_V2983?.setFlags?.(Object.assign({refreshController:'v292rc1',refreshControllerManaged:!!state.managed,refreshControllerVersion:STAMP},data||{}));}catch(e){}}
  function note(event,data){state.requests.push({event,data:data||null,at:new Date().toISOString()});if(state.requests.length>120)state.requests.shift();emit('refreshControllerEvent',{event,data:data||null,managed:state.managed});}
  function fingerprint(){
    try{if(window.LN_INTERACT_DEDUPE_V29RC2?.fingerprint)return String(window.LN_INTERACT_DEDUPE_V29RC2.fingerprint()||'');}catch(e){}
    try{if(window.LN_STATE_ADAPTER_V292RC?.readContext)return JSON.stringify(window.LN_STATE_ADAPTER_V292RC.readContext()||{});}catch(e){}
    return String(Date.now());
  }
  function captureChain(fn){
    const chain=[];let cur=fn||window.applyFilters,depth=0;
    while(typeof cur==='function'&&depth<12){
      chain.push({
        depth,
        name:cur.name||'(anonymous)',
        flags:{
          v2983:!!cur.__v2983Wrapped,
          interact:!!cur.__v29rcInteractMarked,
          dedupe:!!cur.__v29rcInteractDedupeWrapped,
          lnRefreshManaged:!!cur.__lnRefreshManaged,
          original:!!cur.__original
        },
        hash:fnHash(cur)
      });
      if(!cur.__original)break;
      cur=cur.__original;depth++;
    }
    return chain;
  }
  function findCore(){
    const cp=window.LN_COMPUTE_PIPELINE_V2983;
    if(cp&&typeof cp.applyFilters==='function')return cp.applyFilters;
    let fn=window.applyFilters;
    let guard=0;
    while(fn&&typeof fn==='function'&&fn.__original&&guard<12){fn=fn.__original;guard++;}
    return typeof fn==='function'?fn:null;
  }
  function updateLegacyStates(fp,reason,ms){
    try{
      const it=window.LN_INTERACT_STABILITY_V29RC1;
      if(it&&it.state){it.state.lastAppliedFingerprint=it.fingerprint?it.fingerprint():fp;it.state.allowed=(Number(it.state.allowed)||0)+1;it.state.lastDecision={reason:String(reason||''),decision:'managed-apply',at:new Date().toLocaleTimeString(),fpHash:it.hash?it.hash(it.state.lastAppliedFingerprint):hashText(it.state.lastAppliedFingerprint)};}
    }catch(e){}
    try{
      const dd=window.LN_INTERACT_DEDUPE_V29RC2;
      if(dd&&dd.state){dd.state.applied=(Number(dd.state.applied)||0)+1;dd.state.lastApplyMs=ms;dd.state.lastReason=String(reason||'managed');dd.state.lastAppliedFingerprint=fp;dd.state.lastApplyAt=perf();}
    }catch(e){}
  }
  function scheduleRenderLight(reason){
    state.scheduledRenderLight++;
    clearTimeout(scheduleRenderLight._timer);
    scheduleRenderLight._timer=setTimeout(()=>{
      try{window.LN_APP_V2983?.renderLight?.('refresh-controller:'+String(reason||'applyFilters'));}catch(e){}
    },220);
  }
  function shouldSkip(fp,reason){
    const now=perf();
    if(!fp||!state.lastFingerprint)return false;
    if(fp!==state.lastFingerprint)return false;
    if((now-Number(state.lastApplyAt||0))<=360){
      state.skipped++;
      const item={reason:String(reason||'managed-apply'),fpHash:hashText(fp),at:new Date().toISOString()};
      state.skips.push(item);if(state.skips.length>80)state.skips.shift();
      try{const dd=window.LN_INTERACT_DEDUPE_V29RC2;if(dd&&dd.state){dd.state.skipped=(Number(dd.state.skipped)||0)+1;dd.state.directDuplicateSkipped=(Number(dd.state.directDuplicateSkipped)||0)+1;dd.state.lastSkipReason='refresh-controller-duplicate:'+String(reason||'');}}catch(e){}
      emit('refreshControllerSkip',item);
      return true;
    }
    return false;
  }
  function makeManaged(core){
    const managed=function lnRefreshControllerApplyFilters(reason){
      const fp=fingerprint();
      const r=reason||arguments[0]||'managed-applyFilters';
      if(shouldSkip(fp,r))return window.filtered||[];
      const t=perf();
      let out;
      try{
        out=core.apply(this,arguments.length?arguments:[r]);
        return out;
      }finally{
        const ms=Math.round(perf()-t);
        state.applied++;
        state.lastApplyMs=ms;
        state.lastReason=String(r||'managed-applyFilters');
        state.lastFingerprint=fp;
        state.lastApplyAt=perf();
        state.timings.push({label:'applyFilters',reason:state.lastReason,ms,filtered:Array.isArray(window.filtered)?window.filtered.length:null,at:new Date().toISOString()});
        if(state.timings.length>120)state.timings.shift();
        updateLegacyStates(fp,r,ms);
        scheduleRenderLight(r);
        flags({refreshControllerLastMs:ms,refreshControllerApplied:state.applied});
      }
    };
    managed.__lnRefreshManaged=true;
    managed.__lnRefreshControllerVersion=STAMP;
    managed.__lnRefreshCoreHash=fnHash(core);
    managed.__lnCapturedWrapperDepth=(state.capturedChain||[]).length;
    // 不暴露 __original，debug wrapper-depth 看到的是已经收口后的单入口。
    return managed;
  }
  function finalize(reason){
    const core=findCore();
    if(typeof core!=='function'){note('finalize-skip-no-core',{reason});return false;}
    if(window.applyFilters&&window.applyFilters.__lnRefreshManaged){state.managed=true;return true;}
    state.capturedChain=captureChain(window.applyFilters);
    state.coreHash=fnHash(core);
    const managed=makeManaged(core);
    window.applyFilters=managed;
    try{if(window.LN_FILTER_ENGINE)window.LN_FILTER_ENGINE.applyFilters=managed;}catch(e){}
    state.managed=true;
    state.finalizedAt=new Date().toISOString();
    state.finalizeReason=String(reason||'finalize');
    note('finalized',{reason:state.finalizeReason,capturedDepth:state.capturedChain.length,coreHash:state.coreHash});
    flags({refreshControllerManaged:true,refreshControllerCapturedDepth:state.capturedChain.length});
    try{window.LN_RUNTIME_REGISTRY_V292RC?.sample?.('refresh-controller-finalized');}catch(e){}
    return true;
  }
  function enforceFinalOwner(reason){
    // 后续旧脚本可能再次 monkey patch window.applyFilters。
    // 这里做最终所有权守卫：只要最终入口不是 refresh-controller，就再次后置接管。
    try{
      if(typeof window.applyFilters!=='function')return false;
      if(window.applyFilters.__lnRefreshManaged){state.managed=true;return true;}
      return finalize(reason||'owner-guard');
    }catch(e){note('owner-guard-error',{reason:String(reason||''),error:String(e&&e.message||e)});return false;}
  }
  function startOwnerGuard(){
    const marks=[5200,6800,8400,11000,15000,22000,30000];
    marks.forEach(ms=>setTimeout(()=>enforceFinalOwner('guard-'+ms),ms));
    let ticks=0;
    const timer=setInterval(()=>{
      ticks++;
      enforceFinalOwner('interval-guard-'+ticks);
      if(ticks>=45)clearInterval(timer);
    },500);
  }
  function request(reason,opts){
    opts=opts||{};
    note('request',{reason,opts});
    const delay=Number.isFinite(Number(opts.delay))?Number(opts.delay):0;
    clearTimeout(request._timer);
    return new Promise(resolve=>{
      request._timer=setTimeout(()=>{
        if(!state.managed)finalize('request-before-run');
        const r=typeof window.applyFilters==='function'?window.applyFilters(reason||'refresh-controller-request'):[];
        resolve(r);
      },delay);
    });
  }
  function getStats(){return JSON.parse(JSON.stringify(state));}
  function boot(){
    note('controller-ready');
    // 历史补丁/动态加载可能在 onload 后继续重包 applyFilters；这里用多阶段最终所有权守卫。
    setTimeout(()=>finalize('late-finalize-3800'),3800);
    setTimeout(()=>enforceFinalOwner('late-finalize-4600'),4600);
    startOwnerGuard();
  }
  window.LN_REFRESH_CONTROLLER_V292RC={ready:true,version:VERSION,stamp:STAMP,state,note,request,finalize,getStats,captureChain,findCore};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();

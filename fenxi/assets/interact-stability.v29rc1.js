// V2.9RC.fix-interact1: drawer close refresh de-duplication and safe delayed apply.
// Boundary: do not change formulas, filters, A/B/C rules, or click semantics.
(function(){
  const VERSION='V2.9RC.fix-interact1';
  const STAMP='29rc-interact1-20260513';
  const perf=()=>window.performance&&performance.now?performance.now():Date.now();
  const opt=()=>window.LN_INTERACT_FIX_OPT!==false;
  const state={
    version:VERSION,
    stamp:STAMP,
    patched:false,
    lastAppliedFingerprint:'',
    lastOpenFingerprint:'',
    lastClose:null,
    suppressed:0,
    allowed:0,
    delayed:0,
    lastDecision:null
  };
  function dbg(name,obj){try{window.LN_DEBUG_V2983?.detail?.(name,Object.assign({version:STAMP},obj||{}));}catch(e){}}
  function flags(obj){try{window.LN_DEBUG_V2983?.setFlags?.(obj||{});}catch(e){}}
  function rt(){return window.LN_CHILD_INTEREST_RUNTIME_V296||window.LN_CHILD_INTEREST_RUNTIME_V298||window.LN_CHILD_INTEREST_RUNTIME_V2976;}
  function tr(){return window.LN_CHILD_INTENT_TRANSLATOR_V298||window.LN_CHILD_INTENT_TRANSLATOR_V2976||window.LN_CHILD_INTENT_TRANSLATOR_V2975;}
  function drawer(){return window.LN_DRAWER_V296;}
  function normArray(a,sort){
    const out=Array.isArray(a)?a.filter(x=>x!==undefined&&x!==null).map(String):[];
    return sort?[...out].sort():out;
  }
  function fingerprint(){
    let child={}, intent={};
    try{
      const s=rt()?.readState?.()||{};
      child={
        mode:String(s.mode||''),
        selectedGroups:normArray(s.selectedGroups,false),
        selectedMajors:normArray(s.selectedMajors,false),
        selectedKeywords:normArray(s.selectedKeywords,true),
        disabledAutoMappings:normArray(s.disabledAutoMappings,true),
        manualOnlyInterest:!!s.manualOnlyInterest
      };
    }catch(e){child={error:'child-read-failed'};}
    try{
      const ts=tr()?.readState?.()||{};
      intent={selectedIntentIds:normArray(ts.selectedIntentIds,false)};
    }catch(e){intent={error:'intent-read-failed'};}
    return JSON.stringify({child,intent});
  }
  function isChildInterestReason(reason){
    return /child-interest|child-intent|interest/.test(String(reason||''));
  }
  function isDrawerCloseReason(reason){
    return /drawer-close|flush-drawer-close/.test(String(reason||''));
  }
  function setLastApplied(fp,source){
    state.lastAppliedFingerprint=fp||fingerprint();
    dbg('interactLastApplied',{source:source||'',fingerprintHash:hash(state.lastAppliedFingerprint)});
  }
  function hash(s){
    s=String(s||''); let h=0;
    for(let i=0;i<s.length;i++){h=((h<<5)-h+s.charCodeAt(i))|0;}
    return String(h);
  }
  function patchDrawerClose(){
    const d=drawer();
    if(!d||d.__v29rcInteractClosePatched||typeof d.close!=='function')return false;
    const old=d.close;
    d.close=function(){
      const t=perf();
      const type=window.__LN_ACTIVE_DRAWER_TYPE||'';
      const before=fingerprint();
      const r=old.apply(this,arguments);
      const after=fingerprint();
      state.lastClose={
        at:perf(),
        type,
        beforeHash:hash(before),
        afterHash:hash(after),
        openHash:hash(state.lastOpenFingerprint),
        appliedHash:hash(state.lastAppliedFingerprint),
        changedSinceApplied:after!==state.lastAppliedFingerprint,
        changedDuringClose:before!==after,
        ms:Math.round(perf()-t)
      };
      dbg('interactDrawerClose',state.lastClose);
      return r;
    };
    d.__v29rcInteractClosePatched=true;
    return true;
  }
  function patchDrawerOpen(){
    const d=drawer();
    if(!d||d.__v29rcInteractOpenPatched||typeof d.open!=='function')return false;
    const old=d.open;
    d.open=function(){
      state.lastOpenFingerprint=fingerprint();
      dbg('interactDrawerOpen',{type:window.__LN_ACTIVE_DRAWER_TYPE||'',fingerprintHash:hash(state.lastOpenFingerprint)});
      return old.apply(this,arguments);
    };
    d.__v29rcInteractOpenPatched=true;
    return true;
  }
  function patchScheduler(){
    const sch=window.LN_REFRESH_SCHEDULER_V296;
    if(!sch||sch.__v29rcInteractPatched||typeof sch.request!=='function')return false;
    const old=sch.request.bind(sch);
    sch.request=function(raw){
      if(!opt())return old(raw);
      const req=Object.assign({},raw||{});
      const reason=String(req.reason||'');
      const fp=fingerprint();
      const close=state.lastClose;
      const recentClose=close && (perf()-Number(close.at||0)<2600);
      const childReason=isChildInterestReason(reason);
      const closeReason=isDrawerCloseReason(reason);
      const sameAsApplied=fp===state.lastAppliedFingerprint;
      if(childReason && closeReason && recentClose && sameAsApplied){
        state.suppressed++;
        state.lastDecision={reason,decision:'suppress-no-change',at:new Date().toLocaleTimeString(),suppressed:state.suppressed,fpHash:hash(fp)};
        dbg('interactRefreshDecision',state.lastDecision);
        flags({interactFix:'v29rcfix1',lastInteractDecision:'suppress-no-change',lastInteractReason:reason});
        try{window.LN_CHILD_INTEREST_UI_V296?.renderSummary?.();}catch(e){}
        return Promise.resolve({ok:true,skippedFull:true,suppressed:true,reason});
      }
      if(childReason && closeReason && recentClose && !sameAsApplied){
        const oldDelay=Number(req.delay||0);
        req.delay=Math.max(oldDelay,1100);
        state.delayed++;
        state.lastDecision={reason,decision:'delay-after-close',oldDelay,delay:req.delay,at:new Date().toLocaleTimeString(),fpHash:hash(fp),appliedHash:hash(state.lastAppliedFingerprint)};
        dbg('interactRefreshDecision',state.lastDecision);
        flags({interactFix:'v29rcfix1',lastInteractDecision:'delay-after-close',lastInteractReason:reason});
      }else if(childReason){
        state.lastDecision={reason,decision:'allow',delay:req.delay||0,at:new Date().toLocaleTimeString(),fpHash:hash(fp)};
        dbg('interactRefreshDecision',state.lastDecision);
      }
      const p=old(req);
      if(req.level!=='ui-only' && req.level!=='render-only'){
        Promise.resolve(p).then(()=>{setLastApplied(fingerprint(),'scheduler:'+reason);}).catch(()=>{});
      }
      state.allowed++;
      return p;
    };
    sch.__v29rcInteractPatched=true;
    return true;
  }
  function patchApplyMarker(){
    if(window.__LN_INTERACT_APPLY_MARKER_PATCHED)return false;
    // compute-pipeline may patch applyFilters after this file. Retry later until the final function exists.
    const fn=window.applyFilters;
    if(typeof fn!=='function'||fn.__v29rcInteractMarked)return false;
    const wrapped=function(){
      const t=perf();
      const r=fn.apply(this,arguments);
      try{setLastApplied(fingerprint(),'applyFilters');}catch(e){}
      dbg('interactApplyMarker',{ms:Math.round(perf()-t),reason:arguments[0]||'',fpHash:hash(state.lastAppliedFingerprint)});
      return r;
    };
    wrapped.__v29rcInteractMarked=true;
    wrapped.__original=fn;
    window.applyFilters=wrapped;
    window.__LN_INTERACT_APPLY_MARKER_PATCHED=true;
    return true;
  }
  function patch(){
    patchDrawerOpen();
    patchDrawerClose();
    patchScheduler();
    patchApplyMarker();
    if(!state.lastAppliedFingerprint)setLastApplied(fingerprint(),'init');
    state.patched=true;
    flags({interactFix:'v29rcfix1',interactFixOpt:opt(),interactVersion:STAMP});
    dbg('interactPatch',{drawerOpenPatched:!!drawer()?.__v29rcInteractOpenPatched,drawerClosePatched:!!drawer()?.__v29rcInteractClosePatched,schedulerPatched:!!window.LN_REFRESH_SCHEDULER_V296?.__v29rcInteractPatched,applyMarkerPatched:!!window.__LN_INTERACT_APPLY_MARKER_PATCHED,opt:opt()});
  }
  function boot(){patch(); setTimeout(patch,0); setTimeout(patch,800); setTimeout(patch,1800);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
  window.LN_INTERACT_STABILITY_V29RC1={ready:true,version:VERSION,stamp:STAMP,state,patch,fingerprint};
})();

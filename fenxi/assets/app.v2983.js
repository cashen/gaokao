// V2.9.8.3.fix12 single overlay: funnel compute, staged UI refresh and deep debug integration.
(function(){
  let rendering=false,pending=false;
  function body(){document.body?.classList?.add('v2983fix12','v2983fix7','v2983fix5','v2983fix4','v2983fix3','v2983','v2982fix4','v2982fix3','v2982fix2','v2982','v2981fix2','v2981fix1');}
  function title(){document.title='辽宁物理类高考志愿初选工具 V2.9.8.3.fix12｜分块等待与自测误报收敛修正版';}
  function unlock(){try{window.LN_SCROLL_LOCK_GUARD_V2982FIX2?.ensure?.();}catch(e){}}
  function sync(){try{window.LN_LEGACY_PREFERENCE_ADAPTER_V2982?.patchGlobals?.();window.LN_LEGACY_PREFERENCE_ADAPTER_V2982?.syncLegacyDom?.();}catch(e){}try{window.LN_INTERACTION_STABILITY_V2982?.patch?.();}catch(e){}}
  function renderLight(reason){
    if(rendering){pending=true;return false;} rendering=true;
    const t=performance.now();
    try{body();unlock();sync();
      try{window.LN_CONTEXT_SUMMARY_UI_V2981FIX1?.render?.();}catch(e){}
      try{window.LN_NOTICE_COMPACT_UI_V2981FIX2?.render?.();}catch(e){}
      try{window.LN_PROFILE_INTEREST_SUMMARY_V2981FIX2?.patchChildInterestSummary?.();}catch(e){}
      unlock();return true;
    }finally{window.LN_DEBUG_V2983?.timing?.('renderLight',performance.now()-t,{reason});setTimeout(()=>{rendering=false;if(pending){pending=false;setTimeout(()=>renderLight('coalesced'),120);}},0);}
  }
  function debounceWrap(name,after,delay){const old=window[name];if(typeof old!=='function'||old.__v2983Wrapped)return;let timer=null;const wrapped=function(){window.LN_DEBUG_V2983?.setQueue?.({lastWrapped:name,running:true,lastAt:new Date().toLocaleTimeString()});const r=old.apply(this,arguments);clearTimeout(timer);timer=setTimeout(()=>{window.LN_DEBUG_V2983?.setQueue?.({lastAfter:name,running:false,afterAt:new Date().toLocaleTimeString()});after(name);},delay||180);return r;};wrapped.__v2983Wrapped=true;wrapped.__original=old;window[name]=wrapped;}
  function patchStudentProfile(){
    const ui=window.LN_STUDENT_PROFILE_UI_V2975; if(!ui||ui.__v2983Patched)return;
    const oldOpen=ui.openDrawer;
    ui.openDrawer=function(){window.__LN_ACTIVE_DRAWER_TYPE='studentProfile'; const r=oldOpen.apply(ui,arguments); setTimeout(()=>{document.querySelectorAll('[id^="studentProfile_"]').forEach(el=>{if(el.dataset.v2983Light)return;el.dataset.v2983Light='1';el.addEventListener('change',()=>{window.LN_DEBUG_V2983?.log?.('student-profile-light-change',{id:el.id,value:el.value});setTimeout(()=>renderLight('student-profile-change'),0);},true);});},0); return r;};
    ui.__v2983Patched=true;
  }
  function patchStrategy(){
    const old=window.applyStrategy; if(typeof old!=='function'||old.__v2983Patched)return;
    const wrapped=function(type){const t=performance.now();
      // Preserve scenario preset behavior, but avoid re-running the whole filter chain here. ABC can be reorganized from current filtered pool.
      try{applyScenarioPresetV2951(type);}catch(e){try{old(type);}catch(err){}}
      const br={type}; const mark=(k,fn)=>{const tt=performance.now();try{return fn&&fn();}catch(e){br.errors=br.errors||[];br.errors.push({step:k,message:String(e&&e.message||e)});}finally{br[k]=Math.round(performance.now()-tt);}};
      mark('renderBaselineSummary',()=>renderBaselineSummaryV2950());
      mark('qualificationSummary',()=>window.LN_QUALIFICATION_GATE_UI_V296?.renderSummary?.());
      mark('profileInterestSummary',()=>window.LN_PROFILE_INTEREST_SUMMARY_V2981FIX2?.patchChildInterestSummary?.());
      mark('renderPlanABC',()=>renderPlanABC());
      mark('updateLive',()=>updateLive());
      mark('renderLight',()=>renderLight('scenario-change'));
      br.total=Math.round(performance.now()-t); try{window.LN_DEBUG_V2983?.detail?.('scenarioBreakdown',br);}catch(e){}
      window.LN_DEBUG_V2983?.timing?.('scenarioChangeLight',performance.now()-t,{type});
      return true;};
    wrapped.__v2983Patched=true;window.applyStrategy=wrapped;
  }
  function patchSchedulerPolicy(){
    try{const P=window.LN_INTERACTION_POLICY_V296?.POLICY;if(P){P['student-profile-change']={level:'render-only',delay:400};P['scenario-change']={level:'render-only',delay:250};P['child-interest-change']={level:'soft',delay:1200};P['chip-change']={level:'soft',delay:900};P['region-chip-change']={level:'soft',delay:1300};P['baseline-change']={level:'soft',delay:900};}}catch(e){}
  }
  function patch(){title();body();patchSchedulerPolicy();sync();unlock();patchStudentProfile();patchStrategy();
    debounceWrap('autoRefreshAsync',()=>renderLight('after-autoRefresh'),220);
    debounceWrap('applyFilters',()=>renderLight('after-applyFilters'),220);
    renderLight('patch');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',patch);else patch();
  setTimeout(patch,0);setTimeout(()=>renderLight('late-once'),1200);
  window.LN_APP_V2983={patch,renderLight,version:'V2.9.8.3.fix12',cacheBust:'2983fix12-20260511',ready:true};
})();

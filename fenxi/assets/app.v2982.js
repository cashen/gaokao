// V2.9.8.2.fix4 overlay: main-computation throttling and single lightweight coordinator.
(function(){
  let rendering=false;
  let pendingRender=false;
  function applyBody(){document.body?.classList?.add('v2981fix1','v2981fix2','v2982','v2982fix1','v2982fix2','v2982fix3','v2982fix4');}
  function patchTitle(){document.title='辽宁物理类高考志愿初选工具 V2.9.8.2.fix4｜主计算链路减负与兴趣匹配分片修正版';}
  function unlock(){try{window.LN_SCROLL_LOCK_GUARD_V2982FIX2?.ensure?.();}catch(e){}}
  function sync(){try{window.LN_LEGACY_PREFERENCE_ADAPTER_V2982?.patchGlobals?.();window.LN_LEGACY_PREFERENCE_ADAPTER_V2982?.syncLegacyDom?.();}catch(e){} try{window.LN_INTERACTION_STABILITY_V2982?.patch?.();}catch(e){} }
  function renderAll(reason){
    if(rendering){ pendingRender=true; return false; }
    rendering=true;
    try{
      applyBody(); unlock(); sync();
      try{window.LN_CONTEXT_SUMMARY_UI_V2981FIX1?.render?.(); const box=document.getElementById('contextSummaryFix1'); if(box)box.setAttribute('data-unified-context','v2982fix4');}catch(e){}
      try{window.LN_NOTICE_COMPACT_UI_V2981FIX2?.render?.();}catch(e){}
      try{window.LN_PROFILE_INTEREST_SUMMARY_V2981FIX2?.patchChildInterestSummary?.();}catch(e){}
      unlock();
      return true;
    }finally{
      setTimeout(()=>{rendering=false; if(pendingRender){pendingRender=false; setTimeout(()=>renderAll('coalesced'),80);}},0);
    }
  }
  function debounceAfter(name,fn){
    const old=window[name]; if(typeof old!=='function'||old.__v2982Fix4Wrapped)return;
    let t=null;
    const wrapped=function(){
      const res=old.apply(this,arguments);
      clearTimeout(t); t=setTimeout(()=>fn(name),160);
      return res;
    };
    wrapped.__v2982Fix4Wrapped=true; wrapped.__original=old; window[name]=wrapped;
  }
  function patch(){
    patchTitle(); applyBody(); unlock(); sync();
    // Keep one lightweight post-refresh coordinator only. Do not wrap renderCards/renderPlanABC/updateCounts;
    // those are hot paths inside applyFilters and repeated wrapping made input/region/interest changes freeze.
    debounceAfter('autoRefreshAsync',()=>renderAll('after-autoRefresh'));
    debounceAfter('applyFilters',()=>renderAll('after-applyFilters'));
    renderAll('patch');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',patch);else patch();
  setTimeout(patch,0);
  setTimeout(()=>renderAll('late-once'),900);
  window.LN_APP_V2982={patch,renderAll,ready:true,version:'V2.9.8.2.fix4',noGlobalMutationObserver:true,cacheBust:'2982fix4-20260511'};
})();

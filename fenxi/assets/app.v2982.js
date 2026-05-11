// V2.9.8.2.fix2 overlay: cache-bust, stop legacy redraw observers, and keep scroll stable.
(function(){
  let rendering=false;
  let lastProfileHtml='';
  function applyBody(){document.body?.classList?.add('v2981fix1','v2981fix2','v2982','v2982fix1','v2982fix2');}
  function patchTitle(){document.title='辽宁物理类高考志愿初选工具 V2.9.8.2.fix2｜缓存版本戳、重绘观察器移除与滚动稳定修正版';}
  function unlock(){try{window.LN_SCROLL_LOCK_GUARD_V2982FIX2?.ensure?.();}catch(e){}}
  function renderContextLine(){try{window.LN_CONTEXT_SUMMARY_UI_V2981FIX1?.render?.(); const box=document.getElementById('contextSummaryFix1'); if(box){box.setAttribute('data-unified-context','v2982fix2');}}catch(e){}}
  function sync(){try{window.LN_LEGACY_PREFERENCE_ADAPTER_V2982?.patchGlobals?.();window.LN_LEGACY_PREFERENCE_ADAPTER_V2982?.syncLegacyDom?.();}catch(e){} try{window.LN_INTERACTION_STABILITY_V2982?.patch?.();}catch(e){} }
  function renderAll(reason){
    if(rendering) return false;
    rendering=true;
    try{
      applyBody(); unlock();
      sync();
      renderContextLine();
      try{window.LN_NOTICE_COMPACT_UI_V2981FIX2?.render?.();}catch(e){}
      unlock();
      try{window.LN_PROFILE_INTEREST_SUMMARY_V2981FIX2?.patchChildInterestSummary?.();}catch(e){}
      return true;
    }finally{
      setTimeout(()=>{rendering=false;},0);
    }
  }
  function wrap(name,before,after){
    const fn=window[name];
    if(typeof fn!=='function'||fn.__v2982Fix2Wrapped)return;
    const wrapped=function(){
      before&&before();
      const res=fn.apply(this,arguments);
      setTimeout(()=>{after&&after(name);},0);
      return res;
    };
    wrapped.__v2982Fix2Wrapped=true; wrapped.__original=fn; window[name]=wrapped;
  }
  function patch(){
    patchTitle();applyBody(); unlock();sync();
    wrap('applyFilters',sync,renderAll);
    wrap('autoRefreshAsync',sync,renderAll);
    wrap('renderPlanABC',sync,renderAll);
    wrap('renderCards',sync,renderAll);
    wrap('updateCounts',sync,renderAll);
    renderAll('patch');
  }
  // Do NOT observe the whole page. The previous full-#app MutationObserver caused self-triggered redraws and swallowed clicks.
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',patch);else patch();
  setTimeout(patch,0);
  setTimeout(()=>renderAll('late-once'),900);
  window.LN_APP_V2982={patch,renderAll,ready:true,version:'V2.9.8.2.fix2',noGlobalMutationObserver:true,cacheBust:'2982fix2-20260511'};
})();

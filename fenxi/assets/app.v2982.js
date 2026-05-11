// V2.9.8.2 final overlay: unified context, old-rule intake cleanup, stable interaction.
(function(){
  function applyBody(){document.body?.classList?.add('v2981fix1','v2981fix2','v2982');}
  function patchTitle(){document.title='辽宁物理类高考志愿初选工具 V2.9.8.2｜统一决策上下文、兴趣抽屉稳定与旧规则收口版';}
  function renderContextLine(){try{window.LN_CONTEXT_SUMMARY_UI_V2981FIX1?.render?.(); const box=document.getElementById('contextSummaryFix1'); if(box){box.setAttribute('data-unified-context','v2982');}}catch(e){}}
  function sync(){try{window.LN_LEGACY_PREFERENCE_ADAPTER_V2982?.patchGlobals?.();window.LN_LEGACY_PREFERENCE_ADAPTER_V2982?.syncLegacyDom?.();}catch(e){} try{window.LN_INTERACTION_STABILITY_V2982?.patch?.();}catch(e){} }
  function renderAll(){applyBody();sync();renderContextLine();try{window.LN_NOTICE_COMPACT_UI_V2981FIX2?.render?.();}catch(e){} try{window.LN_PROFILE_INTEREST_SUMMARY_V2981FIX2?.patchChildInterestSummary?.();}catch(e){} }
  function wrap(name,before,after){const fn=window[name]; if(typeof fn!=='function'||fn.__v2982Wrapped)return; const wrapped=function(){before&&before(); const res=fn.apply(this,arguments); setTimeout(()=>{after&&after();},0); return res;}; wrapped.__v2982Wrapped=true; wrapped.__original=fn; window[name]=wrapped;}
  function patch(){patchTitle();applyBody();sync();wrap('applyFilters',sync,renderAll);wrap('autoRefreshAsync',sync,renderAll);wrap('renderPlanABC',sync,renderAll);wrap('renderCards',sync,renderAll);wrap('updateCounts',sync,renderAll);renderAll();}
  function observe(){if(observe.done)return;observe.done=true;const t=document.getElementById('app')||document.body;if(!t||!window.MutationObserver)return;let timer=null;new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(renderAll,120);}).observe(t,{subtree:true,childList:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{patch();observe();});else{patch();observe();}
  setTimeout(patch,0);setTimeout(renderAll,800);setTimeout(renderAll,1800);
  window.LN_APP_V2982={patch,renderAll,ready:true};
})();

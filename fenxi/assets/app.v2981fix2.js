// V2.9.8.1.fix2 final overlay: profile upfront + parent must-read + stable detail cards.
(function(){
  function applyBody(){document.body?.classList?.add('v2981fix2');}
  function hideLegacyProfileBox(){const box=document.getElementById('studentProfileBoxV2975'); if(box){box.innerHTML=''; box.setAttribute('aria-hidden','true'); box.classList.add('hide-profile-v2981fix2');}}
  function cleanDiagnostics(){document.querySelectorAll('.exclude span').forEach(sp=>{ if((sp.textContent||'').includes('画像排除')) sp.closest('.exclude')?.classList.add('hide-profile-exclude-v2981fix2'); });}
  function patchGeoDisplay(){
    if(typeof window.geoDisplayV29472==='function' && !window.geoDisplayV29472.__fix2Campus){
      const old=window.geoDisplayV29472;
      const fn=function(r){ const cp=window.LN_CAMPUS_LOCATION_RULES_V2981FIX2?.detect?.(r); return cp?.hasCampus?cp.label:old.apply(this,arguments); };
      fn.__fix2Campus=true; fn.__original=old; window.geoDisplayV29472=fn;
    }
  }
  function renderAllLight(){
    try{window.LN_STUDENT_PROFILE_NORMALIZER_V2981FIX2?.patchAll?.();}catch(e){}
    try{patchGeoDisplay();}catch(e){}
    try{window.LN_PROFILE_INTEREST_SUMMARY_V2981FIX2?.patchStudentProfileSummary?.(); window.LN_PROFILE_INTEREST_SUMMARY_V2981FIX2?.patchChildInterestSummary?.(); window.LN_CHILD_INTEREST_UI_V296?.renderSummary?.();}catch(e){}
    try{window.LN_CONTEXT_SUMMARY_UI_V2981FIX1?.render?.();}catch(e){}
    try{window.LN_NOTICE_COMPACT_UI_V2981FIX1?.render?.();}catch(e){}
    try{window.LN_NOTICE_COMPACT_UI_V2981FIX2?.render?.();}catch(e){}
    hideLegacyProfileBox(); cleanDiagnostics();
  }
  function wrap(name,after){const fn=window[name]; if(typeof fn!=='function'||fn.__fix2Wrapped)return; const wrapped=function(){const res=fn.apply(this,arguments); setTimeout(after,0); return res;}; wrapped.__fix2Wrapped=true; wrapped.__original=fn; window[name]=wrapped;}
  function patch(){
    applyBody(); hideLegacyProfileBox(); renderAllLight();
    wrap('renderCards',renderAllLight); wrap('renderPlanABC',renderAllLight); wrap('updateCounts',renderAllLight); wrap('renderStrategyCardsV2951',renderAllLight);
  }
  function observe(){observe.done=true; return false;}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>{patch();observe();}); else {patch();observe();}
  setTimeout(patch,0); setTimeout(renderAllLight,600); setTimeout(renderAllLight,1500);
  window.LN_APP_V2981FIX2={patch,renderAllLight,ready:true};
})();

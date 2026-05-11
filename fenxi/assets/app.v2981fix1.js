// V2.9.8.2.fix4: legacy fix1 overlay is disabled for performance.
// Previous version wrapped renderCards/renderPlanABC/updateCounts and installed a MutationObserver,
// which caused repeated light renders after large calculations. Keep only body marker and no-op API.
(function(){
  function patch(){try{document.body?.classList?.add('v2981fix1');}catch(e){}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',patch);else patch();
  setTimeout(patch,0);
  window.LN_APP_V2981FIX1={patch,renderAllLight:function(){return false;},ready:true,disabledBy:'v2982fix4'};
})();

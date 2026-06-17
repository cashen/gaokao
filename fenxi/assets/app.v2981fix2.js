// V2.9.8.2.fix4: legacy fix2 overlay is disabled for performance.
// The active coordination layer is app.v2982.js. This file must not wrap renderCards/renderPlanABC/updateCounts.
(function(){
  function patch(){
    try{document.body?.classList?.add('v2981fix2');}catch(e){}
    try{document.getElementById('studentProfileBoxV2975')?.classList.add('hide-profile-v2981fix2');}catch(e){}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',patch);else patch();
  setTimeout(patch,0);
  window.LN_APP_V2981FIX2={patch,renderAllLight:function(){return false;},ready:true,disabledBy:'v2982fix4'};
})();

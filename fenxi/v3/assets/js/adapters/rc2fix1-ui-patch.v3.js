(function(){
  'use strict';
  function patchText(root){
    root=root||document;
    root.querySelectorAll('#v3BottomTabs a,#v3BottomTabs button,.v3-bottom-tabs a,.v3-bottom-tabs button,.v3-progress-steps a,.v3-progress-steps button,.v3-progress-steps div').forEach(function(el){
      if(/自选/.test(el.textContent||'')){
        el.innerHTML=(el.innerHTML||'').replace(/自选/g,'候选');
        el.setAttribute('data-rc2fix1-renamed','1');
      }
    });
  }
  function boot(){
    document.body.classList.add('ln-v3-rc2-fix1');
    patchText(document);
    try{new MutationObserver(function(){patchText(document);}).observe(document.body,{childList:true,subtree:true});}catch(e){}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
  window.LN_V3_RC2FIX1_UI_PATCH={patchText:patchText,ready:true};
})();

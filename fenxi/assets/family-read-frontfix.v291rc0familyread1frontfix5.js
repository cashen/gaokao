// V2.91RC0.family-read1.frontfix5｜登录后首屏与步骤条净化版
(function(){
  var VERSION='v291rc0familyread1frontfix5';
  var STAMP='291rc0familyread1frontfix5-20260515';
  function accessReady(){var app=document.getElementById('app'); var state=document.getElementById('accessState'); var ready=!!(app&&!app.classList.contains('locked')); if(!ready&&state&&/已进入|已开启|进入工具/.test(state.textContent||''))ready=true; document.body.classList.toggle('ln-access-ready',ready);}
  function modeText(){var el=document.querySelector('.mode-switch-v2950 span'); if(el)el.textContent='先看结论和 A/B/C，诊断信息默认收起。';}
  function debug(){try{window.LN_DEBUG_V2983?.setFlags?.({familyReadFrontFix:'v291rc0familyread1frontfix5',familyReadFrontFixStamp:STAMP,loginHeaderClean:true,stepNavLight:true,detailCardWarmUnified:true,detailBrownRemoved:true,doesModifyFormula:false,doesChangeCandidatePool:false,doesChangeSorting:false});}catch(e){} }
  function apply(){document.body.classList.add('family-read-frontfix5-v291rc0'); accessReady(); modeText(); debug();}
  function boot(){apply(); try{new MutationObserver(function(){setTimeout(apply,30);}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});}catch(e){} setInterval(apply,1200);}
  window.LN_FAMILY_READ_FRONTFIX4_V291={ready:true,version:VERSION,stamp:STAMP,apply:apply};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot); else boot();
})();

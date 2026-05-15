
// V2.92RC｜启动/布局/UI 收口层：不改候选池与底层公式
(function(){
  if(window.LN_UI_CLEAN_DISABLE===true) return;
  var VERSION='V2.92RC1';
  var STAMP='292rc1-20260515';
  function ready(fn){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn);else fn();}
  function apply(){
    document.body.classList.add('stability-clean-v292rc1');
    var ca=document.getElementById('candidateArea');
    if(ca){ca.classList.add('candidate-step-v292','candidate-step-v292rc1'); ca.setAttribute('data-step-label','⑥ 详细候选与自选');}
    var cards=document.getElementById('cards');
    if(cards){cards.classList.remove('cards-wide-v292');}
    try{window.__LN_ACTIVE_UI_CLEAN__={version:VERSION,stamp:STAMP,ready:true,candidateAreaNoPseudo:true};}catch(e){}
  }
  ready(function(){apply(); setTimeout(apply,300); setTimeout(apply,1200);});
  document.addEventListener('ln:cards-rendered',apply);
  document.addEventListener('ln:abc-rendered',apply);
  try{window.LN_DEBUG_V2983&&window.LN_DEBUG_V2983.setFlags&&window.LN_DEBUG_V2983.setFlags({stabilityClean:'v292rc1',uiClean:true,activeVersion:'V2.92RC1',legacyMdLoaded:false,legacyFrontfixLoaded:false});}catch(e){}
})();

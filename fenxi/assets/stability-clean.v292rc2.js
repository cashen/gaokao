// V2.92RC2｜启动/布局/UI 收口层：不改候选池与底层公式
(function(){
  if(window.LN_UI_CLEAN_DISABLE===true) return;
  var VERSION='V2.92RC2';
  var STAMP='292rc2-20260515';
  var state={version:VERSION,stamp:STAMP,applyCount:0,candidateAreaFixed:false,exportButtonOutsideMainGrid:false};
  function ready(fn){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn);else fn();}
  function apply(){
    state.applyCount++;
    document.body.classList.add('stability-clean-v292rc1','stability-clean-v292rc2');
    var ca=document.getElementById('candidateArea');
    if(ca){ca.classList.add('candidate-step-v292','candidate-step-v292rc2'); ca.classList.remove('candidate-step-v292rc1'); ca.setAttribute('data-step-label','⑥ 详细候选与自选'); state.candidateAreaFixed=true;}
    var cards=document.getElementById('cards');
    if(cards){cards.classList.remove('cards-wide-v292');}
    var misplaced=ca?ca.querySelector(':scope > .export-md-self-v292rc1, :scope > .export-md-self-v292rc2'):null;
    if(misplaced){try{misplaced.remove();}catch(e){}}
    state.exportButtonOutsideMainGrid=!document.querySelector('#candidateArea > .export-md-self-v292rc1, #candidateArea > .export-md-self-v292rc2');
    try{window.__LN_ACTIVE_UI_CLEAN__={version:VERSION,stamp:STAMP,ready:true,candidateAreaNoPseudo:true,gridFixed:true,state:state};}catch(e){}
    try{window.LN_DEBUG_V2983?.setFlags?.({stabilityClean:'v292rc2',uiClean:true,activeVersion:VERSION,legacyMdLoaded:false,legacyFrontfixLoaded:false,candidateAreaGridFixed:true});window.LN_DEBUG_V2983?.detail?.('stabilityCleanV292RC2',state);}catch(e){}
  }
  ready(function(){apply(); setTimeout(apply,300); setTimeout(apply,1200);});
  document.addEventListener('ln:cards-rendered',apply);
  document.addEventListener('ln:abc-rendered',apply);
  window.LN_STABILITY_CLEAN_V292RC2={ready:true,version:VERSION,stamp:STAMP,state:state,apply:apply};
})();

// V2.92RC2｜渲染事件桥：只补事件与调试口径，不改候选池、公式、排序
(function(){
  if(window.LN_RENDER_EVENTS_V292RC2_DISABLE===true) return;
  var VERSION='v292rc2-render-events';
  var STAMP='292rc2-20260515';
  var state={version:VERSION,stamp:STAMP,renderCardsWrapped:false,renderPlanABCWrapped:false,cardsEvents:0,abcEvents:0,lastCardsMs:0,lastAbcMs:0};
  function perf(){return window.performance&&performance.now?performance.now():Date.now();}
  function emit(name,detail){
    try{document.dispatchEvent(new CustomEvent(name,{detail:detail||{}}));}catch(e){try{document.dispatchEvent(new Event(name));}catch(err){}}
  }
  function flags(){
    try{window.LN_DEBUG_V2983?.setFlags?.({renderEvents:'v292rc2',renderEventsVersion:VERSION,renderCardsWrapped:state.renderCardsWrapped,renderPlanABCWrapped:state.renderPlanABCWrapped});}catch(e){}
    try{window.LN_DEBUG_V2983?.detail?.('renderEvents',Object.assign({},state));}catch(e){}
  }
  function wrapFunction(name,eventName,counterKey,msKey){
    var fn=window[name];
    if(typeof fn!=='function') return false;
    if(fn.__v292rc2RenderEventWrapped) return true;
    var wrapped=function(){
      var t=perf(), ok=true, err=null, ret;
      try{return ret=fn.apply(this,arguments);}catch(e){ok=false;err=e;throw e;}finally{
        state[counterKey]=(state[counterKey]||0)+1;
        state[msKey]=Math.round(perf()-t);
        var detail={name:name,ok:ok,ms:state[msKey],count:state[counterKey],error:err?String(err&&err.message||err):'',filtered:Array.isArray(window.filtered)?window.filtered.length:undefined,stamp:STAMP};
        if(window.queueMicrotask) queueMicrotask(function(){emit(eventName,detail);flags();});
        else setTimeout(function(){emit(eventName,detail);flags();},0);
      }
    };
    try{Object.defineProperty(wrapped,'name',{value:name+'V292RC2'});}catch(e){}
    wrapped.__v292rc2RenderEventWrapped=true;
    wrapped.__original=fn;
    window[name]=wrapped;
    return true;
  }
  function patch(){
    state.renderCardsWrapped=wrapFunction('renderCards','ln:cards-rendered','cardsEvents','lastCardsMs')||state.renderCardsWrapped;
    state.renderPlanABCWrapped=wrapFunction('renderPlanABC','ln:abc-rendered','abcEvents','lastAbcMs')||state.renderPlanABCWrapped;
    flags();
  }
  patch();
  setTimeout(patch,0);
  setTimeout(patch,800);
  setTimeout(patch,1800);
  window.LN_RENDER_EVENTS_V292RC2={ready:true,version:VERSION,stamp:STAMP,state:state,patch:patch};
})();

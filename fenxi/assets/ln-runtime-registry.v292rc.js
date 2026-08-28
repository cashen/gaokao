/*
 * V2.92RC2.4.audit-data-safe-runner｜运行时最终函数来源观察器
 * 被动采样，不替换业务函数。用于 debug.html 输出 applyFilters/renderPlanABC/detailCard 的实际生效链。
 */
(function(){
  'use strict';
  const VERSION='V2.92RC2.4.audit-data-safe-runner.runtime-registry';
  const STAMP='292rc24-runtime-registry-20260521';
  const watched=['applyFilters','planScoreV29475','renderPlanABC','renderPlanABCViewOnly','LN_DETAIL_CARD_UI_V2981','LN_COMPUTE_PIPELINE_V2983','LN_DETAIL_CARD_LITE_UI_V2981'];
  const state={version:VERSION,stamp:STAMP,startedAt:new Date().toISOString(),events:[],latest:{},warnings:[]};
  function hashText(s){
    s=String(s||''); let h=2166136261;
    for(let i=0;i<s.length;i++){h^=s.charCodeAt(i); h=(h*16777619)>>>0;}
    return h.toString(16);
  }
  function summarizeFunction(fn,depth){
    if(typeof fn!=='function')return null;
    const text=Function.prototype.toString.call(fn);
    const flags={
      v2983Wrapped:!!fn.__v2983Wrapped,
      original:!!fn.__original,
      v29InteractMarked:!!fn.__v29rcInteractMarked,
      v29DedupeWrapped:!!fn.__v29rcInteractDedupeWrapped,
      lnRefreshManaged:!!fn.__lnRefreshManaged,
      lnRefreshCoreHash:fn.__lnRefreshCoreHash||'',
      capturedWrapperDepth:fn.__lnCapturedWrapperDepth||0,
      name:fn.name||'(anonymous)',
      len:fn.length,
      hash:hashText(text.slice(0,2200))
    };
    if(fn.__original && depth<8){flags.originalSummary=summarizeFunction(fn.__original,depth+1);}
    return flags;
  }
  function summarize(name){
    const value=window[name];
    const type=typeof value;
    if(type==='function') return {name,type,fn:summarizeFunction(value,0)};
    if(value && type==='object') return {name,type,keys:Object.keys(value).slice(0,30),ready:!!value.ready,version:value.version||value.stamp||''};
    return {name,type,exists:value!==undefined,value:type==='string'||type==='number'||type==='boolean'?value:undefined};
  }
  function fingerprint(summary){return hashText(JSON.stringify(summary));}
  function sample(reason){
    watched.forEach(name=>{
      const s=summarize(name); const fp=fingerprint(s); const prev=state.latest[name];
      if(!prev || prev.fp!==fp){
        state.latest[name]={fp,summary:s,at:new Date().toISOString(),reason:reason||'sample'};
        state.events.push({name,at:new Date().toISOString(),reason:reason||'sample',summary:s});
        if(state.events.length>120)state.events.shift();
      }
    });
    const af=window.applyFilters;
    if(typeof af==='function'){
      let d=0, cur=af;
      if(af.__lnRefreshManaged){
        const cap=Number(af.__lnCapturedWrapperDepth||0);
        if(cap>=4 && !state.warnings.some(w=>w.code==='applyFilters-wrapper-depth-managed')) state.warnings.push({code:'applyFilters-wrapper-depth-managed',level:'INFO',message:'历史 applyFilters wrapper 链已由 refresh-controller 后置接管。',capturedDepth:cap});
      }else{
        while(cur && typeof cur==='function' && cur.__original && d<12){d++;cur=cur.__original;}
        if(d>=4 && !state.warnings.some(w=>w.code==='applyFilters-wrapper-depth')) state.warnings.push({code:'applyFilters-wrapper-depth',level:'WARN',message:'applyFilters wrapper 层数较多，建议后续收口到 refresh-controller。',depth:d});
      }
    }
  }
  function getReport(){sample('getReport'); return JSON.parse(JSON.stringify(state));}
  window.LN_RUNTIME_REGISTRY_V292RC={ready:true,version:VERSION,stamp:STAMP,sample,getReport,summarize,summarizeFunction};
  sample('init');
  let ticks=0;
  const timer=setInterval(()=>{ticks++; sample('timer-'+ticks); if(ticks>=24)clearInterval(timer);},500);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>sample('domcontentloaded')); else sample('dom-already-ready');
  window.addEventListener('load',()=>sample('window-load'));
})();

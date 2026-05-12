(function(){
  'use strict';
  function stable(value){return JSON.stringify(value||{}, Object.keys(value||{}).sort());}
  function reviewFilter(state){return (state&&state.advancedFilter)||((state&&state.candidates||{}).advancedFilter)||{};}
  function pick(state){state=state||{};return {rank:state.rank||{},family:state.family||{},childPreference:state.childPreference||{},studentProfile:state.studentProfile||{},scenario:state.scenario||{},advancedFilter:reviewFilter(state)};}
  function hashState(state){
    var p=pick(state);
    var rank=stable(p.rank),family=stable(p.family),child=stable({childPreference:p.childPreference,studentProfile:p.studentProfile}),scenario=stable(p.scenario),advanced=stable(p.advancedFilter);
    var base=stable({rank:p.rank,family:p.family,childPreference:p.childPreference,studentProfile:p.studentProfile,scenario:p.scenario});
    var all=stable(p);
    return {rank:rank,family:family,child:child,scenario:scenario,advanced:advanced,base:base,all:all};
  }
  function compare(prev,next){
    prev=prev||{};next=next||{};var stale=[];var clearReview=false;
    if(prev.rank&&prev.rank!==next.rank){stale=['family','child','scenario','plans','candidates','exportReport','reviewChecklist'];clearReview=true;}
    else if(prev.family&&prev.family!==next.family){stale=['child','scenario','plans','candidates','exportReport','reviewChecklist'];clearReview=true;}
    else if(prev.child&&prev.child!==next.child){stale=['scenario','plans','candidates','exportReport','reviewChecklist'];clearReview=true;}
    else if(prev.scenario&&prev.scenario!==next.scenario){stale=['plans','candidates','exportReport','reviewChecklist'];clearReview=false;}
    else if(prev.advanced&&prev.advanced!==next.advanced){stale=['candidateReviewView'];clearReview=false;}
    return {staleModules:stale,needsRecompute:stale.length>0,clearReviewFilter:clearReview};
  }
  function clearReviewFilter(reason){
    if(!window.LN_V3_STORE||!window.LN_V3_ADVANCED_FILTER)return;
    var st=window.LN_V3_STORE.getState();var f=window.LN_V3_ADVANCED_FILTER.fromState(st);var keep=!!f.fullMode;var clean=window.LN_V3_ADVANCED_FILTER.clearFilter(keep);
    if(window.LN_V3_ADVANCED_FILTER.hasActiveFilter(f))window.LN_V3_STORE.setState({advancedFilter:clean,candidates:{advancedFilter:clean}},reason||'rc2fix2-clear-review-filter-by-dependency');
  }
  function storageReport(){var out=[];try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(/^LN_V3_DRAFT_/.test(k))out.push(k);}}catch(e){return {ok:false,error:String(e)};}return {ok:true,keys:out,count:out.length};}
  function patchStore(){
    if(!window.LN_V3_STORE||window.LN_V3_STORE._rc2InvalidationPatched)return;var last=hashState(window.LN_V3_STORE.getState());var clearing=false;
    window.LN_V3_STORE.subscribe(function(state,reason){var now=hashState(state);var diff=compare(last,now);last=now;if(diff.clearReviewFilter&&!clearing&&!/^rc2fix2-clear-review-filter/.test(reason||'')){clearing=true;setTimeout(function(){clearReviewFilter('rc2fix2-clear-review-filter:'+reason);clearing=false;},0);}if(diff.needsRecompute&&window.LN_V3_DEBUG_RUNTIME&&window.LN_V3_DEBUG_RUNTIME.addTrace){window.LN_V3_DEBUG_RUNTIME.addTrace('RC2.fix2状态失效',(reason||'')+' → '+diff.staleModules.join(',')+(diff.clearReviewFilter?'；已清空候选复核筛选':''));}});
    window.LN_V3_STORE._rc2InvalidationPatched=true;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',patchStore);else setTimeout(patchStore,0);
  window.LN_V3_STATE_INVALIDATION={hashState:hashState,compare:compare,storageReport:storageReport,patchStore:patchStore,clearReviewFilter:clearReviewFilter,ready:true,version:'v300rc2fix2'};
})();

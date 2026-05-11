// V2.9.8.2.fix4 interest hit summary: cached by default; heavy counts are scheduled, not inline during clicks.
(function(){
  function rows(){try{return (typeof filtered!=='undefined' && Array.isArray(filtered))?filtered:((typeof DATA!=='undefined' && Array.isArray(DATA))?DATA:[]);}catch(e){return [];}}
  function activeInterestIds(){return window.LN_CHILD_INTEREST_RUNTIME_V296?.effectiveGroupIds?.()||[];}
  function empty(){return {core:0,related:0,review:0,none:0,total:0,byInterest:[],cached:false,pending:false};}
  function cache(){window.__LN_INTEREST_HIT_CACHE_V298=window.__LN_INTEREST_HIT_CACHE_V298||{}; return window.__LN_INTEREST_HIT_CACHE_V298;}
  function countFor(interestId, rs){
    const out={core:0,related:0,review:0,none:0,total:0}; const me=window.LN_CATALOG_MATCH_ENGINE_V298;
    (rs||rows()).forEach(r=>{const m=me?.matchInterest?.(r,interestId)||{level:'none'}; out[m.level]=(out[m.level]||0)+1; out.total++;});
    cache()[interestId]=out; return out;
  }
  function aggregate(rs){
    const ids=activeInterestIds(); const total=empty(); total.cached=true;
    ids.forEach(id=>{const c=countFor(id,rs); total.core+=c.core; total.related+=c.related; total.review+=c.review; total.none+=c.none; total.total=Math.max(total.total,c.total); const rule=window.LN_CATALOG_INTEREST_BINDING_V298?.get?.(id); total.byInterest.push({interestId:id,title:rule?.title||id,count:c});});
    cache().__lastAggregate=total; return total;
  }
  function cachedAggregate(){
    const ids=activeInterestIds(); if(!ids.length)return empty(); const c=cache(); const total=empty(); total.cached=true;
    ids.forEach(id=>{const cc=c[id]; if(!cc)return; total.core+=cc.core||0; total.related+=cc.related||0; total.review+=cc.review||0; total.none+=cc.none||0; total.total=Math.max(total.total,cc.total||0); const rule=window.LN_CATALOG_INTEREST_BINDING_V298?.get?.(id); total.byInterest.push({interestId:id,title:rule?.title||id,count:cc});});
    if(!total.byInterest.length && c.__pending) total.pending=true;
    return total;
  }
  let scheduleTimer=null;
  function scheduleAggregate(rs, delay){
    const c=cache(); c.__pending=true; clearTimeout(scheduleTimer);
    scheduleTimer=setTimeout(()=>{try{aggregate(rs||rows());}catch(e){} finally{cache().__pending=false; try{window.LN_CHILD_INTEREST_UI_V296?.renderSummary?.();}catch(e){}}}, delay==null?500:delay);
  }
  function message(sum){
    sum=sum||cachedAggregate(); if(!sum.byInterest.length){return sum.pending?'真实候选命中正在计算，页面可继续操作。':'关闭兴趣抽屉或刷新结果后，系统会计算真实候选命中。';}
    const core=sum.core||0, related=sum.related||0, review=sum.review||0;
    if(core>0)return `当前真实候选命中：正主 ${core} 条｜相近 ${related} 条｜需复核 ${review} 条。`;
    if(related||review)return `当前真实候选中未命中正主方向；已保留相近 ${related} 条｜需复核 ${review} 条作为参考。`;
    return '当前真实候选中未命中该兴趣方向，系统会保留综合备选，不会生成不存在的专业。';
  }
  const api={rows,activeInterestIds,countFor,aggregate,cachedAggregate,scheduleAggregate,message,ready:true,version:'V2.9.8.2.fix4'};
  window.LN_INTEREST_HIT_SUMMARY_V298=api;
})();

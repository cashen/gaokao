// V2.9.8 interest hit summary: counts real filtered candidates by catalog match level.
(function(){
  function rows(){try{return (typeof filtered!=='undefined' && Array.isArray(filtered))?filtered:((typeof DATA!=='undefined' && Array.isArray(DATA))?DATA:[]);}catch(e){return [];}}
  function activeInterestIds(){return window.LN_CHILD_INTEREST_RUNTIME_V296?.effectiveGroupIds?.()||[];}
  function countFor(interestId, rs){const out={core:0,related:0,review:0,none:0,total:0}; const me=window.LN_CATALOG_MATCH_ENGINE_V298; (rs||rows()).forEach(r=>{const m=me?.matchInterest?.(r,interestId)||{level:'none'}; out[m.level] = (out[m.level]||0)+1; out.total++;}); return out;}
  function aggregate(rs){const ids=activeInterestIds(); const total={core:0,related:0,review:0,none:0,total:0,byInterest:[]}; ids.forEach(id=>{const c=countFor(id,rs); total.core+=c.core; total.related+=c.related; total.review+=c.review; total.none+=c.none; total.total=Math.max(total.total,c.total); const rule=window.LN_CATALOG_INTEREST_BINDING_V298?.get?.(id); total.byInterest.push({interestId:id,title:rule?.title||id,count:c});}); return total;}
  function message(sum){sum=sum||aggregate(); if(!sum.byInterest.length)return '未激活兴趣方向。'; const core=sum.core||0, related=sum.related||0, review=sum.review||0; if(core>0)return `当前真实候选命中：正主 ${core} 条｜相近 ${related} 条｜需复核 ${review} 条。`; if(related||review)return `当前真实候选中未命中正主方向；已保留相近 ${related} 条｜需复核 ${review} 条作为参考。`; return '当前真实候选中未命中该兴趣方向，系统会保留综合备选，不会生成不存在的专业。';}
  const api={rows,activeInterestIds,countFor,aggregate,message,ready:true};
  window.LN_INTEREST_HIT_SUMMARY_V298=api;
})();

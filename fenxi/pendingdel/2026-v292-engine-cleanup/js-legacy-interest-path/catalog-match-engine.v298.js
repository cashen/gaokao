// V2.9.8 catalog match engine: interest rule -> real candidate, with evidence.
(function(){
  const LEVEL_ORDER={core:4,related:3,review:2,none:1};
  function N(){return window.LN_CANDIDATE_CATALOG_NORMALIZER_V298;}
  function B(){return window.LN_CATALOG_INTEREST_BINDING_V298;}
  function includes(arr,v){v=String(v||''); return (arr||[]).map(String).includes(v);}
  function textHit(arr, text){const n=N().normText(text||''); return (arr||[]).find(x=>n.includes(N().normText(x)))||'';}
  function evidence(source, code, standardName, c, confidence){return {source,code:code||'',standardName:standardName||'',enrollmentName:c.enrollmentName||'',catalogMajorCode:c.majorCode||'',catalogMajorName:c.standardName||'',catalogCategoryCode:c.categoryCode||'',catalogCategoryName:c.categoryName||'',confidence:confidence||'medium'};}
  function matchLevel(c, rule, level){
    const part=rule?.[level]||{};
    if(c.majorCode && includes(part.majorCodes,c.majorCode)) return {level,source:'majorCode',hit:c.majorCode,evidence:evidence('majorCode',c.majorCode,c.standardName,c,'high')};
    if(c.categoryCode && includes(part.categoryCodes,c.categoryCode)) return {level,source:'categoryCode',hit:c.categoryCode,evidence:evidence('categoryCode',c.categoryCode,c.categoryName||c.standardName,c,'high')};
    if(c.disciplineCode && includes(part.disciplineCodes,c.disciplineCode)) return {level,source:'disciplineCode',hit:c.disciplineCode,evidence:evidence('disciplineCode',c.disciplineCode,c.disciplineName,c,'medium')};
    const hn=textHit(part.majorNames,c.standardName); if(hn) return {level,source:'standardName',hit:hn,evidence:evidence('standardName','',hn,c,'high')};
    const hc=textHit(part.categoryNames,c.categoryName); if(hc) return {level,source:'categoryName',hit:hc,evidence:evidence('categoryName','',hc,c,'high')};
    return null;
  }
  function keywordReview(c, rule){
    const pools=[];
    ['core','related','review'].forEach(l=>{const p=rule?.[l]||{}; pools.push(...(p.majorNames||[]),...(p.categoryNames||[]));});
    const hit=textHit(pools,c.enrollmentName||c.text); if(!hit)return null;
    return {level:'review',source:'keyword',hit,evidence:evidence('keyword','',hit,c,'low'),keywordOnly:true};
  }
  function matchInterest(record, interestId){
    const rule=B()?.get?.(interestId); const c=N()?.normalize?.(record)||{};
    if(!rule||!N()) return {active:false,level:'none',label:'综合备选',interestId,evidence:null,hardExclude:false};
    const m=matchLevel(c,rule,'core')||matchLevel(c,rule,'related')||matchLevel(c,rule,'review')||keywordReview(c,rule);
    if(!m) return {active:true,level:'none',label:'综合备选',interestId,interest:rule,catalog:c,evidence:null,message:'未直接命中该兴趣方向。',hardExclude:false};
    const labels={core:'正主匹配',related:'相近方向',review:'需复核方向'};
    let msg='';
    if(m.level==='core') msg=`该候选按本科目录命中「${rule.title}」正主方向。`;
    else if(m.level==='related') msg=`该候选属于「${rule.title}」相近方向，不等同于正主专业。`;
    else msg=`该候选与「${rule.title}」相关，但匹配依据较弱或路径需复核。`;
    if(m.source==='keyword') msg=`仅按招生名称关键词命中「${m.hit}」，不能视为正主，建议复核本科目录和培养方案。`;
    return {active:true,level:m.level,label:labels[m.level]||'综合备选',interestId,interest:rule,catalog:c,evidence:m.evidence,source:m.source,hit:m.hit,message:msg,hardExclude:false};
  }
  function best(matches){return (matches||[]).slice().sort((a,b)=>(LEVEL_ORDER[b.level]||0)-(LEVEL_ORDER[a.level]||0))[0]||{level:'none',label:'综合备选'};}
  function matchRecord(record, interestIds){const matches=(interestIds||[]).map(id=>matchInterest(record,id)).filter(Boolean); const b=best(matches); return Object.assign({active:(interestIds||[]).length>0,matches,best:b},b);}
  function sample(){
    const rows=[
      {major:'动物医学',officialMajorCode:'090401',officialCategoryCode:'0904',officialMajorName:'动物医学'},
      {major:'生物工程',officialMajorCode:'083001',officialCategoryCode:'0830',officialMajorName:'生物工程'},
      {major:'动物科学',officialMajorCode:'090301',officialCategoryCode:'0903',officialMajorName:'动物科学'},
      {major:'电气工程及其自动化',officialMajorCode:'080601',officialCategoryCode:'0806',officialMajorName:'电气工程及其自动化'}
    ];
    return rows.map(r=>({major:r.major,match:matchInterest(r,'animal_life_science')}));
  }
  const api={matchInterest,matchRecord,best,sample,ready:true};
  window.LN_CATALOG_MATCH_ENGINE_V298=api;
  window.LN_INTEREST_MATCH_ENGINE_V298=api;
})();

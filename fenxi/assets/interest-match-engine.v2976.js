// V2.9.7.6 interest match engine: candidate -> core / related / review / none.
(function(){
  function norm(v){return String(v??'').replace(/[\s（）()【】\[\]·•,，;；:：/\\|-]/g,'').toLowerCase();}
  function textOf(r){
    return [r?.majorText,r?.major,r?.cleanMajor,r?.officialMajorName,r?.mainMajorV29475,r?.undergradMajorName,r?.undergradCategoryName,r?.officialCategoryCode,r?.officialMajorCode,r?.gradAcademicText,r?.gradProfessionalText,r?.subjectGroup,r?.primaryDisciplineNames].filter(Boolean).join(' ');
  }
  function hit(list,text){const raw=String(text||''); const n=norm(text); return (list||[]).find(k=>{if(!k)return false; const s=String(k); return raw.includes(s) || n.includes(norm(s));})||'';}
  function matchGroup(r,g){
    const t=textOf(r);
    let h=hit(g?.match?.core,t); if(h) return {active:true,level:'core',label:'正主匹配',hit:h,interest:g,score:56};
    h=hit(g?.match?.related,t); if(h) return {active:true,level:'related',label:'相近方向',hit:h,interest:g,score:34};
    h=hit(g?.match?.review,t); if(h) return {active:true,level:'review',label:'需复核方向',hit:h,interest:g,score:16};
    return {active:true,level:'none',label:'综合备选',hit:'',interest:g,score:0};
  }
  function best(matches){const order={core:4,related:3,review:2,none:1,no:0}; return (matches||[]).slice().sort((a,b)=>(order[b.level]-order[a.level])||(b.score-a.score))[0]||{active:false,level:'none',label:'综合备选',score:0};}
  function matchRecord(r,interestIds){const tax=window.LN_INTEREST_TAXONOMY_V2976||window.LN_CHILD_INTEREST_RULES_V296; const groups=(interestIds||[]).map(id=>tax?.groupById?.(id)||(tax?.groups||[]).find(g=>g.id===id)).filter(Boolean); if(!groups.length)return {active:false,level:'none',label:'综合推荐',matches:[],best:null}; const matches=groups.map(g=>matchGroup(r,g)); const b=best(matches); return Object.assign({matches,best:b},b,{active:true});}
  const api={norm,textOf,matchGroup,matchRecord,best,ready:true};
  window.LN_INTEREST_MATCH_ENGINE_V2976=api;
})();

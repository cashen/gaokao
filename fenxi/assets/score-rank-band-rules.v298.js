// V2.9.8 score/rank band rules: explanation emphasis only.
(function(){
  const bands=[
    {id:'625_plus',minScore:625,maxScore:999,message:'这个分段不宜过早只谈稳定，应同时比较学校平台、专业上限和城市资源。',tags:['平台上限','城市资源','读研机会']},
    {id:'590_624',minScore:590,maxScore:624,message:'这个分段学校层级和专业路径会明显拉扯，建议重点看专业是否真正理解。',tags:['层级取舍','专业路径','城市资源']},
    {id:'550_589',minScore:550,maxScore:589,message:'这个分段适合重点比较公办底线、专业可读性和路径清楚度。',tags:['公办底线','路径清楚','工科替代']},
    {id:'500_549',minScore:500,maxScore:549,message:'这个分段建议先守住家庭底线，再比较专业路径。',tags:['家庭底线','本科就业','名称复核']},
    {id:'450_499',minScore:450,maxScore:499,message:'这个分段防误入比追热门更重要。',tags:['防误入','高收费复核','名称复核']},
    {id:'367_449',minScore:367,maxScore:449,message:'这个分段建议先确认本科资格、家庭成本和后续可转化路径。',tags:['本科资格','家庭成本','后续路径']}
  ];
  function score(){const explicit=Number(document.getElementById('myScore')?.value||0)||null; if(explicit) return explicit; try{const resolved=typeof currentScoreV2954Fix2==='function'?currentScoreV2954Fix2():null; return Number(resolved)||null;}catch(e){return null;}}
  function rank(){try{return (typeof resolveRank==='function'?resolveRank():null)||null;}catch(e){return null;}}
  function current(){const s=score(); const b=bands.find(x=>s!==null&&s>=x.minScore&&s<=x.maxScore)||null; return b?Object.assign({source:s?'score':'unknown',rank:rank(),score:s,hardExclude:false},b):{id:'unknown',message:'输入分数或位次后，系统会补充对应分段的解释重点。',tags:[],source:'unknown',hardExclude:false};}
  const api={bands,current,ready:true}; window.LN_SCORE_RANK_BAND_RULES_V2976=api; window.LN_SCORE_RANK_BAND_RULES_V2975=api;
  window.LN_SCORE_RANK_BAND_RULES_V298=api;
})();

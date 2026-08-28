// V2.9.8.1 detail candidate card model: lightweight decision summary for bottom list.
(function(){
  function build(record){ return window.LN_ABC_DECISION_CARD_MODEL_V2981?.build?.(record,'D',0); }
  function primaryLine(decision){
    if(!decision) return '建议复核招生章程、专业代码、学费和校区。';
    return decision.tradeoff?.review || '建议复核招生章程、专业代码、学费和校区。';
  }
  window.LN_DETAIL_CANDIDATE_CARD_MODEL_V2981={build,primaryLine,ready:true};
})();

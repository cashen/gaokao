// V2.9.8.1.fix2 reminder dedupe: one default parent must-read, secondary in expandable sections.
(function(){
  function choose(decision){
    const record=decision?.record||{};
    const pmr=window.LN_PARENT_MUST_READ_RULES_V2981FIX2?.build?.(record,decision)||{};
    const seen=new Set();
    const secondary=[];
    (decision?.tags||[]).forEach(t=>{const d=t.detail||''; if(d&&!seen.has(d)){seen.add(d);secondary.push({label:t.label,detail:d,type:t.type});}});
    return {primary:pmr.text||decision?.tradeoff?.review||'建议复核招生章程、专业代码、学费和校区。',type:pmr.type||'general',priority:pmr.priority||0,secondary};
  }
  window.LN_DECISION_REMINDER_DEDUPE_V2981FIX2={choose,ready:true};
  window.LN_DECISION_REMINDER_DEDUPE_V2981FIX1=window.LN_DECISION_REMINDER_DEDUPE_V2981FIX2;
})();

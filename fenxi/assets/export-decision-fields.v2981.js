// V2.9.8.1 export decision fields: append decision evidence without recalculating in export UI.
(function(){
  function text(v){ return String(v??'').replace(/\s+/g,' ').trim(); }
  function fields(record){
    const d=window.LN_ABC_DECISION_CARD_MODEL_V2981?.build?.(record,'D',0)||{};
    return {
      safety:d.safety?.label||'', evidence2025:d.evidence?.y2025||'', evidence2024:d.evidence?.y2024||'', evidenceTrend:d.evidence?.trend||'',
      interestLevel:d.interest?.label||d.interest?.level||'', profileSummary:d.profile?.summary||'',
      decisionTags:(d.tags||[]).map(t=>t.label).join('|'), gain:text(d.tradeoff?.gain), accept:text(d.tradeoff?.accept), review:text(d.tradeoff?.review)
    };
  }
  window.LN_EXPORT_DECISION_FIELDS_V2981={fields,ready:true};
})();

// V2.9.8.1.fix2 export decision fields: includes parent must-read and cleaned profile/interest context.
(function(){
  function text(v){ return String(v??'').replace(/\s+/g,' ').trim(); }
  function fields(record){
    const d=window.LN_ABC_DECISION_CARD_MODEL_V2981?.build?.(record,'D',0)||{};
    const pmr=window.LN_PARENT_MUST_READ_RULES_V2981FIX2?.build?.(record,d)||{};
    const summary=window.LN_PROFILE_INTEREST_SUMMARY_V2981FIX2?.build?.()||{};
    const campus=window.LN_CAMPUS_LOCATION_RULES_V2981FIX2?.detect?.(record)||{};
    return {
      safety:d.safety?.label||'', evidence2025:d.evidence?.y2025||'', evidence2024:d.evidence?.y2024||'', evidenceTrend:d.evidence?.trend||'',
      interestLevel:d.interest?.label||d.interest?.level||'', profileSummary:d.profile?.summary||summary.profileLine||'', translatedInterest:summary.translatedLine||'', hitLine:summary.hitLine||'', parentMustRead:text(pmr.text||''), campusWarning:campus.warning||'',
      decisionTags:(d.tags||[]).map(t=>t.label).join('|'), gain:text(d.tradeoff?.gain), accept:text(d.tradeoff?.accept), review:text(d.tradeoff?.review)
    };
  }
  window.LN_EXPORT_DECISION_FIELDS_V2981={fields,ready:true};
  window.LN_EXPORT_DECISION_FIELDS_V2981FIX2={fields,ready:true};
})();

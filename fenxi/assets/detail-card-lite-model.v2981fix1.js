// V2.9.8.1.fix1 light detail candidate model.
(function(){
  function build(record){
    const d=window.LN_DETAIL_CANDIDATE_CARD_MODEL_V2981?.build?.(record) || window.LN_ABC_DECISION_CARD_MODEL_V2981?.build?.(record,'D',0) || {};
    const rem=window.LN_DECISION_REMINDER_DEDUPE_V2981FIX1?.choose?.(d)||{};
    const e=d.evidence||{}; const s=d.safety||{}; const t=d.tradeoff||{};
    const tags=(d.tags||[]).slice(0,4);
    const moreCount=Math.max(0,(d.tags||[]).length-tags.length);
    const mainJudgement=[t.gain, t.accept, rem.primary].filter(Boolean).slice(0,3).join('；');
    return {id:d.id||record?.id,title:`${record?.school||''}｜${record?.major||''}`,tags,allTags:d.tags||[],moreCount,evidenceLine:`${e.y2025||'2025：待核验'}｜${s.text||'录取安全仅作初筛参考'}`,mainJudgement:mainJudgement||'建议结合专业代码、招生章程、学费和校区复核。',sections:{evidence:`${e.y2025||'2025：待核验'}；${e.y2024||'2024：暂无可比记录'}；${e.trend||'两年变化待核验'}。${e.note||''}`,major:rem.primary||'建议复核专业代码、培养方案和招生备注。',tradeoff:`换来的价值：${t.gain||'符合当前筛选条件。'}\n需要接受：${t.accept||'仍需结合学校、城市、学费和培养方案复核。'}\n填报前复核：${t.review||rem.primary||'招生章程、专业代码、学费和校区。'}`}};
  }
  window.LN_DETAIL_CARD_LITE_MODEL_V2981FIX1={build,ready:true};
})();

// V2.9.8.1 detail card UI snippets: decision tag bar + short tradeoff.
(function(){
  function esc(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));}
  function cardIntroHtml(record){
    const d=window.LN_DETAIL_CANDIDATE_CARD_MODEL_V2981?.build?.(record); if(!d) return '';
    const tagHtml=window.LN_CANDIDATE_TAG_UI_V2981?.render?.(d.tags,{id:'detail_'+esc(d.id),max:5})||'';
    const e=d.evidence||{};
    return `<div class="detail-decision-v2981">
      ${tagHtml}
      <div class="detail-evidence-v2981"><span>${esc(e.y2025||'2025：待核验')}</span><span>${esc(e.trend||'两年变化待核验')}</span></div>
      <div class="detail-tradeoff-v2981"><p><b>换来的价值：</b>${esc(d.tradeoff?.gain||'符合当前筛选条件，可进入第一轮复核。')}</p><p><b>需要接受：</b>${esc(d.tradeoff?.accept||'仍需结合学校、城市、学费和培养方案复核。')}</p></div>
      <div class="detail-primary-review-v2981"><b>本卡最该复核：</b>${esc(d.tradeoff?.review||'招生章程、专业代码、学费和校区。')}</div>
    </div>`;
  }
  window.LN_DETAIL_CARD_UI_V2981={cardIntroHtml,ready:true};
})();

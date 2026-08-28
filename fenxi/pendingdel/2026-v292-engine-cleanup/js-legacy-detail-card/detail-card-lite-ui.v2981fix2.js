// V2.9.8.1.fix2 detail UI: restores short parent must-read and fixes evidence wrapping.
(function(){
  function esc(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));}
  function panelHtml(id){return `<div class="detail-lite-panel-v2981fix1 detail-lite-panel-v2981fix2" data-lite-panel="${esc(id)}" hidden></div>`;}
  function cardIntroHtml(record){
    const lite=window.LN_DETAIL_CARD_LITE_MODEL_V2981FIX2?.build?.(record); if(!lite) return '';
    const tagHtml=window.LN_CANDIDATE_TAG_UI_V2981?.render?.(lite.allTags||lite.tags,{id:'detail_'+esc(lite.id),max:4})||'';
    const sections=Object.assign({},lite.sections||{});
    if(lite.campus?.warning) sections.campus=lite.campus.warning;
    return `<div class="detail-decision-v2981 detail-lite-v2981fix1 detail-lite-v2981fix2" data-lite-card="${esc(lite.id)}" data-lite-sections="${encodeURIComponent(JSON.stringify(sections))}">
      ${tagHtml}
      <div class="detail-evidence-v2981 detail-evidence-v2981fix2"><span>${esc(lite.evidenceLines.y2025)}</span><span>${esc(lite.evidenceLines.safety)}</span></div>
      <div class="parent-must-read-v2981fix2"><b>家长必读：</b><span>${esc(lite.parentMustRead)}</span></div>
      <div class="detail-lite-actions-v2981fix1 detail-lite-actions-v2981fix2"><button type="button" data-lite-section="evidence" data-lite-id="${esc(lite.id)}">展开证据</button><button type="button" data-lite-section="major" data-lite-id="${esc(lite.id)}">展开专业解释</button><button type="button" data-lite-section="tradeoff" data-lite-id="${esc(lite.id)}">展开取舍</button>${lite.campus?.warning?`<button type="button" data-lite-section="campus" data-lite-id="${esc(lite.id)}">校区复核</button>`:''}</div>
      ${panelHtml(lite.id)}
    </div>`;
  }
  function bind(){
    if(bind.bound)return; bind.bound=true;
    document.addEventListener('click',e=>{
      const btn=e.target.closest('[data-lite-section]'); if(!btn) return;
      const card=btn.closest('[data-lite-card]'); if(!card) return;
      e.preventDefault(); e.stopPropagation();
      const box=card.querySelector('[data-lite-panel]'); if(!box)return;
      let sections={}; try{sections=JSON.parse(decodeURIComponent(card.getAttribute('data-lite-sections')||'%7B%7D'));}catch(err){}
      const key=btn.dataset.liteSection; const same=box.dataset.active===key&&!box.hidden;
      card.querySelectorAll('[data-lite-section]').forEach(b=>b.classList.toggle('active',b===btn&&!same));
      if(same){box.hidden=true;box.dataset.active='';return;}
      box.dataset.active=key; box.hidden=false; box.textContent=sections[key]||'';
    });
  }
  bind();
  const api={cardIntroHtml,ready:true};
  window.LN_DETAIL_CARD_UI_V2981=api;
  window.LN_DETAIL_CARD_LITE_UI_V2981FIX2=api;
  window.LN_DETAIL_CARD_LITE_UI_V2981FIX1=api;
})();

// V2.9.8.1 candidate tag UI: clickable short tags with one open explanation per card.
(function(){
  function esc(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));}
  function enc(v){try{return encodeURIComponent(String(v??''));}catch(e){return '';}}
  function render(tags, opts){
    const max=opts?.max||5; const id=opts?.id||('tag_'+Math.random().toString(36).slice(2));
    const parts=window.LN_CANDIDATE_DECISION_TAGS_V2981?.visible?.(tags,max)||{shown:tags||[],hidden:[]};
    const shown=parts.shown.map((t,i)=>`<button type="button" class="decision-tag-v2981 tag-${esc(t.type)} tone-${esc(t.tone||'soft')}" data-ln-tag-toggle="${esc(id)}" data-tag-label="${esc(t.label)}" data-tag-detail="${enc(t.detail)}">${esc(t.label)}</button>`).join('');
    const hidden=parts.hidden||[];
    const more=hidden.length?`<button type="button" class="decision-tag-v2981 tag-more" data-ln-tag-toggle="${esc(id)}" data-tag-label="更多提醒" data-tag-detail="${enc(hidden.map(t=>`${t.label}：${t.detail}`).join('\n'))}">+${hidden.length}</button>`:'';
    return `<div class="decision-tags-v2981" data-tag-host="${esc(id)}">${shown}${more}</div><div class="decision-tag-detail-v2981" data-tag-detail-box="${esc(id)}" hidden></div>`;
  }
  document.addEventListener('click',function(ev){
    const btn=ev.target.closest('[data-ln-tag-toggle]'); if(!btn) return;
    ev.preventDefault(); ev.stopPropagation();
    const id=btn.getAttribute('data-ln-tag-toggle');
    const card=btn.closest('.card,.plan-decision-card-v2981,.plan-primary-v2950,.plan-mini-v2950') || document;
    let box=null; const boxes=[...card.querySelectorAll('[data-tag-detail-box]')]; box=boxes.find(x=>x.getAttribute('data-tag-detail-box')===id) || [...document.querySelectorAll('[data-tag-detail-box]')].find(x=>x.getAttribute('data-tag-detail-box')===id);
    if(!box) return;
    const openLabel=box.getAttribute('data-open-label')||'';
    const label=btn.getAttribute('data-tag-label')||'';
    if(!box.hidden && openLabel===label){ box.hidden=true; box.innerHTML=''; box.removeAttribute('data-open-label'); return; }
    const detail=decodeURIComponent(btn.getAttribute('data-tag-detail')||'');
    box.hidden=false; box.setAttribute('data-open-label',label);
    box.innerHTML=`<b>你点了：${label.replace(/[&<>"']/g,'')}</b><p>${detail.replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])).replace(/\n/g,'<br>')}</p>`;
  });
  window.LN_CANDIDATE_TAG_UI_V2981={render,ready:true};
})();

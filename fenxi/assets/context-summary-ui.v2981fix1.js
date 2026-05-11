// V2.9.8.1.fix1 context summary UI: replaces standalone高级规则.
(function(){
  function esc(v){return window.LN_SELECTION_CONTEXT_SUMMARY_V2981FIX1?.esc?.(v)||String(v??'');}
  function ensure(){
    let box=document.getElementById('selectionContextSummaryV2981Fix1');
    if(box) return box;
    const result=document.getElementById('resultBox');
    if(!result) return null;
    box=document.createElement('div');
    box.id='selectionContextSummaryV2981Fix1';
    box.className='context-summary-v2981fix1';
    const anchor=document.getElementById('rankSummary');
    if(anchor) result.insertBefore(box, anchor); else result.prepend(box);
    return box;
  }
  function render(){
    const box=ensure(); if(!box) return;
    const items=window.LN_SELECTION_CONTEXT_SUMMARY_V2981FIX1?.build?.()||[];
    box.innerHTML=`<div><b>当前口径</b><div class="context-tags-v2981fix1">${items.map((x,i)=>`<button type="button" class="context-chip-v2981fix1" data-context-idx="${i}">${esc(x.label)}</button>`).join('')}</div></div><div class="context-detail-v2981fix1" data-context-detail hidden></div>`;
  }
  function bind(){
    document.addEventListener('click',e=>{
      const btn=e.target.closest('[data-context-idx]'); if(!btn) return;
      const host=btn.closest('#selectionContextSummaryV2981Fix1'); if(!host) return;
      const items=window.LN_SELECTION_CONTEXT_SUMMARY_V2981FIX1?.build?.()||[];
      const item=items[Number(btn.dataset.contextIdx)||0];
      const detail=host.querySelector('[data-context-detail]'); if(!detail||!item) return;
      const same=detail.dataset.active===String(btn.dataset.contextIdx)&&!detail.hidden;
      if(same){detail.hidden=true;detail.dataset.active='';return;}
      detail.dataset.active=String(btn.dataset.contextIdx);
      detail.hidden=false;
      detail.innerHTML=`<b>${esc(item.label)}</b>：${esc(item.detail)}`;
    });
  }
  bind();
  window.LN_CONTEXT_SUMMARY_UI_V2981FIX1={render,ready:true};
})();

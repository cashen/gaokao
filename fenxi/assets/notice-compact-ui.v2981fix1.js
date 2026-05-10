// V2.9.8.1.fix1 compact notices UI.
(function(){
  function esc(v){return window.LN_NOTICE_COMPACT_RULES_V2981FIX1?.esc?.(v)||String(v??'');}
  function ensure(){
    let box=document.getElementById('compactNoticesV2981Fix1');
    if(box) return box;
    const rs=document.getElementById('rankSummary');
    if(!rs||!rs.parentElement) return null;
    box=document.createElement('div');
    box.id='compactNoticesV2981Fix1';
    box.className='compact-notices-v2981fix1';
    rs.insertAdjacentElement('afterend', box);
    return box;
  }
  function render(){
    const box=ensure(); if(!box) return;
    const d=window.LN_NOTICE_COMPACT_RULES_V2981FIX1?.build?.(); if(!d) return;
    box.innerHTML=`<div class="compact-line-v2981fix1"><b>${esc(d.qualificationLine)}</b><button type="button" data-compact-detail="qualification">说明</button></div><div class="compact-line-v2981fix1"><span>${esc(d.rankBandLine)}</span><button type="button" data-compact-detail="rank">查看解释</button></div><div class="compact-line-v2981fix1"><span>${esc(d.advisorLine)}</span><button type="button" data-compact-detail="advisor">展开诊断说明</button></div><div class="compact-detail-v2981fix1" data-compact-detail-box hidden></div>`;
  }
  function bind(){
    document.addEventListener('click',e=>{
      const btn=e.target.closest('[data-compact-detail]'); if(!btn) return;
      const host=btn.closest('#compactNoticesV2981Fix1'); if(!host) return;
      const d=window.LN_NOTICE_COMPACT_RULES_V2981FIX1?.build?.(); if(!d) return;
      const key=btn.dataset.compactDetail; const box=host.querySelector('[data-compact-detail-box]'); if(!box) return;
      const same=box.dataset.active===key&&!box.hidden;
      if(same){box.hidden=true;box.dataset.active='';return;}
      box.dataset.active=key; box.hidden=false;
      box.textContent=d.details[key]||'';
    });
  }
  bind();
  window.LN_NOTICE_COMPACT_UI_V2981FIX1={render,ready:true};
})();

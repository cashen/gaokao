// V2.9.8.1.fix1 compact notices UI.
// Hotfix: keep expanded detail open after lightweight re-render.
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
  function restoreDetail(host, detailData, activeKey, wasOpen){
    const detailBox=host.querySelector('[data-compact-detail-box]');
    if(!detailBox) return;
    const buttons=host.querySelectorAll('[data-compact-detail]');
    buttons.forEach(b=>b.setAttribute('aria-expanded','false'));
    if(activeKey&&wasOpen){
      detailBox.dataset.active=activeKey;
      detailBox.hidden=false;
      detailBox.textContent=detailData?.[activeKey]||'';
      const activeBtn=host.querySelector(`[data-compact-detail="${activeKey}"]`);
      activeBtn?.setAttribute('aria-expanded','true');
    }else{
      detailBox.dataset.active='';
      detailBox.hidden=true;
      detailBox.textContent='';
    }
  }
  function render(){
    const box=ensure(); if(!box) return;
    const d=window.LN_NOTICE_COMPACT_RULES_V2981FIX1?.build?.(); if(!d) return;
    const oldDetail=box.querySelector('[data-compact-detail-box]');
    const activeKey=oldDetail?.dataset?.active||'';
    const wasOpen=!!(activeKey&&oldDetail&&!oldDetail.hidden);
    box.innerHTML=`<div class="compact-line-v2981fix1"><b>${esc(d.qualificationLine)}</b><button type="button" data-compact-detail="qualification" aria-expanded="false">说明</button></div><div class="compact-line-v2981fix1"><span>${esc(d.rankBandLine)}</span><button type="button" data-compact-detail="rank" aria-expanded="false">查看解释</button></div><div class="compact-line-v2981fix1"><span>${esc(d.advisorLine)}</span><button type="button" data-compact-detail="advisor" aria-expanded="false">展开诊断说明</button></div><div class="compact-detail-v2981fix1" data-compact-detail-box hidden></div>`;
    restoreDetail(box,d.details,activeKey,wasOpen);
  }
  function bind(){
    document.addEventListener('click',e=>{
      const btn=e.target.closest('[data-compact-detail]'); if(!btn) return;
      const host=btn.closest('#compactNoticesV2981Fix1'); if(!host) return;
      const d=window.LN_NOTICE_COMPACT_RULES_V2981FIX1?.build?.(); if(!d) return;
      const key=btn.dataset.compactDetail; const box=host.querySelector('[data-compact-detail-box]'); if(!box) return;
      const same=box.dataset.active===key&&!box.hidden;
      host.querySelectorAll('[data-compact-detail]').forEach(b=>b.setAttribute('aria-expanded','false'));
      if(same){box.hidden=true;box.dataset.active='';box.textContent='';return;}
      box.dataset.active=key; box.hidden=false;
      box.textContent=d.details[key]||'';
      btn.setAttribute('aria-expanded','true');
    });
  }
  bind();
  window.LN_NOTICE_COMPACT_UI_V2981FIX1={render,ready:true};
})();

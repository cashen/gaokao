// V2.9.8.1.fix2 compact notice UI: preserve expanded details across light re-render.
(function(){
  const openKeys=new Set();
  function esc(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));}
  function lineHtml(key,label,detail){const open=openKeys.has(key); return `<div class="compact-notice-item-v2981fix1" data-compact-key="${esc(key)}"><button type="button" data-compact-toggle="${esc(key)}">${esc(label)}｜${open?'收起':'展开说明'}</button><div class="compact-notice-detail-v2981fix1" ${open?'':'hidden'}>${esc(detail||'')}</div></div>`;}
  function render(){
    const target=document.getElementById('rankSummary'); if(!target) return;
    // Let fix1 build the text first if available, then append persistent detail controls only once.
    try{ window.LN_NOTICE_COMPACT_RULES_V2981FIX1?.render?.(); }catch(e){}
    let box=document.getElementById('compactNoticeFix2');
    if(!box){ box=document.createElement('div'); box.id='compactNoticeFix2'; box.className='compact-notice-v2981fix2'; target.insertAdjacentElement('afterend',box); }
    const q='高校专项、预科/民族班、定向培养等不是普通考生“分够就能报”的入口，未确认资格前默认隐藏。';
    const band='可冲、匹配、稳妥、保底只是位次带宽，不代表保证录取；最终仍要结合当年招生计划和实际投档。';
    const diag='诊断数字只解释筛选口径，主判断仍以 A/B/C 方案和详细候选卡为准。';
    box.innerHTML=lineHtml('qualification','资格入口说明',q)+lineHtml('rankband','位次带宽解释',band)+lineHtml('advisor','高报师诊断说明',diag);
  }
  function bind(){ if(bind.done)return; bind.done=true; document.addEventListener('click',e=>{ const btn=e.target.closest('[data-compact-toggle]'); if(!btn)return; const k=btn.dataset.compactToggle; if(openKeys.has(k)) openKeys.delete(k); else openKeys.add(k); render(); }); }
  bind(); setTimeout(render,0);
  window.LN_NOTICE_COMPACT_UI_V2981FIX2={render,openKeys,ready:true};
})();

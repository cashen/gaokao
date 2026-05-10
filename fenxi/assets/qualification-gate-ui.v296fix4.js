// V2.9.6.fix4 qualification gate UI: compact summary + drawer manager.
(function(){
  function esc(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));}
  function grouped(){const map={}; (window.LN_QUALIFICATION_GATE_RULES_V296?.gates||[]).forEach(g=>{(map[g.group]||(map[g.group]=[])).push(g);}); return map;}
  function renderSummary(){
    const el=document.getElementById('qualificationGateSummaryV296'); if(!el)return;
    const s=window.LN_QUALIFICATION_GATE_V296?.summary?.();
    el.innerHTML=`<b>资格入口</b><span>${esc(s?.text||'默认隐藏需资格入口')}</span>`;
  }
  function row(g,state){
    const isHide=g.category==='hide'; const val=state[g.id] || g.defaultStatus || 'unreviewed';
    const opts=isHide
      ? [['unreviewed','未确认，默认隐藏'],['eligible','符合条件，可纳入比较'],['notConsider','不考虑']]
      : [['warn','仅提示复核'],['ack','已了解，保留提醒']];
    return `<div class="qgate-row-v296fix4"><div><b>${esc(g.name)}</b><p>${esc((g.reviewTips||[]).slice(0,2).join('；'))}</p></div><select data-action="qualification-gate-change" data-gate-id="${esc(g.id)}">${opts.map(o=>`<option value="${o[0]}" ${val===o[0]?'selected':''}>${esc(o[1])}</option>`).join('')}</select></div>`;
  }
  function drawerHtml(){
    const st=window.LN_QUALIFICATION_GATE_V296?.readState?.()||{};
    const groups=grouped();
    return `<div class="qgate-drawer-v296fix4"><p class="small">未确认资格前，系统默认隐藏专项、预科、民族班、定向培养等特殊入口，避免误当普通本科志愿。系统不替用户判断资格，只根据你确认的状态纳入比较。</p>${Object.keys(groups).map(k=>`<section><h4>${esc(k)}</h4>${groups[k].map(g=>row(g,st)).join('')}</section>`).join('')}<div class="qgate-later-v296fix4"><b>后续仅作为提醒扩展：</b>${esc((window.LN_QUALIFICATION_GATE_RULES_V296?.later||[]).join('、'))}</div></div>`;
  }
  function openDrawer(){window.LN_DRAWER_V296?.open?.('资格型入口保护',drawerHtml());}
  function change(id,value){
    if(!id)return; const s={}; s[id]=value; window.LN_QUALIFICATION_GATE_V296?.writeState?.(s); renderSummary();
    if(window.LN_DRAWER_V296?.isOpen?.()) openDrawer();
    if(window.LN_REFRESH_SCHEDULER_V296?.request) window.LN_REFRESH_SCHEDULER_V296.request({reason:'qualification-gate-change',level:'soft',delay:180});
    else if(typeof autoRefresh==='function') autoRefresh('qualification-gate-change');
  }
  function noticeHtml(hidden){return `<b>资格型入口保护：</b>未确认资格前，系统默认隐藏专项、预科、民族班、定向培养等特殊入口。当前已隐藏 ${Number(hidden||0).toLocaleString('zh-CN')} 条；如确有资格，可在“管理资格入口”中放开比较。`;}
  window.LN_QUALIFICATION_GATE_UI_V296={renderSummary,openDrawer,change,noticeHtml,ready:true};
  setTimeout(renderSummary,0);
})();

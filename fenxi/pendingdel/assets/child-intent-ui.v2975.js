// V2.9.7.5 child intent UI widgets.
(function(){
  function tr(){return window.LN_CHILD_INTENT_TRANSLATOR_V2975;}
  function esc(v){return tr()?.esc?.(v)||String(v??'');}
  function renderInline(){
    if(!tr()) return '';
    const sum=tr().summary(); const state=tr().readState();
    const cards=tr().intents.map(i=>{
      const on=state.selectedIntentIds.includes(i.id);
      return `<button type="button" class="intent-chip-v2975 ${on?'active':''}" data-child-intent-id="${esc(i.id)}"><b>${esc(i.short)}</b><span>${esc(i.label)}</span></button>`;
    }).join('');
    const trans=tr().translate();
    const detail=trans.messages.slice(0,2).map(x=>`<li>${esc(x)}</li>`).join('') || '<li>暂未整理孩子想法，系统会先按家庭底线和综合规则推荐。</li>';
    const conflicts=window.LN_INTENT_CONFLICT_RULES_V2975?.detect?.()||[];
    const conflictHtml=conflicts.length?`<div class="intent-conflict-v2975">${conflicts.map(c=>esc(c.message)).join(' ')}</div>`:'';
    return `<div class="child-intent-panel-v2975">
      <div class="intent-head-v2975"><div><b>${esc(sum.title)}</b><span>这不是专业测评，只是帮助家庭把孩子想法说清楚。</span></div><em>最多选 3 个</em></div>
      <div class="intent-grid-v2975">${cards}</div>
      <div class="intent-translate-v2975"><b>系统理解</b><ul>${detail}</ul>${conflictHtml}</div>
    </div>`;
  }
  function bind(root){
    (root||document).querySelectorAll('[data-child-intent-id]').forEach(btn=>{
      if(btn.dataset.boundIntentV2975) return; btn.dataset.boundIntentV2975='1';
      btn.addEventListener('click',ev=>{ev.preventDefault(); const res=tr()?.toggle?.(btn.dataset.childIntentId); if(res&&res.ok===false){toast('建议最多选择 3 个最主要的想法。'); return;} refresh();});
    });
  }
  function toast(msg){const host=document.getElementById('childInterestBoxV2955')||document.body; const el=document.createElement('div'); el.className='child-interest-toast-v296'; el.textContent=msg; host.prepend(el); setTimeout(()=>el.remove(),2600);}
  function refresh(){
    window.LN_CHILD_INTEREST_UI_V296?.renderSummary?.();
    if(window.LN_DRAWER_V296?.isOpen?.()) window.LN_CHILD_INTEREST_UI_V296?.renderDrawerBody?.();
    window.LN_REFRESH_SCHEDULER_V296?.request?.({reason:'child-intent-change',level:'soft',delay:180});
  }
  window.LN_CHILD_INTENT_UI_V2975={renderInline,bind,refresh,ready:true};
})();

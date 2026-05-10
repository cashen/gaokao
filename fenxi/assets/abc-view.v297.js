// V2.9.7 ABC view: segmented control with cached panel switching.
(function(){
  let active='A';
  const meta={
    A:{title:'A 守底线',desc:'公办、普通学费、位次安全、家庭成本。'},
    B:{title:'B 看专业',desc:'正主方向、相近替代、孩子兴趣与专业路径。'},
    C:{title:'C 争上限',desc:'城市、学校层级、中外合作/高收费的交换条件。'}
  };
  function get(){return active;}
  function updateTabState(){
    document.querySelectorAll('.abc-segment-v296 button[data-abc]').forEach(btn=>{
      const on=btn.getAttribute('data-abc')===active;
      btn.classList.toggle('active',on);
      btn.setAttribute('aria-selected',on?'true':'false');
    });
  }
  function select(t){
    if(['A','B','C'].includes(t)) active=t;
    updateTabState();
    const render=()=>{
      if(typeof window.renderPlanABCViewOnly==='function') window.renderPlanABCViewOnly();
      else if(window.LN_PLAN_ENGINE?.renderPlanABCViewOnly) window.LN_PLAN_ENGINE.renderPlanABCViewOnly();
      else if(typeof renderPlanABC==='function') renderPlanABC();
    };
    if(window.LN_REFRESH_SCHEDULER_V296?.request){
      window.LN_REFRESH_SCHEDULER_V296.request({reason:'abc-view-change', level:'render-only', delay:0, render});
    }else{
      render();
    }
  }
  function renderTabs(buckets){
    return `<div class="abc-segment-v296" role="tablist" aria-label="A/B/C方案视角">${['A','B','C'].map(t=>`<button class="${active===t?'active':''}" role="tab" aria-selected="${active===t?'true':'false'}" data-action="abc-select" data-abc="${t}"><b>${meta[t].title}</b><span>${(buckets?.[t]||[]).length} 项</span><em>${meta[t].desc}</em></button>`).join('')}</div>`;
  }
  function currentMeta(){return meta[active]||meta.A;}
  window.LN_ABC_VIEW_V296={get,select,renderTabs,currentMeta,updateTabState,ready:true};
})();

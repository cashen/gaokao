// V2.9.6 ABC view: segmented control; switching view does not re-run full filtering.
(function(){
  let active='A';
  const meta={A:{title:'A 守底线',desc:'公办、普通学费、位次安全、家庭成本。'},B:{title:'B 看专业',desc:'正主方向、相近替代、孩子兴趣与专业路径。'},C:{title:'C 争上限',desc:'城市、学校层级、中外合作/高收费的交换条件。'}};
  function get(){return active;}
  function select(t){ if(['A','B','C'].includes(t))active=t; if(typeof renderPlanABC==='function')renderPlanABC(); }
  function renderTabs(buckets){
    return `<div class="abc-segment-v296">${['A','B','C'].map(t=>`<button class="${active===t?'active':''}" data-action="abc-select" data-abc="${t}"><b>${meta[t].title}</b><span>${(buckets?.[t]||[]).length} 项</span><em>${meta[t].desc}</em></button>`).join('')}</div>`;
  }
  function currentMeta(){return meta[active]||meta.A;}
  window.LN_ABC_VIEW_V296={get,select,renderTabs,currentMeta,ready:true};
})();

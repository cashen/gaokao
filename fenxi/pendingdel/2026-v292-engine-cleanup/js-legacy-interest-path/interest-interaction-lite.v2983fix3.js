// V2.9.8.3.fix3 interest interaction: immediate UI feedback, heavy matching after drawer close / scheduled refresh.
(function(){
  const perf=()=>window.performance&&performance.now?performance.now():Date.now();
  function rt(){return window.LN_CHILD_INTEREST_RUNTIME_V296||window.LN_CHILD_INTEREST_RUNTIME_V298;}
  function ui(){return window.LN_CHILD_INTEREST_UI_V296||window.LN_CHILD_INTEREST_UI_V298;}
  function dbg(name,obj){try{window.LN_DEBUG_V2983?.detail?.(name,obj);}catch(e){}}
  function stop(e){e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation)e.stopImmediatePropagation();}
  function toggleGroup(el,e){const t=perf(); stop(e); const id=el?.dataset?.childInterestGroup||''; const before=rt()?.readState?.(); const res=rt()?.toggleGroup?.(id); // runtime is already light when drawer is open.
    try{ui()?.renderDrawerSelectionOnly?.();}catch(err){}
    dbg('interestToggleBreakdown',{id,ok:!(res&&res.ok===false),reason:res?.reason||'',selected:(rt()?.readState?.().selectedGroups||[]),ms:Math.round(perf()-t),drawerOpen:!!rt()?.drawerIsChildInterest?.()});
    if(res&&res.ok===false&&res.reason==='max'){
      const box=document.querySelector('.child-interest-drawer-v296')||document.getElementById('childInterestBoxV296');
      if(box){const tip=document.createElement('div');tip.className='child-interest-toast-v296';tip.textContent='建议先选 1—3 个最有兴趣的方向，想换方向可以先删除一个。';box.prepend(tip);setTimeout(()=>tip.remove(),2600);} }
    return true;
  }
  function action(el,e){const a=el?.dataset?.action||''; if(!['child-interest-auto-toggle','child-interest-remove','child-interest-undecided','child-intent-remove'].includes(a))return false; const t=perf(); stop(e); try{rt()?.handle?.(a,el);}catch(err){} try{ui()?.renderDrawerSelectionOnly?.();}catch(err){} dbg('interestActionBreakdown',{action:a,ms:Math.round(perf()-t),drawerOpen:!!rt()?.drawerIsChildInterest?.()}); return true;}
  function onlyRealHitChange(el,e){if(el?.id!=='onlyChildInterestV296')return false; const t=perf(); stop(e); const r=rt(); const s=r?.readState?.()||{}; s.manualOnlyInterest=!!el.checked; r?.saveState?.(s); try{ui()?.renderSummary?.();}catch(err){} // Do not run matching inline. Let scheduler handle it after UI remains responsive.
    window.LN_REFRESH_SCHEDULER_V296?.request?.({reason:'child-interest-real-hit-toggle',level:'soft',delay:1400});
    dbg('interestManualOnlyToggle',{checked:!!el.checked,ms:Math.round(perf()-t)}); return true;}
  document.addEventListener('click',function(e){const group=e.target.closest('[data-child-interest-group]'); if(group)return toggleGroup(group,e); const act=e.target.closest('[data-action]'); if(act&&action(act,e))return;},true);
  document.addEventListener('change',function(e){if(onlyRealHitChange(e.target,e))return;},true);
  window.LN_INTEREST_INTERACTION_LITE_V2983FIX3={ready:true};
})();

// V2.9.8.2 interaction stability: drawer buttons, detailed-card expanders, step targets.
(function(){
  function setDrawerType(t){window.__LN_ACTIVE_DRAWER_TYPE=t||'';}
  function patchRuntime(){
    const rt=window.LN_CHILD_INTEREST_RUNTIME_V296||window.LN_CHILD_INTEREST_RUNTIME_V298; if(rt && !rt.__v2982Stable){
      const oldStart=rt.start; rt.start=function(){setDrawerType('childInterest'); (oldStart||function(){window.LN_CHILD_INTEREST_UI_V296?.openDrawer?.();}).call(rt); return true;};
      const oldHandle=rt.handle; rt.handle=function(action,el){const res=oldHandle?oldHandle.call(rt,action,el):false; if(['child-interest-start','child-interest-undecided','child-interest-remove','child-interest-auto-toggle','child-intent-remove'].includes(action)) return true; return res;};
      rt.__v2982Stable=true;
    }
    const ui=window.LN_CHILD_INTEREST_UI_V296||window.LN_CHILD_INTEREST_UI_V298; if(ui && !ui.__v2982Stable){
      const oldOpen=ui.openDrawer; ui.openDrawer=function(){setDrawerType('childInterest'); const r=oldOpen?oldOpen.apply(ui,arguments):window.LN_DRAWER_V296?.open?.('孩子兴趣',''); return r;};
      const oldRender=ui.renderDrawerBody; ui.renderDrawerBody=function(){if(window.LN_DRAWER_V296?.isOpen?.() && window.__LN_ACTIVE_DRAWER_TYPE && window.__LN_ACTIVE_DRAWER_TYPE!=='childInterest') return; return oldRender?oldRender.apply(ui,arguments):undefined;};
      ui.__v2982Stable=true;
    }
    const prof=window.LN_STUDENT_PROFILE_UI_V2975||window.LN_STUDENT_PROFILE_UI_V2981; if(prof && !prof.__v2982Stable){
      const oldOpen=prof.openDrawer; prof.openDrawer=function(){setDrawerType('studentProfile'); const r=oldOpen?oldOpen.apply(prof,arguments):undefined; return r||true;}; prof.__v2982Stable=true;
    }
  }
  function openInterest(e){e?.preventDefault?.();e?.stopPropagation?.();patchRuntime();setDrawerType('childInterest');window.LN_CHILD_INTEREST_RUNTIME_V296?.start?.();return true;}
  function openProfile(e){e?.preventDefault?.();e?.stopPropagation?.();patchRuntime();setDrawerType('studentProfile');window.LN_STUDENT_PROFILE_UI_V2975?.openDrawer?.();return true;}
  function bindStepTargets(){document.querySelectorAll('[data-scroll-target="strategyEntry"]').forEach(btn=>{if((btn.textContent||'').includes('选择家庭场景')){btn.dataset.scrollTarget='childInterest';btn.textContent='下一步：补充孩子学习特点与兴趣';}});document.querySelectorAll('[data-scroll-target="profileAsk"]').forEach(btn=>{btn.dataset.scrollTarget='childInterest';if((btn.textContent||'').trim())btn.textContent='编辑特点与兴趣';});}
  function expandLite(btn){
    const card=btn.closest('[data-lite-card]'); if(!card)return false; const box=card.querySelector('[data-lite-panel]'); if(!box)return false;
    let sections={}; try{sections=JSON.parse(decodeURIComponent(card.dataset.liteSections||'%7B%7D'));}catch(e){}
    const key=btn.dataset.liteSection||'evidence'; const active=btn.classList.contains('active');
    card.querySelectorAll('[data-lite-section]').forEach(b=>b.classList.remove('active'));
    if(active){box.hidden=true;box.textContent='';return true;}
    btn.classList.add('active'); box.hidden=false; box.textContent=sections[key] || '暂无更多说明。'; return true;
  }
  document.addEventListener('click',function(e){
    const profile=e.target.closest('[data-action="open-student-profile"]'); if(profile) return openProfile(e);
    const interest=e.target.closest('[data-action="child-interest-start"]'); if(interest) return openInterest(e);
    const lite=e.target.closest('[data-lite-section]'); if(lite){e.preventDefault();e.stopPropagation();expandLite(lite);return;}
  },true);
  function patch(){patchRuntime();bindStepTargets();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',patch);else patch();
  setTimeout(patch,0);setTimeout(patch,600);setTimeout(patch,1600);
  window.LN_INTERACTION_STABILITY_V2982={patch,openInterest,openProfile,ready:true};
})();

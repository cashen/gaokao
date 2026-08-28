// V2.9.8.2.fix2 scroll guard: release stale drawer locks and overlay leftovers.
(function(){
  function qs(sel){try{return document.querySelector(sel);}catch(e){return null;}}
  function visible(el){return !!(el && !el.classList.contains('hide') && el.offsetParent !== null || (el && !el.classList.contains('hide') && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden'));}
  function drawerOpen(){
    const drawer=qs('.ln-drawer-v296');
    const mask=qs('.ln-drawer-mask-v296');
    return visible(drawer) || visible(mask);
  }
  function ensure(){
    const open=drawerOpen();
    if(!open){
      document.body.classList.remove('drawer-open-v296');
      const mask=qs('.ln-drawer-mask-v296');
      const drawer=qs('.ln-drawer-v296');
      if(mask) mask.classList.add('hide');
      if(drawer) drawer.classList.add('hide');
      if(document.documentElement) document.documentElement.style.overflowY='auto';
      if(document.body){document.body.style.overflowY='auto';document.body.style.position='';}
      if(window.__LN_ACTIVE_DRAWER_TYPE && window.__LN_ACTIVE_DRAWER_TYPE!=='childInterest' && window.__LN_ACTIVE_DRAWER_TYPE!=='studentProfile') window.__LN_ACTIVE_DRAWER_TYPE='';
    }
    return !open;
  }
  function closeAll(){
    const mask=qs('.ln-drawer-mask-v296');
    const drawer=qs('.ln-drawer-v296');
    if(mask) mask.classList.add('hide');
    if(drawer) drawer.classList.add('hide');
    document.body.classList.remove('drawer-open-v296');
    if(document.documentElement) document.documentElement.style.overflowY='auto';
    if(document.body){document.body.style.overflowY='auto';document.body.style.position='';}
    window.__LN_ACTIVE_DRAWER_TYPE='';
  }
  function patchDrawer(){
    const d=window.LN_DRAWER_V296;
    if(!d || d.__scrollGuardFix2) return;
    const oldOpen=d.open?.bind(d), oldClose=d.close?.bind(d);
    if(oldOpen){d.open=function(){const r=oldOpen.apply(this,arguments); setTimeout(()=>{if(document.body.classList.contains('drawer-open-v296')){document.body.style.overflowY='hidden';}},0); return r;};}
    if(oldClose){d.close=function(){const r=oldClose.apply(this,arguments); closeAll(); return r;};}
    d.__scrollGuardFix2=true;
  }
  function bind(){
    if(bind.done) return; bind.done=true;
    document.addEventListener('click',function(e){
      const close=e.target.closest('[data-action="drawer-close"], .ln-drawer-mask-v296');
      if(close){setTimeout(closeAll,0);}
    },true);
    document.addEventListener('keydown',function(e){if(e.key==='Escape') closeAll();},true);
    window.addEventListener('pageshow',ensure);
    window.addEventListener('focus',ensure);
  }
  function init(){patchDrawer(); bind(); ensure(); setTimeout(ensure,50); setTimeout(ensure,500);}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
  window.LN_SCROLL_LOCK_GUARD_V2982FIX2={ensure,closeAll,patchDrawer,ready:true,version:'V2.9.8.2.fix2'};
})();

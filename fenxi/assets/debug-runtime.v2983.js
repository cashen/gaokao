// V2.9.8.3 runtime debug collector: stores lightweight diagnostics in localStorage for /fenxi/debug.html.
(function(){
  const KEY='ln_v2983_debug_report';
  const state={version:'V2.9.8.3',stamp:'2983-20260511',actions:[],timings:{},errors:[],longTasks:[],pools:{},context:{},flags:{},lastAction:''};
  function trim(arr,n){while(arr.length>n)arr.shift();return arr;}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(Object.assign({},state,{savedAt:new Date().toISOString()})));}catch(e){}}
  function log(action,data){state.lastAction=action;state.actions.push({t:new Date().toLocaleTimeString(),action,data:data||null});trim(state.actions,40);save();}
  function timing(name,ms,extra){state.timings[name]={ms:Math.round(ms),at:new Date().toLocaleTimeString(),extra:extra||null};save();}
  function setPools(p){state.pools=Object.assign({},state.pools,p||{});save();}
  function setContext(c){state.context=c||{};save();}
  function setFlags(f){state.flags=Object.assign({},state.flags,f||{});save();}
  function report(){
    const drawer=document.querySelector('.ln-drawer-v296');
    const mask=document.querySelector('.ln-drawer-mask-v296');
    const cls=document.body?.className||'';
    const out=Object.assign({},state,{runtime:{
      url:location.href,
      bodyClass:cls,
      drawerOpen:!!(drawer && !drawer.classList.contains('hide')),
      maskVisible:!!(mask && !mask.classList.contains('hide')),
      bodyLock:cls.includes('drawer-open-v296'),
      scrollY:window.scrollY,
      jsFiles:(window.__LN_BOOT_LOADS__||[]).filter(x=>x.ok).length,
      failedFiles:(window.__LN_BOOT_LOADS__||[]).filter(x=>!x.ok).map(x=>x.file),
      assetBase:window.__LN_ASSET_BASE||'',
      loadedAt:new Date().toLocaleString()
    }});
    try{out.versionText=document.querySelector('h1')?.textContent?.trim()||'';}catch(e){}
    return out;
  }
  function textReport(){
    const r=report();
    const lines=[];
    lines.push('【辽宁物理类工具 Debug Report】');
    lines.push('版本：'+(r.versionText||r.version));
    lines.push('版本戳：'+r.stamp);
    lines.push('URL：'+r.runtime.url);
    lines.push('body.className：'+r.runtime.bodyClass);
    lines.push('JS文件数：'+r.runtime.jsFiles+'；失败：'+(r.runtime.failedFiles||[]).join(',')||'无');
    lines.push('抽屉：open='+r.runtime.drawerOpen+' mask='+r.runtime.maskVisible+' bodyLock='+r.runtime.bodyLock+' scrollY='+r.runtime.scrollY);
    lines.push('候选池：'+JSON.stringify(r.pools||{}));
    lines.push('当前上下文：'+JSON.stringify(r.context||{}));
    lines.push('最近耗时：');
    Object.keys(r.timings||{}).slice(-12).forEach(k=>lines.push(' - '+k+'：'+r.timings[k].ms+'ms'));
    lines.push('最近操作：');
    (r.actions||[]).slice(-20).forEach(a=>lines.push(' - ['+a.t+'] '+a.action+(a.data?' '+JSON.stringify(a.data):'')));
    if((r.errors||[]).length){lines.push('错误：');r.errors.slice(-8).forEach(e=>lines.push(' - '+e.message+' @ '+(e.source||'')+':'+(e.lineno||'')));}
    if((r.longTasks||[]).length){lines.push('长任务：');r.longTasks.slice(-8).forEach(e=>lines.push(' - '+e.duration+'ms @ '+e.t));}
    return lines.join('\n');
  }
  window.addEventListener('error',e=>{state.errors.push({t:new Date().toLocaleTimeString(),message:String(e.message||e.error||'error'),source:e.filename,lineno:e.lineno,colno:e.colno});trim(state.errors,20);save();});
  window.addEventListener('unhandledrejection',e=>{state.errors.push({t:new Date().toLocaleTimeString(),message:String(e.reason&&e.reason.message||e.reason||'unhandledrejection')});trim(state.errors,20);save();});
  try{if('PerformanceObserver' in window){new PerformanceObserver(list=>{for(const entry of list.getEntries()){if(entry.duration>200){state.longTasks.push({t:new Date().toLocaleTimeString(),duration:Math.round(entry.duration)});trim(state.longTasks,20);save();}}}).observe({entryTypes:['longtask']});}}catch(e){}
  document.addEventListener('click',e=>{const a=e.target.closest?.('[data-action]');const g=e.target.closest?.('[data-child-interest-group]');const s=e.target.closest?.('[data-strategy]');if(a)log('click:'+a.dataset.action);else if(g)log('click:child-interest-group',{id:g.dataset.childInterestGroup});else if(s)log('click:scenario',{id:s.dataset.strategy});},true);
  window.LN_DEBUG_V2983={state,log,timing,setPools,setContext,setFlags,report,textReport,save,ready:true};
  save();
})();

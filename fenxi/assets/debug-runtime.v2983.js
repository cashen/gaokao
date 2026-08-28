// V2.9RC.fix-safeperf1 runtime debug collector: stores diagnostics and deep performance details in localStorage for /fenxi/debug.html.
(function(){
  const KEY='ln_v2983_debug_report';
  const state={version:(window.__LN_TOOL_VERSION||'V2.9RC.fix-safeperf1'),stamp:(window.__LN_TOOL_STAMP||'29rc-safeperf1-20260513'),actions:[],timings:{},details:{},queue:{},errors:[],longTasks:[],pools:{},context:{},flags:{},lastAction:''};
  function trim(arr,n){while(arr.length>n)arr.shift();return arr;}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(Object.assign({},state,{savedAt:new Date().toISOString()})));}catch(e){}}
  function log(action,data){state.lastAction=action;state.actions.push({t:new Date().toLocaleTimeString(),action,data:data||null});trim(state.actions,40);save();}
  function timing(name,ms,extra){state.timings[name]={ms:Math.round(ms),at:new Date().toLocaleTimeString(),extra:extra||null};save();}
  function setPools(p){state.pools=Object.assign({},state.pools,p||{});save();}
  function setContext(c){state.context=c||{};save();}
  function setFlags(f){state.flags=Object.assign({},state.flags,f||{});save();}
  function detail(name,obj){state.details=state.details||{};state.details[name]=obj||{};save();}
  function setQueue(q){state.queue=Object.assign({},state.queue||{},q||{});save();}
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
      loadedAt:new Date().toLocaleString(),
      device:{ua:navigator.userAgent,deviceMemory:navigator.deviceMemory||null,hardwareConcurrency:navigator.hardwareConcurrency||null,viewport:(window.innerWidth||0)+'x'+(window.innerHeight||0)},
      resources:(()=>{try{
        const res=performance.getEntriesByType('resource')||[];
        const byExt={};
        for(const e of res){const m=String(e.name||'').split('?')[0].match(/\.([a-z0-9]+)$/i);const ext=m?m[1].toLowerCase():'no_ext';byExt[ext]=byExt[ext]||{count:0,transferSize:0,encodedBodySize:0,decodedBodySize:0,totalDuration:0};byExt[ext].count++;byExt[ext].transferSize+=e.transferSize||0;byExt[ext].encodedBodySize+=e.encodedBodySize||0;byExt[ext].decodedBodySize+=e.decodedBodySize||0;byExt[ext].totalDuration+=e.duration||0;}
        const topSlow=res.slice().sort((a,b)=>(b.duration||0)-(a.duration||0)).slice(0,10).map(e=>({name:String(e.name||'').split('/').slice(-3).join('/'),type:e.initiatorType,ms:Math.round(e.duration||0),decodedBodySize:e.decodedBodySize||0,transferSize:e.transferSize||0}));
        const topBig=res.slice().sort((a,b)=>(b.decodedBodySize||0)-(a.decodedBodySize||0)).slice(0,10).map(e=>({name:String(e.name||'').split('/').slice(-3).join('/'),type:e.initiatorType,ms:Math.round(e.duration||0),decodedBodySize:e.decodedBodySize||0,transferSize:e.transferSize||0}));
        const nav=performance.getEntriesByType('navigation')[0];
        const paints=performance.getEntriesByType('paint').map(x=>({name:x.name,ms:Math.round(x.startTime||0)}));
        return {byExt,topSlow,topBig,paints,navigation:nav?{domInteractive:Math.round(nav.domInteractive||0),domContentLoaded:Math.round(nav.domContentLoadedEventEnd||0),loadEventEnd:Math.round(nav.loadEventEnd||0),responseStart:Math.round(nav.responseStart||0),responseEnd:Math.round(nav.responseEnd||0)}:null,safePerf:window.LN_SAFE_PERF_STATE||null};
      }catch(e){return {error:String(e&&e.message||e)};}})(),
      dom:{nodes:document.getElementsByTagName('*').length,cards:document.querySelectorAll('.card').length}
    }});
    try{out.versionText=document.querySelector('h1')?.textContent?.trim()||'';}catch(e){}
    try{out.legacy={profileAskExists:!!document.getElementById('profileAsk'),mentorRulesExists:!!document.getElementById('mentorRules'),adapterReady:!!window.LN_LEGACY_PREFERENCE_ADAPTER_V2982?.ready,oldDomFallbackUsed:!!window.__LN_OLD_DOM_FALLBACK_USED};}catch(e){}
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
    if(r.runtime?.device) lines.push('设备：'+JSON.stringify(r.runtime.device));
    if(r.runtime?.resources) lines.push('资源：'+JSON.stringify(r.runtime.resources));
    lines.push('当前上下文：'+JSON.stringify(r.context||{}));
    lines.push('旧逻辑：'+JSON.stringify(r.legacy||{}));
    lines.push('队列：'+JSON.stringify(r.queue||{}));
    if(r.details){lines.push('深度细分：');Object.keys(r.details).forEach(k=>lines.push(' - '+k+'：'+JSON.stringify(r.details[k])));}
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
  window.LN_DEBUG_V2983={state,log,timing,setPools,setContext,setFlags,detail,setQueue,report,textReport,save,ready:true,version:(window.__LN_TOOL_VERSION||'V2.9RC.fix-safeperf1')};
  save();
})();

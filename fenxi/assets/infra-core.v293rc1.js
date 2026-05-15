// V2.93RC1｜基础运行层合并包
// 合并范围：性能/调试/缓存/状态快照/刷新队列/抽屉/资格入口/学生画像。
// 边界：不改筛选公式、不改排序、不改 A/B/C 裁决、不改数据。
(function(){
  window.LN_V293RC1_MERGE = window.LN_V293RC1_MERGE || {};
  window.LN_V293RC1_MERGE.infraCore = {ready:false, files:12, stamp:'293rc1-20260515'};
})();


/* ===== BEGIN assets/perf-monitor.v297fix2.js ===== */
// V2.9.6 light performance monitor. Visible in diagnostics/debug; no external reporting.
(function(){
  const history=[]; let current=null;
  function now(){return (performance&&performance.now)?performance.now():Date.now();}
  function start(meta){current={meta:meta||{}, start:now(), marks:[]}; return current;}
  function mark(name){if(current) current.marks.push({name, t:now()-current.start});}
  function end(extra){if(!current)return null; const item=Object.assign({}, current, {duration:Math.round(now()-current.start), endAt:new Date().toISOString()}, extra||{}); history.unshift(item); if(history.length>20)history.pop(); current=null; return item;}
  function last(){return history[0]||null;}
  function all(){return history.slice();}
  window.LN_PERF_MONITOR_V296={start,mark,end,last,all,ready:true};
})();
/* ===== END assets/perf-monitor.v297fix2.js ===== */


/* ===== BEGIN assets/debug-runtime.v2983.js ===== */
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
/* ===== END assets/debug-runtime.v2983.js ===== */


/* ===== BEGIN assets/candidate-cache.v297fix2.js ===== */
// V2.9.6 candidate cache: keeps per-refresh derived values and child-interest matches.
(function(){
  let generation=0; const map=new WeakMap();
  function reset(){generation++;}
  function bucket(r){let b=map.get(r); if(!b||b.g!==generation){b={g:generation, values:{}}; map.set(r,b);} return b.values;}
  function get(r,key,fn){const b=bucket(r); if(Object.prototype.hasOwnProperty.call(b,key)) return b[key]; b[key]=fn?fn():undefined; return b[key];}
  function set(r,key,value){bucket(r)[key]=value; return value;}
  window.LN_CANDIDATE_CACHE_V296={reset,get,set,ready:true};
})();
/* ===== END assets/candidate-cache.v297fix2.js ===== */


/* ===== BEGIN assets/state-snapshot.v297fix2.js ===== */
// V2.9.6 state snapshot: reads DOM once per refresh window, so engines don't repeatedly query controls.
(function(){
  let cache=null, cacheAt=0;
  function activeChips(selector, attr){return [...document.querySelectorAll(selector+'.active')].map(x=>x.dataset[attr]||x.textContent.trim()).filter(Boolean);}
  function getGroup(group){const box=document.querySelector(`[data-group="${group}"]`); return box?.querySelector('.chip.active')?.dataset?.value || 'neutral';}
  function selectedRejects(){return [...document.querySelectorAll('#rejectChips .chip.active')].map(x=>x.dataset.reject||x.textContent.trim()).filter(Boolean);}
  function snapshot(force){
    const t=(performance&&performance.now)?performance.now():Date.now();
    if(!force && cache && t-cacheAt<120) return cache;
    const rank=(typeof resolveRank==='function')?resolveRank():null;
    const score=Number(document.getElementById('myScore')?.value||0)||null;
    const provinces=(typeof window.selectedProvinces==='function')?window.selectedProvinces():activeChips('#provinceChips .chip','province');
    const cities=(typeof window.selectedCitiesV29472==='function')?window.selectedCitiesV29472():(document.getElementById('targetCities')?.value||'').split(/[，,\s]+/).filter(Boolean);
    const child=window.LN_CHILD_INTEREST_RUNTIME_V296?.readState?.() || window.LN_CHILD_INTEREST_RUNTIME_V2955?.readState?.() || {mode:'undecided',selectedGroups:[]};
    const priority=document.getElementById('priority')?.value || 'employment';
    const regionMode=document.getElementById('regionMode')?.value || 'none';
    const cityMode=(typeof window.cityModeV29472==='function')?window.cityModeV29472():(document.getElementById('cityMode')?.value||'none');
    const rejectList=selectedRejects();
    const rejectSet=new Set(rejectList);
    const budget=document.getElementById('budget')?.value || 'normal';
    const familyTolerance=document.getElementById('familyTolerance')?.value || 'low';
    const feeType=document.getElementById('filterFeeType')?.value || 'all';
    const qMajor=((document.getElementById('qMajor')?.value||'')+' '+(document.getElementById('filterSubjectGroup')?.value||'')).trim();
    const currentStrategy=window.currentStrategy || (typeof window.currentStrategy!=='undefined'?window.currentStrategy:'employment');
    const scoreBand=(typeof window.scoreBandV29473==='function')?window.scoreBandV29473():'';
    cache={
      rank,score,provinces,cities,child,priority,regionMode,cityMode,rejectList,rejectSet,budget,familyTolerance,feeType,qMajor,currentStrategy,
      budgetWide: budget==='high'||budget==='coop'||familyTolerance==='high',
      coopIntent: budget==='coop'||String(feeType).includes('coop'),
      noHighFee: budget==='normal'||rejectSet.has('高收费')||feeType==='excludeHighPrivate',
      strict: !!document.getElementById('strictProfile')?.checked,
      scoreBand,
      lowScore:/540—500|500—450|450—400|400—350|本科边缘/.test(scoreBand),
      edgeScore:/500—450|450—400|400—350|本科边缘/.test(scoreBand),
      highScore:/650\+|650—620|700/.test(scoreBand),
      outProvince:getGroup('outProvince'),medicine:getGroup('medicine'),teacher:getGroup('teacher'),liberal:getGroup('liberal'),chem:getGroup('chem'),physics:getGroup('physics'),gridPower:getGroup('gridPower'),
      mentorMode:document.getElementById('mentorMode')?.value||'standard',gradPlan:document.getElementById('gradPlan')?.value||'maybe',timePressure:document.getElementById('timePressure')?.value||'normal'
    };
    cache.strongProvince=cache.outProvince==='no'||(regionMode==='hard'&&provinces.length===1&&provinces[0]==='辽宁')||['shenyang','dalian','publicLow','grid'].includes(currentStrategy);
    cache.strongCity=priority==='city'||cityMode!=='none'||cities.length>0||['shenyang','dalian','city'].includes(currentStrategy);
    cache.hotMajor=/计算机|软件|人工智能|数据|信息安全|网络|电气|电子|临床|口腔|医学|师范|法学/.test(qMajor)||['grid','medical','exam'].includes(currentStrategy)||['grid','exam'].includes(priority);
    cache.normalFamily=budget==='normal'||familyTolerance==='low';
    cache.specialStatus=(typeof specialPlanStatusV29474==='function')?specialPlanStatusV29474():'unreviewed';
    cache.qualificationGate=window.LN_QUALIFICATION_GATE_V296?.readState?.() || {};
    cacheAt=t; return cache;
  }
  function reset(){cache=null; cacheAt=0;}
  window.LN_STATE_SNAPSHOT_V296={snapshot, reset, ready:true};
})();
/* ===== END assets/state-snapshot.v297fix2.js ===== */


/* ===== BEGIN assets/refresh-scheduler.v297fix2.js ===== */
// V2.9.6 refresh scheduler: merge rapid UI events into one refresh and avoid overlapping full calculations.
(function(){
  let timer=null, running=false, queued=null, serial=0;
  const rank={"ui-only":0,"render-only":1,"soft":2,"full":3};
  function normalize(req){
    const policy=window.LN_INTERACTION_POLICY_V296?.get?.(req?.reason||'')||{};
    return Object.assign({reason:'unknown', level:policy.level||'soft', delay:policy.delay??180, run:null}, req||{});
  }
  function stronger(a,b){return (rank[a]||0)>=(rank[b]||0)?a:b;}
  function merge(a,b){if(!a)return b; if(!b)return a; return Object.assign({}, a, b, {level:stronger(a.level,b.level), reason:[a.reason,b.reason].filter(Boolean).join('+'), delay:Math.max(a.delay??180,b.delay??180)});}
  function request(raw){
    const req=normalize(raw); queued=merge(queued, req);
    try{window.LN_DEBUG_V2983?.setQueue?.({pending:!!queued,running,reason:queued?.reason,level:queued?.level,delay:queued?.delay,requestedAt:new Date().toLocaleTimeString()});}catch(e){}
    if(timer) clearTimeout(timer);
    return new Promise(resolve=>{
      queued.resolve=resolve;
      timer=setTimeout(run, Math.max(0, queued.delay||0));
    });
  }
  async function run(){
    if(running){ timer=setTimeout(run,120); return; }
    const req=queued; queued=null; timer=null; if(!req)return;
    running=true; serial++; try{window.LN_DEBUG_V2983?.setQueue?.({pending:false,running:true,serial,reason:req.reason,level:req.level,startedAt:new Date().toLocaleTimeString()});}catch(e){}
    try{
      window.LN_PERF_MONITOR_V296?.start?.({serial,reason:req.reason,level:req.level});
      if(req.level==='ui-only' || req.level==='render-only'){
        if(typeof req.render==='function') req.render();
        window.LN_PERF_MONITOR_V296?.end?.({skippedFull:true});
        req.resolve?.({ok:true, skippedFull:true});
      }else{
        window.LN_STATE_SNAPSHOT_V296?.reset?.();
        window.LN_CANDIDATE_CACHE_V296?.reset?.();
        const out=typeof req.run==='function' ? await req.run() : (typeof window.__LN_AUTO_REFRESH_DIRECT__==='function' ? await window.__LN_AUTO_REFRESH_DIRECT__() : null);
        window.LN_PERF_MONITOR_V296?.end?.({skippedFull:false});
        req.resolve?.({ok:true,out});
      }
    }catch(e){
      window.LN_PERF_MONITOR_V296?.end?.({error:String(e&&e.message||e)});
      console.error('[V2.9.6 refresh scheduler]',e);
      req.resolve?.({ok:false,error:e});
    }finally{
      running=false; try{window.LN_DEBUG_V2983?.setQueue?.({running:false,pending:!!queued,finishedAt:new Date().toLocaleTimeString(),nextReason:queued?.reason||''});}catch(e){}
      if(queued){ timer=setTimeout(run, Math.max(0, queued.delay||0)); }
    }
  }
  window.LN_REFRESH_SCHEDULER_V296={request, ready:true};
})();
/* ===== END assets/refresh-scheduler.v297fix2.js ===== */


/* ===== BEGIN assets/drawer.v297fix2.js ===== */
// V2.9.6 shared drawer: PC right slide-over, mobile bottom sheet.
(function(){
  function ensure(){
    let mask=document.getElementById('lnDrawerMaskV296'); let drawer=document.getElementById('lnDrawerV296');
    if(mask&&drawer)return {mask,drawer};
    mask=document.createElement('div'); mask.id='lnDrawerMaskV296'; mask.className='ln-drawer-mask-v296 hide'; mask.dataset.action='drawer-close';
    drawer=document.createElement('section'); drawer.id='lnDrawerV296'; drawer.className='ln-drawer-v296 hide'; drawer.setAttribute('role','dialog'); drawer.setAttribute('aria-modal','true');
    drawer.innerHTML='<div class="ln-drawer-head-v296"><h3 id="lnDrawerTitleV296">设置</h3><button class="ghost slim" data-action="drawer-close">关闭</button></div><div class="ln-drawer-body-v296" id="lnDrawerBodyV296"></div>';
    document.body.append(mask,drawer); return {mask,drawer};
  }
  function open(title, html){const {mask,drawer}=ensure(); document.getElementById('lnDrawerTitleV296').textContent=title||'设置'; document.getElementById('lnDrawerBodyV296').innerHTML=html||''; mask.classList.remove('hide'); drawer.classList.remove('hide'); document.body.classList.add('drawer-open-v296');}
  function setBody(html){ensure(); document.getElementById('lnDrawerBodyV296').innerHTML=html||'';}
  function close(){const {mask,drawer}=ensure(); mask.classList.add('hide'); drawer.classList.add('hide'); document.body.classList.remove('drawer-open-v296');}
  function isOpen(){return !ensure().drawer.classList.contains('hide');}
  document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
  window.LN_DRAWER_V296={open,setBody,close,isOpen,ready:true};
})();
/* ===== END assets/drawer.v297fix2.js ===== */


/* ===== BEGIN assets/qualification-gate-rules.v297fix2.js ===== */
// V2.9.7 qualification gate rules: special admissions entries are hidden until user confirms eligibility.
(function(){
  const gates=[
    {
      id:'eduSpecialPlan', group:'专项 / 农村专项', name:'教育部高校专项计划', category:'hide', defaultStatus:'unreviewed', allowValue:'eligible',
      detectKeywords:['教育部高校专项','高校专项计划','高校专项'],
      excludeKeywords:['辽宁省高校专项','辽宁高校专项','省高校专项'],
      reviewTips:['需复核高校专项资格审核结果','需复核公示名单、院校招生章程和当年计划']
    },
    {
      id:'lnRuralSpecial', group:'专项 / 农村专项', name:'辽宁省高校专项 / 重点高校农村专项', category:'hide', defaultStatus:'unreviewed', allowValue:'eligible',
      detectKeywords:['辽宁省高校专项','辽宁高校专项','重点高校招收农村学生专项','重点高校农村专项','省高校专项计划'],
      reviewTips:['需复核辽宁省高校专项报考条件','需复核资格审核结果和当年计划说明']
    },
    {
      id:'minorityPrep', group:'民族 / 预科', name:'少数民族预科班', category:'hide', defaultStatus:'unreviewed', allowValue:'eligible',
      detectKeywords:['少数民族预科','少数民族预科班'],
      reviewTips:['需复核民族身份','需复核是否要求预科专业志愿','需复核招生章程和当年计划说明']
    },
    {
      id:'ethnicClass', group:'民族 / 预科', name:'民族班', category:'hide', defaultStatus:'unreviewed', allowValue:'eligible',
      detectKeywords:['民族班'], excludeKeywords:['少数民族预科','预科班'],
      reviewTips:['需复核民族身份','需复核民族班专业志愿和当年计划说明']
    },
    {
      id:'borderChildPrep', group:'民族 / 预科', name:'边防军人子女预科班', category:'hide', defaultStatus:'unreviewed', allowValue:'eligible',
      detectKeywords:['边防军人子女预科','边防子女预科','边防军人子女'],
      reviewTips:['需复核审定名单','需复核预科专业志愿和招生章程']
    },
    {
      id:'ruralFreeMedical', group:'医学定向', name:'农村订单定向免费医学生', category:'hide', defaultStatus:'unreviewed', allowValue:'eligible',
      detectKeywords:['农村订单定向免费医学生','免费医学生','订单定向医学生','农村订单定向'],
      reviewTips:['需复核定向协议、服务地和履约要求','不应按普通医学专业直接比较']
    },
    {
      id:'villageDoctor', group:'医学定向', name:'乡村医生委托定向培养', category:'hide', defaultStatus:'unreviewed', allowValue:'eligible',
      detectKeywords:['乡村医生委托定向培养','乡村医生定向','委托定向培养'],
      reviewTips:['需复核委托培养协议、服务期限、就业去向和专业说明']
    },
    {
      id:'highLevelAthlete', group:'特殊招生入口', name:'高水平运动队', category:'hide', defaultStatus:'unreviewed', allowValue:'eligible',
      detectKeywords:['高水平运动队','高水平运动员'],
      reviewTips:['需复核高水平运动队资格、文化成绩要求和填报要求']
    },
    {
      id:'militaryPoliceJustice', group:'提前批 / 特殊提醒', name:'军队 / 公安 / 司法 / 飞行学员 / 定向培养军士', category:'warn', defaultStatus:'warn', allowValue:'ack',
      detectKeywords:['军队院校','公安院校','公安类','司法类','飞行学员','飞行技术','定向培养军士','军士'],
      reviewTips:['通常涉及提前批、政审、体检、面试或体能要求','不要按普通本科批平行志愿直接理解']
    },
    {
      id:'publicFundedTeacher', group:'提前批 / 特殊提醒', name:'公费师范 / 本研衔接师范生公费教育', category:'warn', defaultStatus:'warn', allowValue:'ack',
      detectKeywords:['公费师范','本研衔接师范','师范生公费教育','优师专项'],
      reviewTips:['需复核协议、履约、任教服务地和录取批次']
    },
    {
      id:'comprehensiveEvaluation', group:'提前批 / 特殊提醒', name:'综合评价录取', category:'warn', defaultStatus:'warn', allowValue:'ack',
      detectKeywords:['综合评价录取','综合评价招生','综合评价'],
      reviewTips:['不是普通平行志愿逻辑，需复核校测、资格和章程']
    },
    {
      id:'navigationHardship', group:'提前批 / 特殊提醒', name:'航海类等艰苦专业', category:'warn', defaultStatus:'warn', allowValue:'ack',
      detectKeywords:['航海类','航海技术','轮机工程','船舶电子电气工程'],
      reviewTips:['需复核身体条件、就业环境、培养方向和录取批次']
    },
    {
      id:'marxTheorySpecial', group:'提前批 / 特殊提醒', name:'全国重点马克思主义学院马克思主义理论专业', category:'warn', defaultStatus:'warn', allowValue:'ack',
      detectKeywords:['马克思主义理论'],
      reviewTips:['如属于提前批特殊安排，需按当年招生章程复核']
    }
  ];
  const later=['强基计划','少年班','保送生','港澳高校','艺术类','体育类'];
  window.LN_QUALIFICATION_GATE_RULES_V296={version:'V2.9.7',gates,later,ready:true};
})();
/* ===== END assets/qualification-gate-rules.v297fix2.js ===== */


/* ===== BEGIN assets/qualification-gate.v297fix2.js ===== */
// V2.9.7 qualification gate engine: detects special admissions entries and decides hide/warn.
(function(){
  const KEY='ln_qualification_gate_state_v297';
  function rules(){return window.LN_QUALIFICATION_GATE_RULES_V296?.gates || [];}
  function defaults(){const s={}; rules().forEach(g=>{s[g.id]=g.defaultStatus||'unreviewed';}); return s;}
  function readState(){
    let s=defaults();
    try{const raw=localStorage.getItem(KEY); if(raw){s={...s,...JSON.parse(raw)};}}catch(e){}
    // V2.9.7: special-plan status is managed inside the unified qualification gate.
    // The old specialPlanStatus field is kept only as a hidden compatibility element,
    // and must not overwrite the drawer state.
    return s;
  }
  function writeState(state){try{localStorage.setItem(KEY,JSON.stringify({...readState(),...(state||{})}));}catch(e){}}
  function blob(r){return [r?.major,r?.cleanMajor,r?.admissionMajor,r?.planType,r?.batch,r?.remark,r?.school,r?.majorText,(r?.riskFlags||[]).join(' ')].map(x=>String(x||'')).join(' ').replace(/\s+/g,'');}
  function matchRule(r,g){
    const b=blob(r); if(!b)return false;
    if((g.excludeKeywords||[]).some(k=>b.includes(String(k).replace(/\s+/g,''))))return false;
    return (g.detectKeywords||[]).some(k=>b.includes(String(k).replace(/\s+/g,'')));
  }
  function matchedGates(r){return rules().filter(g=>matchRule(r,g));}
  function check(r,snapshot){
    const state=snapshot?.qualificationGate || readState();
    const matches=matchedGates(r);
    if(!matches.length) return {matched:false,blocked:false,gates:[],warnings:[],labels:[],reviewTips:[]};
    const labels=[], warnings=[], reviewTips=[];
    for(const g of matches){
      const status=state[g.id] || g.defaultStatus || 'unreviewed';
      labels.push(g.name); (g.reviewTips||[]).forEach(x=>reviewTips.push(x));
      if(g.category==='hide' && status!==g.allowValue){
        return {matched:true,blocked:true,gateId:g.id,statKey:'资格入口隐藏:'+g.name,label:g.name,reason:'未确认资格，默认隐藏',gate:g,gates:matches,labels,reviewTips};
      }
      if(g.category==='warn') warnings.push(g.name);
    }
    return {matched:true,blocked:false,gates:matches,labels:[...new Set(labels)],warnings:[...new Set(warnings)],reviewTips:[...new Set(reviewTips)]};
  }
  function summary(){
    const st=readState();
    const hideRules=rules().filter(g=>g.category==='hide');
    const enabled=hideRules.filter(g=>st[g.id]===g.allowValue).map(g=>g.name);
    const hidden=hideRules.filter(g=>st[g.id]!==g.allowValue).length;
    const text=enabled.length?`已纳入：${enabled.slice(0,3).join('、')}${enabled.length>3?'等':''}`:`默认隐藏 ${hidden} 类资格型入口`;
    return {enabled,hidden,total:rules().length,text};
  }
  function specialPlanStatus(){
    const st=readState();
    if(st.eduSpecialPlan==='eligible' || st.lnRuralSpecial==='eligible') return 'approved';
    if(st.eduSpecialPlan==='unknown' || st.lnRuralSpecial==='unknown') return 'unknown';
    return 'unreviewed';
  }
  function compactLabels(r){const c=check(r);return c.matched?c.labels:[];}
  window.LN_QUALIFICATION_GATE_V296={readState,writeState,check,matchedGates,compactLabels,summary,specialPlanStatus,ready:true};
})();
/* ===== END assets/qualification-gate.v297fix2.js ===== */


/* ===== BEGIN assets/qualification-gate-ui.v297fix2.js ===== */
// V2.9.7 qualification gate UI: compact summary card + drawer manager.
(function(){
  function esc(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));}
  function grouped(){const map={}; (window.LN_QUALIFICATION_GATE_RULES_V296?.gates||[]).forEach(g=>{(map[g.group]||(map[g.group]=[])).push(g);}); return map;}
  function summaryData(){return window.LN_QUALIFICATION_GATE_V296?.summary?.() || {enabled:[],hidden:0,total:0,text:'默认隐藏需资格入口'};}
  function renderSummary(){
    const el=document.getElementById('qualificationGateSummaryV296'); if(!el)return;
    const s=summaryData();
    const enabled=s.enabled||[];
    const main=enabled.length ? `已纳入 ${enabled.length} 类资格入口` : `默认隐藏 ${s.hidden||0} 类资格入口`;
    const sub=enabled.length ? `已纳入：${enabled.slice(0,3).join('、')}${enabled.length>3?'等':''}` : '高校专项、预科/民族班、定向等';
    el.innerHTML=`<b>${esc(main)}</b><span>${esc(sub)}</span>`;
  }
  function row(g,state){
    const isHide=g.category==='hide'; const val=state[g.id] || g.defaultStatus || 'unreviewed';
    const opts=isHide
      ? [['unreviewed','未确认，默认隐藏'],['eligible','符合条件，可纳入比较'],['notConsider','不考虑']]
      : [['warn','仅提示复核'],['ack','已了解，保留提醒']];
    const badge=isHide?'默认隐藏':'提醒';
    return `<div class="qgate-row-v297"><div><div class="qgate-row-title-v297"><b>${esc(g.name)}</b><em>${esc(badge)}</em></div><p>${esc((g.reviewTips||[]).slice(0,2).join('；'))}</p></div><select data-action="qualification-gate-change" data-gate-id="${esc(g.id)}">${opts.map(o=>`<option value="${o[0]}" ${val===o[0]?'selected':''}>${esc(o[1])}</option>`).join('')}</select></div>`;
  }
  function drawerHtml(){
    const st=window.LN_QUALIFICATION_GATE_V296?.readState?.()||{};
    const s=summaryData();
    const groups=grouped();
    return `<div class="qgate-drawer-v297"><div class="qgate-drawer-head-v297"><b>统一管理资格型入口</b><span>${esc(s.enabled?.length?`已纳入 ${s.enabled.length} 类；其余继续默认隐藏`:`默认隐藏 ${s.hidden||0} 类需资格入口`)}</span></div><p class="small">未确认资格前，系统默认隐藏高校专项、预科/民族班、定向培养等特殊入口，避免误当普通本科志愿。系统不替用户判断资格，只根据你确认的状态纳入比较。</p>${Object.keys(groups).map(k=>`<section><h4>${esc(k)}</h4>${groups[k].map(g=>row(g,st)).join('')}</section>`).join('')}<div class="qgate-later-v297"><b>后续仅作为提醒扩展：</b>${esc((window.LN_QUALIFICATION_GATE_RULES_V296?.later||[]).join('、'))}</div></div>`;
  }
  function openDrawer(){window.LN_DRAWER_V296?.open?.('资格型入口保护',drawerHtml());}
  function change(id,value){
    if(!id)return; const s={}; s[id]=value; window.LN_QUALIFICATION_GATE_V296?.writeState?.(s); renderSummary();
    if(window.LN_DRAWER_V296?.isOpen?.()) openDrawer();
    if(window.LN_REFRESH_SCHEDULER_V296?.request) window.LN_REFRESH_SCHEDULER_V296.request({reason:'qualification-gate-change',level:'soft',delay:180});
    else if(typeof autoRefresh==='function') autoRefresh('qualification-gate-change');
  }
  function noticeHtml(hidden){return `<b>资格型入口保护：</b>高校专项、预科/民族班、定向培养等已统一纳入资格入口保护。当前已隐藏 ${Number(hidden||0).toLocaleString('zh-CN')} 条；如确有资格，可在“管理资格入口”中放开比较。`;}
  window.LN_QUALIFICATION_GATE_UI_V296={renderSummary,openDrawer,change,noticeHtml,ready:true};
  setTimeout(renderSummary,0);
})();
/* ===== END assets/qualification-gate-ui.v297fix2.js ===== */


/* ===== BEGIN assets/student-profile-rules.v2981.js ===== */
// V2.9.8.1 student profile rules: profile only changes explanation priority, never hard filters; aliases fixed.
(function(){
  const STORAGE_KEY='ln_student_profile_state_v298';
  const DEFAULT_STATE={gender:'unspecified',source:'unconfirmed',learning:'unclear',load:'unknown',path:'unknown',understanding:'unclear',updatedAt:'',schemaVersion:1};
  const OPTIONS={
    gender:[['unspecified','不填写'],['female','女'],['male','男']],
    source:[['child_self','孩子自己表达'],['parent_observe','家长观察'],['family_discussion','家庭讨论'],['unconfirmed','暂未确认']],
    learning:[['science','偏理工'],['expression','偏表达'],['practice','偏动手实践'],['path_clear','偏稳定路径'],['unclear','暂不确定']],
    load:[['normal','正常'],['sensitive','对强度较敏感'],['unknown','暂不确定']],
    path:[['grad_ok','能接受读研'],['exam_ok','能接受考证考编'],['work_first','更希望本科就业'],['unknown','暂不确定']],
    understanding:[['has_direction','已有大概方向'],['hot_words','只知道几个热门词'],['unclear','还没想清楚']]
  };
  function safe(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));}
  function optionLabel(group,value){const hit=(OPTIONS[group]||[]).find(x=>x[0]===value); return hit?hit[1]:value;}
  function currentGenderFromDom(){return document.getElementById('studentGender')?.value || 'unspecified';}
  function defaultState(){return Object.assign({}, DEFAULT_STATE, {gender:currentGenderFromDom()||'unspecified'});}
  function readState(){
    try{const raw=localStorage.getItem(STORAGE_KEY); const parsed=raw?JSON.parse(raw):{}; return Object.assign(defaultState(), parsed||{}, {gender: parsed?.gender || currentGenderFromDom() || 'unspecified'});}catch(e){return defaultState();}
  }
  function saveState(next){
    const s=Object.assign(defaultState(), next||{});
    Object.keys(OPTIONS).forEach(k=>{if(!OPTIONS[k].some(x=>x[0]===s[k])) s[k]=DEFAULT_STATE[k]||OPTIONS[k][0][0];});
    s.updatedAt=new Date().toISOString();
    try{localStorage.setItem(STORAGE_KEY, JSON.stringify(s));}catch(e){}
    const genderEl=document.getElementById('studentGender'); if(genderEl && s.gender) genderEl.value=s.gender;
    window.LN_STATE_SNAPSHOT_V296?.reset?.();
    window.LN_CANDIDATE_CACHE_V296?.reset?.();
    return s;
  }
  function tagsFromState(s){
    const tags=[];
    if(s.gender==='female') tags.push('画像：女孩');
    if(s.gender==='male') tags.push('画像：男孩');
    if(s.learning==='science') tags.push('偏理工');
    if(s.learning==='expression') tags.push('偏表达');
    if(s.learning==='practice') tags.push('偏实践');
    if(s.learning==='path_clear') tags.push('关注路径清楚');
    if(s.load==='sensitive') tags.push('学习强度需复核');
    if(s.path==='grad_ok') tags.push('可接受读研');
    if(s.path==='exam_ok') tags.push('可接受考证考编');
    if(s.path==='work_first') tags.push('本科就业优先');
    if(s.understanding==='hot_words') tags.push('需分清热门词');
    return tags;
  }
  function deriveProfile(state){
    const s=state||readState(); const preferenceTags=[]; const reviewTags=[];
    if(s.learning==='expression') preferenceTags.push('expression','humanities');
    if(s.learning==='science') preferenceTags.push('science','engineering');
    if(s.learning==='practice') preferenceTags.push('practice','engineering');
    if(s.learning==='path_clear') preferenceTags.push('path_clear');
    if(s.load==='sensitive') reviewTags.push('learning_load');
    if(s.path==='grad_ok') preferenceTags.push('grad_path');
    if(s.path==='exam_ok') preferenceTags.push('exam_path');
    if(s.path==='work_first') preferenceTags.push('work_first');
    if(s.understanding==='hot_words'||s.understanding==='unclear') reviewTags.push('misread_review');
    return {state:s, tags:tagsFromState(s), preferenceTags:[...new Set(preferenceTags)], reviewTags:[...new Set(reviewTags)], hardExclude:false};
  }
  function summary(){
    const s=readState(); const tags=tagsFromState(s);
    if(!tags.length) return {title:'孩子学习特点未补充', text:'可选填，主要用于提醒和排序微调，不作为硬排除条件。', tags:[]};
    return {title:'孩子学习特点已补充', text:tags.slice(0,4).join('｜'), tags};
  }
  const api={OPTIONS, optionLabel, safe, readState, saveState, deriveProfile, summary, ready:true}; window.LN_STUDENT_PROFILE_RULES_V2981=api; window.LN_STUDENT_PROFILE_RULES_V298=api; window.LN_STUDENT_PROFILE_RULES_V2976=api; window.LN_STUDENT_PROFILE_RULES_V2975=api;
})();
/* ===== END assets/student-profile-rules.v2981.js ===== */


/* ===== BEGIN assets/student-profile-ui.v2981.js ===== */
// V2.9.8.1 student profile UI: profile bridge refreshes interest cards.
(function(){
  function rules(){return window.LN_STUDENT_PROFILE_RULES_V298;}
  function esc(v){return rules()?.safe?.(v) || String(v??'');}
  function renderSummary(){
    const box=document.getElementById('studentProfileBoxV2975'); if(!box||!rules()) return;
    const sum=rules().summary();
    box.innerHTML=`<div class="student-profile-compact-v2975">
      <div><b>${esc(sum.title)}</b><span>${esc(sum.text)}</span></div>
      <button class="execute-secondary" data-action="open-student-profile">补充画像</button>
    </div>`;
  }
  function selectField(key,state){
    const opts=rules().OPTIONS[key]||[];
    return `<select id="studentProfile_${esc(key)}">${opts.map(([v,l])=>`<option value="${esc(v)}" ${state[key]===v?'selected':''}>${esc(l)}</option>`).join('')}</select>`;
  }
  function openDrawer(){
    if(!rules()) return;
    const s=rules().readState();
    const body=`<div class="student-profile-drawer-v2975">
      <p class="drawer-help-v296">学生孩子学习特点主要用于提醒和排序微调，不作为硬排除条件。性别不会直接决定推荐专业。</p>
      <div class="student-profile-grid-v2975">
        <label><span>性别</span>${selectField('gender',s)}</label>
        <label><span>想法来源</span>${selectField('source',s)}</label>
        <label><span>学习偏好</span>${selectField('learning',s)}</label>
        <label><span>学习强度感受</span>${selectField('load',s)}</label>
        <label><span>后续路径接受度</span>${selectField('path',s)}</label>
        <label><span>专业理解状态</span>${selectField('understanding',s)}</label>
      </div>
      <div class="profile-note-v2975">提示：如果这里是家长观察，建议后续再让孩子确认一次。</div>
    </div>`;
    window.LN_DRAWER_V296?.open?.('孩子学习特点', body);
    bindDrawer();
  }
  function bindDrawer(){
    document.querySelectorAll('[id^="studentProfile_"]').forEach(el=>{
      if(el.dataset.boundV2975) return; el.dataset.boundV2975='1';
      el.addEventListener('change',()=>{
        const cur=rules().readState();
        const key=el.id.replace('studentProfile_',''); cur[key]=el.value;
        rules().saveState(cur); renderSummary();
        window.LN_DEBUG_V2983?.log?.('student-profile-change',{key,value:el.value});
        window.LN_PROFILE_INTEREST_SUMMARY_V2981FIX2?.patchChildInterestSummary?.();
        window.LN_CHILD_INTEREST_UI_V296?.renderSummary?.();
        // V2.9.8.3: 画像只调整提醒/排序，不在抽屉内每次选择时触发全量候选计算。
        window.LN_REFRESH_SCHEDULER_V296?.request?.({reason:'student-profile-change',level:'render-only',delay:420,render:function(){
          try{window.LN_PROFILE_INTEREST_SUMMARY_V2981FIX2?.patchChildInterestSummary?.();}catch(e){}
        }});
      });
    });
  }
  const api={renderSummary,openDrawer,ready:true}; window.LN_STUDENT_PROFILE_UI_V2981=api; window.LN_STUDENT_PROFILE_UI_V298=api; window.LN_STUDENT_PROFILE_UI_V2975=api;
})();
/* ===== END assets/student-profile-ui.v2981.js ===== */


/* ===== BEGIN assets/profile-interest-bridge-rules.v2981.js ===== */
// V2.9.8.1 profile-interest bridge: profile changes prompt/order only, never filters majors.
(function(){
  function profileRules(){ return window.LN_STUDENT_PROFILE_RULES_V298 || window.LN_STUDENT_PROFILE_RULES_V2976 || window.LN_STUDENT_PROFILE_RULES_V2975; }
  function state(){ return profileRules()?.readState?.() || {}; }
  const orders={
    female:['want_medical','pharmacy','animal_life','teacher_exam','law_expression','stable','computer_ai','electric_energy','electronic_chip','mechanical_instrument','city_development','unclear'],
    male:['computer_ai','electric_energy','electronic_chip','mechanical_instrument','want_medical','pharmacy','animal_life','city_development','stable','teacher_exam','law_expression','unclear'],
    science:['computer_ai','electric_energy','electronic_chip','mechanical_instrument','city_development','animal_life','want_medical','pharmacy','stable','unclear'],
    expression:['law_expression','teacher_exam','stable','city_development','want_medical','pharmacy','animal_life','computer_ai','unclear'],
    practice:['animal_life','mechanical_instrument','electric_energy','pharmacy','want_medical','city_development','computer_ai','stable','unclear'],
    path_clear:['stable','teacher_exam','electric_energy','pharmacy','want_medical','law_expression','computer_ai','city_development','unclear']
  };
  function rankMap(arr){ const m=new Map(); (arr||[]).forEach((id,i)=>{ if(!m.has(id)) m.set(id,i); }); return m; }
  function interestOrder(){
    const s=state();
    let ids=[];
    if(s.learning && orders[s.learning]) ids=ids.concat(orders[s.learning]);
    if(s.gender && orders[s.gender]) ids=ids.concat(orders[s.gender].map((x,i)=>({id:x, i:i+20})).sort((a,b)=>a.i-b.i).map(x=>x.id));
    if(!ids.length) return null;
    return [...new Set(ids)];
  }
  function sortIntents(intents){
    const order=interestOrder();
    if(!order) return (intents||[]).slice();
    const m=rankMap(order);
    return (intents||[]).slice().sort((a,b)=>(m.has(a.id)?m.get(a.id):99)-(m.has(b.id)?m.get(b.id):99));
  }
  function notice(){
    const s=state(); const lines=[];
    if(s.source==='parent_observe') lines.push('当前画像来自家长观察，建议后续让孩子确认一次。');
    if(s.source==='family_discussion') lines.push('当前画像来自家庭讨论，系统按中等偏好处理。');
    if(s.source==='child_self') lines.push('当前画像来自孩子自己表达，兴趣权重可以略高。');
    if(s.load==='sensitive') lines.push('学习强度较敏感：强数学、强代码、医学长周期方向会前置复核提醒。');
    if(s.path==='work_first') lines.push('本科就业优先：遇到读研依赖方向会提醒复核本科出口。');
    if(s.path==='grad_ok') lines.push('能接受读研：深造依赖方向不直接降权，但仍需看本科平台。');
    if(s.understanding==='hot_words') lines.push('只知道热门词：系统会强化易混专业和本科目录代码提醒。');
    return lines.slice(0,3);
  }
  function summaryText(){
    const lines=notice();
    if(!lines.length) return '孩子学习特点主要用于提醒和排序微调，不作为硬排除条件。';
    return lines.join(' ');
  }
  window.LN_PROFILE_INTEREST_BRIDGE_V2981={state,sortIntents,notice,summaryText,ready:true};
})();
/* ===== END assets/profile-interest-bridge-rules.v2981.js ===== */


/* ===== V2.93RC1 infraCore final marker ===== */
(function(){
  try{
    window.LN_V293RC1_MERGE = window.LN_V293RC1_MERGE || {};
    window.LN_V293RC1_MERGE.infraCore.ready = true;
    window.LN_DEBUG_V2983 && window.LN_DEBUG_V2983.setFlags && window.LN_DEBUG_V2983.setFlags({v293rc1:true, infraCore:'v293rc1'});
  }catch(e){}
})();

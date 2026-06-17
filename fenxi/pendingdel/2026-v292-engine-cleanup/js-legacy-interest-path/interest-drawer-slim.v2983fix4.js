// V2.9.8.3.fix4 interest drawer slim path: open/toggle/close must stay UI-only; heavy matching runs after drawer close via scheduler.
(function(){
  const VERSION='V2.9.8.3.fix4';
  const STAMP='2983fix4-20260511';
  const perf=()=>window.performance&&performance.now?performance.now():Date.now();
  function dbg(name,obj){try{window.LN_DEBUG_V2983?.detail?.(name,Object.assign({version:STAMP},obj||{}));}catch(e){}}
  function log(action,data){try{window.LN_DEBUG_V2983?.log?.(action,data||{});}catch(e){}}
  function esc(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));}
  function rt(){return window.LN_CHILD_INTEREST_RUNTIME_V296||window.LN_CHILD_INTEREST_RUNTIME_V298;}
  function tr(){return window.LN_CHILD_INTENT_TRANSLATOR_V298||window.LN_CHILD_INTENT_TRANSLATOR_V2976||window.LN_CHILD_INTENT_TRANSLATOR_V2975;}
  function drawer(){return window.LN_DRAWER_V296;}
  let dirty=false;
  let closePatched=false;
  let lastOpenAt=0;
  function isDrawerOpen(){return !!(drawer()?.isOpen?.() && window.__LN_ACTIVE_DRAWER_TYPE==='childInterest');}
  function maxGroups(){return rt()?.groups?.().length?((window.LN_INTEREST_TAXONOMY_V2976||{}).maxGroups||3):3;}
  function read(){return rt()?.readState?.()||{selectedGroups:[],disabledAutoMappings:[]};}
  function save(s){return rt()?.saveState?.(s)||s;}
  function selectedIntentIds(){try{return tr()?.readState?.().selectedIntentIds||[];}catch(e){return [];}}
  function activeAutoMappings(){try{return rt()?.autoMappings?.(read())||[];}catch(e){return [];}}
  function selectedNames(s){const r=rt(); const manual=(s.selectedGroups||[]).map(id=>r?.groupById?.(id)).filter(Boolean).map(g=>g.name); const autos=activeAutoMappings().map(x=>x.label); return [...new Set([...manual,...autos])];}
  function setDirty(reason){dirty=true; window.__LN_INTEREST_DIRTY_V2983FIX4=true; dbg('interestDirty',{reason,drawerOpen:isDrawerOpen(),selected:read().selectedGroups||[],auto:activeAutoMappings().map(x=>x.label)});}
  function flush(reason){
    if(!dirty && !window.__LN_INTEREST_DIRTY_V2983FIX4){return false;}
    const t=perf(); dirty=false; window.__LN_INTEREST_DIRTY_V2983FIX4=false;
    try{rt()?.render?.();}catch(e){}
    // Do not run interest hit aggregate inline. Main compute pipeline will refresh once; aggregate can stay cached.
    try{window.LN_REFRESH_SCHEDULER_V296?.request?.({reason:'child-interest-flush-'+(reason||'close'),level:'soft',delay:650});}catch(e){}
    dbg('interestFlushBreakdown',{reason,ms:Math.round(perf()-t)});
    return true;
  }
  function patchClose(){
    const d=drawer(); if(!d||closePatched||typeof d.close!=='function')return;
    const old=d.close;
    d.close=function(){const t=perf(); const was=window.__LN_ACTIVE_DRAWER_TYPE; const r=old.apply(d,arguments); if(was==='childInterest'){setTimeout(()=>flush('drawer-close'),0);} dbg('drawerCloseBreakdown',{type:was,ms:Math.round(perf()-t),dirty:!!dirty}); return r;};
    closePatched=true;
  }
  function markCardStates(){
    const t=perf(); const s=read(); const selected=new Set(s.selectedGroups||[]); const autoIds=new Set(activeAutoMappings().map(x=>x.interestId));
    document.querySelectorAll('[data-child-interest-group]').forEach(card=>{const id=card.dataset.childInterestGroup; card.classList.toggle('active',selected.has(id)); card.classList.toggle('auto-mapped-v2976',autoIds.has(id)); const g=rt()?.groupById?.(id); const b=card.querySelector('strong'); if(b&&g)b.textContent=g.name+(autoIds.has(id)?'｜已激活':'');});
    const intentSet=new Set(selectedIntentIds()); document.querySelectorAll('[data-child-intent-id]').forEach(btn=>btn.classList.toggle('active',intentSet.has(btn.dataset.childIntentId)));
    const line=document.querySelector('.child-interest-selected-line-v296'); if(line)line.innerHTML=selectedLineHtml(s);
    const names=selectedNames(s); const live=document.querySelector('.interest-drawer-live-v298'); if(live){const b=live.querySelector('b'); const sp=live.querySelector('span'); const p=live.querySelector('p'); if(b)b.textContent='孩子兴趣'; if(sp)sp.textContent=names.length?'已选：'+names.join('、'):'当前为综合推荐'; if(p)p.textContent=dirty?'已记录，关闭抽屉后统一刷新结果。':'点选只更新状态，不会在抽屉内重算候选。';}
    dbg('interestDrawerSelectionOnly',{ms:Math.round(perf()-t),selected:[...(s.selectedGroups||[])],auto:[...autoIds]});
  }
  function selectedLineHtml(s){
    const r=rt(); const manual=(s.selectedGroups||[]).map(id=>r?.groupById?.(id)).filter(Boolean);
    const auto=activeAutoMappings();
    const html=[];
    manual.forEach(g=>html.push(`<span>${esc(g.name)}<button data-action="child-interest-remove" data-interest-id="${esc(g.id)}">×</button></span>`));
    auto.forEach(x=>html.push(`<span class="auto-interest-chip-v2976">${esc(x.label)}<button data-action="child-interest-auto-toggle" data-intent-id="${esc(x.intentId)}" data-interest-id="${esc(x.interestId)}">×</button></span>`));
    return html.join('')||'<em>当前为综合推荐</em>';
  }
  function intentPanel(){
    const api=tr(); const intents=api?.intents||[]; const ids=new Set(selectedIntentIds());
    if(!intents.length)return '';
    return `<div class="child-intent-panel-v2975 interest-lite-intents-v2983fix4"><div class="intent-head-v2975"><div><b>孩子说法</b><span>点选只记录兴趣线索，关闭抽屉后再统一刷新候选。</span></div><em>最多选 3 个</em></div><div class="intent-grid-v2975">${intents.map(i=>`<button type="button" class="intent-chip-v2975 ${ids.has(i.id)?'active':''}" data-child-intent-id="${esc(i.id)}"><b>${esc(i.short)}</b><span>${esc(i.label)}</span></button>`).join('')}</div></div>`;
  }
  function groupCard(g,s,q){
    const on=(s.selectedGroups||[]).includes(g.id); const auto=activeAutoMappings().some(x=>x.interestId===g.id);
    const text=[g.name,g.desc,(g.match?.core||[]).join(' '),(g.match?.related||[]).join(' '),(g.match?.review||[]).join(' ')].join(' '); if(q&&!text.includes(q))return '';
    const core=(g.match?.core||[]).slice(0,3).join('、');
    return `<button type="button" class="child-interest-card-v296 interest-lite-card-v2983fix4 ${on?'active':''} ${auto?'auto-mapped-v2976':''}" data-child-interest-group="${esc(g.id)}"><div class="card-main-v296"><strong>${esc(g.name)}${auto?'｜已激活':''}</strong><span>${esc(g.desc||'')}</span><em>${esc(core?('正主：'+core):'关闭后计算真实候选')}</em></div></button>`;
  }
  function renderDrawerBody(){
    const t=perf(); const r=rt(); if(!r)return; const s=read(); const q=(window.__LN_INTEREST_SEARCH_V2983FIX4||'').trim(); const names=selectedNames(s);
    const body=`<div class="child-interest-drawer-v296 child-interest-drawer-v298 interest-drawer-slim-v2983fix4"><p class="drawer-help-v296">本抽屉只做轻量点选。真实命中、A/B/C 和详细候选会在关闭后统一刷新，避免边点边卡。</p>${intentPanel()}<div class="interest-drawer-live-v298"><b>孩子兴趣</b><span>${names.length?'已选：'+esc(names.join('、')):'当前为综合推荐'}</span><p>点选只更新状态，不在抽屉内重算候选。</p></div><div class="child-interest-selected-line-v296">${selectedLineHtml(s)}</div><div class="child-interest-search-v296"><input id="childInterestSearchV296" placeholder="搜索专业方向，例如：动物医学、法学、电气、仪器" value="${esc(q)}"/><button class="secondary slim" data-action="child-interest-undecided">清空</button></div><div class="child-interest-grid-v296 interest-lite-grid-v2983fix4">${r.groups().map(g=>groupCard(g,s,q)).join('')||'<div class="notice">没有匹配方向，可以换一个关键词。</div>'}</div><div class="child-interest-cycle-v296"><b>提示：</b>先把孩子想法选出来，关闭抽屉后再看真实候选命中。</div></div>`;
    drawer()?.setBody?.(body);
    const input=document.getElementById('childInterestSearchV296');
    if(input&&!input.dataset.slimBound){input.dataset.slimBound='1'; let timer=null; input.addEventListener('input',()=>{window.__LN_INTEREST_SEARCH_V2983FIX4=input.value; clearTimeout(timer); timer=setTimeout(renderDrawerBody,180);});}
    dbg('interestDrawerRenderMs',{ms:Math.round(perf()-t),groups:r.groups().length,intents:(tr()?.intents||[]).length,htmlLength:body.length});
  }
  function openDrawer(){const t=perf(); patchClose(); window.__LN_ACTIVE_DRAWER_TYPE='childInterest'; lastOpenAt=t; drawer()?.open?.('孩子兴趣与真实候选匹配','<div class="notice">正在加载兴趣方向...</div>'); renderDrawerBody(); dbg('interestDrawerOpenBreakdown',{ms:Math.round(perf()-t),version:STAMP}); return true;}
  function toggleGroupLite(id){
    const t=perf(); const r=rt(); const g=r?.groupById?.(id); if(!g)return {ok:false,reason:'not_found'}; const s=read(); let arr=s.selectedGroups||[];
    if(arr.includes(id))arr=arr.filter(x=>x!==id); else{if(arr.length>=maxGroups())return {ok:false,reason:'max'}; arr=[...arr,id];}
    save(Object.assign(s,{selectedGroups:arr})); setDirty('toggleGroup'); markCardStates(); dbg('interestToggleDeepBreakdown',{id,ms:Math.round(perf()-t),selected:arr}); return {ok:true};
  }
  function removeGroupLite(id){const t=perf(); const s=read(); save(Object.assign(s,{selectedGroups:(s.selectedGroups||[]).filter(x=>x!==id)})); setDirty('removeGroup'); markCardStates(); dbg('interestRemoveBreakdown',{id,ms:Math.round(perf()-t)}); return true;}
  function toggleAutoLite(intentId,interestId){const t=perf(); const s=read(); const key=intentId+'|'+interestId; const set=new Set(s.disabledAutoMappings||[]); if(set.has(key))set.delete(key); else set.add(key); save(Object.assign(s,{disabledAutoMappings:[...set]})); setDirty('toggleAuto'); markCardStates(); dbg('interestAutoToggleDeepBreakdown',{intentId,interestId,disabled:[...set],ms:Math.round(perf()-t)}); return true;}
  function undecidedLite(){const t=perf(); const s=Object.assign(read(),{mode:'undecided',selectedGroups:[],selectedMajors:[],manualOnlyInterest:false,disabledAutoMappings:[]}); try{tr()?.clear?.();}catch(e){} save(s); setDirty('undecided'); markCardStates(); dbg('interestUndecidedBreakdown',{ms:Math.round(perf()-t)}); return true;}
  function toggleIntentLite(id){const t=perf(); const res=tr()?.toggle?.(id); setDirty('intentToggle'); markCardStates(); dbg('interestIntentToggleBreakdown',{id,ok:!(res&&res.ok===false),reason:res?.reason||'',ms:Math.round(perf()-t)}); return res||{ok:true};}
  function handleLite(action,el){
    if(action==='child-interest-start')return openDrawer();
    if(action==='child-interest-undecided')return undecidedLite();
    if(action==='child-interest-remove')return removeGroupLite(el?.dataset?.interestId||'');
    if(action==='child-interest-auto-toggle')return toggleAutoLite(el?.dataset?.intentId||'',el?.dataset?.interestId||'');
    if(action==='child-intent-remove'){try{tr()?.remove?.(el?.dataset?.intentId||'');}catch(e){} setDirty('intentRemove'); markCardStates(); return true;}
    return false;
  }
  function patchRuntime(){
    const r=rt(); if(!r||r.__v2983fix4Slim)return false;
    r.toggleGroup=toggleGroupLite; r.removeGroup=removeGroupLite; r.toggleAuto=toggleAutoLite; r.undecided=undecidedLite; r.start=openDrawer; r.handle=handleLite; r.flushPendingRefresh=flush; r.render=()=>{try{window.LN_CHILD_INTEREST_UI_V296?.renderSummary?.();}catch(e){}}; r.refreshLight=function(reason){if(isDrawerOpen()){markCardStates();setDirty(reason||'refreshLight');return true;} try{window.LN_CHILD_INTEREST_UI_V296?.renderSummary?.();}catch(e){} return true;}; r.__v2983fix4Slim=true; r.version=VERSION; dbg('interestRuntimePatch',{ok:true,version:STAMP}); return true;
  }
  function patchUI(){
    const u=window.LN_CHILD_INTEREST_UI_V296||window.LN_CHILD_INTEREST_UI_V298; if(!u||u.__v2983fix4Slim)return false;
    u.openDrawer=openDrawer; u.renderDrawerBody=renderDrawerBody; u.renderDrawerSelectionOnly=markCardStates; u.__v2983fix4Slim=true; u.version=VERSION; dbg('interestUIPatch',{ok:true,version:STAMP}); return true;
  }
  function patchHitSummary(){
    const h=window.LN_INTEREST_HIT_SUMMARY_V298; if(!h||h.__v2983fix4Policy)return false;
    h.scheduleAggregate=function(rs,delay){const t=perf(); const c=window.__LN_INTEREST_HIT_CACHE_V298=window.__LN_INTEREST_HIT_CACHE_V298||{}; c.__pending=false; dbg('interestAggregatePolicy',{mode:'skip-inline',delay,ms:Math.round(perf()-t)}); return false;};
    h.__v2983fix4Policy=true; return true;
  }
  function patchIntentCapture(){
    if(window.__LN_INTEREST_INTENT_CAPTURE_V2983FIX4)return; window.__LN_INTEREST_INTENT_CAPTURE_V2983FIX4=true;
    document.addEventListener('click',function(e){const btn=e.target.closest?.('[data-child-intent-id]'); if(!btn||!isDrawerOpen())return; e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation)e.stopImmediatePropagation(); const res=toggleIntentLite(btn.dataset.childIntentId); if(res&&res.ok===false){const host=document.querySelector('.child-interest-drawer-v296')||document.body; const tip=document.createElement('div'); tip.className='child-interest-toast-v296'; tip.textContent='建议最多选择 3 个最主要的想法。'; host.prepend(tip); setTimeout(()=>tip.remove(),2200);} },true);
  }
  function patch(){patchRuntime();patchUI();patchHitSummary();patchIntentCapture();document.body?.classList?.add('v2983fix4');}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',patch);else patch(); setTimeout(patch,0); setTimeout(patch,800);
  window.LN_INTEREST_DRAWER_SLIM_V2983FIX4={patch,flush,openDrawer,renderDrawerBody,ready:true,version:VERSION,stamp:STAMP};
})();

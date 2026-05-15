// V2.9.8 child interest runtime: catalog-code closed loop; soft boosts only.
(function(){
  const STORAGE_KEY='ln_child_interest_state_v2955';
  function tax(){ return window.LN_INTEREST_TAXONOMY_V2976 || window.LN_CHILD_INTEREST_RULES_V296 || {groups:[],maxGroups:3,defaultMode:'undecided'}; }
  function groups(){ return tax().groups || []; }
  function groupById(id){ return tax().groupById?.(id) || groups().find(g=>g.id===id) || null; }
  function defaultState(){ return {mode:'undecided',selectedGroups:[],disabledAutoMappings:[],selectedMajors:[],selectedKeywords:[],manualOnlyInterest:false,confidence:'low',source:'child_self',updatedAt:'',schemaVersion:3}; }
  function readState(){try{const raw=localStorage.getItem(STORAGE_KEY); if(!raw)return defaultState(); const s=JSON.parse(raw); return Object.assign(defaultState(),s||{},{selectedGroups:Array.isArray(s.selectedGroups)?s.selectedGroups:[],disabledAutoMappings:Array.isArray(s.disabledAutoMappings)?s.disabledAutoMappings:[]});}catch(e){return defaultState();}}
  function effectiveGroupIds(state){const s=state||readState(); return [...new Set([...(s.selectedGroups||[]),...autoMappings(s).map(x=>x.interestId)])];}
  function saveState(s){const next=Object.assign(defaultState(),s||{}); next.selectedGroups=[...new Set((next.selectedGroups||[]).filter(id=>groupById(id)))].slice(0,tax().maxGroups||3); next.disabledAutoMappings=[...new Set(next.disabledAutoMappings||[])]; const eff=effectiveGroupIds(next); next.mode=(next.selectedGroups.length||eff.length)?'selected':'undecided'; if(next.mode==='undecided')next.selectedGroups=[]; next.updatedAt=new Date().toISOString(); try{localStorage.setItem(STORAGE_KEY,JSON.stringify(next));}catch(e){} window.LN_STATE_SNAPSHOT_V296?.reset?.(); window.LN_CANDIDATE_CACHE_V296?.reset?.(); return next;}
  function autoMappings(state){const disabled=state?.disabledAutoMappings||[]; return (window.LN_CHILD_INTENT_INTEREST_MAP_V2976?.mappedFromSelected?.()||[]).filter(x=>!disabled.includes(x.intentId+'|'+x.interestId));}
  function autoByInterestId(state){const map={}; autoMappings(state||readState()).forEach(x=>{if(!map[x.interestId])map[x.interestId]=[]; map[x.interestId].push(x);}); return map;}
  function catalogMatch(record, interestId){return window.LN_CATALOG_MATCH_ENGINE_V298?.matchInterest?.(record,interestId) || null;}
  function matchRecordRaw(r){
    const s=(window.LN_STATE_SNAPSHOT_V296?.snapshot?.()?.child)||readState();
    const ids=effectiveGroupIds(s); if(!ids.length)return {active:false,level:'none',score:0,label:'综合推荐',group:null,note:'',boosts:{A:0,B:0,C:0},matches:[],reason:''};
    const wm=window.LN_INTEREST_WEIGHT_RULES_V298||window.LN_INTEREST_WEIGHT_RULES_V2976; if(!wm)return {active:false,level:'none',score:0,label:'综合推荐',group:null,note:'',boosts:{A:0,B:0,C:0},matches:[],reason:''};
    const ab=autoByInterestId(s);
    const matches=ids.map(id=>{const g=groupById(id); if(!g)return null; const cm=catalogMatch(r,id); const m=cm || (window.LN_INTEREST_MATCH_ENGINE_V2976?.matchGroup?.(r,g)) || {level:'none',label:'综合备选'}; const autos=ab[id]||[]; const isManual=(s.selectedGroups||[]).includes(id); const source=autos.length?'auto':(isManual?'manual':'unknown'); const intentShort=autos[0]?.short||autos[0]?.label||''; return Object.assign({},m,{group:g,interestId:id,source,intentId:autos[0]?.intentId||'',intentShort});}).filter(Boolean);
    const order={core:4,related:3,review:2,none:1,no:0};
    const best=matches.slice().sort((a,b)=>(order[b.level]-order[a.level]))[0]||{level:'none',label:'综合备选'};
    const boosts={A:0,B:0,C:0};
    ['A','B','C'].forEach(bucket=>{const vals=matches.map(m=>wm.one(m.interestId,m.level,bucket)); boosts[bucket]=wm.combine(vals,bucket);});
    const sourceLabel=best.intentShort||best.group?.short||best.group?.name||'孩子兴趣';
    let reason='';
    if(best.level&&best.level!=='none'&&best.level!=='no') reason=`孩子关注：${sourceLabel}｜${best.label}`;
    else reason='综合备选：未直接命中孩子关注点，但符合位次和家庭底线。';
    const evidence=best.evidence||null;
    return Object.assign({active:true,group:best.group,note:best.group?.reviewText||'',boosts,matches,reason,intentShort:sourceLabel,evidence,catalog:best.catalog||null,hardExclude:false},best);
  }
  function matchRecord(r){return window.LN_CANDIDATE_CACHE_V296?.get?.(r,'childInterestMatchV298',()=>matchRecordRaw(r))||matchRecordRaw(r);}
  function planAdjustment(r,type){const m=matchRecord(r); if(!m.active)return 0; return Number(m.boosts?.[type]||0);}
  function badgesForRecord(r){const m=matchRecord(r); if(!m.active)return []; if(m.level==='none'||m.level==='no')return [{text:'综合备选',cls:'soft'}]; const cls=m.level==='review'?'warn':'soft'; return [{text:m.reason,cls},{text:m.evidence?.standardName?`依据：${m.evidence.code||''}${m.evidence.standardName}`:'本科目录匹配',cls:'soft'}];}
  function filterPass(r){const s=readState(); if(!s.manualOnlyInterest)return true; const m=matchRecord(r); return m.active && ['core','related','review'].includes(m.level);}
  function scenarioFit(rule){const ids=effectiveGroupIds(); if(!ids.length||!rule)return {state:'none',label:''}; const matched=ids.map(groupById).filter(Boolean).filter(g=>(g.scenarioBoost||[]).includes(rule.id)); if(matched.length)return {state:'high',label:'与孩子关注点较匹配',groups:matched.map(g=>g.name)}; const pref=rule.preference?.priority||''; const near=ids.map(groupById).filter(Boolean).filter(g=>(g.preferenceBoost||[]).includes(pref)); if(near.length)return {state:'near',label:'与关注点有一定关联',groups:near.map(g=>g.name)}; return {state:'none',label:'按场景规则展示'};}
  function activeIntentShorts(){return (window.LN_CHILD_INTENT_TRANSLATOR_V2976?.selected?.()||[]).map(x=>x.short).filter(Boolean);}
  function hitSummary(){return window.LN_INTEREST_HIT_SUMMARY_V298?.aggregate?.()||{core:0,related:0,review:0,none:0,byInterest:[]};}
  function summary(){const s=readState(); const manual=(s.selectedGroups||[]).map(id=>groupById(id)).filter(Boolean); const auto=autoMappings(s); const intentNames=activeIntentShorts(); const active=[...new Set([...manual.map(g=>g.name),...auto.map(x=>x.label)])]; if(!intentNames.length&&!active.length)return {title:'孩子暂未明确方向',text:'系统会先按家庭底线、位次区间和场景策略综合推荐；后面可以随时补选兴趣。',names:[],auto:[],hit:null}; const hs=hitSummary(); const hitText=window.LN_INTEREST_HIT_SUMMARY_V298?.message?.(hs)||''; return {title:'已整理：'+(intentNames.length?intentNames.join('、'):active.join('、')),activeTitle:active.length?'已激活方向：'+active.join('、'):'',text:(hitText||'系统会在当前真实候选中做匹配，不会生成不存在的专业。'),names:active,auto,hit:hs};}
  function refreshLight(reason){window.LN_CHILD_INTEREST_UI_V296?.renderSummary?.(); if(window.LN_DRAWER_V296?.isOpen?.())window.LN_CHILD_INTEREST_UI_V296?.renderDrawerBody?.(); window.LN_REFRESH_SCHEDULER_V296?.request?.({reason:reason||'child-interest-change',level:'soft',delay:180});}
  function toggleGroup(id){const g=groupById(id); if(!g)return {ok:false,reason:'not_found'}; const s=readState(); let arr=s.selectedGroups||[]; if(arr.includes(id))arr=arr.filter(x=>x!==id); else{if(arr.length>=(tax().maxGroups||3))return {ok:false,reason:'max'}; arr=[...arr,id];} saveState(Object.assign(s,{selectedGroups:arr})); refreshLight('child-interest-change'); return {ok:true};}
  function removeGroup(id){const s=readState(); const arr=(s.selectedGroups||[]).filter(x=>x!==id); saveState(Object.assign(s,{selectedGroups:arr})); refreshLight('child-interest-change');}
  function toggleAuto(intentId,interestId){const s=readState(); const key=intentId+'|'+interestId; const set=new Set(s.disabledAutoMappings||[]); if(set.has(key))set.delete(key); else set.add(key); s.disabledAutoMappings=[...set]; saveState(s); refreshLight('child-interest-auto-toggle');}
  function undecided(){saveState(Object.assign(readState(),{mode:'undecided',selectedGroups:[],selectedMajors:[],manualOnlyInterest:false,disabledAutoMappings:[]})); window.LN_CHILD_INTENT_TRANSLATOR_V2976?.clear?.(); refreshLight('child-interest-change');}
  function start(){window.LN_CHILD_INTEREST_UI_V296?.openDrawer?.();}
  function render(){window.LN_CHILD_INTEREST_UI_V296?.renderSummary?.();}
  function handle(action,el){if(action==='child-interest-start')return start(); if(action==='child-interest-undecided')return undecided(); if(action==='child-interest-remove')return removeGroup(el?.dataset?.interestId||''); if(action==='child-interest-auto-toggle')return toggleAuto(el?.dataset?.intentId||'',el?.dataset?.interestId||''); return false;}
  const api={readState,saveState,render,toggleGroup,removeGroup,toggleAuto,undecided,start,handle,matchRecord,planAdjustment,badgesForRecord,filterPass,scenarioFit,summary,hitSummary,groups,groupById,effectiveGroupIds,autoMappings,catalogMatch,ready:true};
  window.LN_CHILD_INTEREST_RUNTIME_V298=api; window.LN_CHILD_INTEREST_RUNTIME_V2976=api; window.LN_CHILD_INTEREST_RUNTIME_V296=api; window.LN_CHILD_INTEREST_RUNTIME_V2955=api;
})();

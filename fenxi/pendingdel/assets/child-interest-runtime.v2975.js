// V2.9.6 child interest runtime: state + matching only. UI lives in child-interest-ui.v296.js.
(function(){
  const STORAGE_KEY='ln_child_interest_state_v2955';
  function rules(){ return window.LN_CHILD_INTEREST_RULES_V296 || window.LN_CHILD_INTEREST_RULES_V2955 || {groups:[],maxGroups:3,defaultMode:'undecided'}; }
  function groups(){ return rules().groups || []; }
  function groupById(id){ return groups().find(g=>g.id===id) || null; }
  function defaultState(){ return {mode:'undecided', selectedGroups:[], selectedMajors:[], selectedKeywords:[], manualOnlyInterest:false, confidence:'low', source:'child_self', updatedAt:'', schemaVersion:1}; }
  function readState(){
    try{ const raw=localStorage.getItem(STORAGE_KEY); if(!raw)return defaultState(); const s=JSON.parse(raw); return Object.assign(defaultState(), s, {selectedGroups:Array.isArray(s.selectedGroups)?s.selectedGroups:[]}); }catch(e){return defaultState();}
  }
  function saveState(s){
    const next=Object.assign(defaultState(), s||{});
    next.selectedGroups=[...new Set((next.selectedGroups||[]).filter(id=>groupById(id)))].slice(0, rules().maxGroups||3);
    if(next.selectedGroups.length) next.mode='selected';
    if(next.mode==='undecided') next.selectedGroups=[];
    next.updatedAt=new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.LN_STATE_SNAPSHOT_V296?.reset?.();
    window.LN_CANDIDATE_CACHE_V296?.reset?.();
    return next;
  }
  function stateAgeDays(s){ if(!s?.updatedAt)return null; const t=Date.parse(s.updatedAt); if(!Number.isFinite(t))return null; return Math.floor((Date.now()-t)/86400000); }
  function textOfRecord(r){ return [r?.majorText,r?.major,r?.cleanMajor,r?.officialMajorName,r?.undergradMajorName,r?.undergradCategoryName,r?.subjectGroup,r?.primaryDisciplineNames].filter(Boolean).join(' '); }
  function hit(list,text){ return (list||[]).find(k=>text.includes(k)); }
  function matchOneGroup(g,r){
    const t=textOfRecord(r);
    const core=hit(g.match?.core,t); if(core) return {level:'core', score:56, label:'高匹配', hit:core, group:g, note:g.reviewText||''};
    const related=hit(g.match?.related,t); if(related) return {level:'related', score:34, label:'中匹配', hit:related, group:g, note:g.reviewText||''};
    const review=hit(g.match?.review,t); if(review) return {level:'review', score:16, label:'需复核', hit:review, group:g, note:g.reviewText||''};
    return {level:'no', score:0, label:'未命中', group:g, note:''};
  }
  function matchRecordRaw(r){
    const s=(window.LN_STATE_SNAPSHOT_V296?.snapshot?.()?.child)||readState();
    if(s.mode!=='selected' || !s.selectedGroups.length) return {active:false, level:'none', score:0, label:'综合推荐', group:null, note:''};
    const order={core:3, related:2, review:1, no:0};
    const matches=s.selectedGroups.map(id=>groupById(id)).filter(Boolean).map(g=>matchOneGroup(g,r));
    const best=matches.sort((a,b)=>(order[b.level]-order[a.level])||(b.score-a.score))[0] || {level:'no',score:0,label:'未命中'};
    return Object.assign({active:true}, best);
  }
  function matchRecord(r){ return window.LN_CANDIDATE_CACHE_V296?.get?.(r,'childInterestMatch',()=>matchRecordRaw(r)) || matchRecordRaw(r); }
  function planAdjustment(r,type){
    const m=matchRecord(r); if(!m.active || m.level==='no')return 0;
    const base={core:42, related:25, review:10}[m.level]||0;
    const boost=m.group?.planBoost || {A:0.2,B:1,C:0.4};
    const mul=Number(boost[type]||0); let adj=base*mul;
    if(type==='A' && (r?.isHighFee || r?.isCoopV29475 || r?.isPrivateV29475))adj-=8;
    if(type==='B' && m.level==='review')adj-=2;
    return Math.round(adj);
  }
  function badgesForRecord(r){
    const m=matchRecord(r); if(!m.active || m.level==='no')return [];
    const cls=m.level==='review'?'warn':'soft';
    return [{text:`专业匹配：${m.label}`,cls},{text:m.group?.short||m.group?.name||'孩子兴趣',cls:'soft'}];
  }
  function filterPass(r){ const s=readState(); if(!s.manualOnlyInterest)return true; const m=matchRecord(r); return m.active && ['core','related','review'].includes(m.level); }
  function scenarioFit(rule){
    const s=readState(); if(s.mode!=='selected'||!s.selectedGroups.length||!rule)return {state:'none',label:''};
    const matched=s.selectedGroups.map(groupById).filter(Boolean).filter(g=>(g.scenarioBoost||[]).includes(rule.id));
    if(matched.length)return {state:'high',label:'与孩子兴趣较匹配',groups:matched.map(g=>g.name)};
    const preference=rule.preference?.priority||'';
    const near=s.selectedGroups.map(groupById).filter(Boolean).filter(g=>(g.preferenceBoost||[]).includes(preference));
    if(near.length)return {state:'near',label:'与兴趣有一定关联',groups:near.map(g=>g.name)};
    return {state:'none',label:'按场景规则展示'};
  }
  function summary(){
    const s=readState();
    if(s.mode!=='selected'||!s.selectedGroups.length)return {title:'孩子暂未明确方向',text:'系统会先按家庭底线、位次区间和场景策略综合推荐；后面可以随时补选专业方向。', names:[]};
    const names=s.selectedGroups.map(id=>groupById(id)?.name).filter(Boolean);
    const ages=stateAgeDays(s), old=ages!==null && ages>(rules().reconfirmAfterDays||30);
    return {title:'已选择：'+names.join('、'),text:'系统会优先解释这些方向，同时保留其他合理备选。'+(old?' 这组兴趣选择时间较早，建议和孩子再确认一次。':''),names};
  }
  function refreshLight(reason){
    window.LN_CHILD_INTEREST_UI_V296?.renderSummary?.();
    if(window.LN_DRAWER_V296?.isOpen?.()) window.LN_CHILD_INTEREST_UI_V296?.renderDrawerBody?.();
    window.LN_REFRESH_SCHEDULER_V296?.request?.({reason:reason||'child-interest-change', level:'soft', delay:180});
  }
  function toggleGroup(id){
    const g=groupById(id); if(!g)return {ok:false,reason:'not_found'};
    const s=readState(); let arr=s.selectedGroups||[];
    if(arr.includes(id)) arr=arr.filter(x=>x!==id); else { if(arr.length>=(rules().maxGroups||3))return {ok:false,reason:'max'}; arr=[...arr,id]; }
    saveState(Object.assign(s,{mode:arr.length?'selected':'undecided',selectedGroups:arr})); refreshLight('child-interest-change'); return {ok:true};
  }
  function removeGroup(id){ const s=readState(); const arr=(s.selectedGroups||[]).filter(x=>x!==id); saveState(Object.assign(s,{selectedGroups:arr,mode:arr.length?'selected':'undecided'})); refreshLight('child-interest-change'); }
  function undecided(){ saveState(Object.assign(readState(),{mode:'undecided',selectedGroups:[],selectedMajors:[],manualOnlyInterest:false})); refreshLight('child-interest-change'); }
  function start(){ window.LN_CHILD_INTEREST_UI_V296?.openDrawer?.(); }
  function render(){ window.LN_CHILD_INTEREST_UI_V296?.renderSummary?.(); }
  function handle(action, el){ if(action==='child-interest-start')return start(); if(action==='child-interest-undecided')return undecided(); if(action==='child-interest-remove')return removeGroup(el?.dataset?.interestId||''); return false; }
  const api={readState,saveState,render,toggleGroup,removeGroup,undecided,start,handle,matchRecord,planAdjustment,badgesForRecord,filterPass,scenarioFit,summary,groups,groupById,ready:true};
  window.LN_CHILD_INTEREST_RUNTIME_V296=api;
  window.LN_CHILD_INTEREST_RUNTIME_V2955=api;
})();

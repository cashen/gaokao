// V2.9.5.5 rule runtime: converts child-interest rules into executable UI/score/filter hints.
(function(){
  const STORAGE_KEY='ln_child_interest_state_v2955';
  function esc(v){
    const fn=window.htmlSafeV2945 || window.v2950Text;
    if(typeof fn==='function') return fn(String(v??''));
    return String(v??'').replace(/[&<>"']/g, s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  }
  function rules(){ return window.LN_CHILD_INTEREST_RULES_V2955 || {groups:[],maxGroups:3,defaultMode:'undecided'}; }
  function groups(){ return rules().groups || []; }
  function groupById(id){ return groups().find(g=>g.id===id) || null; }
  function defaultState(){ return {mode:'undecided', selectedGroups:[], selectedMajors:[], selectedKeywords:[], manualOnlyInterest:false, confidence:'low', source:'child_self', updatedAt:'', schemaVersion:1}; }
  function readState(){
    try{
      const raw=localStorage.getItem(STORAGE_KEY);
      if(!raw) return defaultState();
      const s=JSON.parse(raw);
      return Object.assign(defaultState(), s, {selectedGroups:Array.isArray(s.selectedGroups)?s.selectedGroups:[]});
    }catch(e){ return defaultState(); }
  }
  function saveState(s){
    const next=Object.assign(defaultState(), s||{});
    next.selectedGroups=[...new Set((next.selectedGroups||[]).filter(id=>groupById(id)))].slice(0, rules().maxGroups||3);
    if(next.selectedGroups.length) next.mode='selected';
    if(next.mode==='undecided') next.selectedGroups=[];
    next.updatedAt=new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  }
  function stateAgeDays(s){
    if(!s?.updatedAt) return null;
    const t=Date.parse(s.updatedAt); if(!Number.isFinite(t)) return null;
    return Math.floor((Date.now()-t)/86400000);
  }
  function textOfRecord(r){
    return [r?.majorText,r?.major,r?.cleanMajor,r?.officialMajorName,r?.undergradMajorName,r?.undergradCategoryName,r?.subjectGroup,r?.primaryDisciplineNames].filter(Boolean).join(' ');
  }
  function hit(list,text){ return (list||[]).find(k=>text.includes(k)); }
  function matchOneGroup(g,r){
    const t=textOfRecord(r);
    const core=hit(g.match?.core,t); if(core) return {level:'core', score:56, label:'高匹配', hit:core, group:g, note:g.reviewText||''};
    const related=hit(g.match?.related,t); if(related) return {level:'related', score:34, label:'中匹配', hit:related, group:g, note:g.reviewText||''};
    const review=hit(g.match?.review,t); if(review) return {level:'review', score:16, label:'需复核', hit:review, group:g, note:g.reviewText||''};
    return {level:'no', score:0, label:'未命中', group:g, note:''};
  }
  function matchRecord(r){
    const s=readState();
    if(s.mode!=='selected' || !s.selectedGroups.length) return {active:false, level:'none', score:0, label:'综合推荐', group:null, note:''};
    const matches=s.selectedGroups.map(id=>groupById(id)).filter(Boolean).map(g=>matchOneGroup(g,r));
    const order={core:3, related:2, review:1, no:0};
    const best=matches.sort((a,b)=>(order[b.level]-order[a.level])||(b.score-a.score))[0] || {level:'no',score:0,label:'未命中'};
    return Object.assign({active:true}, best);
  }
  function planAdjustment(r,type){
    const m=matchRecord(r); if(!m.active || m.level==='no') return 0;
    const base={core:42, related:25, review:10}[m.level] || 0;
    const boost=m.group?.planBoost || {A:0.2,B:1,C:0.4};
    const mul=Number(boost[type]||0);
    let adj=base*mul;
    if(type==='A' && (r?.isHighFee || r?.isCoopV29475 || r?.isPrivateV29475)) adj-=8;
    if(type==='B' && m.level==='review') adj-=2;
    return Math.round(adj);
  }
  function badgesForRecord(r){
    const m=matchRecord(r); if(!m.active || m.level==='no') return [];
    const cls=m.level==='core'?'soft':m.level==='related'?'soft':'warn';
    return [{text:`专业匹配：${m.label}`, cls}, {text:m.group?.short||m.group?.name||'孩子兴趣', cls:'soft'}];
  }
  function filterPass(r){
    const s=readState();
    if(!s.manualOnlyInterest) return true;
    const m=matchRecord(r);
    return m.active && ['core','related','review'].includes(m.level);
  }
  function scenarioFit(rule){
    const s=readState();
    if(s.mode!=='selected' || !s.selectedGroups.length || !rule) return {state:'none', label:''};
    const matched=s.selectedGroups.map(groupById).filter(Boolean).filter(g=>(g.scenarioBoost||[]).includes(rule.id));
    if(matched.length) return {state:'high', label:'与孩子兴趣较匹配', groups:matched.map(g=>g.name)};
    const preference=rule.preference?.priority || '';
    const near=s.selectedGroups.map(groupById).filter(Boolean).filter(g=>(g.preferenceBoost||[]).includes(preference));
    if(near.length) return {state:'near', label:'与兴趣有一定关联', groups:near.map(g=>g.name)};
    return {state:'none', label:'按场景规则展示'};
  }
  function summary(){
    const s=readState();
    if(s.mode!=='selected' || !s.selectedGroups.length) return {title:'孩子暂未明确方向', text:'系统会先按家庭底线、位次区间和场景策略综合推荐；后面可以随时补选专业方向。'};
    const names=s.selectedGroups.map(id=>groupById(id)?.name).filter(Boolean);
    const ages=stateAgeDays(s); const old=ages!==null && ages>(rules().reconfirmAfterDays||30);
    return {title:'已选择：'+names.join('、'), text:'系统会优先解释这些方向，同时保留其他合理备选。'+(old?' 这组兴趣选择时间较早，建议和孩子再确认一次。':'')};
  }
  function groupCard(g,s,q){
    const on=(s.selectedGroups||[]).includes(g.id);
    const text=[g.name,g.desc,(g.match?.core||[]).join(' '),(g.match?.related||[]).join(' ')].join(' ');
    if(q && !text.includes(q)) return '';
    const core=(g.match?.core||[]).slice(0,4).map(x=>`<span>${esc(x)}</span>`).join('');
    const related=(g.match?.related||[]).slice(0,4).map(x=>`<span>${esc(x)}</span>`).join('');
    const review=(g.match?.review||[]).slice(0,3).map(x=>`<span>${esc(x)}</span>`).join('');
    return `<button type="button" class="child-interest-card-v2955 ${on?'active':''} color-${esc(g.color||'gray')}" data-child-interest-group="${esc(g.id)}">
      <strong>${esc(g.name)}</strong><span>${esc(g.desc)}</span><em>${esc(g.cycle?.label||'需结合孩子适配复核')}</em>
      <div class="interest-subtags-v2955"><b>正主</b>${core}</div>
      <div class="interest-subtags-v2955"><b>相近</b>${related}</div>
      <details class="interest-review-v2955"><summary>需复核方向</summary><div>${review||'<span>暂无</span>'}</div><p>${esc(g.reviewText||'建议查看培养方案和招生章程。')}</p></details>
    </button>`;
  }
  function render(){
    const box=document.getElementById('childInterestBoxV2955'); if(!box) return;
    const s=readState();
    const q=(document.getElementById('childInterestSearchV2955')?.value||'').trim();
    const selected=s.selectedGroups.map(id=>groupById(id)).filter(Boolean);
    const sum=summary();
    box.innerHTML=`
      <div class="child-interest-actions-v2955">
        <button type="button" class="execute-secondary" data-action="child-interest-start">开始选择专业方向</button>
        <button type="button" class="secondary ${s.mode==='undecided'?'active':''}" data-action="child-interest-undecided">暂不确定，听系统推荐</button>
      </div>
      <div class="child-interest-summary-v2955 ${s.mode==='selected'?'selected':'undecided'}"><b>${esc(sum.title)}</b><span>${esc(sum.text)}</span></div>
      <div class="child-interest-selected-v2955">${selected.map(g=>`<span>${esc(g.name)}<button data-action="child-interest-remove" data-interest-id="${esc(g.id)}">×</button></span>`).join('')||'<span>未选择，当前为综合推荐</span>'}</div>
      <div class="child-interest-search-v2955"><input id="childInterestSearchV2955" placeholder="搜索专业方向，例如：电气、计算机、临床、会计" value="${esc(q)}"/><label><input type="checkbox" id="onlyChildInterestV2955" ${s.manualOnlyInterest?'checked':''}/> 只看孩子已选方向</label></div>
      <div class="child-interest-grid-v2955">${groups().map(g=>groupCard(g,s,q)).join('') || '<div class="notice">没有匹配方向，可以换一个关键词。</div>'}</div>
      <div class="child-interest-cycle-v2955"><b>使用提醒：</b>孩子兴趣用于提高解释和优先级，不替代家庭底线，也不替代当年招生计划、学费、专业代码和高校章程复核。</div>`;
    const input=document.getElementById('childInterestSearchV2955');
    if(input && !input.dataset.bound){input.dataset.bound='1'; input.addEventListener('input',()=>render());}
    const chk=document.getElementById('onlyChildInterestV2955');
    if(chk && !chk.dataset.bound){chk.dataset.bound='1'; chk.addEventListener('change',()=>{const st=readState(); st.manualOnlyInterest=chk.checked; saveState(st); scheduleRefresh();});}
  }
  function scheduleRefresh(){
    try{ render(); }catch(e){}
    try{ if(typeof window.autoRefresh==='function') window.autoRefresh(); else if(window.LN_APP?.refresh) window.LN_APP.refresh(); }catch(e){ console.warn('[V2.9.5.5] child interest refresh failed', e); }
  }
  function toggleGroup(id){
    const g=groupById(id); if(!g) return {ok:false, reason:'not_found'};
    const s=readState(); let arr=s.selectedGroups||[];
    if(arr.includes(id)) arr=arr.filter(x=>x!==id);
    else{
      if(arr.length>=(rules().maxGroups||3)) return {ok:false, reason:'max'};
      arr=[...arr,id];
    }
    saveState(Object.assign(s,{mode:arr.length?'selected':'undecided',selectedGroups:arr}));
    scheduleRefresh(); return {ok:true};
  }
  function removeGroup(id){ const s=readState(); saveState(Object.assign(s,{selectedGroups:(s.selectedGroups||[]).filter(x=>x!==id), mode:(s.selectedGroups||[]).filter(x=>x!==id).length?'selected':'undecided'})); scheduleRefresh(); }
  function undecided(){ saveState(Object.assign(readState(),{mode:'undecided',selectedGroups:[],selectedMajors:[],manualOnlyInterest:false})); scheduleRefresh(); }
  function start(){ const el=document.getElementById('childInterestSearchV2955'); if(el) el.focus(); }
  function handle(action, el){
    if(action==='child-interest-start') return start();
    if(action==='child-interest-undecided') return undecided();
    if(action==='child-interest-remove') return removeGroup(el?.dataset?.interestId||'');
    return false;
  }
  window.LN_CHILD_INTEREST_RUNTIME_V2955 = {
    readState, saveState, render, toggleGroup, removeGroup, undecided, start, handle,
    matchRecord, planAdjustment, badgesForRecord, filterPass, scenarioFit, summary,
    groups, groupById, ready:true
  };
})();

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

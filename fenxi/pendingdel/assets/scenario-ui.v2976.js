// V2.9.6 scenario UI: compact summary on page, full scenario cards in drawer.
(function(){
  function esc(v){const fn=window.htmlSafeV2945||window.v2950Text; if(typeof fn==='function')return fn(String(v??'')); return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));}
  function rules(){return (typeof allScenarioRulesV2951==='function'?allScenarioRulesV2951():[])||[];}
  function current(){const list=rules(); const id=window.currentStrategy || (typeof currentStrategy!=='undefined'?currentStrategy:'employment'); return list.find(r=>r.id===id)||list.find(r=>r.defaultSelected)||list[0]||{};}
  function fitLabel(rule){try{return scoreBandFitV2954Fix2(rule);}catch(e){return {state:'neutral',label:'不限分段'};}}
  function render(box){
    if(!box)return; const rule=current(); const interest=window.LN_CHILD_INTEREST_RUNTIME_V296?.scenarioFit?.(rule)||window.LN_CHILD_INTEREST_RUNTIME_V2955?.scenarioFit?.(rule)||{state:'none',label:''};
    const pref=rule.preference?.priority||''; const risk=rule.riskLevel==='aggressive'?'冲刺':rule.riskLevel==='conservative'?'稳妥':'均衡'; const pathHints=window.LN_PATH_SCENARIO_RULES_V2975?.summary?.()||{hints:[],message:''};
    box.classList.add('scenario-compact-host-v296');
    box.innerHTML=`<div class="scenario-compact-v296">
      <div><b>当前场景：${esc(rule.title||'普通家庭｜稳就业')}</b><span>${esc(rule.desc||'场景只给建议，不覆盖已确认的家庭底线。')}</span></div>
      <div class="scenario-tags-v296"><span>${esc(risk)}</span>${pref?`<span>${esc(pref)}</span>`:''}${interest.label?`<span class="interest">${esc(interest.label)}</span>`:''}${pathHints.hints?.[0]?`<span class="path">${esc(pathHints.hints[0].title)}</span>`:''}</div>
      <button class="execute-secondary" data-action="open-scenario-drawer">切换场景</button>
    </div>`;
    const intro=document.getElementById('scenarioRuleHintV2951');
    if(intro){ const child=window.LN_CHILD_INTEREST_RUNTIME_V296?.summary?.()||window.LN_CHILD_INTEREST_RUNTIME_V2955?.summary?.(); intro.innerHTML=`<b>场景规则中心</b><span>主页面只显示当前场景摘要；完整场景进入抽屉选择。${child?'｜'+esc(child.title):''}${pathHints.hints?.length?'｜路径提示：'+esc(pathHints.hints.map(x=>x.title).join('、')):''}</span>`; }
  }
  function card(rule){
    const cls=['strategy-card','scenario-card-v296']; const id=window.currentStrategy || (typeof currentStrategy!=='undefined'?currentStrategy:'employment'); if(rule.id===id)cls.push('active');
    const fit=fitLabel(rule); const interest=window.LN_CHILD_INTEREST_RUNTIME_V296?.scenarioFit?.(rule)||{state:'none',label:''};
    return `<button class="${cls.join(' ')}" data-strategy="${esc(rule.id)}" data-score-fit="${esc(fit.state)}">
      <strong>${esc(rule.title)}</strong><span>${esc(rule.desc||'')}</span><small>${esc(fit.label)}</small>${interest.label?`<small class="scenario-interest-v296 ${esc(interest.state)}">${esc(interest.label)}</small>`:''}<em>${esc(rule.riskLevel==='aggressive'?'冲刺':rule.riskLevel==='conservative'?'稳妥':'均衡')}</em>
    </button>`;
  }
  function openDrawer(){
    let list=rules();
    try{ const hasScore=!!(typeof currentScoreV2954Fix2==='function'&&currentScoreV2954Fix2()); if(hasScore){const order={match:0,near:1,neutral:2,unknown:3,mismatch:4}; list=[...list].sort((a,b)=>((order[fitLabel(a).state]??3)-(order[fitLabel(b).state]??3))||((a.order||999)-(b.order||999)));} }catch(e){}
    const path=window.LN_PATH_SCENARIO_RULES_V2975?.summary?.()||{hints:[],message:''}; const pathHtml=path.hints?.length?`<div class="path-scenario-hints-v2975"><b>根据孩子关注点，可优先看一眼</b><p>${esc(path.message)}</p><div>${path.hints.map(h=>`<span>${esc(h.title)}：${esc(h.desc)}</span>`).join('')}</div></div>`:''; window.LN_DRAWER_V296?.open?.('选择 / 确认场景', `<div class="scenario-drawer-v296"><p class="drawer-help-v296">场景只提供建议和排序倾向；用户已经手动设置的家庭底线优先。</p>${pathHtml}<div class="scenario-grid-v296">${list.map(card).join('')}</div></div>`);
  }
  window.LN_SCENARIO_UI_V296={render,openDrawer,ready:true};
})();

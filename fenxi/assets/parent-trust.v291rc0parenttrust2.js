// V2.91RC0.parent-trust2｜家长语言与视觉信任定版
// 只做展示、文案和 debug 标记；不参与候选池、公式、排序和 A/B/C 计算。
(function(){
  if(window.LN_PARENT_TRUST_OPT===false) return;
  var VERSION='v291rc0parenttrust2';
  var STAMP='291rc0parenttrust2-20260514';
  var collapsed=true;
  var lastScenarioEffective='employment';
  function esc(v){
    var s=String(v==null?'':v);
    return s.replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});
  }
  function debugScenarioRaw(){
    try{
      var c=window.LN_DEBUG_V2983&&window.LN_DEBUG_V2983.state&&window.LN_DEBUG_V2983.state.context;
      if(c && c.scenario && Object.prototype.hasOwnProperty.call(c.scenario,'current')) return c.scenario.current||'';
    }catch(e){}
    return '';
  }
  function runtimeScenario(){
    try{ if(typeof currentStrategy!=='undefined' && currentStrategy) return currentStrategy; }catch(e){}
    try{ if(window.currentStrategy) return window.currentStrategy; }catch(e){}
    return '';
  }
  function currentScenarioEffective(){
    var fromRuntime=runtimeScenario();
    var raw=debugScenarioRaw();
    var v=fromRuntime || raw || lastScenarioEffective || 'employment';
    lastScenarioEffective=v;
    return v;
  }
  function priorityTouched(){
    try{ if(typeof PREFERENCE_TOUCHED_V2952!=='undefined') return !!PREFERENCE_TOUCHED_V2952; }catch(e){}
    return !!window.__LN_PARENT_TRUST_USER_TUNED;
  }
  function prefValue(){
    var sel=document.getElementById('priority');
    if(sel && sel.value) return sel.value;
    var rule=null;
    try{ rule=typeof scenarioRuleV2951==='function'?scenarioRuleV2951(currentScenarioEffective()):null; }catch(e){}
    return (rule&&rule.preference&&rule.preference.priority) || 'employment';
  }
  function prefRule(id){
    try{ return typeof preferenceRuleV2952==='function'?preferenceRuleV2952(id):null; }catch(e){ return null; }
  }
  function scenarioRule(id){
    try{ return typeof scenarioRuleV2951==='function'?scenarioRuleV2951(id):null; }catch(e){ return null; }
  }
  function getState(){
    var raw=debugScenarioRaw();
    var scenario=currentScenarioEffective();
    var effectivePriority=prefValue();
    var pr=prefRule(effectivePriority)||{};
    var sr=scenarioRule(scenario)||{};
    var source=priorityTouched()?'user-tuned':'scenario-default';
    return {
      parentTrust:VERSION,
      scenarioRaw:raw,
      scenarioEffective:scenario,
      scenario:scenario,
      scenarioTitle:sr.title||scenario,
      effectivePriority:effectivePriority,
      effectivePriorityLabel:pr.label||effectivePriority,
      prioritySource:source,
      visualTrust:true,
      copyTrust:true
    };
  }
  function sourceLabel(source){return source==='user-tuned'?'你手动改过':'按我家情况默认';}
  function renderTargetPath(){
    var panel=document.getElementById('targetPathPanelV2952');
    if(!panel) return;
    panel.classList.toggle('parent-trust-collapsed',!!collapsed);
    var st=getState();
    var head=panel.querySelector('.target-path-head-v2952 span');
    if(head) head.textContent='只调整 A/B/C 先看哪一类，不单独扩大或缩小候选池。';
    var title=panel.querySelector('.target-path-head-v2952 b');
    if(title) title.textContent='当前优先考虑';
    var label=panel.querySelector('label[for="priority"], .target-path-grid-v2952 label');
    if(label) label.textContent='这次先按什么思路看';
    var old=panel.querySelector('.parent-trust-summary-v291');
    if(!old){
      old=document.createElement('div');
      old.className='parent-trust-summary-v291';
      var grid=panel.querySelector('.target-path-grid-v2952');
      if(grid) panel.insertBefore(old,grid); else panel.appendChild(old);
    }
    old.innerHTML='<b>这次先按：'+esc(st.effectivePriorityLabel)+'</b><span class="source">'+esc(sourceLabel(st.prioritySource))+'</span><span>只影响 A/B/C 先排哪一类，不改变家庭底线和兴趣对口规则。</span><button type="button" class="parent-trust-toggle-v291">'+(collapsed?'展开调整':'收起调整')+'</button>';
    old.querySelector('button')?.addEventListener('click',function(){collapsed=!collapsed;render();});
    var explain=document.getElementById('targetPathExplainV2952');
    if(explain && !explain.dataset.parentTrustPatched){
      explain.dataset.parentTrustPatched='1';
    }
  }
  function patchCopy(){
    document.querySelectorAll('[data-step-label]').forEach(function(el){
      var v=el.getAttribute('data-step-label')||'';
      if(v.indexOf('家庭场景')>=0) el.setAttribute('data-step-label','④ 我家情况');
    });
  }
  function refreshDebug(){
    var st=getState();
    try{ window.LN_DEBUG_V2983?.setFlags?.({parentTrust:VERSION,parentTrustStamp:STAMP,scenarioRaw:st.scenarioRaw,scenarioEffective:st.scenarioEffective,scenario:st.scenarioEffective,effectivePriority:st.effectivePriority,prioritySource:st.prioritySource,visualTrust:true,copyTrust:true,copyHumanized:true,colorNoiseReduced:true}); }catch(e){}
    try{ window.LN_DEBUG_V2983?.detail?.('parentTrust',{scenarioRaw:st.scenarioRaw,scenarioEffective:st.scenarioEffective,scenarioTitle:st.scenarioTitle,effectivePriority:st.effectivePriority,effectivePriorityLabel:st.effectivePriorityLabel,prioritySource:st.prioritySource,policy:{doesModifyFormula:false,doesChangeCandidatePool:false,doesChangeSorting:false},copy:{humanized:true,avoidAiTone:true},visual:{reducedColorNoise:true,reference:'official-platform-and-parent-tool-style'}}); }catch(e){}
  }
  function render(){patchCopy();renderTargetPath();refreshDebug();}
  function bind(){
    var sel=document.getElementById('priority');
    if(sel && !sel.dataset.parentTrustBound){
      sel.dataset.parentTrustBound='1';
      sel.addEventListener('change',function(){window.__LN_PARENT_TRUST_USER_TUNED=true;setTimeout(render,0);setTimeout(render,180);});
    }
    document.addEventListener('click',function(e){
      if(e.target&&e.target.closest&&e.target.closest('[data-strategy]')){setTimeout(render,80);setTimeout(render,360);}
    },true);
    ['change','input'].forEach(function(evt){document.addEventListener(evt,function(e){if(e.target&&e.target.id==='priority')setTimeout(render,0);},true);});
  }
  function boot(){bind();render();setTimeout(render,300);setTimeout(render,1000);}
  window.LN_PARENT_TRUST_V291RC0={ready:true,version:VERSION,stamp:STAMP,getState:getState,render:render,refreshDebug:refreshDebug};
  window.LN_PARENT_TRUST2_V291RC0=window.LN_PARENT_TRUST_V291RC0;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();

// V2.91RC0.parent-trust1｜家长端口径与视觉信任收口版
// 只做展示、文案和 debug 标记；不参与候选池、公式、排序和 A/B/C 计算。
(function(){
  if(window.LN_PARENT_TRUST_OPT===false) return;
  var VERSION='v291rc0parenttrust1';
  var STAMP='291rc0parenttrust1-20260514';
  var collapsed=true;
  function esc(v){
    var s=String(v==null?'':v);
    return s.replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});
  }
  function currentScenarioId(){
    try{ if(typeof currentStrategy!=='undefined' && currentStrategy) return currentStrategy; }catch(e){}
    return window.currentStrategy || 'employment';
  }
  function priorityTouched(){
    try{ if(typeof PREFERENCE_TOUCHED_V2952!=='undefined') return !!PREFERENCE_TOUCHED_V2952; }catch(e){}
    return !!window.__LN_PARENT_TRUST_USER_TUNED;
  }
  function prefValue(){
    var sel=document.getElementById('priority');
    if(sel && sel.value) return sel.value;
    var rule=null;
    try{ rule=typeof scenarioRuleV2951==='function'?scenarioRuleV2951(currentScenarioId()):null; }catch(e){}
    return (rule&&rule.preference&&rule.preference.priority) || 'employment';
  }
  function prefRule(id){
    try{ return typeof preferenceRuleV2952==='function'?preferenceRuleV2952(id):null; }catch(e){ return null; }
  }
  function scenarioRule(id){
    try{ return typeof scenarioRuleV2951==='function'?scenarioRuleV2951(id):null; }catch(e){ return null; }
  }
  function getState(){
    var scenario=currentScenarioId();
    var effectivePriority=prefValue();
    var pr=prefRule(effectivePriority)||{};
    var sr=scenarioRule(scenario)||{};
    var source=priorityTouched()?'user-tuned':'scenario-default';
    return {
      parentTrust:VERSION,
      scenario:scenario,
      scenarioTitle:sr.title||scenario,
      effectivePriority:effectivePriority,
      effectivePriorityLabel:pr.label||effectivePriority,
      prioritySource:source,
      visualTrust:true,
      copyTrust:true
    };
  }
  function sourceLabel(source){return source==='user-tuned'?'已手动微调':'来自当前家庭场景建议';}
  function renderTargetPath(){
    var panel=document.getElementById('targetPathPanelV2952');
    if(!panel) return;
    panel.classList.toggle('parent-trust-collapsed',!!collapsed);
    var st=getState();
    var head=panel.querySelector('.target-path-head-v2952 span');
    if(head) head.textContent='用于微调 A/B/C 的侧重点；不单独扩大或缩小候选池。';
    var label=panel.querySelector('label[for="priority"], .target-path-grid-v2952 label');
    if(label) label.textContent='A/B/C 倾向微调';
    var old=panel.querySelector('.parent-trust-summary-v291');
    if(!old){
      old=document.createElement('div');
      old.className='parent-trust-summary-v291';
      var grid=panel.querySelector('.target-path-grid-v2952');
      if(grid) panel.insertBefore(old,grid); else panel.appendChild(old);
    }
    old.innerHTML='<b>当前倾向：'+esc(st.effectivePriorityLabel)+'</b><span class="source">'+esc(sourceLabel(st.prioritySource))+'</span><span>只影响 A/B/C 的出牌侧重点，不改变家庭底线和兴趣真实命中规则。</span><button type="button" class="parent-trust-toggle-v291">'+(collapsed?'展开微调':'收起微调')+'</button>';
    old.querySelector('button')?.addEventListener('click',function(){collapsed=!collapsed;render();});
    var explain=document.getElementById('targetPathExplainV2952');
    if(explain && !explain.dataset.parentTrustPatched){
      explain.dataset.parentTrustPatched='1';
    }
  }
  function patchCopy(){
    document.querySelectorAll('[data-step-label]').forEach(function(el){
      var v=el.getAttribute('data-step-label')||'';
      if(v.indexOf('家庭场景与当前倾向')>=0) el.setAttribute('data-step-label','④ 家庭场景');
    });
  }
  function refreshDebug(){
    var st=getState();
    try{ window.LN_DEBUG_V2983?.setFlags?.({parentTrust:VERSION,parentTrustStamp:STAMP,scenario:st.scenario,effectivePriority:st.effectivePriority,prioritySource:st.prioritySource,visualTrust:true,copyTrust:true}); }catch(e){}
    try{ window.LN_DEBUG_V2983?.detail?.('parentTrust',{scenario:st.scenario,scenarioTitle:st.scenarioTitle,effectivePriority:st.effectivePriority,effectivePriorityLabel:st.effectivePriorityLabel,prioritySource:st.prioritySource,policy:{doesModifyFormula:false,doesChangeCandidatePool:false,doesChangeSorting:false}}); }catch(e){}
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
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();

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
    humanizeTextNodes(document.body);
  }
  function humanizeTextNodes(root){
    if(!root) return;
    var map=[
      ['学生画像','孩子情况'],
      ['孩子画像','孩子情况'],
      ['编辑画像','编辑孩子情况'],
      ['家庭场景','我家情况'],
      ['切换场景','换一种情况'],
      ['选择家庭场景','选择我家情况'],
      ['当前倾向','当前优先考虑'],
      ['目标路径','当前优先考虑'],
      ['A/B/C 倾向微调','这次先按什么思路看'],
      ['已手动微调','你手动改过'],
      ['来自当前家庭场景建议','按我家情况默认'],
      ['只看真实命中兴趣方向','只看真正对口的专业'],
      ['只看真实命中','只看真正对口'],
      ['当前真实候选命中','当前能选的专业命中'],
      ['系统只对真实候选做目录匹配，不会生成不存在的专业。','这里只拿当前能选的专业做目录对照，不编不存在的专业。'],
      ['孩子学习特点主要用于提醒和排序微调，不作为硬排除条件。','孩子情况只用来提醒和排序，不会直接排除专业。']
    ];
    var skip={SCRIPT:1,STYLE:1,NOSCRIPT:1,TEXTAREA:1,INPUT:1,SELECT:1,OPTION:1,CODE:1,PRE:1};
    var walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:function(node){
      var p=node.parentNode; if(!p||skip[p.nodeName]) return NodeFilter.FILTER_REJECT;
      var v=node.nodeValue||''; return map.some(function(x){return v.indexOf(x[0])>=0;})?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_SKIP;
    }});
    var nodes=[]; while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function(n){var v=n.nodeValue||''; map.forEach(function(x){v=v.split(x[0]).join(x[1]);}); n.nodeValue=v;});
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
  function boot(){bind();render();setTimeout(render,300);setTimeout(render,1000);try{var mo=new MutationObserver(function(){clearTimeout(window.__LN_PARENT_TRUST_TEXT_TIMER);window.__LN_PARENT_TRUST_TEXT_TIMER=setTimeout(function(){humanizeTextNodes(document.body);},60);});mo.observe(document.body,{childList:true,subtree:true});}catch(e){}}
  window.LN_PARENT_TRUST_V291RC0={ready:true,version:VERSION,stamp:STAMP,getState:getState,render:render,refreshDebug:refreshDebug};
  window.LN_PARENT_TRUST2_V291RC0=window.LN_PARENT_TRUST_V291RC0;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();

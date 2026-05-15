// V2.91RC0.rules-closure4.front2｜家长端低调视觉修正版
// 只做前端视觉标记、风险标签人话化和 debug 标记，不参与候选池、排序、A/B/C 业务计算。
(function(){
  if(window.LN_FRONTEND_TRUST_OPT===false) return;
  var VERSION='v291rc0front2';
  var STAMP='291rc0front2-20260514';
  var RISK_TEXT={
    '超冲':'位次风险高',
    '过低':'分数利用偏低',
    '需谨慎':'需重点复核'
  };
  var EVIDENCE_TEXT={
    '代码可查':'代码可复核'
  };
  function addClassByText(el,text){
    if(!el || !text) return;
    if(/位次风险高|分数利用偏低|需重点复核|超冲|过低|需谨慎/.test(text)) el.classList.add('frontend-risk-label');
    if(/代码可复核|代码可查|证据|复核/.test(text)) el.classList.add('frontend-evidence-label');
  }
  function humanizeLabels(root){
    try{
      var scope=root||document;
      var nodes=scope.querySelectorAll('span,b,em,button,.pill,.tag,.chip,.decision-tag-v2981,.decision-trend-v2981');
      nodes.forEach(function(el){
        if(!el || el.children.length>1) return;
        var t=(el.textContent||'').trim();
        if(RISK_TEXT[t]){ el.textContent=RISK_TEXT[t]; el.classList.add('frontend-risk-label'); }
        else if(EVIDENCE_TEXT[t]){ el.textContent=EVIDENCE_TEXT[t]; el.classList.add('frontend-evidence-label'); }
        else addClassByText(el,t);
      });
    }catch(e){}
  }
  function apply(){
    try{ document.body && document.body.classList.add('frontend-trust-v291rc0front2'); }catch(e){}
    humanizeLabels(document);
    try{
      window.LN_DEBUG_V2983?.setFlags?.({
        frontendTrust:VERSION,
        frontendTrustStamp:STAMP,
        frontendTrustOpt:true,
        visualSystem:'warm-white-low-key-family-report',
        blackButtonsRemoved:true,
        raisedEffectReduced:true,
        topPaletteUnified:true,
        riskCopyHumanized:true,
        doesModifyFormula:false,
        doesChangeCandidatePool:false,
        doesChangeSorting:false
      });
      window.LN_DEBUG_V2983?.detail?.('frontendTrust',{
        version:VERSION,
        stamp:STAMP,
        scope:'visual-only',
        palette:['warm-white','soft-beige','muted-brown','blue-gray','soft-green','risk-red-brown'],
        policy:{doesModifyFormula:false,doesChangeCandidatePool:false,doesChangeSorting:false,doesChangeData:false},
        notes:['去掉黑色胶囊按钮','减少强凸起阴影','顶部统一暖白低饱和','风险词改为更适合家长理解的表达','A/B/C 保持家庭讨论报告感']
      });
    }catch(e){}
  }
  var observer=null;
  function observe(){
    try{
      if(observer) return;
      observer=new MutationObserver(function(list){
        list.forEach(function(m){
          m.addedNodes&&m.addedNodes.forEach(function(n){ if(n&&n.nodeType===1) humanizeLabels(n); });
        });
      });
      observer.observe(document.body,{childList:true,subtree:true});
    }catch(e){}
  }
  window.LN_FRONTEND_TRUST_V291RC0={ready:true,version:VERSION,stamp:STAMP,apply:apply,humanizeLabels:humanizeLabels};
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',function(){apply();observe();},{once:true}); else {apply();observe();}
})();

// V2.91RC0.rules-closure4.front1｜暖白克制前端收口版
// 只做前端视觉层标记与 debug 标记，不参与候选池、排序、A/B/C 业务计算。
(function(){
  if(window.LN_FRONTEND_TRUST_OPT===false) return;
  var VERSION='v291rc0front1';
  var STAMP='291rc0front1-20260514';
  function apply(){
    try{ document.body && document.body.classList.add('frontend-trust-v291rc0front1'); }catch(e){}
    try{
      window.LN_DEBUG_V2983?.setFlags?.({frontendTrust:VERSION,frontendTrustStamp:STAMP,frontendTrustOpt:true,visualSystem:'warm-white-champagne-dark',doesModifyFormula:false,doesChangeCandidatePool:false,doesChangeSorting:false});
      window.LN_DEBUG_V2983?.detail?.('frontendTrust',{version:VERSION,stamp:STAMP,scope:'visual-only',palette:['warm-white','champagne-gold','deep-gray','soft-green','risk-red'],policy:{doesModifyFormula:false,doesChangeCandidatePool:false,doesChangeSorting:false,doesChangeData:false},notes:['学习克制的暖白/香槟金/深色主按钮层级','风险色只用于风险','A/B/C 用边线和标签区分，不做大面积撞色']});
    }catch(e){}
  }
  window.LN_FRONTEND_TRUST_V291RC0={ready:true,version:VERSION,stamp:STAMP,apply:apply};
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',apply,{once:true}); else apply();
})();


// V2.93RC1.mainline｜详细卡片懒加载：专业学科/易混/取舍/规则按需生成
(function(){
  if(window.LN_DETAIL_LAZY_DISABLE===true) return;
  var VERSION='v293rc1-mainline-detail-lazy';
  var STAMP='293rc1-mainline-20260515';
  var store=new Map();
  var originals={};
  function idOf(r){return String((r&&r.id)||[r&&r.school,r&&r.major,r&&r.rank2025].filter(Boolean).join('|')||Math.random().toString(36).slice(2));}
  function safe(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function shell(kind, summary, cls, r){
    if(!r) return '';
    var id=idOf(r); store.set(id,r);
    return '<details class="'+safe(cls||'')+' ln-lazy-detail" data-ln-lazy-kind="'+safe(kind)+'" data-ln-record-id="'+safe(id)+'"><summary>'+summary+'</summary><div class="ln-lazy-body">展开后加载详细说明，避免一次性渲染拖慢页面。</div></details>';
  }
  function parseBody(html){
    var tmp=document.createElement('div'); tmp.innerHTML=html||'';
    var d=tmp.querySelector('details');
    if(!d) return html||'';
    var arr=[];
    Array.prototype.slice.call(d.childNodes).forEach(function(n){
      if(n.nodeType===1 && String(n.tagName).toLowerCase()==='summary') return;
      arr.push(n.outerHTML || n.textContent || '');
    });
    return arr.join('') || '';
  }
  function callOriginal(kind,r){
    try{
      if(kind==='taxonomy' && originals.renderTaxonomyDetail) return originals.renderTaxonomyDetail(r);
      if(kind==='confusable' && originals.renderConfusableMajorPanelV2946) return originals.renderConfusableMajorPanelV2946(r);
      if(kind==='parentInterest' && originals.renderParentInterestPanelV2945) return originals.renderParentInterestPanelV2945(r);
      if(kind==='rule' && originals.renderRule) return originals.renderRule(r);
      if(kind==='pathDetail' && originals.pathDetailHtml) return originals.pathDetailHtml(r);
    }catch(e){ return '<div class="tax-warn">详细说明生成失败：'+safe(e.message||e)+'</div>'; }
    return '';
  }
  function shouldRule(r){
    var lines=(r&&((r._mentor&&r._mentor.breakdown)||(r._zxf&&r._zxf.breakdown)))||[];
    return lines.filter(function(x){return x&&x.delta!==0;}).length>0;
  }
  function patchOnce(){
    if(!originals.renderTaxonomyDetail && typeof window.renderTaxonomyDetail==='function' && !window.renderTaxonomyDetail.__v293MainlineLazy){
      originals.renderTaxonomyDetail=window.renderTaxonomyDetail;
      window.renderTaxonomyDetail=function(r){ if(window.LN_DETAIL_LAZY_DISABLE===true) return originals.renderTaxonomyDetail(r); if(!r||!r.majorTaxonomy) return ''; return shell('taxonomy','查看本科目录与研究生参考','taxonomy-detail',r); };
      window.renderTaxonomyDetail.__v293MainlineLazy=true;
    }
    if(!originals.renderConfusableMajorPanelV2946 && typeof window.renderConfusableMajorPanelV2946==='function' && !window.renderConfusableMajorPanelV2946.__v293MainlineLazy){
      originals.renderConfusableMajorPanelV2946=window.renderConfusableMajorPanelV2946;
      window.renderConfusableMajorPanelV2946=function(r){
        try{ if(typeof window.confusablePairsForRecordV2946==='function' && !window.confusablePairsForRecordV2946(r).length) return ''; }catch(e){}
        return shell('confusable','名字相近，点开看易混专业依据','confusable-v2946 confusable-v29461',r);
      };
      window.renderConfusableMajorPanelV2946.__v293MainlineLazy=true;
    }
    if(!originals.renderParentInterestPanelV2945 && typeof window.renderParentInterestPanelV2945==='function' && !window.renderParentInterestPanelV2945.__v293MainlineLazy){
      originals.renderParentInterestPanelV2945=window.renderParentInterestPanelV2945;
      window.renderParentInterestPanelV2945=function(r){ return shell('parentInterest','展开专业解释与家庭取舍','parent-insight-v2945 parent-insight-v29461',r); };
      window.renderParentInterestPanelV2945.__v293MainlineLazy=true;
    }
    if(!originals.renderRule && typeof window.renderRule==='function' && !window.renderRule.__v293MainlineLazy){
      originals.renderRule=window.renderRule;
      window.renderRule=function(r){ if(!shouldRule(r)) return ''; return shell('rule','家长初筛规则明细','rule-breakdown',r); };
      window.renderRule.__v293MainlineLazy=true;
    }
    var eng=window.LN_PATH_EXPLAIN_ENGINE_V2975;
    if(eng && typeof eng.detailHtml==='function' && !eng.detailHtml.__v293MainlineLazy){
      originals.pathDetailHtml=eng.detailHtml.bind(eng);
      eng.detailHtml=function(r){ return shell('pathDetail','展开路径取舍说明','path-detail-v2975',r); };
      eng.detailHtml.__v293MainlineLazy=true;
    }
  }
  async function expandDetail(d){
    if(!d || d.dataset.loaded==='1' || d.dataset.loading==='1') return;
    var body=d.querySelector('.ln-lazy-body'); if(!body) return;
    var id=d.getAttribute('data-ln-record-id'), kind=d.getAttribute('data-ln-lazy-kind'), r=store.get(id);
    if(!r){ body.textContent='未找到该候选的详细记录，请重新筛选后再展开。'; return; }
    var t0=performance.now();
    d.dataset.loading='1';
    try{
      if(kind==='confusable' && window.loadConfusableMajorFullV2946 && window.LN_CONFUSABLE_MAJOR_MODEL_2946 && !window.LN_CONFUSABLE_MAJOR_MODEL_2946.__fullReady){
        body.textContent='正在加载完整易混专业依据，只在第一次展开时加载。';
        await window.loadConfusableMajorFullV2946('detail-expand');
      }
      var html=parseBody(callOriginal(kind,r));
      body.innerHTML=html || '<div class="tax-warn">暂无更多明细。</div>';
      body.classList.add('loaded');
      d.dataset.loaded='1';
      try{ window.__LN_DETAIL_LAZY_STATE__.lastExpandMs=Math.round(performance.now()-t0); window.__LN_DETAIL_LAZY_STATE__.expandedCount++; }catch(e){}
    }catch(e){
      body.innerHTML='<div class="tax-warn">详细说明加载失败：'+safe(e&&e.message||e)+'</div>';
      try{ window.__LN_DETAIL_LAZY_STATE__.lastError=String(e&&e.message||e); }catch(err){}
    }finally{
      d.dataset.loading='0';
    }
  }
  document.addEventListener('toggle',function(e){var d=e.target; if(d&&d.matches&&d.matches('.ln-lazy-detail')&&d.open) expandDetail(d);},true);
  var tries=0, timer=setInterval(function(){patchOnce(); if(++tries>20) clearInterval(timer);},250);
  patchOnce();
  window.__LN_DETAIL_LAZY_STATE__={ready:true,version:VERSION,stamp:STAMP,expandedCount:0,lastExpandMs:0,lastError:'',storeSize:function(){return store.size;}};
  try{window.LN_DEBUG_V2983&&window.LN_DEBUG_V2983.setFlags&&window.LN_DEBUG_V2983.setFlags({detailLazy:true,taxonomyLazy:true,detailLazyVersion:VERSION, detailLazyRc1:false, detailLazyRc2:true});}catch(e){}
})();

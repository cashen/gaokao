// V2.91RC0.rules-closure4.family-read1.frontfix1｜家长尊重感视觉修正版
// 只改文案与前端视觉层级，不参与候选池、排序、A/B/C 计算。
(function(){
  if(window.LN_FAMILY_READ_FRONTFIX_OPT===false) return;
  var VERSION='v291rc0familyread1frontfix1';
  var STAMP='291rc0familyread1frontfix1-20260514';
  var timer=null, observer=null;
  function setFlags(){
    try{
      window.LN_DEBUG_V2983?.setFlags?.({
        familyReadFrontFix:VERSION,
        familyReadFrontFixStamp:STAMP,
        parentRespectVisual:true,
        bigCtaReduced:true,
        tagCountPreserved:true,
        familyReadLabelsHumanized:true,
        doesModifyFormula:false,
        doesChangeCandidatePool:false,
        doesChangeSorting:false
      });
      window.LN_DEBUG_V2983?.detail?.('familyReadFrontFix',{
        version:VERSION,stamp:STAMP,scope:'front-visual-copy-only',
        policy:{doesModifyFormula:false,doesChangeCandidatePool:false,doesChangeSorting:false,doesChangeData:false,tagCountPreserved:true},
        fixes:['大棕色详情按钮降级','按钮文案改成查看依据与复核','家长必读改提醒','本卡先看/闭环判断/下一步复核改人话','复核方框改短句','加入按钮弱化','步骤条改轻流程','家长简洁模式改家庭讨论模式']
      });
    }catch(e){}
  }
  function normText(s){return String(s||'').replace(/\s+/g,'').trim();}
  function replaceExact(el,map){
    if(!el) return;
    var t=(el.textContent||'').trim();
    var n=normText(t);
    Object.keys(map).forEach(function(k){ if(n===normText(k)) el.textContent=map[k]; });
  }
  function replaceContains(el,pairs){
    if(!el) return;
    var t=el.textContent||'';
    pairs.forEach(function(p){ if(t.indexOf(p[0])>=0) t=t.split(p[0]).join(p[1]); });
    el.textContent=t;
  }
  function patchCopy(root){
    root=root||document;
    try{
      root.querySelectorAll('button,.family-detail-toggle-v291').forEach(function(btn){
        replaceExact(btn,{
          '查看证据与复核详情':'查看依据与复核',
          '收起详情':'收起依据',
          '加入':'＋ 加入自选',
          '加入自选':'＋ 加入自选',
          '加入全部 A/B/C 候选':'加入 A/B/C 自选'
        });
        replaceContains(btn,[['加入本方案','加入本组自选']]);
      });
      root.querySelectorAll('label,span,b,strong,p,div').forEach(function(el){
        if(el.children.length>0 && !/^(LABEL|B|STRONG|SPAN)$/i.test(el.tagName)) return;
        replaceExact(el,{
          '家长简洁模式':'家庭讨论模式',
          '家长必读：':'提醒：',
          '家长必读':'提醒',
          '本卡先看':'先看',
          '闭环判断':'怎么看',
          '下一步复核':'下一步',
          '复核重点':'下一步'
        });
      });
      root.querySelectorAll('.parent-must-read-v2981fix2 b,[class*="must-read"] b').forEach(function(b){
        b.textContent=(b.textContent||'').replace('家长必读','提醒').replace('：',':').replace(':','：');
      });
      root.querySelectorAll('.decision-tradeoff-v2981 b').forEach(function(b){
        replaceExact(b,{'本卡先看':'先看','闭环判断':'怎么看','下一步复核':'下一步','复核重点':'下一步'});
      });
      root.querySelectorAll('.family-detail-toggle-v291').forEach(function(btn){
        if(/查看证据|复核详情/.test(btn.textContent||'')) btn.textContent='查看依据与复核';
        if(/收起详情/.test(btn.textContent||'')) btn.textContent='收起依据';
      });
      root.querySelectorAll('.mode-switch-v2950 label').forEach(function(label){
        label.childNodes.forEach(function(n){ if(n.nodeType===3 && n.nodeValue.indexOf('家长简洁模式')>=0) n.nodeValue=n.nodeValue.replace('家长简洁模式','家庭讨论模式'); });
      });
    }catch(e){}
  }
  function patchReviewLists(root){
    root=root||document;
    try{
      root.querySelectorAll('.family-review-list-v291').forEach(function(ul){
        if(ul.dataset.frontfixDone==='1') return;
        ul.dataset.frontfixDone='1';
        var items=[].map.call(ul.querySelectorAll('li'),function(li){return (li.textContent||'').trim();}).filter(Boolean);
        if(items.length){
          var p=document.createElement('p');
          p.className='family-review-inline-v291';
          p.innerHTML='<b>下一步：</b>'+items.join(' / ');
          ul.insertAdjacentElement('beforebegin',p);
          ul.style.display='none';
        }
      });
    }catch(e){}
  }
  function patchButtons(root){
    root=root||document;
    try{
      root.querySelectorAll('.decision-actions-v2981 button,.add-one-v29475fix2,.action-row-v29461 button').forEach(function(btn){
        var t=(btn.textContent||'').trim();
        if(t==='加入'||t==='加入自选') btn.textContent='＋ 加入自选';
      });
    }catch(e){}
  }
  function apply(){
    try{document.body.classList.add('family-read-frontfix-v291rc0');}catch(e){}
    patchCopy(document);
    patchReviewLists(document);
    patchButtons(document);
    setFlags();
  }
  function schedule(){clearTimeout(timer); timer=setTimeout(apply,70);}
  function observe(){
    try{
      if(observer) return;
      observer=new MutationObserver(function(ms){
        var need=false;
        ms.forEach(function(m){ if(m.addedNodes&&m.addedNodes.length) need=true; });
        if(need) schedule();
      });
      observer.observe(document.body,{childList:true,subtree:true});
    }catch(e){}
  }
  window.LN_FAMILY_READ_FRONTFIX_V291={ready:true,version:VERSION,stamp:STAMP,apply:apply};
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',function(){apply();observe();},{once:true});
  else {apply();observe();}
})();

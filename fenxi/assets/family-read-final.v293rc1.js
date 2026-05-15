// V2.93RC1｜家长阅读与前端信任口径合并包
// 只合并展示层，不改候选池与裁决公式。
(function(){
  window.LN_V293RC1_MERGE = window.LN_V293RC1_MERGE || {};
  window.LN_V293RC1_MERGE.familyRead = {ready:false, files:2, stamp:'293rc1-20260515'};
})();


/* ===== BEGIN assets/frontend-trust.v291rc0front2.js ===== */
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
/* ===== END assets/frontend-trust.v291rc0front2.js ===== */


/* ===== BEGIN assets/family-read.v291rc0familyread1.js ===== */

// V2.91RC0.rules-closure4.family-read1｜家长阅读结构增强版
// 只改变家长阅读结构、复制摘要和视觉层级，不参与候选池、排序和 A/B/C 业务计算。
(function(){
  if(window.LN_FAMILY_READ_OPT===false) return;
  var VERSION='v291rc0familyread1';
  var STAMP='291rc0familyread1-20260514';
  var timer=null, observer=null;
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(s){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s];});}
  function val(id){try{return document.getElementById(id)?.value||'';}catch(e){return '';}}
  function text(id){try{return (document.getElementById(id)?.textContent||'').trim();}catch(e){return '';}}
  function optText(id){try{var el=document.getElementById(id); return el?.selectedOptions?.[0]?.textContent?.trim()||el?.value||'';}catch(e){return '';}}
  function rank(){try{return window.currentRank || (typeof currentRank!=='undefined'?currentRank:null) || Number(val('myRank')) || null;}catch(e){return Number(val('myRank'))||null;}}
  function score(){return Number(val('myScore'))||null;}
  function fmt(n){n=Number(n); return Number.isFinite(n)?n.toLocaleString('zh-CN'):'-';}
  function closure(){try{return window.LN_RULES_CLOSURE_V291||null;}catch(e){return null;}}
  function dc(){try{return closure()?.debugContext?.()||{};}catch(e){return {};}}
  function ctx(){try{return closure()?.context?.()||{};}catch(e){return {};}}
  function scenarioLabel(id){return ({platformSprint:'高分平台冲刺',platformStable:'高分平台稳妥',highValue:'高分性价比',employment:'普通家庭稳就业',publicLow:'省内公办稳妥',privateMajor:'民办可比较',edgeBachelor:'本科机会边缘',budgetFlexible:'预算较宽',grid:'电网能源',medical:'医学方向',exam:'考公体制',broad:'先不设限'})[id]||id||'未选择';}
  function rankBand(r){r=Number(r); if(!r)return '待定位'; if(r<=7000)return '高分平台段'; if(r<=17000)return '学校专业平衡段'; if(r<=35000)return '专业路径比较段'; if(r<=70000)return '公办/专业取舍段'; return '本科机会边缘段';}
  function conclusion(){var r=rank(), s=score(), c=dc(), cc=ctx(); var band=rankBand(r); var scenario=scenarioLabel(c.scenarioEffective||cc.scenario||'');
    if(!r&&!s)return '先输入分数或位次，系统会把家庭底线、孩子兴趣和 A/B/C 方案放到同一个讨论稿里。';
    var base=(s?String(s)+' 分':'当前分数')+(r?' / 约 '+fmt(r)+' 位':'')+'，大致属于“'+band+'”。';
    if(c.scenarioEffective==='budgetFlexible')return base+' 家里预算较宽时，重点不是能不能花钱，而是这笔钱有没有换来学校层级、城市或专业质量的真实提升。';
    if(c.scenarioEffective==='exam')return base+' 当前按考公/体制路径看，重点比较岗位相关性、费用、公办属性和孩子能否长期准备。';
    if(c.scenarioEffective==='grid')return base+' 当前按电网/能源路径看，既要看电气能源正主，也要复核是否涉及设备、厂站或现场环境。';
    if(c.scenarioEffective==='medical')return base+' 当前按医学方向看，必须同时复核学制、夜班、规培、执业资格和家庭承受周期。';
    if(c.scenarioEffective==='broad')return base+' 当前是宽口径观察，不是最终推荐，建议看出大方向后再回到具体场景复核。';
    return base+' 当前按“'+scenario+'”看，建议先守住家庭底线，再比较孩子兴趣、专业路径和 A/B/C 三组取舍。';
  }
  function contradictions(){var c=dc(), cc=ctx(), out=[]; function add(t,level){out.push({text:t,level:level||'normal'});} 
    if(c.scenarioPriorityConflict)add('我家情况和“当前优先考虑”不完全一致：系统会防止微调吞掉主场景，但建议确认是否需要恢复为场景默认。','strong');
    if(c.scenarioEffective==='grid'&&c.fieldRejectEffective)add('想看电网/能源，但又不接受现场/设备环境：电气、能源、自动化方向需要重点复核培养方向和就业环境。','strong');
    if(c.scenarioEffective==='medical'&&(c.rejectLongCycleEffective||c.rejectNightEffective))add('想看医学，但又拒绝长周期或夜班：临床、口腔、护理等方向不能当作普通稳妥项。','strong');
    if(c.scenarioEffective==='exam'&&String(c.interestEffective||'').indexOf('medical_health')>=0)add('当前按考公/体制看，但孩子选择了医学方向：医学更偏执业资格和长期培养，不是典型考公主线。','strong');
    if(c.regionSoft)add('当前是区域优先，不是严格排除外地；如果只想看辽宁，需要切换成严格区域。');
    if(c.scenarioEffective==='broad')add('当前是先不设限的观察模式，适合看大方向，不适合作为最终填报结论。');
    try{if((window.filtered||[]).length>0&&(window.filtered||[]).length<25)add('符合全部条件的候选较少，建议确认地域、学校性质、费用或专业方向哪一项可以适度放宽。','strong');}catch(e){}
    if(!out.length)add('当前条件没有明显强冲突。建议重点看 B 组，再用 A 组守底线、C 组看机会。');
    return out.slice(0,5);
  }
  function chips(){var c=dc(), cc=ctx(); var arr=[]; var r=rank(), s=score(); if(s)arr.push(s+' 分'); if(r)arr.push('约 '+fmt(r)+' 位'); arr.push(rankBand(r)); if(c.scenarioEffective)arr.push('我家情况：'+scenarioLabel(c.scenarioEffective)); if(c.effectivePriority)arr.push('当前优先考虑：'+(optText('priority')||c.effectivePriority)); if(val('regionMode'))arr.push('地域：'+optText('regionMode')); if(val('budget'))arr.push('预算：'+optText('budget')); if(cc.gender==='female')arr.push('女孩'); if(cc.gender==='male')arr.push('男孩'); return arr.filter(Boolean).slice(0,8);}
  function ensurePanel(){var result=document.getElementById('resultBox'), app=document.getElementById('app'); if(!app)return null; var panel=document.getElementById('familyReadPanelV291'); if(!panel){panel=document.createElement('section'); panel.id='familyReadPanelV291'; panel.className='family-read-panel-v291'; if(result&&result.parentNode)result.parentNode.insertBefore(panel,result); else app.insertBefore(panel,app.firstChild);} return panel;}
  function renderPanel(){var panel=ensurePanel(); if(!panel)return; var ch=chips(); var cons=contradictions(); panel.innerHTML='<div class="family-read-cover-v291"><div class="family-read-title-v291"><b>辽宁物理类志愿初选家庭讨论稿</b><span>先把家庭底线、孩子兴趣和 A/B/C 三份方案放到同一张桌面上讨论。标签保留，但先读结论和取舍。</span><div class="family-read-chips-v291">'+ch.map(function(x){return '<span>'+esc(x)+'</span>';}).join('')+'</div></div><div class="family-read-score-v291"><div class="big">'+esc((score()?score()+' 分':'分数待填')+(rank()?' / '+fmt(rank())+' 位':''))+'</div><div class="sub">'+esc(rankBand(rank()))+'｜生成时间：'+new Date().toLocaleString('zh-CN',{hour12:false})+'</div></div></div><div class="family-read-section-v291"><h3>当前结论一句话</h3><div class="family-read-conclusion-v291">'+esc(conclusion())+'</div></div><div class="family-read-section-v291"><h3>我家主要矛盾</h3><ul class="family-conflict-list-v291">'+cons.map(function(x){return '<li class="'+esc(x.level||'normal')+'">'+esc(x.text)+'</li>';}).join('')+'</ul><div class="family-read-actions-v291"><button class="secondary" type="button" data-family-read-action="copy-group">复制家庭群简版</button><button class="ghost" type="button" data-scroll-target="planABC">查看 A/B/C 三组方案</button><span class="family-read-toast-v291 family-copy-status-v291" id="familyCopyStatusV291"></span></div></div>';
  }
  function familyText(){var c=dc(), b=window.latestPlanBucketsV29475Fix2||{}; function lines(type){var arr=(b[type]||[]).slice(0,3); return arr.map(function(r,i){var f=null; try{f=closure()?.closureFields?.(r,type,i)||{};}catch(e){} return type+(i+1)+' '+(r.school||'')+'｜'+(r.major||'')+'｜'+(f?.riskLayer||'')+'｜'+(f?.tradeoff||'');});}
    return ['辽宁物理类志愿初选家庭讨论稿', '', '孩子：'+(score()?score()+' 分':'分数待填')+(rank()?' / 约 '+fmt(rank())+' 位':''), '我家情况：'+scenarioLabel(c.scenarioEffective||''), '', '当前结论：'+conclusion(), '', '主要矛盾：'].concat(contradictions().map(function(x){return '· '+x.text;})).concat(['', '先看三组：']).concat(lines('A')).concat(lines('B')).concat(lines('C')).concat(['', '重点复核：学费、校区、培养方向、大类分流、转专业规则和招生章程。']).join('\n');}
  function copyText(t){ if(navigator.clipboard&&navigator.clipboard.writeText)return navigator.clipboard.writeText(t); var ta=document.createElement('textarea'); ta.value=t; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); return Promise.resolve(); }
  function bindCopy(){document.addEventListener('click',function(e){var b=e.target.closest('[data-family-read-action="copy-group"]'); if(!b)return; copyText(familyText()).then(function(){var s=document.getElementById('familyCopyStatusV291'); if(s)s.textContent='已复制家庭群简版';}).catch(function(){var s=document.getElementById('familyCopyStatusV291'); if(s)s.textContent='复制失败，请手动选择文本。';});});}
  function applyCards(root){try{(root||document).querySelectorAll('.plan-decision-card-v2981.closure-card-v291').forEach(function(card){ if(!card.classList.contains('family-card-compact'))card.classList.add('family-card-compact'); if(!card.querySelector('.family-detail-toggle-v291')){var btn=document.createElement('button'); btn.type='button'; btn.className='family-detail-toggle-v291'; btn.textContent='查看证据与复核详情'; btn.addEventListener('click',function(){card.classList.toggle('family-expanded'); btn.textContent=card.classList.contains('family-expanded')?'收起详情':'查看证据与复核详情';}); var tags=card.querySelector('.candidate-lite-tags-v2983'); (tags||card).insertAdjacentElement('afterend',btn);} card.querySelectorAll('.decision-tradeoff-v2981 p').forEach(function(p){var b=p.querySelector('b'); if(!b||b.textContent.indexOf('下一步复核')<0||p.dataset.familyReviewDone)return; p.dataset.familyReviewDone='1'; var raw=(p.textContent||'').replace('下一步复核','').trim(); var items=raw.split(/[；;、，,]/).map(function(x){return x.trim();}).filter(Boolean).slice(0,4); if(items.length){var ul=document.createElement('ul'); ul.className='family-review-list-v291'; ul.innerHTML=items.map(function(x){return '<li>'+esc(x)+'</li>';}).join(''); p.insertAdjacentElement('afterend',ul);} }); });}catch(e){} }
  function applyABCText(){try{var tb=document.querySelector('.abc-toolbar-v296 b'); if(tb)tb.textContent='A/B/C 三份家庭讨论方案'; var ts=document.querySelector('.abc-toolbar-v296 span'); if(ts)ts.textContent='A/B/C 是家庭策略层；每组内部仍有小冲、匹配、稳妥、保底和机会对照。先看取舍，再展开证据。'; var head=document.querySelector('.abc-active-head-v296 b'); if(head){head.textContent=head.textContent.replace('A：守底线','A 先守住底线').replace('B：重点讨论','B 重点拿出来讨论').replace('C：看机会','C 想看看机会');} var hspan=document.querySelector('.abc-active-head-v296 span'); if(hspan){var h=(head?.textContent||''); if(/^A/.test(h))hspan.textContent='这组更看重家庭底线：费用、学校性质、地域和孩子能否接受。'; else if(/^B/.test(h))hspan.textContent='这组最适合家庭重点讨论：学校、专业、孩子兴趣和未来路径相对平衡。'; else if(/^C/.test(h))hspan.textContent='这组是机会对照，不是稳妥建议。需要重点复核位次、学费、校区和培养方向。';}}catch(e){} }
  function apply(){try{document.body.classList.add('family-read-v291rc0familyread1');}catch(e){} renderPanel(); applyABCText(); applyCards(document); refreshDebug();}
  function schedule(){clearTimeout(timer); timer=setTimeout(apply,80);}
  function refreshDebug(){try{window.LN_DEBUG_V2983?.setFlags?.({familyRead:VERSION,familyReadStamp:STAMP,defaultParentReadingMode:true,tagCountPreserved:true,familyConflictSummary:true,familyGroupCopy:true,doesModifyFormula:false,doesChangeCandidatePool:false,doesChangeSorting:false}); window.LN_DEBUG_V2983?.detail?.('familyRead',{version:VERSION,stamp:STAMP,scope:'front-reading-structure-only',policy:{doesModifyFormula:false,doesChangeCandidatePool:false,doesChangeSorting:false,doesChangeData:false},features:['家庭报告封面','当前结论一句话','我家主要矛盾','A/B/C 家庭会议文案','卡片查看详情','复核清单','家庭群简版复制'],tagPolicy:'preserve-count'});}catch(e){} }
  function observe(){try{if(observer)return; observer=new MutationObserver(function(ms){var need=false; ms.forEach(function(m){if(m.addedNodes&&m.addedNodes.length)need=true;}); if(need)schedule();}); observer.observe(document.body,{childList:true,subtree:true});}catch(e){} }
  window.LN_FAMILY_READ_V291={ready:true,version:VERSION,stamp:STAMP,apply:apply,renderPanel:renderPanel,copyFamilyGroupSummary:function(){return copyText(familyText());},getMainContradictions:contradictions,familyText:familyText};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){bindCopy();apply();observe();},{once:true}); else {bindCopy();apply();observe();}
})();
/* ===== END assets/family-read.v291rc0familyread1.js ===== */


/* ===== V2.93RC1 familyRead final marker ===== */
(function(){
  try{
    window.LN_V293RC1_MERGE = window.LN_V293RC1_MERGE || {};
    window.LN_V293RC1_MERGE.familyRead.ready = true;
    window.LN_DEBUG_V2983 && window.LN_DEBUG_V2983.setFlags && window.LN_DEBUG_V2983.setFlags({v293rc1:true, familyRead:'v293rc1'});
  }catch(e){}
})();

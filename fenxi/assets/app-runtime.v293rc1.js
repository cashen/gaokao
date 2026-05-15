// V2.93RC1｜最终运行时合并包
// 合并范围：详细卡片懒加载、最终风险层展示、渲染事件、Markdown 导出、第6步布局保护、交互去重。
// 边界：不改 compute-pipeline / filter-engine / plan-engine，不改候选池、不改排序、不改 A/B/C 公式。
(function(){
  window.LN_V293RC1_MERGE = window.LN_V293RC1_MERGE || {};
  window.LN_V293RC1_MERGE.runtime = {ready:false, files:7, stamp:'293rc1-20260515'};
})();


/* ===== BEGIN assets/detail-lazy.v292rc2.js ===== */

// V2.93RC1｜详细卡片懒加载：专业学科/易混/取舍/规则按需生成
(function(){
  if(window.LN_DETAIL_LAZY_DISABLE===true) return;
  var VERSION='v293rc1-detail-lazy';
  var STAMP='293rc1-20260515';
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
    if(!originals.renderTaxonomyDetail && typeof window.renderTaxonomyDetail==='function' && !window.renderTaxonomyDetail.__v292Lazy){
      originals.renderTaxonomyDetail=window.renderTaxonomyDetail;
      window.renderTaxonomyDetail=function(r){ if(window.LN_DETAIL_LAZY_DISABLE===true) return originals.renderTaxonomyDetail(r); if(!r||!r.majorTaxonomy) return ''; return shell('taxonomy','查看本科目录与研究生参考','taxonomy-detail',r); };
      window.renderTaxonomyDetail.__v292Lazy=true;
    }
    if(!originals.renderConfusableMajorPanelV2946 && typeof window.renderConfusableMajorPanelV2946==='function' && !window.renderConfusableMajorPanelV2946.__v292Lazy){
      originals.renderConfusableMajorPanelV2946=window.renderConfusableMajorPanelV2946;
      window.renderConfusableMajorPanelV2946=function(r){
        try{ if(typeof window.confusablePairsForRecordV2946==='function' && !window.confusablePairsForRecordV2946(r).length) return ''; }catch(e){}
        return shell('confusable','名字相近，点开看易混专业依据','confusable-v2946 confusable-v29461',r);
      };
      window.renderConfusableMajorPanelV2946.__v292Lazy=true;
    }
    if(!originals.renderParentInterestPanelV2945 && typeof window.renderParentInterestPanelV2945==='function' && !window.renderParentInterestPanelV2945.__v292Lazy){
      originals.renderParentInterestPanelV2945=window.renderParentInterestPanelV2945;
      window.renderParentInterestPanelV2945=function(r){ return shell('parentInterest','展开专业解释与家庭取舍','parent-insight-v2945 parent-insight-v29461',r); };
      window.renderParentInterestPanelV2945.__v292Lazy=true;
    }
    if(!originals.renderRule && typeof window.renderRule==='function' && !window.renderRule.__v292Lazy){
      originals.renderRule=window.renderRule;
      window.renderRule=function(r){ if(!shouldRule(r)) return ''; return shell('rule','家长初筛规则明细','rule-breakdown',r); };
      window.renderRule.__v292Lazy=true;
    }
    var eng=window.LN_PATH_EXPLAIN_ENGINE_V2975;
    if(eng && typeof eng.detailHtml==='function' && !eng.detailHtml.__v292Lazy){
      originals.pathDetailHtml=eng.detailHtml.bind(eng);
      eng.detailHtml=function(r){ return shell('pathDetail','展开路径取舍说明','path-detail-v2975',r); };
      eng.detailHtml.__v292Lazy=true;
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
/* ===== END assets/detail-lazy.v292rc2.js ===== */


/* ===== BEGIN assets/rules-final-decision.v292rc1.js ===== */

// V2.92RC1｜A/B/C 统一裁决层：先判风险与成本资格，再导出/命名
(function(){
  if(window.LN_FINAL_DECISION_DISABLE===true) return;
  var VERSION='v292rc1-final-decision';
  var STAMP='292rc1-20260515';
  function clean(s){return String(s==null?'':s).replace(/\s+/g,' ').trim();}
  function num(v){v=Number(v);return Number.isFinite(v)?v:0;}
  function rank(){try{return window.currentRank||(typeof currentRank!=='undefined'?currentRank:null)||num(document.getElementById('myRank')&&document.getElementById('myRank').value)||null;}catch(e){return null;}}
  function rowRank(r){return num(r&& (r.rank2025||r.rank||r.minRank||r.rank_2025))||null;}
  function rowScore(r){return num(r&& (r.score2025||r.score||r.minScore||r.score_2025))||null;}
  function natureText(r){return [r&&r.schoolNatureLabel,r&&r.nature,r&&r.schoolNature&&r.schoolNature.label,r&&r.schoolNature,r&&r.major,r&&r.school,r&&r.riskFlags,r&&r.fee,r&&r.tuition,r&&r.remark].map(clean).join(' ');}
  function costFlags(r){var s=natureText(r), out=[]; if(!(r&& (r.tuition2025||r.tuition||r.fee)))out.push('学费待核验'); if(/民办|独立学院|独立/.test(s)||r&& (r.isPrivate||r.isPrivateV29475))out.push('民办/独立学院需复核'); if(/中外|合作办学|国际/.test(s)||r&& (r.isCoop||r.isCoopV29475))out.push('中外合作需复核'); if(/高收费|高费/.test(s)||r&&r.isHighFee)out.push('高收费需重点复核'); return Array.from(new Set(out));}
  function isHighCost(r){return /民办|独立|中外|高收费/.test(costFlags(r).join('|'));}
  function gapOf(r){var cr=rank(), rr=rowRank(r); if(!cr||!rr)return {gap:null,abs:null,kind:'unknown',text:'位次差待复核'}; var g=rr-cr, abs=Math.abs(g); if(g<0)return {gap:g,abs:abs,kind:'behind',text:'孩子落后约 '+abs.toLocaleString('zh-CN')+' 位'}; if(g<=500)return {gap:g,abs:abs,kind:'pressure',text:'基本压线'}; return {gap:g,abs:abs,kind:'lead',text:'孩子领先约 '+g.toLocaleString('zh-CN')+' 位'};}
  function risk(r){var g=gapOf(r).gap; if(g==null)return '需复核'; if(g<0)return '小冲/边缘冲'; if(g<=500)return '压线匹配'; if(g<=1500)return '近线匹配'; if(g<=5000)return '匹配/稳妥'; if(g<=12000)return '保底'; return '强保底/分数利用偏低';}
  function orderKey(r){var rs=risk(r); if(isHighCost(r))return 'highCost'; if(/小冲/.test(rs))return 'front'; if(/压线/.test(rs))return 'pressure'; if(/近线/.test(rs))return 'near'; if(/匹配|稳妥/.test(rs))return 'middle'; if(/强保底|分数利用偏低/.test(rs))return 'strong'; if(/保底/.test(rs))return 'safe'; return 'middle';}
  function bucketAllowed(type,r){var k=orderKey(r); if(k==='highCost')return false; if(type==='C')return ['front','pressure','near','middle'].includes(k); if(type==='B')return !['strong','highCost'].includes(k); return true;}
  function role(type,r,oldRole){var k=orderKey(r); if(k==='highCost')return '高成本观察'; if(k==='strong')return '强保底对照'; if(k==='safe')return type==='C'?'不进C组':'保底对照'; if(k==='front')return '小冲/边缘冲'; if(k==='pressure')return '压线匹配'; if(k==='near')return '近线匹配'; if(k==='middle')return oldRole||'匹配/稳妥'; return oldRole||'候选项';}
  function dedupeKey(r){return [clean(r&&r.school),clean(r&& (r.major||r.cleanMajor||r.admissionMajor)),clean(r&& (r.majorCode2025||r.admissionMajorCode||r.code||''))].join('|');}
  function closure(){try{return window.LN_RULES_CLOSURE_V291||null;}catch(e){return null;}}
  function getBuckets(){try{var c=closure(); if(c&&c.makeBuckets)return c.makeBuckets();}catch(e){} return window.latestPlanBucketsV29475Fix2||{A:[],B:[],C:[]};}
  function fieldsFor(r,type,i){try{return closure()&&closure().closureFields&&closure().closureFields(r,type,i)||{};}catch(e){return {};}}
  function merged(){var b=getBuckets(), map=new Map(), out=[]; ['A','B','C'].forEach(function(t){(b[t]||[]).forEach(function(r,i){var k=dedupeKey(r), obj=map.get(k); if(!obj){obj={type:t,index:i,row:r,fields:fieldsFor(r,t,i),sources:[]}; map.set(k,obj); out.push(obj);} obj.sources.push(t+(i+1));});}); out.forEach(function(x){x.risk=risk(x.row); x.orderKey=orderKey(x.row); x.gap=gapOf(x.row); x.costFlags=costFlags(x.row); x.highCost=isHighCost(x.row); x.allowed=bucketAllowed(x.type,x.row); x.role=role(x.type,x.row,x.fields&&x.fields.role);}); return out;}
  window.LN_FINAL_DECISION_V292={ready:true,version:VERSION,stamp:STAMP,rank:rank,gapOf:gapOf,risk:risk,orderKey:orderKey,costFlags:costFlags,isHighCost:isHighCost,bucketAllowed:bucketAllowed,role:role,mergedItems:merged};
  try{window.LN_DEBUG_V2983&&window.LN_DEBUG_V2983.setFlags&&window.LN_DEBUG_V2983.setFlags({finalDecision:'v292rc1',abcEligibilityFirst:true,dynamicRoleNaming:true,noForcedFill:true});}catch(e){}
})();
/* ===== END assets/rules-final-decision.v292rc1.js ===== */


/* ===== BEGIN assets/render-events.v292rc2.js ===== */
// V2.93RC1｜渲染事件桥：只补事件与调试口径，不改候选池、公式、排序
(function(){
  if(window.LN_RENDER_EVENTS_V292RC2_DISABLE===true) return;
  var VERSION='v293rc1-render-events';
  var STAMP='293rc1-20260515';
  var state={version:VERSION,stamp:STAMP,renderCardsWrapped:false,renderPlanABCWrapped:false,cardsEvents:0,abcEvents:0,lastCardsMs:0,lastAbcMs:0};
  function perf(){return window.performance&&performance.now?performance.now():Date.now();}
  function emit(name,detail){
    try{document.dispatchEvent(new CustomEvent(name,{detail:detail||{}}));}catch(e){try{document.dispatchEvent(new Event(name));}catch(err){}}
  }
  function flags(){
    try{window.LN_DEBUG_V2983?.setFlags?.({renderEvents:'v292rc2',renderEventsVersion:VERSION,renderCardsWrapped:state.renderCardsWrapped,renderPlanABCWrapped:state.renderPlanABCWrapped});}catch(e){}
    try{window.LN_DEBUG_V2983?.detail?.('renderEvents',Object.assign({},state));}catch(e){}
  }
  function wrapFunction(name,eventName,counterKey,msKey){
    var fn=window[name];
    if(typeof fn!=='function') return false;
    if(fn.__v292rc2RenderEventWrapped) return true;
    var wrapped=function(){
      var t=perf(), ok=true, err=null, ret;
      try{return ret=fn.apply(this,arguments);}catch(e){ok=false;err=e;throw e;}finally{
        state[counterKey]=(state[counterKey]||0)+1;
        state[msKey]=Math.round(perf()-t);
        var detail={name:name,ok:ok,ms:state[msKey],count:state[counterKey],error:err?String(err&&err.message||err):'',filtered:Array.isArray(window.filtered)?window.filtered.length:undefined,stamp:STAMP};
        if(window.queueMicrotask) queueMicrotask(function(){emit(eventName,detail);flags();});
        else setTimeout(function(){emit(eventName,detail);flags();},0);
      }
    };
    try{Object.defineProperty(wrapped,'name',{value:name+'V292RC2'});}catch(e){}
    wrapped.__v292rc2RenderEventWrapped=true;
    wrapped.__original=fn;
    window[name]=wrapped;
    return true;
  }
  function patch(){
    state.renderCardsWrapped=wrapFunction('renderCards','ln:cards-rendered','cardsEvents','lastCardsMs')||state.renderCardsWrapped;
    state.renderPlanABCWrapped=wrapFunction('renderPlanABC','ln:abc-rendered','abcEvents','lastAbcMs')||state.renderPlanABCWrapped;
    flags();
  }
  patch();
  setTimeout(patch,0);
  setTimeout(patch,800);
  setTimeout(patch,1800);
  window.LN_RENDER_EVENTS_V292RC2={ready:true,version:VERSION,stamp:STAMP,state:state,patch:patch};
})();
/* ===== END assets/render-events.v292rc2.js ===== */


/* ===== BEGIN assets/export-md.v292rc2.js ===== */
// V2.92RC｜Markdown 明细导出：统一裁决层 + 新位次分层 + DOM安全插入
// 只改 Markdown 导出；不改候选池、不改基础筛选、不改兴趣真实命中。
(function(){
  if(window.LN_EXPORT_MD4_OPT===false || window.LN_EXPORT_MD_DISABLE===true) return;
  var VERSION='v293rc1-export-md';
  var STAMP='292rc-20260515';
  var FULL_VERSION='V2.93RC1｜真实调用链合并与运行时瘦身版';
  var timer=null;
  function val(id){try{return document.getElementById(id)?.value||'';}catch(e){return '';}}
  function optText(id){try{var el=document.getElementById(id);return el?.selectedOptions?.[0]?.textContent?.trim()||el?.value||'';}catch(e){return '';}}
  function num(v){v=Number(v);return Number.isFinite(v)?v:0;}
  function fmt(n){n=Number(n);return Number.isFinite(n)&&n? n.toLocaleString('zh-CN'):'-';}
  function clean(s){return String(s==null?'':s).replace(/\s+/g,' ').trim();}
  function mdEsc(s){return clean(s).replace(/\|/g,'\\|');}
  function line(s){return clean(s)||'—';}
  function now(){return new Date().toLocaleString('zh-CN',{hour12:false});}
  function closure(){try{return window.LN_RULES_CLOSURE_V291||null;}catch(e){return null;}}
  function dc(){try{return closure()?.debugContext?.()||{};}catch(e){return {};}}
  function score(){return num(val('myScore'))||null;}
  function rank(){try{return window.currentRank||(typeof currentRank!=='undefined'?currentRank:null)||num(val('myRank'))||null;}catch(e){return num(val('myRank'))||null;}}
  function rowRank(r){return num(r?.rank2025||r?.rank||r?.minRank||r?.rank_2025)||null;}
  function rowScore(r){return num(r?.score2025||r?.score||r?.minScore||r?.score_2025)||null;}
  function rowRank24(r){return num(r?.rank2024||r?.rank_2024)||null;}
  function rowScore24(r){return num(r?.score2024||r?.score_2024)||null;}
  function scoreRank(r){var a=[]; if(rowScore(r))a.push(rowScore(r)+'分'); if(rowRank(r))a.push(fmt(rowRank(r))+'位'); return a.join(' / ')||'分数位次待复核';}
  function scoreRank24(r){var a=[]; if(rowScore24(r))a.push(rowScore24(r)+'分'); if(rowRank24(r))a.push(fmt(rowRank24(r))+'位'); return a.join(' / ')||'2024数据待复核';}
  function rankBand(r){r=Number(r); if(!r)return '待定位'; if(r<=7000)return '高分平台段'; if(r<=17000)return '学校专业平衡段'; if(r<=35000)return '专业路径比较段'; if(r<=70000)return '公办/专业取舍段'; return '本科机会边缘段';}
  function scenarioLabel(id){return ({platformSprint:'高分平台冲刺',platformStable:'高分平台稳妥',highValue:'高分性价比',employment:'普通家庭稳就业',publicLow:'省内公办稳妥',privateMajor:'民办可比较',edgeBachelor:'本科机会边缘',budgetFlexible:'预算较宽',grid:'电网能源',medical:'医学方向',exam:'考公体制',broad:'先不设限'})[id]||id||'未选择';}
  function fd(){try{return window.LN_FINAL_DECISION_V292||null;}catch(e){return null;}}
  function childGap(r){var f=fd(); if(f&&f.gapOf)return f.gapOf(r);
    var cr=rank(), rr=rowRank(r); if(!cr||!rr)return {text:'位次差待复核',gap:null,abs:null,kind:'unknown'};
    var gap=rr-cr, abs=Math.abs(gap);
    if(gap<0)return {gap:gap,abs:abs,kind:'behind',text:'孩子落后约 '+fmt(abs)+' 位'};
    if(gap<=500)return {gap:gap,abs:abs,kind:'pressure',text:'基本压线'};
    return {gap:gap,abs:abs,kind:'lead',text:'孩子领先约 '+fmt(gap)+' 位'};
  }
  function riskByGap(r,f){var d=fd(); if(d&&d.risk)return d.risk(r);
    var g=childGap(r); if(g.gap==null)return line(f?.riskLayer)||'需复核';
    if(g.gap<0)return '小冲/边缘冲';
    if(g.gap<=500)return '压线匹配';
    if(g.gap<=1500)return '近线匹配';
    if(g.gap<=5000)return '匹配/稳妥';
    if(g.gap<=12000)return '保底';
    return '强保底/分数利用偏低';
  }
  function orderInfo(r,f){var risk=riskByGap(r,f), high=isHighCost(r); if(high)return {key:'highCost',label:'高成本兜底观察',note:'民办/独立学院/中外合作/高收费等高成本项，单独观察，不混入 A/B/C 主方案。'}; if(/小冲/.test(risk))return {key:'front',label:'前段：小冲 / 边缘冲',note:'孩子位次落后 2025 最低位次，只能按小冲或边缘冲处理。'}; if(/压线/.test(risk))return {key:'pressure',label:'前段/中段之间：压线匹配',note:'领先 0–500 位，只能按压线匹配处理，不能直接写成稳妥。'}; if(/近线/.test(risk))return {key:'near',label:'中段偏前：近线匹配',note:'领先 501–1500 位，属于近线匹配，需要复核位次波动。'}; if(/匹配|稳妥/.test(risk))return {key:'middle',label:'中段：匹配 / 稳妥',note:'孩子位次领先约 1501–5000 位，可按匹配/稳妥讨论。'}; if(/强保底|分数利用偏低/.test(risk))return {key:'strong',label:'最后：强保底 / 分数利用偏低',note:'领先超过 12000 位，只能作为最后兜底。'}; if(/保底/.test(risk))return {key:'safe',label:'后段：保底',note:'领先 5001–12000 位，适合后段兜底。'}; return {key:'middle',label:'中段：匹配 / 稳妥',note:'需结合位次与复核项判断。'};}
  function natureText(r){return [r?.schoolNatureLabel,r?.nature,r?.schoolNature?.label,r?.schoolNature,r?.major,r?.school,r?.riskFlags,r?.fee,r?.tuition,r?.remark].map(clean).join(' ');}
  function costFlags(r){var d=fd(); if(d&&d.costFlags)return d.costFlags(r); var s=natureText(r), out=[]; if(!(r?.tuition2025||r?.tuition||r?.fee))out.push('学费待核验'); if(/民办|独立学院|独立/.test(s)||r?.isPrivate||r?.isPrivateV29475)out.push('民办/独立学院需复核'); if(/中外|合作办学|国际/.test(s)||r?.isCoop||r?.isCoopV29475)out.push('中外合作需复核'); if(/高收费|高费/.test(s)||r?.isHighFee)out.push('高收费需重点复核'); return Array.from(new Set(out));}
  function isHighCost(r){var d=fd(); if(d&&d.isHighCost)return d.isHighCost(r); return /民办|独立|中外|高收费/.test(costFlags(r).join('|'));}
  function yearlyChange(r){var r25=rowRank(r), r24=rowRank24(r); if(!r25||!r24)return {text:'2024/2025位次变化：数据不完整，需复核。',brief:'需复核',label:'需复核'}; var d=r25-r24, abs=Math.abs(d); var brief='基本持平', label='近两年位次基本接近'; if(abs>=800&&d<0){brief='收紧 '+fmt(abs)+' 位'; label='2025 比 2024 收紧约 '+fmt(abs)+' 位，更难进';} else if(abs>=800&&d>0){brief='放宽 '+fmt(abs)+' 位'; label='2025 比 2024 放宽约 '+fmt(abs)+' 位，更好进';} var extra=r?.rankChangeLabel?'（系统标记：'+clean(r.rankChangeLabel)+'）':''; return {text:'2025：'+scoreRank(r)+'；2024：'+scoreRank24(r)+'；变化判断：'+label+extra,brief:brief,label:label+extra};}
  function planChange(r){var p25=r?.plan2025||r?.plan_2025||r?.enrollPlan2025||r?.招生计划2025; var p24=r?.plan2024||r?.plan_2024||r?.enrollPlan2024||r?.招生计划2024; if(p25||p24){var arr=[]; if(p25)arr.push('2025计划：'+p25); if(p24)arr.push('2024计划：'+p24); return arr.join('；');} return '招生计划变化：当前数据未完整接入，需以当年招生计划复核。';}
  function natureCostCampus(r){var n=r?.schoolNatureLabel||r?.nature||r?.schoolNature?.label||r?.schoolNature||'需核验'; var fee=r?.tuition2025||r?.tuition||r?.fee||'待核验'; var area=[r?.schoolProvince,r?.schoolCity].filter(Boolean).join('·')||r?.lnArea||'地域待复核'; var flags=costFlags(r); return '办学性质：'+line(n)+'；学费：'+line(fee)+'；地域/校区：'+line(area)+(flags.length?'；'+flags.join('；'):'');}
  function majorMeta(r){var parts=[]; if(r?.schoolCode2025)parts.push('院校代码/代号：'+r.schoolCode2025); if(r?.majorCode2025)parts.push('招生专业代号：'+r.majorCode2025); parts.push('本科专业目录代码：需复核'); parts.push('门类/专业类：需按本科专业目录复核'); return parts.join('；');}
  function majorClassRisk(r){var m=clean(r?.major||r?.admissionMajor||''); return /类|试验班|大类|工科试验|理科试验/.test(m)?'大类招生提醒：疑似大类/试验班，不等同于最终专业，需复核分流专业、分流规则和转专业政策。':'大类招生：未识别为明显大类；仍建议复核招生章程中的培养方向。';}
  function fieldsFor(r,type,i){try{return closure()?.closureFields?.(r,type,i)||{};}catch(e){return {};}}
  function evalFor(r,type){try{return closure()?.evaluate?.(r,type)||{};}catch(e){return {};}}
  function getBuckets(){try{var c=closure(); if(c&&c.makeBuckets){var b=c.makeBuckets(); window.latestPlanBucketsV29475Fix2=b; return b;}}catch(e){} return window.latestPlanBucketsV29475Fix2||{A:[],B:[],C:[]};}
  function dedupeKey(r){return [clean(r?.school),clean(r?.major||r?.cleanMajor||r?.admissionMajor),clean(r?.majorCode2025||r?.admissionMajorCode||r?.code||'')].join('|');}
  function mergedItems(){var b=getBuckets(), map=new Map(), out=[]; ['A','B','C'].forEach(function(t){(b[t]||[]).forEach(function(r,i){var k=dedupeKey(r); var obj=map.get(k); if(!obj){obj={type:t,index:i,row:r,fields:fieldsFor(r,t,i),sources:[]}; map.set(k,obj); out.push(obj);} obj.sources.push(t+(i+1));});}); return out;}
  function tagsFor(x){var e=evalFor(x.row,x.type), f=x.fields||{}, arr=[]; if(f.tags)arr=arr.concat(String(f.tags).split('|')); if(e.tags)arr=arr.concat(e.tags); if(x.sources&&x.sources.length>1)arr.push('同时命中：'+x.sources.join('/')); return Array.from(new Set(arr.map(clean).filter(Boolean))).slice(0,10);}
  function finalWhy(x,oi){if(oi.key==='highCost')return '未进入 A/B/C 主方案：因办学/费用形态与当前口径存在成本复核项，仅作为高成本兜底观察。'; if(oi.key==='strong')return '不应作为主讨论项：安全垫过大，只能作为最后兜底。'; if(oi.key==='front')return '可放前段小冲：位次略落后，不能当稳妥项。'; if(oi.key==='pressure')return '压线匹配：基本压线，不能直接写成稳妥。'; if(x.type==='A')return '进入 A 组：用于守家庭底线，重点看费用、学校性质、地域、位次安全和孩子能否接受。'; if(x.type==='B')return '进入 B 组：用于家庭重点讨论，重点看专业路径、孩子兴趣、家庭目标和未来出口。'; return '进入 C 组：符合机会项门槛，用于看小冲、压线或明确提档机会。';}
  function gainSacrifice(x,oi){if(oi.key==='highCost')return '得到：兜底或城市观察；牺牲：成本、办学性质和分数利用需重点复核。'; if(oi.key==='strong')return '得到：安全垫；牺牲：分数利用效率和学校/专业上限。'; if(oi.key==='front')return '得到：上探机会；牺牲：录取确定性。'; if(oi.key==='pressure')return '得到：贴近分数的机会；牺牲：稳定性，需要压线复核。'; return line(x.fields?.tradeoff)||'得到/牺牲需结合家庭目标复核';}
  function candidateMd(x){var r=x.row,f=x.fields||{},risk=riskByGap(r,f),oi=orderInfo(r,f),school=line(r?.school),major=line(r?.major||r?.cleanMajor||r?.admissionMajor); var src=(x.sources&&x.sources.length?x.sources.join('/'):(x.type+(x.index+1))); var title='### '+(oi.key==='highCost'?'高成本兜底观察':src+' '+line(f.role||'候选项'))+'｜'+school+'｜'+major; var arr=[title,'']; arr.push('- 风险层：'+risk); arr.push('- 我家位次对比：我家约 '+(rank()?fmt(rank())+' 位':'待定位')+'；2025最低位次 '+(rowRank(r)?fmt(rowRank(r))+' 位':'待复核')+'；'+childGap(r).text+'。'); arr.push('- 近两年投档：'+yearlyChange(r).text); arr.push('- 变化提醒：'+planChange(r)); arr.push('- 在最终志愿草案中的位置：'+oi.label+'（'+oi.note+'）'); arr.push('- 得到/牺牲：'+gainSacrifice(x,oi)); arr.push('- 归类说明：'+finalWhy(x,oi)); if(x.sources&&x.sources.length>1)arr.push('- 重复命中已合并：'+x.sources.join(' / ')); arr.push('- 办学/费用/校区：'+natureCostCampus(r)); var cf=costFlags(r); if(cf.length)arr.push('- 成本复核拆分：'+cf.join('；')); arr.push('- 专业代码与门类：'+majorMeta(r)); arr.push('- 大类/分流：'+majorClassRisk(r)); arr.push('- 就业环境：'+line(f.environment)); arr.push('- 毕业出口：'+line(f.exit)); arr.push('- 下一步复核：'+line(f.review)); var tg=tagsFor(x); if(tg.length)arr.push('- 标签：'+tg.join(' / ')); var notes=line(f.notes || (evalFor(r,x.type).notes||[]).join('；')); if(notes&&notes!=='—')arr.push('- 提醒：'+notes); return arr.join('\n');}
  function sectionMd(type,title,desc){var list=mergedItems().filter(function(x){return x.type===type && orderInfo(x.row,x.fields).key!=='highCost' && !(type==='C'&&['safe','strong','highCost'].indexOf(orderInfo(x.row,x.fields).key)>=0);}); var arr=['## '+title,'',desc,'']; if(!list.length)arr.push('本组未强行补足。当前条件下，符合本组定义的候选不足，系统未用低分民办或强保底凑数。'); else list.forEach(function(x){arr.push(candidateMd(x),'');}); return arr.join('\n');}
  function highCostBlock(){var list=mergedItems().filter(function(x){var oi=orderInfo(x.row,x.fields); return oi.key==='highCost' || oi.key==='strong';}); if(!list.length)return ''; var arr=['## 高成本/强保底观察','','以下项目不混入 A/B/C 主方案。民办、高收费、独立学院、中外合作、强保底或分数利用明显偏低的项目，只适合单独观察和复核。','']; list.forEach(function(x){arr.push(candidateMd(x),'');}); return arr.join('\n');}
  function groups(){var g={front:[],pressure:[],near:[],middle:[],safe:[],strong:[],highCost:[],observe:[]}; mergedItems().forEach(function(x){var oi=orderInfo(x.row,x.fields); (g[oi.key]||g.middle).push(x);}); return g;}
  function comparisonSummaryBlock(){var arr=['## 近两年位次变化汇总','','| 方案 | 学校 | 专业 | 2025位次 | 2024位次 | 变化 | 判断 |','|---|---|---|---:|---:|---:|---|']; mergedItems().forEach(function(x){var r=x.row,yc=yearlyChange(r),src=x.sources&&x.sources.length?x.sources.join('/'):(x.type+(x.index+1)); arr.push('| '+mdEsc(src)+' | '+mdEsc(r?.school)+' | '+mdEsc(r?.major||r?.cleanMajor||r?.admissionMajor)+' | '+fmt(rowRank(r))+' | '+fmt(rowRank24(r))+' | '+mdEsc(yc.brief)+' | '+mdEsc(yc.label)+' |');}); arr.push('','位次变化只能作为初步参考。若变化较大，必须复核当年招生计划、专业名称、学费、校区和是否单列代码。'); return arr.join('\n');}
  function riskSummaryBlock(){var gr=groups(), cost={feeUnknown:0,private:0,coop:0,high:0}; mergedItems().forEach(function(x){var flags=costFlags(x.row).join('|'); if(/学费待核验/.test(flags))cost.feeUnknown++; if(/民办|独立/.test(flags))cost.private++; if(/中外/.test(flags))cost.coop++; if(/高收费/.test(flags))cost.high++;}); return ['## 风险汇总','','- 位次落后项（小冲/边缘冲 + 机会观察）：'+((gr.front||[]).length+(gr.observe||[]).length)+' 个','- 压线匹配项：'+(gr.pressure||[]).length+' 个','- 近线匹配项：'+(gr.near||[]).length+' 个','- 匹配/稳妥项：'+(gr.middle||[]).length+' 个','- 保底项：'+(gr.safe||[]).length+' 个','- 强保底/分数利用偏低：'+(gr.strong||[]).length+' 个','- 高成本兜底观察：'+(gr.highCost||[]).length+' 个','- 学费待核验：'+cost.feeUnknown+' 个','- 民办/独立学院需复核：'+cost.private+' 个','- 中外合作需复核：'+cost.coop+' 个','- 高收费需重点复核：'+cost.high+' 个',''].join('\n');}
  function volunteerOrderBlock(){var gr=groups(), labels=[['front','前段：小冲 / 边缘冲'],['pressure','前段/中段之间：压线匹配'],['near','中段偏前：近线匹配'],['middle','中段：匹配 / 稳妥'],['safe','后段：保底'],['strong','最后：强保底 / 分数利用偏低'],['highCost','高成本兜底观察'],['observe','机会观察：暂不进正式前段']]; var arr=['## 最终志愿草案排序建议（讨论版）','','注意：以下不是正式志愿表，只是把 A/B/C 候选按辽宁“专业+学校”平行志愿思路重新整理。报告展示顺序不等于最终志愿顺序。','']; labels.forEach(function(p){var list=gr[p[0]]||[]; arr.push('### '+p[1]); if(!list.length){arr.push('暂无。',''); return;} list.forEach(function(x,i){var r=x.row,src=x.sources&&x.sources.length?x.sources.join('/'):(x.type+(x.index+1)); arr.push((i+1)+'. '+line(r?.school)+'｜'+line(r?.major||r?.cleanMajor||r?.admissionMajor)+'｜'+scoreRank(r)+'｜'+childGap(r).text+'｜来源：'+src);}); arr.push('');}); arr.push('原则：先判位次差和成本资格，再进组。按新分层：落后=小冲/边缘冲；领先0–500=压线匹配；领先501–1500=近线匹配；领先1501–5000=匹配/稳妥；领先5001–12000=保底；领先12000以上=强保底/分数利用偏低。强保底和高成本观察不能排在前面。'); return arr.join('\n');}
  function conclusion(){var r=rank(),s=score(),c=dc(),base=(s?String(s)+' 分':'当前分数')+(r?' / 约 '+fmt(r)+' 位':'')+'，大致属于“'+rankBand(r)+'”。'; if(!r&&!s)return '先输入分数或位次，再生成 Markdown 报告。'; return base+' 本版先判位次风险和成本资格，再生成 A/B/C；候选不足不强行凑数。';}
  function contradictions(){var c=dc(), out=[]; if(c.scenarioPriorityConflict)out.push('我家情况和“当前优先考虑”不完全一致，需确认是否恢复为场景默认。'); if(c.scenarioEffective==='grid'&&c.fieldRejectEffective)out.push('想看电网/能源，但又不接受现场/设备环境，需要重点复核。'); if(!out.length)out.push('输入条件没有明显强冲突；仍需看输出项是否出现高成本、强保底或分数利用偏低。'); return out;}
  function metaLines(){var c=dc(); return ['生成时间：'+now(),'版本：'+FULL_VERSION,'输入：'+(score()?score()+' 分':'分数待填')+(rank()?' / 约 '+fmt(rank())+' 位':''),'分数段：'+rankBand(rank()),'我家情况：'+scenarioLabel(c.scenarioEffective||''),'当前优先考虑：'+(optText('priority')||c.priorityEffective||'未设置'),'地域：'+(optText('regionMode')||val('regionMode')||'未设置'),'预算：'+(optText('budget')||val('budget')||'未设置')].join('  \n');}
  function finalBlocks(){return ['## 没放到主方案里的常见原因','','- 民办/独立学院、高收费、中外合作：普通家庭普通学费优先时，不进入 A/B/C 主方案，只作观察或不列明细。','- 强保底/分数利用偏低：不能叫“最匹配主项”，只能作为后段或最后兜底。','- C 组候选不足：宁可少，不用低分民办或强保底凑数。','','## 下一步建议','','1. 先看 B 组里的“匹配/稳妥”和“压线讨论项”，不要把强保底当主项。','2. A 组用于守底线，但小冲不能被叫成保底，保底也不能被叫成小冲。','3. C 组只看真实机会项，不拿低分民办填充。','4. 最终志愿草案按“小冲—压线—近线—匹配/稳妥—保底—强保底”重新排序。','','## 数据口径说明','','- 分数位次：按当前系统内置一分一段口径换算。','- 投档数据：基于系统内置 2024/2025 辽宁物理类投档数据。','- 位次变化：用于初步复核冷热和安全垫，不代表 2026 年必然趋势。','- 最终复核：以辽宁招生考试之窗、学校招生章程、当年招生计划、学费、校区和培养方向为准。'].join('\n');}
  function fullMarkdown(){var arr=['# 辽宁物理类高考志愿初选报告（Markdown 明细复核版）','',metaLines(),'','> 这是一份家庭初选讨论稿，不替代招生章程、官方计划、学费、校区和培养方向复核。','','## 1. 当前结论','',conclusion(),'','## 2. 我家主要矛盾','']; contradictions().forEach(function(x){arr.push('- '+x);}); arr.push('',sectionMd('A','3. A 先守住底线','这组先看家庭底线：费用、学校性质、地域和孩子能否接受。'),sectionMd('B','4. B 重点拿出来讨论','这组是家庭重点讨论区：不能把强保底叫最匹配。'),sectionMd('C','5. C 想看看机会','这组只放小冲、压线或明确提档机会；不放明显强保底或低分民办。'),highCostBlock(),comparisonSummaryBlock(),riskSummaryBlock(),volunteerOrderBlock(),finalBlocks()); return arr.filter(Boolean).join('\n');}
  function selectedMarkdown(){var rows=[]; try{rows=(window.candidates||[]).slice();}catch(e){} if(!rows.length){try{rows=JSON.parse(localStorage.getItem('ln_candidates_v292')||'[]')||[];}catch(e){}} var arr=['# 辽宁物理类自选池 Markdown 复核稿','',metaLines(),'']; if(!rows.length){arr.push('当前自选池为空。'); return arr.join('\n');} rows.forEach(function(r,i){try{r=(window.DATA||[]).find(function(x){return String(x.id)===String(r.id);})||r;}catch(e){} var x={type:'自选',index:i,row:r,fields:fieldsFor(r,'B',i),sources:['自选']}; arr.push(candidateMd(x),'');}); arr.push(riskSummaryBlock()); return arr.join('\n');}
  function copyText(t){if(navigator.clipboard&&navigator.clipboard.writeText)return navigator.clipboard.writeText(t); var ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();return Promise.resolve();}
  function toast(msg){var el=document.getElementById('exportMdToastV291'); if(el)el.textContent=msg; setTimeout(function(){if(el&&el.textContent===msg)el.textContent='';},2600);}
  function safeInsert(parent,node,before){
    try{
      if(!parent||!node)return false;
      if(before&&before.parentNode===parent){parent.insertBefore(node,before);}else{parent.appendChild(node);}
      return true;
    }catch(e){
      try{parent&&node&&parent.appendChild(node);return true;}catch(err){console.warn('[export-md-v292rc2] safeInsert failed',err);return false;}
    }
  }

  function inject(){
    try{
      var area=document.querySelector('.family-read-actions-v291');
      if(area){
        area.querySelectorAll('[data-export-md4="full"], #exportMdToastV291').forEach(function(x){x.remove();});
        var btn=document.createElement('button');
        btn.type='button';
        btn.className='export-md-action-v292';
        btn.dataset.exportMd4='full';
        btn.textContent='复制 Markdown 明细版';
        var sp=document.createElement('span');
        sp.id='exportMdToastV291';
        sp.className='export-md-toast-v291';
        safeInsert(area,btn,area.firstChild&&area.firstChild.parentNode===area?area.firstChild:null);
        safeInsert(area,sp,btn.nextSibling&&btn.nextSibling.parentNode===area?btn.nextSibling:null);
      }
      var cand=document.getElementById('candidateArea');
      var candidateList=document.getElementById('candidateList');
      var side=(cand&&cand.querySelector(':scope > .rightPanel')) || (candidateList&&candidateList.closest('aside')) || null;
      if(side && !side.querySelector('[data-export-md4="selected"]')){
        var bar=document.createElement('div');
        bar.className='export-md-self-v292rc2';
        bar.innerHTML='<button type="button" class="export-md-action-v291" data-export-md4="selected">复制自选池 Markdown</button><span class="export-md-toast-v291" id="exportMdSelfToastV291"></span>';
        if(candidateList && candidateList.parentNode===side) safeInsert(side,bar,candidateList);
        else safeInsert(side,bar,null);
      }
      try{window.__LN_EXPORT_MD_LAYOUT__={version:VERSION,stamp:STAMP,selectedButtonHost:side?(side.className||side.tagName):'none',insideCandidateArea:!!(side&&cand&&side.parentNode===cand),usesDomObserver:false};}catch(e){}
    }catch(e){console.warn('[export-md-v292rc2] inject skipped',e);}
  }
  function bind(){
    if(window.__LN_EXPORT_MD_V293RC1_BOUND__) return;
    window.__LN_EXPORT_MD_V293RC1_BOUND__=true;
    document.addEventListener('click',function(e){var b=e.target.closest('[data-export-md4]'); if(!b)return; var mode=b.dataset.exportMd4; if(mode==='full')copyText(fullMarkdown()).then(function(){toast('已复制 Markdown 明细版');}); if(mode==='selected')copyText(selectedMarkdown()).then(function(){var s=document.getElementById('exportMdSelfToastV291'); if(s)s.textContent='已复制自选池 Markdown'; setTimeout(function(){if(s)s.textContent='';},2600);});});
  }
  function refreshDebug(){try{window.LN_DEBUG_V2983?.setFlags?.({exportMd:'v293rc1',exportMdStamp:STAMP, exportMdRc2:false,exportMdRc1:false,exportMdV293RC1:true,markdownCopy:true,markdownDownload:false,markdownRankDetail:true,markdownVolunteerOrder:true,mdSortPolicy:'gap-based-md5-0-500-1500-5000-12000',exportMdObserver:'events-only',doesModifyFormula:false,doesChangeCandidatePool:false,doesChangeSorting:false}); window.__LN_EXPORT_MD_STATE__={version:VERSION,stamp:STAMP,ready:true,md5fix1:true,rc2:false,v293rc1:true,observer:'events-only'};}catch(e){}}
  function apply(){inject(); refreshDebug();}
  function boot(){
    bind(); apply();
    document.addEventListener('ln:cards-rendered',apply);
    document.addEventListener('ln:abc-rendered',apply);
    document.addEventListener('ln:candidates-rendered',apply);
    setTimeout(apply,500);
    setTimeout(apply,1500);
  } window.LN_EXPORT_MD_V291={ready:true,version:VERSION,stamp:STAMP,fullMarkdown:fullMarkdown,selectedMarkdown:selectedMarkdown,md5:true,v292rc:true,v292rc1:false,v292rc2:false,v293rc1:true}; window.LN_EXPORT_MD_V292=window.LN_EXPORT_MD_V291; if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot); else boot();
})();
/* ===== END assets/export-md.v292rc2.js ===== */


/* ===== BEGIN assets/stability-clean.v292rc2.js ===== */
// V2.93RC1｜启动/布局/UI 收口层：不改候选池与底层公式
(function(){
  if(window.LN_UI_CLEAN_DISABLE===true) return;
  var VERSION='V2.93RC1';
  var STAMP='293rc1-20260515';
  var state={version:VERSION,stamp:STAMP,applyCount:0,candidateAreaFixed:false,exportButtonOutsideMainGrid:false};
  function ready(fn){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn);else fn();}
  function apply(){
    state.applyCount++;
    document.body.classList.add('stability-clean-v292rc1','stability-clean-v292rc2');
    var ca=document.getElementById('candidateArea');
    if(ca){ca.classList.add('candidate-step-v292','candidate-step-v292rc2'); ca.classList.remove('candidate-step-v292rc1'); ca.setAttribute('data-step-label','⑥ 详细候选与自选'); state.candidateAreaFixed=true;}
    var cards=document.getElementById('cards');
    if(cards){cards.classList.remove('cards-wide-v292');}
    var misplaced=ca?ca.querySelector(':scope > .export-md-self-v292rc1, :scope > .export-md-self-v292rc2'):null;
    if(misplaced){try{misplaced.remove();}catch(e){}}
    state.exportButtonOutsideMainGrid=!document.querySelector('#candidateArea > .export-md-self-v292rc1, #candidateArea > .export-md-self-v292rc2');
    try{window.__LN_ACTIVE_UI_CLEAN__={version:VERSION,stamp:STAMP,ready:true,candidateAreaNoPseudo:true,gridFixed:true,state:state};}catch(e){}
    try{window.LN_DEBUG_V2983?.setFlags?.({stabilityClean:'v292rc2',uiClean:true,activeVersion:VERSION,legacyMdLoaded:false,legacyFrontfixLoaded:false,candidateAreaGridFixed:true});window.LN_DEBUG_V2983?.detail?.('stabilityCleanV292RC2',state);}catch(e){}
  }
  ready(function(){apply(); setTimeout(apply,300); setTimeout(apply,1200);});
  document.addEventListener('ln:cards-rendered',apply);
  document.addEventListener('ln:abc-rendered',apply);
  window.LN_STABILITY_CLEAN_V292RC2={ready:true,version:VERSION,stamp:STAMP,state:state,apply:apply};
})();
/* ===== END assets/stability-clean.v292rc2.js ===== */


/* ===== BEGIN assets/interact-stability.v29rc1.js ===== */
// V2.9RC.fix-interact1: drawer close refresh de-duplication and safe delayed apply.
// Boundary: do not change formulas, filters, A/B/C rules, or click semantics.
(function(){
  const VERSION='V2.9RC.fix-interact1';
  const STAMP='29rc-interact1-20260513';
  const perf=()=>window.performance&&performance.now?performance.now():Date.now();
  const opt=()=>window.LN_INTERACT_FIX_OPT!==false;
  const state={
    version:VERSION,
    stamp:STAMP,
    patched:false,
    lastAppliedFingerprint:'',
    lastOpenFingerprint:'',
    lastClose:null,
    suppressed:0,
    allowed:0,
    delayed:0,
    lastDecision:null
  };
  function dbg(name,obj){try{window.LN_DEBUG_V2983?.detail?.(name,Object.assign({version:STAMP},obj||{}));}catch(e){}}
  function flags(obj){try{window.LN_DEBUG_V2983?.setFlags?.(obj||{});}catch(e){}}
  function rt(){return window.LN_CHILD_INTEREST_RUNTIME_V296||window.LN_CHILD_INTEREST_RUNTIME_V298||window.LN_CHILD_INTEREST_RUNTIME_V2976;}
  function tr(){return window.LN_CHILD_INTENT_TRANSLATOR_V298||window.LN_CHILD_INTENT_TRANSLATOR_V2976||window.LN_CHILD_INTENT_TRANSLATOR_V2975;}
  function drawer(){return window.LN_DRAWER_V296;}
  function normArray(a,sort){
    const out=Array.isArray(a)?a.filter(x=>x!==undefined&&x!==null).map(String):[];
    return sort?[...out].sort():out;
  }
  function fingerprint(){
    let child={}, intent={};
    try{
      const s=rt()?.readState?.()||{};
      child={
        mode:String(s.mode||''),
        selectedGroups:normArray(s.selectedGroups,false),
        selectedMajors:normArray(s.selectedMajors,false),
        selectedKeywords:normArray(s.selectedKeywords,true),
        disabledAutoMappings:normArray(s.disabledAutoMappings,true),
        manualOnlyInterest:!!s.manualOnlyInterest
      };
    }catch(e){child={error:'child-read-failed'};}
    try{
      const ts=tr()?.readState?.()||{};
      intent={selectedIntentIds:normArray(ts.selectedIntentIds,false)};
    }catch(e){intent={error:'intent-read-failed'};}
    return JSON.stringify({child,intent});
  }
  function isChildInterestReason(reason){
    return /child-interest|child-intent|interest/.test(String(reason||''));
  }
  function isDrawerCloseReason(reason){
    return /drawer-close|flush-drawer-close/.test(String(reason||''));
  }
  function setLastApplied(fp,source){
    state.lastAppliedFingerprint=fp||fingerprint();
    dbg('interactLastApplied',{source:source||'',fingerprintHash:hash(state.lastAppliedFingerprint)});
  }
  function hash(s){
    s=String(s||''); let h=0;
    for(let i=0;i<s.length;i++){h=((h<<5)-h+s.charCodeAt(i))|0;}
    return String(h);
  }
  function patchDrawerClose(){
    const d=drawer();
    if(!d||d.__v29rcInteractClosePatched||typeof d.close!=='function')return false;
    const old=d.close;
    d.close=function(){
      const t=perf();
      const type=window.__LN_ACTIVE_DRAWER_TYPE||'';
      const before=fingerprint();
      const r=old.apply(this,arguments);
      const after=fingerprint();
      state.lastClose={
        at:perf(),
        type,
        beforeHash:hash(before),
        afterHash:hash(after),
        openHash:hash(state.lastOpenFingerprint),
        appliedHash:hash(state.lastAppliedFingerprint),
        changedSinceApplied:after!==state.lastAppliedFingerprint,
        changedDuringClose:before!==after,
        ms:Math.round(perf()-t)
      };
      dbg('interactDrawerClose',state.lastClose);
      return r;
    };
    d.__v29rcInteractClosePatched=true;
    return true;
  }
  function patchDrawerOpen(){
    const d=drawer();
    if(!d||d.__v29rcInteractOpenPatched||typeof d.open!=='function')return false;
    const old=d.open;
    d.open=function(){
      state.lastOpenFingerprint=fingerprint();
      dbg('interactDrawerOpen',{type:window.__LN_ACTIVE_DRAWER_TYPE||'',fingerprintHash:hash(state.lastOpenFingerprint)});
      return old.apply(this,arguments);
    };
    d.__v29rcInteractOpenPatched=true;
    return true;
  }
  function patchScheduler(){
    const sch=window.LN_REFRESH_SCHEDULER_V296;
    if(!sch||sch.__v29rcInteractPatched||typeof sch.request!=='function')return false;
    const old=sch.request.bind(sch);
    sch.request=function(raw){
      if(!opt())return old(raw);
      const req=Object.assign({},raw||{});
      const reason=String(req.reason||'');
      const fp=fingerprint();
      const close=state.lastClose;
      const recentClose=close && (perf()-Number(close.at||0)<2600);
      const childReason=isChildInterestReason(reason);
      const closeReason=isDrawerCloseReason(reason);
      const sameAsApplied=fp===state.lastAppliedFingerprint;
      if(childReason && closeReason && recentClose && sameAsApplied){
        state.suppressed++;
        state.lastDecision={reason,decision:'suppress-no-change',at:new Date().toLocaleTimeString(),suppressed:state.suppressed,fpHash:hash(fp)};
        dbg('interactRefreshDecision',state.lastDecision);
        flags({interactFix:'v29rcfix1',lastInteractDecision:'suppress-no-change',lastInteractReason:reason});
        try{window.LN_CHILD_INTEREST_UI_V296?.renderSummary?.();}catch(e){}
        return Promise.resolve({ok:true,skippedFull:true,suppressed:true,reason});
      }
      if(childReason && closeReason && recentClose && !sameAsApplied){
        const oldDelay=Number(req.delay||0);
        req.delay=Math.max(oldDelay,1100);
        state.delayed++;
        state.lastDecision={reason,decision:'delay-after-close',oldDelay,delay:req.delay,at:new Date().toLocaleTimeString(),fpHash:hash(fp),appliedHash:hash(state.lastAppliedFingerprint)};
        dbg('interactRefreshDecision',state.lastDecision);
        flags({interactFix:'v29rcfix1',lastInteractDecision:'delay-after-close',lastInteractReason:reason});
      }else if(childReason){
        state.lastDecision={reason,decision:'allow',delay:req.delay||0,at:new Date().toLocaleTimeString(),fpHash:hash(fp)};
        dbg('interactRefreshDecision',state.lastDecision);
      }
      const p=old(req);
      if(req.level!=='ui-only' && req.level!=='render-only'){
        Promise.resolve(p).then(()=>{setLastApplied(fingerprint(),'scheduler:'+reason);}).catch(()=>{});
      }
      state.allowed++;
      return p;
    };
    sch.__v29rcInteractPatched=true;
    return true;
  }
  function patchApplyMarker(){
    if(window.__LN_INTERACT_APPLY_MARKER_PATCHED)return false;
    // compute-pipeline may patch applyFilters after this file. Retry later until the final function exists.
    const fn=window.applyFilters;
    if(typeof fn!=='function'||fn.__v29rcInteractMarked)return false;
    const wrapped=function(){
      const t=perf();
      const r=fn.apply(this,arguments);
      try{setLastApplied(fingerprint(),'applyFilters');}catch(e){}
      dbg('interactApplyMarker',{ms:Math.round(perf()-t),reason:arguments[0]||'',fpHash:hash(state.lastAppliedFingerprint)});
      return r;
    };
    wrapped.__v29rcInteractMarked=true;
    wrapped.__original=fn;
    window.applyFilters=wrapped;
    window.__LN_INTERACT_APPLY_MARKER_PATCHED=true;
    return true;
  }
  function patch(){
    patchDrawerOpen();
    patchDrawerClose();
    patchScheduler();
    patchApplyMarker();
    if(!state.lastAppliedFingerprint)setLastApplied(fingerprint(),'init');
    state.patched=true;
    flags({interactFix:'v29rcfix1',interactFixOpt:opt(),interactVersion:STAMP});
    dbg('interactPatch',{drawerOpenPatched:!!drawer()?.__v29rcInteractOpenPatched,drawerClosePatched:!!drawer()?.__v29rcInteractClosePatched,schedulerPatched:!!window.LN_REFRESH_SCHEDULER_V296?.__v29rcInteractPatched,applyMarkerPatched:!!window.__LN_INTERACT_APPLY_MARKER_PATCHED,opt:opt()});
  }
  function boot(){patch(); setTimeout(patch,0); setTimeout(patch,800); setTimeout(patch,1800);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
  window.LN_INTERACT_STABILITY_V29RC1={ready:true,version:VERSION,stamp:STAMP,state,patch,fingerprint};
})();
/* ===== END assets/interact-stability.v29rc1.js ===== */


/* ===== BEGIN assets/interact-dedupe.v292rc2.js ===== */
// V2.9RC.fix-interact2: de-duplicate repeated applyFilters calls from the same filter-control change.
// Boundary: do not change formulas, filter rules, A/B/C, ranking, click semantics, compute-pipeline, plan-engine, or filter-engine.
(function(){
  const VERSION = 'V2.93RC1.interact-dedupe';
  const STAMP = '292rc2-interact-dedupe-20260515';
  if (window.LN_INTERACT_DEDUPE_V292RC2 && window.LN_INTERACT_DEDUPE_V292RC2.stamp === STAMP) return;

  window.LN_INTERACT_DEDUPE_OPT = (window.LN_INTERACT_DEDUPE_OPT !== false);
  window.LN_INTERACT_DEDUPE_VERSION = STAMP;

  const perf = () => (window.performance && performance.now ? performance.now() : Date.now());
  const state = {
    version: VERSION,
    stamp: STAMP,
    opt: !!window.LN_INTERACT_DEDUPE_OPT,
    patched: false,
    applyWrapped: false,
    changeListenerBound: false,
    pendingTimer: null,
    pendingReason: '',
    pendingFingerprint: '',
    pendingAt: 0,
    lastAppliedFingerprint: '',
    lastApplyAt: 0,
    lastApplyMs: 0,
    lastReason: '',
    lastSkipReason: '',
    applied: 0,
    skipped: 0,
    merged: 0,
    directDuplicateSkipped: 0,
    scheduled: 0,
    lastControl: null
  };

  function hashText(s){
    s = String(s || '');
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return String(h);
  }

  function detail(name, obj){
    try { window.LN_DEBUG_V2983?.detail?.(name, Object.assign({version: STAMP}, obj || {})); } catch(e) {}
  }
  function flags(obj){
    try { window.LN_DEBUG_V2983?.setFlags?.(obj || {}); } catch(e) {}
  }
  function markDebug(extra){
    const payload = {
      version: STAMP,
      opt: !!window.LN_INTERACT_DEDUPE_OPT,
      applied: state.applied,
      skipped: state.skipped,
      merged: state.merged,
      directDuplicateSkipped: state.directDuplicateSkipped,
      scheduled: state.scheduled,
      lastApplyMs: state.lastApplyMs,
      lastReason: state.lastReason,
      lastSkipReason: state.lastSkipReason,
      pendingReason: state.pendingReason,
      pendingFingerprintHash: hashText(state.pendingFingerprint),
      lastAppliedFingerprintHash: hashText(state.lastAppliedFingerprint),
      lastControl: state.lastControl,
      extra: extra || null
    };
    detail('interactDedupe', payload);
    flags({interactDedupe:'v292rc2', interactDedupeOpt:!!window.LN_INTERACT_DEDUPE_OPT, interactDedupeVersion:STAMP, interactDedupeRoutesViaScheduler:true});
  }

  function valOf(id){
    const el = document.getElementById(id);
    if (!el) return '';
    const tag = (el.tagName || '').toLowerCase();
    const type = (el.type || '').toLowerCase();
    if (type === 'checkbox' || type === 'radio') return el.checked ? '1' : '0';
    if (tag === 'select' && el.multiple) return Array.from(el.selectedOptions || []).map(o => o.value).sort().join(',');
    return String(el.value || '');
  }

  function activeChipKeys(selector, attr){
    try {
      return Array.from(document.querySelectorAll(selector))
        .filter(el => el.classList && el.classList.contains('active'))
        .map(el => String(el.dataset?.[attr] || el.textContent || '').trim())
        .filter(Boolean)
        .sort();
    } catch(e) { return []; }
  }

  function childInterestFingerprintParts(){
    const parts = [];
    try {
      const rt = window.LN_CHILD_INTEREST_RUNTIME_V296 || window.LN_CHILD_INTEREST_RUNTIME_V298 || window.LN_CHILD_INTEREST_RUNTIME_V2976;
      const s = rt?.readState?.() || {};
      parts.push('child.mode=' + String(s.mode || ''));
      parts.push('child.groups=' + JSON.stringify(Array.isArray(s.selectedGroups) ? s.selectedGroups : []));
      parts.push('child.majors=' + JSON.stringify(Array.isArray(s.selectedMajors) ? s.selectedMajors : []));
      parts.push('child.keywords=' + JSON.stringify(Array.isArray(s.selectedKeywords) ? [...s.selectedKeywords].sort() : []));
      parts.push('child.disabledAuto=' + JSON.stringify(Array.isArray(s.disabledAutoMappings) ? [...s.disabledAutoMappings].sort() : []));
      parts.push('child.manualOnly=' + (!!s.manualOnlyInterest ? '1' : '0'));
    } catch(e) {}
    try {
      const tr = window.LN_CHILD_INTENT_TRANSLATOR_V298 || window.LN_CHILD_INTENT_TRANSLATOR_V2976 || window.LN_CHILD_INTENT_TRANSLATOR_V2975;
      const t = tr?.readState?.() || {};
      parts.push('intent.ids=' + JSON.stringify(Array.isArray(t.selectedIntentIds) ? t.selectedIntentIds : []));
    } catch(e) {}
    return parts;
  }

  function getFilterFingerprint(){
    const ids = [
      'myScore','myRank','filterLevel','filterSubjectGroup','filterPrimary','filterTaxConfidence','filterSchoolTier','filterConfusableGroup','onlyKey','onlyConfusable','strictProfile',
      'regionMode','cityMode','targetCities','filterFeeType','budget','priority','sortBy','onlyChildInterestV296',
      'filterSubject','filterTax','filterTier','filterConfusable','provinceSelect','cityInput','feeType'
    ];
    const parts = ids.map(id => id + '=' + valOf(id));
    parts.push('provinceChips=' + JSON.stringify(activeChipKeys('#provinceChips .chip','province')));
    parts.push('rejectChips=' + JSON.stringify(activeChipKeys('#rejectChips .chip','reject')));
    parts.push('regionGroups=' + JSON.stringify(activeChipKeys('#regionGroupChips .chip','group')));
    try { parts.push('strategy=' + String(window.currentStrategy || window.LN_CURRENT_STRATEGY || '')); } catch(e) {}
    try { parts.push('rank=' + String(window.currentRank || '')); } catch(e) {}
    return parts.concat(childInterestFingerprintParts()).join('|');
  }

  function isKnownFilterControl(el){
    if (!el) return false;
    const id = el.id || '';
    const knownIds = new Set([
      'filterLevel','filterSubjectGroup','filterPrimary','filterTaxConfidence','filterSchoolTier','filterConfusableGroup','onlyKey','onlyConfusable',
      'regionMode','provinceChips','cityMode','targetCities','filterFeeType','budget','priority','sortBy','onlyChildInterestV296','strictProfile','myScore','myRank',
      'filterSubject','filterTax','filterTier','filterConfusable','provinceSelect','cityInput','feeType'
    ]);
    if (knownIds.has(id)) return true;
    if (el.closest && (el.closest('#provinceChips') || el.closest('#rejectChips') || el.closest('#regionGroupChips'))) return true;
    if (el.dataset && (el.dataset.action || el.dataset.reject || el.dataset.province || el.dataset.group)) {
      const a = String(el.dataset.action || '');
      return /filter|region|province|reject|scenario|strategy|child-interest|student-profile/.test(a);
    }
    return false;
  }

  function shouldSkipDirectDuplicate(fp, reason){
    if (!window.LN_INTERACT_DEDUPE_OPT) return false;
    const now = perf();
    if (!fp || !state.lastAppliedFingerprint) return false;
    if (fp !== state.lastAppliedFingerprint) return false;
    // Skip only very-near repeated calls with exactly the same UI fingerprint.
    // This keeps final results unchanged while preventing the second refresh from the same control event.
    if ((now - Number(state.lastApplyAt || 0)) <= 360) {
      state.skipped += 1;
      state.directDuplicateSkipped += 1;
      state.lastSkipReason = 'direct-duplicate:' + String(reason || 'applyFilters');
      markDebug({skip:true, reason:state.lastSkipReason});
      return true;
    }
    return false;
  }

  function wrapApplyFilters(){
    const fn = window.applyFilters;
    if (typeof fn !== 'function') return false;
    if (fn.__v29rcInteractDedupeWrapped) return true;

    const wrapped = function(){
      const reason = arguments[0] || state.pendingReason || 'direct-apply';
      const fp = getFilterFingerprint();
      if (shouldSkipDirectDuplicate(fp, reason)) return window.filtered || [];
      const t0 = perf();
      try {
        return fn.apply(this, arguments);
      } finally {
        const ms = Math.round(perf() - t0);
        state.applied += 1;
        state.lastApplyMs = ms;
        state.lastReason = String(reason || 'direct-apply');
        state.lastAppliedFingerprint = fp;
        state.lastApplyAt = perf();
        markDebug({reason:state.lastReason, ms});
      }
    };
    wrapped.__v29rcInteractDedupeWrapped = true;
    wrapped.__original = fn;
    window.applyFilters = wrapped;
    state.applyWrapped = true;
    return true;
  }

  function runScheduled(reason, fp){
    state.pendingTimer = null;
    state.pendingReason = reason || state.pendingReason || 'scheduled';
    state.pendingFingerprint = fp || getFilterFingerprint();
    const finalReason = 'dedupe:' + state.pendingReason;
    // V2.93RC1: 不再绕过数据分块加载直接调用 applyFilters。
    // 分数/位次变化必须走 refresh scheduler -> autoRefreshAsync -> ensureDataForCurrentRank -> applyFilters，
    // 否则会出现 DATA 仍为空、页面先卡一次/错一次，再被旧监听补算一次。
    if (window.LN_REFRESH_SCHEDULER_V296 && typeof window.LN_REFRESH_SCHEDULER_V296.request === 'function') {
      window.LN_REFRESH_SCHEDULER_V296.request({reason: finalReason, level:'soft', delay:0});
      markDebug({routedToScheduler:true, reason:finalReason});
      return;
    }
    if (typeof window.__LN_AUTO_REFRESH_DIRECT__ === 'function') {
      Promise.resolve(window.__LN_AUTO_REFRESH_DIRECT__(finalReason)).catch(function(e){console.warn('[V2.93RC1 interact-dedupe] auto refresh failed', e);});
      markDebug({routedToAutoRefresh:true, reason:finalReason});
      return;
    }
    if (typeof window.applyFilters === 'function') {
      window.applyFilters(finalReason);
      markDebug({fallbackDirectApply:true, reason:finalReason});
    }
  }

  function requestApply(reason, delay){
    if (!window.LN_INTERACT_DEDUPE_OPT) {
      if (typeof window.applyFilters === 'function') window.applyFilters(reason || 'direct-opt-off');
      return;
    }
    const fp = getFilterFingerprint();
    state.pendingReason = reason || 'unknown';
    state.pendingFingerprint = fp;
    state.pendingAt = Math.round(perf());
    state.scheduled += 1;
    if (state.pendingTimer) {
      clearTimeout(state.pendingTimer);
      state.merged += 1;
      state.skipped += 1;
      state.lastSkipReason = 'merged-pending';
    }
    const d = Number.isFinite(delay) ? delay : 160;
    state.pendingTimer = setTimeout(() => runScheduled(state.pendingReason, state.pendingFingerprint), d);
    markDebug({scheduled:true, reason:state.pendingReason, delay:d});
  }

  function bindChangeListener(){
    if (state.changeListenerBound) return true;
    document.addEventListener('change', function(ev){
      const el = ev.target;
      if (!isKnownFilterControl(el)) return;
      state.lastControl = {id:el.id || '', tag:(el.tagName || '').toLowerCase(), type:el.type || '', value:valOf(el.id || ''), at:new Date().toLocaleTimeString()};
      requestApply('change:' + (el.id || el.dataset?.action || el.tagName || 'control'), 170);
    }, true);
    document.addEventListener('input', function(ev){
      const el = ev.target;
      const id = el && el.id || '';
      if (!/myScore|myRank|targetCities|cityInput|qSchool|qMajor|filterPrimary/.test(id)) return;
      state.lastControl = {id, tag:(el.tagName || '').toLowerCase(), type:el.type || '', value:valOf(id), at:new Date().toLocaleTimeString()};
      requestApply('input:' + id, 220);
    }, true);
    document.addEventListener('click', function(ev){
      const el = ev.target;
      if (!el || !el.closest) return;
      const chip = el.closest('#provinceChips .chip, #rejectChips .chip, #regionGroupChips .chip');
      if (!chip) return;
      state.lastControl = {id:chip.id || '', action:chip.dataset?.action || '', text:(chip.textContent || '').trim().slice(0,60), at:new Date().toLocaleTimeString()};
      requestApply('click:chip-filter', 170);
    }, true);
    state.changeListenerBound = true;
    return true;
  }

  function patch(){
    wrapApplyFilters();
    bindChangeListener();
    state.patched = state.applyWrapped && state.changeListenerBound;
    flags({interactDedupe:'v292rc2', interactDedupeOpt:!!window.LN_INTERACT_DEDUPE_OPT, interactDedupeVersion:STAMP, interactDedupeRoutesViaScheduler:true});
    markDebug({patched:state.patched, applyWrapped:state.applyWrapped, changeListenerBound:state.changeListenerBound});
  }

  function boot(){
    patch();
    setTimeout(patch, 0);
    setTimeout(patch, 800);
    setTimeout(patch, 1800);
    setTimeout(patch, 3200);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  window.LN_INTERACT_DEDUPE_V29RC2 = window.LN_INTERACT_DEDUPE_V292RC2 = {
    ready: true,
    version: VERSION,
    stamp: STAMP,
    state,
    patch,
    requestApply,
    fingerprint: getFilterFingerprint,
    hash: hashText
  };
})();
/* ===== END assets/interact-dedupe.v292rc2.js ===== */


/* ===== V2.93RC1 merged-runtime final marker ===== */
(function(){
  try{
    window.LN_V293RC1_MERGE = window.LN_V293RC1_MERGE || {};
    window.LN_V293RC1_MERGE.runtime.ready = true;
    window.LN_RUNTIME_V293RC1 = {ready:true, version:'V2.93RC1', stamp:'293rc1-20260515', mergeMode:'real-call-chain-runtime', filesMerged:7};
    window.LN_DEBUG_V2983 && window.LN_DEBUG_V2983.setFlags && window.LN_DEBUG_V2983.setFlags({
      v293rc1:true,
      mergeMode:'real-call-chain-runtime',
      runtime:'v293rc1',
      detailLazyVersion:'v293rc1-detail-lazy',
      exportMd:'v293rc1',
      exportMdObserver:'events-only',
      stabilityClean:'v293rc1',
      renderEvents:'v293rc1',
      interactDedupe:'v293rc1',
      directApplyBlocked:true,
      coreFormulaChanged:false,
      candidateResultChanged:false
    });
  }catch(e){}
})();

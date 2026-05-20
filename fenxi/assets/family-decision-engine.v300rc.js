// V3.0RC.family-decision-engine｜家庭决策引擎收口版
// 目标：把 rules-closure4 正式升格为最后决策层；明确 A/B/C 分段语义、低分段提示、详情卡复核等级与一键回归测试接口。
(function(){
  'use strict';
  if(window.LN_FAMILY_DECISION_ENGINE_OPT===false) return;
  var VERSION='V3.0RC.family-decision-engine';
  var STAMP='300rc-family-decision-engine-20260520';
  var installed=false;
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(s){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s];});}
  function val(id){try{return document.getElementById(id)?.value||'';}catch(e){return '';}}
  function rankValue(){
    try{if(typeof window.currentRank!=='undefined'&&Number(window.currentRank)>0)return Number(window.currentRank);}catch(e){}
    try{if(typeof currentRank!=='undefined'&&Number(currentRank)>0)return Number(currentRank);}catch(e){}
    var r=Number(val('myRank')||0); if(r>0)return r;
    return 0;
  }
  function detectSegment(rank){rank=Number(rank||rankValue()||0); if(!rank)return 'unknown'; if(rank<=25000)return 'high'; if(rank<=60000)return 'middle'; if(rank<=90000)return 'low'; return 'edge';}
  function segmentLabel(seg){return ({high:'高分段',middle:'中分段',low:'低分段',edge:'本科边缘段',unknown:'未知分段'})[seg]||'未知分段';}
  function getCLabel(seg){seg=seg||detectSegment(); if(seg==='high')return 'C：争平台'; if(seg==='middle')return 'C：看城市 / 层级'; if(seg==='low')return 'C：机会对照'; if(seg==='edge')return 'C：成本换本科机会'; return 'C：机会对照';}
  function getCView(seg){seg=seg||detectSegment(); if(seg==='high')return '比较更高平台、城市和专业上限。'; if(seg==='middle')return '比较城市、层级和专业机会，但仍需复核风险。'; if(seg==='low')return '只作机会对照，不当稳妥方案。'; if(seg==='edge')return '看成本换本科机会，必须复核四年成本和可读性。'; return '比较机会，不当稳妥项。';}
  function readProfile(){try{return window.LN_STUDENT_PROFILE_RULES_V298?.readState?.()||{};}catch(e){return {};}}
  function selectedRejectsSafe(){try{return typeof selectedRejects==='function'?selectedRejects():[];}catch(e){return [];}}
  function interestIds(){try{return window.LN_CHILD_INTEREST_RUNTIME_V296?.effectiveGroupIds?.()||[];}catch(e){return [];}}
  function currentScenario(){try{var st=window.LN_PARENT_TRUST_V291RC0?.getState?.(); if(st?.scenarioEffective)return st.scenarioEffective;}catch(e){} try{if(typeof currentStrategy!=='undefined'&&currentStrategy)return currentStrategy;}catch(e){} return window.currentStrategy||'employment';}
  function readContext(){
    var p=readProfile(), rank=rankValue(), seg=detectSegment(rank), r=selectedRejectsSafe();
    return {version:VERSION,stamp:STAMP,score:Number(val('myScore')||0)||null,rank:rank||null,model:val('model')||'normal',segment:seg,segmentLabel:segmentLabel(seg),cLabel:getCLabel(seg),
      gender:p.gender||val('studentGender')||'unspecified',load:p.load||((val('mathTolerance')==='low')?'sensitive':'unknown'),learning:p.learning||'unclear',path:p.path||'unknown',
      interests:interestIds(),scenario:currentScenario(),priority:val('priority')||'employment',budget:val('budget')||'normal',rejects:r,
      rejectHighFee:r.indexOf('高收费')>=0,rejectField:r.indexOf('工地现场')>=0,rejectNight:r.indexOf('夜班')>=0,rejectLongCycle:r.indexOf('长学制')>=0,
      regionMode:val('regionMode')||'',cityMode:val('cityMode')||'',lowSegmentLevel:seg==='edge'?'edge':seg==='low'?'low':'normal'};
  }
  function pathInfo(row){try{return window.LN_RULES_CLOSURE_V291?.pathInfo?.(row)||fallbackPathInfo(row);}catch(e){return fallbackPathInfo(row);}}
  function fallbackPathInfo(row){
    var m=String((row&&(row.majorText||row.cleanMajor||row.major||row.admissionMajor))||'').replace(/\s+/g,'');
    var key='unknown', label='专业路径待复核', layer='unknown';
    function ret(k,l,ly){key=k;label=l;layer=ly||k;}
    if(/法学|公安|思想政治|社会工作|行政管理|公共管理|马克思主义/.test(m))ret('public_service','考公 / 体制路径','exam_public');
    else if(/师范|小学教育|学前教育|特殊教育|教育学/.test(m))ret('teacher','师范 / 考编路径','teacher_core');
    else if(/会计|审计|财务|财政|税收|统计/.test(m))ret('accounting','财会 / 统计路径','accounting_core');
    else if(/计算机|软件|人工智能|网络|数据|物联网|信息管理|电子商务/.test(m))ret('computer','计算机 / 数字技术路径',/计算机科学与技术|软件工程|人工智能/.test(m)?'strong_code':'medium_code');
    else if(/电气|智能电网|电力|能源与动力|新能源|储能/.test(m))ret('electric','电气 / 能源路径','electric_core');
    else if(/机械|自动化|车辆|交通运输|智能制造|测控|过程装备/.test(m))ret('engineering','机械 / 自动化 / 交通路径','factory_engineering');
    else if(/电子信息|通信|微电子|集成电路|光电/.test(m))ret('electronic','电子信息 / 通信路径','electronic_device');
    else if(/临床|口腔|麻醉|儿科|医学影像|医学检验|护理|康复|药学|预防医学|公共卫生|动物医学/.test(m))ret('medical','医学 / 医学技术路径',/临床|口腔|麻醉|儿科/.test(m)?'medical_clinical':/护理/.test(m)?'medical_nursing':'medical_tech');
    else if(/汉语言|新闻|传播|外语|英语|历史|哲学|档案|图书馆/.test(m))ret('liberal','人文表达路径','liberal_general');
    else if(/材料|化工|环境|食品|生物|制药|高分子/.test(m))ret('deep_engineering','深造依赖 / 实验工科路径','lab_engineering');
    return {key:key,label:label,layer:layer,text:m,raw:m,isMajorClass:/类|试验班|实验班|大类/.test(m)};
  }
  function evalClosure(row,type){try{return window.LN_RULES_CLOSURE_V291?.evaluate?.(row,type)||{};}catch(e){return {};}}
  function isCostRisk(row){return !!(row&&(row.isHighFee||row.isCoopV29475||row.isPrivateV29475));}
  function buildCandidateEvidence(row,type){
    var ctx=readContext(), p=pathInfo(row), e=evalClosure(row,type||'B'), notes=(e.notes||[]).slice(), tags=(e.tags||[]).slice();
    var text=String((row&&(row.majorText||row.cleanMajor||row.major||row.admissionMajor||row.major))||'');
    var highFee=!!(row&&(row.isHighFee||row.isCoopV29475));
    var privateLike=!!(row&&row.isPrivateV29475);
    var coop=!!(row&&row.isCoopV29475);
    var fieldRisk=e.siteRisk&&Number(e.siteRisk.level||0)>=2;
    var clinical=p.key==='medical'&&/临床|口腔|麻醉|儿科/.test(p.text||text);
    var lowComputer=(ctx.segment==='low'||ctx.segment==='edge')&&p.key==='computer';
    var lawLow=(ctx.segment==='low'||ctx.segment==='edge')&&(p.key==='public_service'||/法学/.test(p.text||text));
    var teacherLow=(ctx.segment==='low'||ctx.segment==='edge')&&p.key==='teacher';
    var medicalLow=(ctx.segment==='low'||ctx.segment==='edge')&&p.key==='medical';
    return {context:ctx,path:p,closure:e,highFee:highFee,coop:coop,privateLike:privateLike,costRisk:highFee||privateLike,fieldRisk:fieldRisk,
      rejectConflict:(ctx.rejectHighFee&&(highFee||privateLike))||(ctx.rejectField&&fieldRisk)||(ctx.rejectNight&&p.key==='medical')||(ctx.rejectLongCycle&&clinical),
      medicalLongCycleConflict:p.key==='medical'&&((ctx.rejectLongCycle&&clinical)||(ctx.rejectNight&&/临床|口腔|麻醉|儿科|护理/.test(p.text||text))),
      gridFieldConflict:(ctx.scenario==='grid'||ctx.priority==='grid'||ctx.interests.indexOf('electric_energy')>=0)&&ctx.rejectField&&fieldRisk,
      lowSegmentComputerNameTrap:lowComputer,lawLow:lawLow,teacherLow:teacherLow,medicalLow:medicalLow,
      notes:notes,tags:tags};
  }
  function buildReviewLevels(row,type){
    var ev=buildCandidateEvidence(row,type), p=ev.path, ctx=ev.context, must=[], important=[], optional=[];
    if(ev.highFee||ev.coop||ev.privateLike)must.push('必须复核学费、培养方式、证书、校区和四年总成本');
    if(ev.fieldRisk||ev.gridFieldConflict)must.push('必须复核培养方向、实习环境和毕业后的现场/设备岗位比例');
    if(ev.medicalLongCycleConflict)must.push('必须复核学制、规培、夜班、执业资格和是否真是医生路径');
    if(ev.lowSegmentComputerNameTrap)must.push('低分段计算机不能只看专业名，必须复核课程强度、项目训练、就业城市和孩子自律');
    if(p.isMajorClass)must.push('必须复核大类分流规则、分流成绩要求和可选专业范围');
    var raw=String((row&&(row.majorText||row.cleanMajor||row.major||row.admissionMajor||''))||'');
    if(/中外|合作|校企|单列|高收费|只招有志愿/.test(raw))must.push('必须复核招生备注、录取规则和是否只招有志愿考生');
    if(/校区|分校|盘锦|威海|秦皇岛|荣成/.test(raw+String(row?.school||'')))must.push('必须复核实际就读校区');
    if(p.key==='teacher')important.push('重点复核是否师范类、教师资格支持、目标地区教师岗位和学科竞争');
    if(p.key==='public_service'||p.key==='liberal')important.push('重点复核岗位表、专业代码、法考/考公支持和地区竞争');
    if(p.key==='accounting')important.push('重点复核考证路径、岗位表、实习资源和就业城市');
    if(p.key==='computer')important.push('重点复核课程结构、项目训练、实习城市和孩子自律程度');
    if(p.key==='medical')important.push('重点复核执业资格、就业地点、规培要求和医院岗位环境');
    if(p.key==='deep_engineering'||p.key==='basic_science')important.push('重点复核读研依赖、转专业规则和本科就业弹性');
    if(type==='C')important.push('重点复核位次波动、成本变化和为什么只作为机会对照');
    optional.push('建议复核住宿条件、校园环境、城市生活成本和课程体验');
    return {must:Array.from(new Set(must)).slice(0,4),important:Array.from(new Set(important)).slice(0,4),optional:Array.from(new Set(optional)).slice(0,2)};
  }
  function extraScoreAdjustment(row,type){
    var ev=buildCandidateEvidence(row,type), ctx=ev.context, p=ev.path, d=0;
    if(type==='A'){
      if(ctx.rejectHighFee&&(ev.highFee||ev.coop||ev.privateLike))d-=40;
      if((ctx.segment==='low'||ctx.segment==='edge')&&(ev.fieldRisk||['computer','electric','engineering','medical','deep_engineering'].indexOf(p.key)>=0)&&ctx.load==='sensitive')d-=12;
    }
    if(type==='B'){
      if(ev.lowSegmentComputerNameTrap&&ctx.load==='sensitive')d-=12;
      if(ev.medicalLongCycleConflict)d-=14;
      if(ev.gridFieldConflict)d-=14;
    }
    if(type==='C'){
      if(ctx.segment==='low')d+=4;
      if(ctx.segment==='edge')d+=6;
      if(ev.rejectConflict)d-=35;
      if((ctx.segment==='low'||ctx.segment==='edge')&&(ev.highFee||ev.coop||ev.privateLike)&&!ctx.rejectHighFee)d+=6;
      if(ctx.segment==='edge'&&(ev.highFee||ev.coop||ev.privateLike)&&ctx.budget==='normal')d-=10;
    }
    return d;
  }
  function lowSegmentBannerHtml(){
    var ctx=readContext();
    if(ctx.segment==='edge')return '<div class="fde-low-banner fde-edge"><b>本科边缘提示</b><p>当前已接近本科边缘。A 方案优先保低成本和可读性；B 方案看孩子是否能坚持；C 方案只是机会对照，不建议直接当稳妥方案。</p></div>';
    if(ctx.segment==='low')return '<div class="fde-low-banner"><b>低分段提示</b><p>当前属于低分段本科讨论区。系统会同时考虑本科机会、家庭成本、孩子可读性和专业出口，不会只按学校名或专业名排序。</p></div>';
    return '';
  }
  function advancedSearchNote(){return '<div class="fde-advanced-note" id="fdeAdvancedNote"><b>高级搜索说明</b><span>高级搜索会直接改变 A/B/C 的候选池。建议一次只调整一个条件，观察方案是否变窄、变稳或跑偏。</span></div>';}
  function filterWarningHtml(){
    var n=(window.filtered||[]).length, fee=val('filterFeeType'), major=val('filterPrimary')||val('majorKeyword')||'', tier=val('filterSchoolTier');
    var lines=[];
    if(n>0&&n<25)lines.push('当前不是没有学校，而是条件组合偏窄。建议优先放宽：专业关键词、区域、严格画像；不建议优先放宽：明确拒绝项、高收费、资格入口。');
    if((fee==='normal'||fee==='excludeHighPrivate')&&n<60)lines.push('只看普通学费/公办倾向后候选会明显减少。可以让 A 守住低成本，同时让 C 展示民办/中外作为成本换机会对照。');
    if(major&&String(major).length>=2&&n<60)lines.push('专业关键词过窄会让 A/B/C 失去对照。建议优先使用专业方向，而不是单一专业名。');
    if(tier==='public'&&n<60)lines.push('只看双非公办后候选减少是正常现象；低分段尤其要同时看可读性和专业出口。');
    return lines.length?'<div class="fde-filter-warning">'+lines.map(function(x){return '<p>'+esc(x)+'</p>';}).join('')+'</div>':'';
  }
  function decorateCards(){
    var cards=document.querySelectorAll('#planABC .plan-decision-card-v2981');
    cards.forEach(function(card,idx){
      if(card.dataset.fdeDecorated==='1')return; card.dataset.fdeDecorated='1';
      var type='B'; var head=card.querySelector('.decision-card-head-v2981 span')?.textContent||''; if(/^A/.test(head))type='A'; else if(/^C/.test(head))type='C';
      var buckets=window.latestPlanBucketsV29475Fix2||{}; var localIdx=(parseInt((head.match(/^[ABC](\d+)/)||[])[1]||'1',10)-1)||0; var row=(buckets[type]||[])[localIdx]; if(!row)return;
      var rv=buildReviewLevels(row,type);
      var html='<div class="fde-review-levels">';
      if(rv.must.length)html+='<div class="fde-review-row must"><b>必须复核</b><span>'+esc(rv.must.join('；'))+'</span></div>';
      if(rv.important.length)html+='<div class="fde-review-row important"><b>重点复核</b><span>'+esc(rv.important.join('；'))+'</span></div>';
      if(rv.optional.length)html+='<div class="fde-review-row optional"><b>建议复核</b><span>'+esc(rv.optional.join('；'))+'</span></div>';
      html+='</div>';
      var target=card.querySelector('.decision-tradeoff-v2981')||card.querySelector('.decision-actions-v2981')||card;
      target.insertAdjacentHTML(target.classList.contains('decision-actions-v2981')?'beforebegin':'afterend',html);
    });
  }
  function decorateABC(){
    var box=document.getElementById('planABC'); if(!box)return;
    var ctx=readContext();
    box.setAttribute('data-fde-version',VERSION); box.setAttribute('data-fde-segment',ctx.segment);
    box.querySelectorAll('.abc-active-head-v296 b,.abc-toolbar-v296 b').forEach(function(el){ if(/C[：:]/.test(el.textContent||''))el.textContent=ctx.cLabel; });
    box.querySelectorAll('.decision-card-head-v2981 span').forEach(function(el){ if(/^C/.test(el.textContent||'')){ el.textContent=el.textContent.replace(/C(\d+)/,'C$1'); }});
    if(!box.querySelector('.fde-low-banner')){var h=lowSegmentBannerHtml(); if(h){var toolbar=box.querySelector('.abc-toolbar-v296'); if(toolbar)toolbar.insertAdjacentHTML('afterend',h); else box.insertAdjacentHTML('afterbegin',h);}}
    var warn=filterWarningHtml(); var old=box.querySelector('.fde-filter-warning'); if(old)old.remove(); if(warn){var tabs=box.querySelector('.abc-tabs-v296')||box.querySelector('#abcPanelV296'); if(tabs)tabs.insertAdjacentHTML('beforebegin',warn); else box.insertAdjacentHTML('afterbegin',warn);}
    decorateCards();
    try{window.LN_DEBUG_V2983?.detail?.('familyDecisionV300',{context:ctx,filtered:(window.filtered||[]).length,cLabel:ctx.cLabel,version:VERSION});}catch(e){}
  }
  function installAdvancedNote(){
    var toggle=document.querySelector('.advanced-toggle'); if(toggle&&!document.getElementById('fdeAdvancedNote'))toggle.insertAdjacentHTML('afterend',advancedSearchNote());
  }
  function patchMeta(){
    var model=window.LN_ABC_DECISION_CARD_MODEL_V2981; if(!model)return;
    if(model.__fde300Meta)return;
    var old=model.groupMeta;
    model.groupMeta=function(type){
      if(type==='C')return {title:getCLabel(),view:getCView()};
      if(type==='A')return {title:'A：守底线',view:'先看家庭底线、普通学费、位次安全和孩子能否读下来。'};
      if(type==='B')return {title:'B：看专业',view:'看孩子兴趣、专业路径、就业环境和毕业出口。'};
      return old?old.apply(this,arguments):{title:type,view:''};
    };
    model.__fde300Meta=true;
  }
  function patchPlanScore(){
    if(typeof window.planScoreV29475!=='function'||window.planScoreV29475.__fde300)return;
    var old=window.planScoreV29475;
    var wrapped=function(row,type,chosen){return old.apply(this,arguments)+extraScoreAdjustment(row,type||'B');};
    wrapped.__fde300=true; wrapped.__original=old; window.planScoreV29475=wrapped; try{planScoreV29475=wrapped;}catch(e){} if(window.LN_PLAN_ENGINE)window.LN_PLAN_ENGINE.planScoreV29475=wrapped;
  }
  function patchRender(){
    if(typeof window.renderPlanABC==='function'&&!window.renderPlanABC.__fde300){
      var old=window.renderPlanABC;
      var wrapped=function(){var out=old.apply(this,arguments); setTimeout(decorateABC,0); return out;};
      wrapped.__fde300=true; wrapped.__original=old; window.renderPlanABC=wrapped; if(window.LN_PLAN_ENGINE)window.LN_PLAN_ENGINE.renderPlanABC=wrapped;
    }
    if(typeof window.renderPlanABCViewOnly==='function'&&!window.renderPlanABCViewOnly.__fde300){
      var oldv=window.renderPlanABCViewOnly;
      var wrappedv=function(){var out=oldv.apply(this,arguments); setTimeout(decorateABC,0); return out;};
      wrappedv.__fde300=true; wrappedv.__original=oldv; window.renderPlanABCViewOnly=wrappedv; if(window.LN_PLAN_ENGINE)window.LN_PLAN_ENGINE.renderPlanABCViewOnly=wrappedv;
    }
  }
  function refreshDebug(){try{window.LN_DEBUG_V2983?.setFlags?.({familyDecisionEngine:VERSION,familyDecisionStamp:STAMP,fdeSegment:detectSegment(),fdeCLabel:getCLabel()}); window.LN_DEBUG_V2983?.detail?.('familyDecisionContext',readContext());}catch(e){}}
  function boot(){ if(installed)return; installed=true; patchMeta(); patchPlanScore(); patchRender(); installAdvancedNote(); decorateABC(); refreshDebug(); ['change','input','click'].forEach(function(evt){document.addEventListener(evt,function(){setTimeout(function(){patchMeta();patchPlanScore();patchRender();installAdvancedNote();decorateABC();refreshDebug();},40);},true);}); setTimeout(function(){installed=false; boot();},800); }
  var api={ready:true,version:VERSION,stamp:STAMP,readContext:readContext,detectSegment:detectSegment,getCLabel:getCLabel,getCView:getCView,pathInfo:pathInfo,buildCandidateEvidence:buildCandidateEvidence,buildReviewLevels:buildReviewLevels,extraScoreAdjustment:extraScoreAdjustment,decorateABC:decorateABC,installAdvancedNote:installAdvancedNote,refreshDebug:refreshDebug};
  window.LN_FAMILY_DECISION_ENGINE=api;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();

// V2.93RC1｜主入口后置 UI/协调层合并包
// 合并范围：后置摘要、轻量详情 UI、决策上下文、交互稳定、滚动保护、轻量交互、app 协调、模型懒加载、家长口径。
// 边界：rules-closure4 / closure5fix1 仍独立加载，不把 A/B/C 裁决公式揉进合并包。
(function(){
  window.LN_V293RC1_MERGE = window.LN_V293RC1_MERGE || {};
  window.LN_V293RC1_MERGE.postMain = {ready:false, files:14, stamp:'293rc1-20260515'};
})();


/* ===== BEGIN assets/profile-interest-summary.v2981fix2.js ===== */
// V2.9.8.1.fix2 front summary: student profile + child interest + translated catalog direction.
(function(){
  function esc(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));}
  function profileLine(){
    const rules=window.LN_STUDENT_PROFILE_RULES_V298||window.LN_STUDENT_PROFILE_RULES_V2981||window.LN_STUDENT_PROFILE_RULES_V2976;
    const sum=rules?.summary?.();
    return sum?.tags?.length ? sum.text : '暂未补充画像';
  }
  function interestRuntime(){return window.LN_CHILD_INTEREST_RUNTIME_V296||window.LN_CHILD_INTEREST_RUNTIME_V298;}
  function interestLine(){const rt=interestRuntime(); const sum=rt?.summary?.(); return sum?.names?.length?sum.names.slice(0,5).join('｜'):'暂未选择兴趣，先按位次、底线和场景综合推荐';}
  function translatedLine(){
    const rt=interestRuntime();
    const names=(rt?.effectiveGroupIds?.()||[]).map(id=>rt.groupById?.(id)).filter(Boolean).map(g=>g.short||g.name);
    return names.length?names.slice(0,5).join('｜'):'暂未转译专业方向';
  }
  function hitLine(){
    const h=interestRuntime()?.summary?.()?.hit;
    if(!h) return '真实候选：未选择兴趣时先综合推荐';
    return `真实候选：正主 ${Number(h.core||0)}｜相近 ${Number(h.related||0)}｜需复核 ${Number(h.review||0)}`;
  }
  function methodLine(){return '系统处理：孩子学习特点主要用于提醒和排序微调，不作为硬排除条件；兴趣先转成本科目录规则，再匹配当前真实候选。';}
  function build(){return {profileLine:profileLine(),interestLine:interestLine(),translatedLine:translatedLine(),hitLine:hitLine(),methodLine:methodLine()};}
  function patchChildInterestSummary(){
    const api=window.LN_CHILD_INTEREST_UI_V296||window.LN_CHILD_INTEREST_UI_V298;
    if(!api) return;
    function renderSummary(){
      const box=document.getElementById('childInterestBoxV2955'); if(!box) return;
      const rt=interestRuntime(); if(!rt){box.innerHTML='<div class="notice">孩子兴趣规则正在加载...</div>';return;}
      const s=rt.readState?.()||{}; const manual=(s.selectedGroups||[]).map(id=>rt.groupById?.(id)).filter(Boolean); const auto=rt.autoMappings?.(s)||[];
      const b=build();
      const tags=[`画像：${b.profileLine}`,`兴趣：${b.interestLine}`,`兴趣转译：${b.translatedLine}`,b.hitLine].map(x=>`<span class="pi-chip-v2981fix1">${esc(x)}</span>`).join('');
      const manualTags=manual.map(g=>`<span class="pi-chip-v2981fix1">${esc(g.name)}<button aria-label="移除${esc(g.name)}" data-action="child-interest-remove" data-interest-id="${esc(g.id)}">×</button></span>`).join('');
      const autoTags=auto.map(x=>`<span class="pi-chip-v2981fix1">${esc(x.label)}<button title="取消该自动带入方向" data-action="child-interest-auto-toggle" data-intent-id="${esc(x.intentId)}" data-interest-id="${esc(x.interestId)}">×</button></span>`).join('');
      const html=`<div class="profile-interest-summary-v2981fix1 profile-interest-summary-v2981fix2"><div class="pi-head-v2981fix1"><div><b>孩子画像与兴趣</b><div class="pi-tags-v2981fix1">${tags}</div></div><div class="pi-actions-v2981fix1"><button type="button" data-action="open-student-profile">编辑画像</button><button type="button" data-action="child-interest-start">编辑兴趣</button></div></div><div class="pi-sub-v2981fix1">${esc(b.methodLine)}</div><div class="pi-tags-v2981fix1 pi-active-interest-v2981fix2" style="margin-top:6px">${manualTags}${autoTags||(!manual.length?'<span class="pi-chip-v2981fix1">综合推荐</span>':'')}<label><input type="checkbox" id="onlyChildInterestV296" ${s.manualOnlyInterest?'checked':''}/> 只看真实命中兴趣方向</label></div></div>`;
      if(box.dataset.lastProfileInterestHtml!==html){box.innerHTML=html;box.dataset.lastProfileInterestHtml=html;}
      const openProfileBtn=box.querySelector('[data-action="open-student-profile"]');
      if(openProfileBtn&&!openProfileBtn.dataset.boundDirectFix1){openProfileBtn.dataset.boundDirectFix1='1';openProfileBtn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();window.__LN_ACTIVE_DRAWER_TYPE='studentProfile';window.LN_STUDENT_PROFILE_UI_V2975?.openDrawer?.();},true);}
      const openInterestBtn=box.querySelector('[data-action="child-interest-start"]');
      if(openInterestBtn&&!openInterestBtn.dataset.boundDirectFix1){openInterestBtn.dataset.boundDirectFix1='1';openInterestBtn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();window.__LN_ACTIVE_DRAWER_TYPE='childInterest';window.LN_CHILD_INTEREST_RUNTIME_V296?.start?.();},true);}
      const chk=document.getElementById('onlyChildInterestV296');
      if(chk&&!chk.dataset.boundFix2){chk.dataset.boundFix2='1';chk.addEventListener('change',()=>{const st=rt.readState?.()||{};st.manualOnlyInterest=chk.checked;rt.saveState?.(st);renderSummary();window.LN_INTEREST_HIT_SUMMARY_V298?.scheduleAggregate?.(null,900); window.LN_REFRESH_SCHEDULER_V296?.request?.({reason:'child-interest-change',level:'soft',delay:900});});}
    }
    api.renderSummary=renderSummary; api.__fix2Patched=true;
    window.LN_CHILD_INTEREST_UI_V296=api; window.LN_CHILD_INTEREST_UI_V298=api;
    renderSummary();
  }
  function patchStudentProfileSummary(){
    const api=window.LN_STUDENT_PROFILE_UI_V2975||window.LN_STUDENT_PROFILE_UI_V2981||window.LN_STUDENT_PROFILE_UI_V298;
    if(!api) return;
    api.renderSummary=function(){ const box=document.getElementById('studentProfileBoxV2975'); if(box){box.innerHTML=''; box.setAttribute('aria-hidden','true');} setTimeout(()=>{try{patchChildInterestSummary();window.LN_CHILD_INTEREST_UI_V296?.renderSummary?.();}catch(e){}},0); };
    window.LN_STUDENT_PROFILE_UI_V2975=api; window.LN_STUDENT_PROFILE_UI_V2981=api; window.LN_STUDENT_PROFILE_UI_V298=api;
  }
  const api={build,patchChildInterestSummary,patchStudentProfileSummary,ready:true};
  window.LN_PROFILE_INTEREST_SUMMARY_V2981FIX2=api;
  window.LN_PROFILE_INTEREST_SUMMARY_V2981FIX1=api;
})();
/* ===== END assets/profile-interest-summary.v2981fix2.js ===== */


/* ===== BEGIN assets/detail-card-lite-model.v2981fix2.js ===== */
// V2.9.8.1.fix2 detail candidate model: tags + evidence + parent must-read + controlled sections.
(function(){
  function fmt(v){try{return window.fmt?window.fmt(v):Number(v||0).toLocaleString('zh-CN');}catch(e){return String(v??'-');}}
  function evidenceLines(decision){
    const e=decision?.evidence||{}; const s=decision?.safety||{};
    const y2025=e.y2025||'2025：暂无可比记录';
    let safety='安全参考：输入位次后判断录取安全';
    if(s.deltaRank!==null && s.deltaRank!==undefined){
      const d=Number(s.deltaRank||0);
      if(d>0) safety=`安全参考：${s.label||'观察'}｜安全垫约 ${fmt(d)} 位`;
      else if(d<0) safety=`安全参考：${s.label||'观察'}｜约需向上 ${fmt(Math.abs(d))} 位`;
      else safety=`安全参考：${s.label||'观察'}｜贴近2025线`;
    }else if(s.text) safety=`安全参考：${String(s.text).replace(/^按当前层级先标为“?(.+?)”?，/,'').replace(/。$/,'')}`;
    return {y2025,safety};
  }
  function build(record){
    const d=window.LN_DETAIL_CANDIDATE_CARD_MODEL_V2981?.build?.(record) || window.LN_ABC_DECISION_CARD_MODEL_V2981?.build?.(record,'D',0) || {};
    const rem=window.LN_DECISION_REMINDER_DEDUPE_V2981FIX2?.choose?.(d)||{};
    const e=d.evidence||{}; const t=d.tradeoff||{}; const tags=(d.tags||[]).slice(0,4); const moreCount=Math.max(0,(d.tags||[]).length-tags.length);
    const lines=evidenceLines(d); const cp=window.LN_CAMPUS_LOCATION_RULES_V2981FIX2?.detect?.(record)||{};
    const majorExplain=[d.interest?.source?`孩子关注：${d.interest.source}｜${d.interest.level==='core'?'正主匹配':d.interest.level==='related'?'相近方向':d.interest.level==='review'?'需复核方向':'综合备选'}`:'',d.interest?.reason?`依据：${d.interest.reason}`:'',rem.primary].filter(Boolean).join('\n');
    return {id:d.id||record?.id,title:`${record?.school||''}｜${record?.major||''}`,campus:cp, tags, allTags:d.tags||[], moreCount, evidenceLines:lines, parentMustRead:rem.primary||'建议复核招生章程、专业代码、学费和校区。', sections:{
      evidence:`${e.y2025||'2025：待核验'}\n${e.y2024||'2024：暂无可比记录'}\n${e.trend||'两年变化待核验'}${e.note?'\n'+e.note:''}`,
      major:majorExplain||'建议复核专业代码、培养方案和招生备注。',
      tradeoff:`换来的价值：${t.gain||'符合当前筛选条件。'}\n需要接受：${t.accept||'仍需结合学校、城市、学费和培养方案复核。'}\n填报前复核：${t.review||rem.primary||'招生章程、专业代码、学费和校区。'}`,
      campus:cp?.warning||''
    }};
  }
  window.LN_DETAIL_CARD_LITE_MODEL_V2981FIX2={build,ready:true};
  window.LN_DETAIL_CARD_LITE_MODEL_V2981FIX1=window.LN_DETAIL_CARD_LITE_MODEL_V2981FIX2;
})();
/* ===== END assets/detail-card-lite-model.v2981fix2.js ===== */


/* ===== BEGIN assets/ui-detail-notice-late-core.v291rc0ui1.js ===== */
// V2.91RC0.ui-core1 safe segmented UI bundle. Generated by exact concatenation; do not edit inside sections.
(function(){
  window.LN_UI_CORE_BUNDLE_STATUS = window.LN_UI_CORE_BUNDLE_STATUS || {version:'291rc0-ui-core1-20260513',loaded:[],mode:'segmented-safe',ok:true};
})();

// ===== BEGIN assets/detail-card-lite-ui.v2981fix2.js =====
// V2.9.8.1.fix2 detail UI: restores short parent must-read and fixes evidence wrapping.
(function(){
  function esc(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));}
  function panelHtml(id){return `<div class="detail-lite-panel-v2981fix1 detail-lite-panel-v2981fix2" data-lite-panel="${esc(id)}" hidden></div>`;}
  function cardIntroHtml(record){
    const lite=window.LN_DETAIL_CARD_LITE_MODEL_V2981FIX2?.build?.(record); if(!lite) return '';
    const tagHtml=window.LN_CANDIDATE_TAG_UI_V2981?.render?.(lite.allTags||lite.tags,{id:'detail_'+esc(lite.id),max:4})||'';
    const sections=Object.assign({},lite.sections||{});
    if(lite.campus?.warning) sections.campus=lite.campus.warning;
    return `<div class="detail-decision-v2981 detail-lite-v2981fix1 detail-lite-v2981fix2" data-lite-card="${esc(lite.id)}" data-lite-sections="${encodeURIComponent(JSON.stringify(sections))}">
      ${tagHtml}
      <div class="detail-evidence-v2981 detail-evidence-v2981fix2"><span>${esc(lite.evidenceLines.y2025)}</span><span>${esc(lite.evidenceLines.safety)}</span></div>
      <div class="parent-must-read-v2981fix2"><b>家长必读：</b><span>${esc(lite.parentMustRead)}</span></div>
      <div class="detail-lite-actions-v2981fix1 detail-lite-actions-v2981fix2"><button type="button" data-lite-section="evidence" data-lite-id="${esc(lite.id)}">展开证据</button><button type="button" data-lite-section="major" data-lite-id="${esc(lite.id)}">展开专业解释</button><button type="button" data-lite-section="tradeoff" data-lite-id="${esc(lite.id)}">展开取舍</button>${lite.campus?.warning?`<button type="button" data-lite-section="campus" data-lite-id="${esc(lite.id)}">校区复核</button>`:''}</div>
      ${panelHtml(lite.id)}
    </div>`;
  }
  function bind(){
    if(bind.bound)return; bind.bound=true;
    document.addEventListener('click',e=>{
      const btn=e.target.closest('[data-lite-section]'); if(!btn) return;
      const card=btn.closest('[data-lite-card]'); if(!card) return;
      e.preventDefault(); e.stopPropagation();
      const box=card.querySelector('[data-lite-panel]'); if(!box)return;
      let sections={}; try{sections=JSON.parse(decodeURIComponent(card.getAttribute('data-lite-sections')||'%7B%7D'));}catch(err){}
      const key=btn.dataset.liteSection; const same=box.dataset.active===key&&!box.hidden;
      card.querySelectorAll('[data-lite-section]').forEach(b=>b.classList.toggle('active',b===btn&&!same));
      if(same){box.hidden=true;box.dataset.active='';return;}
      box.dataset.active=key; box.hidden=false; box.textContent=sections[key]||'';
    });
  }
  bind();
  const api={cardIntroHtml,ready:true};
  window.LN_DETAIL_CARD_UI_V2981=api;
  window.LN_DETAIL_CARD_LITE_UI_V2981FIX2=api;
  window.LN_DETAIL_CARD_LITE_UI_V2981FIX1=api;
})();
// ===== END assets/detail-card-lite-ui.v2981fix2.js =====

// ===== BEGIN assets/notice-compact-ui.v2981fix2.js =====
// V2.9.8.1.fix2 compact notice UI: preserve expanded details across light re-render.
(function(){
  const openKeys=new Set();
  function esc(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));}
  function lineHtml(key,label,detail){const open=openKeys.has(key); return `<div class="compact-notice-item-v2981fix1" data-compact-key="${esc(key)}"><button type="button" data-compact-toggle="${esc(key)}">${esc(label)}｜${open?'收起':'展开说明'}</button><div class="compact-notice-detail-v2981fix1" ${open?'':'hidden'}>${esc(detail||'')}</div></div>`;}
  function render(){
    const target=document.getElementById('rankSummary'); if(!target) return;
    // Let fix1 build the text first if available, then append persistent detail controls only once.
    try{ window.LN_NOTICE_COMPACT_RULES_V2981FIX1?.render?.(); }catch(e){}
    let box=document.getElementById('compactNoticeFix2');
    if(!box){ box=document.createElement('div'); box.id='compactNoticeFix2'; box.className='compact-notice-v2981fix2'; target.insertAdjacentElement('afterend',box); }
    const q='高校专项、预科/民族班、定向培养等不是普通考生“分够就能报”的入口，未确认资格前默认隐藏。';
    const band='可冲、匹配、稳妥、保底只是位次带宽，不代表保证录取；最终仍要结合当年招生计划和实际投档。';
    const diag='诊断数字只解释筛选口径，主判断仍以 A/B/C 方案和详细候选卡为准。';
    box.innerHTML=lineHtml('qualification','资格入口说明',q)+lineHtml('rankband','位次带宽解释',band)+lineHtml('advisor','高报师诊断说明',diag);
  }
  function bind(){ if(bind.done)return; bind.done=true; document.addEventListener('click',e=>{ const btn=e.target.closest('[data-compact-toggle]'); if(!btn)return; const k=btn.dataset.compactToggle; if(openKeys.has(k)) openKeys.delete(k); else openKeys.add(k); render(); }); }
  bind(); setTimeout(render,0);
  window.LN_NOTICE_COMPACT_UI_V2981FIX2={render,openKeys,ready:true};
})();
// ===== END assets/notice-compact-ui.v2981fix2.js =====

(function(){
  var st=window.LN_UI_CORE_BUNDLE_STATUS=window.LN_UI_CORE_BUNDLE_STATUS||{version:'291rc0-ui-core1-20260513',loaded:[],mode:'segmented-safe',ok:true};
  st.version='291rc0-ui-core1-20260513';
  st.opt=(window.LN_UI_BUNDLE_OPT!==false);
  st.loaded.push({"name": "ui-detail-notice-late-core.v291rc0ui1.js", "files": ["assets/detail-card-lite-ui.v2981fix2.js", "assets/notice-compact-ui.v2981fix2.js"]});
  st.count=st.loaded.length;
  try{if(window.LN_DEBUG_V2983){window.LN_DEBUG_V2983.setFlags&&window.LN_DEBUG_V2983.setFlags({uiBundle:'v291rc0ui1',uiBundleOpt:window.LN_UI_BUNDLE_OPT!==false,uiBundleVersion:'291rc0-ui-core1-20260513'});window.LN_DEBUG_V2983.detail&&window.LN_DEBUG_V2983.detail('uiCoreBundle',st);}}catch(e){}
})();
/* ===== END assets/ui-detail-notice-late-core.v291rc0ui1.js ===== */


/* ===== BEGIN assets/decision-context-model.v2982.js ===== */
// V2.9.8.2 unified decision context: one upstream state for rules, diagnosis, cards and export.
(function(){
  function val(id, fallback){const el=document.getElementById(id); return (el&&el.value!==undefined)?el.value:(fallback||'');}
  function activeChips(selector, attr){return Array.from(document.querySelectorAll(selector+'.active')).map(x=>x.dataset[attr]||x.dataset.value||x.textContent.trim()).filter(Boolean);}
  function selectedRejects(){return Array.from(document.querySelectorAll('#rejectChips .chip.active')).map(x=>x.dataset.reject||x.textContent.trim()).filter(Boolean);}
  function scoreBand(){try{return (typeof scoreBandV29473==='function')?scoreBandV29473():'';}catch(e){return '';}}
  function rank(){try{return (typeof resolveRank==='function')?resolveRank():Number(val('myRank',0))||null;}catch(e){return Number(val('myRank',0))||null;}}
  function student(){
    const api=window.LN_STUDENT_PROFILE_RULES_V2981||window.LN_STUDENT_PROFILE_RULES_V298||window.LN_STUDENT_PROFILE_RULES_V2975;
    const s=api?.readState?.()||{};
    return {
      gender:s.gender||'unspecified', source:s.source||'unconfirmed', learning:s.learning||'unclear', load:s.load||'unknown', path:s.path||'unknown', understanding:s.understanding||'unclear', raw:s,
      hasMeaningful:!!(window.LN_STUDENT_PROFILE_NORMALIZER_V2981FIX2?.isMeaningfulProfile?.(s))
    };
  }
  function interests(){
    const rt=window.LN_CHILD_INTEREST_RUNTIME_V296||window.LN_CHILD_INTEREST_RUNTIME_V298;
    const state=rt?.readState?.()||{};
    const ids=rt?.effectiveGroupIds?.(state)||[];
    const groups=ids.map(id=>rt?.groupById?.(id)).filter(Boolean);
    const summary=rt?.summary?.()||{};
    return {
      state, ids, groups,
      names:groups.map(g=>g.name||g.short||g.id).filter(Boolean),
      shorts:groups.map(g=>g.short||g.name||g.id).filter(Boolean),
      translated:groups.map(g=>g.name||g.short||g.id).filter(Boolean),
      hitSummary:summary.hit||rt?.hitSummary?.()||null,
      active:ids.length>0
    };
  }
  function family(){
    const provinces=(typeof selectedProvinces==='function')?selectedProvinces():activeChips('#provinceChips .chip','province');
    const cities=(typeof selectedCitiesV29472==='function')?selectedCitiesV29472():(val('targetCities','').split(/[，,\s]+/).filter(Boolean));
    const regionMode=val('regionMode','none');
    const cityMode=(typeof cityModeV29472==='function')?cityModeV29472():val('cityMode','none');
    const rejects=selectedRejects();
    const rejectSet=new Set(rejects);
    const budget=val('budget','normal');
    const feeType=val('filterFeeType','all');
    const outBox=document.querySelector('[data-group="outProvince"] .chip.active');
    const outProvince=outBox?.dataset?.value || 'yes';
    return {provinces,cities,regionMode,cityMode,rejects,rejectSet,budget,feeType,outProvince,
      budgetWide:budget==='high'||budget==='coop'||budget==='flex'||budget==='wide',
      coopIntent:budget==='coop'||String(feeType).includes('coop'),
      noHighFee:budget==='normal'||rejectSet.has('高收费')||feeType==='excludeHighPrivate'||feeType==='normal'};
  }
  function scenario(){const cur=(typeof currentStrategy!=='undefined'?currentStrategy:(window.currentStrategy||'broad')); return {current:cur||'broad', priority:val('priority','employment'), sortBy:val('sortBy','profile')};}
  function qualification(){return {specialStatus:(typeof specialPlanStatusV29474==='function')?specialPlanStatusV29474():'unreviewed', state:window.LN_QUALIFICATION_GATE_V296?.readState?.()||{}};}
  function build(){
    const f=family(), st=student(), it=interests(), sc=scenario(), q=qualification();
    const sb=scoreBand();
    const qMajor=(val('qMajor','')+' '+val('filterSubjectGroup','')).trim();
    const strongProvince=f.outProvince==='no'||(f.regionMode==='hard'&&f.provinces.length===1&&f.provinces[0]==='辽宁')||['shenyang','dalian','publicLow','grid'].includes(sc.current);
    const strongCity=sc.priority==='city'||f.cityMode!=='none'||f.cities.length>0||['shenyang','dalian','city'].includes(sc.current);
    const hotByInterest=it.ids.some(id=>['computer_info','electric_energy','electronic_comm','medical_health','teacher_education','humanities_law'].includes(id));
    const hotMajor=/计算机|软件|人工智能|数据|信息安全|网络|电气|电子|临床|口腔|医学|师范|法学/.test(qMajor)||['grid','medical','exam'].includes(sc.current)||hotByInterest;
    return {version:'V2.9.8.2', score:Number(val('myScore',0))||null, rank:rank(), family:f, student:st, interests:it, scenario:sc, qualification:q,
      currentStrategy:sc.current, priority:sc.priority, qMajor, scoreBand:sb,
      lowScore:/540—500|500—450|450—400|400—350|本科边缘/.test(sb), edgeScore:/500—450|450—400|400—350|本科边缘/.test(sb), highScore:/650\+|650—620|700/.test(sb),
      strongProvince, strongCity, hotMajor, normalFamily:f.budget==='normal'||f.noHighFee, budgetWide:f.budgetWide, coopIntent:f.coopIntent, noHighFee:f.noHighFee,
      strict:!!document.getElementById('strictProfile')?.checked, specialStatus:q.specialStatus};
  }
  function summaryLine(ctx){ctx=ctx||build();const parts=[];parts.push(ctx.qualification.specialStatus==='approved'?'资格已确认':'普通考生口径');parts.push(ctx.noHighFee?'公办/普通学费优先':'预算可比较');parts.push(ctx.interests.active?'兴趣软排序':'综合推荐');parts.push(ctx.scenario.sortBy==='profile'?'默认综合排序':'当前排序：'+ctx.scenario.sortBy);return parts.join('｜');}
  window.LN_DECISION_CONTEXT_V2982={build,summaryLine,ready:true};
})();
/* ===== END assets/decision-context-model.v2982.js ===== */


/* ===== BEGIN assets/legacy-preference-adapter.v2982.js ===== */
// V2.9.8.2 legacy adapter: old engines read the unified context, not hidden old DOM controls.
(function(){
  function ctx(){return window.LN_DECISION_CONTEXT_V2982?.build?.()||{};}
  function has(ids, list){return (ids||[]).some(id=>list.includes(id));}
  function group(name){
    const c=ctx(); const ids=c.interests?.ids||[];
    if(name==='outProvince') return c.family?.outProvince || 'yes';
    if(name==='medicine') return has(ids,['medical_health','pharmacy_pharma'])?'prefer':'neutral';
    if(name==='teacher') return has(ids,['teacher_education'])?'prefer':'neutral';
    if(name==='liberal') return has(ids,['humanities_law','finance_manage'])?'prefer':'neutral';
    if(name==='chem') return has(ids,['chem_food_env'])?'prefer':'neutral';
    if(name==='physics') return has(ids,['mechanical_instrument'])?'prefer':'neutral';
    if(name==='gridPower') return has(ids,['electric_energy'])?'prefer':'neutral';
    return 'neutral';
  }
  function profileField(name){
    const s=ctx().student||{};
    if(name==='gradWillingnessV29471') return s.path==='grad_ok'?'yes':s.path==='work_first'?'no':'unknown';
    if(name==='mathTolerance') return s.load==='sensitive'?'medium':'normal';
    if(name==='fieldWorkAcceptance') return s.learning==='practice'?'accept':'unknown';
    if(name==='codeAcceptance') return (ctx().interests?.ids||[]).includes('computer_info')?'medium':'unknown';
    if(name==='studentGender') return s.gender||'unspecified';
    return 'unknown';
  }
  function mentorContext(){
    const c=ctx(); const s=c.student||{}, f=c.family||{};
    return {mode:'standard', mentorMode:'standard', familyTolerance:f.budgetWide?'high':'low', gradPlan:s.path==='grad_ok'?'yes':s.path==='work_first'?'no':'maybe', timePressure:(s.path==='work_first'&&f.noHighFee)?'fast':s.path==='grad_ok'?'long':'normal', priority:c.priority||'employment'};
  }
  function setValue(id,value){const el=document.getElementById(id); if(el && value!==undefined && value!==null){el.value=value;}}
  function setSingle(groupName,value){
    const box=document.querySelector(`[data-group="${groupName}"]`); if(!box)return;
    box.querySelectorAll('.chip').forEach(ch=>ch.classList.toggle('active',(ch.dataset.value||'')===value));
  }
  function syncLegacyDom(){
    const m=mentorContext();
    setValue('mentorMode',m.mentorMode); setValue('familyTolerance',m.familyTolerance); setValue('gradPlan',m.gradPlan); setValue('timePressure',m.timePressure);
    setValue('mathTolerance',profileField('mathTolerance')); setValue('fieldWorkAcceptance',profileField('fieldWorkAcceptance')); setValue('gradWillingnessV29471',profileField('gradWillingnessV29471')); setValue('codeAcceptance',profileField('codeAcceptance'));
    ['medicine','teacher','liberal','chem','physics','gridPower'].forEach(k=>setSingle(k,group(k)));
  }
  function patchStateSnapshot(){
    const old=window.LN_STATE_SNAPSHOT_V296; if(!old || old.__v2982Unified)return;
    const api={ready:true,__v2982Unified:true, reset:function(){old.reset?.();}, snapshot:function(force){syncLegacyDom(); const c=ctx(); const f=c.family||{}, q=c.qualification||{}, mc=mentorContext(); const cache={rank:c.rank,score:c.score,provinces:f.provinces||[],cities:f.cities||[],child:c.interests?.state||{},priority:c.priority,regionMode:f.regionMode,cityMode:f.cityMode,rejectList:f.rejects||[],rejectSet:f.rejectSet||new Set(),budget:f.budget,familyTolerance:mc.familyTolerance,feeType:f.feeType,qMajor:c.qMajor,currentStrategy:c.currentStrategy,budgetWide:c.budgetWide,coopIntent:c.coopIntent,noHighFee:c.noHighFee,strict:c.strict,scoreBand:c.scoreBand,lowScore:c.lowScore,edgeScore:c.edgeScore,highScore:c.highScore,outProvince:group('outProvince'),medicine:group('medicine'),teacher:group('teacher'),liberal:group('liberal'),chem:group('chem'),physics:group('physics'),gridPower:group('gridPower'),mentorMode:mc.mentorMode,gradPlan:mc.gradPlan,timePressure:mc.timePressure,strongProvince:c.strongProvince,strongCity:c.strongCity,hotMajor:c.hotMajor,normalFamily:c.normalFamily,specialStatus:c.specialStatus,qualificationGate:q.state||{},decisionContext:c}; return cache; }};
    window.LN_STATE_SNAPSHOT_V296=api;
  }
  function patchGlobals(){
    if(!window.__LN_OLD_GET_GROUP_V2982 && typeof window.getGroup==='function') window.__LN_OLD_GET_GROUP_V2982=window.getGroup;
    window.getGroup=function(name){return group(name);};
    const oldMentor=window.mentorRule;
    if(typeof oldMentor==='function' && !oldMentor.__v2982Wrapped){
      const wrapped=function(){syncLegacyDom(); return oldMentor.apply(this,arguments);};
      wrapped.__v2982Wrapped=true; wrapped.__original=oldMentor; window.mentorRule=wrapped;
    }
    patchStateSnapshot(); syncLegacyDom();
  }
  const api={getGroup:group,getProfileField:profileField,getMentorContext:mentorContext,syncLegacyDom,patchGlobals,ready:true};
  window.LN_LEGACY_PREFERENCE_ADAPTER_V2982=api;
  patchGlobals(); setTimeout(patchGlobals,0); setTimeout(patchGlobals,600);
})();
/* ===== END assets/legacy-preference-adapter.v2982.js ===== */


/* ===== BEGIN assets/advisor-diagnosis-engine.v2982.js ===== */
// V2.9.8.2 advisor diagnosis: explanation layer over the unified decision context.
(function(){
  function fmt(v){try{return window.fmt?window.fmt(v):Number(v||0).toLocaleString('zh-CN');}catch(e){return String(v??0);}}
  function esc(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));}
  function fallbackFunnel(){
    // V2.9.8.3.fix2: do not call legacy buildFunnelV29473 here.
    // The old funnel rebuilt DATA and ran profileScore for every row, causing multi-second scenario/render delays.
    try{
      const b=window.LN_COMPUTE_PIPELINE_V2983?.state?.lastBaseStats || window.LN_DEBUG_V2983?.state?.details?.baseFilterStats || null;
      const rows=Number(b?.rows||0), out=Number(b?.out||0);
      const f=[{step:'位次分段加载',count:rows,drop:0,before:rows}];
      const ex=b?.exclusionStats||{};
      Object.keys(ex).forEach(k=>{const d=Number(ex[k]||0); if(d>0) f.push({step:k,count:Math.max(0,out),drop:d,before:out+d});});
      f.push({step:'当前基础候选池',count:out,drop:Math.max(0,rows-out),before:rows,note:'来自漏斗式基础过滤缓存'});
      return f;
    }catch(e){return [];}
  }
  function topPressure(funnel){return (funnel||[]).filter(x=>x.drop>0).sort((a,b)=>b.drop-a.drop).slice(0,3);}
  function diagnose(){
    window.LN_LEGACY_PREFERENCE_ADAPTER_V2982?.syncLegacyDom?.();
    const c=window.LN_DECISION_CONTEXT_V2982?.build?.()||{};
    const list=(typeof filtered!=='undefined'&&Array.isArray(filtered))?filtered:[];
    const tDiag=(window.performance&&performance.now)?performance.now():Date.now(); const funnel=fallbackFunnel(); const top=topPressure(funnel); const count=list.length; const conflicts=[];
    function add(id,title,diagnosis,relax,avoid,review,schemes){conflicts.push({id,title,diagnosis,relax,avoid,review,schemes});}
    if(c.rank && count<20 && c.strongProvince && c.hotMajor){add('province_hot','强区域 + 热门方向压缩','当前省内/城市范围与热门方向同时较强，候选容易变少。',['先把城市/区域硬筛改成软偏好','把正主专业扩展到相近方向','保留 A/B 中稳妥候选后再看 C 组'],['不建议先放开资格型入口','不建议先接受未核验高收费','不建议把弱相关专业当正主'],['专业代码','培养方案','实际校区','资格入口'],['A 守底线','B 看专业','C 近省/平台扩展']);}
    if(c.normalFamily && c.strongCity){add('ordinary_city','普通家庭 + 城市偏好','城市偏好会挤压公办、普通学费和专业匹配空间。',['城市硬条件改为软提醒','省内扩展到近省','先看费用可控的公办候选'],['不建议为了城市直接接受高收费','不建议忽略就读校区'],['学费','校区','学校性质','生活成本'],['A 成本可控','B 专业路径','C 城市软筛']);}
    if(c.student?.path==='work_first' && c.hotMajor){add('work_hot','本科就业优先 + 热门方向','如果更希望本科就业，要重点看本科出口和课程强度，不宜只看热门专业名。',['优先比较路径清楚、培养方案可读的专业','把热门词拆成本科目录专业类复核'],['不建议用“考研兜底”解释所有冷门或弱相关方向'],['本科就业出口','课程结构','读研依赖'],['A 出口清楚','B 专业正主','C 平台上限']);}
    if(c.qualification?.specialStatus!=='approved'){
      const hidden=(window.exclusionStats&&((window.exclusionStats['资格入口隐藏']||0)+(window.exclusionStats['高校专项隐藏']||0)))||0;
      if(hidden>0) add('qualification','资格入口默认保护','高校专项、预科/民族班、定向培养等默认按普通考生口径隐藏，避免混入普通批比较。',['确有资格时再到“管理资格入口”放开','不确定时继续按未审核处理'],['不建议用资格型入口缓解普通批候选偏少'],['资格审核','公示名单','招生章程'],['普通候选 A/B/C','资格候选单独复核']);
    }
    if(!conflicts.length){const p=top.map(x=>x.step).join('、')||'暂无明显压缩点';add('general','当前口径基本可用',count<20?`候选偏少，主要压缩点可能是：${p}。`:'结果数量基本可用，建议先看 A/B/C，再看详细卡家长必读。',['若结果偏少，先放宽压缩最大的非底线条件','若结果偏多，先明确地域、预算和兴趣方向'],['不要先放宽家庭成本底线','不要忽略专业代码和校区'],['招生章程','专业代码','学费','校区'],['A 守底线','B 看专业','C 争上限']);}
    const out={snapshot:Object.assign({},c,{provinces:c.family?.provinces||[],cities:c.family?.cities||[],budget:c.family?.budget,priority:c.priority,regionMode:c.family?.regionMode,cityMode:c.family?.cityMode}), funnel, top, conflicts:conflicts.slice(0,3)}; try{window.LN_DEBUG_V2983?.detail?.('advisorDiagnosis',{ms:Math.round(((window.performance&&performance.now)?performance.now():Date.now())-tDiag),funnelSteps:funnel.length,conflicts:out.conflicts.length,source:'v2983fix2-light'});}catch(e){} return out;
  }
  function render(diag){
    const box=document.getElementById('conflictDiagnosisV29473'); if(!box)return; if(!(typeof currentRank!=='undefined'?currentRank:window.currentRank)){box.innerHTML='';return;}
    const main=(diag?.conflicts||[])[0]||{}; const snap=diag?.snapshot||{};
    const pressure=(diag?.top||[]).slice(0,3).map(x=>`<span>${esc(x.step)}：减少 ${fmt(x.drop)}</span>`).join('') || '<span>暂无明显压缩点</span>';
    const funnel=(diag?.funnel||[]).map(x=>`<div class="funnel-step"><b>${esc(x.step)}</b><span>${fmt(x.count)} 条</span>${x.drop?`<em>−${fmt(x.drop)}</em>`:''}</div>`).join('');
    const relax=(main.relax||[]).slice(0,4).map(x=>`<li>${esc(x)}</li>`).join(''); const avoid=(main.avoid||[]).slice(0,4).map(x=>`<li>${esc(x)}</li>`).join('');
    box.innerHTML=`<div class="diagnosis-v29473 diagnosis-compact-v2981fix1 diagnosis-v2982"><div class="diag-main"><div><span class="diag-kicker">高报师诊断</span><h3>${esc(main.title||'当前候选范围摘要')}</h3><p>${esc(main.diagnosis||'诊断只解释同一套筛选口径，不另起一套高级规则。')}</p></div><div class="diag-band">${esc(snap.scoreBand||'位次段待计算')}</div></div><div class="pressure-tags-v29473"><b>候选压缩：</b>${pressure}</div><details class="diag-details-v29473"><summary>展开诊断说明</summary><div class="funnel-grid-v29473">${funnel}</div><div class="diag-advice-grid" style="display:grid"><div><h4>建议优先放宽</h4><ol>${relax}</ol></div><div><h4>不建议先放宽</h4><ol>${avoid}</ol></div></div></details></div>`;
  }
  window.diagnoseV29473=diagnose; window.renderDiagnosisV29473=render;
  window.LN_ADVISOR_DIAGNOSIS_ENGINE_V2982={diagnose,render,ready:true};
})();
/* ===== END assets/advisor-diagnosis-engine.v2982.js ===== */


/* ===== BEGIN assets/interaction-stability.v2982.js ===== */
// V2.9.8.2 interaction stability: drawer buttons, detailed-card expanders, step targets.
(function(){
  function setDrawerType(t){window.__LN_ACTIVE_DRAWER_TYPE=t||'';}
  function patchRuntime(){
    const rt=window.LN_CHILD_INTEREST_RUNTIME_V296||window.LN_CHILD_INTEREST_RUNTIME_V298; if(rt && !rt.__v2982Stable){
      const oldStart=rt.start; rt.start=function(){setDrawerType('childInterest'); (oldStart||function(){window.LN_CHILD_INTEREST_UI_V296?.openDrawer?.();}).call(rt); return true;};
      const oldHandle=rt.handle; rt.handle=function(action,el){const res=oldHandle?oldHandle.call(rt,action,el):false; if(['child-interest-start','child-interest-undecided','child-interest-remove','child-interest-auto-toggle','child-intent-remove'].includes(action)) return true; return res;};
      rt.__v2982Stable=true;
    }
    const ui=window.LN_CHILD_INTEREST_UI_V296||window.LN_CHILD_INTEREST_UI_V298; if(ui && !ui.__v2982Stable){
      const oldOpen=ui.openDrawer; ui.openDrawer=function(){setDrawerType('childInterest'); const r=oldOpen?oldOpen.apply(ui,arguments):window.LN_DRAWER_V296?.open?.('孩子兴趣',''); return r;};
      const oldRender=ui.renderDrawerBody; ui.renderDrawerBody=function(){if(window.LN_DRAWER_V296?.isOpen?.() && window.__LN_ACTIVE_DRAWER_TYPE && window.__LN_ACTIVE_DRAWER_TYPE!=='childInterest') return; return oldRender?oldRender.apply(ui,arguments):undefined;};
      ui.__v2982Stable=true;
    }
    const prof=window.LN_STUDENT_PROFILE_UI_V2975||window.LN_STUDENT_PROFILE_UI_V2981; if(prof && !prof.__v2982Stable){
      const oldOpen=prof.openDrawer; prof.openDrawer=function(){setDrawerType('studentProfile'); const r=oldOpen?oldOpen.apply(prof,arguments):undefined; return r||true;}; prof.__v2982Stable=true;
    }
  }
  function openInterest(e){e?.preventDefault?.();e?.stopPropagation?.();patchRuntime();setDrawerType('childInterest');window.LN_CHILD_INTEREST_RUNTIME_V296?.start?.();return true;}
  function openProfile(e){e?.preventDefault?.();e?.stopPropagation?.();patchRuntime();setDrawerType('studentProfile');window.LN_STUDENT_PROFILE_UI_V2975?.openDrawer?.();return true;}
  function bindStepTargets(){document.querySelectorAll('[data-scroll-target="strategyEntry"]').forEach(btn=>{if((btn.textContent||'').includes('选择家庭场景')){btn.dataset.scrollTarget='childInterest';btn.textContent='下一步：补充孩子学习特点与兴趣';}});document.querySelectorAll('[data-scroll-target="profileAsk"]').forEach(btn=>{btn.dataset.scrollTarget='childInterest';if((btn.textContent||'').trim())btn.textContent='编辑特点与兴趣';});}
  function expandLite(btn){
    const card=btn.closest('[data-lite-card]'); if(!card)return false; const box=card.querySelector('[data-lite-panel]'); if(!box)return false;
    let sections={}; try{sections=JSON.parse(decodeURIComponent(card.dataset.liteSections||'%7B%7D'));}catch(e){}
    const key=btn.dataset.liteSection||'evidence'; const active=btn.classList.contains('active');
    card.querySelectorAll('[data-lite-section]').forEach(b=>b.classList.remove('active'));
    if(active){box.hidden=true;box.textContent='';return true;}
    btn.classList.add('active'); box.hidden=false; box.textContent=sections[key] || '暂无更多说明。'; return true;
  }
  document.addEventListener('click',function(e){
    const profile=e.target.closest('[data-action="open-student-profile"]'); if(profile) return openProfile(e);
    const interest=e.target.closest('[data-action="child-interest-start"]'); if(interest) return openInterest(e);
    const lite=e.target.closest('[data-lite-section]'); if(lite){e.preventDefault();e.stopPropagation();expandLite(lite);return;}
  },true);
  function patch(){patchRuntime();bindStepTargets();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',patch);else patch();
  setTimeout(patch,0);setTimeout(patch,600);setTimeout(patch,1600);
  window.LN_INTERACTION_STABILITY_V2982={patch,openInterest,openProfile,ready:true};
})();
/* ===== END assets/interaction-stability.v2982.js ===== */


/* ===== BEGIN assets/scroll-lock-guard.v2982fix2.js ===== */
// V2.9.8.2.fix2 scroll guard: release stale drawer locks and overlay leftovers.
(function(){
  function qs(sel){try{return document.querySelector(sel);}catch(e){return null;}}
  function visible(el){return !!(el && !el.classList.contains('hide') && el.offsetParent !== null || (el && !el.classList.contains('hide') && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden'));}
  function drawerOpen(){
    const drawer=qs('.ln-drawer-v296');
    const mask=qs('.ln-drawer-mask-v296');
    return visible(drawer) || visible(mask);
  }
  function ensure(){
    const open=drawerOpen();
    if(!open){
      document.body.classList.remove('drawer-open-v296');
      const mask=qs('.ln-drawer-mask-v296');
      const drawer=qs('.ln-drawer-v296');
      if(mask) mask.classList.add('hide');
      if(drawer) drawer.classList.add('hide');
      if(document.documentElement) document.documentElement.style.overflowY='auto';
      if(document.body){document.body.style.overflowY='auto';document.body.style.position='';}
      if(window.__LN_ACTIVE_DRAWER_TYPE && window.__LN_ACTIVE_DRAWER_TYPE!=='childInterest' && window.__LN_ACTIVE_DRAWER_TYPE!=='studentProfile') window.__LN_ACTIVE_DRAWER_TYPE='';
    }
    return !open;
  }
  function closeAll(){
    const mask=qs('.ln-drawer-mask-v296');
    const drawer=qs('.ln-drawer-v296');
    if(mask) mask.classList.add('hide');
    if(drawer) drawer.classList.add('hide');
    document.body.classList.remove('drawer-open-v296');
    if(document.documentElement) document.documentElement.style.overflowY='auto';
    if(document.body){document.body.style.overflowY='auto';document.body.style.position='';}
    window.__LN_ACTIVE_DRAWER_TYPE='';
  }
  function patchDrawer(){
    const d=window.LN_DRAWER_V296;
    if(!d || d.__scrollGuardFix2) return;
    const oldOpen=d.open?.bind(d), oldClose=d.close?.bind(d);
    if(oldOpen){d.open=function(){const r=oldOpen.apply(this,arguments); setTimeout(()=>{if(document.body.classList.contains('drawer-open-v296')){document.body.style.overflowY='hidden';}},0); return r;};}
    if(oldClose){d.close=function(){const r=oldClose.apply(this,arguments); closeAll(); return r;};}
    d.__scrollGuardFix2=true;
  }
  function bind(){
    if(bind.done) return; bind.done=true;
    document.addEventListener('click',function(e){
      const close=e.target.closest('[data-action="drawer-close"], .ln-drawer-mask-v296');
      if(close){setTimeout(closeAll,0);}
    },true);
    document.addEventListener('keydown',function(e){if(e.key==='Escape') closeAll();},true);
    window.addEventListener('pageshow',ensure);
    window.addEventListener('focus',ensure);
  }
  function init(){patchDrawer(); bind(); ensure(); setTimeout(ensure,50); setTimeout(ensure,500);}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
  window.LN_SCROLL_LOCK_GUARD_V2982FIX2={ensure,closeAll,patchDrawer,ready:true,version:'V2.9.8.2.fix2'};
})();
/* ===== END assets/scroll-lock-guard.v2982fix2.js ===== */


/* ===== BEGIN assets/ui-late-interaction-core.v291rc0ui1.js ===== */
// V2.91RC0.ui-core1 safe segmented UI bundle. Generated by exact concatenation; do not edit inside sections.
(function(){
  window.LN_UI_CORE_BUNDLE_STATUS = window.LN_UI_CORE_BUNDLE_STATUS || {version:'291rc0-ui-core1-20260513',loaded:[],mode:'segmented-safe',ok:true};
})();

// ===== BEGIN assets/abc-light-ui.v2983fix3.js =====
// V2.9.8.3.fix3 ABC light UI: pick lightweight candidates first, then render only visible 12 cards.
(function(){
  const perf=()=>window.performance&&performance.now?performance.now():Date.now();
  function esc(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));}
  function fmt(v){try{return window.fmt?window.fmt(v):String(v??'-');}catch(e){return String(v??'-');}}
  function geo(r){try{return window.geoDisplayV29472?geoDisplayV29472(r):(r.schoolCity||r.schoolProvince||'');}catch(e){return r.schoolCity||r.schoolProvince||'';}}
  function levelWeight(l){return ({'保底':20,'稳妥':18,'匹配':15,'可冲':9,'观察':6}[l]||5);}
  function score(r,type){
    const tier=r.schoolTier?.level||''; const pub=['public','publicSoft'].includes(r.schoolTier?.level); const high=!!(r.isHighFee||r.isCoopV29475||r.isPrivateV29475); const p=Number(r._profile||50); const fit=Number(r._fit||9999999); const interest=Number(r._interestSortScore||0);
    let s=0;
    if(type==='A'){s+=levelWeight(r._level)*3; if(pub)s+=35; if(!high)s+=25; s+=p*.25; s-=Math.min(fit/1000,20);} 
    else if(type==='B'){s+=interest*2.2; s+=p*.45; s+=levelWeight(r._level)*1.4; if(high)s-=8;}
    else {if(tier==='985')s+=50; else if(tier==='211')s+=34; s+=levelWeight(r._level)*1.8; if(['可冲','匹配'].includes(r._level))s+=10; if(high)s+=6; s+=p*.15;}
    return s;
  }
  function key(r){return [r.school||'',r.major||'',r.rank2025||'',r.score2025||''].join('|');}
  function cluster(r,type){if(type==='A')return [r.schoolProvince||'',r.schoolNature?.label||'',r._level||''].join('/'); if(type==='B')return r.subjectGroup||r.undergradCategoryName||String(r.major||'').slice(0,4); if(type==='C')return r.schoolTier?.level||r.schoolCity||r.schoolProvince||''; return 'x';}
  function pick(type,avoid=new Set()){
    const t=perf(); const rows=(window.filtered||[]).filter(r=>!(r._excludes||[]).length); const sample=rows.slice(0,240);
    const scored=sample.map(r=>[r,score(r,type)]).sort((a,b)=>b[1]-a[1]); const out=[],seen=new Set(),clusters=new Set();
    for(const strict of [true,false]){
      for(const [r] of scored){const k=key(r); if(seen.has(k))continue; if(strict&&avoid.has(k))continue; const c=cluster(r,type); if(strict&&clusters.has(c)&&out.length<3)continue; if(type==='A'&&strict&&(r.isHighFee||r.isCoopV29475||r.isPrivateV29475)&&out.length<2)continue; out.push(r); seen.add(k); clusters.add(c); if(out.length>=4){window.LN_DEBUG_V2983?.detail?.('abcPick_'+type,{rows:rows.length,sample:sample.length,out:out.length,ms:Math.round(perf()-t)});return out;}}
    }
    window.LN_DEBUG_V2983?.detail?.('abcPick_'+type,{rows:rows.length,sample:sample.length,out:out.length,ms:Math.round(perf()-t)}); return out;
  }
  function buckets(){const A=pick('A'); const a=new Set(A.map(key)); const B=pick('B',a); const ab=new Set([...A,...B].map(key)); const C=pick('C',ab); return {A,B,C};}
  function safety(r){try{return window.LN_ADMISSION_SAFETY_RULES_V2981?.classify?.(r)||{};}catch(e){return {};}}
  function evidence(r){try{return window.LN_ADMISSION_EVIDENCE_RULES_V2981?.build?.(r)||{};}catch(e){return {};}}
  function tagLine(r,type){const arr=[]; const sf=safety(r); const ev=evidence(r); if(sf.label)arr.push(sf.label); if(r._level)arr.push(r._level); if(ev.tag)arr.push(ev.tag); if(type==='A')arr.push('守底线'); if(type==='B'&&r._interestSortScore)arr.push('看专业'); if(type==='C')arr.push('争上限'); return [...new Set(arr)].slice(0,4).map(x=>`<span>${esc(x)}</span>`).join('');}
  function card(r,type,i){
    if(!r)return `<article class="plan-decision-card-v2981 empty"><b>${type}${i+1}</b><p>暂无合适候选。</p></article>`;
    const sf=safety(r), ev=evidence(r); const role=i===0?'本组优先看':'补充比较';
    return `<article class="plan-decision-card-v2981 ${type.toLowerCase()} safety-${esc(sf.tone||'unknown')}"><div class="decision-card-head-v2981"><span>${type}${i+1}｜${role}</span><b>${esc(sf.label||r._level||'观察')}</b></div><h4>${esc(r.school)}</h4><div class="decision-major-v2981">${esc(r.major)}</div><small>${esc(geo(r))}｜${esc(r.schoolNature?.label||'性质待核验')}｜${esc(r.schoolTier?.label||'层级待核验')}</small><div class="candidate-lite-tags-v2983">${tagLine(r,type)}</div><div class="decision-evidence-grid-v2981"><div><b>${esc(ev.y2025||('2025：'+fmt(r.score2025)+'分｜'+fmt(r.rank2025)+'位'))}</b><span>主参考</span></div><div><b>${esc(ev.y2024||'2024：暂无可比记录')}</b><span>对照</span></div></div><p class="decision-trend-v2981 tone-${esc(ev.tone||'unknown')}">${esc(ev.trend||'建议复核投档证据')}</p><div class="decision-tradeoff-v2981"><p><b>本卡先看</b>${type==='A'?'费用、性质和安全垫':type==='B'?'专业方向和培养路径':'学校平台、城市和不确定性'}</p><p><b>复核重点</b>招生章程、专业代码、学费和校区。</p></div><div class="decision-actions-v2981"><button class="ghost slim" onclick="addPlanOneV29475Fix2('${esc(r.id||'')}','${type}','${i===0?'优先看':'补充比较'}')">加入</button></div></article>`;
  }
  function meta(type){return window.LN_ABC_DECISION_CARD_MODEL_V2981?.groupMeta?.(type)||({A:{title:'A：守底线',view:'先守住家庭底线。'},B:{title:'B：看专业',view:'先看方向是否对。'},C:{title:'C：争上限',view:'争取平台和城市。'}}[type]);}
  function panel(active,b){const m=meta(active); const rows=(b&&b[active])||[]; return `<div class="abc-active-panel-v296 abc-decision-panel-v2981"><div class="abc-active-head-v296 abc-head-v2981"><b>${esc(m.title||active)}</b><span>${esc(m.view||'')}</span></div><div class="abc-decision-list-v2981">${rows.slice(0,4).map((r,i)=>card(r,active,i)).join('')||card(null,active,0)}</div></div>`;}
  function render(viewOnly){const t=perf(); const box=document.getElementById('planABC'); if(!box)return; if(!(window.currentRank|| (typeof currentRank!=='undefined'&&currentRank))){box.innerHTML='<div class="abc-empty-v2950">先填写分数或位次，再看 A/B/C 三条路径。</div>';return;} const b=buckets(); window.latestPlanBucketsV29475Fix2=b; try{latestPlanBucketsV29475Fix2=b;}catch(e){} const view=window.LN_ABC_VIEW_V296; const active=(view?.get?.()||'A'); if(viewOnly){const p=document.getElementById('abcPanelV296'); if(p){p.innerHTML=panel(active,b); view?.updateTabState?.(); window.LN_DEBUG_V2983?.detail?.('abcRenderBreakdown',{mode:'viewOnly',ms:Math.round(perf()-t),filtered:(window.filtered||[]).length}); return;}}
    box.className='abc-board-v296 abc-board-v2981 abc-board-light-v2983'; const tabs=view?.renderTabs?.(b)||''; const toolbar=`<div class="abc-toolbar-v296"><div><b>A/B/C 方案视角</b><span>A 守底线，B 看专业，C 争上限；本版先轻量选卡，展开详情时再补完整解释。</span></div><button class="execute-secondary" onclick="addAllPlansV29475Fix2()">加入全部 A/B/C 候选</button></div>`; box.innerHTML=toolbar+tabs+`<div id="abcPanelV296">${panel(active,b)}</div>`; view?.updateTabState?.(); window.LN_DEBUG_V2983?.detail?.('abcRenderBreakdown',{mode:'full',ms:Math.round(perf()-t),filtered:(window.filtered||[]).length});}
  function patch(){window.renderPlanABC=()=>render(false); window.renderPlanABCViewOnly=()=>render(true); if(window.LN_PLAN_ENGINE){window.LN_PLAN_ENGINE.renderPlanABC=window.renderPlanABC;window.LN_PLAN_ENGINE.renderPlanABCViewOnly=window.renderPlanABCViewOnly;} window.LN_ABC_LIGHT_UI_V2983FIX3={renderPlanABC:window.renderPlanABC,renderPlanABCViewOnly:window.renderPlanABCViewOnly,ready:true};}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',patch);else patch(); setTimeout(patch,0);
})();
// ===== END assets/abc-light-ui.v2983fix3.js =====

// ===== BEGIN assets/interest-interaction-lite.v2983fix3.js =====
// V2.9.8.3.fix3 interest interaction: immediate UI feedback, heavy matching after drawer close / scheduled refresh.
(function(){
  const perf=()=>window.performance&&performance.now?performance.now():Date.now();
  function rt(){return window.LN_CHILD_INTEREST_RUNTIME_V296||window.LN_CHILD_INTEREST_RUNTIME_V298;}
  function ui(){return window.LN_CHILD_INTEREST_UI_V296||window.LN_CHILD_INTEREST_UI_V298;}
  function dbg(name,obj){try{window.LN_DEBUG_V2983?.detail?.(name,obj);}catch(e){}}
  function stop(e){e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation)e.stopImmediatePropagation();}
  function toggleGroup(el,e){const t=perf(); stop(e); const id=el?.dataset?.childInterestGroup||''; const before=rt()?.readState?.(); const res=rt()?.toggleGroup?.(id); // runtime is already light when drawer is open.
    try{ui()?.renderDrawerSelectionOnly?.();}catch(err){}
    dbg('interestToggleBreakdown',{id,ok:!(res&&res.ok===false),reason:res?.reason||'',selected:(rt()?.readState?.().selectedGroups||[]),ms:Math.round(perf()-t),drawerOpen:!!rt()?.drawerIsChildInterest?.()});
    if(res&&res.ok===false&&res.reason==='max'){
      const box=document.querySelector('.child-interest-drawer-v296')||document.getElementById('childInterestBoxV296');
      if(box){const tip=document.createElement('div');tip.className='child-interest-toast-v296';tip.textContent='建议先选 1—3 个最有兴趣的方向，想换方向可以先删除一个。';box.prepend(tip);setTimeout(()=>tip.remove(),2600);} }
    return true;
  }
  function action(el,e){const a=el?.dataset?.action||''; if(!['child-interest-auto-toggle','child-interest-remove','child-interest-undecided','child-intent-remove'].includes(a))return false; const t=perf(); stop(e); try{rt()?.handle?.(a,el);}catch(err){} try{ui()?.renderDrawerSelectionOnly?.();}catch(err){} dbg('interestActionBreakdown',{action:a,ms:Math.round(perf()-t),drawerOpen:!!rt()?.drawerIsChildInterest?.()}); return true;}
  function onlyRealHitChange(el,e){if(el?.id!=='onlyChildInterestV296')return false; const t=perf(); stop(e); const r=rt(); const s=r?.readState?.()||{}; s.manualOnlyInterest=!!el.checked; r?.saveState?.(s); try{ui()?.renderSummary?.();}catch(err){} // Do not run matching inline. Let scheduler handle it after UI remains responsive.
    window.LN_REFRESH_SCHEDULER_V296?.request?.({reason:'child-interest-real-hit-toggle',level:'soft',delay:1400});
    dbg('interestManualOnlyToggle',{checked:!!el.checked,ms:Math.round(perf()-t)}); return true;}
  document.addEventListener('click',function(e){const group=e.target.closest('[data-child-interest-group]'); if(group)return toggleGroup(group,e); const act=e.target.closest('[data-action]'); if(act&&action(act,e))return;},true);
  document.addEventListener('change',function(e){if(onlyRealHitChange(e.target,e))return;},true);
  window.LN_INTEREST_INTERACTION_LITE_V2983FIX3={ready:true};
})();
// ===== END assets/interest-interaction-lite.v2983fix3.js =====

// ===== BEGIN assets/interest-drawer-slim.v2983fix4.js =====
// V2.9.8.3.fix4 interest drawer slim path: open/toggle/close must stay UI-only; heavy matching runs after drawer close via scheduler.
(function(){
  const VERSION='V2.9.8.3.fix4';
  const STAMP='2983fix4-20260511';
  const perf=()=>window.performance&&performance.now?performance.now():Date.now();
  function dbg(name,obj){try{window.LN_DEBUG_V2983?.detail?.(name,Object.assign({version:STAMP},obj||{}));}catch(e){}}
  function log(action,data){try{window.LN_DEBUG_V2983?.log?.(action,data||{});}catch(e){}}
  function esc(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));}
  function rt(){return window.LN_CHILD_INTEREST_RUNTIME_V296||window.LN_CHILD_INTEREST_RUNTIME_V298;}
  function tr(){return window.LN_CHILD_INTENT_TRANSLATOR_V298||window.LN_CHILD_INTENT_TRANSLATOR_V2976||window.LN_CHILD_INTENT_TRANSLATOR_V2975;}
  function drawer(){return window.LN_DRAWER_V296;}
  let dirty=false;
  let closePatched=false;
  let lastOpenAt=0;
  function isDrawerOpen(){return !!(drawer()?.isOpen?.() && window.__LN_ACTIVE_DRAWER_TYPE==='childInterest');}
  function maxGroups(){return rt()?.groups?.().length?((window.LN_INTEREST_TAXONOMY_V2976||{}).maxGroups||3):3;}
  function read(){return rt()?.readState?.()||{selectedGroups:[],disabledAutoMappings:[]};}
  function save(s){return rt()?.saveState?.(s)||s;}
  function selectedIntentIds(){try{return tr()?.readState?.().selectedIntentIds||[];}catch(e){return [];}}
  function activeAutoMappings(){try{return rt()?.autoMappings?.(read())||[];}catch(e){return [];}}
  function selectedNames(s){const r=rt(); const manual=(s.selectedGroups||[]).map(id=>r?.groupById?.(id)).filter(Boolean).map(g=>g.name); const autos=activeAutoMappings().map(x=>x.label); return [...new Set([...manual,...autos])];}
  function setDirty(reason){dirty=true; window.__LN_INTEREST_DIRTY_V2983FIX4=true; dbg('interestDirty',{reason,drawerOpen:isDrawerOpen(),selected:read().selectedGroups||[],auto:activeAutoMappings().map(x=>x.label)});}
  function flush(reason){
    if(!dirty && !window.__LN_INTEREST_DIRTY_V2983FIX4){return false;}
    const t=perf(); dirty=false; window.__LN_INTEREST_DIRTY_V2983FIX4=false;
    try{rt()?.render?.();}catch(e){}
    // Do not run interest hit aggregate inline. Main compute pipeline will refresh once; aggregate can stay cached.
    try{window.LN_REFRESH_SCHEDULER_V296?.request?.({reason:'child-interest-flush-'+(reason||'close'),level:'soft',delay:650});}catch(e){}
    dbg('interestFlushBreakdown',{reason,ms:Math.round(perf()-t)});
    return true;
  }
  function patchClose(){
    const d=drawer(); if(!d||closePatched||typeof d.close!=='function')return;
    const old=d.close;
    d.close=function(){const t=perf(); const was=window.__LN_ACTIVE_DRAWER_TYPE; const r=old.apply(d,arguments); if(was==='childInterest'){setTimeout(()=>flush('drawer-close'),0);} dbg('drawerCloseBreakdown',{type:was,ms:Math.round(perf()-t),dirty:!!dirty}); return r;};
    closePatched=true;
  }
  function markCardStates(){
    const t=perf(); const s=read(); const selected=new Set(s.selectedGroups||[]); const autoIds=new Set(activeAutoMappings().map(x=>x.interestId));
    document.querySelectorAll('[data-child-interest-group]').forEach(card=>{const id=card.dataset.childInterestGroup; card.classList.toggle('active',selected.has(id)); card.classList.toggle('auto-mapped-v2976',autoIds.has(id)); const g=rt()?.groupById?.(id); const b=card.querySelector('strong'); if(b&&g)b.textContent=g.name+(autoIds.has(id)?'｜已激活':'');});
    const intentSet=new Set(selectedIntentIds()); document.querySelectorAll('[data-child-intent-id]').forEach(btn=>btn.classList.toggle('active',intentSet.has(btn.dataset.childIntentId)));
    const line=document.querySelector('.child-interest-selected-line-v296'); if(line)line.innerHTML=selectedLineHtml(s);
    const names=selectedNames(s); const live=document.querySelector('.interest-drawer-live-v298'); if(live){const b=live.querySelector('b'); const sp=live.querySelector('span'); const p=live.querySelector('p'); if(b)b.textContent='孩子兴趣'; if(sp)sp.textContent=names.length?'已选：'+names.join('、'):'当前为综合推荐'; if(p)p.textContent=dirty?'已记录，关闭抽屉后统一刷新结果。':'点选只更新状态，不会在抽屉内重算候选。';}
    dbg('interestDrawerSelectionOnly',{ms:Math.round(perf()-t),selected:[...(s.selectedGroups||[])],auto:[...autoIds]});
  }
  function selectedLineHtml(s){
    const r=rt(); const manual=(s.selectedGroups||[]).map(id=>r?.groupById?.(id)).filter(Boolean);
    const auto=activeAutoMappings();
    const html=[];
    manual.forEach(g=>html.push(`<span>${esc(g.name)}<button data-action="child-interest-remove" data-interest-id="${esc(g.id)}">×</button></span>`));
    auto.forEach(x=>html.push(`<span class="auto-interest-chip-v2976">${esc(x.label)}<button data-action="child-interest-auto-toggle" data-intent-id="${esc(x.intentId)}" data-interest-id="${esc(x.interestId)}">×</button></span>`));
    return html.join('')||'<em>当前为综合推荐</em>';
  }
  function intentPanel(){
    const api=tr(); const intents=api?.intents||[]; const ids=new Set(selectedIntentIds());
    if(!intents.length)return '';
    return `<div class="child-intent-panel-v2975 interest-lite-intents-v2983fix4"><div class="intent-head-v2975"><div><b>孩子说法</b><span>点选只记录兴趣线索，关闭抽屉后再统一刷新候选。</span></div><em>最多选 3 个</em></div><div class="intent-grid-v2975">${intents.map(i=>`<button type="button" class="intent-chip-v2975 ${ids.has(i.id)?'active':''}" data-child-intent-id="${esc(i.id)}"><b>${esc(i.short)}</b><span>${esc(i.label)}</span></button>`).join('')}</div></div>`;
  }
  function groupCard(g,s,q){
    const on=(s.selectedGroups||[]).includes(g.id); const auto=activeAutoMappings().some(x=>x.interestId===g.id);
    const text=[g.name,g.desc,(g.match?.core||[]).join(' '),(g.match?.related||[]).join(' '),(g.match?.review||[]).join(' ')].join(' '); if(q&&!text.includes(q))return '';
    const core=(g.match?.core||[]).slice(0,3).join('、');
    return `<button type="button" class="child-interest-card-v296 interest-lite-card-v2983fix4 ${on?'active':''} ${auto?'auto-mapped-v2976':''}" data-child-interest-group="${esc(g.id)}"><div class="card-main-v296"><strong>${esc(g.name)}${auto?'｜已激活':''}</strong><span>${esc(g.desc||'')}</span><em>${esc(core?('正主：'+core):'关闭后计算真实候选')}</em></div></button>`;
  }
  function renderDrawerBody(){
    const t=perf(); const r=rt(); if(!r)return; const s=read(); const q=(window.__LN_INTEREST_SEARCH_V2983FIX4||'').trim(); const names=selectedNames(s);
    const body=`<div class="child-interest-drawer-v296 child-interest-drawer-v298 interest-drawer-slim-v2983fix4"><p class="drawer-help-v296">本抽屉只做轻量点选。真实命中、A/B/C 和详细候选会在关闭后统一刷新，避免边点边卡。</p>${intentPanel()}<div class="interest-drawer-live-v298"><b>孩子兴趣</b><span>${names.length?'已选：'+esc(names.join('、')):'当前为综合推荐'}</span><p>点选只更新状态，不在抽屉内重算候选。</p></div><div class="child-interest-selected-line-v296">${selectedLineHtml(s)}</div><div class="child-interest-search-v296"><input id="childInterestSearchV296" placeholder="搜索专业方向，例如：动物医学、法学、电气、仪器" value="${esc(q)}"/><button class="secondary slim" data-action="child-interest-undecided">清空</button></div><div class="child-interest-grid-v296 interest-lite-grid-v2983fix4">${r.groups().map(g=>groupCard(g,s,q)).join('')||'<div class="notice">没有匹配方向，可以换一个关键词。</div>'}</div><div class="child-interest-cycle-v296"><b>提示：</b>先把孩子想法选出来，关闭抽屉后再看真实候选命中。</div></div>`;
    drawer()?.setBody?.(body);
    const input=document.getElementById('childInterestSearchV296');
    if(input&&!input.dataset.slimBound){input.dataset.slimBound='1'; let timer=null; input.addEventListener('input',()=>{window.__LN_INTEREST_SEARCH_V2983FIX4=input.value; clearTimeout(timer); timer=setTimeout(renderDrawerBody,180);});}
    dbg('interestDrawerRenderMs',{ms:Math.round(perf()-t),groups:r.groups().length,intents:(tr()?.intents||[]).length,htmlLength:body.length});
  }
  function openDrawer(){const t=perf(); patchClose(); window.__LN_ACTIVE_DRAWER_TYPE='childInterest'; lastOpenAt=t; drawer()?.open?.('孩子兴趣与真实候选匹配','<div class="notice">正在加载兴趣方向...</div>'); renderDrawerBody(); dbg('interestDrawerOpenBreakdown',{ms:Math.round(perf()-t),version:STAMP}); return true;}
  function toggleGroupLite(id){
    const t=perf(); const r=rt(); const g=r?.groupById?.(id); if(!g)return {ok:false,reason:'not_found'}; const s=read(); let arr=s.selectedGroups||[];
    if(arr.includes(id))arr=arr.filter(x=>x!==id); else{if(arr.length>=maxGroups())return {ok:false,reason:'max'}; arr=[...arr,id];}
    save(Object.assign(s,{selectedGroups:arr})); setDirty('toggleGroup'); markCardStates(); dbg('interestToggleDeepBreakdown',{id,ms:Math.round(perf()-t),selected:arr}); return {ok:true};
  }
  function removeGroupLite(id){const t=perf(); const s=read(); save(Object.assign(s,{selectedGroups:(s.selectedGroups||[]).filter(x=>x!==id)})); setDirty('removeGroup'); markCardStates(); dbg('interestRemoveBreakdown',{id,ms:Math.round(perf()-t)}); return true;}
  function toggleAutoLite(intentId,interestId){const t=perf(); const s=read(); const key=intentId+'|'+interestId; const set=new Set(s.disabledAutoMappings||[]); if(set.has(key))set.delete(key); else set.add(key); save(Object.assign(s,{disabledAutoMappings:[...set]})); setDirty('toggleAuto'); markCardStates(); dbg('interestAutoToggleDeepBreakdown',{intentId,interestId,disabled:[...set],ms:Math.round(perf()-t)}); return true;}
  function undecidedLite(){const t=perf(); const s=Object.assign(read(),{mode:'undecided',selectedGroups:[],selectedMajors:[],manualOnlyInterest:false,disabledAutoMappings:[]}); try{tr()?.clear?.();}catch(e){} save(s); setDirty('undecided'); markCardStates(); dbg('interestUndecidedBreakdown',{ms:Math.round(perf()-t)}); return true;}
  function toggleIntentLite(id){const t=perf(); const res=tr()?.toggle?.(id); setDirty('intentToggle'); markCardStates(); dbg('interestIntentToggleBreakdown',{id,ok:!(res&&res.ok===false),reason:res?.reason||'',ms:Math.round(perf()-t)}); return res||{ok:true};}
  function handleLite(action,el){
    if(action==='child-interest-start')return openDrawer();
    if(action==='child-interest-undecided')return undecidedLite();
    if(action==='child-interest-remove')return removeGroupLite(el?.dataset?.interestId||'');
    if(action==='child-interest-auto-toggle')return toggleAutoLite(el?.dataset?.intentId||'',el?.dataset?.interestId||'');
    if(action==='child-intent-remove'){try{tr()?.remove?.(el?.dataset?.intentId||'');}catch(e){} setDirty('intentRemove'); markCardStates(); return true;}
    return false;
  }
  function patchRuntime(){
    const r=rt(); if(!r||r.__v2983fix4Slim)return false;
    r.toggleGroup=toggleGroupLite; r.removeGroup=removeGroupLite; r.toggleAuto=toggleAutoLite; r.undecided=undecidedLite; r.start=openDrawer; r.handle=handleLite; r.flushPendingRefresh=flush; r.render=()=>{try{window.LN_CHILD_INTEREST_UI_V296?.renderSummary?.();}catch(e){}}; r.refreshLight=function(reason){if(isDrawerOpen()){markCardStates();setDirty(reason||'refreshLight');return true;} try{window.LN_CHILD_INTEREST_UI_V296?.renderSummary?.();}catch(e){} return true;}; r.__v2983fix4Slim=true; r.version=VERSION; dbg('interestRuntimePatch',{ok:true,version:STAMP}); return true;
  }
  function patchUI(){
    const u=window.LN_CHILD_INTEREST_UI_V296||window.LN_CHILD_INTEREST_UI_V298; if(!u||u.__v2983fix4Slim)return false;
    u.openDrawer=openDrawer; u.renderDrawerBody=renderDrawerBody; u.renderDrawerSelectionOnly=markCardStates; u.__v2983fix4Slim=true; u.version=VERSION; dbg('interestUIPatch',{ok:true,version:STAMP}); return true;
  }
  function patchHitSummary(){
    const h=window.LN_INTEREST_HIT_SUMMARY_V298; if(!h||h.__v2983fix4Policy)return false;
    h.scheduleAggregate=function(rs,delay){const t=perf(); const c=window.__LN_INTEREST_HIT_CACHE_V298=window.__LN_INTEREST_HIT_CACHE_V298||{}; c.__pending=false; dbg('interestAggregatePolicy',{mode:'skip-inline',delay,ms:Math.round(perf()-t)}); return false;};
    h.__v2983fix4Policy=true; return true;
  }
  function patchIntentCapture(){
    if(window.__LN_INTEREST_INTENT_CAPTURE_V2983FIX4)return; window.__LN_INTEREST_INTENT_CAPTURE_V2983FIX4=true;
    document.addEventListener('click',function(e){const btn=e.target.closest?.('[data-child-intent-id]'); if(!btn||!isDrawerOpen())return; e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation)e.stopImmediatePropagation(); const res=toggleIntentLite(btn.dataset.childIntentId); if(res&&res.ok===false){const host=document.querySelector('.child-interest-drawer-v296')||document.body; const tip=document.createElement('div'); tip.className='child-interest-toast-v296'; tip.textContent='建议最多选择 3 个最主要的想法。'; host.prepend(tip); setTimeout(()=>tip.remove(),2200);} },true);
  }
  function patch(){patchRuntime();patchUI();patchHitSummary();patchIntentCapture();document.body?.classList?.add('v2983fix4');}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',patch);else patch(); setTimeout(patch,0); setTimeout(patch,800);
  window.LN_INTEREST_DRAWER_SLIM_V2983FIX4={patch,flush,openDrawer,renderDrawerBody,ready:true,version:VERSION,stamp:STAMP};
})();
// ===== END assets/interest-drawer-slim.v2983fix4.js =====

// ===== BEGIN assets/module-step-priority.v2983fix3.js =====
// V2.9.8.3.fix3 module navigation: scroll first, compute later. Tracks next-step latency in debug.
(function(){
  const perf=()=>window.performance&&performance.now?performance.now():Date.now();
  function stop(e){e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation)e.stopImmediatePropagation();}
  function scrollTo(id){const el=document.getElementById(id); if(!el)return false; el.scrollIntoView({behavior:'smooth',block:'start'}); return true;}
  document.addEventListener('click',function(e){const btn=e.target.closest('[data-scroll-target]'); if(!btn)return; const target=btn.dataset.scrollTarget; if(!target)return; const t=perf(); stop(e); const ok=scrollTo(target); setTimeout(()=>{try{window.LN_DEBUG_V2983?.detail?.('nextStepLatency',{target,ok,ms:Math.round(perf()-t),text:(btn.textContent||'').trim().slice(0,40)});}catch(err){}},80);},true);
  window.LN_MODULE_STEP_PRIORITY_V2983FIX3={ready:true};
})();
// ===== END assets/module-step-priority.v2983fix3.js =====

(function(){
  var st=window.LN_UI_CORE_BUNDLE_STATUS=window.LN_UI_CORE_BUNDLE_STATUS||{version:'291rc0-ui-core1-20260513',loaded:[],mode:'segmented-safe',ok:true};
  st.version='291rc0-ui-core1-20260513';
  st.opt=(window.LN_UI_BUNDLE_OPT!==false);
  st.loaded.push({"name": "ui-late-interaction-core.v291rc0ui1.js", "files": ["assets/abc-light-ui.v2983fix3.js", "assets/interest-interaction-lite.v2983fix3.js", "assets/interest-drawer-slim.v2983fix4.js", "assets/module-step-priority.v2983fix3.js"]});
  st.count=st.loaded.length;
  try{if(window.LN_DEBUG_V2983){window.LN_DEBUG_V2983.setFlags&&window.LN_DEBUG_V2983.setFlags({uiBundle:'v291rc0ui1',uiBundleOpt:window.LN_UI_BUNDLE_OPT!==false,uiBundleVersion:'291rc0-ui-core1-20260513'});window.LN_DEBUG_V2983.detail&&window.LN_DEBUG_V2983.detail('uiCoreBundle',st);}}catch(e){}
})();
/* ===== END assets/ui-late-interaction-core.v291rc0ui1.js ===== */


/* ===== BEGIN assets/app.v2983.js ===== */
// V2.9.8.3.fix12 single overlay: funnel compute, staged UI refresh and deep debug integration.
(function(){
  let rendering=false,pending=false;
  function body(){document.body?.classList?.add('v2983fix12','v2983fix7','v2983fix5','v2983fix4','v2983fix3','v2983','v2982fix4','v2982fix3','v2982fix2','v2982','v2981fix2','v2981fix1');}
  function title(){document.title='辽宁物理类高考志愿初选工具 V2.9.8.3.fix12｜分块等待与自测误报收敛修正版';}
  function unlock(){try{window.LN_SCROLL_LOCK_GUARD_V2982FIX2?.ensure?.();}catch(e){}}
  function sync(){try{window.LN_LEGACY_PREFERENCE_ADAPTER_V2982?.patchGlobals?.();window.LN_LEGACY_PREFERENCE_ADAPTER_V2982?.syncLegacyDom?.();}catch(e){}try{window.LN_INTERACTION_STABILITY_V2982?.patch?.();}catch(e){}}
  function renderLight(reason){
    if(rendering){pending=true;return false;} rendering=true;
    const t=performance.now();
    try{body();unlock();sync();
      try{window.LN_CONTEXT_SUMMARY_UI_V2981FIX1?.render?.();}catch(e){}
      try{window.LN_NOTICE_COMPACT_UI_V2981FIX2?.render?.();}catch(e){}
      try{window.LN_PROFILE_INTEREST_SUMMARY_V2981FIX2?.patchChildInterestSummary?.();}catch(e){}
      unlock();return true;
    }finally{window.LN_DEBUG_V2983?.timing?.('renderLight',performance.now()-t,{reason});setTimeout(()=>{rendering=false;if(pending){pending=false;setTimeout(()=>renderLight('coalesced'),120);}},0);}
  }
  function debounceWrap(name,after,delay){const old=window[name];if(typeof old!=='function'||old.__v2983Wrapped)return;let timer=null;const wrapped=function(){window.LN_DEBUG_V2983?.setQueue?.({lastWrapped:name,running:true,lastAt:new Date().toLocaleTimeString()});const r=old.apply(this,arguments);clearTimeout(timer);timer=setTimeout(()=>{window.LN_DEBUG_V2983?.setQueue?.({lastAfter:name,running:false,afterAt:new Date().toLocaleTimeString()});after(name);},delay||180);return r;};wrapped.__v2983Wrapped=true;wrapped.__original=old;window[name]=wrapped;}
  function patchStudentProfile(){
    const ui=window.LN_STUDENT_PROFILE_UI_V2975; if(!ui||ui.__v2983Patched)return;
    const oldOpen=ui.openDrawer;
    ui.openDrawer=function(){window.__LN_ACTIVE_DRAWER_TYPE='studentProfile'; const r=oldOpen.apply(ui,arguments); setTimeout(()=>{document.querySelectorAll('[id^="studentProfile_"]').forEach(el=>{if(el.dataset.v2983Light)return;el.dataset.v2983Light='1';el.addEventListener('change',()=>{window.LN_DEBUG_V2983?.log?.('student-profile-light-change',{id:el.id,value:el.value});setTimeout(()=>renderLight('student-profile-change'),0);},true);});},0); return r;};
    ui.__v2983Patched=true;
  }
  function patchStrategy(){
    const old=window.applyStrategy; if(typeof old!=='function'||old.__v2983Patched)return;
    const wrapped=function(type){const t=performance.now();
      // Preserve scenario preset behavior, but avoid re-running the whole filter chain here. ABC can be reorganized from current filtered pool.
      try{applyScenarioPresetV2951(type);}catch(e){try{old(type);}catch(err){}}
      const br={type}; const mark=(k,fn)=>{const tt=performance.now();try{return fn&&fn();}catch(e){br.errors=br.errors||[];br.errors.push({step:k,message:String(e&&e.message||e)});}finally{br[k]=Math.round(performance.now()-tt);}};
      mark('renderBaselineSummary',()=>renderBaselineSummaryV2950());
      mark('qualificationSummary',()=>window.LN_QUALIFICATION_GATE_UI_V296?.renderSummary?.());
      mark('profileInterestSummary',()=>window.LN_PROFILE_INTEREST_SUMMARY_V2981FIX2?.patchChildInterestSummary?.());
      mark('renderPlanABC',()=>renderPlanABC());
      mark('updateLive',()=>updateLive());
      mark('renderLight',()=>renderLight('scenario-change'));
      br.total=Math.round(performance.now()-t); try{window.LN_DEBUG_V2983?.detail?.('scenarioBreakdown',br);}catch(e){}
      window.LN_DEBUG_V2983?.timing?.('scenarioChangeLight',performance.now()-t,{type});
      return true;};
    wrapped.__v2983Patched=true;window.applyStrategy=wrapped;
  }
  function patchSchedulerPolicy(){
    try{const P=window.LN_INTERACTION_POLICY_V296?.POLICY;if(P){P['student-profile-change']={level:'render-only',delay:400};P['scenario-change']={level:'render-only',delay:250};P['child-interest-change']={level:'soft',delay:1200};P['chip-change']={level:'soft',delay:900};P['region-chip-change']={level:'soft',delay:1300};P['baseline-change']={level:'soft',delay:900};}}catch(e){}
  }
  function patch(){title();body();patchSchedulerPolicy();sync();unlock();patchStudentProfile();patchStrategy();
    debounceWrap('autoRefreshAsync',()=>renderLight('after-autoRefresh'),220);
    debounceWrap('applyFilters',()=>renderLight('after-applyFilters'),220);
    renderLight('patch');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',patch);else patch();
  setTimeout(patch,0);setTimeout(()=>renderLight('late-once'),1200);
  window.LN_APP_V2983={patch,renderLight,version:'V2.9.8.3.fix12',cacheBust:'2983fix12-20260511',ready:true};
})();
/* ===== END assets/app.v2983.js ===== */


/* ===== BEGIN assets/app-coordinator.v291rc0coord1.js ===== */
// V2.91RC0.coordinator1: app coordination facade and diagnostics bridge.
// Boundary: no formulas, no filter rules, no A/B/C logic, no click semantics, no engine replacement.
(function(){
  const VERSION = 'V2.91RC0.coordinator1';
  const STAMP = '291rc0-coordinator1-20260513';
  if (window.LN_APP_COORDINATOR && window.LN_APP_COORDINATOR.stamp === STAMP) return;

  window.LN_APP_COORDINATOR_OPT = (window.LN_APP_COORDINATOR_OPT !== false);
  window.LN_APP_COORDINATOR_VERSION = STAMP;

  const perf = () => (window.performance && performance.now ? performance.now() : Date.now());
  const state = {
    version: VERSION,
    stamp: STAMP,
    opt: !!window.LN_APP_COORDINATOR_OPT,
    startedAt: new Date().toLocaleString(),
    actions: [],
    applyRequests: [],
    renderRequests: [],
    drawer: {dirty:{}, lastOpen:null, lastClose:null},
    counters: {dispatch:0, applyRequest:0, renderRequest:0, drawerOpen:0, drawerClose:0, drawerDirty:0, debug:0},
    lastAction: null,
    lastApplyRequest: null,
    lastRenderRequest: null,
    lastSnapshotHash: ''
  };

  function trim(arr,n){ while(arr.length>n) arr.shift(); return arr; }
  function hashText(s){
    s = String(s || '');
    let h = 0;
    for (let i=0;i<s.length;i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return String(h);
  }
  function safeCall(fn, fallback){ try { return fn(); } catch(e) { return fallback; } }
  function val(id){
    const el = document.getElementById(id);
    if (!el) return '';
    const tag = (el.tagName || '').toLowerCase();
    const type = (el.type || '').toLowerCase();
    if (type === 'checkbox' || type === 'radio') return el.checked ? '1' : '0';
    if (tag === 'select' && el.multiple) return Array.from(el.selectedOptions || []).map(o=>o.value).sort().join(',');
    return String(el.value || '');
  }
  function active(selector, attr){
    return safeCall(()=>Array.from(document.querySelectorAll(selector))
      .filter(el => el.classList && el.classList.contains('active'))
      .map(el => String((el.dataset && el.dataset[attr]) || el.textContent || '').trim())
      .filter(Boolean)
      .sort(), []);
  }
  function readChildState(){
    return safeCall(()=>{
      const rt = window.LN_CHILD_INTEREST_RUNTIME_V296 || window.LN_CHILD_INTEREST_RUNTIME_V298 || window.LN_CHILD_INTEREST_RUNTIME_V2976;
      const s = rt && rt.readState ? (rt.readState() || {}) : {};
      return {
        mode: String(s.mode || ''),
        selectedGroups: Array.isArray(s.selectedGroups) ? s.selectedGroups.slice() : [],
        selectedMajors: Array.isArray(s.selectedMajors) ? s.selectedMajors.slice() : [],
        selectedKeywords: Array.isArray(s.selectedKeywords) ? s.selectedKeywords.slice().sort() : [],
        disabledAutoMappings: Array.isArray(s.disabledAutoMappings) ? s.disabledAutoMappings.slice().sort() : [],
        manualOnlyInterest: !!s.manualOnlyInterest
      };
    }, {});
  }
  function readProfileState(){
    return safeCall(()=>{
      const rules = window.LN_STUDENT_PROFILE_RULES_V2981 || window.LN_STUDENT_PROFILE_RULES_V298 || window.LN_STUDENT_PROFILE_RULES_V2976;
      return rules && rules.readState ? (rules.readState() || {}) : {};
    }, {});
  }
  function snapshot(scope){
    const base = {
      scope: scope || 'default',
      rank: val('myRank') || String(window.currentRank || ''),
      score: val('myScore'),
      budget: val('budget'),
      regionMode: val('regionMode'),
      cityMode: val('cityMode'),
      cityInput: val('cityInput'),
      feeType: val('feeType'),
      filterLevel: val('filterLevel'),
      filterSubject: val('filterSubject'),
      filterPrimary: val('filterPrimary'),
      filterTax: val('filterTax'),
      filterTier: val('filterTier'),
      filterConfusable: val('filterConfusable'),
      onlyKey: val('onlyKey'),
      onlyConfusable: val('onlyConfusable'),
      onlyChildInterest: val('onlyChildInterestV296'),
      sortBy: val('sortBy'),
      priority: val('priority'),
      currentStrategy: String(window.currentStrategy || window.LN_CURRENT_STRATEGY || ''),
      provinceChips: active('#provinceChips .chip','province'),
      rejectChips: active('#rejectChips .chip','reject'),
      regionGroups: active('#regionGroupChips .chip','group'),
      pools: safeCall(()=>Object.assign({}, window.LN_DEBUG_V2983?.state?.pools || {}), {}),
      queue: safeCall(()=>Object.assign({}, window.LN_DEBUG_V2983?.state?.queue || {}), {}),
      child: readChildState(),
      profile: readProfileState()
    };
    state.lastSnapshotHash = hashText(JSON.stringify(base));
    return base;
  }
  function fingerprint(scope){ return hashText(JSON.stringify(snapshot(scope || 'default'))); }
  function debug(event, data){
    state.counters.debug += 1;
    const payload = Object.assign({version: STAMP, event: String(event || 'debug'), at: new Date().toLocaleTimeString()}, data || {});
    try { window.LN_DEBUG_V2983?.detail?.('appCoordinator', compactState(payload)); } catch(e) {}
    try { window.LN_DEBUG_V2983?.setFlags?.({appCoordinator:'v291rc0coord1', appCoordinatorOpt:!!window.LN_APP_COORDINATOR_OPT, appCoordinatorVersion:STAMP}); } catch(e) {}
  }
  function compactState(extra){
    return {
      version: STAMP,
      opt: !!window.LN_APP_COORDINATOR_OPT,
      counters: Object.assign({}, state.counters),
      lastAction: state.lastAction,
      lastApplyRequest: state.lastApplyRequest,
      lastRenderRequest: state.lastRenderRequest,
      drawer: Object.assign({}, state.drawer, {dirty:Object.assign({}, state.drawer.dirty)}),
      lastSnapshotHash: state.lastSnapshotHash,
      extra: extra || null
    };
  }
  function pushAction(type, payload){
    const item = {t:new Date().toLocaleTimeString(), ms:Math.round(perf()), type:String(type||'action'), payload:payload||null};
    state.lastAction = item;
    state.actions.push(item); trim(state.actions, 80);
    return item;
  }
  function dispatch(action){
    state.counters.dispatch += 1;
    const item = pushAction(action && action.type || 'dispatch', action || null);
    debug('dispatch', {type:item.type});
    return item;
  }
  function requestApply(reason, options){
    state.counters.applyRequest += 1;
    const opts = options || {};
    const item = {t:new Date().toLocaleTimeString(), reason:String(reason||'unknown'), options:Object.assign({}, opts), fingerprint:fingerprint('apply')};
    state.lastApplyRequest = item;
    state.applyRequests.push(item); trim(state.applyRequests, 60);
    debug('requestApply', {reason:item.reason, execute:opts.execute===true, defer:Number(opts.defer||0)});
    if (!window.LN_APP_COORDINATOR_OPT) return {ok:false, disabled:true, item};
    if (opts.execute === true && typeof window.applyFilters === 'function') {
      const run = () => window.applyFilters(item.reason);
      if (Number(opts.defer||0) > 0) {
        setTimeout(run, Number(opts.defer||0));
        return {ok:true, scheduled:true, item};
      }
      return {ok:true, result: run(), item};
    }
    return {ok:true, dryRun:true, item};
  }
  function requestRender(reason, options){
    state.counters.renderRequest += 1;
    const opts = options || {};
    const item = {t:new Date().toLocaleTimeString(), reason:String(reason||'unknown'), options:Object.assign({}, opts), fingerprint:fingerprint('render')};
    state.lastRenderRequest = item;
    state.renderRequests.push(item); trim(state.renderRequests, 60);
    debug('requestRender', {reason:item.reason, execute:opts.execute===true});
    if (!window.LN_APP_COORDINATOR_OPT) return {ok:false, disabled:true, item};
    if (opts.execute === true && typeof window.renderCards === 'function') return {ok:true, result:window.renderCards(), item};
    return {ok:true, dryRun:true, item};
  }
  const drawer = {
    markDirty(type, reason){
      const k = String(type || window.__LN_ACTIVE_DRAWER_TYPE || 'unknown');
      state.counters.drawerDirty += 1;
      state.drawer.dirty[k] = {reason:String(reason||''), at:new Date().toLocaleTimeString(), fingerprint:fingerprint('drawer-dirty')};
      debug('drawerDirty', {type:k, reason:String(reason||'')});
      return state.drawer.dirty[k];
    },
    open(type, meta){
      const k = String(type || window.__LN_ACTIVE_DRAWER_TYPE || 'unknown');
      state.counters.drawerOpen += 1;
      state.drawer.lastOpen = {type:k, meta:meta||null, at:new Date().toLocaleTimeString(), fingerprint:fingerprint('drawer-open')};
      debug('drawerOpen', {type:k});
      return state.drawer.lastOpen;
    },
    close(type, meta){
      const k = String(type || window.__LN_ACTIVE_DRAWER_TYPE || 'unknown');
      state.counters.drawerClose += 1;
      state.drawer.lastClose = {type:k, meta:meta||null, at:new Date().toLocaleTimeString(), dirty:!!state.drawer.dirty[k], fingerprint:fingerprint('drawer-close')};
      debug('drawerClose', {type:k, dirty:!!state.drawer.dirty[k]});
      return state.drawer.lastClose;
    },
    clearDirty(type){
      const k = String(type || window.__LN_ACTIVE_DRAWER_TYPE || 'unknown');
      delete state.drawer.dirty[k];
      debug('drawerClearDirty', {type:k});
      return true;
    }
  };

  window.LN_APP_COORDINATOR = {
    version: VERSION,
    stamp: STAMP,
    state,
    ready: true,
    dispatch,
    requestApply,
    requestRender,
    snapshot,
    fingerprint,
    drawer,
    debug,
    getState(){ return compactState(); }
  };
  debug('ready', {bootLoads:(window.__LN_BOOT_LOADS__||[]).filter(x=>x.ok).length});
})();
/* ===== END assets/app-coordinator.v291rc0coord1.js ===== */


/* ===== BEGIN assets/model-audit.v291rc0modelaudit1.js ===== */
// V2.91RC0.model-audit1: JSON model dependency audit registry.
// Only records model dependencies and debug metadata. It does not change data loading, formulas, filters, sorting, or rendering.
(function(){
  if(window.LN_MODEL_AUDIT_STATUS && window.LN_MODEL_AUDIT_STATUS.version==='291rc0-model-audit1-20260513') return;
  var AUDIT={"version":"291rc0-model-audit1-20260513","base":"V2.91RC0.package-slim1","current":"V2.91RC0.model-audit1","generatedAt":"2026-05-13","policy":{"doesModifyFormula":false,"doesModifyData":false,"doesLazyLoad":false,"doesShard":false,"purpose":"JSON 模型依赖审计；只登记和可视化，不改变加载逻辑。"},"summary":{"jsonTotal":67,"jsonSizeBytes":77356698,"runtimeRequiredCount":37,"runtimeRequiredSizeBytes":55957396,"topHeavy":[{"path":"data/major_name_model/admission_entry_major_index_v2944.json","sizeBytes":10477646,"sizeKB":10232.1,"category":"major-name-model","description":"招生专业名→本科目录映射模型","phase":"model-load","runtimeRequired":"yes","role":"招生名校准、目录映射、详情/导出解释","risk":"medium","note":"重要且较大；未来适合按专业代码/候选池分片。"},{"path":"data/confusable_major_model/confusable_major_detected_pairs_v29462.json","sizeBytes":9830559,"sizeKB":9600.2,"category":"confusable-model","description":"易混专业提醒模型","phase":"model-load","runtimeRequired":"yes","role":"易混提醒、候选/详情复核说明","risk":"medium-high","note":"最大 JSON 大户；未来适合轻索引+详情分片。"},{"path":"data/confusable_major_model/confusable_major_detected_pairs_v2946.json","sizeBytes":7290151,"sizeKB":7119.3,"category":"confusable-report","description":"易混模型质量报告","phase":"debug-or-review","runtimeRequired":"no","role":"质量复核/模型说明","risk":"low","note":"可考虑仅 debug 加载。"},{"path":"data/major_name_model/admission_to_catalog_map_v2944.json","sizeBytes":6527404,"sizeKB":6374.4,"category":"major-name-model","description":"招生专业名→本科目录映射模型","phase":"model-load","runtimeRequired":"yes","role":"招生名校准、目录映射、详情/导出解释","risk":"high","note":"重要且较大；未来适合按专业代码/候选池分片。"},{"path":"data/taxonomy/admission_major_review_v2942.json","sizeBytes":5455588,"sizeKB":5327.7,"category":"taxonomy-source","description":"专业目录源/报告备份","phase":"source-or-legacy","runtimeRequired":"no","role":"源数据/构建留存","risk":"low","note":"当前运行主线主要使用 taxonomy_runtime。"},{"path":"data/major_name_model/admission_major_raw_v2944.json","sizeBytes":4513517,"sizeKB":4407.7,"category":"major-name-model","description":"招生专业名→本科目录映射模型","phase":"model-load","runtimeRequired":"yes","role":"招生名校准、目录映射、详情/导出解释","risk":"high","note":"重要且较大；未来适合按专业代码/候选池分片。"},{"path":"data/taxonomy_runtime/admission_major_review_v2942.json","sizeBytes":3936754,"sizeKB":3844.5,"category":"taxonomy-runtime","description":"本科目录/专业名复核运行时模型","phase":"boot-model","runtimeRequired":"yes","role":"专业归类、招生名复核、兴趣/详情解释","risk":"high","note":"首屏目前会加载；未来需先审计后再决定分级。"},{"path":"data/chunks/rank_50000_80000.json","sizeBytes":3422106,"sizeKB":3341.9,"category":"candidate-chunks","description":"位次候选分块数据","phase":"rank-input","runtimeRequired":"yes","role":"候选池生成","risk":"high","note":"按位次区间加载，不能随意延后或切换口径。"}]},"categories":{"candidate-chunks":{"count":6,"sizeBytes":11934071,"sizeKB":11654.4},"confusable-manifest":{"count":2,"sizeBytes":1397,"sizeKB":1.4},"confusable-model":{"count":9,"sizeBytes":12293303,"sizeKB":12005.2},"confusable-report":{"count":4,"sizeBytes":8996653,"sizeKB":8785.8},"data-manifest":{"count":1,"sizeBytes":1401,"sizeKB":1.4},"major-name-manifest":{"count":1,"sizeBytes":1136,"sizeKB":1.1},"major-name-model":{"count":5,"sizeBytes":23169271,"sizeKB":22626.2},"major-name-report":{"count":2,"sizeBytes":5560,"sizeKB":5.4},"official-catalog-source":{"count":1,"sizeBytes":997265,"sizeKB":973.9},"parent-interest-model":{"count":3,"sizeBytes":5044,"sizeKB":4.9},"rank-map":{"count":1,"sizeBytes":5371,"sizeKB":5.2},"school-geo-model":{"count":3,"sizeBytes":897334,"sizeKB":876.3},"school-geo-report":{"count":2,"sizeBytes":8903,"sizeKB":8.7},"school-static":{"count":2,"sizeBytes":14750,"sizeKB":14.4},"student-profile-model":{"count":1,"sizeBytes":5245,"sizeKB":5.1},"student-profile-report":{"count":2,"sizeBytes":449,"sizeKB":0.4},"taxonomy-report":{"count":3,"sizeBytes":108711,"sizeKB":106.2},"taxonomy-runtime":{"count":7,"sizeBytes":7642263,"sizeKB":7463.1},"taxonomy-source":{"count":12,"sizeBytes":11268571,"sizeKB":11004.5}},"files":[{"path":"data/chunks/rank_00000_10000.json","sizeBytes":1662633,"sizeKB":1623.7,"category":"candidate-chunks","description":"位次候选分块数据","phase":"rank-input","runtimeRequired":"yes","role":"候选池生成","risk":"high","note":"按位次区间加载，不能随意延后或切换口径。"},{"path":"data/chunks/rank_10000_20000.json","sizeBytes":1804101,"sizeKB":1761.8,"category":"candidate-chunks","description":"位次候选分块数据","phase":"rank-input","runtimeRequired":"yes","role":"候选池生成","risk":"high","note":"按位次区间加载，不能随意延后或切换口径。"},{"path":"data/chunks/rank_20000_30000.json","sizeBytes":1317770,"sizeKB":1286.9,"category":"candidate-chunks","description":"位次候选分块数据","phase":"rank-input","runtimeRequired":"yes","role":"候选池生成","risk":"high","note":"按位次区间加载，不能随意延后或切换口径。"},{"path":"data/chunks/rank_30000_50000.json","sizeBytes":2094450,"sizeKB":2045.4,"category":"candidate-chunks","description":"位次候选分块数据","phase":"rank-input","runtimeRequired":"yes","role":"候选池生成","risk":"high","note":"按位次区间加载，不能随意延后或切换口径。"},{"path":"data/chunks/rank_50000_80000.json","sizeBytes":3422106,"sizeKB":3341.9,"category":"candidate-chunks","description":"位次候选分块数据","phase":"rank-input","runtimeRequired":"yes","role":"候选池生成","risk":"high","note":"按位次区间加载，不能随意延后或切换口径。"},{"path":"data/chunks/rank_80000_plus.json","sizeBytes":1633011,"sizeKB":1594.7,"category":"candidate-chunks","description":"位次候选分块数据","phase":"rank-input","runtimeRequired":"yes","role":"候选池生成","risk":"high","note":"按位次区间加载，不能随意延后或切换口径。"},{"path":"data/confusable_major_model/confusable_anchor_rules_v29462.json","sizeBytes":9579,"sizeKB":9.4,"category":"confusable-model","description":"易混专业提醒模型","phase":"model-load","runtimeRequired":"yes","role":"易混提醒、候选/详情复核说明","risk":"medium","note":"最大 JSON 大户；未来适合轻索引+详情分片。"},{"path":"data/confusable_major_model/confusable_major_detected_pairs_v2946.json","sizeBytes":7290151,"sizeKB":7119.3,"category":"confusable-report","description":"易混模型质量报告","phase":"debug-or-review","runtimeRequired":"no","role":"质量复核/模型说明","risk":"low","note":"可考虑仅 debug 加载。"},{"path":"data/confusable_major_model/confusable_major_detected_pairs_v29462.json","sizeBytes":9830559,"sizeKB":9600.2,"category":"confusable-model","description":"易混专业提醒模型","phase":"model-load","runtimeRequired":"yes","role":"易混提醒、候选/详情复核说明","risk":"medium-high","note":"最大 JSON 大户；未来适合轻索引+详情分片。"},{"path":"data/confusable_major_model/confusable_major_groups_v2946.json","sizeBytes":7072,"sizeKB":6.9,"category":"confusable-model","description":"易混专业提醒模型","phase":"model-load","runtimeRequired":"yes","role":"易混提醒、候选/详情复核说明","risk":"medium","note":"最大 JSON 大户；未来适合轻索引+详情分片。"},{"path":"data/confusable_major_model/confusable_major_members_v2946.json","sizeBytes":279265,"sizeKB":272.7,"category":"confusable-model","description":"易混专业提醒模型","phase":"model-load","runtimeRequired":"yes","role":"易混提醒、候选/详情复核说明","risk":"medium","note":"最大 JSON 大户；未来适合轻索引+详情分片。"},{"path":"data/confusable_major_model/confusable_major_quality_report_v2946.json","sizeBytes":1567,"sizeKB":1.5,"category":"confusable-report","description":"易混模型质量报告","phase":"debug-or-review","runtimeRequired":"no","role":"质量复核/模型说明","risk":"low","note":"可考虑仅 debug 加载。"},{"path":"data/confusable_major_model/confusable_major_record_index_v2946.json","sizeBytes":1699091,"sizeKB":1659.3,"category":"confusable-report","description":"易混模型质量报告","phase":"debug-or-review","runtimeRequired":"no","role":"质量复核/模型说明","risk":"low","note":"可考虑仅 debug 加载。"},{"path":"data/confusable_major_model/confusable_major_record_index_v29462.json","sizeBytes":2011244,"sizeKB":1964.1,"category":"confusable-model","description":"易混专业提醒模型","phase":"model-load","runtimeRequired":"yes","role":"易混提醒、候选/详情复核说明","risk":"medium-high","note":"最大 JSON 大户；未来适合轻索引+详情分片。"},{"path":"data/confusable_major_model/confusable_major_school_index_v2946.json","sizeBytes":148796,"sizeKB":145.3,"category":"confusable-model","description":"易混专业提醒模型","phase":"model-load","runtimeRequired":"yes","role":"易混提醒、候选/详情复核说明","risk":"medium","note":"最大 JSON 大户；未来适合轻索引+详情分片。"},{"path":"data/confusable_major_model/confusable_warning_side_quality_report_v29462.json","sizeBytes":5844,"sizeKB":5.7,"category":"confusable-report","description":"易混模型质量报告","phase":"debug-or-review","runtimeRequired":"no","role":"质量复核/模型说明","risk":"low","note":"可考虑仅 debug 加载。"},{"path":"data/confusable_major_model/manual_confirmed_pairs_v2946.json","sizeBytes":344,"sizeKB":0.3,"category":"confusable-model","description":"易混专业提醒模型","phase":"model-load","runtimeRequired":"yes","role":"易混提醒、候选/详情复核说明","risk":"medium","note":"最大 JSON 大户；未来适合轻索引+详情分片。"},{"path":"data/confusable_major_model/manual_excluded_pairs_v2946.json","sizeBytes":56,"sizeKB":0.1,"category":"confusable-model","description":"易混专业提醒模型","phase":"model-load","runtimeRequired":"yes","role":"易混提醒、候选/详情复核说明","risk":"medium","note":"最大 JSON 大户；未来适合轻索引+详情分片。"},{"path":"data/confusable_major_model/parent_expectation_paths_v2946.json","sizeBytes":6388,"sizeKB":6.2,"category":"confusable-model","description":"易混专业提醒模型","phase":"model-load","runtimeRequired":"yes","role":"易混提醒、候选/详情复核说明","risk":"low","note":"最大 JSON 大户；未来适合轻索引+详情分片。"},{"path":"data/confusable_major_model/v29462_manifest.json","sizeBytes":577,"sizeKB":0.6,"category":"confusable-manifest","description":"易混专业模型清单","phase":"model-load","runtimeRequired":"yes","role":"加载易混模型","risk":"medium","note":"模型入口。"},{"path":"data/confusable_major_model/v2946_manifest.json","sizeBytes":820,"sizeKB":0.8,"category":"confusable-manifest","description":"易混专业模型清单","phase":"model-load","runtimeRequired":"yes","role":"加载易混模型","risk":"medium","note":"模型入口。"},{"path":"data/major_name_model/admission_entry_major_index_v2944.json","sizeBytes":10477646,"sizeKB":10232.1,"category":"major-name-model","description":"招生专业名→本科目录映射模型","phase":"model-load","runtimeRequired":"yes","role":"招生名校准、目录映射、详情/导出解释","risk":"medium","note":"重要且较大；未来适合按专业代码/候选池分片。"},{"path":"data/major_name_model/admission_major_raw_v2944.json","sizeBytes":4513517,"sizeKB":4407.7,"category":"major-name-model","description":"招生专业名→本科目录映射模型","phase":"model-load","runtimeRequired":"yes","role":"招生名校准、目录映射、详情/导出解释","risk":"high","note":"重要且较大；未来适合按专业代码/候选池分片。"},{"path":"data/major_name_model/admission_to_catalog_map_v2944.json","sizeBytes":6527404,"sizeKB":6374.4,"category":"major-name-model","description":"招生专业名→本科目录映射模型","phase":"model-load","runtimeRequired":"yes","role":"招生名校准、目录映射、详情/导出解释","risk":"high","note":"重要且较大；未来适合按专业代码/候选池分片。"},{"path":"data/major_name_model/graduate_subject_reference_v2944.json","sizeBytes":979693,"sizeKB":956.7,"category":"major-name-model","description":"招生专业名→本科目录映射模型","phase":"model-load","runtimeRequired":"yes","role":"招生名校准、目录映射、详情/导出解释","risk":"medium","note":"重要且较大；未来适合按专业代码/候选池分片。"},{"path":"data/major_name_model/quality_report_v2944.json","sizeBytes":2068,"sizeKB":2.0,"category":"major-name-report","description":"专业名模型质量/结构报告","phase":"debug-or-review","runtimeRequired":"no","role":"质量复核/模型说明","risk":"low","note":"可考虑仅 debug 加载。"},{"path":"data/major_name_model/schema_v2944.json","sizeBytes":3492,"sizeKB":3.4,"category":"major-name-report","description":"专业名模型质量/结构报告","phase":"debug-or-review","runtimeRequired":"no","role":"质量复核/模型说明","risk":"low","note":"可考虑仅 debug 加载。"},{"path":"data/major_name_model/undergraduate_catalog_major_v2944.json","sizeBytes":671011,"sizeKB":655.3,"category":"major-name-model","description":"招生专业名→本科目录映射模型","phase":"model-load","runtimeRequired":"yes","role":"招生名校准、目录映射、详情/导出解释","risk":"medium","note":"重要且较大；未来适合按专业代码/候选池分片。"},{"path":"data/major_name_model/v2944_manifest.json","sizeBytes":1136,"sizeKB":1.1,"category":"major-name-manifest","description":"专业名模型清单","phase":"model-load","runtimeRequired":"yes","role":"加载专业名模型","risk":"medium","note":"模型入口。"},{"path":"data/manifest.json","sizeBytes":1401,"sizeKB":1.4,"category":"data-manifest","description":"分块数据清单","phase":"boot","runtimeRequired":"yes","role":"加载候选分块入口","risk":"high","note":"很小但关键。"},{"path":"data/official_undergraduate_catalog_2026.json","sizeBytes":997265,"sizeKB":973.9,"category":"official-catalog-source","description":"官方本科目录源文件","phase":"source-or-legacy","runtimeRequired":"no","role":"源数据留存","risk":"low","note":"运行时使用 taxonomy_runtime 同名文件。"},{"path":"data/parent_interest_model/parent_interest_quality_report_v2945.json","sizeBytes":1560,"sizeKB":1.5,"category":"parent-interest-model","description":"家长兴趣/偏好模型","phase":"review","runtimeRequired":"no","role":"偏好解释/历史留存","risk":"low","note":"当前主线不一定加载。"},{"path":"data/parent_interest_model/parent_interest_rules_v2945.json","sizeBytes":2137,"sizeKB":2.1,"category":"parent-interest-model","description":"家长兴趣/偏好模型","phase":"review","runtimeRequired":"no","role":"偏好解释/历史留存","risk":"low","note":"当前主线不一定加载。"},{"path":"data/parent_interest_model/v2945_manifest.json","sizeBytes":1347,"sizeKB":1.3,"category":"parent-interest-model","description":"家长兴趣/偏好模型","phase":"review","runtimeRequired":"no","role":"偏好解释/历史留存","risk":"low","note":"当前主线不一定加载。"},{"path":"data/rank_2025_physics.json","sizeBytes":5371,"sizeKB":5.2,"category":"rank-map","description":"2025 一分一段 / 分数位次换算","phase":"boot","runtimeRequired":"yes","role":"分数到位次换算","risk":"high","note":"很小但公式口径关键。"},{"path":"data/school_geo_model/school_geo_quality_report_v29471.json","sizeBytes":1479,"sizeKB":1.4,"category":"school-geo-report","description":"学校地域质量报告","phase":"debug-or-review","runtimeRequired":"no","role":"质量复核","risk":"low","note":"可留档。"},{"path":"data/school_geo_model/school_geo_reference_v29471.json","sizeBytes":885721,"sizeKB":865.0,"category":"school-geo-model","description":"学校地域模型","phase":"boot-model","runtimeRequired":"yes","role":"辽宁 hard/东北 soft/城市提示","risk":"high","note":"小而关键，不建议动。"},{"path":"data/school_geo_model/school_geo_unmatched_report_v29471.json","sizeBytes":7424,"sizeKB":7.2,"category":"school-geo-report","description":"学校地域质量报告","phase":"debug-or-review","runtimeRequired":"no","role":"质量复核","risk":"low","note":"可留档。"},{"path":"data/school_geo_model/school_name_alias_v29471.json","sizeBytes":9462,"sizeKB":9.2,"category":"school-geo-model","description":"学校地域模型","phase":"boot-model","runtimeRequired":"yes","role":"辽宁 hard/东北 soft/城市提示","risk":"high","note":"小而关键，不建议动。"},{"path":"data/school_geo_model/v29471_manifest.json","sizeBytes":2151,"sizeKB":2.1,"category":"school-geo-model","description":"学校地域模型","phase":"boot-model","runtimeRequired":"yes","role":"辽宁 hard/东北 soft/城市提示","risk":"high","note":"小而关键，不建议动。"},{"path":"data/school_nature.json","sizeBytes":10594,"sizeKB":10.3,"category":"school-static","description":"学校性质/层级参考","phase":"boot-or-enrich","runtimeRequired":"yes","role":"学校标签/性质参考","risk":"medium","note":"小，保留。"},{"path":"data/school_tier_reference.json","sizeBytes":4156,"sizeKB":4.1,"category":"school-static","description":"学校性质/层级参考","phase":"boot-or-enrich","runtimeRequired":"yes","role":"学校标签/性质参考","risk":"medium","note":"小，保留。"},{"path":"data/student_profile_model/student_profile_quality_report_v29471.json","sizeBytes":212,"sizeKB":0.2,"category":"student-profile-report","description":"学生画像质量报告","phase":"debug-or-review","runtimeRequired":"no","role":"质量复核","risk":"low","note":"可留档。"},{"path":"data/student_profile_model/student_profile_rules_v29471.json","sizeBytes":5245,"sizeKB":5.1,"category":"student-profile-model","description":"学生画像规则","phase":"boot-model","runtimeRequired":"yes","role":"画像提示/偏好解释","risk":"medium","note":"小，保留。"},{"path":"data/student_profile_model/v29471_manifest.json","sizeBytes":237,"sizeKB":0.2,"category":"student-profile-report","description":"学生画像质量报告","phase":"debug-or-review","runtimeRequired":"no","role":"质量复核","risk":"low","note":"可留档。"},{"path":"data/taxonomy/admission_major_review_v2942.json","sizeBytes":5455588,"sizeKB":5327.7,"category":"taxonomy-source","description":"专业目录源/报告备份","phase":"source-or-legacy","runtimeRequired":"no","role":"源数据/构建留存","risk":"low","note":"当前运行主线主要使用 taxonomy_runtime。"},{"path":"data/taxonomy/admission_review_report_v2942.json","sizeBytes":122143,"sizeKB":119.3,"category":"taxonomy-source","description":"专业目录源/报告备份","phase":"source-or-legacy","runtimeRequired":"no","role":"源数据/构建留存","risk":"low","note":"当前运行主线主要使用 taxonomy_runtime。"},{"path":"data/taxonomy/catalog_calibration_report_v2941.json","sizeBytes":859,"sizeKB":0.8,"category":"taxonomy-source","description":"专业目录源/报告备份","phase":"source-or-legacy","runtimeRequired":"no","role":"源数据/构建留存","risk":"low","note":"当前运行主线主要使用 taxonomy_runtime。"},{"path":"data/taxonomy/discipline_catalog.json","sizeBytes":11396,"sizeKB":11.1,"category":"taxonomy-source","description":"专业目录源/报告备份","phase":"source-or-legacy","runtimeRequired":"no","role":"源数据/构建留存","risk":"low","note":"当前运行主线主要使用 taxonomy_runtime。"},{"path":"data/taxonomy/graduate_catalog_2022_2025.json","sizeBytes":182695,"sizeKB":178.4,"category":"taxonomy-source","description":"专业目录源/报告备份","phase":"source-or-legacy","runtimeRequired":"no","role":"源数据/构建留存","risk":"low","note":"当前运行主线主要使用 taxonomy_runtime。"},{"path":"data/taxonomy/graduate_reference_report_v2943.json","sizeBytes":19592,"sizeKB":19.1,"category":"taxonomy-source","description":"专业目录源/报告备份","phase":"source-or-legacy","runtimeRequired":"no","role":"源数据/构建留存","risk":"low","note":"当前运行主线主要使用 taxonomy_runtime。"},{"path":"data/taxonomy/major_taxonomy.json","sizeBytes":2962121,"sizeKB":2892.7,"category":"taxonomy-source","description":"专业目录源/报告备份","phase":"source-or-legacy","runtimeRequired":"no","role":"源数据/构建留存","risk":"low","note":"当前运行主线主要使用 taxonomy_runtime。"},{"path":"data/taxonomy/official_undergraduate_catalog_2026.json","sizeBytes":997265,"sizeKB":973.9,"category":"taxonomy-source","description":"专业目录源/报告备份","phase":"source-or-legacy","runtimeRequired":"no","role":"源数据/构建留存","risk":"low","note":"当前运行主线主要使用 taxonomy_runtime。"},{"path":"data/taxonomy/raw_major_alias.json","sizeBytes":1159810,"sizeKB":1132.6,"category":"taxonomy-source","description":"专业目录源/报告备份","phase":"source-or-legacy","runtimeRequired":"no","role":"源数据/构建留存","risk":"low","note":"当前运行主线主要使用 taxonomy_runtime。"},{"path":"data/taxonomy/subject_groups.json","sizeBytes":11852,"sizeKB":11.6,"category":"taxonomy-source","description":"专业目录源/报告备份","phase":"source-or-legacy","runtimeRequired":"no","role":"源数据/构建留存","risk":"low","note":"当前运行主线主要使用 taxonomy_runtime。"},{"path":"data/taxonomy/taxonomy_build_report.json","sizeBytes":48636,"sizeKB":47.5,"category":"taxonomy-source","description":"专业目录源/报告备份","phase":"source-or-legacy","runtimeRequired":"no","role":"源数据/构建留存","risk":"low","note":"当前运行主线主要使用 taxonomy_runtime。"},{"path":"data/taxonomy/unresolved_major_review.json","sizeBytes":296614,"sizeKB":289.7,"category":"taxonomy-source","description":"专业目录源/报告备份","phase":"source-or-legacy","runtimeRequired":"no","role":"源数据/构建留存","risk":"low","note":"当前运行主线主要使用 taxonomy_runtime。"},{"path":"data/taxonomy_runtime/admission_major_review_v2942.json","sizeBytes":3936754,"sizeKB":3844.5,"category":"taxonomy-runtime","description":"本科目录/专业名复核运行时模型","phase":"boot-model","runtimeRequired":"yes","role":"专业归类、招生名复核、兴趣/详情解释","risk":"high","note":"首屏目前会加载；未来需先审计后再决定分级。"},{"path":"data/taxonomy_runtime/admission_review_report_v2942.json","sizeBytes":94466,"sizeKB":92.3,"category":"taxonomy-report","description":"专业目录/招生名质量报告","phase":"debug-or-review","runtimeRequired":"no","role":"复核/质量说明","risk":"low","note":"可考虑只在 debug/详情复核加载。"},{"path":"data/taxonomy_runtime/catalog_calibration_report_v2941.json","sizeBytes":759,"sizeKB":0.7,"category":"taxonomy-report","description":"专业目录/招生名质量报告","phase":"debug-or-review","runtimeRequired":"no","role":"复核/质量说明","risk":"low","note":"可考虑只在 debug/详情复核加载。"},{"path":"data/taxonomy_runtime/discipline_catalog.json","sizeBytes":8146,"sizeKB":8.0,"category":"taxonomy-runtime","description":"专业目录运行时其他模型","phase":"review","runtimeRequired":"no","role":"复核辅助","risk":"medium","note":"需复核依赖后处理。"},{"path":"data/taxonomy_runtime/graduate_catalog_2022_2025.json","sizeBytes":125121,"sizeKB":122.2,"category":"taxonomy-runtime","description":"本科目录/专业名复核运行时模型","phase":"boot-model","runtimeRequired":"yes","role":"专业归类、招生名复核、兴趣/详情解释","risk":"medium","note":"首屏目前会加载；未来需先审计后再决定分级。"},{"path":"data/taxonomy_runtime/graduate_reference_report_v2943.json","sizeBytes":13486,"sizeKB":13.2,"category":"taxonomy-report","description":"专业目录/招生名质量报告","phase":"debug-or-review","runtimeRequired":"no","role":"复核/质量说明","risk":"low","note":"可考虑只在 debug/详情复核加载。"},{"path":"data/taxonomy_runtime/major_taxonomy.json","sizeBytes":2044857,"sizeKB":1996.9,"category":"taxonomy-runtime","description":"本科目录/专业名复核运行时模型","phase":"boot-model","runtimeRequired":"yes","role":"专业归类、招生名复核、兴趣/详情解释","risk":"high","note":"首屏目前会加载；未来需先审计后再决定分级。"},{"path":"data/taxonomy_runtime/official_undergraduate_catalog_2026.json","sizeBytes":626436,"sizeKB":611.8,"category":"taxonomy-runtime","description":"本科目录/专业名复核运行时模型","phase":"boot-model","runtimeRequired":"yes","role":"专业归类、招生名复核、兴趣/详情解释","risk":"medium","note":"首屏目前会加载；未来需先审计后再决定分级。"},{"path":"data/taxonomy_runtime/raw_major_alias.json","sizeBytes":892090,"sizeKB":871.2,"category":"taxonomy-runtime","description":"本科目录/专业名复核运行时模型","phase":"boot-model","runtimeRequired":"yes","role":"专业归类、招生名复核、兴趣/详情解释","risk":"high","note":"首屏目前会加载；未来需先审计后再决定分级。"},{"path":"data/taxonomy_runtime/subject_groups.json","sizeBytes":8859,"sizeKB":8.7,"category":"taxonomy-runtime","description":"本科目录/专业名复核运行时模型","phase":"boot-model","runtimeRequired":"yes","role":"专业归类、招生名复核、兴趣/详情解释","risk":"medium","note":"首屏目前会加载；未来需先审计后再决定分级。"}]};
  function bytes(n){n=Number(n||0);if(n>=1048576)return (n/1048576).toFixed(2)+' MB';if(n>=1024)return (n/1024).toFixed(1)+' KB';return n+' B';}
  function resourceIndex(){
    var out={};
    try{(performance.getEntriesByType('resource')||[]).forEach(function(e){
      var name=String(e.name||''); var i=name.indexOf('/data/'); if(i<0)return;
      var rel=name.slice(i+1).split('?')[0];
      out[rel]={loaded:true,type:e.initiatorType||'',duration:Math.round(e.duration||0),transferSize:e.transferSize||0,encodedBodySize:e.encodedBodySize||0,decodedBodySize:e.decodedBodySize||0};
    });}catch(e){}
    return out;
  }
  function runtimeReport(){
    var idx=resourceIndex();
    var files=AUDIT.files.map(function(f){var r=idx[f.path]||null;return Object.assign({},f,{loaded:!!r,resource:r});});
    var loaded=files.filter(function(f){return f.loaded;});
    var heavy=files.slice().sort(function(a,b){return (b.sizeBytes||0)-(a.sizeBytes||0);}).slice(0,12);
    return {
      version:AUDIT.version,
      enabled:window.LN_MODEL_AUDIT_OPT!==false,
      policy:AUDIT.policy,
      summary:AUDIT.summary,
      categories:AUDIT.categories,
      runtime:{loadedCount:loaded.length,loadedSizeBytes:loaded.reduce(function(s,f){return s+(f.sizeBytes||0);},0),loadedSizeText:bytes(loaded.reduce(function(s,f){return s+(f.sizeBytes||0);},0))},
      topHeavy:heavy,
      loaded:loaded,
      files:files
    };
  }
  var status={version:AUDIT.version,stamp:AUDIT.version,ready:true,audit:AUDIT,report:runtimeReport};
  window.LN_MODEL_AUDIT_STATUS=status;
  try{window.LN_DEBUG_V2983?.setFlags?.({modelAudit:'v291rc0modelaudit1',modelAuditOpt:window.LN_MODEL_AUDIT_OPT!==false,modelAuditVersion:AUDIT.version});}catch(e){}
  try{window.LN_DEBUG_V2983?.detail?.('modelAudit',{version:AUDIT.version,jsonTotal:AUDIT.summary.jsonTotal,runtimeRequiredCount:AUDIT.summary.runtimeRequiredCount,heavyTop:AUDIT.summary.topHeavy.slice(0,6).map(function(x){return {path:x.path,sizeKB:x.sizeKB,category:x.category,phase:x.phase,risk:x.risk};}),policy:AUDIT.policy});}catch(e){}
})();
/* ===== END assets/model-audit.v291rc0modelaudit1.js ===== */


/* ===== BEGIN assets/model-lazy.v291rc0lazy1.js ===== */
// V2.91RC0.model-lazy1: non-first-screen model warmup coordinator.
// Boundary: does not change formulas, candidate pool, sorting, A/B/C, interest real-hit, region hard or model data contents.
(function(){
  const VERSION='291rc0-model-lazy1-20260513';
  const NAME='v291rc0lazy1';
  if(window.LN_MODEL_LAZY_STATUS && window.LN_MODEL_LAZY_STATUS.version===VERSION) return;
  window.LN_MODEL_LAZY_OPT = (window.LN_MODEL_LAZY_OPT !== false);
  window.LN_MODEL_LAZY_VERSION = VERSION;
  const state = window.LN_MODEL_LAZY_STATUS = {
    version: VERSION,
    enabled: !!window.LN_MODEL_LAZY_OPT,
    policy: {doesModifyFormula:false, doesModifyData:false, doesShard:false, doesChangeCandidatePool:false, doesChangeSorting:false, onlyColdModels:true},
    schedule: {scheduled:false, reason:'', at:null, delayMs:1000, idleTimeoutMs:3000, runs:0},
    coldModels: {
      graduateCatalog: {status:'idle', ready:false, ms:null, error:null, role:'研究生目录参考；详情/报告解释增强'},
      majorNameSupplement: {status:'idle', ready:false, ms:null, error:null, role:'graduateSubjectReference + qualityReport；专业详情解释增强'},
      confusableSupplement: {status:'idle', ready:false, ms:null, error:null, role:'parentExpectationPaths + warning quality report；易混解释增强'}
    },
    ui: {detailFallbackText:'专业解释正在补全，不影响当前筛选结果。', exportWaitLimitMs:3000},
    counters:{ensureAll:0, schedule:0, renderCardsHook:0}
  };
  function now(){return Math.round(performance&&performance.now?performance.now():Date.now());}
  function saveDetail(){
    try{
      window.LN_DEBUG_V2983?.detail?.('modelLazy', JSON.parse(JSON.stringify(state)));
      window.LN_DEBUG_V2983?.setFlags?.({modelLazy:NAME, modelLazyOpt:!!window.LN_MODEL_LAZY_OPT, modelLazyVersion:VERSION, coldModelStatus: overallStatus(), coldModelPreloadScheduled: !!state.schedule.scheduled});
    }catch(e){}
  }
  function overallStatus(){
    const vals=Object.values(state.coldModels).map(x=>x.status);
    if(vals.some(x=>x==='failed')) return 'failed';
    if(vals.every(x=>x==='ready')) return 'ready';
    if(vals.some(x=>x==='loading')) return 'loading';
    if(state.schedule.scheduled) return 'scheduled';
    return 'idle';
  }
  function idle(fn, delay, timeout){
    const d=Number.isFinite(delay)?delay:1000;
    const t=Number.isFinite(timeout)?timeout:3000;
    setTimeout(()=>{
      if('requestIdleCallback' in window) requestIdleCallback(fn,{timeout:t});
      else setTimeout(fn, 300);
    }, d);
  }
  async function ensureGraduateCatalog(reason){
    if(!window.LN_MODEL_LAZY_OPT) return null;
    const item=state.coldModels.graduateCatalog;
    if(item.status==='ready') return item.value || null;
    if(item.promise) return item.promise;
    if(!window.DATA_FILES || !window.DATA_FILES.graduateCatalog || typeof window.loadJsonFile!=='function') { item.status='idle'; saveDetail(); return null; }
    item.status='loading'; item.reason=reason||'ensure'; item.startedAt=now(); saveDetail();
    const t0=performance.now();
    item.promise = window.loadJsonFile(window.DATA_FILES.graduateCatalog,'研究生学科代码表（延后）').then(obj=>{
      try{ GRADUATE_CATALOG_2022_2025 = obj; }catch(e){ window.GRADUATE_CATALOG_2022_2025_LAZY = obj; }
      item.status='ready'; item.ready=true; item.ms=Math.round(performance.now()-t0); item.valueSummary={items:(obj&&obj.items||obj&&obj.records||[]).length||undefined}; saveDetail(); return obj;
    }).catch(err=>{ item.status='failed'; item.error=String(err&&err.message||err); item.ms=Math.round(performance.now()-t0); saveDetail(); return null; });
    return item.promise;
  }
  async function ensureMajorSupplement(reason){
    if(!window.LN_MODEL_LAZY_OPT) return null;
    if(typeof window.loadMajorNameColdSupplementV2944==='function') return window.loadMajorNameColdSupplementV2944(reason||'model-lazy');
    return null;
  }
  async function ensureConfusableSupplement(reason){
    if(!window.LN_MODEL_LAZY_OPT) return null;
    if(typeof window.loadConfusableMajorColdSupplementV2946==='function') return window.loadConfusableMajorColdSupplementV2946(reason||'model-lazy');
    return null;
  }
  function ensureAll(reason){
    state.counters.ensureAll++; saveDetail();
    if(!window.LN_MODEL_LAZY_OPT) return Promise.resolve({disabled:true});
    return Promise.allSettled([ensureGraduateCatalog(reason), ensureMajorSupplement(reason), ensureConfusableSupplement(reason)]).then(res=>{saveDetail();return {ok:true, results:res.map(x=>x.status)};});
  }
  function schedule(reason, opts){
    if(!window.LN_MODEL_LAZY_OPT) return {ok:false, disabled:true};
    if(state.schedule.scheduled || overallStatus()==='ready' || overallStatus()==='loading') return {ok:true, already:true, status:overallStatus()};
    const delay = opts && Number.isFinite(opts.delayMs) ? opts.delayMs : 1000;
    state.schedule.scheduled=true; state.schedule.reason=reason||'first-result'; state.schedule.at=now(); state.schedule.delayMs=delay; state.counters.schedule++; saveDetail();
    idle(()=>{state.schedule.runs++; saveDetail(); ensureAll(reason||'scheduled');}, delay, 3000);
    return {ok:true, scheduled:true, delayMs:delay};
  }
  function hookRenderCards(){
    if(window.__LN_MODEL_LAZY_RENDER_HOOKED) return;
    const original = window.renderCards;
    if(typeof original !== 'function') return;
    window.__LN_MODEL_LAZY_RENDER_HOOKED = true;
    window.renderCards = function(){
      const res = original.apply(this, arguments);
      try{
        state.counters.renderCardsHook++;
        const count = Array.isArray(window.filtered) ? window.filtered.length : (window.LN_DEBUG_V2983?.state?.pools?.filtered || 0);
        if(count>0) schedule('renderCards-after-first-result',{delayMs:1000});
      }catch(e){}
      return res;
    };
  }
  function hookWhenReady(){
    let tries=0;
    const timer=setInterval(()=>{tries++; hookRenderCards(); if(window.__LN_MODEL_LAZY_RENDER_HOOKED || tries>80) clearInterval(timer);},100);
  }
  const api = window.LN_MODEL_LAZY = {version:VERSION, stamp:VERSION, state, schedule, ensureAll, ensureGraduateCatalog, ensureMajorSupplement, ensureConfusableSupplement, saveDetail, overallStatus, hookRenderCards};
  hookWhenReady();
  setTimeout(()=>{hookRenderCards(); saveDetail();}, 1500);
  window.addEventListener('load',()=>setTimeout(()=>{hookRenderCards(); saveDetail();}, 600));
  saveDetail();
})();
/* ===== END assets/model-lazy.v291rc0lazy1.js ===== */


/* ===== BEGIN assets/parent-trust.v291rc0parenttrust2.js ===== */
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
/* ===== END assets/parent-trust.v291rc0parenttrust2.js ===== */


/* ===== V2.93RC1 postMain final marker ===== */
(function(){
  try{
    window.LN_V293RC1_MERGE = window.LN_V293RC1_MERGE || {};
    window.LN_V293RC1_MERGE.postMain.ready = true;
    window.LN_DEBUG_V2983 && window.LN_DEBUG_V2983.setFlags && window.LN_DEBUG_V2983.setFlags({v293rc1:true, postMain:'v293rc1'});
  }catch(e){}
})();

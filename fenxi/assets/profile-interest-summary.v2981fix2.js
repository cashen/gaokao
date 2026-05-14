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

// V2.9.8.1 A/B/C decision card UI: group viewpoint + independent evidence cards.
(function(){
  function esc(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));}
  function fmt(v){try{return window.LN_ADMISSION_SAFETY_RULES_V2981?.fmt?.(v)||String(v??'-');}catch(e){return String(v??'-');}}
  function addButton(record,type,idx){ return `<button class="ghost slim" onclick="addPlanOneV29475Fix2('${esc(record?.id||'')}','${type}','${idx===0?'优先看':'补充比较'}')">加入</button>`; }
  function card(record,type,idx){
    if(!record) return `<div class="plan-decision-card-v2981 empty"><b>${type}${idx+1}</b><p>暂无合适候选。可以放宽压缩最大的偏好项，或查看详细候选列表。</p></div>`;
    const d=window.LN_ABC_DECISION_CARD_MODEL_V2981?.build?.(record,type,idx)||{};
    const e=d.evidence||{}, s=d.safety||{}, t=d.tradeoff||{};
    const tagHtml=window.LN_CANDIDATE_TAG_UI_V2981?.render?.(d.tags||[],{id:`abc_${type}_${idx}_${esc(d.id)}`,max:5})||'';
    const role=idx===0?'本组优先看':'补充比较';
    const line2=[esc(record.schoolCity||record.schoolProvince||''),esc(record.schoolNature?.label||record.schoolNatureLabel||'性质待核验'),esc(record.schoolTier?.label||'层级待核验')].filter(Boolean).join('｜');
    return `<article class="plan-decision-card-v2981 ${type.toLowerCase()} safety-${esc(s.tone||'unknown')}">
      <div class="decision-card-head-v2981"><span>${type}${idx+1}｜${role}</span><b>${esc(s.label||record._level||'观察')}</b></div>
      <h4>${esc(record.school)}</h4><div class="decision-major-v2981">${esc(record.major)}</div><small>${line2}</small>
      <div class="decision-evidence-grid-v2981"><div><b>${esc(e.y2025||'2025：待核验')}</b><span>主参考</span></div><div><b>${esc(e.y2024||'2024：暂无可比记录')}</b><span>对照</span></div></div>
      <p class="decision-trend-v2981 tone-${esc(e.tone||'unknown')}">${esc(e.trend||'两年变化待核验')}</p>
      ${tagHtml}
      <div class="decision-tradeoff-v2981"><p><b>换来的价值</b>${esc(t.gain||'符合当前方案取舍。')}</p><p><b>需要接受</b>${esc(t.accept||'仍需复核学校、专业、城市和费用。')}</p><p><b>填报前复核</b>${esc(t.review||'招生章程、专业代码、学费和校区。')}</p></div>
      <div class="decision-actions-v2981">${addButton(record,type,idx)}</div>
    </article>`;
  }
  function panel(active,buckets){
    const rows=(buckets&&buckets[active])||[]; const meta=window.LN_ABC_DECISION_CARD_MODEL_V2981?.groupMeta?.(active)||{};
    const cards=rows.slice(0,4).map((r,i)=>card(r,active,i)).join('') || card(null,active,0);
    return `<div class="abc-active-panel-v296 abc-decision-panel-v2981">
      <div class="abc-active-head-v296 abc-head-v2981"><b>${esc(meta.title||active)}</b><span>整体倾向：${esc(meta.tendency||'观察')}｜${esc(meta.view||'')}</span></div>
      <div class="abc-group-viewpoint-v2981"><div><b>本组判断</b><span>${esc(meta.view||'')}</span></div><div><b>换来的价值</b><span>${esc(meta.gain||'')}</span></div><div><b>需要接受</b><span>${esc(meta.accept||'')}</span></div></div>
      <div class="abc-decision-list-v2981">${cards}</div>
    </div>`;
  }
  function renderPlanABCViewOnlyV2981(){
    const box=document.getElementById('planABC'); if(!box)return;
    const view=window.LN_ABC_VIEW_V296; const active=(view?.get?.()||'A'); const buckets=window.latestPlanBucketsV29475Fix2 || latestPlanBucketsV29475Fix2 || {A:[],B:[],C:[]};
    const tabs=box.querySelector('.abc-segment-v296'); if(tabs && view?.renderTabs) tabs.outerHTML=view.renderTabs(buckets);
    const p=document.getElementById('abcPanelV296'); if(p) p.innerHTML=panel(active,buckets); else renderPlanABCV2981();
    view?.updateTabState?.();
  }
  function renderPlanABCV2981(){
    const box=document.getElementById('planABC'); if(!box)return;
    box.className='abc-board-v296 abc-board-v2981';
    const rank=window.LN_ADMISSION_SAFETY_RULES_V2981?.currentRank?.();
    if(!rank){ box.innerHTML='<div class="abc-empty-v2950">先填写分数或位次，再看 A/B/C 三条路径。</div>'; const d=document.getElementById('conflictDiagnosisV29473'); if(d)d.innerHTML=''; return; }
    try{ const diag=(typeof diagnoseV29473==='function')?diagnoseV29473():null; if(diag && typeof renderDiagnosisV29473==='function') renderDiagnosisV29473(diag); }catch(e){}
    const buckets=(typeof pickSchemeBucketsV29475==='function')?pickSchemeBucketsV29475():{A:[],B:[],C:[]}; window.latestPlanBucketsV29475Fix2=buckets; try{ latestPlanBucketsV29475Fix2=buckets; }catch(e){}
    const view=window.LN_ABC_VIEW_V296; const active=(view?.get?.()||'A');
    const interestSummary=window.LN_CHILD_INTEREST_RUNTIME_V296?.summary?.();
    const profileLine=window.LN_PROFILE_INTEREST_BRIDGE_V2981?.summaryText?.()||'';
    const interestLine=interestSummary?`<p class="abc-interest-note-v296">${esc(interestSummary.title)}｜${esc(interestSummary.text)}</p>`:'';
    const tabs=view?.renderTabs?.(buckets)||'';
    const toolbar=`<div class="abc-toolbar-v296"><div><b>A/B/C 方案视角</b><span>A 守底线，B 看专业，C 争上限；每张小卡补充冲稳保和2025/2024投档证据。</span>${interestLine}<p class="abc-interest-note-v296">${esc(profileLine)}</p></div><button class="execute-secondary" onclick="addAllPlansV29475Fix2()">加入全部 A/B/C 候选</button></div>`;
    box.innerHTML=toolbar+tabs+`<div id="abcPanelV296">${panel(active,buckets)}</div>`;
  }
  window.renderPlanABC=renderPlanABCV2981;
  window.renderPlanABCViewOnly=renderPlanABCViewOnlyV2981;
  if(window.LN_PLAN_ENGINE){ window.LN_PLAN_ENGINE.renderPlanABC=renderPlanABCV2981; window.LN_PLAN_ENGINE.renderPlanABCViewOnly=renderPlanABCViewOnlyV2981; }
  window.LN_ABC_DECISION_UI_V2981={renderPlanABC:renderPlanABCV2981,renderPlanABCViewOnly:renderPlanABCViewOnlyV2981,panel,card,ready:true};
})();

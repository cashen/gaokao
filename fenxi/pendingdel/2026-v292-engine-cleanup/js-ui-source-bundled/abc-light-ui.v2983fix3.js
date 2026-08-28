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

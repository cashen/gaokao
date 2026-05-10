// V2.9.8.1.fix1 final overlay: information hierarchy convergence and safe cleanup.
(function(){
  function fmt(v){try{return window.fmt?window.fmt(v):Number(v||0).toLocaleString('zh-CN');}catch(e){return String(v??'0');}}
  function esc(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));}
  function applyBody(){document.body?.classList?.add('v2981fix1');}
  function renderAllLight(){
    try{window.LN_CONTEXT_SUMMARY_UI_V2981FIX1?.render?.();}catch(e){}
    try{window.LN_NOTICE_COMPACT_UI_V2981FIX1?.render?.();}catch(e){}
    try{window.LN_PROFILE_INTEREST_SUMMARY_V2981FIX1?.patchStudentProfileSummary?.();window.LN_PROFILE_INTEREST_SUMMARY_V2981FIX1?.patchChildInterestSummary?.();}catch(e){}
  }
  function patchDiagnosis(){
    if(window.renderDiagnosisV29473?.__fix1Patched) return;
    const compact=function(diag){
      const box=document.getElementById('conflictDiagnosisV29473'); if(!box) return;
      if(!window.currentRank){box.innerHTML='';return;}
      const main=(diag?.conflicts||[])[0]||{}; const snap=diag?.snapshot||{};
      const top=(diag?.top||[]).slice(0,3).map(x=>`<span>${esc(x.step)}：减少 ${fmt(x.drop)}</span>`).join('')||'<span>暂无明显压缩点</span>';
      const funnel=(diag?.funnel||[]).map(x=>`<div class="funnel-step"><b>${esc(x.step)}</b><span>${fmt(x.count)} 条</span>${x.drop?`<em>−${fmt(x.drop)}</em>`:''}</div>`).join('');
      const relax=(main.relax||[]).slice(0,4).map(x=>`<li>${esc(x)}</li>`).join('');
      const avoid=(main.avoid||[]).slice(0,4).map(x=>`<li>${esc(x)}</li>`).join('');
      box.innerHTML=`<div class="diagnosis-v29473 diagnosis-compact-v2981fix1"><div class="diag-main"><div><span class="diag-kicker">高报师诊断</span><h3>${esc(main.title||'当前候选范围摘要')}</h3><p>${esc(main.diagnosis||'先看 A/B/C 方案盘；诊断数字只解释筛选口径，不作为最终志愿顺序。')}</p></div><div class="diag-band">${esc(snap.scoreBand||'位次段待计算')}</div></div><div class="pressure-tags-v29473"><b>候选压缩：</b>${top}</div><details class="diag-details-v29473"><summary>展开条件强度与候选漏斗</summary><div class="funnel-grid-v29473">${funnel}</div><div class="diag-advice-grid" style="display:grid"><div><h4>建议优先放宽</h4><ol>${relax}</ol></div><div><h4>不建议先放宽</h4><ol>${avoid}</ol></div></div></details></div>`;
    };
    compact.__fix1Patched=true;
    window.renderDiagnosisV29473=compact;
  }
  function patchCardViewDefault(){
    try{
      const key='ln_card_view_mode_v29461';
      if(!localStorage.getItem(key)) localStorage.setItem(key,'compact');
      window.applyCardViewModeClassV29461?.();
    }catch(e){}
  }
  function wrap(name,after){
    const fn=window[name]; if(typeof fn!=='function'||fn.__fix1Wrapped) return;
    const wrapped=function(){ const res=fn.apply(this,arguments); setTimeout(after,0); return res; };
    wrapped.__fix1Wrapped=true; wrapped.__original=fn; window[name]=wrapped;
  }
  function patch(){
    applyBody(); patchDiagnosis(); patchCardViewDefault();
    try{window.LN_PROFILE_INTEREST_SUMMARY_V2981FIX1?.patchStudentProfileSummary?.();window.LN_PROFILE_INTEREST_SUMMARY_V2981FIX1?.patchChildInterestSummary?.();}catch(e){}
    wrap('renderCards',renderAllLight); wrap('renderPlanABC',renderAllLight); wrap('updateCounts',renderAllLight); wrap('renderStrategyCardsV2951',renderAllLight);
    renderAllLight();
  }
  function observe(){
    if(observe.done)return; observe.done=true;
    const target=document.getElementById('resultBox')||document.body;
    if(!target||!window.MutationObserver)return;
    let timer=null;
    new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(renderAllLight,80);}).observe(target,{subtree:true,childList:true,characterData:true});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>{patch();observe();});
  else {patch();observe();}
  setTimeout(patch,0); setTimeout(patch,500); setTimeout(renderAllLight,1500);
  window.LN_APP_V2981FIX1={patch,renderAllLight,ready:true};
})();

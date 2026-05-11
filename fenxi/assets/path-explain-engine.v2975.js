// V2.9.7.5 unified path explain engine: merge review rules into card/detail/export messages.
(function(){
  function esc(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));}
  function uniq(arr){return [...new Set((arr||[]).filter(Boolean))];}
  function computeRaw(r,ctx){
    const mis=window.LN_MAJOR_MISREAD_RULES_V2975?.match?.(r)||[];
    const reviews=window.LN_PATH_REVIEW_RULES_V2975?.match?.(r)||[];
    const band=window.LN_SCORE_RANK_BAND_RULES_V2975?.current?.()||null;
    const intentMessages=window.LN_CHILD_INTENT_TRANSLATOR_V2975?.candidateIntentMessages?.(r)||[];
    const conflicts=window.LN_INTENT_CONFLICT_RULES_V2975?.detect?.()||[];
    const profile=window.LN_STUDENT_PROFILE_RULES_V2975?.deriveProfile?.()||{tags:[],reviewTags:[]};
    const scenario=window.LN_PATH_SCENARIO_RULES_V2975?.summary?.()||{hints:[]};
    const ordered=[...mis,...reviews].sort((a,b)=>(b.priority||0)-(a.priority||0));
    const usableBand=band && band.id && band.id!=='unknown' ? band : null;
    const tags=uniq([...ordered.flatMap(x=>x.tags||[]), ...(usableBand?.tags||[])]).slice(0,3);
    const first=ordered[0]||null;
    const cardMessage=(intentMessages[0] || first?.message || band?.message || '').trim();
    const details=uniq([...(first?.detailMessages||[]), ...ordered.slice(1,3).map(x=>x.message), ...intentMessages, usableBand?.message]).slice(0,3);
    return {mis,reviews,band:usableBand,intentMessages,conflicts,profile,scenario,tags,cardMessage,detailMessages:details,first};
  }
  function explainRaw(r,ctx){
    if(!r) return {tags:[],cardMessage:'',detailMessages:[],intentMessage:'',bandMessage:'',conflictMessages:[],scenarioHints:[],reviewLevel:'normal',hardExclude:false,sourceRuleIds:[]};
    const raw=computeRaw(r,ctx||{});
    const conflictMessages=(raw.conflicts||[]).map(x=>x.message).slice(0,1);
    const scenarioHints=(raw.scenario?.hints||[]).map(x=>x.title).slice(0,3);
    const sourceRuleIds=uniq([...(raw.mis||[]).map(x=>x.id),...(raw.reviews||[]).map(x=>x.id),raw.band?.id]).filter(Boolean);
    return {
      tags:raw.tags,
      cardMessage:raw.cardMessage||'',
      detailMessages:raw.detailMessages||[],
      intentMessage:(raw.intentMessages||[])[0]||'',
      bandMessage:raw.band?.message||'',
      conflictMessages,
      scenarioHints,
      reviewLevel:raw.tags.length||raw.cardMessage?'review':'normal',
      hardExclude:false,
      sourceRuleIds
    };
  }
  function explain(r,ctx){
    try{
      const cache=window.LN_CANDIDATE_CACHE_V296;
      if(cache?.get) return cache.get(r,'pathExplainV2975',()=>explainRaw(r,ctx));
      if(r){ if(!r._pathExplainV2975) r._pathExplainV2975=explainRaw(r,ctx); return r._pathExplainV2975; }
    }catch(e){return explainRaw(r,ctx);}
    return explainRaw(r,ctx);
  }
  function badgesHtml(r){const ex=explain(r); if(!ex.tags.length)return ''; return `<div class="path-tags-v2975">${ex.tags.slice(0,3).map(t=>`<span>${esc(t)}</span>`).join('')}</div>`;}
  function cardHtml(r){const ex=explain(r); if(!ex.cardMessage&&!ex.tags.length)return ''; return `<div class="path-reminder-v2975">${badgesHtml(r)}${ex.cardMessage?`<p>${esc(ex.cardMessage)}</p>`:''}</div>`;}
  function detailHtml(r){const ex=explain(r); if(!ex.detailMessages.length&&!ex.conflictMessages.length)return ''; const lines=uniq([...(ex.detailMessages||[]),...(ex.conflictMessages||[])]).slice(0,3).map(x=>`<li>${esc(x)}</li>`).join(''); return `<details class="path-detail-v2975"><summary><span>路径复核</span><b>${esc((ex.tags||[]).slice(0,3).join('｜')||'专业路径提醒')}</b></summary><div><ul>${lines}</ul><p>该提醒不代表不建议填报，只用于提示家庭在正式填报前进一步核验。</p></div></details>`;}
  function exportTags(r){return (explain(r).tags||[]).join('|');}
  function exportMessage(r){const ex=explain(r); return ex.cardMessage||ex.detailMessages?.[0]||'';}
  function sample(){
    const items=[{major:'药学'},{major:'动物医学'},{major:'汉语言文学'},{major:'法学'},{major:'测控技术与仪器'},{major:'口腔医学技术'}];
    return items.map(x=>({major:x.major, explain:explainRaw(x)}));
  }
  window.LN_PATH_EXPLAIN_ENGINE_V2975={explain,explainRaw,cardHtml,detailHtml,badgesHtml,exportTags,exportMessage,sample,ready:true};
})();

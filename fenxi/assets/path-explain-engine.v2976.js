// V2.9.7.6 unified path explain engine: interest match + path review + name misread.
(function(){
  function esc(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));}
  function uniq(arr){return [...new Set((arr||[]).filter(Boolean))];}
  function computeRaw(r,ctx){
    const im=window.LN_CHILD_INTEREST_RUNTIME_V2976?.matchRecord?.(r)||null;
    const mis=window.LN_MAJOR_MISREAD_RULES_V2976?.match?.(r)||[];
    const reviews=window.LN_PATH_REVIEW_RULES_V2976?.match?.(r)||[];
    const band=window.LN_SCORE_RANK_BAND_RULES_V2976?.current?.()||null;
    const conflicts=window.LN_INTENT_CONFLICT_RULES_V2976?.detect?.()||[];
    const scenario=window.LN_PATH_SCENARIO_RULES_V2976?.summary?.()||{hints:[]};
    const ordered=[...mis,...reviews].sort((a,b)=>(b.priority||0)-(a.priority||0));
    const usableBand=band&&band.id&&band.id!=='unknown'?band:null;
    const interestTag=im?.active&&im.level&&im.level!=='none'&&im.level!=='no'?`孩子关注：${im.intentShort||im.group?.short||'兴趣'}｜${im.label}`:'';
    const tags=uniq([interestTag,...ordered.flatMap(x=>x.tags||[]),...(usableBand?.tags||[])]).slice(0,3);
    const first=ordered[0]||null;
    let cardMessage='';
    if(im?.active&&im.level&&im.level!=='none'&&im.level!=='no') cardMessage=`${interestTag}。该方向会在 B「看专业」中软加权，仍需结合家庭底线复核。`;
    else if(im?.active&&im.level==='none') cardMessage='综合备选：未直接命中孩子关注点，但符合位次和家庭底线。';
    else cardMessage=(first?.message||usableBand?.message||'').trim();
    const details=uniq([im?.reason, ...(first?.detailMessages||[]), ...ordered.slice(1,3).map(x=>x.message), usableBand?.message]).slice(0,3);
    return {im,mis,reviews,band:usableBand,conflicts,scenario,tags,cardMessage,detailMessages:details,first};
  }
  function explainRaw(r,ctx){if(!r)return {tags:[],cardMessage:'',detailMessages:[],intentMessage:'',bandMessage:'',conflictMessages:[],scenarioHints:[],reviewLevel:'normal',hardExclude:false,sourceRuleIds:[]}; const raw=computeRaw(r,ctx||{}); const conflictMessages=(raw.conflicts||[]).map(x=>x.message).slice(0,1); const scenarioHints=(raw.scenario?.hints||[]).map(x=>x.title).slice(0,3); const sourceRuleIds=uniq([...(raw.mis||[]).map(x=>x.id),...(raw.reviews||[]).map(x=>x.id),raw.band?.id,raw.im?.interestId]).filter(Boolean); return {tags:raw.tags,cardMessage:raw.cardMessage||'',detailMessages:raw.detailMessages||[],intentMessage:raw.im?.reason||'',bandMessage:raw.band?.message||'',conflictMessages,scenarioHints,reviewLevel:raw.tags.length||raw.cardMessage?'review':'normal',hardExclude:false,sourceRuleIds,interestMatch:raw.im||null};}
  function explain(r,ctx){try{const cache=window.LN_CANDIDATE_CACHE_V296; if(cache?.get)return cache.get(r,'pathExplainV2976',()=>explainRaw(r,ctx)); if(r){if(!r._pathExplainV2976)r._pathExplainV2976=explainRaw(r,ctx); return r._pathExplainV2976;}}catch(e){return explainRaw(r,ctx);} return explainRaw(r,ctx);}
  function matchHtml(r){const im=explain(r).interestMatch; if(!im?.active)return ''; const level=im.level==='none'?'none':im.level; const text=im.level==='none'?'综合备选：未直接命中孩子关注点，但符合位次和家庭底线。':(im.reason||`孩子关注：${im.intentShort||'兴趣'}｜${im.label}`); return `<div class="interest-match-v2976 ${esc(level)}">${esc(text)}</div>`;}
  function badgesHtml(r){const ex=explain(r); if(!ex.tags.length)return ''; return `<div class="path-tags-v2975">${ex.tags.slice(0,3).map(t=>`<span>${esc(t)}</span>`).join('')}</div>`;}
  function cardHtml(r){const ex=explain(r); if(!ex.cardMessage&&!ex.tags.length&&!ex.interestMatch?.active)return ''; return `<div class="path-reminder-v2975">${matchHtml(r)}${badgesHtml(r)}${ex.cardMessage?`<p>${esc(ex.cardMessage)}</p>`:''}</div>`;}
  function detailHtml(r){const ex=explain(r); if(!ex.detailMessages.length&&!ex.conflictMessages.length)return ''; const lines=uniq([...(ex.detailMessages||[]),...(ex.conflictMessages||[])]).slice(0,3).map(x=>`<li>${esc(x)}</li>`).join(''); return `<details class="path-detail-v2975"><summary><span>路径复核</span><b>${esc((ex.tags||[]).slice(0,3).join('｜')||'专业路径提醒')}</b></summary><div><ul>${lines}</ul><p>该提醒不代表不建议填报，只用于提示家庭在正式填报前进一步核验。</p></div></details>`;}
  function exportTags(r){return (explain(r).tags||[]).join('|');}
  function exportMessage(r){const ex=explain(r); return ex.cardMessage||ex.detailMessages?.[0]||'';}
  function sample(){const items=[{major:'动物医学'},{major:'生物工程'},{major:'环境工程'},{major:'电气工程及其自动化'},{major:'法学'},{major:'测控技术与仪器'}]; return items.map(x=>({major:x.major,explain:explainRaw(x)}));}
  const api={explain,explainRaw,cardHtml,detailHtml,badgesHtml,matchHtml,exportTags,exportMessage,sample,ready:true}; window.LN_PATH_EXPLAIN_ENGINE_V2976=api; window.LN_PATH_EXPLAIN_ENGINE_V2975=api;
})();

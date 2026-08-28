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

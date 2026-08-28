// V2.9.8.1 admission evidence rules: 2025/2024 score-rank evidence and comparability.
(function(){
  function num(v){ if(v===null||v===undefined||v==='') return null; const n=Number(String(v).replace(/[^\d.-]/g,'')); return Number.isFinite(n)?n:null; }
  function fmt(v){ const n=num(v); return n===null?'-':Math.round(n).toLocaleString('zh-CN'); }
  function line(score, rank, year){
    const s=num(score), r=num(rank);
    if(s===null && r===null) return `${year}：暂无可比记录`;
    return `${year}：${s!==null?fmt(s)+'分':'分数待核验'}｜${r!==null?fmt(r)+'位':'位次待核验'}`;
  }
  function rankDiff(record){
    const explicit=num(record?.rankDiff), r25=num(record?.rank2025), r24=num(record?.rank2024);
    if(explicit!==null) return explicit;
    if(r25!==null && r24!==null) return r25-r24;
    return null;
  }
  function possibleNameChanged(record){
    const tags=String(record?.admissionReviewTags||record?.reviewStatus||record?.admissionReviewStatus||'');
    return /待复核|低可信|名称|大类|方向|校企|新增|变更/.test(tags);
  }
  function build(record){
    const y2025=line(record?.score2025, record?.rank2025, '2025');
    const y2024=line(record?.score2024, record?.rank2024, '2024');
    const r25=num(record?.rank2025), r24=num(record?.rank2024);
    const d=rankDiff(record);
    const comparable = r25!==null && r24!==null && !possibleNameChanged(record);
    if(r25===null){ return {y2025,y2024, trend:'2025位次待核验', tone:'unknown', comparable:false, diff:null, tag:'证据待核验', note:'缺少2025位次，先不要按录取安全下结论。'}; }
    if(r24===null){ return {y2025,y2024, trend:'2024暂无可比记录', tone:'unknown', comparable:false, diff:null, tag:'2024缺记录', note:'仅能按2025投档线做初筛，正式填报前建议查招生计划变化。'}; }
    if(!comparable){ return {y2025,y2024, trend:'两年口径需复核', tone:'review', comparable:false, diff:d, tag:'口径需复核', note:'招生名称、专业方向或大类口径可能变化，不强行判断收紧/放宽。'}; }
    const abs=Math.abs(d||0);
    if(abs<300){ return {y2025,y2024, trend:`位次变化 ${fmt(abs)} 位，基本稳定`, tone:'stable', comparable:true, diff:d, tag:'两年稳定', note:''}; }
    if(d<0){ return {y2025,y2024, trend:`较2024收紧 ${fmt(abs)} 位`, tone:'hotter', comparable:true, diff:d, tag:'2025收紧', note:'竞争变强只作观察，不代表下一年必然继续收紧。'}; }
    return {y2025,y2024, trend:`较2024放宽 ${fmt(abs)} 位`, tone:'looser', comparable:true, diff:d, tag:'2025放宽', note:'相对好进需结合计划数、学费和校区变化复核。'};
  }
  window.LN_ADMISSION_EVIDENCE_RULES_V2981={build,line,rankDiff,fmt,ready:true};
})();

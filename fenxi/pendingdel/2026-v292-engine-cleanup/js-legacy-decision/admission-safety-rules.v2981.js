// V2.9.8.1 admission safety rules: rank-based 冲稳保, shared by A/B/C and detail cards.
(function(){
  function num(v){ if(v===null||v===undefined||v==='') return null; const n=Number(String(v).replace(/[^\d.-]/g,'')); return Number.isFinite(n)?n:null; }
  function fmt(v){ const n=num(v); return n===null?'-':Math.round(n).toLocaleString('zh-CN'); }
  function currentRank(){
    const dom=num(document.getElementById('myRank')?.value);
    if(dom!==null) return dom;
    try{ const r=(typeof resolveRank==='function')?resolveRank():null; if(num(r)!==null) return num(r); }catch(e){}
    try{ if(num(window.currentRank)!==null) return num(window.currentRank); }catch(e){}
    return null;
  }
  function model(){ return document.getElementById('model')?.value || 'normal'; }
  function thresholds(){
    const m=model();
    if(m==='safe') return {bao:6500,wen:2200,xiao:-800,chong:-3200};
    if(m==='bold') return {bao:3500,wen:800,xiao:-2300,chong:-6500};
    return {bao:5000,wen:1500,xiao:-1500,chong:-5000};
  }
  function legacyLabel(level){
    if(level==='保底') return '保';
    if(level==='稳妥') return '稳';
    if(level==='匹配') return '稳';
    if(level==='可冲') return '小冲';
    if(level==='超冲') return '冲';
    if(level==='过低') return '保';
    return '观察';
  }
  function classify(record){
    const line=num(record?.rank2025);
    const cr=currentRank();
    const th=thresholds();
    if(line===null || cr===null){
      const label=legacyLabel(record?._level);
      return {label, level:label==='保'?1:label==='稳'?2:label==='小冲'?3:label==='冲'?4:5, deltaRank:null, tone:'unknown', text:record?._level?`按当前层级先标为“${label}”，输入位次后可细化。`:'输入位次后判断录取安全。'};
    }
    const delta=line-cr; // positive means the candidate's 2025 line is behind the student's rank -> safety margin.
    let label='需谨慎', level=5, tone='caution', text='缺口较大或数据波动明显，需要接受较强不确定性。';
    if(delta>=th.bao){ label='保'; level=1; tone='safe'; text=`相对有安全垫，2025线比孩子位次靠后约 ${fmt(delta)} 位。`; }
    else if(delta>=th.wen){ label='稳'; level=2; tone='steady'; text=`位次接近合理区间，约有 ${fmt(delta)} 位余量。`; }
    else if(delta>=th.xiao){ label='小冲'; level=3; tone='near'; text=delta>=0?`贴近2025线，约有 ${fmt(delta)} 位余量。`:`略高于当前位次，约需向上 ${fmt(Math.abs(delta))} 位。`; }
    else if(delta>=th.chong){ label='冲'; level=4; tone='stretch'; text=`2025线高出当前位次约 ${fmt(Math.abs(delta))} 位，需要接受不确定性。`; }
    return {label, level, deltaRank:delta, currentRank:cr, lineRank:line, tone, text, disclaimer:'录取安全仅作初筛参考，最终以当年招生计划和实际投档为准。'};
  }
  window.LN_ADMISSION_SAFETY_RULES_V2981={classify,currentRank,fmt,ready:true};
})();

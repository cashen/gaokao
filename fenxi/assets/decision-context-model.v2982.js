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

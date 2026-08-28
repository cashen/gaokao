// V2.9.6 state snapshot: reads DOM once per refresh window, so engines don't repeatedly query controls.
(function(){
  let cache=null, cacheAt=0;
  function activeChips(selector, attr){return [...document.querySelectorAll(selector+'.active')].map(x=>x.dataset[attr]||x.textContent.trim()).filter(Boolean);}
  function getGroup(group){const box=document.querySelector(`[data-group="${group}"]`); return box?.querySelector('.chip.active')?.dataset?.value || 'neutral';}
  function selectedRejects(){return [...document.querySelectorAll('#rejectChips .chip.active')].map(x=>x.dataset.reject||x.textContent.trim()).filter(Boolean);}
  function snapshot(force){
    const t=(performance&&performance.now)?performance.now():Date.now();
    if(!force && cache && t-cacheAt<120) return cache;
    const rank=(typeof resolveRank==='function')?resolveRank():null;
    const score=Number(document.getElementById('myScore')?.value||0)||null;
    const provinces=(typeof window.selectedProvinces==='function')?window.selectedProvinces():activeChips('#provinceChips .chip','province');
    const cities=(typeof window.selectedCitiesV29472==='function')?window.selectedCitiesV29472():(document.getElementById('targetCities')?.value||'').split(/[，,\s]+/).filter(Boolean);
    const child=window.LN_CHILD_INTEREST_RUNTIME_V296?.readState?.() || window.LN_CHILD_INTEREST_RUNTIME_V2955?.readState?.() || {mode:'undecided',selectedGroups:[]};
    const priority=document.getElementById('priority')?.value || 'employment';
    const regionMode=document.getElementById('regionMode')?.value || 'none';
    const cityMode=(typeof window.cityModeV29472==='function')?window.cityModeV29472():(document.getElementById('cityMode')?.value||'none');
    const rejectList=selectedRejects();
    const rejectSet=new Set(rejectList);
    const budget=document.getElementById('budget')?.value || 'normal';
    const familyTolerance=document.getElementById('familyTolerance')?.value || 'low';
    const feeType=document.getElementById('filterFeeType')?.value || 'all';
    const qMajor=((document.getElementById('qMajor')?.value||'')+' '+(document.getElementById('filterSubjectGroup')?.value||'')).trim();
    const currentStrategy=window.currentStrategy || (typeof window.currentStrategy!=='undefined'?window.currentStrategy:'employment');
    const scoreBand=(typeof window.scoreBandV29473==='function')?window.scoreBandV29473():'';
    cache={
      rank,score,provinces,cities,child,priority,regionMode,cityMode,rejectList,rejectSet,budget,familyTolerance,feeType,qMajor,currentStrategy,
      budgetWide: budget==='high'||budget==='coop'||familyTolerance==='high',
      coopIntent: budget==='coop'||String(feeType).includes('coop'),
      noHighFee: budget==='normal'||rejectSet.has('高收费')||feeType==='excludeHighPrivate',
      strict: !!document.getElementById('strictProfile')?.checked,
      scoreBand,
      lowScore:/540—500|500—450|450—400|400—350|本科边缘/.test(scoreBand),
      edgeScore:/500—450|450—400|400—350|本科边缘/.test(scoreBand),
      highScore:/650\+|650—620|700/.test(scoreBand),
      outProvince:getGroup('outProvince'),medicine:getGroup('medicine'),teacher:getGroup('teacher'),liberal:getGroup('liberal'),chem:getGroup('chem'),physics:getGroup('physics'),gridPower:getGroup('gridPower'),
      mentorMode:document.getElementById('mentorMode')?.value||'standard',gradPlan:document.getElementById('gradPlan')?.value||'maybe',timePressure:document.getElementById('timePressure')?.value||'normal'
    };
    cache.strongProvince=cache.outProvince==='no'||(regionMode==='hard'&&provinces.length===1&&provinces[0]==='辽宁')||['shenyang','dalian','publicLow','grid'].includes(currentStrategy);
    cache.strongCity=priority==='city'||cityMode!=='none'||cities.length>0||['shenyang','dalian','city'].includes(currentStrategy);
    cache.hotMajor=/计算机|软件|人工智能|数据|信息安全|网络|电气|电子|临床|口腔|医学|师范|法学/.test(qMajor)||['grid','medical','exam'].includes(currentStrategy)||['grid','exam'].includes(priority);
    cache.normalFamily=budget==='normal'||familyTolerance==='low';
    cache.specialStatus=(typeof specialPlanStatusV29474==='function')?specialPlanStatusV29474():'unreviewed';
    cache.qualificationGate=window.LN_QUALIFICATION_GATE_V296?.readState?.() || {};
    cacheAt=t; return cache;
  }
  function reset(){cache=null; cacheAt=0;}
  window.LN_STATE_SNAPSHOT_V296={snapshot, reset, ready:true};
})();

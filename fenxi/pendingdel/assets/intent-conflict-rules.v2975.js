// V2.9.7.5 child intent conflict rules: soft reminders only.
(function(){
  const rules=[
    {id:'income_vs_low_pressure',ifAll:['income_upside','low_pressure_sensitive'],message:'收入上限和低学习压力通常需要取舍，建议先确认孩子更看重哪一项。'},
    {id:'medical_vs_short_cycle',ifAll:['want_medical','work_first'],message:'医药健康方向内部周期差异很大，如果不接受长周期，建议先分清临床、药学、医学技术和护理。'},
    {id:'city_vs_local',ifAll:['city_development','local_only'],message:'城市资源和离家近可能存在取舍，建议先确认城市优先还是区域底线优先。'},
    {id:'stable_vs_no_exam',ifAll:['want_stable','avoid_exam'],message:'稳定路径往往伴随考试、证书或地区岗位竞争，建议提前接受这个周期。'},
    {id:'teacher_exam_vs_no_competition',ifAll:['teacher_exam','avoid_competition'],message:'教师和考编路径通常需要面对岗位竞争，建议先核验目标地区岗位条件。'}
  ];
  function tagsFromState(){
    const ids=(window.LN_CHILD_INTENT_TRANSLATOR_V2975?.readState?.().selectedIntentIds)||[];
    const tags=[...ids];
    const profile=window.LN_STUDENT_PROFILE_RULES_V2975?.readState?.()||{};
    if(profile.path==='work_first') tags.push('work_first');
    if(profile.load==='sensitive') tags.push('low_pressure_sensitive');
    const out=document.querySelector('[data-group="outProvince"] .chip.active')?.dataset?.value; if(out==='no') tags.push('local_only');
    return tags;
  }
  function detect(extraTags){const set=new Set([...(extraTags||[]),...tagsFromState()]); return rules.filter(r=>(r.ifAll||[]).every(x=>set.has(x))).map(r=>Object.assign({level:'soft_review',hardExclude:false},r)).slice(0,2);}
  window.LN_INTENT_CONFLICT_RULES_V2975={rules,detect,ready:true};
})();

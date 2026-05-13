// V2.9.8.1 profile-interest bridge: profile changes prompt/order only, never filters majors.
(function(){
  function profileRules(){ return window.LN_STUDENT_PROFILE_RULES_V298 || window.LN_STUDENT_PROFILE_RULES_V2976 || window.LN_STUDENT_PROFILE_RULES_V2975; }
  function state(){ return profileRules()?.readState?.() || {}; }
  const orders={
    female:['want_medical','pharmacy','animal_life','teacher_exam','law_expression','stable','computer_ai','electric_energy','electronic_chip','mechanical_instrument','city_development','unclear'],
    male:['computer_ai','electric_energy','electronic_chip','mechanical_instrument','want_medical','pharmacy','animal_life','city_development','stable','teacher_exam','law_expression','unclear'],
    science:['computer_ai','electric_energy','electronic_chip','mechanical_instrument','city_development','animal_life','want_medical','pharmacy','stable','unclear'],
    expression:['law_expression','teacher_exam','stable','city_development','want_medical','pharmacy','animal_life','computer_ai','unclear'],
    practice:['animal_life','mechanical_instrument','electric_energy','pharmacy','want_medical','city_development','computer_ai','stable','unclear'],
    path_clear:['stable','teacher_exam','electric_energy','pharmacy','want_medical','law_expression','computer_ai','city_development','unclear']
  };
  function rankMap(arr){ const m=new Map(); (arr||[]).forEach((id,i)=>{ if(!m.has(id)) m.set(id,i); }); return m; }
  function interestOrder(){
    const s=state();
    let ids=[];
    if(s.learning && orders[s.learning]) ids=ids.concat(orders[s.learning]);
    if(s.gender && orders[s.gender]) ids=ids.concat(orders[s.gender].map((x,i)=>({id:x, i:i+20})).sort((a,b)=>a.i-b.i).map(x=>x.id));
    if(!ids.length) return null;
    return [...new Set(ids)];
  }
  function sortIntents(intents){
    const order=interestOrder();
    if(!order) return (intents||[]).slice();
    const m=rankMap(order);
    return (intents||[]).slice().sort((a,b)=>(m.has(a.id)?m.get(a.id):99)-(m.has(b.id)?m.get(b.id):99));
  }
  function notice(){
    const s=state(); const lines=[];
    if(s.source==='parent_observe') lines.push('当前画像来自家长观察，建议后续让孩子确认一次。');
    if(s.source==='family_discussion') lines.push('当前画像来自家庭讨论，系统按中等偏好处理。');
    if(s.source==='child_self') lines.push('当前画像来自孩子自己表达，兴趣权重可以略高。');
    if(s.load==='sensitive') lines.push('学习强度较敏感：强数学、强代码、医学长周期方向会前置复核提醒。');
    if(s.path==='work_first') lines.push('本科就业优先：遇到读研依赖方向会提醒复核本科出口。');
    if(s.path==='grad_ok') lines.push('能接受读研：深造依赖方向不直接降权，但仍需看本科平台。');
    if(s.understanding==='hot_words') lines.push('只知道热门词：系统会强化易混专业和本科目录代码提醒。');
    return lines.slice(0,3);
  }
  function summaryText(){
    const lines=notice();
    if(!lines.length) return '孩子学习特点主要用于提醒和排序微调，不作为硬排除条件。';
    return lines.join(' ');
  }
  window.LN_PROFILE_INTEREST_BRIDGE_V2981={state,sortIntents,notice,summaryText,ready:true};
})();

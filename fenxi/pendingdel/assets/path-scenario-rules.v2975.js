// V2.9.7.5 path scenario hints: advisory only; never overwrite baseline or auto-select.
(function(){
  const scenarios=[
    {id:'path_clear',title:'路径清楚型',desc:'先看职业入口、学习周期和后续路径。',intentIds:['want_stable','unclear'],scenarioIds:['employment','publicLow','exam']},
    {id:'grad_lift',title:'读研提升型',desc:'适合能接受本科不是终点、愿意通过读研提升平台的家庭。',intentIds:['want_medical','like_animals','tech_engineering'],scenarioIds:['medical','highValue','platformStable']},
    {id:'exam_cert',title:'考证考编型',desc:'适合法学、师范、医学相关、药学等需要资格证或考试路径的方向。',intentIds:['teacher_exam','law_expression','want_stable'],scenarioIds:['exam','employment']},
    {id:'engineering_value',title:'工科性价比型',desc:'不只盯计算机、电气，也看仪器、自动化、食品、生工、能源等替代路径。',intentIds:['tech_engineering','like_animals'],scenarioIds:['highValue','grid','employment']},
    {id:'city_resource',title:'城市发展型',desc:'优先看城市资源、实习机会和就业平台，同时复核层级和成本代价。',intentIds:['city_development','law_expression'],scenarioIds:['platformSprint','budgetFlexible','broad']}
  ];
  function currentHints(){const selected=(window.LN_CHILD_INTENT_TRANSLATOR_V2975?.readState?.().selectedIntentIds)||[]; const set=new Set(selected); return scenarios.filter(s=>(s.intentIds||[]).some(id=>set.has(id))).slice(0,3);}
  function summary(){const h=currentHints(); if(!h.length) return {hints:[],message:'可按当前场景继续查看，场景只给建议，不覆盖家庭底线。'}; return {hints:h,message:'根据孩子关注点，下面几个场景可以优先看一眼；是否采用仍以家庭底线为准。'};}
  window.LN_PATH_SCENARIO_RULES_V2975={scenarios,currentHints,summary,ready:true};
})();

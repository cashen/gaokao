// V2.9.7.6 path scenario hints: scenario suggestions only, never override family bottom lines.
(function(){
  const scenarios={
    pathClear:{title:'路径清楚型',desc:'先看职业入口、学习周期和后续路径。'},
    grad:{title:'读研提升型',desc:'适合能接受本科不是终点、通过读研提升平台的方向。'},
    exam:{title:'考证考编型',desc:'适合法学、师范、医学相关、药学等需要证书或考试路径的方向。'},
    techValue:{title:'工科性价比型',desc:'不只盯计算机、电气，也看仪器、自动化、食品、生工、能源等替代路径。'},
    city:{title:'城市发展型',desc:'优先看城市资源、实习机会和就业平台，同时说明代价。'},
    familyBottom:{title:'家庭底线优先型',desc:'先守住学费、学校性质、区域和资格入口保护。'}
  };
  function currentHints(){
    const ids=new Set([...(window.LN_CHILD_INTENT_INTEREST_MAP_V2976?.scenarioIds?.()||[])]);
    const eff=(window.LN_CHILD_INTEREST_RUNTIME_V2976?.effectiveGroupIds?.()||[]);
    const tax=window.LN_INTEREST_TAXONOMY_V2976;
    eff.forEach(id=>{const g=tax?.groupById?.(id); (g?.scenarioBoost||[]).forEach(x=>ids.add(x));});
    return [...ids].map(id=>scenarios[id]).filter(Boolean).slice(0,3);
  }
  function summary(){const hints=currentHints(); return {hints,message:hints.length?'根据孩子关注点，这些场景可以优先看一眼；是否采用仍以家庭底线为准。':'暂未形成路径场景提示。'};}
  const api={scenarios,currentHints,summary,ready:true}; window.LN_PATH_SCENARIO_RULES_V2976=api; window.LN_PATH_SCENARIO_RULES_V2975=api;
})();

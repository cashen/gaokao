// V2.9.8.1 candidate decision model shared by A/B/C, detail cards and export.
(function(){
  function build(record,type,idx){
    const safety=window.LN_ADMISSION_SAFETY_RULES_V2981?.classify?.(record)||{};
    const evidence=window.LN_ADMISSION_EVIDENCE_RULES_V2981?.build?.(record)||{};
    const tags=window.LN_CANDIDATE_DECISION_TAGS_V2981?.build?.(record,{type})||[];
    const tradeoff=window.LN_CANDIDATE_TRADEOFF_RULES_V2981?.build?.(record,type,tags)||{};
    const im=window.LN_CHILD_INTEREST_RUNTIME_V296?.matchRecord?.(record)||{};
    const profile=(window.LN_STUDENT_PROFILE_RULES_V298 || window.LN_STUDENT_PROFILE_RULES_V2976 || window.LN_STUDENT_PROFILE_RULES_V2975)?.summary?.()||{};
    return {
      id: record?.id || [record?.school,record?.major,idx||0].join('_'), type:type||'', idx:idx||0, record,
      safety, evidence,
      interest:{active:!!im.active, level:im.level||'none', label:im.label||'', source:im.group?.name||'', reason:im.reason||''},
      profile:{summary:profile.text||'', title:profile.title||'', tags:profile.tags||[]},
      tags, tradeoff
    };
  }
  function groupMeta(type){
    const map={
      A:{title:'A：守底线',short:'守底线',tone:'a',tendency:'稳中偏保',view:'先看公办、费用、位次安全和路径清楚度。',gain:'换来家庭可承受、录取安全感和复核压力较小。',accept:'需要接受学校层级、城市资源或热门专业上限可能让出一部分。'},
      B:{title:'B：看专业',short:'看专业',tone:'b',tendency:'稳中带小冲',view:'先看孩子关注方向、专业本体和培养路径是否看得准。',gain:'换来专业匹配、孩子参与感和更清楚的路径讨论。',accept:'需要接受学校层级、地域便利或安全垫可能不如A方案。'},
      C:{title:'C：争上限',short:'争上限',tone:'c',tendency:'小冲为主',view:'先比较学校平台、城市资源和层级上限。',gain:'换来平台或城市上限的可能性。',accept:'需要接受录取不确定性、专业不完全正主或费用校区复核压力。'}
    };
    return map[type]||map.A;
  }
  window.LN_ABC_DECISION_CARD_MODEL_V2981={build,groupMeta,ready:true};
})();

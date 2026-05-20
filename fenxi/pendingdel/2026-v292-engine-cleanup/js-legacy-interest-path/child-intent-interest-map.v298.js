// V2.9.8 child intent to interest mapping. It creates soft auto-mapped interest directions.
(function(){
  const maps={
    want_medical:{interestIds:['medical_health','pharmacy_pharma'],type:'professional',scenarioIds:['pathClear','grad'],message:'已根据孩子关注点自动带入：医药健康、药学与制药。'},
    pharmacy:{interestIds:['pharmacy_pharma','chem_food_env'],type:'professional',scenarioIds:['grad','pathClear'],message:'已根据孩子关注点自动带入：药学与制药、化工材料食品环境。'},
    animal_life:{interestIds:['animal_life_science'],type:'professional',scenarioIds:['pathClear','grad'],message:'已根据孩子关注点自动带入：动物医学与生命科学。'},
    teacher_exam:{interestIds:['teacher_education','humanities_law'],type:'professional_scene',scenarioIds:['exam','pathClear','familyBottom'],message:'已根据孩子关注点自动带入：师范与教育、人文法政。'},
    law_expression:{interestIds:['humanities_law'],type:'professional',scenarioIds:['exam','city'],message:'已根据孩子关注点自动带入：人文法政。'},
    computer_ai:{interestIds:['computer_info','electronic_comm'],type:'professional',scenarioIds:['techValue','city'],message:'已根据孩子关注点自动带入：计算机与信息、电子信息与通信。'},
    electric_energy:{interestIds:['electric_energy','electronic_comm'],type:'professional',scenarioIds:['pathClear','techValue'],message:'已根据孩子关注点自动带入：电气与能源、电子信息与通信。'},
    electronic_chip:{interestIds:['electronic_comm','computer_info'],type:'professional',scenarioIds:['techValue','city'],message:'已根据孩子关注点自动带入：电子信息与通信、计算机与信息。'},
    mechanical_instrument:{interestIds:['mechanical_instrument','electric_energy'],type:'professional',scenarioIds:['techValue','pathClear'],message:'已根据孩子关注点自动带入：机械制造与仪器、电气与能源。'},
    stable:{interestIds:[],type:'path',scenarioIds:['familyBottom','exam','pathClear'],message:'孩子关注稳定，建议优先看路径清楚、成本可承受、考试入口明确的方向。'},
    city_development:{interestIds:[],type:'path',scenarioIds:['city'],message:'孩子关注城市发展，建议说明城市机会与学校层级、专业热度、学费成本之间的取舍。'},
    unclear:{interestIds:[],type:'general',scenarioIds:['pathClear'],message:'孩子暂不确定，建议先综合推荐，并优先显示名称复核和章程复核。'}
  };
  function selectedIntentIds(){return (window.LN_CHILD_INTENT_TRANSLATOR_V2976||window.LN_CHILD_INTENT_TRANSLATOR_V2975)?.readState?.().selectedIntentIds||[];}
  function mappedFromSelected(){
    const tax=window.LN_INTEREST_TAXONOMY_V2976||window.LN_CHILD_INTEREST_RULES_V296;
    const out=[];
    selectedIntentIds().forEach(intentId=>{
      const m=maps[intentId]; if(!m) return;
      (m.interestIds||[]).forEach(interestId=>{const g=tax?.groupById?.(interestId)||(tax?.groups||[]).find(x=>x.id===interestId); if(g) out.push({intentId,interestId,label:g.name,short:g.short||g.name,type:m.type,source:'child_intent',enabled:true});});
    });
    const seen=new Set(); return out.filter(x=>{const k=x.intentId+'|'+x.interestId; if(seen.has(k))return false; seen.add(k); return true;});
  }
  function effectiveInterestIds(manualIds, disabledKeys){
    const disabled=new Set(disabledKeys||[]);
    const auto=mappedFromSelected().filter(x=>!disabled.has(x.intentId+'|'+x.interestId)).map(x=>x.interestId);
    return [...new Set([...(manualIds||[]),...auto])];
  }
  function scenarioIds(){const ids=[]; selectedIntentIds().forEach(id=>ids.push(...(maps[id]?.scenarioIds||[]))); return [...new Set(ids)];}
  function messages(){return selectedIntentIds().map(id=>maps[id]?.message).filter(Boolean);}
  const api={maps,selectedIntentIds,mappedFromSelected,effectiveInterestIds,scenarioIds,messages,ready:true};
  window.LN_CHILD_INTENT_INTEREST_MAP_V2976=api;
  window.LN_CHILD_INTENT_INTEREST_MAP_V298=api;
})();

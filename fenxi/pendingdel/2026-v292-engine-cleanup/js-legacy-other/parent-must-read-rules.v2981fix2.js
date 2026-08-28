// V2.9.8.1.fix2 parent-must-read rules: one universal reminder per detail candidate.
(function(){
  function txt(v){return String(v??'').replace(/\s+/g,' ').trim();}
  function majorText(r){return txt([r?.major,r?.cleanMajor,r?.officialMajorName,r?.undergradMajorName,r?.undergradCategoryName,r?.officialCategoryName].filter(Boolean).join(' '));}
  function interest(r){return window.LN_CHILD_INTEREST_RUNTIME_V296?.matchRecord?.(r)||{};}
  function campus(r){return window.LN_CAMPUS_LOCATION_RULES_V2981FIX2?.detect?.(r)||{hasCampus:false};}
  function evidence(r){return window.LN_ADMISSION_EVIDENCE_RULES_V2981?.build?.(r)||{};}
  function hasConfusable(r){try{return !!(typeof hasConfusableMajorV2946==='function' && hasConfusableMajorV2946(r));}catch(e){return false;}}
  function groupId(im){return im?.interestId||im?.group?.id||'';}
  function groupName(im){return im?.group?.short||im?.group?.name||'孩子关注方向';}
  const nearTemplates={
    animal_life_science:'如果孩子关注的是“动物、宠物、兽医”，要分清动物医学、动物科学、生物类、食品类和生态环境类；它们不是一条培养路径。',
    medical_health:'如果孩子说的是“想学医”，要分清临床、口腔、药学、医学技术、护理康复；培养周期、执业资格和就业出口不同。',
    pharmacy_pharma:'药学制药方向要分清药学、临床药学、制药工程、生物制药和中药类；不是临床医生路径。',
    computer_info:'如果孩子关注的是“计算机/AI”，要分清计算机类、电子信息类、自动化类、管理科学类；名字相近不代表培养方向相同。',
    electric_energy:'如果孩子关注的是“电气/电网”，要分清电气工程、自动化、能源动力、测控、电子信息；并不是名字里有“电”就等于电气正主。',
    electronic_comm:'电子信息、通信、计算机、电气有交叉，但课程和就业口径不同，建议先看专业类和培养方案。',
    humanities_law:'如果孩子关注的是“法学/表达”，要分清法学、知识产权、社会工作、行政管理、新闻传播；考试路径和就业出口不同。',
    teacher_education:'如果目标是教师路径，要确认是否师范类、对应学科、教师资格支持和目标地区岗位要求，不能只看专业名称像教育。',
    mechanical_instrument:'工程制造方向要分清机械、仪器、车辆、材料成型和过程装备；课程结构和就业场景差异较大。',
    city_development:'城市建设方向要分清设计类、施工类、管理类、造价类和规划类；学习内容和工作场景差别明显。',
    finance_manage:'财经管理方向要分清财会、金融、管理和数据管理；学校层级与城市资源影响较大。',
    chem_food_env:'化工、材料、食品、环境、生物方向差异很大，实验实践、读研依赖和行业出口都要单独复核。'
  };
  function animalSpecific(record, im){
    if(groupId(im)!=='animal_life_science') return '';
    const m=majorText(record);
    if(/环境|生态/.test(m)) return '这不是动物医学正主方向，只是生态环境相关专业；如果孩子关注的是动物、宠物、兽医，这张只能作为弱相关复核。';
    if(/动物科学/.test(m)) return '动物科学不等同于动物医学，更偏畜牧养殖和动物生产方向；如果孩子想走兽医/宠物医学，要优先核对动物医学。';
    if(/生物|食品|水产|农学|植物/.test(m)) return '该专业与生命科学或农业食品相关，但不是动物医学正主；如果孩子说的是动物/兽医方向，只能作为相近或弱相关复核。';
    return '';
  }
  function build(record, decision){
    const im=interest(record); const ev=evidence(record); const cp=campus(record);
    if(record?._qualificationGate?.matched || (record?.qualificationGatesV296||[]).length){return {text:'该候选可能属于资格型入口，未确认资格前不宜和普通批候选直接混排。',type:'qualification',priority:100};}
    if(record?.isHighFee || record?.isCoopV29475){return {text:'涉及中外合作或高收费属性，四年总成本、证书说明和转专业政策必须单独核验。',type:'cost',priority:98};}
    if(hasConfusable(record)){return {text:'该专业容易和相近专业混淆，先看本科专业代码、专业类和培养方案，再决定是否保留。',type:'confusable',priority:94};}
    if(im?.active && im.level==='review'){
      const spec=animalSpecific(record,im);
      if(spec) return {text:spec,type:'weak_interest_match',priority:90};
      return {text:`这不是“${groupName(im)}”的正主专业，只能作为弱相关候选；填报前必须核对专业代码和培养方案。`,type:'review_interest',priority:88};
    }
    if(im?.active && im.level==='related'){
      const tip=nearTemplates[groupId(im)]||'该专业与孩子关注方向相近，但不是完全等同；建议先看本科专业代码、课程结构和培养方向。';
      return {text:tip,type:'near_interest',priority:82};
    }
    if(im?.active && im.level==='core'){
      return {text:'该专业与孩子关注方向直接相关，优先复核培养方案、学费、校区和未来就业/升学路径。',type:'core_interest',priority:76};
    }
    if(ev?.tag==='证据待核验' || ev?.tag==='2024缺记录' || ev?.tag==='口径需复核'){
      return {text:'当前投档证据不完整或两年口径需复核，不能只凭学校层级或专业名称判断。',type:'evidence',priority:74};
    }
    if(cp?.hasCampus){return {text:cp.warning,type:'campus',priority:70};}
    const prof=(window.LN_STUDENT_PROFILE_RULES_V298||window.LN_STUDENT_PROFILE_RULES_V2981)?.deriveProfile?.()||{};
    if((prof.reviewTags||[]).includes('learning_load')) return {text:'孩子学习特点提示学习强度需复核，建议查看课程结构、实验实践和长期培养要求。',type:'profile_load',priority:62};
    if((prof.reviewTags||[]).includes('misread_review')) return {text:'孩子当前对专业理解还不够细，建议先分清专业名、专业类、培养方向和就业路径。',type:'profile_misread',priority:60};
    if(im?.active) return {text:'该候选未直接命中孩子关注方向，主要作为位次和家庭底线上的综合备选，是否保留建议再和孩子确认。',type:'backup',priority:55};
    return {text:'建议结合招生章程、专业代码、学费、校区和体检限制做最终复核。',type:'general',priority:40};
  }
  window.LN_PARENT_MUST_READ_RULES_V2981FIX2={build,ready:true};
})();

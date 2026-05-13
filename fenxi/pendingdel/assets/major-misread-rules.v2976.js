// V2.9.7.6 major misread rules: name clarification only.
(function(){
  const rules=[
    {id:'pharmacy_not_clinical',keywords:['药学','临床药学','药物制剂'],tags:['名称复核'],priority:95,message:'药学不等同于临床医生方向。',detailMessages:['如果孩子说“想学医”，建议先分清临床医学、药学、医学技术和护理。'],hardExclude:false},
    {id:'medical_tech_not_clinical',keywords:['医学检验技术','医学影像技术','康复治疗学','医学技术'],excludeKeywords:['医学影像学'],tags:['名称复核'],priority:96,message:'医学技术类不等同于临床医学。',detailMessages:['医学技术更偏检验、影像、康复等技术岗位，培养目标需看学校方案。'],hardExclude:false},
    {id:'imaging_tech_not_imaging_medicine',keywords:['医学影像技术'],tags:['名称复核'],priority:97,message:'医学影像技术不等同于医学影像学。',detailMessages:['两者培养目标和执业路径不同，正式填报前建议看招生章程和培养方案。'],hardExclude:false},
    {id:'stomatology_tech_not_stomatology',keywords:['口腔医学技术'],tags:['名称复核'],priority:98,message:'口腔医学技术不等同于口腔医学。',detailMessages:['口腔医学技术和口腔医学培养目标、执业路径不同，需要单独分清。'],hardExclude:false},
    {id:'animal_medicine_not_medical_discipline',keywords:['动物医学','动物药学','动植物检疫'],tags:['名称复核'],priority:88,message:'动物医学属于农学门类下的动物医学类，不是医学门类。',detailMessages:['不能只按“医学”两个字理解，要看兽医、动物健康和实践路径。'],hardExclude:false},
    {id:'biomedical_engineering_not_doctor',keywords:['生物医学工程'],tags:['名称复核'],priority:92,message:'生物医学工程不等同于临床医学。',detailMessages:['该方向通常偏工医交叉、设备、信息或工程技术，需看培养方案。'],hardExclude:false},
    {id:'chinese_not_always_teacher',keywords:['汉语言文学','汉语言'],tags:['师范属性复核'],priority:91,message:'汉语言文学不等于一定是师范方向。',detailMessages:['如果目标是当老师，请核验招生计划是否标注师范类、公费或定向。'],hardExclude:false},
    {id:'law_not_auto_stable',keywords:['法学','知识产权'],tags:['路径复核'],priority:86,message:'法学不等于天然稳定。',detailMessages:['稳定通常来自法考、公考、学校层次、城市资源和个人长期投入。'],hardExclude:false},
    {id:'nursing_not_medical_tech',keywords:['护理学','护理'],tags:['名称复核'],priority:83,message:'护理学不等同于医学技术类。',detailMessages:['护理有明确职业入口，但工作场景、资格路径和强度需要提前理解。'],hardExclude:false},
    {id:'instrument_not_electrical',keywords:['测控技术与仪器','精密仪器','智能感知工程'],tags:['名称复核'],priority:84,message:'测控技术与仪器不等同于电气工程。',detailMessages:['它更偏测量、控制、传感、仪器和工程应用，建议看课程体系。'],hardExclude:false},
    {id:'automation_not_cs',keywords:['自动化'],tags:['名称复核'],priority:72,message:'自动化不等同于计算机。',detailMessages:['自动化更偏控制、系统、设备和工程应用，也可能涉及编程。'],hardExclude:false},
    {id:'food_not_sales',keywords:['食品科学与工程','食品质量与安全'],tags:['名称复核'],priority:70,message:'食品科学与工程不等同于食品销售。',detailMessages:['它通常涉及食品工艺、质量、安全、检测和工程课程。'],hardExclude:false},
    {id:'bioengineering_not_bioscience',keywords:['生物工程'],tags:['名称复核'],priority:71,message:'生物工程不等同于生物科学。',detailMessages:['生物工程更偏工程转化和产业应用，生物科学更偏基础学科。'],hardExclude:false}
  ];
  function textOf(r){return [r?.major,r?.majorText,r?.cleanMajor,r?.mainMajorV29475,r?.undergradMajorName,r?.undergradCategoryName,r?.officialMajorCode].filter(Boolean).join(' ');}
  function match(r){const t=textOf(r); return rules.filter(rule=>(rule.keywords||[]).some(k=>t.includes(k)) && !(rule.excludeKeywords||[]).some(k=>t.includes(k))).sort((a,b)=>(b.priority||0)-(a.priority||0));}
  const api={rules,match,textOf,ready:true}; window.LN_MAJOR_MISREAD_RULES_V2976=api; window.LN_MAJOR_MISREAD_RULES_V2975=api;
})();

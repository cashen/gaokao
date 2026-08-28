// V2.9.6 child interest rules: only defines rules, no DOM/data access.
(function(){
  const groups = [
    {
      id:'computer', name:'计算机与信息', short:'计算机信息', color:'blue',
      desc:'计算机、软件、人工智能、大数据、网络安全等数字技术方向。',
      scenarioBoost:['highValue','employment'], preferenceBoost:['employment'],
      planBoost:{A:0.2,B:1.25,C:0.65},
      cycle:{label:'能力迭代较快', text:'建议复核课程、编程基础、数学基础和持续学习能力。'},
      match:{
        core:['计算机科学与技术','软件工程','网络工程','信息安全','网络空间安全','人工智能','智能科学与技术','数据科学与大数据技术','物联网工程','数字媒体技术'],
        related:['电子信息工程','通信工程','微电子科学与工程','集成电路设计与集成系统','电子科学与技术','自动化','信息管理与信息系统'],
        review:['大数据管理与应用','电子商务','智能制造工程']
      },
      reviewText:'注意区分工学类计算机方向与管理类信息方向。'
    },
    {
      id:'grid_energy', name:'电气与能源', short:'电气能源', color:'orange',
      desc:'电气工程、智能电网、能源动力、新能源、储能和自动化相关方向。',
      scenarioBoost:['grid'], preferenceBoost:['grid'],
      planBoost:{A:0.35,B:1.35,C:0.55},
      cycle:{label:'就业口径需复核', text:'建议区分电气正主、能源相近和泛相关方向，不把自动化、测控直接等同电气。'},
      match:{
        core:['电气工程及其自动化','智能电网信息工程'],
        related:['能源与动力工程','新能源科学与工程','储能科学与工程','自动化','农业电气化'],
        review:['测控技术与仪器','电子信息工程','通信工程','机械电子工程','机器人工程']
      },
      reviewText:'电网能源方向要重点复核本科代码、学校行业背景和招聘口径。'
    },
    {
      id:'manufacture', name:'机械与制造', short:'机械制造', color:'slate',
      desc:'机械、车辆、智能制造、机器人、交通装备等工科基础方向。',
      scenarioBoost:['employment','publicLow'], preferenceBoost:['employment'],
      planBoost:{A:0.45,B:0.95,C:0.35},
      cycle:{label:'工科基础与现场能力', text:'建议复核课程难度、实习环境、产业城市和孩子对工程现场的接受度。'},
      match:{
        core:['机械工程','机械设计制造及其自动化','车辆工程','智能制造工程','机器人工程','机械电子工程'],
        related:['自动化','工业工程','交通运输','交通工程','材料成型及控制工程'],
        review:['测控技术与仪器','过程装备与控制工程']
      },
      reviewText:'机械制造方向要结合城市产业、实习机会和孩子动手能力判断。'
    },
    {
      id:'medical_health', name:'医学与健康', short:'医学健康', color:'green',
      desc:'临床、口腔、药学、护理、医学技术、康复等健康方向。',
      scenarioBoost:['medical'], preferenceBoost:['medical'],
      planBoost:{A:0.25,B:1.35,C:0.65},
      cycle:{label:'长期培养周期', text:'医学方向要复核学制、读研/规培、执业资格和家庭长期投入。'},
      match:{
        core:['临床医学','口腔医学','麻醉学','医学影像学','儿科学','精神医学','眼视光医学'],
        related:['药学','临床药学','中医学','针灸推拿学','预防医学','医学检验技术','医学影像技术'],
        review:['护理学','康复治疗学','生物医学工程','智能医学工程','公共事业管理']
      },
      reviewText:'带“医学”不一定是医生路径，需复核执业资格、学制和培养方案。'
    },
    {
      id:'finance_manage', name:'财经与管理', short:'财经管理', color:'purple',
      desc:'会计、金融、财务管理、工商管理、审计等经管方向。',
      scenarioBoost:['employment','budgetFlexible'], preferenceBoost:['employment','exam'],
      planBoost:{A:0.25,B:0.8,C:0.55},
      cycle:{label:'城市与实习影响较大', text:'建议复核学校平台、城市资源、证书路径和实习机会。'},
      match:{
        core:['会计学','财务管理','审计学','金融学','金融工程','财政学','税收学'],
        related:['工商管理','经济学','国际经济与贸易','人力资源管理','市场营销'],
        review:['电子商务','物流管理','信息管理与信息系统','大数据管理与应用']
      },
      reviewText:'经管类要结合城市、学校平台、证书和实习机会判断，不宜只看专业名。'
    },
    {
      id:'civil_arch', name:'土木与建筑', short:'土木建筑', color:'brick',
      desc:'土木、建筑学、工程管理、城乡规划、风景园林等建设类方向。',
      scenarioBoost:['publicLow'], preferenceBoost:['employment'],
      planBoost:{A:0.25,B:0.55,C:0.25},
      cycle:{label:'行业周期需复核', text:'建议复核行业景气、地域机会、设计/现场工作接受度和培养周期。'},
      match:{
        core:['土木工程','建筑学','城乡规划','工程管理','工程造价','给排水科学与工程'],
        related:['建筑环境与能源应用工程','道路桥梁与渡河工程','风景园林','城市地下空间工程'],
        review:['环境设计','安全工程']
      },
      reviewText:'土木建筑方向建议额外复核行业周期、工作场景和地区机会。'
    },
    {
      id:'teacher_education', name:'师范与教育', short:'师范教育', color:'cyan',
      desc:'师范、教育学、心理学、学前、小学、汉语言等教育稳定路径。',
      scenarioBoost:['exam','employment'], preferenceBoost:['exam','employment'],
      planBoost:{A:0.55,B:0.8,C:0.2},
      cycle:{label:'地域与编制差异大', text:'建议复核是否师范、学科方向、所在城市和当地教师招聘口径。'},
      match:{
        core:['数学与应用数学','物理学','化学','生物科学','汉语言文学','英语','小学教育','学前教育','教育学','思想政治教育'],
        related:['心理学','应用心理学','历史学','地理科学','体育教育'],
        review:['教育技术学','特殊教育']
      },
      reviewText:'师范教育要复核是否师范类、任教学科、培养院系和当地招聘要求。'
    },
    {
      id:'chem_material', name:'化工与材料', short:'化工材料', color:'brown',
      desc:'化工、材料、环境、生物工程、食品等传统工科和深造依赖方向。',
      scenarioBoost:['publicLow','employment'], preferenceBoost:['employment'],
      planBoost:{A:0.3,B:0.7,C:0.15},
      cycle:{label:'读研和产业方向要看清', text:'建议复核是否需要读研、产业城市、实验环境和孩子对化学生物课程的接受度。'},
      match:{
        core:['化学工程与工艺','应用化学','材料科学与工程','高分子材料与工程','无机非金属材料工程','环境工程','生物工程'],
        related:['制药工程','食品科学与工程','食品质量与安全','能源化学工程','资源循环科学与工程'],
        review:['生物技术','生态学','轻化工程']
      },
      reviewText:'化工材料生物环境类差异较大，建议结合读研意愿和产业方向判断。'
    },
    {
      id:'other', name:'其他方向', short:'其他方向', color:'gray',
      desc:'法学、新闻传播、设计、外语、公安、体育等其他方向。',
      scenarioBoost:['exam','budgetFlexible'], preferenceBoost:['exam'],
      planBoost:{A:0.15,B:0.5,C:0.3},
      cycle:{label:'路径差异较大', text:'建议按具体专业分别复核资格、作品、体检、城市和就业路径。'},
      match:{
        core:['法学','知识产权','新闻学','传播学','广告学','网络与新媒体','视觉传达设计','产品设计','英语','日语','公安学','侦查学'],
        related:['社会工作','行政管理','政治学与行政学','数字媒体艺术','体育教育'],
        review:['公共事业管理','旅游管理','酒店管理']
      },
      reviewText:'其他方向差异较大，建议进入具体专业后再做二次复核。'
    }
  ];
  window.LN_CHILD_INTEREST_RULES_V296 = {
    version:'V2.9.6', schemaVersion:1, maxGroups:3, defaultMode:'undecided', reconfirmAfterDays:30,
    uiText:{
      title:'③ 孩子感兴趣的专业方向',
      subtitle:'这里不是让孩子现在就定终身方向，只是把孩子更愿意了解的方向告诉系统。选好了，A/B/C 方案会优先解释相关专业；暂时没想清楚，也可以先听系统综合推荐。'
    },
    groups
  };
})();

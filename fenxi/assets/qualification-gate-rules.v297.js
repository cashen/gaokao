// V2.9.7 qualification gate rules: special admissions entries are hidden until user confirms eligibility.
(function(){
  const gates=[
    {
      id:'eduSpecialPlan', group:'专项 / 农村专项', name:'教育部高校专项计划', category:'hide', defaultStatus:'unreviewed', allowValue:'eligible',
      detectKeywords:['教育部高校专项','高校专项计划','高校专项'],
      excludeKeywords:['辽宁省高校专项','辽宁高校专项','省高校专项'],
      reviewTips:['需复核高校专项资格审核结果','需复核公示名单、院校招生章程和当年计划']
    },
    {
      id:'lnRuralSpecial', group:'专项 / 农村专项', name:'辽宁省高校专项 / 重点高校农村专项', category:'hide', defaultStatus:'unreviewed', allowValue:'eligible',
      detectKeywords:['辽宁省高校专项','辽宁高校专项','重点高校招收农村学生专项','重点高校农村专项','省高校专项计划'],
      reviewTips:['需复核辽宁省高校专项报考条件','需复核资格审核结果和当年计划说明']
    },
    {
      id:'minorityPrep', group:'民族 / 预科', name:'少数民族预科班', category:'hide', defaultStatus:'unreviewed', allowValue:'eligible',
      detectKeywords:['少数民族预科','少数民族预科班'],
      reviewTips:['需复核民族身份','需复核是否要求预科专业志愿','需复核招生章程和当年计划说明']
    },
    {
      id:'ethnicClass', group:'民族 / 预科', name:'民族班', category:'hide', defaultStatus:'unreviewed', allowValue:'eligible',
      detectKeywords:['民族班'], excludeKeywords:['少数民族预科','预科班'],
      reviewTips:['需复核民族身份','需复核民族班专业志愿和当年计划说明']
    },
    {
      id:'borderChildPrep', group:'民族 / 预科', name:'边防军人子女预科班', category:'hide', defaultStatus:'unreviewed', allowValue:'eligible',
      detectKeywords:['边防军人子女预科','边防子女预科','边防军人子女'],
      reviewTips:['需复核审定名单','需复核预科专业志愿和招生章程']
    },
    {
      id:'ruralFreeMedical', group:'医学定向', name:'农村订单定向免费医学生', category:'hide', defaultStatus:'unreviewed', allowValue:'eligible',
      detectKeywords:['农村订单定向免费医学生','免费医学生','订单定向医学生','农村订单定向'],
      reviewTips:['需复核定向协议、服务地和履约要求','不应按普通医学专业直接比较']
    },
    {
      id:'villageDoctor', group:'医学定向', name:'乡村医生委托定向培养', category:'hide', defaultStatus:'unreviewed', allowValue:'eligible',
      detectKeywords:['乡村医生委托定向培养','乡村医生定向','委托定向培养'],
      reviewTips:['需复核委托培养协议、服务期限、就业去向和专业说明']
    },
    {
      id:'highLevelAthlete', group:'特殊招生入口', name:'高水平运动队', category:'hide', defaultStatus:'unreviewed', allowValue:'eligible',
      detectKeywords:['高水平运动队','高水平运动员'],
      reviewTips:['需复核高水平运动队资格、文化成绩要求和填报要求']
    },
    {
      id:'militaryPoliceJustice', group:'提前批 / 特殊提醒', name:'军队 / 公安 / 司法 / 飞行学员 / 定向培养军士', category:'warn', defaultStatus:'warn', allowValue:'ack',
      detectKeywords:['军队院校','公安院校','公安类','司法类','飞行学员','飞行技术','定向培养军士','军士'],
      reviewTips:['通常涉及提前批、政审、体检、面试或体能要求','不要按普通本科批平行志愿直接理解']
    },
    {
      id:'publicFundedTeacher', group:'提前批 / 特殊提醒', name:'公费师范 / 本研衔接师范生公费教育', category:'warn', defaultStatus:'warn', allowValue:'ack',
      detectKeywords:['公费师范','本研衔接师范','师范生公费教育','优师专项'],
      reviewTips:['需复核协议、履约、任教服务地和录取批次']
    },
    {
      id:'comprehensiveEvaluation', group:'提前批 / 特殊提醒', name:'综合评价录取', category:'warn', defaultStatus:'warn', allowValue:'ack',
      detectKeywords:['综合评价录取','综合评价招生','综合评价'],
      reviewTips:['不是普通平行志愿逻辑，需复核校测、资格和章程']
    },
    {
      id:'navigationHardship', group:'提前批 / 特殊提醒', name:'航海类等艰苦专业', category:'warn', defaultStatus:'warn', allowValue:'ack',
      detectKeywords:['航海类','航海技术','轮机工程','船舶电子电气工程'],
      reviewTips:['需复核身体条件、就业环境、培养方向和录取批次']
    },
    {
      id:'marxTheorySpecial', group:'提前批 / 特殊提醒', name:'全国重点马克思主义学院马克思主义理论专业', category:'warn', defaultStatus:'warn', allowValue:'ack',
      detectKeywords:['马克思主义理论'],
      reviewTips:['如属于提前批特殊安排，需按当年招生章程复核']
    }
  ];
  const later=['强基计划','少年班','保送生','港澳高校','艺术类','体育类'];
  window.LN_QUALIFICATION_GATE_RULES_V296={version:'V2.9.7',gates,later,ready:true};
})();

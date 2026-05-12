(function () {
  'use strict';
  var SCENARIOS = [
    { id:'platformSprint', order:10, group:'highScore', title:'高分平台冲刺｜尝试上限', shortName:'平台冲刺', scoreBand:[650,750], riskLevel:'aggressive', desc:'适合高分段想尝试更高平台、强城市或强校大类的家庭。', userPain:'分数较高，想冲更高平台，但担心大类分流和专业确定性。', targetPath:'school', planBias:{A:.6,B:1.1,C:1.5}, protect:['平台上限','专业仍需可接受','大类分流建议重点复核'], warning:'高分冲刺不等同于只看学校名，试验班、大类和转专业规则建议重点复核。', abcGuide:{A:'保留稳妥强校或强专业对照',B:'确认专业路径是否能接受',C:'重点看平台、城市和上限交换'} },
    { id:'platformStable', order:20, group:'highScore', title:'高分平台稳妥｜平台优先', shortName:'平台稳妥', scoreBand:[630,680], riskLevel:'balanced', desc:'平台优先，但不盲目冒险，兼顾学校层级、专业确定性和城市。', userPain:'想要更好平台，但不想因为专业或分流规则失控。', targetPath:'school', planBias:{A:.8,B:1.2,C:1.3}, protect:['学校平台','专业确定性','分流风险复核'], warning:'平台优先要同时看专业落点，建议不要只看最低录取位次。', abcGuide:{A:'平台内稳妥候选',B:'强专业路径候选',C:'更高平台或强城市比较'} },
    { id:'highValue', order:30, group:'highScore', title:'高分性价比｜专业优先', shortName:'高分性价比', scoreBand:[620,660], riskLevel:'balanced', desc:'高分段不盲目追校名，更看专业质量、就业路径和性价比。', userPain:'分数不低，想在学校、专业和成本之间找更优平衡。', targetPath:'employment', planBias:{A:1.1,B:1.4,C:1.0}, protect:['专业路径','成本可控','平台性价比'], warning:'高分性价比不是保守，而是看“分数花在哪里”。', abcGuide:{A:'性价比稳妥候选',B:'专业路径主线候选',C:'城市/平台上限候选'} },
    { id:'employment', order:40, group:'common', title:'普通家庭｜稳就业', shortName:'稳就业', scoreBand:[500,600], riskLevel:'conservative', defaultSelected:true, desc:'普通学费、就业导向、风险适中，适合多数家庭。', userPain:'怕花冤枉钱，怕专业看错，希望就业路径相对清楚。', targetPath:'employment', planBias:{A:1.45,B:1.1,C:.65}, protect:['普通学费','公办优先','就业路径相对清楚'], warning:'稳就业不等同于只看热门专业，仍需复核孩子是否学得动。', abcGuide:{A:'守住普通学费和低风险',B:'看专业是否路径清楚',C:'城市/层级只作为比较项'} },
    { id:'publicLow', order:50, group:'riskControl', title:'省内公办稳妥｜保底线', shortName:'省内公办', scoreBand:[520,580], riskLevel:'conservative', desc:'适合普通家庭先保公办、普通学费和低风险。', userPain:'想保公办和普通学费，但又怕专业太难读或太冷。', targetPath:'publicLow', planBias:{A:1.65,B:.95,C:.55}, protect:['公办本科身份','普通学费','避免专项误入'], warning:'优先看公办本科机会，也要同时看专业可读性。', abcGuide:{A:'强守底线',B:'找可读专业替代',C:'只做谨慎对照'} },
    { id:'privateMajor', order:60, group:'edge', title:'民办可比较｜专业优先', shortName:'民办比较', scoreBand:[400,520], riskLevel:'balanced', desc:'接受民办进入比较，但以专业路径、成本和城市资源为前提。', userPain:'公办选择有限，想知道民办是否能换来更合适专业。', targetPath:'employment', planBias:{A:.75,B:1.45,C:1.2}, protect:['专业路径','四年总成本复核','城市资源可比较'], warning:'民办可以进入比较，但必须算清四年成本、专业质量和未来路径。', abcGuide:{A:'公办机会对照',B:'民办/公办专业路径',C:'城市/民办/中外成本比较'} },
    { id:'edgeBachelor', order:70, group:'edge', title:'本科机会边缘｜谨慎保本科', shortName:'本科边缘', scoreBand:[420,500], riskLevel:'conservative', desc:'本科机会重要，但要同步看公办机会、民办本科和高职/专升本对照。', userPain:'想尽量保本科，但担心为了本科标签牺牲过多。', targetPath:'publicLow', planBias:{A:1.45,B:1.15,C:.75}, protect:['本科机会','成本底线','专业可读性'], warning:'本科身份有价值，但不能为了本科标签忽略成本和专业出口。', abcGuide:{A:'低成本本科机会',B:'可读专业路径',C:'民办/高职/专升本对照'} },
    { id:'budgetFlexible', order:80, group:'budget', title:'预算较宽｜中外/民办可比较', shortName:'预算较宽', scoreBand:[450,580], riskLevel:'balanced', desc:'愿意用更高成本比较学校层级、城市和专业机会。', userPain:'不怕适度花钱，但怕钱没有换来有效提升。', targetPath:'city', planBias:{A:.7,B:1.25,C:1.45}, protect:['提档价值解释','专业仍需匹配','成本复核'], warning:'中外合作和民办不是天然提档，建议重点看钱换来了什么。', abcGuide:{A:'普通批公办对照',B:'专业路径匹配',C:'中外/民办/城市提档价值'} },
    { id:'grid', order:90, group:'career', title:'电网能源｜目标就业', shortName:'电网能源', scoreBand:null, riskLevel:'conservative', desc:'电气、能源、自动化、电网相关方向优先观察。', userPain:'想走电网/能源稳定路径，但担心把泛相关专业误当电气正主。', targetPath:'grid', planBias:{A:1.1,B:1.45,C:.85}, protect:['电气正主优先','能源电力相关路径','就业方向清楚'], warning:'电网方向建议重点复核专业代码、学校行业背景和招聘口径。', abcGuide:{A:'稳妥公办能源相关',B:'电气正主/相近/泛相关分层',C:'学校行业背景或层级比较'} },
    { id:'medical', order:100, group:'career', title:'医学方向｜长期投入', shortName:'医学长期', scoreBand:null, riskLevel:'balanced', desc:'接受学制、规培和较长回报周期，再重点看医学。', userPain:'想学医，但需要分清医生路径、医学技术、护理康复和药学检验。', targetPath:'medical', planBias:{A:.9,B:1.45,C:1.1}, protect:['医学路径分层','长周期承受','执业资格复核'], warning:'带“医学”并不等同于医生路径，建议重点复核执业资格和培养方案。', abcGuide:{A:'稳妥医学相关可读',B:'医生/医学技术/护理康复分层',C:'学校层级或城市资源比较'} },
    { id:'exam', order:110, group:'career', title:'考公体制｜稳定路径', shortName:'考公体制', scoreBand:null, riskLevel:'conservative', desc:'保留编制、国企、考公相关路径，不盲目追热门。', userPain:'想保留考公、编制、国企路径，但不想被泛经管法文误导。', targetPath:'exam', planBias:{A:1.35,B:1.25,C:.75}, protect:['稳定路径','岗位相关性','普通学费'], warning:'体制路径要结合岗位表、地区、学历和竞争比例复核。', abcGuide:{A:'稳妥公办',B:'岗位相关专业路径',C:'城市/平台辅助比较'} },
    { id:'broad', order:120, group:'explore', title:'先不设限｜全量观察', shortName:'全量观察', scoreBand:null, riskLevel:'balanced', desc:'先看位次区间，再逐步收窄条件。', userPain:'暂时不知道该怎么选，先看全量，再逐步确定底线。', targetPath:'broad', planBias:{A:1,B:1,C:1}, protect:['信息完整','不急于排除'], warning:'当前不是推荐路径，而是全量观察。建议下一步先确定家庭底线。', abcGuide:{A:'先按成本缩小',B:'按专业路径缩小',C:'按城市/层级缩小'} }
  ];
  var TARGET_PATHS = [
    { id:'employment', label:'就业优先', desc:'优先看本科就业路径相对清楚、成本可控、风险适中的候选。', planBias:{A:1.15,B:1.25,C:.85}, warning:'就业优先不等于只看热门专业，仍需复核孩子能否学得动。' },
    { id:'publicLow', label:'低分公办本科优先', desc:'优先守住公办本科身份和普通学费，专业允许适度让步。', planBias:{A:1.55,B:.95,C:.65}, warning:'也要同时看专业可读性，不是为了公办标签无限让步。' },
    { id:'grid', label:'电网/能源系统优先', desc:'优先观察电气正主、能源、电力相关路径。', planBias:{A:1.1,B:1.45,C:.85}, warning:'自动化、测控、电子信息不宜直接等同电气正主。' },
    { id:'medical', label:'医学方向优先', desc:'优先区分医生路径、医学技术、护理康复、药学检验和医工交叉。', planBias:{A:.95,B:1.35,C:1.05}, warning:'医学技术并不等同于临床医生路径。' },
    { id:'exam', label:'考公/体制机会', desc:'优先观察法学、汉语言、计算机、财会审计、师范等岗位相关方向。', planBias:{A:1.3,B:1.25,C:.8}, warning:'考公友好要结合岗位表，不是所有经管法文都友好。' },
    { id:'school', label:'学校层级优先', desc:'优先比较学校平台、985/211层级和城市资源。', planBias:{A:.85,B:1.05,C:1.35}, warning:'学校层级优先不能忽略专业落点、大类分流和转专业规则。' },
    { id:'city', label:'城市优先', desc:'优先看大城市、省会、强产业城市带来的资源和实习机会。', planBias:{A:.8,B:1.05,C:1.4}, warning:'城市是加分项，不是万能项。' },
    { id:'postgrad', label:'保研/深造优先', desc:'优先观察平台、学科基础、读研/规培/长期投入更友好的候选。', planBias:{A:.9,B:1.35,C:1.15}, warning:'考研不是万能兜底，本科就业和家庭承受周期也要复核。' },
    { id:'broad', label:'先不限制 / 全量观察', desc:'先看位次区间，再逐步收窄家庭底线、地域和专业方向。', planBias:{A:1,B:1,C:1}, warning:'全量观察不是推荐高收费或民办，下一步仍要确认家庭底线。' }
  ];
  var PROFESSIONAL_PATHS = {
    accounting:{ label:'财会 / 经管路径', core:['会计学','审计学','财务管理'], related:['财政学','税收学','金融学','经济学'], fuzzy:['工商管理类','管理学类','工商管理'], warnings:['工商管理类需核验是否含会计、审计、财管方向。'], review:['培养方案','就业去向','考公岗位相关性','是否大类招生'] },
    electric:{ label:'电气 / 能源路径', core:['电气工程及其自动化','智能电网信息工程','电气工程与智能控制'], related:['自动化','能源与动力工程','新能源科学与工程','储能科学与工程'], fuzzy:['测控技术与仪器','电子信息工程','机械电子工程','新能源材料与器件'], warnings:['自动化、测控、电子信息不宜直接等同电气正主。'], review:['专业代码','学校行业背景','电网招聘口径','就业质量报告'] },
    info:{ label:'电子信息 / 通信路径', core:['电子信息工程','通信工程','电子科学与技术'], related:['微电子科学与工程','光电信息科学与工程','集成电路设计与集成系统'], fuzzy:['自动化','测控技术与仪器'], warnings:['电子信息方向不同学校课程差异较大。'], review:['培养方案','专业方向','就业去向'] },
    computer:{ label:'计算机 / 数字技术路径', core:['计算机科学与技术','软件工程','网络工程','信息安全','网络空间安全'], related:['数据科学与大数据技术','人工智能','物联网工程','智能科学与技术'], fuzzy:['大数据管理与应用','网络与新媒体','信息管理与信息系统','电子商务'], warnings:['大数据管理与应用不等同于计算机类的大数据技术；网络与新媒体不等同网络安全。'], review:['本科专业代码','课程设置','项目实践','就业去向'] },
    medical:{ label:'医学 / 医学技术路径', core:['临床医学','口腔医学','麻醉学','医学影像学','儿科学'], related:['医学检验技术','医学影像技术','药学','护理学','康复治疗学','中药学'], fuzzy:['生物医学工程','基础医学'], warnings:['医学技术并不等同于临床医生路径。'], review:['执业资格','学制/规培','培养方案','是否医生路径'] },
    teacher:{ label:'师范 / 考编路径', core:['汉语言文学','数学与应用数学','英语','物理学','化学','小学教育','学前教育'], related:['思想政治教育','历史学','地理科学','生物科学'], fuzzy:['教育技术学'], warnings:['非师范与师范路径要分清。'], review:['是否师范','教师资格','就业城市','考编岗位'] },
    machine:{ label:'机械 / 自动化 / 交通路径', core:['机械设计制造及其自动化','自动化','车辆工程','交通运输'], related:['测控技术与仪器','机械电子工程','材料成型及控制工程','智能制造工程'], fuzzy:['工业工程','物流工程'], warnings:['工程现场、工艺制造和数学物理承受度需要复核。'], review:['课程难度','工程现场','就业行业','校区'] },
    exam:{ label:'考公 / 体制路径', core:['法学','汉语言文学','计算机科学与技术','会计学','审计学'], related:['财务管理','统计学','思想政治教育','行政管理'], fuzzy:['工商管理类','公共管理类','工商管理'], warnings:['考公友好要结合岗位表，不是所有经管法文都友好。'], review:['岗位表相关性','学历要求','地区竞争','专业代码'] }
  };
  var PLAN_RULES = {
    A:{title:'A 守底线', role:'先守住家庭底线和录取安全，再看是否值得继续保留。', review:['学校性质','学费','实际校区','招生章程','专业课程']},
    B:{title:'B 看专业', role:'看专业是否看得准、孩子是否学得动、毕业路径是否清楚。', review:['本科专业代码','培养方案','就业去向','是否大类招生','岗位相关性']},
    C:{title:'C 看上限', role:'比较城市、学校层级、中外合作、民办城市专业带来的上限机会。', review:['学费','证书','培养地点','是否必须出国','转专业政策']}
  };
  var REVIEW_RULES = {
    highFee:{label:'高收费 / 中外合作', terms:['高收费','中外合作','合作办学','国际','学术互认','联合培养','ACCA','CIMA','ISEC'], review:['学费','四年总成本','证书','培养地点','是否必须出国','转专业政策'], warning:'高收费/中外合作建议重点复核学费、证书、培养地点。'},
    qualification:{label:'资格型计划', terms:['少数民族','民族班','预科','高校专项','专项计划','定向','公费师范','优师专项','政审','体检'], review:['专项资格','公示名单','招生计划','服务约束'], warning:'资格型入口不是所有考生都适用，未确认前默认隐藏。'},
    majorClass:{label:'大类招生', terms:['大类','试验班','实验班','工科试验班','理科试验班','计算机类','电子信息类','机械类','材料类','工商管理类'], review:['大类分流','可选专业范围','退出机制','转专业政策'], warning:'大类招生建议重点复核分流规则和可选专业范围。'}
  };
  function byId(list,id){return (list||[]).find(function(x){return x.id===id;})||null;}
  function clone(x){return JSON.parse(JSON.stringify(x));}
  function scenarioForScore(score){
    var s=Number(score||0); if(s>=650)return 'platformSprint'; if(s>=625)return 'platformStable'; if(s>=600)return 'highValue'; if(s>=520)return 'employment'; if(s>=480)return 'publicLow'; if(s>=430)return 'edgeBachelor'; return 'broad';
  }
  window.LN_V3_LEGACY_RULEBOOK = {
    version:'v300rc2-rulebook',
    scenarios:clone(SCENARIOS), targetPaths:clone(TARGET_PATHS), professionalPaths:clone(PROFESSIONAL_PATHS), planRules:clone(PLAN_RULES), reviewRules:clone(REVIEW_RULES),
    getScenario:function(id){return clone(byId(SCENARIOS,id)||byId(SCENARIOS,'broad'));},
    getTargetPath:function(id){return clone(byId(TARGET_PATHS,id)||byId(TARGET_PATHS,'employment'));},
    getProfessionalPath:function(id){return clone(PROFESSIONAL_PATHS[id]||null);},
    scenarioForScore:scenarioForScore,
    explainScenario:function(id){var s=byId(SCENARIOS,id)||byId(SCENARIOS,'broad');return s.title+'：'+s.desc+' '+s.warning;},
    matrix:function(){return {scenarioCount:SCENARIOS.length,targetPathCount:TARGET_PATHS.length,professionalPathCount:Object.keys(PROFESSIONAL_PATHS).length,planCount:Object.keys(PLAN_RULES).length,reviewCount:Object.keys(REVIEW_RULES).length};}
  };
})();

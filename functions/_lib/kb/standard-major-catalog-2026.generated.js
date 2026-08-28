// Generated for ln-rank KB seed: standard-major-catalog-2026.generated.js
// Purpose: 2026本科专业目录的 ln-rank 核心专业知识库。
// Important: this is a curated, high-value KB subset for AI diagnosis/search/report.
// It is NOT a verbatim 883-row dump. Full official PDF source is registered below for later full parsing.

export const STANDARD_MAJOR_CATALOG_2026_META = {
  version: '2026-core-kb-20260604',
  catalogYear: 2026,
  sourceLevel: 'A',
  sourceName: '教育部关于公布《普通高等学校本科专业目录（2026年）》的通知及附件',
  sourceUrl: 'https://education.news.cn/20260428/5d9c0117b0c943adb68d74e4320835e6/202604285d9c0117b0c943adb68d74e4320835e6_1224e991cd08564f5f9c594207f0d5ff38.pdf',
  officialNoticeUrl: 'https://app.xinhuanet.com/news/article.html?articleId=202604285d9c0117b0c943adb68d74e4320835e6',
  verifiedAt: '2026-06-04',
  officialStats: {
    disciplineCategories: 13,
    majorCategories: 92,
    majorCount: 883,
    newDiscipline: '交叉学科',
    note: '教育部通知及附件确认新增交叉学科门类，目录每年更新发布；专业代码后 T 为特设专业，K 为国家控制布点专业。'
  },
  coverage: {
    mode: 'lnRankCoreAndHighRiskSeed',
    includedEntryCount: 118,
    full883RowsParsed: false,
    reason: '当前文件优先覆盖 ln-rank 搜索、专业代码展示、AI诊断、报告中最常见/最易误判/高风险专业；完整883条建议后续由官方PDF附件自动解析生成。',
    mustNotClaimFullCatalog: true
  },
  aiBoundary: [
    '本文件用于 ln-rank 核心专业识别和 AI 诊断，不等同于完整883条官方目录。',
    '2026新增或划转专业缺少辽宁长期录取历史，AI只能提示核验招生计划、培养方案、依托学院和就业路径。',
    '专业代码展示必须区分专业代码、专业类和试验班；专业类和试验班不能硬映射成单一专业代码。',
    '正式填报以2026年招生计划、招生章程和辽宁志愿系统为准。'
  ]
};

export const MAJOR_DIRECTION_IDS_2026 = {
  electrical_energy: '电气/自动化/能源',
  mechanical_vehicle: '机械/装备/车辆',
  petro_material_safety: '石化/材料/资源安全',
  computer_ai_software: '计算机/AI/软件',
  electronics_ic: '电子信息/集成电路',
  medical_core: '医学核心',
  medical_applied: '医学应用',
  teacher_law_public: '师范/法学/考公',
  finance_management: '财经管理',
  civil_arch_transport: '土木建筑交通',
  agri_food_env: '农林食品环境',
  humanities_media_tourism: '文旅外语新闻',
  basic_science_math: '基础理科/数理',
  cross_frontier: '交叉学科/前沿新专业',
  other: '其他'
};

export const STANDARD_MAJOR_CATALOG_2026 = [
  // 经济/财经
  { code:'020101', name:'经济学', discipline:'经济学', categoryCode:'0201', categoryName:'经济学类', directionId:'finance_management', aliases:['经济'], aiBoundary:['偏理论与分析，需结合学校平台、城市和升学/就业路径判断。'] },
  { code:'020109T', name:'数字经济', discipline:'经济学', categoryCode:'0201', categoryName:'经济学类', directionId:'finance_management', isSpecial:true, aliases:['数字经济'], aiBoundary:['名称偏新，应核验课程中数学、统计、计算机和产业实习比例。'] },
  { code:'020110TK', name:'低空经济与管理', discipline:'经济学', categoryCode:'0201', categoryName:'经济学类', directionId:'finance_management', isSpecial:true, isControlled:true, isNewOrRecent:true, aliases:['低空经济'], aiBoundary:['新兴方向缺少长期辽宁录取与就业历史，只能提示核验培养方案和依托学院。'] },
  { code:'020301K', name:'金融学', discipline:'经济学', categoryCode:'0203', categoryName:'金融学类', directionId:'finance_management', isControlled:true, aliases:['金融'], aiBoundary:['金融路径强依赖学校平台、城市实习资源、家庭资源和深造能力，不宜只看专业名。'] },
  { code:'020302', name:'金融工程', discipline:'经济学', categoryCode:'0203', categoryName:'金融学类', directionId:'finance_management', aliases:['金融工程'], aiBoundary:['需要数学、统计、编程能力，不能按普通金融简单理解。'] },
  { code:'020310T', name:'金融科技', discipline:'经济学', categoryCode:'0203', categoryName:'金融学类', directionId:'finance_management', isSpecial:true, aliases:['金融科技','fintech'], aiBoundary:['交叉型财经方向，需核验计算机/数据课程深度。'] },
  { code:'020312TK', name:'数字金融', discipline:'经济学', categoryCode:'0203', categoryName:'金融学类', directionId:'finance_management', isSpecial:true, isControlled:true, isNewOrRecent:true, aliases:['数字金融'], aiBoundary:['新增数字化财经方向，缺少长期录取历史，需核验课程和就业去向。'] },
  { code:'020401', name:'国际经济与贸易', discipline:'经济学', categoryCode:'0204', categoryName:'经济与贸易类', directionId:'finance_management', aliases:['国贸','国际贸易'], aiBoundary:['就业受城市、外语、实践和行业周期影响。'] },
  { code:'020404TK', name:'数字贸易', discipline:'经济学', categoryCode:'0204', categoryName:'经济与贸易类', directionId:'finance_management', isSpecial:true, isControlled:true, isNewOrRecent:true, aliases:['数字贸易'], aiBoundary:['新增数字贸易方向，需核验跨境电商、数据分析、贸易实务课程比例。'] },

  // 法学/公职路径
  { code:'030101K', name:'法学', discipline:'法学', categoryCode:'0301', categoryName:'法学类', directionId:'teacher_law_public', isControlled:true, aliases:['法律','法学'], aiBoundary:['需关注法考、学校法学平台、城市实习资源、考公竞争和是否接受读研。'] },
  { code:'030102T', name:'知识产权', discipline:'法学', categoryCode:'0301', categoryName:'法学类', directionId:'teacher_law_public', isSpecial:true, aliases:['知识产权'], aiBoundary:['法学与技术/产业结合，需核验学校理工背景和法学平台。'] },
  { code:'030108TK', name:'纪检监察', discipline:'法学', categoryCode:'0301', categoryName:'法学类', directionId:'teacher_law_public', isSpecial:true, isControlled:true, aliases:['纪检监察'], aiBoundary:['公职倾向明显，需核验招生条件、培养单位和就业去向。'] },
  { code:'030201', name:'政治学与行政学', discipline:'法学', categoryCode:'0302', categoryName:'政治学类', directionId:'teacher_law_public', aliases:['政治学','行政学'], aiBoundary:['偏公共管理与政治学路径，常与考公/读研相关。'] },
  { code:'030503', name:'思想政治教育', discipline:'法学', categoryCode:'0305', categoryName:'马克思主义理论类', directionId:'teacher_law_public', aliases:['思政','思想政治教育'], aiBoundary:['师范/思政岗位需关注教师资格、地区岗位和学校培养方向。'] },

  // 教育/师范
  { code:'040101', name:'教育学', discipline:'教育学', categoryCode:'0401', categoryName:'教育学类', directionId:'teacher_law_public', aliases:['教育学'], aiBoundary:['教育学不等于直接当老师，需核验是否师范、教师资格、升学路径。'] },
  { code:'040106', name:'学前教育', discipline:'教育学', categoryCode:'0401', categoryName:'教育学类', directionId:'teacher_law_public', aliases:['学前'], aiBoundary:['需核验教师资格、体检、地区岗位和家庭是否接受工作环境。'] },
  { code:'040107', name:'小学教育', discipline:'教育学', categoryCode:'0401', categoryName:'教育学类', directionId:'teacher_law_public', aliases:['小学教育'], aiBoundary:['需关注教师资格、编制机会、学科方向和地区岗位。'] },
  { code:'040108', name:'特殊教育', discipline:'教育学', categoryCode:'0401', categoryName:'教育学类', directionId:'teacher_law_public', aliases:['特殊教育'], aiBoundary:['需核验体检要求、岗位性质和孩子接受度。'] },
  { code:'040117TK', name:'人工智能教育', discipline:'教育学', categoryCode:'0401', categoryName:'教育学类', directionId:'teacher_law_public', isSpecial:true, isControlled:true, isNewOrRecent:true, aliases:['AI教育','人工智能教育'], aiBoundary:['新增交叉教育方向，需核验技术课程深度和师范/教育技术定位。'] },
  { code:'040201', name:'体育教育', discipline:'教育学', categoryCode:'0402', categoryName:'体育学类', directionId:'teacher_law_public', aliases:['体育教育'], aiBoundary:['需关注体育类招生、教师资格、身体条件和地区岗位。'] },

  // 文学/语言/新闻
  { code:'050101', name:'汉语言文学', discipline:'文学', categoryCode:'0501', categoryName:'中国语言文学类', directionId:'teacher_law_public', aliases:['中文','汉语言文学'], aiBoundary:['可走师范、考公、编辑等路径，需核验是否师范和学校平台。'] },
  { code:'050201', name:'英语', discipline:'文学', categoryCode:'0502', categoryName:'外国语言文学类', directionId:'humanities_media_tourism', aliases:['英语'], aiBoundary:['需关注AI翻译冲击、口译/教育/外贸路径和学校平台。'] },
  { code:'050205', name:'西班牙语', discipline:'文学', categoryCode:'0502', categoryName:'外国语言文学类', directionId:'humanities_media_tourism', aliases:['西语','西班牙语'], aiBoundary:['小语种需谨慎核验地区需求、复合能力和就业流向。'] },
  { code:'0502104TK', name:'区域国别学', discipline:'文学', categoryCode:'0502', categoryName:'外国语言文学类', directionId:'humanities_media_tourism', isSpecial:true, isControlled:true, isNewOrRecent:true, aliases:['区域国别'], aiBoundary:['新增方向，偏研究/国际事务/外语复合，需核验培养方案和升学路径。'] },
  { code:'050301', name:'新闻学', discipline:'文学', categoryCode:'0503', categoryName:'新闻传播学类', directionId:'humanities_media_tourism', aliases:['新闻'], aiBoundary:['受平台、城市、实践和AI内容生产影响，需谨慎评估就业路径。'] },
  { code:'050306T', name:'网络与新媒体', discipline:'文学', categoryCode:'0503', categoryName:'新闻传播学类', directionId:'humanities_media_tourism', isSpecial:true, aliases:['新媒体','网络与新媒体'], aiBoundary:['需核验数据运营、视频、传播实践和实习资源，不宜只看热门名词。'] },

  // 基础理科/数理
  { code:'070101', name:'数学与应用数学', discipline:'理学', categoryCode:'0701', categoryName:'数学类', directionId:'basic_science_math', aliases:['数学'], aiBoundary:['适合升学、师范、数据/金融等路径，需看数学能力和学校平台。'] },
  { code:'070102', name:'信息与计算科学', discipline:'理学', categoryCode:'0701', categoryName:'数学类', directionId:'basic_science_math', aliases:['信计','信息与计算'], aiBoundary:['数学+计算方向，需核验编程和数理课程深度。'] },
  { code:'070104T', name:'数据计算及应用', discipline:'理学', categoryCode:'0701', categoryName:'数学类', directionId:'basic_science_math', isSpecial:true, aliases:['数据计算'], aiBoundary:['新型数理计算方向，需核验课程和实践平台。'] },
  { code:'070105TK', name:'智能计算', discipline:'理学', categoryCode:'0701', categoryName:'数学类', directionId:'basic_science_math', isSpecial:true, isControlled:true, isNewOrRecent:true, aliases:['智能计算'], aiBoundary:['新增/近年方向，缺少长期录取历史，需核验依托学院。'] },
  { code:'070201', name:'物理学', discipline:'理学', categoryCode:'0702', categoryName:'物理学类', directionId:'basic_science_math', aliases:['物理'], aiBoundary:['偏基础学科，需关注升学路径和师范/科研定位。'] },
  { code:'070301', name:'化学', discipline:'理学', categoryCode:'0703', categoryName:'化学类', directionId:'petro_material_safety', aliases:['化学'], aiBoundary:['需关注实验、体检限制、读研和行业方向。'] },
  { code:'070302', name:'应用化学', discipline:'理学', categoryCode:'0703', categoryName:'化学类', directionId:'petro_material_safety', aliases:['应用化学'], aiBoundary:['化工/材料/检测相关，需关注体检限制和行业环境。'] },
  { code:'071001', name:'生物科学', discipline:'理学', categoryCode:'0710', categoryName:'生物科学类', directionId:'agri_food_env', aliases:['生物'], aiBoundary:['常见读研需求较高，需关注升学和实验接受度。'] },
  { code:'071004', name:'生态学', discipline:'理学', categoryCode:'0710', categoryName:'生物科学类', directionId:'agri_food_env', aliases:['生态'], aiBoundary:['就业路径偏环保/科研/考公，需结合学校平台和地区。'] },
  { code:'071201', name:'统计学', discipline:'理学', categoryCode:'0712', categoryName:'统计学类', directionId:'basic_science_math', aliases:['统计'], aiBoundary:['适合数据、金融、科研路径，要求数学和编程能力。'] },
  { code:'071202', name:'应用统计学', discipline:'理学', categoryCode:'0712', categoryName:'统计学类', directionId:'basic_science_math', aliases:['应统','应用统计'], aiBoundary:['就业面较广，但学校层次、项目实践和城市资源很重要。'] },
  { code:'071203T', name:'数据科学', discipline:'理学', categoryCode:'0712', categoryName:'统计学类', directionId:'basic_science_math', isSpecial:true, aliases:['数据科学'], aiBoundary:['理学统计方向的数据科学，需区分计算机类数据科学与大数据技术。'] },

  // 工科：机械/电气/电子/自动化/计算机
  { code:'080201', name:'机械工程', discipline:'工学', categoryCode:'0802', categoryName:'机械类', directionId:'mechanical_vehicle', aliases:['机械'], aiBoundary:['机械为装备制造底层方向，需看学校行业背景和实践平台。'] },
  { code:'080202', name:'机械设计制造及其自动化', discipline:'工学', categoryCode:'0802', categoryName:'机械类', directionId:'mechanical_vehicle', aliases:['机械设计','机械制造'], notAliases:['电气自动化'], aiBoundary:['不能因“自动化”误归电气，本专业主体属于机械/装备/制造。'] },
  { code:'080204', name:'机械电子工程', discipline:'工学', categoryCode:'0802', categoryName:'机械类', directionId:'mechanical_vehicle', aliases:['机电'], aiBoundary:['机械与控制交叉，需看学校智能制造/机器人平台。'] },
  { code:'080205', name:'工业设计', discipline:'工学', categoryCode:'0802', categoryName:'机械类', directionId:'mechanical_vehicle', aliases:['工业设计'], aiBoundary:['偏设计与产品，不能按传统机械就业简单判断。'] },
  { code:'080207', name:'车辆工程', discipline:'工学', categoryCode:'0802', categoryName:'机械类', directionId:'mechanical_vehicle', aliases:['车辆','汽车工程'], aiBoundary:['需关注新能源车、智能汽车和学校汽车行业资源。'] },
  { code:'080213T', name:'智能制造工程', discipline:'工学', categoryCode:'0802', categoryName:'机械类', directionId:'mechanical_vehicle', isSpecial:true, aliases:['智能制造'], aiBoundary:['主体应按机械/制造判断，不因“智能”直接归AI。'] },
  { code:'080216T', name:'新能源汽车工程', discipline:'工学', categoryCode:'0802', categoryName:'机械类', directionId:'mechanical_vehicle', isSpecial:true, aliases:['新能源汽车'], aiBoundary:['需核验车辆、动力电池、电控课程与企业实践。'] },
  { code:'080501', name:'能源与动力工程', discipline:'工学', categoryCode:'0805', categoryName:'能源动力类', directionId:'electrical_energy', aliases:['能动','能源动力'], aiBoundary:['可与电力、新能源相关，但不等同电气工程。'] },
  { code:'080503T', name:'新能源科学与工程', discipline:'工学', categoryCode:'0805', categoryName:'能源动力类', directionId:'electrical_energy', isSpecial:true, aliases:['新能源'], aiBoundary:['与电力/能源系统相关，需核验课程偏电气、材料还是热能。'] },
  { code:'080510T', name:'能源科学与工程', discipline:'工学', categoryCode:'0805', categoryName:'能源动力类', directionId:'electrical_energy', isSpecial:true, isNewOrRecent:true, aliases:['能源科学'], aiBoundary:['新增/近年能源方向，需核验依托学院和课程结构。'] },
  { code:'080601', name:'电气工程及其自动化', discipline:'工学', categoryCode:'0806', categoryName:'电气类', directionId:'electrical_energy', aliases:['电气','电力','电气工程'], aiBoundary:['电网/电力设备核心方向之一，建议结合学校平台、地区招聘和位次余量核验。'] },
  { code:'080602T', name:'智能电网信息工程', discipline:'工学', categoryCode:'0806', categoryName:'电气类', directionId:'electrical_energy', isSpecial:true, aliases:['智能电网'], aiBoundary:['电气与信息交叉，适合电力系统方向核验。'] },
  { code:'080604T', name:'电气工程与智能控制', discipline:'工学', categoryCode:'0806', categoryName:'电气类', directionId:'electrical_energy', isSpecial:true, aliases:['电气智能控制'], aiBoundary:['电气+控制，仍按电气类优先。'] },
  { code:'080607T', name:'能源互联网工程', discipline:'工学', categoryCode:'0806', categoryName:'电气类', directionId:'electrical_energy', isSpecial:true, aliases:['能源互联网'], aiBoundary:['电气/能源/信息交叉，需核验学校电气平台。'] },
  { code:'080608TK', name:'智慧能源工程', discipline:'工学', categoryCode:'0806', categoryName:'电气类', directionId:'electrical_energy', isSpecial:true, isControlled:true, aliases:['智慧能源'], aiBoundary:['新兴能源方向，不能直接等同电网岗位，需核验课程与培养单位。'] },
  { code:'080701', name:'电子信息工程', discipline:'工学', categoryCode:'0807', categoryName:'电子信息类', directionId:'electronics_ic', aliases:['电子信息'], aiBoundary:['电子信息基础方向，需看学校电子/通信平台与实践。'] },
  { code:'080702', name:'电子科学与技术', discipline:'工学', categoryCode:'0807', categoryName:'电子信息类', directionId:'electronics_ic', aliases:['电子科学'], aiBoundary:['可关联半导体/器件，需核验学科平台。'] },
  { code:'080703', name:'通信工程', discipline:'工学', categoryCode:'0807', categoryName:'电子信息类', directionId:'electronics_ic', aliases:['通信'], aiBoundary:['通信方向需看学校信息通信平台、城市和企业资源。'] },
  { code:'080704', name:'微电子科学与工程', discipline:'工学', categoryCode:'0807', categoryName:'电子信息类', directionId:'electronics_ic', aliases:['微电子'], aiBoundary:['集成电路相关，通常对平台和深造要求较高。'] },
  { code:'080710T', name:'集成电路设计与集成系统', discipline:'工学', categoryCode:'0807', categoryName:'电子信息类', directionId:'electronics_ic', isSpecial:true, aliases:['集成电路','芯片设计'], aiBoundary:['芯片相关核心方向，需核验学校平台、实验条件和升学路径。'] },
  { code:'080717T', name:'人工智能', discipline:'工学', categoryCode:'0807', categoryName:'电子信息类', directionId:'computer_ai_software', isSpecial:true, aliases:['AI','人工智能'], aiBoundary:['AI方向需核验数学、算法、工程实践和学校计算机/电子平台，不能只看名称。'] },
  { code:'080723TK', name:'半导体工艺与装备', discipline:'工学', categoryCode:'0807', categoryName:'电子信息类', directionId:'electronics_ic', isSpecial:true, isControlled:true, isNewOrRecent:true, aliases:['半导体工艺','半导体装备'], aiBoundary:['新兴半导体方向，需核验工艺、设备、材料和实训平台。'] },
  { code:'080801', name:'自动化', discipline:'工学', categoryCode:'0808', categoryName:'自动化类', directionId:'electrical_energy', aliases:['自动化'], aiBoundary:['自动化可与控制、电气、智能制造相关，需结合学校平台判断。'] },
  { code:'080803T', name:'机器人工程', discipline:'工学', categoryCode:'0808', categoryName:'自动化类', directionId:'mechanical_vehicle', isSpecial:true, aliases:['机器人'], aiBoundary:['机器人是机械/控制/计算机交叉，不能只按AI判断。'] },
  { code:'080807T', name:'工业智能', discipline:'工学', categoryCode:'0808', categoryName:'自动化类', directionId:'electrical_energy', isSpecial:true, aliases:['工业智能'], aiBoundary:['偏工业控制和智能制造，需核验工程实践。'] },
  { code:'080901', name:'计算机科学与技术', discipline:'工学', categoryCode:'0809', categoryName:'计算机类', directionId:'computer_ai_software', aliases:['计算机','计科'], aiBoundary:['计算机仍看学校平台、代码能力、项目和城市资源，不能只看热度。'] },
  { code:'080902', name:'软件工程', discipline:'工学', categoryCode:'0809', categoryName:'计算机类', directionId:'computer_ai_software', aliases:['软件'], aiBoundary:['需核验学费、培养模式、工程实践和校区；部分软件工程可能高收费。'] },
  { code:'080903', name:'网络工程', discipline:'工学', categoryCode:'0809', categoryName:'计算机类', directionId:'computer_ai_software', aliases:['网络工程'], aiBoundary:['计算机网络方向，需关注安全、运维和工程实践。'] },
  { code:'080904K', name:'信息安全', discipline:'工学', categoryCode:'0809', categoryName:'计算机类', directionId:'computer_ai_software', isControlled:true, aliases:['信安','信息安全'], aiBoundary:['网络安全相关，部分岗位有政审/背景要求，需核验学校平台。'] },
  { code:'080905', name:'物联网工程', discipline:'工学', categoryCode:'0809', categoryName:'计算机类', directionId:'computer_ai_software', aliases:['物联网'], aiBoundary:['软硬结合，需核验嵌入式、通信、项目实践。'] },
  { code:'080906', name:'数字媒体技术', discipline:'工学', categoryCode:'0809', categoryName:'计算机类', directionId:'computer_ai_software', aliases:['数字媒体技术'], aiBoundary:['偏技术而非艺术，需核验课程结构。'] },
  { code:'080910T', name:'数据科学与大数据技术', discipline:'工学', categoryCode:'0809', categoryName:'计算机类', directionId:'computer_ai_software', isSpecial:true, aliases:['大数据','数据科学与大数据'], aiBoundary:['计算机类大数据方向，需看数学、数据库、工程实践。'] },
  { code:'080911TK', name:'网络空间安全', discipline:'工学', categoryCode:'0809', categoryName:'计算机类', directionId:'computer_ai_software', isControlled:true, aliases:['网安','网络安全'], aiBoundary:['网络安全方向，需核验学校平台、实践环境和是否有特殊要求。'] },
  { code:'080919T', name:'工业软件', discipline:'工学', categoryCode:'0809', categoryName:'计算机类', directionId:'computer_ai_software', isSpecial:true, aliases:['工业软件'], aiBoundary:['面向工业软件，需核验机械/制造/软件交叉平台。'] },

  // 土木建筑交通/石化材料/环境/农业食品
  { code:'081001', name:'土木工程', discipline:'工学', categoryCode:'0810', categoryName:'土木类', directionId:'civil_arch_transport', aliases:['土木'], aiBoundary:['土木受行业周期影响，需谨慎核验就业流向和学校行业资源。'] },
  { code:'081002', name:'建筑环境与能源应用工程', discipline:'工学', categoryCode:'0810', categoryName:'土木类', directionId:'civil_arch_transport', aliases:['建环','建筑环境'], aiBoundary:['属于土木/建筑环境方向，不应简单按电气或能源判断。'] },
  { code:'081004', name:'建筑电气与智能化', discipline:'工学', categoryCode:'0810', categoryName:'土木类', directionId:'civil_arch_transport', aliases:['建筑电气'], aiBoundary:['虽含电气，但培养场景偏建筑电气，不能等同电气工程及其自动化。'] },
  { code:'081008T', name:'智能建造', discipline:'工学', categoryCode:'0810', categoryName:'土木类', directionId:'civil_arch_transport', isSpecial:true, aliases:['智能建造'], aiBoundary:['土木+数字化方向，仍受建筑行业周期影响。'] },
  { code:'081201', name:'测绘工程', discipline:'工学', categoryCode:'0812', categoryName:'测绘类', directionId:'civil_arch_transport', aliases:['测绘'], aiBoundary:['需关注野外作业、行业资质和学校地信平台。'] },
  { code:'081301', name:'化学工程与工艺', discipline:'工学', categoryCode:'0813', categoryName:'化工与制药类', directionId:'petro_material_safety', aliases:['化工'], aiBoundary:['需关注体检限制、化工行业环境和安全要求。'] },
  { code:'081302', name:'制药工程', discipline:'工学', categoryCode:'0813', categoryName:'化工与制药类', directionId:'petro_material_safety', aliases:['制药'], aiBoundary:['制药工程不是临床医学，需核验化工/药学课程和就业路径。'] },
  { code:'081401', name:'地质工程', discipline:'工学', categoryCode:'0814', categoryName:'地质类', directionId:'petro_material_safety', aliases:['地质工程'], aiBoundary:['需关注野外、资源行业周期和工作环境。'] },
  { code:'081501', name:'采矿工程', discipline:'工学', categoryCode:'0815', categoryName:'矿业类', directionId:'petro_material_safety', aliases:['采矿'], notAliases:['电力'], aiBoundary:['不能因能源相关误判为电力强匹配，需核验行业环境和接受度。'] },
  { code:'081502', name:'石油工程', discipline:'工学', categoryCode:'0815', categoryName:'矿业类', directionId:'petro_material_safety', aliases:['石油'], notAliases:['电力'], aiBoundary:['石油方向不能作为电力方向强匹配，需核验地区和行业周期。'] },
  { code:'081504', name:'油气储运工程', discipline:'工学', categoryCode:'0815', categoryName:'矿业类', directionId:'petro_material_safety', aliases:['油气储运'], notAliases:['电力'], aiBoundary:['油气储运有体检/行业环境核验点，不能归为电气核心。'] },
  { code:'081801', name:'交通运输', discipline:'工学', categoryCode:'0818', categoryName:'交通运输类', directionId:'civil_arch_transport', aliases:['交通运输'], aiBoundary:['需关注体检限制、铁路/民航/航海等具体方向。'] },
  { code:'081802', name:'交通工程', discipline:'工学', categoryCode:'0818', categoryName:'交通运输类', directionId:'civil_arch_transport', aliases:['交通工程'], aiBoundary:['偏规划与工程，需核验城市/交通行业资源。'] },
  { code:'081812T', name:'智能运输工程', discipline:'工学', categoryCode:'0818', categoryName:'交通运输类', directionId:'civil_arch_transport', isSpecial:true, aliases:['智能运输'], aiBoundary:['交通+智能方向，需核验培养学院和课程结构。'] },
  { code:'081813T', name:'交通能源融合工程', discipline:'工学', categoryCode:'0818', categoryName:'交通运输类', directionId:'civil_arch_transport', isSpecial:true, isNewOrRecent:true, aliases:['交通能源融合'], aiBoundary:['新增交叉方向，不能直接等同电气或交通主干，就业历史不足。'] },
  { code:'082302', name:'农业机械化及其自动化', discipline:'工学', categoryCode:'0823', categoryName:'农业工程类', directionId:'mechanical_vehicle', aliases:['农业机械化'], notAliases:['电气自动化'], aiBoundary:['不能因“自动化”误归电气，本体是农业机械/装备。'] },
  { code:'082308T', name:'农业机器人', discipline:'工学', categoryCode:'0823', categoryName:'农业工程类', directionId:'mechanical_vehicle', isSpecial:true, isNewOrRecent:true, aliases:['农业机器人'], aiBoundary:['新增农业装备交叉方向，需核验学校农机/机器人平台。'] },
  { code:'082501', name:'环境科学与工程', discipline:'工学', categoryCode:'0825', categoryName:'环境科学与工程类', directionId:'agri_food_env', aliases:['环境科学与工程'], aiBoundary:['环保方向需关注行业岗位、考公/读研和地区需求。'] },
  { code:'082502', name:'环境工程', discipline:'工学', categoryCode:'0825', categoryName:'环境科学与工程类', directionId:'agri_food_env', aliases:['环境工程'], aiBoundary:['需关注行业岗位、项目经验、是否接受一线环境工作。'] },
  { code:'082701', name:'食品科学与工程', discipline:'工学', categoryCode:'0827', categoryName:'食品科学与工程类', directionId:'agri_food_env', aliases:['食品'], aiBoundary:['食品属于生命食品方向，不等于医学核心；需关注体检限制和行业岗位。'] },
  { code:'082702', name:'食品质量与安全', discipline:'工学', categoryCode:'0827', categoryName:'食品科学与工程类', directionId:'agri_food_env', aliases:['食品质量','食安'], aiBoundary:['可关联检测/监管/食品企业，需核验就业去向。'] },
  { code:'082801', name:'建筑学', discipline:'工学', categoryCode:'0828', categoryName:'建筑类', directionId:'civil_arch_transport', aliases:['建筑学'], aiBoundary:['通常学制较长且受行业周期影响，需核验美术基础/培养要求。'] },
  { code:'082803', name:'风景园林', discipline:'工学', categoryCode:'0828', categoryName:'建筑类', directionId:'civil_arch_transport', aliases:['风景园林'], notAliases:['园艺'], aiBoundary:['风景园林偏设计/景观/建筑规划，不能和园艺混同。'] },
  { code:'082901', name:'安全工程', discipline:'工学', categoryCode:'0829', categoryName:'安全科学与工程类', directionId:'petro_material_safety', aliases:['安全工程'], aiBoundary:['需关注行业方向、工作环境和证书路径。'] },
  { code:'083001', name:'生物工程', discipline:'工学', categoryCode:'0830', categoryName:'生物工程类', directionId:'agri_food_env', aliases:['生物工程'], aiBoundary:['常需关注读研和生物制造/制药/食品等具体方向。'] },
  { code:'083004T', name:'生物制造', discipline:'工学', categoryCode:'0830', categoryName:'生物工程类', directionId:'agri_food_env', isSpecial:true, isNewOrRecent:true, aliases:['生物制造'], aiBoundary:['新增前沿方向，缺少长期录取与就业历史，需核验学校平台。'] },

  // 农学/动物/食品生命
  { code:'090101', name:'农学', discipline:'农学', categoryCode:'0901', categoryName:'植物生产类', directionId:'agri_food_env', aliases:['农学'], aiBoundary:['农学需结合学校农业平台、读研和是否接受相关行业。'] },
  { code:'090102', name:'园艺', discipline:'农学', categoryCode:'0901', categoryName:'植物生产类', directionId:'agri_food_env', aliases:['园艺'], notAliases:['园林','风景园林'], aiBoundary:['园艺偏农学种植方向，不等于园林/风景园林。'] },
  { code:'090103', name:'植物保护', discipline:'农学', categoryCode:'0901', categoryName:'植物生产类', directionId:'agri_food_env', aliases:['植保'], aiBoundary:['需关注农业、植保、农药/生物防治和体检限制。'] },
  { code:'090112T', name:'智慧农业', discipline:'农学', categoryCode:'0901', categoryName:'植物生产类', directionId:'agri_food_env', isSpecial:true, aliases:['智慧农业'], aiBoundary:['农业+数字化，需核验技术课程和实践平台。'] },
  { code:'090301', name:'动物科学', discipline:'农学', categoryCode:'0903', categoryName:'动物生产类', directionId:'agri_food_env', aliases:['动物科学'], aiBoundary:['动物生产方向，需核验就业环境和孩子接受度。'] },
  { code:'090401', name:'动物医学', discipline:'农学', categoryCode:'0904', categoryName:'动物医学类', directionId:'agri_food_env', aliases:['动物医学','兽医'], notAliases:['临床医学','医学核心'], aiBoundary:['动物医学不归医学核心；需关注学制、执业兽医、体检和动物接触接受度。'] },
  { code:'090501', name:'林学', discipline:'农学', categoryCode:'0905', categoryName:'林学类', directionId:'agri_food_env', aliases:['林学'], aiBoundary:['林学需核验野外、生态、考公和行业路径。'] },
  { code:'090502', name:'园林', discipline:'农学', categoryCode:'0905', categoryName:'林学类', directionId:'civil_arch_transport', aliases:['园林'], notAliases:['园艺'], aiBoundary:['园林偏景观/设计/生态规划，不能和园艺混同。'] },
  { code:'090601', name:'水产养殖学', discipline:'农学', categoryCode:'0906', categoryName:'水产类', directionId:'agri_food_env', aliases:['水产'], aiBoundary:['需核验工作环境、行业去向和学校水产平台。'] },

  // 医学核心/医学应用
  { code:'100101K', name:'基础医学', discipline:'医学', categoryCode:'1001', categoryName:'基础医学类', directionId:'medical_core', isControlled:true, aliases:['基础医学'], aiBoundary:['偏科研和医学基础，需关注升学和培养周期。'] },
  { code:'100201K', name:'临床医学', discipline:'医学', categoryCode:'1002', categoryName:'临床医学类', directionId:'medical_core', isControlled:true, aliases:['临床'], aiBoundary:['医学核心方向，培养周期长，需考虑规培、执业资格、体检限制和家庭承受能力。'] },
  { code:'100202TK', name:'麻醉学', discipline:'医学', categoryCode:'1002', categoryName:'临床医学类', directionId:'medical_core', isSpecial:true, isControlled:true, aliases:['麻醉'], aiBoundary:['临床医学相关核心方向，需关注规培、体检和岗位压力。'] },
  { code:'100203TK', name:'医学影像学', discipline:'医学', categoryCode:'1002', categoryName:'临床医学类', directionId:'medical_core', isSpecial:true, isControlled:true, aliases:['影像学'], aiBoundary:['医学影像学属于临床相关，不同于医学影像技术。'] },
  { code:'100301K', name:'口腔医学', discipline:'医学', categoryCode:'1003', categoryName:'口腔医学类', directionId:'medical_core', isControlled:true, aliases:['口腔'], aiBoundary:['医学核心方向，需核验学制、体检、执业和长期学习路径。'] },
  { code:'100401K', name:'预防医学', discipline:'医学', categoryCode:'1004', categoryName:'公共卫生与预防医学类', directionId:'medical_applied', isControlled:true, aliases:['预防医学'], aiBoundary:['公共卫生方向，需区分临床医学路径和公共卫生就业/考公路径。'] },
  { code:'100501K', name:'中医学', discipline:'医学', categoryCode:'1005', categoryName:'中医学类', directionId:'medical_core', isControlled:true, aliases:['中医'], aiBoundary:['中医培养周期长，需核验执业路径、规培和学校平台。'] },
  { code:'100601K', name:'中西医临床医学', discipline:'医学', categoryCode:'1006', categoryName:'中西医结合类', directionId:'medical_core', isControlled:true, aliases:['中西医'], aiBoundary:['医学核心路径，需核验执业、规培和医院认可度。'] },
  { code:'100701', name:'药学', discipline:'医学', categoryCode:'1007', categoryName:'药学类', directionId:'medical_applied', aliases:['药学'], aiBoundary:['药学不等于临床医学，需关注药企、医院药房、研发/考研路径和体检限制。'] },
  { code:'100703TK', name:'临床药学', discipline:'医学', categoryCode:'1007', categoryName:'药学类', directionId:'medical_applied', isSpecial:true, isControlled:true, aliases:['临床药学'], aiBoundary:['药学应用方向，不能套临床医学5+3。'] },
  { code:'101001', name:'医学检验技术', discipline:'医学', categoryCode:'1010', categoryName:'医学技术类', directionId:'medical_applied', aliases:['检验'], aiBoundary:['医学技术类，不等同临床医学；需核验体检和医院岗位。'] },
  { code:'101003', name:'医学影像技术', discipline:'医学', categoryCode:'1010', categoryName:'医学技术类', directionId:'medical_applied', aliases:['影像技术'], aiBoundary:['医学技术类，不等于医学影像学；需核验就业岗位和体检。'] },
  { code:'101005', name:'康复治疗学', discipline:'医学', categoryCode:'1010', categoryName:'医学技术类', directionId:'medical_applied', aliases:['康复'], aiBoundary:['医学技术/康复方向，需核验岗位、体力要求和证书路径。'] },
  { code:'101101K', name:'护理学', discipline:'医学', categoryCode:'1011', categoryName:'护理学类', directionId:'medical_applied', isControlled:true, aliases:['护理'], aiBoundary:['护理就业路径清晰但劳动强度较高，需确认孩子接受度和体检。'] },

  // 管理/会计
  { code:'120101', name:'管理科学', discipline:'管理学', categoryCode:'1201', categoryName:'管理科学与工程类', directionId:'finance_management', aliases:['管理科学'], aiBoundary:['管理科学需看数据/运筹/工程管理课程深度。'] },
  { code:'120103', name:'工程管理', discipline:'管理学', categoryCode:'1201', categoryName:'管理科学与工程类', directionId:'civil_arch_transport', aliases:['工程管理'], aiBoundary:['与土建/工程造价相关，受行业周期影响。'] },
  { code:'120105', name:'工程造价', discipline:'管理学', categoryCode:'1201', categoryName:'管理科学与工程类', directionId:'civil_arch_transport', aliases:['工程造价'], aiBoundary:['工程造价与建筑行业相关，需关注行业周期和证书路径。'] },
  { code:'120108T', name:'大数据管理与应用', discipline:'管理学', categoryCode:'1201', categoryName:'管理科学与工程类', directionId:'finance_management', isSpecial:true, aliases:['大数据管理'], aiBoundary:['管理学下数据方向，需核验数学、编程和管理课程比例。'] },
  { code:'120201K', name:'工商管理', discipline:'管理学', categoryCode:'1202', categoryName:'工商管理类', directionId:'finance_management', isControlled:true, aliases:['工商管理'], aiBoundary:['宽口径管理专业，就业依赖学校平台、实习和城市资源。'] },
  { code:'120202', name:'市场营销', discipline:'管理学', categoryCode:'1202', categoryName:'工商管理类', directionId:'finance_management', aliases:['营销'], aiBoundary:['实践性强，需关注城市、实习和数字营销能力。'] },
  { code:'120203K', name:'会计学', discipline:'管理学', categoryCode:'1202', categoryName:'工商管理类', directionId:'finance_management', isControlled:true, aliases:['会计'], aiBoundary:['会计路径相对清晰，但要看学校层次、实习、证书和数字化能力。'] },
  { code:'120204', name:'财务管理', discipline:'管理学', categoryCode:'1202', categoryName:'工商管理类', directionId:'finance_management', aliases:['财务'], aiBoundary:['与会计、管理结合，需关注实习、证书和学校平台。'] },
  { code:'120207', name:'审计学', discipline:'管理学', categoryCode:'1202', categoryName:'工商管理类', directionId:'finance_management', aliases:['审计'], aiBoundary:['审计可关注考公/事务所/企业内审路径，需看学校平台和实习。'] },
  { code:'120219TK', name:'商业人工智能', discipline:'管理学', categoryCode:'1202', categoryName:'工商管理类', directionId:'finance_management', isSpecial:true, isControlled:true, isNewOrRecent:true, aliases:['商业AI','商业人工智能'], aiBoundary:['新增管理+AI方向，不能按纯计算机判断，需核验技术课程和商科实践。'] },

  // 交叉学科/前沿新专业
  { code:'140001TK', name:'未来机器人', discipline:'交叉学科', categoryCode:'1400', categoryName:'交叉学科类', directionId:'cross_frontier', isSpecial:true, isControlled:true, isNewOrRecent:true, oldCode:'083201TK', aliases:['未来机器人'], aiBoundary:['交叉学科划转/前沿方向，缺少长期录取历史，需核验机器人/机械/控制/AI平台。'] },
  { code:'140002TK', name:'交叉工程', discipline:'交叉学科', categoryCode:'1400', categoryName:'交叉学科类', directionId:'cross_frontier', isSpecial:true, isControlled:true, isNewOrRecent:true, oldCode:'083202TK', aliases:['交叉工程'], aiBoundary:['需核验具体交叉方向，不能泛化为所有工科都强。'] },
  { code:'140003TK', name:'低空技术与工程', discipline:'交叉学科', categoryCode:'1400', categoryName:'交叉学科类', directionId:'cross_frontier', isSpecial:true, isControlled:true, isNewOrRecent:true, oldCode:'083203TK', aliases:['低空技术','低空经济工程'], aiBoundary:['低空方向热词明显，需核验依托航空/无人机/交通平台和招生计划。'] },
  { code:'140004TK', name:'集成电路科学与工程', discipline:'交叉学科', categoryCode:'1400', categoryName:'交叉学科类', directionId:'electronics_ic', isSpecial:true, isControlled:true, isNewOrRecent:true, oldCode:'083204TK', aliases:['集成电路科学'], aiBoundary:['芯片方向平台要求高，需核验学院、实验条件、升学和产业资源。'] },
  { code:'140005T', name:'碳中和科学与工程', discipline:'交叉学科', categoryCode:'1400', categoryName:'交叉学科类', directionId:'electrical_energy', isSpecial:true, isNewOrRecent:true, oldCode:'083205T', aliases:['碳中和'], aiBoundary:['双碳交叉方向，需核验偏能源、环境、材料还是管理。'] },
  { code:'140006T', name:'智慧城市与空间规划', discipline:'交叉学科', categoryCode:'1400', categoryName:'交叉学科类', directionId:'civil_arch_transport', isSpecial:true, isNewOrRecent:true, oldCode:'083206T', aliases:['智慧城市'], aiBoundary:['规划+数据+城市方向，需核验培养单位和就业路径。'] },
  { code:'140007T', name:'智能医学工程', discipline:'交叉学科', categoryCode:'1400', categoryName:'交叉学科类', directionId:'medical_applied', isSpecial:true, isNewOrRecent:true, oldCode:'101011T', aliases:['智能医学工程'], aiBoundary:['工学交叉医学方向，不等同临床医学；需核验工程课程和医工平台。'] },
  { code:'140008T', name:'生物医药数据科学', discipline:'交叉学科', categoryCode:'1400', categoryName:'交叉学科类', directionId:'medical_applied', isSpecial:true, isNewOrRecent:true, oldCode:'101012T', aliases:['生物医药数据'], aiBoundary:['生物医药+数据，需核验统计/计算/生物医药课程比例。'] },
  { code:'140009T', name:'智能影像工程', discipline:'交叉学科', categoryCode:'1400', categoryName:'交叉学科类', directionId:'medical_applied', isSpecial:true, isNewOrRecent:true, oldCode:'101013T', aliases:['智能影像'], aiBoundary:['医工交叉，不等于医学影像学或医学影像技术。'] },
  { code:'140010TK', name:'医工学', discipline:'交叉学科', categoryCode:'1400', categoryName:'交叉学科类', directionId:'medical_applied', isSpecial:true, isControlled:true, isNewOrRecent:true, oldCode:'101014TK', aliases:['医工'], aiBoundary:['医工交叉，需核验工学课程、临床资源和就业去向。'] },
  { code:'140011TK', name:'医疗器械与装备工程', discipline:'交叉学科', categoryCode:'1400', categoryName:'交叉学科类', directionId:'medical_applied', isSpecial:true, isControlled:true, isNewOrRecent:true, oldCode:'101015TK', aliases:['医疗器械'], aiBoundary:['医疗器械工程方向，需核验工程平台、法规和企业实践。'] },
  { code:'140012TK', name:'具身智能', discipline:'交叉学科', categoryCode:'1400', categoryName:'交叉学科类', directionId:'cross_frontier', isSpecial:true, isControlled:true, isNewOrRecent:true, aliases:['具身智能'], aiBoundary:['2026新增前沿专业，不能按成熟计算机专业判断；需重点核验依托学院、课程和招生计划。'] },
  { code:'140013TK', name:'脑机科学与技术', discipline:'交叉学科', categoryCode:'1400', categoryName:'交叉学科类', directionId:'cross_frontier', isSpecial:true, isControlled:true, isNewOrRecent:true, aliases:['脑机接口','脑机科学'], aiBoundary:['2026新增前沿专业，缺少长期就业和录取历史，需核验医学/神经/工程平台。'] },
  { code:'140014T', name:'工程互联网', discipline:'交叉学科', categoryCode:'1400', categoryName:'交叉学科类', directionId:'cross_frontier', isSpecial:true, isNewOrRecent:true, aliases:['工程互联网'], aiBoundary:['2026新增前沿方向，需核验工业互联网、软件、工程实践平台。'] },
  { code:'140015T', name:'深地科学与工程', discipline:'交叉学科', categoryCode:'1400', categoryName:'交叉学科类', directionId:'petro_material_safety', isSpecial:true, isNewOrRecent:true, aliases:['深地科学'], aiBoundary:['2026新增方向，可能涉及地质/资源/深地工程，需核验野外/行业环境和学校平台。'] }
].map(item => ({
  mappingStatus: 'exact',
  confidence: item.isNewOrRecent ? 88 : 96,
  ...item
}));

export const STANDARD_MAJOR_CATALOG_2026_INDEX = Object.fromEntries(STANDARD_MAJOR_CATALOG_2026.map(item => [item.code, item]));

export function getMajorByCode2026(code) {
  return STANDARD_MAJOR_CATALOG_2026_INDEX[String(code || '').trim()] || null;
}

export function findMajorByName2026(name) {
  const text = String(name || '').trim();
  if (!text) return null;
  return STANDARD_MAJOR_CATALOG_2026.find(item => item.name === text || (item.aliases || []).includes(text)) || null;
}

export function searchMajorCatalog2026(keyword) {
  const text = String(keyword || '').trim();
  if (!text) return [];
  return STANDARD_MAJOR_CATALOG_2026.filter(item => item.name.includes(text) || item.code.includes(text) || (item.aliases || []).some(alias => alias.includes(text) || text.includes(alias)));
}

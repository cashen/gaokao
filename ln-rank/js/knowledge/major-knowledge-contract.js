import { matchLiaoningLocalStrongChain, formatLocalStrongChainReviewText } from './liaoning-local-strong-chain.js?v=3949_0';
function textOf(record = {}) {
  return [record.school, record.major, record.standardMajor?.name, record.standardMajor?.categoryName, record.matchReason, ...(Array.isArray(record.flags) ? record.flags : [])].filter(Boolean).join(' ');
}
function clean(value, max = 180) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, max);
}
function has(text, pattern) { return pattern.test(String(text || '')); }
function uniq(arr = []) { return [...new Set(arr.map(x => clean(x)).filter(Boolean))]; }

export const KNOWLEDGE_DATA_BOUNDARY = {
  hardData: '分数、位次、批次线属于历史硬数据参考，正式填报以当年官方发布为准。',
  methodRule: '专业复核、城市产业和行业趋势属于经验提示，只用于家庭讨论，不替代招生章程。',
  familyConfirm: '孩子方向、家庭条件和城市接受度需要家长与孩子共同确认，工具不替人拍板。'
};

export const SCHOOL_INDUSTRY_TAG_RULES = [
  { id: 'national_defense', test: /国防七子|北京航空航天|北京理工|哈尔滨工业|哈尔滨工程|南京航空航天|南京理工|西北工业/, tag: '国防/航天工科背景', note: '院校有国防、航空航天或工科行业背景，相关专业仍需看具体学院和培养方向。' },
  { id: 'electronics', test: /两电一邮|电子科技|西安电子|北京邮电|南京邮电|重庆邮电|杭州电子/, tag: '电子信息背景', note: '电子信息、通信、计算机方向可关注学校行业背景，但仍需结合专业代码和培养方向复核。' },
  { id: 'power', test: /华北电力|东北电力|上海电力|三峡大学|长沙理工|电力/, tag: '电力行业背景', note: '电气、能源动力等方向可关注电力系统背景，同时核验校区、专业方向和招聘路径。' },
  { id: 'transport', test: /交通|铁道|海事|民航|航海|大连交通|西南交通|长安大学|中国民航/, tag: '交通行业背景', note: '交通、车辆、轨道、海事、民航方向需确认学校具体行业侧重。' },
  { id: 'law', test: /政法|法学院|五院四系|中国政法|西南政法|华东政法|西北政法|中南财经政法/, tag: '法学传统背景', note: '法学方向可关注学校法学平台，同时确认法考、实习城市和考公路径。' },
  { id: 'medicine', test: /医科|药科|中医药|医学院|沈阳药科|中国药科/, tag: '医药行业背景', note: '医学、药学、医学技术方向需关注培养年限、实习医院、地域就业和执业资格。' }
];

export const SAME_MAJOR_DIFFERENCE_RULES = [
  { id: 'electronic_science', test: /电子科学与技术|微电子|集成电路/, title: '电子方向差异', note: '该方向可能偏微电子、光电、器件材料、通信或计算机融合，建议查看所在学院和课程设置。' },
  { id: 'material', test: /材料科学|材料类|高分子|粉体|冶金/, title: '材料方向差异', note: '材料类不同学校侧重差异大，可能偏航空航天材料、粉体冶金、建筑材料、高分子或汽车材料。' },
  { id: 'transport_engineering', test: /交通工程|交通运输|轨道交通|航海|海事|民航/, title: '交通方向差异', note: '交通类可能偏公路、铁路、海运、民航或城市轨道，建议确认学校行业背景。' },
  { id: 'energy_power', test: /能源与动力|能源动力|热能|动力工程|新能源科学/, title: '能源动力方向差异', note: '能源动力可能偏电厂、水动、车辆动力、船舶动力或新能源方向，建议查看培养方向。' },
  { id: 'vehicle', test: /车辆工程|新能源汽车|智能车辆/, title: '车辆方向差异', note: '车辆工程可能偏汽车、轨道车辆、新能源、仿真、内燃机或设计制造，建议确认学院和课程。' },
  { id: 'big_category', test: /工科试验班|理科试验班|试验班|实验班|拔尖|计算机类|电子信息类|自动化类|机械类|电气类|能源动力类|管理科学与工程类/, title: '大类/试验班分流', note: '大类或试验班需要确认分流规则、可选专业范围、退出机制和是否承诺具体专业。' }
];

export const MAJOR_FIELD_RULES = [
  { id: 'finance', test: /金融|经济学|金融工程|国际经济与贸易/, note: '金融/经济方向对学校层次、城市资源、数学能力和实习机会较敏感，建议生成报告前再确认。' },
  { id: 'law', test: /法学/, note: '法学要确认是否接受法考、长期备考、考公/律所/法务路径，以及学校法学平台。' },
  { id: 'education', test: /教育学|小学教育|学前教育|特殊教育|师范/, note: '教育学不等于直接当老师，需确认具体师范方向、教师资格和当地招聘要求。' },
  { id: 'literature', test: /汉语言|新闻|传播|外国语|英语|日语|翻译/, note: '文学/语言类建议确认孩子是否接受大量阅读写作、考公考编、教师或传媒路径。' },
  { id: 'science', test: /数学|物理|化学|生物科学|统计学|应用统计|心理学/, note: '理学偏基础训练，常见路径是深造、教师或转向工科/数据方向。' },
  { id: 'engineering', test: /计算机|软件|人工智能|电子|通信|自动化|电气|机械|控制|机器人工程/, note: '工科路径较清楚，但不同学校方向差异大，建议看课程设置、学院背景和城市产业环境。' },
  { id: 'medicine', test: /临床|口腔|中医|中西医|医学影像|医学检验|康复|护理|药学|麻醉/, note: '医学类需确认培养周期、规培/执业资格、地域就业、体检限制和家庭承受周期。' },
  { id: 'management', test: /工商管理|行政管理|市场营销|人力资源|会计|财务管理|审计|信息管理/, note: '管理学需区分技能型方向和泛管理方向，会计、审计、财务等路径相对更明确。' },
  { id: 'agriculture', test: /农学|园艺|动物医学|植物保护|林学|水产|草业/, note: '农学类需确认行业环境、就业地域、工作场景和是否接受深造。' },
  { id: 'architecture_civil', test: /土木|建筑学|城乡规划|给排水|工程管理/, note: '土木建筑类需重点确认行业周期、工作场景、城市和孩子接受度。' }
];

export const CITY_INDUSTRY_RULES = [
  { id: 'internet', test: /计算机|软件|人工智能|数据|网络|信息安全/, note: '城市产业提示：计算机/软件/数据方向可关注北京、深圳、杭州、成都、大连、沈阳等实习和产业环境。' },
  { id: 'chip', test: /微电子|集成电路|电子科学|半导体|光电/, note: '城市产业提示：微电子/芯片方向可关注上海、合肥、无锡、北京、南京等产业环境。' },
  { id: 'auto', test: /车辆|汽车|新能源|机械|自动化/, note: '城市产业提示：车辆、机械、自动化可关注长春、上海、广州、武汉、重庆、沈阳等产业基础。' },
  { id: 'aerospace', test: /航空|航天|飞行器|兵器|船舶|材料/, note: '城市产业提示：航空航天/船舶/材料方向可关注北京、西安、哈尔滨、成都、大连等行业环境。' },
  { id: 'medicine_city', test: /医学|药学|生物医学|护理|检验|康复/, note: '城市产业提示：医药医学方向地域属性较强，建议结合未来就业城市和实习医院资源复核。' },
  { id: 'transport_city', test: /交通|轨道|铁路|海事|航海|民航/, note: '城市产业提示：交通类需结合铁路、公路、海运、民航等具体行业场景复核。' }
];

export function buildSchoolIndustryTags(record = {}) {
  const text = textOf(record);
  return SCHOOL_INDUSTRY_TAG_RULES.filter(rule => rule.test.test(text)).map(rule => ({ tag: rule.tag, note: rule.note, source: 'school-industry' })).slice(0, 3);
}

export function buildKnowledgeReviewForRecord(record = {}, options = {}) {
  const text = textOf(record);
  const notes = [];
  const includeLocalChain = options.includeLocalChain === true;
  if (includeLocalChain) {
    const localChainText = formatLocalStrongChainReviewText(record);
    if (localChainText) notes.push(localChainText);
  }
  SAME_MAJOR_DIFFERENCE_RULES.forEach(rule => { if (has(text, rule.test)) notes.push(`同名专业复核：${rule.note}`); });
  MAJOR_FIELD_RULES.forEach(rule => { if (has(text, rule.test)) notes.push(rule.note); });
  CITY_INDUSTRY_RULES.forEach(rule => { if (has(text, rule.test)) notes.push(rule.note); });
  buildSchoolIndustryTags(record).forEach(x => notes.push(`院校背景：${x.note}`));
  if (/中外|合作办学|高收费|较高收费/.test(text)) notes.unshift('费用复核：中外合作或高收费项目需要确认学费、培养模式、校区、证书口径和家庭承受能力。');
  if (/校区|分校|秦皇岛|威海|盘锦|深圳|苏州|异地/.test(text)) notes.unshift('校区复核：涉及分校区或异地培养时，要确认实际就读地点、毕业证/学位证和转专业政策。');
  return uniq(notes).slice(0, options.limit || 6);
}

export function buildKnowledgePortfolioSummary(items = []) {
  const all = Array.isArray(items) ? items : [];
  const notes = [];
  const text = all.map(textOf).join(' ');
  const families = [
    [/计算机|软件|人工智能|数据|网络|信息安全/, '计算机/数据方向较集中，建议确认孩子是否接受编程、数学和持续学习强度。'],
    [/电气|能源动力|电力/, '电气/能源方向需要确认是否接受电力系统、工厂/现场、考证或国企招聘路径。'],
    [/医学|临床|口腔|药学|护理|检验|康复/, '医学医药方向需要确认培养周期、地域就业、体检限制和家庭承受周期。'],
    [/金融|经济|会计|财务|审计/, '经管财会方向需要确认学校层次、城市实习资源、证书考试和岗位路径。'],
    [/法学|汉语言|师范|教育/, '法学/中文/师范方向需要确认是否接受长期备考、考公考编或教师招聘路径。']
  ];
  families.forEach(([re, note]) => { if (re.test(text)) notes.push(note); });
  const sameMajorCount = all.filter(x => SAME_MAJOR_DIFFERENCE_RULES.some(rule => rule.test.test(textOf(x)))).length;
  const feeCount = all.filter(x => /中外|合作办学|高收费|较高收费|学费|费用/.test(textOf(x))).length;
  const campusCount = all.filter(x => /校区|分校|秦皇岛|威海|盘锦|异地/.test(textOf(x))).length;
  if (sameMajorCount) notes.push(`有 ${sameMajorCount} 个专业名称较宽或方向差异较大，建议重点看培养方向和课程设置。`);
  if (feeCount) notes.push(`有 ${feeCount} 个专业涉及费用或合作办学线索，需要看招生章程和学费。`);
  if (campusCount) notes.push(`有 ${campusCount} 个专业涉及校区/异地线索，需要确认实际就读地点。`);
  notes.push('本部分属于专业方向复核提示，不替代当年招生计划、招生章程和家长孩子最终确认。');
  return uniq(notes).slice(0, 8);
}

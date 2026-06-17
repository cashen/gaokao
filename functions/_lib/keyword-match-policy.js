// v3.9.7.3 关键词匹配可信度策略。
// 维护原则：前端短路径，后台分层匹配；新增词只改 policy，不改 major-bands 主流程。
// 后台 level：exact/related/industry/project/weak；前端显示人话：精准匹配/相关方向/行业关联/项目属性。

export const MATCH_LEVELS = {
  exact: { label: '精准匹配', score: 100, rank: 5 },
  related: { label: '相关方向', score: 72, rank: 4 },
  project: { label: '项目属性', score: 70, rank: 4 },
  industry: { label: '行业关联', score: 50, rank: 3 },
  weak: { label: '弱关联', score: 25, rank: 2 }
};

const REASON = {
  exact: (k) => `你搜索“${k}”，该专业名称或标准方向与关键词直接相关。`,
  related: (k) => `你搜索“${k}”，该专业属于相邻培养方向，建议结合课程和就业路径人工核验。`,
  industry: (k) => `你搜索“${k}”，学校或行业标签相关，专业本身未必是该方向核心专业。`,
  project: (k) => `你搜索“${k}”，该记录命中项目或招生属性，需核验收费、培养模式、校区和毕业证书。`,
  weak: (k) => `你搜索“${k}”，该记录仅为弱关联，不建议直接当作核心方向判断。`
};

function p({ key, type = 'major_alias', intent = '', exact = [], related = [], industry = {}, project = [], weak = [], excludeStrong = [], notes = {} }) {
  return {
    key, type, label: key, intent,
    exact: { label: MATCH_LEVELS.exact.label, score: MATCH_LEVELS.exact.score, terms: exact, reason: notes.exact || REASON.exact(key) },
    related: { label: MATCH_LEVELS.related.label, score: MATCH_LEVELS.related.score, terms: related, reason: notes.related || REASON.related(key) },
    industry: { label: MATCH_LEVELS.industry.label, score: MATCH_LEVELS.industry.score, schoolHints: industry.schoolHints || [], industryTags: industry.industryTags || [], terms: industry.terms || [], reason: notes.industry || REASON.industry(key) },
    project: { label: MATCH_LEVELS.project.label, score: MATCH_LEVELS.project.score, terms: project, reason: notes.project || REASON.project(key) },
    weak: { label: MATCH_LEVELS.weak.label, score: MATCH_LEVELS.weak.score, terms: weak, reason: notes.weak || REASON.weak(key) },
    excludeStrong
  };
}

export const KEYWORD_MATCH_POLICIES = {
  '计算机': p({ key: '计算机', intent: '计算机、软件与数字技术方向', exact: ['计算机科学与技术', '计算机类', '软件工程', '网络工程', '物联网工程', '数据科学与大数据技术', '信息安全', '网络空间安全'], related: ['人工智能', '智能科学与技术', '数字媒体技术', '区块链工程', '电子与计算机工程'], industry: { schoolHints: ['电子科技', '邮电'], industryTags: ['信息产业', '数字技术'] } }),
  '软件': p({ key: '软件', exact: ['软件工程'], related: ['计算机科学与技术', '网络工程', '数据科学与大数据技术', '人工智能'] }),
  '人工智能': p({ key: '人工智能', exact: ['人工智能', '智能科学与技术'], related: ['机器人工程', '计算机科学与技术', '软件工程', '自动化'] }),
  '电气': p({ key: '电气', intent: '电气、电网与强电方向', exact: ['电气工程及其自动化', '智能电网信息工程', '电气工程与智能控制', '电缆工程'], related: ['自动化', '测控技术与仪器', '能源与动力工程', '储能科学与工程'], industry: { schoolHints: ['电力'], industryTags: ['电力', '能源电气'] } }),
  '电力': p({ key: '电力', type: 'industry_path', intent: '电力、电网、能源电气相关路径', exact: ['电气工程及其自动化', '智能电网信息工程', '电气工程与智能控制', '电缆工程'], related: ['能源与动力工程', '新能源科学与工程', '储能科学与工程'], industry: { schoolHints: ['电力', '华北电力'], industryTags: ['电力', '能源电气'] }, weak: ['能源化学工程'], excludeStrong: ['石油工程', '油气储运工程', '采矿工程', '矿物加工工程', '资源勘查工程'], notes: { exact: '你搜索“电力”，该专业属于电气、电网或电力系统核心方向。', related: '你搜索“电力”，该专业与电力能源系统相关，但不等同于电气类专业。', industry: '学校或行业标签与电力能源方向有关，专业本身未必是电力核心专业。', weak: '该专业属于能源产业相关，但与电力、电网就业路径距离较远。' } }),
  '电子': p({ key: '电子', exact: ['电子信息工程', '电子科学与技术', '微电子科学与工程', '集成电路设计与集成系统', '光电信息科学与工程'], related: ['通信工程', '信息工程', '自动化', '测控技术与仪器'], industry: { schoolHints: ['电子科技', '邮电'], industryTags: ['电子信息', '通信'] } }),
  '通信': p({ key: '通信', exact: ['通信工程', '信息工程'], related: ['电子信息工程', '网络工程', '物联网工程', '电子科学与技术'], industry: { schoolHints: ['邮电', '电子科技'], industryTags: ['通信', '信息产业'] } }),
  '邮电': p({ key: '邮电', type: 'industry_path', exact: ['通信工程', '信息工程', '电子信息工程', '网络工程'], related: ['计算机科学与技术', '软件工程', '物联网工程'], industry: { schoolHints: ['邮电', '电子科技'], industryTags: ['通信', '信息产业'] } }),
  '自动化': p({ key: '自动化', exact: ['自动化', '机器人工程', '轨道交通信号与控制'], related: ['电气工程及其自动化', '测控技术与仪器', '智能制造工程', '机械电子工程'], industry: { industryTags: ['控制', '智能制造', '轨道交通'] } }),
  '机械': p({ key: '机械', exact: ['机械工程', '机械设计制造及其自动化', '机械电子工程', '过程装备与控制工程'], related: ['智能制造工程', '材料成型及控制工程', '车辆工程', '机器人工程'], industry: { industryTags: ['装备制造', '机械'] } }),
  '材料': p({ key: '材料', exact: ['材料科学与工程', '材料成型及控制工程', '高分子材料与工程', '金属材料工程', '无机非金属材料工程', '复合材料与工程', '新能源材料与器件'], related: ['功能材料', '材料物理', '材料化学'], industry: { industryTags: ['材料'] } }),
  '化工': p({ key: '化工', exact: ['化学工程与工艺', '应用化学', '精细化工', '能源化学工程'], related: ['制药工程', '过程装备与控制工程', '材料化学'], industry: { schoolHints: ['化工', '石油化工'], industryTags: ['化工'] } }),
  '环境': p({ key: '环境', exact: ['环境工程', '环境科学', '资源环境科学', '环保设备工程'], related: ['给排水科学与工程', '生态学', '环境生态工程'], industry: { industryTags: ['资源环境', '环保'] } }),
  '食品': p({ key: '食品', exact: ['食品科学与工程', '食品质量与安全', '食品营养与健康'], related: ['粮食工程', '乳品工程', '酿酒工程', '生物工程'], industry: { schoolHints: ['农业', '轻工', '食品'], industryTags: ['食品', '农产品加工', '轻工'] }, weak: ['生物技术', '应用化学', '化学工程与工艺'], excludeStrong: ['环境工程', '普通化工', '普通生物科学', '动物医学', '水产养殖学'], notes: { exact: '你搜索“食品”，该专业属于食品工程、食品安全或食品营养方向。', related: '你搜索“食品”，该专业与食品加工、生物发酵或食品产业相关，需要结合课程和就业方向核验。', industry: '学校或行业标签与食品、农产品加工或轻工方向相关，专业本身未必是食品类核心专业。', weak: '该专业与食品产业有一定基础学科联系，但不属于食品类核心方向。' } }),
  '生物': p({ key: '生物', exact: ['生物科学', '生物技术', '生物工程'], related: ['生物制药', '生态学', '食品科学与工程'], industry: { industryTags: ['生命科学', '生物医药', '农业生物'] }, weak: ['药学', '制药工程'], notes: { exact: '你搜索“生物”，该专业属于生物科学、生物技术或生物工程方向。', related: '“生物”是宽泛方向词，建议继续输入生物科学、生物技术、生物工程、生物制药等具体方向。', industry: '学校或学院标签与生命科学、生物医药或农业生物相关，具体专业路径需要核验。' } }),

  '动物医学': p({ key: '动物医学', exact: ['动物医学'], related: ['动物药学', '动植物检疫', '动物科学'], industry: { schoolHints: ['农业', '农林'], industryTags: ['农林', '动物健康', '兽医'] }, weak: ['生物科学', '生物技术', '水产养殖学'], excludeStrong: ['食品科学与工程', '食品质量与安全', '普通农学', '园艺', '植物保护'], notes: { exact: '你搜索“动物医学”，该专业为动物医学方向。', related: '你搜索“动物医学”，该专业与动物类培养方向相关，但不等同于动物医学，需要结合课程和就业方向核验。', industry: '学校或行业标签与农林动物方向相关，专业本身未必是动物医学。', weak: '该专业与生命科学或农业方向有一定联系，但距离动物医学较远。' } }),
  '水产': p({ key: '水产', exact: ['水产养殖学', '海洋渔业科学与技术', '水族科学与技术'], related: ['海洋科学', '海洋技术', '食品科学与工程'], industry: { schoolHints: ['海洋', '农业'], industryTags: ['水产', '海洋', '农业'] }, excludeStrong: ['普通生物', '普通食品', '普通海洋工程'], notes: { exact: '你搜索“水产”，该专业属于水产养殖或海洋渔业核心方向。', related: '你搜索“水产”，该专业与海洋、食品等方向相关，需要结合课程和就业方向核验。' } }),
  '农学': p({ key: '农学', exact: ['农学', '植物科学与技术', '种子科学与工程'], related: ['植物保护', '园艺', '设施农业科学与工程', '智慧农业'], industry: { schoolHints: ['农业', '农林'], industryTags: ['农业', '农林'] }, excludeStrong: ['所有生物', '所有食品', '所有环境'], notes: { exact: '你搜索“农学”，该专业属于农学或植物生产核心方向。', related: '你搜索“农学”，该专业与植物保护、园艺、设施农业或智慧农业相关，需要结合培养方向核验。' } }),
  '园艺': p({ key: '园艺', exact: ['园艺'], related: ['设施农业科学与工程', '植物保护', '农学'], industry: { schoolHints: ['农业', '农林'], industryTags: ['农业', '农林', '园艺'] }, excludeStrong: ['园林', '风景园林', '城乡规划'], notes: { exact: '你搜索“园艺”，该专业偏农学种植方向。', related: '你搜索“园艺”，该专业与设施农业、植物保护或农学相关，需要结合课程核验。', weak: '园艺不等于园林或风景园林，两者属于不同路径。' } }),

  '土木': p({ key: '土木', exact: ['土木工程', '智能建造', '道路桥梁与渡河工程', '给排水科学与工程', '城市地下空间工程'], related: ['建筑环境与能源应用工程', '工程管理', '工程造价'], industry: { industryTags: ['建筑土木'] } }),
  '水利': p({ key: '水利', exact: ['水利水电工程', '水文与水资源工程', '港口航道与海岸工程'], related: ['土木工程', '给排水科学与工程', '环境工程'], industry: { schoolHints: ['水利'], industryTags: ['水利'] } }),
  '测绘': p({ key: '测绘', exact: ['测绘工程', '遥感科学与技术', '地理信息科学', '导航工程'], related: ['地质工程', '资源勘查工程'], industry: { schoolHints: ['测绘', '地质'], industryTags: ['测绘', '地理信息'] } }),

  '会计': p({ key: '会计', exact: ['会计学'], related: ['财务管理', '审计学', '资产评估'], industry: { schoolHints: ['财经'], industryTags: ['财经', '商科'] }, excludeStrong: ['工商管理', '市场营销', '经济学', '金融学'], notes: { exact: '你搜索“会计”，该专业就是会计学方向。', related: '你搜索“会计”，该专业属于财务、审计等相邻财经路径。', industry: '财经类院校或商科标签相关，但专业本身未必是会计学。' } }),
  '财务': p({ key: '财务', exact: ['财务管理'], related: ['会计学', '审计学', '资产评估'], industry: { industryTags: ['财经', '商科'] } }),
  '审计': p({ key: '审计', exact: ['审计学'], related: ['会计学', '财务管理', '资产评估'], industry: { industryTags: ['财经', '商科'] } }),
  '金融': p({ key: '金融', exact: ['金融学', '金融工程', '保险学', '投资学'], related: ['经济学', '财政学', '国际经济与贸易', '会计学'], industry: { schoolHints: ['财经'], industryTags: ['财经', '金融'] } }),
  '经济': p({ key: '经济', exact: ['经济学', '经济统计学'], related: ['金融学', '国际经济与贸易', '财政学', '税收学'], industry: { industryTags: ['财经'] } }),
  '管理': p({ key: '管理', exact: ['工商管理', '公共事业管理', '行政管理', '信息管理与信息系统', '大数据管理与应用'], related: ['市场营销', '人力资源管理', '物流管理', '供应链管理', '电子商务'], notes: { exact: '你搜索“管理”，该专业属于管理学相关方向。', related: '该专业属于管理类相邻方向，需结合课程和就业路径核验。' } }),

  '医学': p({ key: '医学', intent: '医学健康宽泛方向', exact: [], related: ['临床医学', '口腔医学', '护理学', '药学', '医学影像学', '医学检验技术', '康复治疗学', '预防医学', '麻醉学'], industry: { schoolHints: ['医科', '药科', '中医药'], industryTags: ['医药', '医学健康'] }, notes: { related: '“医学”是宽泛方向词，建议继续输入临床、口腔、护理、药学、影像等具体方向。', industry: '医药类院校或医学健康标签相关，具体专业路径需要人工核验。' } }),
  '临床': p({ key: '临床', exact: ['临床医学'], related: ['麻醉学', '医学影像学', '儿科学', '精神医学'], industry: { schoolHints: ['医科'], industryTags: ['医学健康'] } }),
  '口腔': p({ key: '口腔', exact: ['口腔医学'], related: ['临床医学'], industry: { schoolHints: ['医科'], industryTags: ['医学健康'] } }),
  '护理': p({ key: '护理', exact: ['护理学', '助产学'], related: ['康复治疗学', '预防医学'], industry: { industryTags: ['护理', '医学健康'] } }),
  '药学': p({ key: '药学', exact: ['药学', '临床药学', '药物制剂', '中药学'], related: ['制药工程', '生物制药'], industry: { schoolHints: ['药科', '中医药'], industryTags: ['医药'] } }),
  '康复': p({ key: '康复', exact: ['康复治疗学', '运动康复'], related: ['护理学', '医学影像技术'], industry: { industryTags: ['医学健康'] } }),
  '影像': p({ key: '影像', exact: ['医学影像学', '医学影像技术'], related: ['医学检验技术', '临床医学'], industry: { industryTags: ['医学健康'] } }),

  '师范': p({ key: '师范', exact: ['师范', '教育学', '小学教育', '学前教育', '特殊教育'], related: ['心理学', '应用心理学', '教育技术学'], industry: { schoolHints: ['师范'], industryTags: ['师范教育'] } }),
  '教育': p({ key: '教育', exact: ['教育学', '小学教育', '学前教育', '特殊教育', '教育技术学'], related: ['心理学', '应用心理学', '体育教育'], industry: { schoolHints: ['师范'], industryTags: ['师范教育'] } }),
  '法学': p({ key: '法学', exact: ['法学'], related: ['知识产权', '政治学与行政学', '社会工作'], industry: { schoolHints: ['政法', '警察'], industryTags: ['政法', '公安司法'] } }),
  '中文': p({ key: '中文', exact: ['汉语言文学', '汉语国际教育'], related: ['新闻学', '传播学', '秘书学'], industry: { industryTags: ['文法'] } }),
  '新闻': p({ key: '新闻', exact: ['新闻学', '传播学', '网络与新媒体', '广告学'], related: ['广播电视学', '编辑出版学'], industry: { industryTags: ['新闻传播'] } }),
  '外语': p({ key: '外语', exact: ['英语', '日语', '俄语', '法语', '德语', '西班牙语', '朝鲜语', '翻译', '商务英语'], related: ['汉语国际教育'], industry: { industryTags: ['语言'] } }),

  '交通': p({ key: '交通', type: 'industry_path', exact: ['交通运输', '交通工程', '轨道交通信号与控制', '铁道工程'], related: ['车辆工程', '道路桥梁与渡河工程', '物流工程', '轨道交通信号与控制'], industry: { schoolHints: ['交通', '铁道'], industryTags: ['交通', '轨道', '铁道'] }, excludeStrong: ['普通物流管理', '普通土木工程'], notes: { exact: '你搜索“交通”，该专业属于交通运输、交通工程、轨道或铁道核心方向。', related: '你搜索“交通”，该专业与车辆、道桥、物流或控制方向相关，需要结合行业路径核验。', industry: '学校或行业标签与交通、铁道、轨道交通相关，专业本身未必是交通核心专业。' } }),
  '铁道': p({ key: '铁道', type: 'industry_path', exact: ['铁道工程', '轨道交通信号与控制', '交通运输'], related: ['车辆工程', '电气工程及其自动化', '道路桥梁与渡河工程', '轨道交通信号与控制'], industry: { schoolHints: ['铁道', '交通'], industryTags: ['铁道', '轨道交通'] } }),
  '石油': p({ key: '石油', type: 'industry_path', exact: ['石油工程', '油气储运工程', '海洋油气工程', '资源勘查工程'], related: ['能源化学工程', '过程装备与控制工程', '化工安全工程'], industry: { schoolHints: ['石油', '石油化工', '中国石油'], industryTags: ['石油', '油气', '能源化工'] }, weak: ['机械工程', '自动化'], excludeStrong: ['所有能源类', '所有机械类', '所有化工类'], notes: { exact: '你搜索“石油”，该专业属于石油、油气或资源勘查核心方向。', related: '你搜索“石油”，该专业与石油化工、过程装备等产业链相关，但不等同于石油工程。', industry: '学校或行业标签与石油、石化相关，专业本身未必是石油工程。' } }),
  '航空': p({ key: '航空', type: 'industry_path', exact: ['航空航天工程', '飞行器制造工程', '飞行器动力工程', '飞行器设计与工程', '飞行技术'], related: ['飞行器适航技术', '无人驾驶航空器系统工程', '导航工程'], industry: { schoolHints: ['航空', '航天', '民航'], industryTags: ['航空航天', '民航'] } }),
  '航天': p({ key: '航天', type: 'industry_path', exact: ['航空航天工程', '飞行器设计与工程', '飞行器制造工程', '飞行器动力工程'], related: ['飞行器适航技术', '无人驾驶航空器系统工程', '导航工程'], industry: { schoolHints: ['航空', '航天'], industryTags: ['航空航天', '国防军工'] } }),

  '中外': p({ key: '中外', type: 'project_attribute', project: ['中外', '中外合作', '合作办学', '较高收费', '高收费'], notes: { project: '该项目含中外合作、合作办学、较高收费或高收费信息，需要核验学费、培养模式、毕业证书和校区。' } }),
  '高收费': p({ key: '高收费', type: 'project_attribute', project: ['高收费', '较高收费', '中外合作', '合作办学'], notes: { project: '该项目含高收费或较高收费信息，需要核验学费、培养模式和家庭承受能力。' } }),
  '公费师范': p({ key: '公费师范', type: 'project_attribute', project: ['公费师范', '国家公费师范', '地方公费师范'], notes: { project: '该记录命中公费师范项目属性，需要核验履约、就业地域和培养要求。' } }),
  '定向': p({ key: '定向', type: 'project_attribute', project: ['定向', '定向就业', '定向培养'], notes: { project: '该记录命中定向项目属性，需要核验服务期、就业地域和协议要求。' } })
};

export function normalizePolicyKey(value) {
  return String(value || '').trim().replace(/\s+/g, '').toLowerCase();
}

export function getKeywordMatchPolicy(word) {
  return KEYWORD_MATCH_POLICIES[normalizePolicyKey(word)] || null;
}

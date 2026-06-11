// v3.9.29 知识库合同层（服务端报告构建使用）
function clean(value, max = 180) { return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, max); }
function unique(list = []) { const seen = new Set(); const out = []; for (const item of list) { const text = clean(item); if (!text || seen.has(text)) continue; seen.add(text); out.push(text); } return out; }
function textOf(record = {}) { return [record.school, record.major, record.standardMajor?.name, record.standardMajor?.categoryName, record.displayLocation, record.geoEntity, record.natureLabel, record.matchReason, ...(Array.isArray(record.flags) ? record.flags : []), ...(Array.isArray(record.schoolTags) ? record.schoolTags : [])].filter(Boolean).join(' '); }
function majorText(record = {}) { return [record.major, record.standardMajor?.name, record.standardMajor?.categoryName].filter(Boolean).join(' '); }
const RULES = [
  [/工科试验班|理科试验班|实验班|试验班|拔尖班|本博|本研/, '试验班/大类招生：重点确认分流规则、可选专业范围、退出机制，以及是否承诺具体专业。'],
  [/计算机类|软件工程|人工智能|数据科学|网络工程|信息安全|物联网/, '计算机相关方向：确认具体包含专业、分流规则、课程强度，以及孩子是否接受长期编程和数学/算法训练。'],
  [/电子科学与技术|电子信息|通信工程|微电子|集成电路|光电信息/, '电子信息/电子科学方向较宽：建议确认偏微电子、光电、通信、材料器件，还是计算机融合方向。'],
  [/材料科学|材料类|高分子|无机非金属|新能源材料|冶金/, '材料类差异较大：建议确认该校偏航空航天材料、高分子、建筑材料、冶金、汽车材料还是新能源材料。'],
  [/交通工程|交通运输|轨道交通|航海|海事|民航/, '交通类专业方向差异明显：建议确认偏公路、铁路、海运、民航，还是城市轨道交通。'],
  [/能源与动力|能源动力|新能源科学|储能|热能|动力工程/, '能源动力类需要看学校侧重：可能偏电力系统、水动、内燃机、船舶动力或新能源方向。'],
  [/车辆工程|新能源汽车|智能车辆/, '车辆工程建议确认学校偏汽车、轨道车辆、新能源、车辆仿真，还是设计制造方向。'],
  [/金融|经济学|金融工程|国际经济与贸易|投资学|保险学/, '经济/金融类对学校层次、城市资源、数学能力和实习机会较敏感，建议生成前重点复核。'],
  [/法学|知识产权|政治学|公安学/, '法学类建议确认是否接受法考、长期备考、考公/律所/企业法务路径，以及学校法学平台。'],
  [/教育学|小学教育|学前教育|特殊教育|师范/, '教育学不等于直接当老师，师范/教育方向需确认具体学科、教师资格、当地招聘和编制机会。'],
  [/临床医学|口腔医学|中医学|中西医|预防医学|医学影像学|麻醉学/, '医学核心方向地域属性强、培养周期长，建议确认规培、执业资格、读研压力和家庭承受周期。'],
  [/护理|医学检验|医学影像技术|康复治疗|药学|中药学/, '护理、检验、影像技术、康复、药学等方向路径不同，不能和临床医学混看，需查培养目标和就业场景。'],
  [/工商管理|行政管理|人力资源|市场营销|旅游管理|公共事业管理/, '纯管理类建议重点复核技能路径、实习资源和学校平台，避免只按“管理”二字理解。'],
  [/会计|财务管理|审计/, '财会/审计类路径相对清楚，但要确认孩子是否接受证书考试、细致重复工作和考公/企业财务路径。']
];
const SCHOOL_RULES = [
  [/电力|华北电力|东北电力|上海电力|三峡大学|长沙理工/, '电力行业背景：适合解释电气、能源动力等方向，但需查具体专业和校招路径。'],
  [/邮电|电子科技|西安电子|北京邮电|南京邮电|重庆邮电|桂林电子|杭州电子/, '电子信息背景：适合解释通信、电子、计算机相关方向，仍需看具体专业侧重。'],
  [/交通|铁道|海事|民航|航海|飞行学院/, '交通行业背景：适合解释轨道、公路、海运、民航等方向，需看培养方向。'],
  [/医科|药科|中医药|医学|沈阳药科|中国药科/, '医药行业背景：可作为医学、药学、医学技术方向的背景说明，不能替代培养年限和地域复核。'],
  [/航空|航天|哈尔滨工业|北京航空航天|南京航空航天|西北工业|哈尔滨工程|国防七子/, '国防工科背景：可解释材料、控制、自动化、船舶等方向，需看具体学院。']
];
const CITY_RULES = [
  [/辽宁|沈阳|大连|鞍山|锦州|营口|盘锦|抚顺|本溪|丹东|辽阳|铁岭|朝阳|葫芦岛/, '辽宁省内：适合重点复核省内就业、离家距离、生活成本，以及沈阳/大连等城市产业基础。'],
  [/长春|吉林/, '吉林/长春：车辆、机械、光学、装备制造等方向可结合城市产业背景复核。'],
  [/哈尔滨|黑龙江/, '哈尔滨/黑龙江：工科、航空航天、装备制造、船舶等方向可结合学校行业背景复核。'],
  [/北京|天津|河北|秦皇岛|石家庄/, '京津冀：院校密度和实习信息较多，但生活成本、竞争压力和距离需要家庭确认。'],
  [/上海|江苏|南京|苏州|无锡|浙江|杭州|宁波|合肥|安徽/, '长三角：电子信息、智能制造、医药、互联网等机会多，距离辽宁较远，需确认孩子是否接受。'],
  [/广东|广州|深圳|佛山|东莞|珠海/, '珠三角：制造业、电子信息、互联网、外贸相关机会多，气候、距离和生活成本需复核。']
];
export function buildKnowledgeReviewPoints(record = {}, options = {}) { const text = textOf(record); const major = majorText(record) || text; const out = []; for (const [re, point] of RULES) if (re.test(major) || re.test(text)) out.push(point); return unique(out).slice(0, options.limit || 5); }
export function buildKnowledgeSignalsForRecord(record = {}, options = {}) { const text = textOf(record); const out = [...buildKnowledgeReviewPoints(record, { limit: 3 })]; for (const [re, point] of SCHOOL_RULES) if (re.test(text)) out.push(point); for (const [re, point] of CITY_RULES) if (re.test(text)) out.push(point); return unique(out).slice(0, options.limit || 4); }
export function buildKnowledgeReportLines(items = [], options = {}) { const records = Array.isArray(items) ? items : []; const lines = records.flatMap(item => buildKnowledgeSignalsForRecord(item, { limit: 3 })); if (records.some(item => /工科试验班|理科试验班|实验班|试验班|计算机类|电子信息类|机械类|材料类|能源动力类|交通运输类/.test(majorText(item)))) lines.unshift('大类/试验班提醒：这些专业名称较宽，报告只做初选，必须查看分流规则、培养方向和招生计划备注。'); if (records.some(item => /临床医学|口腔医学|中医学|医学影像学|麻醉学/.test(majorText(item)))) lines.unshift('医学方向提醒：医学类培养周期和地域属性较强，需确认规培、读研、执业资格和未来就业地。'); return unique(lines).slice(0, options.limit || 8); }
export const KNOWLEDGE_CONTRACT_VERSION = 'v3.9.29-knowledge-contract';

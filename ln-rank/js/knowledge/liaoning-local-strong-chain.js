/* v3.9.33.12 辽宁院校专业背景合同
 * 作用：识别辽宁本地院校中“本校方向 / 本校相关”的专业组合。
 * 注意：该提示只表示学校历史、专业方向、行业路径有背景关联，不是录取判断，不替代招生章程。
 */
import { resolveMajorCodes } from './major-code-resolver.js?v=3949_0';
import { candidateMajorNames as buildCandidateMajorNames, matchMajorList as matchMajorListContract, matchSchoolByRule } from './major-match-contract.js?v=3949_0';
function clean(value, max = 200) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, max);
}
function stripMarks(value) {
  return clean(value, 240)
    .replace(/[（(].*?[）)]/g, '')
    .replace(/\s+/g, '')
    .trim();
}
function normalizeSchoolName(value) {
  return clean(value, 120).replace(/（.*?）/g, '').replace(/\(.*?\)/g, '').replace(/\s+/g, '');
}
function normalizeMajorName(value) {
  return stripMarks(value);
}
function catalogCodeFromRecord(record = {}) {
  return resolveMajorCodes(record).catalogCode;
}
function textOf(record = {}) {
  return [record.school, record.schoolName, record.major, record.majorName, record.rawMajorName, record.standardMajor?.name, record.standardMajor?.categoryName, record.matchReason, ...(Array.isArray(record.flags) ? record.flags : [])].filter(Boolean).join(' ');
}
function unique(arr = []) {
  return [...new Set(arr.map(x => clean(x, 120)).filter(Boolean))];
}
function major(name, catalogCode = '') { return { name, catalogCode }; }

export const LOCAL_CHAIN_COPY = {
  coreS: '本校方向',
  supportS: '本校相关',
  coreA: '本校方向',
  supportA: '本校相关',
  boundary: '该提示不是录取判断，也也不代表一定适合孩子；只提醒家长再看课程方向、就业场景和招生章程。'
};

export const LIAONING_LOCAL_STRONG_CHAINS = [
  {
    school: '沈阳工程学院', schoolAliases: ['沈工院'], province: '辽宁', city: '沈阳', tier: 'S', chainName: '能源电力方向',
    coreMajors: [major('电气工程及其自动化','080601'), major('智能电网信息工程','080602T'), major('能源与动力工程','080501'), major('新能源科学与工程','080503T'), major('储能科学与工程','080504T')],
    supportMajors: [major('自动化','080801'), major('测控技术与仪器','080301'), major('机器人工程','080803T')],
    reviewPoints: ['国家电网', '电厂', '新能源企业', '储能', '自动化控制', '考证', '校招路径'],
    cardTip: '该专业与沈阳工程学院能源电力主线高度一致，建议重点复核国家电网、电厂、新能源企业、储能、自动化控制等路径。',
    reportTip: '该专业属于辽宁属地院校的能源电力主干方向。它不是简单“热门电气”标签，而是学校办学底盘与行业路径相对一致的专业组合。'
  },
  {
    school: '辽宁石油化工大学', schoolAliases: ['辽石化', '辽宁石化'], province: '辽宁', city: '抚顺', tier: 'S', chainName: '石油化工储运方向',
    coreMajors: [major('油气储运工程','081504'), major('石油工程','081502'), major('化学工程与工艺','081301'), major('能源化学工程','081304T'), major('过程装备与控制工程','080206')],
    supportMajors: [major('应用化学','070302'), major('自动化','080801'), major('测控技术与仪器','080301'), major('安全工程','082901'), major('环境工程','082502')],
    reviewPoints: ['油气管道', '炼化企业', '储运工程', '能源化工企业', '行业环境', '工作地点'],
    cardTip: '该专业与辽宁石油化工大学石油、化工、储运行业背景高度一致，建议重点复核油气管道、炼化企业、储运工程、能源化工企业、行业环境和工作地点。',
    reportTip: '该专业不一定是大众热门，但学校专业匹配度较高。如果孩子能接受能源化工行业环境、工作地点和企业类型，建议作为家庭讨论重点。'
  },
  {
    school: '大连交通大学', schoolAliases: ['大连交大'], province: '辽宁', city: '大连', tier: 'S', chainName: '轨道交通装备方向',
    coreMajors: [major('车辆工程','080207'), major('交通运输','081801'), major('交通工程','081802'), major('轨道交通信号与控制','080802T'), major('机械工程','080201'), major('机械电子工程','080204')],
    supportMajors: [major('电气工程及其自动化','080601'), major('自动化','080801'), major('材料成型及控制工程','080203'), major('焊接技术与工程','080411T')],
    reviewPoints: ['铁路局', '中车', '轨道装备', '地铁交通', '车辆制造', '交通运营'],
    cardTip: '车辆、交通运输、轨道信号、机械、电气自动化等方向与学校轨道交通背景高度相关，建议复核铁路局、中车、轨道装备、地铁交通、交通运营等路径。',
    reportTip: '该专业属于轨道交通装备链条中的学校主干或支撑方向，价值不只在专业名称，还在学校行业背景与就业场景的匹配。'
  },
  {
    school: '沈阳航空航天大学', schoolAliases: ['沈航'], province: '辽宁', city: '沈阳', tier: 'S', chainName: '航空航天制造方向',
    coreMajors: [major('飞行器设计与工程','082002'), major('飞行器制造工程','082003'), major('飞行器动力工程','082004'), major('飞行器质量与可靠性','082006T'), major('探测制导与控制技术','082103')],
    supportMajors: [major('机械设计制造及其自动化','080202'), major('自动化','080801'), major('测控技术与仪器','080301'), major('材料成型及控制工程','080203'), major('复合材料与工程','080408')],
    reviewPoints: ['航空制造', '沈飞', '航发', '无人机', '通航', '国防工业相关路径'],
    cardTip: '飞行器、航空制造、测控、材料、自动化等方向与学校航空航天主线高度匹配，建议复核航空制造、沈飞、航发、无人机、通航、国防工业相关路径。',
    reportTip: '该专业与辽宁航空航天制造产业链有较强关联，建议结合孩子是否接受工科强度、制造业环境和行业路径复核。'
  },
  {
    school: '沈阳工业大学', schoolAliases: ['沈工大'], province: '辽宁', city: '沈阳', tier: 'S', chainName: '电机电器与装备制造方向',
    coreMajors: [major('电气工程及其自动化','080601'), major('机械设计制造及其自动化','080202'), major('自动化','080801'), major('测控技术与仪器','080301')],
    supportMajors: [major('材料成型及控制工程','080203'), major('焊接技术与工程','080411T'), major('工业工程','120701'), major('机器人工程','080803T')],
    reviewPoints: ['沈阳装备制造', '智能制造', '电机电器', '工业控制', '自动化系统'],
    cardTip: '该专业与沈阳工业大学电机电器、装备制造、工业自动化底盘较匹配，建议结合沈阳装备制造、智能制造、电机电器、工业控制路径复核。',
    reportTip: '该专业属于沈阳工业大学的装备制造与电机电器背景方向，和沈阳工程学院的能源电力应用路径应区分看。'
  },
  {
    school: '辽宁科技大学', schoolAliases: ['辽科大'], province: '辽宁', city: '鞍山', tier: 'S', chainName: '冶金材料方向',
    coreMajors: [major('冶金工程','080404'), major('无机非金属材料工程','080406'), major('材料科学与工程','080401'), major('材料成型及控制工程','080203')],
    supportMajors: [major('能源与动力工程','080501'), major('自动化','080801'), major('机械工程','080201'), major('矿物加工工程','081503')],
    reviewPoints: ['钢铁冶金', '新材料', '装备制造', '工业自动化', '鞍山产业背景'],
    cardTip: '冶金、材料、无机非金属、材料成型等方向与鞍山钢铁、冶金材料产业背景高度相关，建议复核钢铁冶金、新材料、装备制造、工业自动化路径。',
    reportTip: '该专业不属于泛热门，但学校与区域产业背景匹配度高，适合在能接受工业场景的前提下重点讨论。'
  },
  {
    school: '辽宁工程技术大学', schoolAliases: ['辽工程', '辽工大'], province: '辽宁', city: '阜新/葫芦岛', tier: 'S', chainName: '矿业安全测绘方向',
    coreMajors: [major('采矿工程','081501'), major('安全工程','082901'), major('测绘工程','081201'), major('地质工程','081401'), major('矿物加工工程','081503'), major('遥感科学与技术','081202')],
    supportMajors: [major('地理信息科学','070504'), major('土木工程','081001'), major('机械工程','080201'), major('电气工程及其自动化','080601')],
    reviewPoints: ['能源矿山', '安全监管', '工程测绘', '地理信息', '地下空间', '行业环境'],
    cardTip: '采矿、安全、测绘、地质、遥感、矿物加工等方向与学校矿业工程底盘高度相关，建议复核能源矿山、安全监管、工程测绘、地理信息、地下空间等路径。',
    reportTip: '该专业路径清楚但工作环境差异较大，建议和孩子确认是否接受行业场景。'
  },
  {
    school: '沈阳建筑大学', schoolAliases: ['沈建大'], province: '辽宁', city: '沈阳', tier: 'S', chainName: '建筑土木市政方向',
    coreMajors: [major('建筑学','082801'), major('城乡规划','082802'), major('风景园林','082803'), major('土木工程','081001'), major('给排水科学与工程','081003'), major('建筑环境与能源应用工程','081002'), major('道路桥梁与渡河工程','081006T')],
    supportMajors: [major('工程管理','120103'), major('工程造价','120105'), major('智能建造','081008T')],
    reviewPoints: ['设计院', '施工单位', '市政', '公用事业', '造价咨询', '城市更新', '行业周期'],
    cardTip: '建筑、土木、给排水、建环、工程管理、智能建造等方向与学校建设行业背景匹配。行业冷热需要复核，但学校专业命中度较高。',
    reportTip: '该专业与学校建设行业主线一致，但土木建筑行业冷热、工作场景和城市接受度需要额外复核。'
  },
  {
    school: '沈阳药科大学', schoolAliases: ['沈药'], province: '辽宁', city: '沈阳', tier: 'S', chainName: '药学制药方向',
    coreMajors: [major('药学','100701'), major('药物制剂','100702'), major('临床药学','100703TK'), major('药物分析','100705T'), major('药物化学','100706T'), major('中药学','100801'), major('制药工程','081302')],
    supportMajors: [major('生物制药','083002T'), major('生物医学工程','082601'), major('医疗产品管理','120412T')],
    reviewPoints: ['药企研发', '注册', '质量', '生产', '医院药学', '继续深造'],
    cardTip: '药学、药物制剂、制药工程、药物分析、中药学等方向与学校药科底盘高度匹配，建议复核药企研发、注册、质量、生产、医院药学、继续深造路径。',
    reportTip: '该专业属于沈阳药科大学的药学制药主干方向，建议结合孩子是否接受化学/生物基础、继续深造和医药行业路径复核。'
  },
  {
    school: '中国医科大学', schoolAliases: ['中国医大'], province: '辽宁', city: '沈阳', tier: 'A', chainName: '医学临床方向',
    coreMajors: [major('临床医学','100201K'), major('口腔医学','100301K'), major('麻醉学','100202TK'), major('医学影像学','100203TK'), major('儿科学','100207TK')],
    supportMajors: [major('预防医学','100401K'), major('法医学','100901K'), major('医学检验技术','101001'), major('护理学','101101')],
    reviewPoints: ['培养周期', '规培', '执业资格', '地域就业', '附属医院平台', '体检限制'],
    cardTip: '医学类需重点复核培养周期、规培、执业资格、地域就业、附属医院平台、体检限制和家庭承受周期。',
    reportTip: '该专业属于辽宁医学临床路径，学校专业匹配度较高，但培养周期和执业路径必须提前确认。'
  },
  {
    school: '大连医科大学', schoolAliases: ['大医'], province: '辽宁', city: '大连', tier: 'A', chainName: '医学临床与口腔方向',
    coreMajors: [major('临床医学','100201K'), major('口腔医学','100301K'), major('麻醉学','100202TK'), major('医学影像学','100203TK')],
    supportMajors: [major('预防医学','100401K'), major('医学检验技术','101001'), major('药学','100701'), major('护理学','101101')],
    reviewPoints: ['培养周期', '规培', '执业资格', '地域就业', '附属医院平台', '体检限制'],
    cardTip: '医学类需重点复核培养周期、规培、执业资格、地域就业、附属医院平台、体检限制和家庭承受周期。',
    reportTip: '该专业属于辽宁医学临床与口腔特色线索，需要结合培养周期、医院平台和孩子承受度复核。'
  },
  {
    school: '锦州医科大学', schoolAliases: ['锦医'], province: '辽宁', city: '锦州', tier: 'A', chainName: '区域医学方向',
    coreMajors: [major('临床医学','100201K'), major('口腔医学','100301K'), major('麻醉学','100202TK'), major('医学影像学','100203TK')],
    supportMajors: [major('动物医学','090401'), major('预防医学','100401K'), major('护理学','101101')],
    reviewPoints: ['区域医学就业', '培养周期', '规培', '执业资格', '体检限制'],
    cardTip: '该专业属于辽宁区域医学路径，建议复核培养周期、规培、地域就业、体检限制和家庭承受周期。',
    reportTip: '该专业有区域医学路径特征，适合在明确接受医学周期和就业地域的前提下讨论。'
  },
  {
    school: '沈阳化工大学', schoolAliases: ['沈化'], province: '辽宁', city: '沈阳', tier: 'A', chainName: '化工材料过程装备方向',
    coreMajors: [major('化学工程与工艺','081301'), major('应用化学','070302'), major('高分子材料与工程','080407'), major('过程装备与控制工程','080206'), major('能源化学工程','081304T')],
    supportMajors: [major('制药工程','081302'), major('材料科学与工程','080401'), major('安全工程','082901'), major('环境工程','082502')],
    reviewPoints: ['化工园区', '材料企业', '制药企业', '环保安全岗位', '行业环境'],
    cardTip: '化工、应用化学、高分子、过程装备、制药、安全环境等方向与学校化工底色匹配，建议复核化工园区、材料企业、制药企业、环保安全岗位路径。',
    reportTip: '该专业属于辽宁化工材料特色线索，需要结合行业环境、工作地点和孩子接受度复核。'
  },
  {
    school: '大连工业大学', schoolAliases: ['大连工大'], province: '辽宁', city: '大连', tier: 'A', chainName: '食品轻工设计方向',
    coreMajors: [major('食品科学与工程','082701'), major('食品质量与安全','082702'), major('生物工程','083001'), major('轻化工程','081701')],
    supportMajors: [major('包装工程','081702'), major('高分子材料与工程','080407'), major('服装设计与工程','081602'), major('产品设计','130504'), major('环境设计','130503')],
    reviewPoints: ['食品企业', '轻工制造', '包装材料', '设计产业', '生产质量管理'],
    cardTip: '食品、轻工、包装、生物工程、服装设计与工程等方向与学校传统特色更匹配，建议复核食品企业、轻工制造、包装材料、设计产业路径。',
    reportTip: '该专业属于辽宁食品轻工设计特色线索，建议结合孩子是否接受食品/轻工行业和就业城市复核。'
  },
  {
    school: '东北财经大学', schoolAliases: ['东财'], province: '辽宁', city: '大连', tier: 'A', chainName: '财经管理方向',
    coreMajors: [major('会计学','120203K'), major('财务管理','120204'), major('审计学','120207'), major('财政学','020201K'), major('税收学','020202'), major('金融学','020301K'), major('金融工程','020302'), major('经济统计学','020102')],
    supportMajors: [major('数据科学与大数据技术','080910T'), major('工商管理','120201K'), major('资产评估','120208')],
    reviewPoints: ['学校层次', '城市实习资源', '数学能力', '证书路径', '家庭资源', '岗位竞争'],
    cardTip: '东财财经管理底盘强，但金融、经管类仍需复核学校层次、城市实习资源、数学能力、证书路径和家庭资源。',
    reportTip: '该专业属于辽宁财经管理特色线索，不能简单等同于好就业，仍需看实习、证书、城市和孩子能力。'
  },
  {
    school: '大连海事大学', schoolAliases: ['海大', '大连海事'], province: '辽宁', city: '大连', tier: 'A', chainName: '航运海事方向',
    coreMajors: [major('航海技术','081803K'), major('轮机工程','081804K'), major('船舶电子电气工程','081808TK'), major('交通运输','081801'), major('交通管理','120407T'), major('海事管理','120408T')],
    supportMajors: [major('物流工程','120602'), major('法学','030101K'), major('电子信息工程','080701'), major('通信工程','080703')],
    reviewPoints: ['身体条件', '海上工作接受度', '航运行业环境', '就业地域', '交通运输路径'],
    cardTip: '航海、轮机、海事、交通运输、海商法等方向与学校航运背景高度匹配，但需复核身体条件、海上工作接受度、行业环境和就业地域。',
    reportTip: '该专业属于辽宁航运海事特色线索，专业行业性强，必须结合身体条件和职业场景复核。'
  }
];

function displayLabel(tier, depth) {
  if (depth === 'core') return tier === 'S' ? LOCAL_CHAIN_COPY.coreS : LOCAL_CHAIN_COPY.coreA;
  return tier === 'S' ? LOCAL_CHAIN_COPY.supportS : LOCAL_CHAIN_COPY.supportA;
}
function matchSchool(chain, schoolName) {
  return matchSchoolByRule(chain, schoolName);
}
function candidateMajorNames(record = {}) {
  return buildCandidateMajorNames(record);
}
function matchMajorList(list = [], candidateNames, catalogCode) {
  return matchMajorListContract(list, candidateNames, catalogCode);
}
function buildResult(chain, hit, depth) {
  const label = displayLabel(chain.tier, depth);
  const reviewPoints = unique([...(chain.reviewPoints || [])]).slice(0, 8);
  return {
    matched: true,
    tier: chain.tier,
    depth,
    school: chain.school,
    city: chain.city || '',
    chainName: chain.chainName,
    displayLabel: label,
    matchedMajor: hit?.name || '',
    catalogCode: hit?.catalogCode || '',
    confidence: hit?.confidence || 'ruleName',
    matchBy: hit?.matchBy || 'baseMajorName',
    reviewPoints,
    reviewText: reviewPoints.length ? reviewPoints.join(' / ') : '招生章程、培养方向和就业路径需复核',
    cardTip: chain.cardTip,
    reportTip: chain.reportTip,
    boundary: LOCAL_CHAIN_COPY.boundary
  };
}

export function matchLiaoningLocalStrongChain(record = {}) {
  const schoolName = record.schoolName || record.school || '';
  const candidateNames = candidateMajorNames(record);
  const catalogCode = catalogCodeFromRecord(record);
  if (!schoolName || !candidateNames.size) return null;
  for (const chain of LIAONING_LOCAL_STRONG_CHAINS) {
    if (!matchSchool(chain, schoolName)) continue;
    const coreHit = matchMajorList(chain.coreMajors, candidateNames, catalogCode);
    if (coreHit) return buildResult(chain, coreHit, 'core');
    const supportHit = matchMajorList(chain.supportMajors, candidateNames, catalogCode);
    if (supportHit) return buildResult(chain, supportHit, 'support');
  }
  return null;
}

export function formatLocalStrongChainReviewText(record = {}) {
  const hit = record.localStrongChain?.matched ? record.localStrongChain : matchLiaoningLocalStrongChain(record);
  if (!hit) return '';
  return `${hit.displayLabel}：${hit.chainName}。建议复核：${hit.reviewText}。`;
}

export function buildLocalStrongChainSummary(items = []) {
  const hits = (Array.isArray(items) ? items : [])
    .map(item => ({ item, hit: item?.localStrongChain?.matched ? item.localStrongChain : matchLiaoningLocalStrongChain(item) }))
    .filter(x => x.hit);
  const core = hits.filter(x => x.hit.depth === 'core');
  const support = hits.filter(x => x.hit.depth === 'support');
  const lines = hits.slice(0, 8).map(({ item, hit }) => `${item.school || hit.school} · ${item.major || hit.matchedMajor} · ${hit.chainName}`);
  return {
    total: hits.length,
    coreCount: core.length,
    supportCount: support.length,
    hits,
    lines,
    summaryText: hits.length
      ? `已选专业中，有 ${core.length} 个属于本校方向，${support.length} 个属于本校相关。这类提示不是录取判断，只说明专业和学校办学背景、行业方向关联较强，建议作为家庭讨论重点复核。`
      : ''
  };
}

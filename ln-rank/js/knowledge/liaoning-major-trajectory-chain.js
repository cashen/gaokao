/* v3.9.33.12 辽宁院校专业后向轨迹合同
 * 作用：识别“同名专业在不同辽宁院校里，后续学习、实验室、实习、校招可能偏向的行业场景”。
 * 前台只显示短提示；完整解释只进入生成前确认和报告。
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
function normalizeMajorName(value) { return stripMarks(value); }
function catalogCodeFromRecord(record = {}) {
  return resolveMajorCodes(record).catalogCode;
}
function unique(arr = []) { return [...new Set(arr.map(x => clean(x, 120)).filter(Boolean))]; }
function major(name, catalogCode = '') { return { name, catalogCode }; }

export const TRAJECTORY_COPY = {
  displayLabel: '方向提醒',
  boundary: '该提示不是录取判断，也不代表就业结果承诺，只帮助理解专业在该校可能面对的学习、实习和行业场景。'
};

export const LIAONING_MAJOR_TRAJECTORY_CHAINS = [
  {
    school: '沈阳农业大学', schoolAliases: ['沈农', '沈阳农大'], tier: 'A', trajectoryName: '农机与智能农业装备', cardShort: '农机装备', selectionShort: '农机装备｜再看课程 / 校招',
    matchMajors: [major('机械设计制造及其自动化','080202'), major('农业机械化及其自动化','082302'), major('农业工程','082301'), major('电气工程及其自动化','080601'), major('自动化','080801'), major('农业建筑环境与能源工程','082304')],
    reviewPoints: ['课程方向', '实验室', '实习单位', '校招岗位', '农机/智能装备方向', '考研方向'],
    reportTip: '同样叫机械、自动化或电气，在沈阳农业大学的工程背景下，后续学习、实验室、实习和校招可能更容易与农机装备、智能农业装备、设施农业装备、农产品处理装备等场景关联。建议不要只按普通机械或普通电气理解。'
  },
  {
    school: '大连交通大学', schoolAliases: ['大连交大'], tier: 'S', trajectoryName: '轨道交通装备', cardShort: '轨道交通装备', selectionShort: '轨道交通装备｜再看行业路径 / 工作场景',
    matchMajors: [major('机械工程','080201'), major('机械电子工程','080204'), major('机械设计制造及其自动化','080202'), major('车辆工程','080207'), major('交通运输','081801'), major('交通工程','081802'), major('轨道交通信号与控制','080802T'), major('电气工程及其自动化','080601'), major('自动化','080801'), major('材料成型及控制工程','080203'), major('焊接技术与工程','080411T')],
    reviewPoints: ['中车', '轨道装备', '铁路局', '地铁交通', '车辆制造', '交通运营'],
    reportTip: '同样叫机械、电气、自动化或材料，在大连交通大学更容易与轨道交通装备、车辆制造、轨道信号、铁路/地铁运营维护等场景关联。建议复核孩子是否接受轨道交通行业路径。'
  },
  {
    school: '沈阳化工大学', schoolAliases: ['沈化'], tier: 'A', trajectoryName: '化工过程装备', cardShort: '化工过程装备', selectionShort: '化工装备｜再看现场环境 / 安全要求',
    matchMajors: [major('过程装备与控制工程','080206'), major('机械设计制造及其自动化','080202'), major('自动化','080801'), major('测控技术与仪器','080301'), major('化学工程与工艺','081301'), major('安全工程','082901'), major('环境工程','082502'), major('能源化学工程','081304T')],
    reviewPoints: ['化工装置', '过程装备', '生产控制', '安全环保', '装置现场', '行业环境'],
    reportTip: '该校机械、自动化、测控等方向可能更多服务于化工装置、过程装备、生产控制、安全环保等场景。建议复核是否接受化工企业、装置现场、过程控制和安全管理相关路径。'
  },
  {
    school: '沈阳工业大学', schoolAliases: ['沈工大'], tier: 'S', trajectoryName: '电机电器与装备制造', cardShort: '装备制造', selectionShort: '装备制造｜再看装备路径 / 工业控制',
    matchMajors: [major('电气工程及其自动化','080601'), major('机械设计制造及其自动化','080202'), major('自动化','080801'), major('测控技术与仪器','080301'), major('材料成型及控制工程','080203'), major('焊接技术与工程','080411T'), major('机器人工程','080803T')],
    reviewPoints: ['电机电器', '装备制造', '工业自动化', '智能制造', '工业控制'],
    reportTip: '该校电气、机械、自动化、材料成型方向更容易与电机电器、装备制造、工业自动化、智能制造场景关联。它和沈阳工程学院的能源电力路径不同，不能简单都按“电气热门”理解。'
  },
  {
    school: '辽宁科技大学', schoolAliases: ['辽科大'], tier: 'S', trajectoryName: '冶金材料与工业装备', cardShort: '冶金工业装备', selectionShort: '冶金工业装备｜再看工厂环境 / 行业周期',
    matchMajors: [major('冶金工程','080404'), major('无机非金属材料工程','080406'), major('材料科学与工程','080401'), major('材料成型及控制工程','080203'), major('机械工程','080201'), major('自动化','080801'), major('能源与动力工程','080501'), major('矿物加工工程','081503')],
    reviewPoints: ['冶金', '钢铁', '新材料', '工业装备', '生产线自动化', '工厂现场'],
    reportTip: '该校机械、自动化、材料等方向容易与冶金、钢铁、新材料、工业装备、生产线自动化等场景关联。建议复核是否接受钢铁冶金、新材料、工厂现场或工业自动化路径。'
  },
  {
    school: '沈阳建筑大学', schoolAliases: ['沈建大'], tier: 'S', trajectoryName: '建筑土木市政', cardShort: '建筑土木市政', selectionShort: '建筑土木市政｜再看行业周期 / 项目现场',
    matchMajors: [major('建筑学','082801'), major('城乡规划','082802'), major('土木工程','081001'), major('给排水科学与工程','081003'), major('建筑环境与能源应用工程','081002'), major('工程管理','120103'), major('工程造价','120105'), major('智能建造','081008T'), major('机械设计制造及其自动化','080202'), major('电气工程及其自动化','080601')],
    reviewPoints: ['建筑工程', '市政', '公用事业', '工程管理', '智能建造', '行业周期'],
    reportTip: '该校部分工科和管理方向容易与建筑工程、市政、公用事业、建造管理、智能建造场景关联。行业冷热需要复核，但学校方向匹配度较高。'
  },
  {
    school: '辽宁石油化工大学', schoolAliases: ['辽石化', '辽宁石化'], tier: 'S', trajectoryName: '石油化工储运与过程控制', cardShort: '石油化工储运', selectionShort: '石油化工储运｜再看行业环境 / 工作地点',
    matchMajors: [major('油气储运工程','081504'), major('石油工程','081502'), major('化学工程与工艺','081301'), major('能源化学工程','081304T'), major('过程装备与控制工程','080206'), major('自动化','080801'), major('测控技术与仪器','080301'), major('安全工程','082901'), major('环境工程','082502')],
    reviewPoints: ['油气储运', '炼化', '过程控制', '安全环保', '行业环境', '工作地点'],
    reportTip: '该校自动化、测控、安全、环境等方向也可能服务于石油化工装置、储运、过程控制、安全环保等场景。建议结合孩子是否接受能源化工行业环境复核。'
  },
  {
    school: '沈阳药科大学', schoolAliases: ['沈药'], tier: 'S', trajectoryName: '药学制药与质量注册', cardShort: '药学制药', selectionShort: '药学制药｜再看培养周期 / 行业规范',
    matchMajors: [major('药学','100701'), major('药物制剂','100702'), major('临床药学','100703TK'), major('药物分析','100705T'), major('药物化学','100706T'), major('中药学','100801'), major('制药工程','081302'), major('生物制药','083002T'), major('医疗产品管理','120412T')],
    reviewPoints: ['药企研发', '注册', '质量', '生产', '医院药学', '继续深造'],
    reportTip: '该校药学、制药、生物制药、药物分析等方向容易与药企研发、注册、质量、生产、医院药学、继续深造路径关联。建议确认孩子是否接受较长培养周期和医药行业规范环境。'
  }
];

function matchSchool(rule, schoolName) {
  return matchSchoolByRule(rule, schoolName);
}
function candidateMajorNames(record = {}) {
  return buildCandidateMajorNames(record);
}
function matchMajorList(list = [], candidateNames, catalogCode) {
  return matchMajorListContract(list, candidateNames, catalogCode);
}
function buildResult(rule, hit) {
  const reviewPoints = unique(rule.reviewPoints || []).slice(0, 8);
  return {
    matched: true,
    kind: 'trajectory',
    tier: rule.tier || 'A',
    school: rule.school,
    displayLabel: TRAJECTORY_COPY.displayLabel,
    trajectoryName: rule.trajectoryName,
    chainName: rule.trajectoryName,
    cardShort: rule.cardShort || rule.trajectoryName,
    selectionShort: rule.selectionShort || rule.cardShort || rule.trajectoryName,
    matchedMajor: hit?.name || '',
    catalogCode: hit?.catalogCode || '',
    confidence: hit?.confidence || 'ruleName',
    matchBy: hit?.matchBy || 'baseMajorName',
    reviewPoints,
    reviewText: reviewPoints.length ? reviewPoints.join(' / ') : '课程方向、实验室、实习单位和校招岗位需复核',
    reportTip: rule.reportTip,
    boundary: TRAJECTORY_COPY.boundary
  };
}

export function matchLiaoningMajorTrajectory(record = {}) {
  const schoolName = record.schoolName || record.school || '';
  const majorName = record.majorName || record.major || record.rawMajorName || record.standardMajor?.name || '';
  const candidateNames = candidateMajorNames(record);
  const catalogCode = catalogCodeFromRecord(record);
  if (!schoolName || !candidateNames.size) return null;
  for (const rule of LIAONING_MAJOR_TRAJECTORY_CHAINS) {
    if (!matchSchool(rule, schoolName)) continue;
    const hit = matchMajorList(rule.matchMajors, candidateNames, catalogCode);
    if (hit) return buildResult(rule, hit);
  }
  return null;
}

import { resolveSchoolProfile } from '../../shared/resources/schools/school-profile-center.js';
import {
  DOUBLE_FIRST_CLASS_2022_SOURCE,
  getDoubleFirstClassDisciplines
} from '../../shared/resources/background/double-first-class-disciplines.2022.js';

const clean = (value, max = 240) => String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, max);
const compact = value => clean(value, 240)
  .normalize('NFKC')
  .replace(/[（(][^（）()]{0,80}[）)]/g, '')
  .replace(/专业类|试验班|实验班|基地班|卓越班|创新班|拔尖班|本博贯通|中外合作办学|中外合作|国际班/g, '')
  .replace(/[·•\s,，。；;：:'"“”‘’!！?？_—-]+/g, '');

const RULES = Object.freeze([
  ['应用经济学', /经济|金融|财政|税收|保险|投资|国际贸易/],
  ['法学', /法学|知识产权|国际经贸规则/],
  ['新闻传播学', /新闻|传播|广告|广播电视|网络与新媒体|编辑出版/],
  ['中国语言文学', /汉语言|古典文献|秘书学/],
  ['外国语言文学', /英语|俄语|德语|法语|西班牙语|阿拉伯语|日语|朝鲜语|翻译|商务英语/],
  ['数学', /数学|信息与计算科学/],
  ['物理学', /物理|核物理|声学|量子/],
  ['化学', /化学|化学生物|分子科学/],
  ['生物学', /生物科学|生物技术|生命科学/],
  ['统计学', /统计学|应用统计|数据计算/],
  ['力学', /工程力学|理论与应用力学/],
  ['机械工程', /机械|车辆工程|智能制造|工业设计|过程装备/],
  ['材料科学与工程', /材料|冶金|高分子|复合材料|新能源材料/],
  ['电气工程', /电气|智能电网|能源互联网/],
  ['电子科学与技术', /电子科学|微电子|集成电路|电磁场/],
  ['信息与通信工程', /通信工程|信息工程|电子信息工程/],
  ['控制科学与工程', /自动化|机器人工程|智能装备|轨道交通信号/],
  ['计算机科学与技术', /计算机|软件工程|网络空间安全|信息安全|数据科学|物联网|智能科学|人工智能|区块链/],
  ['土木工程', /土木|城市地下空间|智能建造|道路桥梁|给排水|建筑环境/],
  ['交通运输工程', /交通运输|交通工程|航海技术|轮机工程|智慧交通|轨道交通/],
  ['化学工程与技术', /化学工程|化工|制药工程|能源化学工程|精细化工/],
  ['地质资源与地质工程', /地质工程|勘查技术|资源勘查|地下水/],
  ['石油与天然气工程', /石油工程|油气储运|海洋油气/],
  ['环境科学与工程', /环境科学|环境工程|环境生态|资源环境/],
  ['食品科学与工程', /食品科学|食品质量|粮食工程|乳品工程|酿酒工程/],
  ['管理科学与工程', /管理科学|信息管理|工程管理|大数据管理|供应链/],
  ['工商管理', /工商管理|市场营销|会计学|财务管理|人力资源|审计学|资产评估|国际商务/],
  ['教育学', /教育学|学前教育|小学教育|特殊教育|教育技术|科学教育/],
  ['临床医学', /临床医学|儿科学|麻醉学|医学影像学|眼视光医学|精神医学/],
  ['基础医学', /基础医学|生物医学|智能医学工程/],
  ['口腔医学', /口腔医学/],
  ['药学', /药学|药物制剂|临床药学|药事管理|药物分析|药物化学/],
  ['中药学', /中药学|中药资源|中药制药/],
  ['作物学', /农学|种子科学|智慧农业|植物科学/],
  ['植物保护', /植物保护|动植物检疫/],
  ['畜牧学', /动物科学|智慧牧业/],
  ['兽医学', /动物医学|动物药学/],
  ['林学', /林学|森林保护|智慧林业/],
  ['生态学', /生态学|生态科学/],
  ['体育学', /体育教育|运动训练|社会体育|运动康复|休闲体育/],
  ['设计学', /设计学|视觉传达|环境设计|产品设计|数字媒体艺术|工艺美术/]
]);

function matchDiscipline(major, disciplines = []) {
  const normalized = compact(major);
  if (!normalized) return null;
  for (const discipline of disciplines) {
    const direct = compact(discipline).replace(/工程$|学$/, '');
    if (direct.length >= 3 && normalized.includes(direct)) return discipline;
    const rule = RULES.find(([name]) => name === discipline);
    if (rule?.[1].test(normalized)) return discipline;
  }
  return null;
}

export function match211StaticEvidence(record = {}) {
  const schoolName = clean(record.school || record.schoolName || '', 160);
  const major = clean(record.major || record.majorName || record.rawMajorName || '', 240);
  if (!schoolName || !major) return null;
  const profile = resolveSchoolProfile(schoolName);
  if (!profile?.is211) return null;
  const source = getDoubleFirstClassDisciplines(profile.standardSchoolName || profile.school || schoolName)
    || getDoubleFirstClassDisciplines(profile.parentSchoolName || '');
  if (!source || source.selfDetermined) return null;
  const discipline = matchDiscipline(major, source.disciplines);
  if (!discipline) return null;
  return {
    matched: true,
    school: profile.standardSchoolName || profile.school || schoolName,
    level: 'primary',
    direction: discipline,
    matchedMajor: major,
    evidence: [{
      disciplineName: discipline,
      evidenceYear: '2022',
      canTriggerFrontend: true,
      source: DOUBLE_FIRST_CLASS_2022_SOURCE
    }],
    reviewPoints: ['本科培养方案', '2026招生章程', '专业所属学院', '校区与学费'],
    note: `该本科专业与学校官方建设学科“${discipline}”存在明确名称或专业族映射，仍需核验实际培养方案。`,
    boundary: '建设学科是学校背景证据，不等同于本科专业排名、就业结果或录取承诺。'
  };
}

export function present211StaticEvidence(hit = {}) {
  if (!hit?.matched) return null;
  return {
    scope: '211',
    level: hit.level,
    direction: hit.direction,
    matchedMajor: hit.matchedMajor,
    evidence: hit.evidence || [],
    reviewPoints: hit.reviewPoints || [],
    note: hit.note || '',
    boundary: hit.boundary || ''
  };
}

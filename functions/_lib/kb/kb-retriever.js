import { SCHOOL_KB, SCHOOL_KB_META } from './school-kb.generated.js';
import { MAJOR_KB, MAJOR_KB_META } from './major-kb.generated.js';

function compact(value) {
  return String(value || '')
    .replace(/[（]/g, '(')
    .replace(/[）]/g, ')')
    .replace(/\s+/g, '')
    .trim();
}

const schoolIndex = new Map();
for (const item of SCHOOL_KB) {
  const names = [item.name, item.normName, ...(item.aliases || [])].filter(Boolean);
  for (const name of names) {
    const key = compact(name);
    if (key && !schoolIndex.has(key)) schoolIndex.set(key, item);
  }
}

function findSchool(school) {
  const key = compact(school);
  if (!key) return null;
  if (schoolIndex.has(key)) return schoolIndex.get(key);

  const sorted = [...SCHOOL_KB].sort((a, b) => compact(b.name).length - compact(a.name).length);
  for (const item of sorted) {
    const name = compact(item.name);
    if (!name) continue;
    if (key.includes(name) || name.includes(key)) return item;
  }
  return null;
}

function findMajor(major) {
  const text = String(major || '');
  return MAJOR_KB.filter(item => text.includes(item.keyword)).slice(0, 4);
}

function allDisciplines(assessment) {
  if (!assessment || !assessment.matched) return [];
  return [
    ...(assessment.aDisciplines || []),
    ...(assessment.bDisciplines || []),
    ...(assessment.cDisciplines || [])
  ];
}

const MAJOR_DISCIPLINE_RULES = [
  { keyword: ['计算机', '软件', '人工智能', '数据科学', '网络空间'], disciplines: ['计算机科学与技术', '软件工程', '控制科学与工程', '信息与通信工程'] },
  { keyword: ['电气', '智能电网', '电力'], disciplines: ['电气工程', '控制科学与工程'] },
  { keyword: ['自动化', '机器人工程', '智能制造'], disciplines: ['控制科学与工程', '机械工程'] },
  { keyword: ['临床', '口腔', '麻醉', '影像', '护理', '药学', '中医'], disciplines: ['临床医学', '口腔医学', '护理学', '药学', '中医学', '中西医结合', '中药学', '基础医学', '公共卫生与预防医学'] },
  { keyword: ['金融', '经济', '会计', '财务', '审计', '财政'], disciplines: ['应用经济学', '理论经济学', '工商管理', '统计学'] },
  { keyword: ['法学'], disciplines: ['法学'] },
  { keyword: ['土木', '建筑', '城乡规划'], disciplines: ['土木工程', '建筑学', '城乡规划学', '风景园林学'] },
  { keyword: ['交通', '海事', '航海', '船舶', '航空'], disciplines: ['交通运输工程', '船舶与海洋工程', '航空宇航科学与技术'] },
  { keyword: ['师范', '教育', '心理'], disciplines: ['教育学', '心理学', '中国语言文学', '数学', '物理学', '化学'] },
  { keyword: ['机械', '车辆'], disciplines: ['机械工程', '材料科学与工程', '控制科学与工程'] },
  { keyword: ['石油', '化工', '能源'], disciplines: ['化学工程与技术', '石油与天然气工程', '动力工程及工程热物理'] },
];

function matchDisciplines(major, assessment) {
  const text = String(major || '');
  const names = new Set();
  for (const rule of MAJOR_DISCIPLINE_RULES) {
    if (rule.keyword.some(k => text.includes(k))) {
      for (const d of rule.disciplines) names.add(d);
    }
  }
  if (!names.size) return [];
  return allDisciplines(assessment).filter(d => names.has(d.name)).slice(0, 8);
}

function compactSchoolContext(item, major) {
  if (!item) return null;
  const matchedMajorDisciplines = matchDisciplines(major, item.disciplineAssessment);
  return {
    matched: true,
    name: item.name,
    province: item.province,
    city: item.city,
    displayLocation: item.displayLocation,
    geoEntity: item.geoEntity,
    natureLabel: item.natureLabel,
    tags: item.tags || [],
    is985: !!item.is985,
    is211: !!item.is211,
    isDoubleFirstClass: !!item.isDoubleFirstClass,
    doubleFirstClassSubjects: item.doubleFirstClassSubjects || '',
    aLayerTags: item.aLayerTags || [],
    knowledgeLayer: item.knowledgeLayer || null,
    medicalSignal: !!item.medicalSignal,
    industrySignals: item.industrySignals || [],
    majorStats: item.majorStats || {},
    disciplineAssessment: item.disciplineAssessment?.matched ? {
      matched: true,
      round: item.disciplineAssessment.round,
      sourceName: item.disciplineAssessment.sourceName,
      sourceUrl: item.disciplineAssessment.sourceUrl,
      underlyingSourceName: item.disciplineAssessment.underlyingSourceName,
      underlyingSourceUrl: item.disciplineAssessment.underlyingSourceUrl,
      highestRating: item.disciplineAssessment.highestRating,
      disciplineCount: item.disciplineAssessment.disciplineCount,
      strongDirections: item.disciplineAssessment.strongDirections,
      topDisciplines: (item.disciplineAssessment.topDisciplines || []).slice(0, 8),
      matchedMajorDisciplines,
      sourceNature: item.disciplineAssessment.sourceNature
    } : { matched: false },
    sourceSlots: item.sourceSlots || {},
    kbCompleteness: item.kbCompleteness || {},
    advisorNotes: (item.advisorNotes || []).slice(0, 5),
    evidence: (item.evidence || []).slice(0, 8),
    confidence: item.confidence || 'low',
    needsManualReview: !!item.needsManualReview
  };
}

function compactMajorContext(items) {
  return (items || []).map(item => ({
    keyword: item.keyword,
    category: item.category,
    employmentDirections: item.employmentDirections || [],
    familyFit: item.familyFit || '',
    aiImpact: item.aiImpact || '',
    needsGraduateStudy: item.needsGraduateStudy || '',
    riskNotes: item.riskNotes || [],
    advisorNote: item.advisorNote || ''
  }));
}

export function getKnowledgeContext(record = {}) {
  const school = findSchool(record.school);
  const majors = findMajor(record.major);
  return {
    meta: {
      schoolKbVersion: SCHOOL_KB_META.version,
      majorKbVersion: MAJOR_KB_META.version,
      sourcePolicy: '硬标签优先官方来源；第四轮学科评估可作为公开学科基础线索；第五轮非官方汇总不作为证据；A2/A3为线索需核验。'
    },
    school: compactSchoolContext(school, record.major),
    major: compactMajorContext(majors),
    hasSchoolKb: !!school,
    hasMajorKb: majors.length > 0
  };
}

export function getKbStats() {
  const withAssessment = SCHOOL_KB.filter(s => s.disciplineAssessment?.matched).length;
  return {
    schoolCount: SCHOOL_KB.length,
    liaoningDisciplineAssessmentCount: withAssessment,
    majorRuleCount: MAJOR_KB.length,
    schoolKbVersion: SCHOOL_KB_META.version,
    majorKbVersion: MAJOR_KB_META.version
  };
}

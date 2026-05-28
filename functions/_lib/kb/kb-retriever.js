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

  // 校区/分校实体优先按包含关系兜底，避免过度模糊。
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

function compactSchoolContext(item) {
  if (!item) return null;
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
    medicalSignal: !!item.medicalSignal,
    industrySignals: item.industrySignals || [],
    majorStats: item.majorStats || {},
    advisorNotes: (item.advisorNotes || []).slice(0, 3),
    evidence: (item.evidence || []).slice(0, 6),
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
      sourcePolicy: '硬标签优先官方来源；A2/A3为规则初判，需人工核验。'
    },
    school: compactSchoolContext(school),
    major: compactMajorContext(majors),
    hasSchoolKb: !!school,
    hasMajorKb: majors.length > 0
  };
}

export function getKbStats() {
  return {
    schoolCount: SCHOOL_KB.length,
    majorRuleCount: MAJOR_KB.length,
    schoolKbVersion: SCHOOL_KB_META.version,
    majorKbVersion: MAJOR_KB_META.version
  };
}

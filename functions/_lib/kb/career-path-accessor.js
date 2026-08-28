import { CAREER_PATH_MEDICAL_KB, getMedicalPathHint } from './career-path-medical-kb.generated.js';
import { CAREER_PATH_LAW_KB, getLawPathHint } from './career-path-law-kb.generated.js';
import { CAREER_PATH_TEACHER_KB, getTeacherPathHint } from './career-path-teacher-kb.generated.js';
import { getPhysicalExamReviewHints } from './physical-exam-kb.generated.js';

function cleanText(value) {
  return String(value || '').trim();
}

function unique(list) {
  return [...new Set((list || []).filter(Boolean).map(cleanText).filter(Boolean))];
}

function normalizePathHint({ id, label, parentCopy, reportReviewPoints = [], sourceName = '', sourceLevel = 'A' }) {
  return { id, label, parentCopy: cleanText(parentCopy), reportReviewPoints: unique(reportReviewPoints), sourceName, sourceLevel };
}

export function getCareerPathReviewHints(recordOrText = {}) {
  const majorName = typeof recordOrText === 'string'
    ? recordOrText
    : `${recordOrText?.major || recordOrText?.majorName || ''} ${(recordOrText?.tags || recordOrText?.schoolTags || []).join(' ')}`;
  const s = cleanText(majorName);
  const out = [];

  const medicalHint = getMedicalPathHint(s);
  if (medicalHint) {
    const isCore = CAREER_PATH_MEDICAL_KB?.medicalCore?.appliesTo?.some(k => s.includes(k));
    const node = isCore ? CAREER_PATH_MEDICAL_KB.medicalCore : CAREER_PATH_MEDICAL_KB.publicHealthAndApplied;
    out.push(normalizePathHint({
      id: isCore ? 'medicalCore' : 'medicalApplied',
      label: isCore ? '医学核心路径' : '医学应用/技术路径',
      parentCopy: medicalHint,
      reportReviewPoints: node?.reportReviewPoints || [],
      sourceName: CAREER_PATH_MEDICAL_KB.sourceName,
      sourceLevel: CAREER_PATH_MEDICAL_KB.sourceLevel
    }));
  }

  const lawHint = getLawPathHint(s);
  if (lawHint) {
    const isLaw = CAREER_PATH_LAW_KB?.law?.appliesTo?.some(k => s.includes(k));
    const node = isLaw ? CAREER_PATH_LAW_KB.law : CAREER_PATH_LAW_KB.relatedPublicPath;
    out.push(normalizePathHint({
      id: isLaw ? 'law' : 'publicPath',
      label: isLaw ? '法学路径' : '公职倾向路径',
      parentCopy: lawHint,
      reportReviewPoints: node?.reportReviewPoints || [],
      sourceName: CAREER_PATH_LAW_KB.sourceName,
      sourceLevel: CAREER_PATH_LAW_KB.sourceLevel
    }));
  }

  const teacherHint = getTeacherPathHint(s, []);
  if (teacherHint) {
    out.push(normalizePathHint({
      id: 'teacher',
      label: '师范路径',
      parentCopy: teacherHint,
      reportReviewPoints: CAREER_PATH_TEACHER_KB?.teacherQualification?.reportReviewPoints || [],
      sourceName: CAREER_PATH_TEACHER_KB.sourceName,
      sourceLevel: CAREER_PATH_TEACHER_KB.sourceLevel
    }));
  }

  return out;
}

export function buildCareerPathReviewPoints(recordOrText = {}) {
  const record = typeof recordOrText === 'string' ? { major: recordOrText } : (recordOrText || {});
  const majorName = record.major || record.majorName || '';
  const pathPoints = getCareerPathReviewHints(record).map(item => item.parentCopy);
  const examPoints = getPhysicalExamReviewHints({
    majorName,
    directionId: record.directionId || record.majorDirectionId,
    knownConditions: record.knownPhysicalConditions || []
  });
  return unique([...pathPoints, ...examPoints]);
}

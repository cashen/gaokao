import { YEAR_CALIBER_KB } from './year-caliber-kb.generated.js';
import { LIAONING_POLICY_KB } from './liaoning-policy-kb.generated.js';
import { MAJOR_CATALOG_CALIBER_KB } from './major-catalog-caliber-kb.generated.js';
import { ADMISSION_CHARTER_CHECK_KB } from './admission-charter-check-kb.generated.js';
import { PHYSICAL_EXAM_KB } from './physical-exam-kb.generated.js';
import { CAREER_PATH_MEDICAL_KB } from './career-path-medical-kb.generated.js';
import { CAREER_PATH_LAW_KB } from './career-path-law-kb.generated.js';
import { CAREER_PATH_TEACHER_KB } from './career-path-teacher-kb.generated.js';
import { DISCIPLINE_STRENGTH_BOUNDARY_KB } from './discipline-strength-boundary-kb.generated.js';
import { EMPLOYMENT_REPORT_BOUNDARY_KB } from './employment-report-boundary-kb.generated.js';
import { COPY_POLICY_KB } from './copy-policy-kb.generated.js';
import { getMajorTrendContext } from './major-trend-retriever.js';

function text(value) { return String(value || ''); }
function majorPathFor(record = {}) {
  const major = text(record.major || record.majorName);
  const paths = [];
  if (/临床|口腔|中医|中西医/.test(major) && !/护理|药学|检验|影像技术|康复/.test(major)) paths.push(CAREER_PATH_MEDICAL_KB.medicalCore);
  if (/法学/.test(major)) paths.push(CAREER_PATH_LAW_KB.law);
  if (/师范|教育/.test(major)) paths.push(CAREER_PATH_TEACHER_KB.teacher);
  return paths;
}

function examHints(record = {}) {
  const major = text(record.major || record.majorName);
  const hints = [];
  if (/医学|药学|生物|食品|农学|园艺|动物医学|园林/.test(major)) hints.push(PHYSICAL_EXAM_KB.colorWeakness.aiCopy);
  if (/交通运输|油气储运|材料物理|艺术设计/.test(major)) hints.push(PHYSICAL_EXAM_KB.colorBlindness.aiCopy);
  return hints.slice(0, 2);
}

export function buildGovernanceKnowledgeContext(record = {}, options = {}) {
  const score = options.candidateScore ?? record.candidateScore ?? record.score;
  const trend = getMajorTrendContext({ score, directionId: record.directionId || record.majorDirectionId, keyword: record.major || record.majorName });
  return {
    yearCaliber: YEAR_CALIBER_KB,
    liaoningPolicy: LIAONING_POLICY_KB,
    majorCatalogCaliber: MAJOR_CATALOG_CALIBER_KB,
    admissionCharterCheck: ADMISSION_CHARTER_CHECK_KB,
    physicalExam: { sourceName: PHYSICAL_EXAM_KB.sourceName, sourceLevel: PHYSICAL_EXAM_KB.sourceLevel, hints: examHints(record), aiBoundary: PHYSICAL_EXAM_KB.aiBoundary },
    careerPath: majorPathFor(record),
    disciplineBoundary: DISCIPLINE_STRENGTH_BOUNDARY_KB,
    employmentBoundary: EMPLOYMENT_REPORT_BOUNDARY_KB,
    majorTrend: trend,
    copyPolicy: COPY_POLICY_KB
  };
}

export function buildKbReviewPoints(record = {}) {
  const ctx = buildGovernanceKnowledgeContext(record);
  const points = [];
  const projectChecks = ADMISSION_CHARTER_CHECK_KB.generalCheckItems.slice(0, 6).join('、');
  points.push(`招生章程复核：${projectChecks}。`);
  for (const p of ctx.careerPath || []) if (p.aiCopy) points.push(p.aiCopy);
  for (const h of ctx.physicalExam?.hints || []) points.push(h);
  if (ctx.majorTrend?.notes?.[0]) points.push(ctx.majorTrend.notes[0]);
  return [...new Set(points)].slice(0, 5);
}

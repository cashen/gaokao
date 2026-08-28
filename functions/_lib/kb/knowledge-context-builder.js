import { YEAR_CALIBER_KB } from './year-caliber-kb.generated.js';
import { LIAONING_POLICY_KB } from './liaoning-policy-kb.generated.js';
import { MAJOR_CATALOG_CALIBER_KB } from './major-catalog-caliber-kb.generated.js';
import { ADMISSION_CHARTER_CHECK_KB } from './admission-charter-check-kb.generated.js';
import { PHYSICAL_EXAM_KB, getPhysicalExamReviewHints } from './physical-exam-kb.generated.js';
import { getCareerPathReviewHints } from './career-path-accessor.js';
import { DISCIPLINE_STRENGTH_BOUNDARY_KB } from './discipline-strength-boundary-kb.generated.js';
import { EMPLOYMENT_REPORT_BOUNDARY_KB } from './employment-report-boundary-kb.generated.js';
import { COPY_POLICY_KB } from './copy-policy-kb.generated.js';
import { STANDARD_MAJOR_CATALOG_2026_FULL_META } from './standard-major-catalog-2026-full.generated.js';
import { STANDARD_MAJOR_CATALOG_BRIDGE } from './standard-major-catalog-bridge.generated.js';
import { MAJOR_FILTER_PRESET_KB } from './major-filter-preset-kb.generated.js';
import { MAJOR_DIRECTION_MAP } from './major-direction-map.generated.js';
import { PROJECT_ATTRIBUTE_KB } from './project-attribute-kb.generated.js';
import { KB_SOURCE_REGISTRY } from './kb-source-registry.js';
import { ADMISSION_CHARTER_SOURCE_KB } from './admission-charter-source-kb.generated.js';
import { getMajorTrendContext } from './major-trend-retriever.js';

function text(value) { return String(value || ''); }
function physicalExamHintsFor(record = {}) {
  return getPhysicalExamReviewHints({
    majorName: text(record.major || record.majorName),
    directionId: record.directionId || record.majorDirectionId,
    knownConditions: record.knownPhysicalConditions || []
  }).slice(0, 3);
}

export function buildGovernanceKnowledgeContext(record = {}, options = {}) {
  const score = options.candidateScore ?? record.candidateScore ?? record.score;
  const trend = getMajorTrendContext({ score, directionId: record.directionId || record.majorDirectionId, keyword: record.major || record.majorName });
  return {
    yearCaliber: YEAR_CALIBER_KB,
    liaoningPolicy: LIAONING_POLICY_KB,
    majorCatalogCaliber: MAJOR_CATALOG_CALIBER_KB,
    standardMajorCatalog2026: STANDARD_MAJOR_CATALOG_2026_FULL_META,
    standardMajorBridge: STANDARD_MAJOR_CATALOG_BRIDGE,
    majorFilterPreset: MAJOR_FILTER_PRESET_KB,
    majorDirectionMap: MAJOR_DIRECTION_MAP,
    projectAttribute: PROJECT_ATTRIBUTE_KB,
    kbSourceRegistry: KB_SOURCE_REGISTRY,
    admissionCharterCheck: ADMISSION_CHARTER_CHECK_KB,
    admissionCharterSource: ADMISSION_CHARTER_SOURCE_KB,
    physicalExam: { sourceName: PHYSICAL_EXAM_KB.sourceName, sourceLevel: PHYSICAL_EXAM_KB.sourceLevel, hints: physicalExamHintsFor(record), aiBoundary: PHYSICAL_EXAM_KB.aiBoundary },
    careerPath: getCareerPathReviewHints(record),
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
  for (const p of ctx.careerPath || []) if (p.parentCopy) points.push(p.parentCopy);
  for (const h of ctx.physicalExam?.hints || []) points.push(h);
  if (ctx.majorTrend?.notes?.[0]) points.push(ctx.majorTrend.notes[0]);
  return [...new Set(points)].slice(0, 5);
}

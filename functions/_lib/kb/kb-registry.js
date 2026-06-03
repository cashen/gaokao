export const KB_REGISTRY = {
  version: 'v3985-kb-governance',
  region: 'ln',
  subject: 'physics',
  activeYear: 2025,
  layers: {
    yearCaliber: { module: './year-caliber-kb.generated.js', sourceLevel: 'A', affects: ['pageCopy','reportCopy','advisorAI','bottomLine','rankZone'] },
    liaoningPolicy: { module: './liaoning-policy-kb.generated.js', sourceLevel: 'A', affects: ['selectionAdvisor','report','copyPolicy'] },
    majorCatalogCaliber: { module: './major-catalog-caliber-kb.generated.js', sourceLevel: 'A', affects: ['standardMajor','majorDirection','AIExplanation'] },
    admissionCharterCheck: { module: './admission-charter-check-kb.generated.js', sourceLevel: 'A', affects: ['projectRisk','cardDiagnosis','report'] },
    physicalExam: { module: './physical-exam-kb.generated.js', sourceLevel: 'A', affects: ['majorRisk','reportReviewPoints'] },
    medicalPath: { module: './career-path-medical-kb.generated.js', sourceLevel: 'A', affects: ['majorRisk','AIExplanation'] },
    lawPath: { module: './career-path-law-kb.generated.js', sourceLevel: 'A', affects: ['majorRisk','AIExplanation'] },
    teacherPath: { module: './career-path-teacher-kb.generated.js', sourceLevel: 'A', affects: ['majorRisk','AIExplanation'] },
    disciplineBoundary: { module: './discipline-strength-boundary-kb.generated.js', sourceLevel: 'A', affects: ['schoolEvidence','AIExplanation'] },
    employmentBoundary: { module: './employment-report-boundary-kb.generated.js', sourceLevel: 'B+', affects: ['employmentExplanation'] },
    majorTrend: { module: './major-trend-kb.generated.js', sourceLevel: 'C', affects: ['searchHint','advisorAI','report'] },
    copyPolicy: { module: './copy-policy-kb.generated.js', sourceLevel: 'policy', affects: ['page','advisorAI','report','feishu'] }
  }
};

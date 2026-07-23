import { LIAONING_PHYSICS_EXAM_CONFIG } from '../exam/liaoning-physics.js';

const EXAM = LIAONING_PHYSICS_EXAM_CONFIG;

export const FEISHU_REPORT_ROUTES = Object.freeze({
  currentBand: '/api/feishu-create-report',
  selectionPool: '/api/feishu-create-selection-pool-report',
  health: '/api/feishu-report-health'
});

export const FEISHU_REPORT_CONTRACT = Object.freeze({
  version: 'v1.0.0',
  releaseVersion: 'v3.9.56.0',
  assetVersion: 'v3956_0',
  releaseName: 'v3.9.56.0-feishu-tongxue-direct-resource-audit-no-fenxi',
  dataYear: EXAM.dataYear,
  audienceYear: EXAM.audienceYear,
  region: EXAM.region,
  subject: EXAM.subject,
  candidateScoreMin: EXAM.vocationalControlScore,
  candidateScoreMax: EXAM.maxScore,
  currentBandMaxRecords: 20,
  selectionPoolMaxRecords: 112,
  currentBandReportType: 'currentBand',
  selectionPoolReportTypes: Object.freeze(['selectionPoolOnly', 'selectionPoolWithAnalysis'])
});

export function validateFeishuCandidateScore(value) {
  const score = Math.round(Number(value));
  const valid = Number.isFinite(score)
    && score >= FEISHU_REPORT_CONTRACT.candidateScoreMin
    && score <= FEISHU_REPORT_CONTRACT.candidateScoreMax;
  return Object.freeze({ valid, score: valid ? score : null });
}

export function normalizeSelectionPoolReportType(value) {
  return value === 'selectionPoolWithAnalysis' ? 'selectionPoolWithAnalysis' : 'selectionPoolOnly';
}

import { LIAONING_PHYSICS_EXAM_CONFIG } from '../exam/liaoning-physics.js';
import { CURRENT_RELEASE } from '../release/current-release.js';

const EXAM = LIAONING_PHYSICS_EXAM_CONFIG;

export const FEISHU_REPORT_ROUTES = Object.freeze({
  currentBand: '/api/feishu-create-report',
  selectionPool: '/api/feishu-create-selection-pool-report',
  health: '/api/feishu-report-health'
});

export const FEISHU_REPORT_CONTRACT = Object.freeze({
  version: 'v1.1.0',
  releaseVersion: CURRENT_RELEASE.display,
  assetVersion: CURRENT_RELEASE.assetVersion,
  releaseName: CURRENT_RELEASE.releaseName,
  dataYear: EXAM.dataYear,
  audienceYear: EXAM.audienceYear,
  region: EXAM.region,
  subject: EXAM.subject,
  candidateScoreMin: EXAM.vocationalControlScore,
  candidateScoreMax: EXAM.maxScore,
  currentBandMaxRecords: 20,
  selectionPoolMaxRecords: 112,
  currentBandReportType: 'currentBand',
  selectionPoolReportTypes: Object.freeze(['selectionPoolOnly', 'selectionPoolWithAnalysis']),
  resourceOwner: CURRENT_RELEASE.resourceOwners.reports,
  releaseOwner: CURRENT_RELEASE.resourceOwners.release
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

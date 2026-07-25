import { LIAONING_PHYSICS_EXAM_CONFIG } from '../exam/liaoning-physics.js?v=3962_2';
import { CURRENT_RELEASE } from '../release/current-release.js?v=3963_1';

const EXAM = LIAONING_PHYSICS_EXAM_CONFIG;
const HISTORICAL_YEARS = Object.freeze([2025, 2024]);

export const FEISHU_YEAR_CALIBER = Object.freeze({
  version: 'ln-physics-report-years-v3963_1',
  primaryDataYear: EXAM.dataYear,
  rankTableYear: EXAM.rankYear,
  audienceYear: EXAM.audienceYear,
  unpublishedYear: EXAM.audienceYear,
  historicalYears: HISTORICAL_YEARS,
  primaryFact: `辽宁${EXAM.dataYear}物理类专业最低投档分、最低投档位次和一分一段`,
  pageCopy: `当前基于辽宁${EXAM.dataYear}年物理类专业最低投档记录和${EXAM.rankYear}一分一段进行历史初选参考。`,
  reportCopy: `基于${EXAM.dataYear}年专业最低投档记录生成，用于家庭讨论和人工复核；${HISTORICAL_YEARS.join('、')}只作严格同口径历史对照，正式填报以${EXAM.audienceYear}年一分一段、招生计划、院校章程和志愿系统为准。`,
  historicalBoundary: `${HISTORICAL_YEARS.join('、')}只作严格同口径历史对照，不能替代${EXAM.dataYear}主数据，也不能推断${EXAM.audienceYear}录取结果。`,
  unpublishedBoundary: `${EXAM.audienceYear}招生计划、选科要求、学费、校区和培养方式尚未完整公布，必须以正式资料为准。`
});

export const FEISHU_REPORT_ROUTES = Object.freeze({
  currentBand: '/api/feishu-create-report',
  selectionPool: '/api/feishu-create-selection-pool-report',
  health: '/api/feishu-report-health'
});

export const FEISHU_REPORT_CONTRACT = Object.freeze({
  version: 'v1.2.0',
  releaseVersion: CURRENT_RELEASE.display,
  assetVersion: CURRENT_RELEASE.assetVersion,
  releaseName: CURRENT_RELEASE.releaseName,
  dataYear: EXAM.dataYear,
  rankYear: EXAM.rankYear,
  audienceYear: EXAM.audienceYear,
  primaryFactYear: FEISHU_YEAR_CALIBER.primaryDataYear,
  historicalYears: FEISHU_YEAR_CALIBER.historicalYears,
  unknownYear: FEISHU_YEAR_CALIBER.unpublishedYear,
  yearCaliberVersion: FEISHU_YEAR_CALIBER.version,
  yearCaliber: FEISHU_YEAR_CALIBER,
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

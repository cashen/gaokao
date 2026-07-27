import { CURRENT_RELEASE } from '../release/current-release.js';
import { HISTORICAL_RANK_SELECTION_POLICY, HISTORICAL_RANK_SELECTION_VERSION } from '../../algorithms/position/historical-rank-selection.v3967_0.js';

export const LIAONING_KEY_SUBJECTS_RESOURCE = Object.freeze({
  version: 'liaoning-key-subjects-execution-v3967_0',
  releaseVersion: CURRENT_RELEASE.display,
  dataOwner: '/liaoning_key_subjects_phase2_tuition_data.js',
  pageAdapter: '/just_for_liaoning.html',
  dataYears: Object.freeze([2025, 2024]),
  scope: '辽宁省内高校重点学科对应本科专业的2024—2025历史专题分析',
  rankEvidenceOwner: '/functions/_lib/rank-table-provider.js',
  schoolIdentityOwner: '/shared/resources/schools/school-identity-center.js',
  selectionAlgorithmOwner: '/shared/algorithms/position/historical-rank-selection.v3967_0.js',
  selectionAlgorithmVersion: HISTORICAL_RANK_SELECTION_VERSION,
  selectionPolicy: HISTORICAL_RANK_SELECTION_POLICY,
  boundary: '本专题页使用历史记录整理候选，不进入2026主查询分组，也不代表2027录取概率。'
});

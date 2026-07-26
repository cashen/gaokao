export const ALGORITHM_ORCHESTRATION_VERSION = 'algorithm-orchestration-v3967';
export const ALGORITHM_ASSET_VERSION = 'v3967_0';

export const ALGORITHM_RESOURCE_REGISTRY = Object.freeze({
  position: '/shared/algorithms/position/canonical-position.v3963_0.js',
  ranking: '/shared/algorithms/ranking/staged-ranking.v3960_0.js',
  resultRanking: '/shared/algorithms/ranking/result-ranking.v3967_0.js',
  trendInterpretation: '/shared/algorithms/trend/trend-interpretation.v3967_0.js',
  historicalRankSelection: '/shared/algorithms/position/historical-rank-selection.v3967_0.js',
  snapshot: '/shared/algorithms/contracts/decision-snapshot.v3960_0.js'
});

export const ALGORITHM_CONTRACT = Object.freeze({
  version: ALGORITHM_ORCHESTRATION_VERSION,
  assetVersion: ALGORITHM_ASSET_VERSION,
  activeDataYear: 2026,
  audienceYear: 2027,
  principles: Object.freeze([
    'single-position-owner',
    'single-result-ranking-owner',
    'single-trend-interpretation-owner',
    'single-historical-rank-selection-owner',
    'rank-primary-2026-position',
    'score-prefilter-performance-boundary',
    'hard-constraints-before-preferences',
    'intent-before-soft-preference',
    'deterministic-ranking-trace',
    'report-uses-decision-snapshot',
    'ai-explains-but-does-not-rank'
  ]),
  forbiddenOutputs: Object.freeze([
    'admission-probability',
    'guaranteed-admission',
    'unverified-employment-promise'
  ])
});

export function getAlgorithmResource(key) {
  return ALGORITHM_RESOURCE_REGISTRY[key] || '';
}

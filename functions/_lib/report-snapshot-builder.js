import { getHistoryScoreRankEvidence } from '../../shared/resources/exam/historical-score-rank-contract.js';
export function buildReportSnapshot({ facts = {}, rankZone = {}, stats = {}, narrative = {}, healthLights = {}, source = 'fallback' } = {}) {
  return {
    snapshotId: `ln-rank-${facts.config?.year || 2026}-${facts.candidate?.score || 'score-missing'}-${Date.now()}`,
    version: 'v3.9.5.9',
    generatedAt: new Date().toISOString(),
    candidateContext: {
      score: facts.candidate?.score ?? null,
      rank: facts.candidate?.rank ?? null,
      rankLabel: facts.candidate?.rankLabel || '位次待核验',
      specialControlScore: facts.controls?.specialControlScore ?? null,
      specialControlRank: facts.controls?.specialControlRank ?? null,
      specialControlRankLabel: facts.controls?.specialControlRankLabel || '位次待核验',
      zoneKey: rankZone.zoneKey || '',
      zoneName: rankZone.zoneName || ''
    },
    dataVersion: {
      rankTable: `${facts.config?.rankYear || 2026}-${facts.config?.region || 'ln'}-${facts.config?.subject || 'physics'}`,
      majorData: 'ln-rank-2026-physics-current',
      pushRateData: 'push-rate-first-pass-2025'
    },
    summary: stats,
    healthLights,
    narrative,
    source,
    items: (facts.orderedItems || []).map(item => ({ order: item.order, school: item.school, major: item.major, codes: item.codes || {}, standardMajor: item.standardMajor || {}, score2026: item.score2026 ?? item.score,
    rank2026: item.rank2026 ?? item.rank,
    historyEvidence: getHistoryScoreRankEvidence(item), scoreDelta: item.scoreDelta, rankGap: item.rankGap, statusLabel: item.statusLabel }))
  };
}

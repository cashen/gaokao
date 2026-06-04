export function buildReportSnapshot({ state, analysis = null, dataVersion = {} }) {
  const now = new Date().toISOString();
  const context = state?.candidateContext || {};
  return {
    snapshotId: `ln-rank-${context.year || 2025}-${context.subject || 'physics'}-${context.score || 'score-missing'}-${Date.now()}`,
    version: 'v3.9.5.9',
    generatedAt: now,
    candidateContext: context,
    dataVersion: {
      rankTable: context.rankTableVersion || '2025-ln-physics-v1',
      majorData: dataVersion.majorData || 'fenxi-2025-physics-current',
      pushRateData: dataVersion.pushRateData || 'push-rate-first-pass-2025'
    },
    items: (state?.items || []).map((item, index) => ({
      order: index + 1,
      school: item.school,
      major: item.major,
      score2025: item.score2025,
      rank2025: item.rank2025,
      scoreDelta: item.scoreDelta,
      rankGap: item.rankGap,
      statusLabel: item.poolBand?.detail || item.statusLabel || ''
    })),
    summary: state?.stats || {},
    healthLights: analysis?.healthLights || {},
    aiNarrative: analysis?.narrative || analysis?.aiNarrative || null,
    pushRateSummary: analysis?.pushRateSummary || null,
    manualCheckList: analysis?.manualCheckList || []
  };
}

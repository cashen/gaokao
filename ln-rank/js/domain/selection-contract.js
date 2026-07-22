import { toHumanCopy, HUMAN_BAND_LABELS } from './human-copy-dictionary.js?v=3951_0';
import { classifySelectionDelta } from './selection-band-policy.js?v=3951_0';

function clean(value, max = 180) {
  return toHumanCopy(String(value == null ? '' : value).trim()).slice(0, max);
}

function num(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeBand(item = {}, context = {}) {
  if (item.historicalOnly) {
    return { key: 'unknown', group: 'unknown', detail: '历史自选', position: '尚未匹配到 2026 同口径记录' };
  }
  const existing = item.poolBand || {};
  const key = existing.key || item.bandKey || item.band || '';
  if (['upper', 'near', 'steady'].includes(key)) {
    return {
      ...existing,
      key,
      group: key === 'upper' ? 'rush' : key === 'near' ? 'stable' : 'safe',
      detail: HUMAN_BAND_LABELS[key] || existing.detail,
      position: existing.position || `${HUMAN_BAND_LABELS[key]}区`
    };
  }
  return classifySelectionDelta(
    item.scoreDelta2026 ?? item.scoreDelta ?? item.computedScoreDelta,
    context.rangePreset || item.rangePreset || item.sourceContext?.rangePreset || 'standard'
  );
}

export function normalizeSelectedMajor(item = {}, order = 1, context = {}) {
  const historicalOnly = Boolean(item.historicalOnly);
  const score2026 = historicalOnly ? null : num(item.score2026 ?? (Number(item.dataYear) === 2026 ? item.score : null));
  const rank2026 = historicalOnly ? null : num(item.rank2026 ?? (Number(item.dataYear) === 2026 ? item.rank : null));
  const scoreDelta2026 = historicalOnly ? null : num(item.scoreDelta2026 ?? item.scoreDelta ?? item.computedScoreDelta);
  const rankGap2026 = historicalOnly ? null : num(item.rankGap2026 ?? item.rankGap);
  const poolBand = normalizeBand(item, context);
  const id = clean(
    item.id || `${historicalOnly ? 'legacy-2025' : 'ln-2026'}|${item.school || ''}|${item.major || ''}|${item.schoolCode2026 || ''}|${item.majorCode2026 || ''}`,
    260
  );

  return {
    ...item,
    order,
    userOrder: order,
    id,
    historicalOnly,
    dataYear: historicalOnly ? Number(item.dataYear || 2025) : 2026,
    primaryYear: historicalOnly ? Number(item.primaryYear || item.dataYear || 2025) : 2026,
    school: clean(item.school || '学校待核验', 120),
    major: clean(item.major || '专业待核验', 180),
    score2026,
    score: score2026,
    rank2026,
    rank: rank2026,
    score2025: num(item.score2025 ?? (historicalOnly ? item.score : null)),
    rank2025: num(item.rank2025 ?? (historicalOnly ? item.rank : null)),
    score2024: num(item.score2024),
    rank2024: num(item.rank2024),
    scoreDelta2026,
    scoreDelta: scoreDelta2026,
    rankGap2026,
    rankGap: rankGap2026,
    bandKey: poolBand.key,
    bandLabel: poolBand.detail || '待核验',
    statusLabel: poolBand.detail || '待核验',
    poolBand,
    sourceContext: {
      ...(item.sourceContext || {}),
      candidateScore: context.candidateScore ?? item.sourceContext?.candidateScore ?? null,
      candidateReferenceRank2026: context.candidateReferenceRank2026 ?? item.sourceContext?.candidateReferenceRank2026 ?? null,
      rankYear: 2026,
      dataYear: 2026,
      rangePreset: context.rangePreset || item.sourceContext?.rangePreset || 'standard',
      activeBand: context.activeBand || poolBand.key
    }
  };
}

export function normalizeSelectedMajors(items = [], context = {}) {
  return (Array.isArray(items) ? items : []).map((item, index) => normalizeSelectedMajor(item, index + 1, context));
}

export function selectedMajorsSignature(items = []) {
  return normalizeSelectedMajors(items).map(item => `${item.order}:${item.id}:${item.scoreDelta2026 ?? ''}`).join('|');
}

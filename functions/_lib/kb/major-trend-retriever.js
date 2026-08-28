import { MAJOR_TREND_KB, MAJOR_TREND_KB_META } from './major-trend-kb.generated.js';

function n(value) {
  const x = Number(value);
  return Number.isFinite(x) ? x : null;
}

export function segmentForScore(score) {
  const value = n(score);
  if (value == null) return null;
  const segments = Array.isArray(MAJOR_TREND_KB.segments) ? MAJOR_TREND_KB.segments : [];
  return segments.find(seg => {
    const [lo, hi] = String(seg.id || '').split('-').map(Number);
    return Number.isFinite(lo) && Number.isFinite(hi) && value >= lo && value <= hi;
  }) || null;
}

export function getMajorTrendContext({ score, directionId, keyword } = {}) {
  const segment = segmentForScore(score);
  if (!segment) return { meta: MAJOR_TREND_KB_META, matched: false, reason: 'score_out_of_segment' };
  const key = String(directionId || keyword || '').trim();
  const directions = Array.isArray(segment.directions) ? segment.directions : [];
  let item = null;
  if (key) {
    item = directions.find(d => d.directionId === key || d.directionLabel === key || String(d.directionLabel || '').includes(key) || String(key).includes(d.directionLabel));
  }
  return {
    meta: MAJOR_TREND_KB_META,
    matched: !!item,
    segment: { id: segment.id, label: segment.label, lead: segment.lead },
    direction: item ? {
      directionId: item.directionId,
      directionLabel: item.directionLabel,
      comparableCount: item.comparableCount,
      harderRate: item.harderRate,
      easierRate: item.easierRate,
      neutralRate: item.neutralRate,
      netChange: item.netChange,
      trend: item.trend,
      trendLabel: item.trendLabel || item.sourceJudgement,
      sampleLevel: item.sampleLevel
    } : null,
    notes: item ? [buildTrendParentNote(segment, item)] : []
  };
}

export function buildTrendParentNote(segment, item) {
  const label = item.directionLabel || '该方向';
  if (item.trend === 'harder') return `${segment.label}分段中，${label}方向2025相比2024整体更拥挤，建议留出位次余量。`;
  if (item.trend === 'easier') return `${segment.label}分段中，${label}方向2025相比2024整体没那么挤，但仍需核验学校层次、专业实力和招生计划。`;
  return `${segment.label}分段中，${label}方向近两年变化有分化，只作辅助观察。`;
}


// v3.9.34.1 compatibility export: older accessors expect getTrendHint.
// It wraps the existing context/note API and always returns a small parent-readable object.
export function getTrendHint(input = {}) {
  const context = getMajorTrendContext(input);
  const text = Array.isArray(context?.notes) && context.notes.length ? context.notes[0] : '';
  return {
    matched: Boolean(context?.matched),
    text,
    context
  };
}

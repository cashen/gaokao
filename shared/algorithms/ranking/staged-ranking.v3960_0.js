export const STAGED_RANKING_VERSION = 'staged-ranking-v3960_0';

const MATCH_TIER = Object.freeze({ exact: 50, related: 40, project: 30, industry: 20, weak: 10, '': 0 });
const EVIDENCE_TIER = Object.freeze({ strong: 30, medium: 20, weak: 10 });

function finite(value, fallback = Number.POSITIVE_INFINITY) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function text(value) {
  return String(value == null ? '' : value).trim();
}

export function buildRankingTrace(record = {}, context = {}) {
  const position = record.canonicalPosition || {};
  const matchLevel = text(record.matchLevel);
  const unresolved = Boolean(record.bottomLineEligibility === 'unresolved' || record.eligibilityStatus === 'unresolved');
  const softPreferenceWeight = Number(context.getSoftPreferenceWeight?.(record) || 0);
  return Object.freeze({
    version: STAGED_RANKING_VERSION,
    eligibilityTier: unresolved ? 1 : 2,
    intentTier: MATCH_TIER[matchLevel] ?? 0,
    intentLevel: matchLevel || 'unfiltered',
    positionDistance: finite(position.positionDistance),
    evidenceTier: EVIDENCE_TIER[position.evidenceStrength] || 0,
    softPreferenceWeight,
    stableKey: text(record.id || `${record.school || ''}|${record.major || ''}|${record.score2026 ?? record.score ?? ''}|${record.rank2026 ?? record.rank ?? ''}`),
    reasons: Object.freeze([
      unresolved ? 'ELIGIBILITY_UNRESOLVED' : 'ELIGIBILITY_PASS',
      `INTENT_${(matchLevel || 'UNFILTERED').toUpperCase()}`,
      position.classificationBasis ? `POSITION_${String(position.classificationBasis).toUpperCase().replace(/[^A-Z0-9]+/g, '_')}` : 'POSITION_UNRESOLVED',
      softPreferenceWeight ? 'SOFT_PREFERENCE_APPLIED' : 'NO_SOFT_PREFERENCE'
    ])
  });
}

export function compareRankedRecords(a, b, context = {}) {
  const ta = a.rankingTrace || buildRankingTrace(a, context);
  const tb = b.rankingTrace || buildRankingTrace(b, context);
  return tb.eligibilityTier - ta.eligibilityTier
    || tb.intentTier - ta.intentTier
    || ta.positionDistance - tb.positionDistance
    || tb.softPreferenceWeight - ta.softPreferenceWeight
    || tb.evidenceTier - ta.evidenceTier
    || finite(a.rank2026 ?? a.rank) - finite(b.rank2026 ?? b.rank)
    || ta.stableKey.localeCompare(tb.stableKey, 'zh-Hans-CN');
}

export function rankRecords(records = [], context = {}) {
  return (Array.isArray(records) ? records : [])
    .map(record => ({ ...record, rankingTrace: buildRankingTrace(record, context) }))
    .sort((a, b) => compareRankedRecords(a, b, context));
}

export function diversifyRankedRecords(records = [], options = {}) {
  const list = Array.isArray(records) ? records : [];
  const enabled = options.enabled !== false;
  const windowSize = Math.max(1, Number(options.windowSize || 8));
  const maxPerSchool = Math.max(1, Number(options.maxPerSchool || 2));
  if (!enabled || list.length <= maxPerSchool) return list;

  const selected = [];
  const deferred = [];
  const schoolCounts = new Map();
  for (const record of list) {
    const school = text(record.school || record.schoolName || '');
    const count = schoolCounts.get(school) || 0;
    if (selected.length < windowSize && school && count >= maxPerSchool) {
      deferred.push({ ...record, rankingTrace: { ...(record.rankingTrace || {}), diversityReason: 'DEFERRED_SAME_SCHOOL_EXPOSURE' } });
      continue;
    }
    selected.push(record);
    if (school) schoolCounts.set(school, count + 1);
  }
  return [...selected, ...deferred];
}

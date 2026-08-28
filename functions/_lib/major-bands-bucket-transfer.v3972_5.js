export const MAJOR_BANDS_BUCKET_TRANSFER_VERSION = 'major-bands-bucket-candidate-compact-v3972_5';
export const MAJOR_BANDS_RESPONSE_TRANSPORT_VERSION = 'major-bands-response-compact-v3972_5';

const BUCKET_DROP_FIELDS = new Set([
  'rankingTrace',
  'resultRankingTrace',
  'rawText',
  'historyEvidence',
  'historyCompare',
  'schoolProfile',
  'schoolProfileDisplayTags',
  'schoolProfileSource',
  'schoolProfileSourceUrl',
  'schoolProfileAsOfDate',
  'geoSourceMethod',
  'geoSourceName',
  'geoSourceUrl',
  'geoSourceYear',
  'geoMatchNote',
  'rank2024Source',
  'rank2025Source',
  'rank2026Source',
  'majorBandsMaterializationVersion',
  'regionGroups',
  'locationSource',
  'locationConfidence',
  'locationWarning',
  'geoEntity',
  'schoolIdentifier',
  'candidateReferenceScore',
  'schoolName',
  'majorName',
  'sourceType'
]);

const RESPONSE_DROP_FIELDS = new Set([
  'rankingTrace',
  'resultRankingTrace',
  'rawText',
  'schoolProfileSource',
  'schoolProfileSourceUrl',
  'schoolProfileAsOfDate',
  'geoSourceMethod',
  'geoSourceName',
  'geoSourceUrl',
  'geoSourceYear',
  'geoMatchNote',
  'rank2024Source',
  'rank2025Source',
  'rank2026Source',
  'sourceType',
  'schoolProfile',
  'majorBandsMaterializationVersion',
  'regionGroups',
  'locationSource',
  'candidateReferenceScore',
  'schoolName',
  'majorName',
  'rawFenxiMajorCodeLooksStandard',
  'preferenceOrder',
  'bottomLineEligibility',
  'bottomLineEligibilityReason',
  'natureRaw'
]);

function meaningful(value) {
  return value !== undefined && value !== null && value !== '';
}

function transferMeaningful(value) {
  if (!meaningful(value)) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
}

function pickMeaningful(source = {}, keys = []) {
  const out = {};
  for (const key of keys) {
    const value = source?.[key];
    if (meaningful(value)) out[key] = value;
  }
  return out;
}

function compactHistoryYear(entry = {}) {
  return pickMeaningful(entry, [
    'year',
    'score',
    'rankStart',
    'rankEnd',
    'sameCount',
    'emptyScore',
    'evidenceState',
    'validationStatus',
    'rankSource',
    'sourceName',
    'recordStatus',
    'comparable',
    'missingReason',
    'conflict'
  ]);
}

export function compactMajorBandsHistoryEvidence(evidence = null) {
  if (!evidence || typeof evidence !== 'object') return evidence || null;
  const years = {};
  for (const year of ['2024', '2025', '2026']) {
    years[year] = compactHistoryYear(evidence.years?.[year] || evidence.years?.[Number(year)] || { year: Number(year) });
  }
  return {
    ...pickMeaningful(evidence, ['version', 'region', 'subject', 'primaryYear']),
    years,
    comparison: pickMeaningful(evidence.comparison || {}, [
      'policy',
      'populationPolicy',
      'comparableYears',
      'canCompareThreeYears',
      'scoreOnlyCannotCreateTrend',
      'conflictCannotCreateTrend',
      'legacyFallback'
    ])
  };
}

export function compactMajorBandsHistoryCompare(history = null) {
  if (!history || typeof history !== 'object') return history || null;
  return pickMeaningful(history, [
    'primaryYear',
    'has2026',
    'has2025',
    'has2024',
    'scoreDelta26vs25',
    'rankDelta26vs25',
    'scoreDelta25vs24',
    'rankDelta25vs24',
    'rankTrendText',
    'rankTrendText25vs24',
    'rankTrendLabel'
  ]);
}

function compactMajorBandsRankingPosition(position = null) {
  if (!position || typeof position !== 'object') return position || null;
  return pickMeaningful(position, [
    'bandKey',
    'positionDistance',
    'evidenceStrength',
    'classificationBasis'
  ]);
}

export function compactMajorBandsCanonicalPosition(position = null) {
  if (!position || typeof position !== 'object') return position || null;
  return pickMeaningful(position, [
    'version',
    'bandKey',
    'bandLabel',
    'group',
    'bandOrder',
    'statusKey',
    'statusLabel',
    'position',
    'candidateScore',
    'recordScore',
    'scoreDelta',
    'candidateRank',
    'recordRank',
    'rankGap',
    'positionDistance',
    'evidenceStrength',
    'classificationBasis'
  ]);
}

/**
 * Child Workers own filtering and local ranking only. The transfer boundary
 * carries the raw fields required to reproduce the final record plus the
 * canonical ranking tuple. Expensive school profiles, geography expansion and
 * three-year evidence are intentionally absent and are materialized once by
 * the parent after global ranking and pagination. Empty strings, empty arrays
 * and empty objects are omitted because absence and emptiness are equivalent
 * for this internal frontier; numeric zero and boolean false remain explicit.
 */
export function compactMajorBandsBucketCandidate(record = {}) {
  const candidate = {};
  for (const [key, value] of Object.entries(record || {})) {
    if (BUCKET_DROP_FIELDS.has(key)) continue;
    if (key === 'canonicalPosition') {
      candidate.canonicalPosition = compactMajorBandsRankingPosition(value);
      continue;
    }
    if (!transferMeaningful(value)) continue;
    candidate[key] = value;
  }
  return candidate;
}

function compactResponseRecord(record = {}) {
  const compact = {};
  for (const [key, value] of Object.entries(record || {})) {
    if (RESPONSE_DROP_FIELDS.has(key)) continue;
    if (key === 'historyEvidence') {
      compact.historyEvidence = compactMajorBandsHistoryEvidence(value);
      continue;
    }
    if (key === 'historyCompare') {
      compact.historyCompare = compactMajorBandsHistoryCompare(value);
      continue;
    }
    if (key === 'canonicalPosition') {
      compact.canonicalPosition = compactMajorBandsCanonicalPosition(value);
      continue;
    }
    compact[key] = value;
  }
  return compact;
}

/**
 * The browser receives flattened display fields plus compact historical evidence.
 * Server-only school profiles, materialization markers and ranking internals stay
 * inside the execution graph. Rebuilt schoolProfileDisplayTags remain public.
 */
export function compactMajorBandsResponseRecord(record = {}) {
  return compactResponseRecord(record);
}

export function assertCompactMajorBandsBucketCandidate(record = {}) {
  for (const forbidden of [
    'rankingTrace',
    'resultRankingTrace',
    'historyEvidence',
    'historyCompare',
    'schoolProfile',
    'schoolProfileDisplayTags',
    'majorBandsMaterializationVersion',
    'rawText'
  ]) {
    if (Object.prototype.hasOwnProperty.call(record, forbidden)) {
      throw new Error(`bucket ranking candidate leaked ${forbidden}`);
    }
  }
  if (!record.school || !record.major) throw new Error('bucket ranking candidate missing school or major');
  if (!Number.isFinite(Number(record.score2026 ?? record.score))) {
    throw new Error('bucket ranking candidate missing score');
  }
  if (!record.canonicalPosition || typeof record.canonicalPosition !== 'object') {
    throw new Error('bucket ranking candidate missing canonicalPosition');
  }
  for (const [key, value] of Object.entries(record)) {
    if (!transferMeaningful(value)) throw new Error(`bucket ranking candidate leaked empty field ${key}`);
  }
  return record;
}

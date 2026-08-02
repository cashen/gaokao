import { MAJOR_BANDS_MATERIALIZATION_VERSION } from './major-bands-static-provider.js';

export const MAJOR_BANDS_BUCKET_TRANSFER_VERSION = 'major-bands-bucket-candidate-compact-v3972_5';
export const MAJOR_BANDS_RESPONSE_TRANSPORT_VERSION = 'major-bands-response-compact-v3972_5';

const TRANSFER_DROP_FIELDS = new Set([
  'rankingTrace',
  'resultRankingTrace',
  'rawText',
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
  'sourceType'
]);

const RESPONSE_DROP_FIELDS = new Set([
  ...TRANSFER_DROP_FIELDS,
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
    'evidenceStrength'
  ]);
}

export function compactMajorBandsSchoolProfile(profile = null) {
  if (!profile || typeof profile !== 'object') return profile || null;
  return pickMeaningful(profile, [
    'school',
    'standardSchoolName',
    'parentSchoolName',
    'schoolIdentifier',
    'province',
    'city',
    'displayLocation',
    'natureType',
    'natureLabel',
    'is985',
    'is211',
    'isNon985211',
    'schoolTierTags',
    'entityType',
    'entityTypeLabel',
    'regionGroups',
    'sourceVersion',
    'sourceAsOfDate',
    'sourceName',
    'sourceUrl',
    'confidence',
    'doubleNonDefinition'
  ]);
}

function compactRecord(record = {}, dropFields, keepSchoolProfile) {
  const compact = {};
  for (const [key, value] of Object.entries(record || {})) {
    if (dropFields.has(key)) continue;
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
    if (key === 'schoolProfile') {
      if (keepSchoolProfile) compact.schoolProfile = compactMajorBandsSchoolProfile(value);
      continue;
    }
    compact[key] = value;
  }
  return compact;
}

/**
 * A child Worker materializes school, location and history evidence exactly once.
 * Only the compact profile required by the parent display-tag owner crosses the
 * Worker boundary; ranking traces and repeated source metadata never do.
 */
export function compactMajorBandsBucketCandidate(record = {}) {
  const candidate = compactRecord(record, TRANSFER_DROP_FIELDS, true);
  candidate.majorBandsMaterializationVersion = record.majorBandsMaterializationVersion || MAJOR_BANDS_MATERIALIZATION_VERSION;
  return candidate;
}

/**
 * The browser receives flattened display fields plus compact historical evidence.
 * Server-only school profiles, materialization markers and ranking internals stay
 * inside the execution graph.
 */
export function compactMajorBandsResponseRecord(record = {}) {
  return compactRecord(record, RESPONSE_DROP_FIELDS, false);
}

export function assertCompactMajorBandsBucketCandidate(record = {}) {
  if (Object.prototype.hasOwnProperty.call(record, 'rankingTrace')) {
    throw new Error('bucket candidate leaked rankingTrace');
  }
  if (Object.prototype.hasOwnProperty.call(record, 'resultRankingTrace')) {
    throw new Error('bucket candidate leaked resultRankingTrace');
  }
  if (record.majorBandsMaterializationVersion !== MAJOR_BANDS_MATERIALIZATION_VERSION) {
    throw new Error(`bucket candidate materialization=${record.majorBandsMaterializationVersion || 'missing'}`);
  }
  if (!record.schoolProfile || typeof record.schoolProfile !== 'object') {
    throw new Error('bucket candidate missing compact schoolProfile');
  }
  return record;
}

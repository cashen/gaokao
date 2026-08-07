import { STAGED_RANKING_VERSION } from '../../shared/algorithms/ranking/staged-ranking.v3960_0.js';

export const MAJOR_BANDS_RESULT_ORDER_VERSION = 'major-bands-result-order-ephemeral-v3990_1';
export const MAJOR_BANDS_RANKING_MEMORY_MODE = 'ephemeral-compact-tuples-v3990_1';
export const MAJOR_BANDS_MINIMAL_RANKING_TRACE = Object.freeze({ version: STAGED_RANKING_VERSION });

const MATCH_TIER = Object.freeze({ exact: 50, related: 40, project: 30, industry: 20, weak: 10, '': 0 });
const EVIDENCE_TIER = Object.freeze({ strong: 30, medium: 20, weak: 10 });

function finite(value, fallback = Number.POSITIVE_INFINITY) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function text(value) {
  return String(value == null ? '' : value).trim();
}

function compactRankingTuple(record = {}, context = {}) {
  const position = record.canonicalPosition || {};
  const matchLevel = text(record.matchLevel);
  const unresolved = Boolean(
    record.bottomLineEligibility === 'unresolved'
    || record.eligibilityStatus === 'unresolved'
  );
  return Object.freeze([
    unresolved ? 1 : 2,
    MATCH_TIER[matchLevel] ?? 0,
    finite(position.positionDistance),
    Number(context.getSoftPreferenceWeight?.(record) || 0),
    EVIDENCE_TIER[position.evidenceStrength] || 0,
    text(record.id || `${record.school || ''}|${record.major || ''}|${record.score2026 ?? record.score ?? ''}|${record.rank2026 ?? record.rank ?? ''}`)
  ]);
}

function compareWithTuples(left, right, tuples) {
  const leftTuple = tuples.get(left);
  const rightTuple = tuples.get(right);
  return rightTuple[0] - leftTuple[0]
    || rightTuple[1] - leftTuple[1]
    || leftTuple[2] - rightTuple[2]
    || rightTuple[3] - leftTuple[3]
    || rightTuple[4] - leftTuple[4]
    || finite(left.rank2026 ?? left.rank) - finite(right.rank2026 ?? right.rank)
    || leftTuple[5].localeCompare(rightTuple[5], 'zh-Hans-CN');
}

function attachMinimalRankingTrace(record) {
  Object.defineProperty(record, 'rankingTrace', {
    value: MAJOR_BANDS_MINIMAL_RANKING_TRACE,
    enumerable: true,
    configurable: true,
    writable: true
  });
}

function diversifyWithoutRecordCopies(records = [], options = {}) {
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
      deferred.push(record);
      continue;
    }
    selected.push(record);
    if (school) schoolCounts.set(school, count + 1);
  }
  return [...selected, ...deferred];
}

export function rankMajorBandsRecordsOnce(records = [], options = {}) {
  const ranked = Array.isArray(records) ? records : [];
  const tuples = new WeakMap();
  for (const record of ranked) {
    tuples.set(record, compactRankingTuple(record, options));
    attachMinimalRankingTrace(record);
  }
  ranked.sort((left, right) => compareWithTuples(left, right, tuples));
  return diversifyWithoutRecordCopies(ranked, {
    enabled: options.diversify !== false,
    windowSize: options.windowSize || 8,
    maxPerSchool: options.maxPerSchool || 2
  });
}

export function majorBandsSnapshotId(records = [], queryIdentity = '') {
  let hash = 0x811c9dc5;
  const mix = value => {
    const valueText = String(value || '');
    for (let index = 0; index < valueText.length; index += 1) {
      hash ^= valueText.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
  };
  mix(MAJOR_BANDS_RESULT_ORDER_VERSION);
  mix(queryIdentity);
  for (const record of records) mix(record?.id || `${record?.school || ''}|${record?.major || ''}`);
  return `v3990_1-${records.length}-${hash.toString(16).padStart(8, '0')}`;
}

export function paginateMajorBandsRecords(records = [], options = {}) {
  const list = Array.isArray(records) ? records : [];
  const offset = Math.max(0, Math.floor(Number(options.offset || 0)));
  const limit = Math.max(1, Math.floor(Number(options.limit || 1)));
  const page = list.slice(offset, offset + limit);
  const nextOffset = offset + page.length;
  const hasMore = nextOffset < list.length;
  if (hasMore && nextOffset <= offset) throw new Error('major-bands pagination cursor did not advance');
  return Object.freeze({
    records: page,
    count: list.length,
    pagination: Object.freeze({
      offset,
      limit,
      returned: page.length,
      hasMore,
      nextOffset: hasMore ? nextOffset : null,
      order: MAJOR_BANDS_RESULT_ORDER_VERSION,
      snapshot: majorBandsSnapshotId(list, options.queryIdentity || '')
    })
  });
}

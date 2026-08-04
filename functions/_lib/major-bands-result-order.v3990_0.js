import {
  buildRankingTrace,
  compareRankedRecords,
  diversifyRankedRecords
} from '../../shared/algorithms/ranking/staged-ranking.v3960_0.js';

export const MAJOR_BANDS_RESULT_ORDER_VERSION = 'major-bands-result-order-v3990_0';

export function rankMajorBandsRecordsOnce(records = [], options = {}) {
  const ranked = (Array.isArray(records) ? records : [])
    .map(record => {
      record.rankingTrace = buildRankingTrace(record, options);
      return record;
    })
    .sort((left, right) => compareRankedRecords(left, right, options));
  return diversifyRankedRecords(ranked, {
    enabled: options.diversify !== false,
    windowSize: options.windowSize || 8,
    maxPerSchool: options.maxPerSchool || 2
  });
}

export function majorBandsSnapshotId(records = [], queryIdentity = '') {
  let hash = 0x811c9dc5;
  const mix = value => {
    const text = String(value || '');
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
  };
  mix(MAJOR_BANDS_RESULT_ORDER_VERSION);
  mix(queryIdentity);
  for (const record of records) mix(record?.id || `${record?.school || ''}|${record?.major || ''}`);
  return `v3990_0-${records.length}-${hash.toString(16).padStart(8, '0')}`;
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

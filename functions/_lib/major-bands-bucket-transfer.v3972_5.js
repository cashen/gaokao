export const MAJOR_BANDS_BUCKET_TRANSFER_VERSION = 'major-bands-bucket-candidate-compact-v3972_5';

/**
 * Child Workers rank candidates only to build a deterministic local frontier.
 * The parent Worker always re-ranks the merged frontier, so the two execution
 * traces are recomputable and must not cross the Worker boundary.
 */
export function compactMajorBandsBucketCandidate(record = {}) {
  const {
    rankingTrace: _rankingTrace,
    resultRankingTrace: _resultRankingTrace,
    ...candidate
  } = record || {};
  return candidate;
}

export function assertCompactMajorBandsBucketCandidate(record = {}) {
  if (Object.prototype.hasOwnProperty.call(record, 'rankingTrace')) {
    throw new Error('bucket candidate leaked rankingTrace');
  }
  if (Object.prototype.hasOwnProperty.call(record, 'resultRankingTrace')) {
    throw new Error('bucket candidate leaked resultRankingTrace');
  }
  return record;
}

export const SCHOOL_QUERY_CONTRACT_VERSION = 'school-query-contract-v3969_0';

export const SCHOOL_QUERY_INTENTS = Object.freeze({
  AUTO: 'auto',
  SCHOOL: 'school',
  REGION: 'region',
  SCHOOL_NAME: 'school-name'
});

export const SCHOOL_QUERY_STATUSES = Object.freeze({
  EMPTY: 'empty',
  RESOLVED: 'resolved',
  AMBIGUOUS: 'ambiguous',
  CANDIDATES: 'candidates',
  NOT_FOUND: 'not-found',
  NOT_AVAILABLE: 'not-available'
});

export const SCHOOL_QUERY_POLICY = Object.freeze({
  admissionScope: 'liaoning-physics-2026',
  directoryScope: 'national-school-directory-v150',
  identityOwner: 'shared-school-identity-center',
  resolverOwner: 'school-name-resolver-v150',
  executionOwner: SCHOOL_QUERY_CONTRACT_VERSION,
  defaultCandidateLimit: 32,
  maximumCandidateLimit: 500,
  ranking: Object.freeze([
    'official-exact',
    'alias-exact',
    'official-prefix',
    'entity-exact',
    'official-contains',
    'region-match',
    'initial-or-fuzzy',
    'admission-record-count-tiebreak-only'
  ]),
  noSilentTruncation: true,
  requireInterpretationForRegionNameCollision: true
});

export function normalizeSchoolQueryIntent(value) {
  const key = String(value || '').trim();
  return Object.values(SCHOOL_QUERY_INTENTS).includes(key) ? key : SCHOOL_QUERY_INTENTS.AUTO;
}

export function normalizeSchoolQueryPage({ offset = 0, limit = SCHOOL_QUERY_POLICY.defaultCandidateLimit } = {}) {
  const parsedOffset = Math.max(0, Math.floor(Number(offset) || 0));
  const parsedLimit = Math.max(1, Math.min(SCHOOL_QUERY_POLICY.maximumCandidateLimit, Math.floor(Number(limit) || SCHOOL_QUERY_POLICY.defaultCandidateLimit)));
  return Object.freeze({ offset: parsedOffset, limit: parsedLimit });
}

export function schoolQueryPagination(total, page = {}) {
  const { offset, limit } = normalizeSchoolQueryPage(page);
  const safeTotal = Math.max(0, Math.floor(Number(total) || 0));
  const returned = Math.max(0, Math.min(limit, safeTotal - offset));
  const hasMore = offset + returned < safeTotal;
  return Object.freeze({
    total: safeTotal,
    offset,
    limit,
    returned,
    hasMore,
    nextOffset: hasMore ? offset + returned : null
  });
}

import { decodeMajorBandsStaticRow, materializeMajorBandsStaticRecord } from '../_lib/major-bands-static-provider.js';
import { makeBands } from '../_lib/band-engine.js';
import {
  MAJOR_BANDS_RANK_INDEX_VERSION,
  MAJOR_BANDS_RANK_INDEX_SOURCE,
  MAJOR_BANDS_RANK_INDEX_RECORD_COUNT,
  MAJOR_BANDS_RANK_BUCKETS,
  selectMajorBandsRankBuckets,
  assertMajorBandsRankIndex
} from '../_lib/major-bands-rank-index.v3990_3.js';
import {
  MAJOR_BANDS_RANK_BUCKET_LOADER_VERSION,
  MAJOR_BANDS_RANK_BUCKET_CACHE_VERSION,
  MAJOR_BANDS_RANK_ORDER_PROJECTION_VERSION,
  MAJOR_BANDS_RANK_ROW_FILTER_VERSION,
  loadMajorBandsRankWindow
} from '../_lib/major-bands-rank-bucket-loader.v3990_3.js';
import {
  MAJOR_BANDS_QUERY_EXECUTION_CACHE_VERSION,
  executeMajorBandsQueryOnce
} from '../_lib/major-bands-query-execution-cache.v3990_3.js';
import {
  MAJOR_BANDS_ALL_BANDS_PAGE_CACHE_VERSION,
  executeMajorBandsAllBandsPageOnce,
  releaseMajorBandsAllBandsCompletedPage
} from '../_lib/major-bands-all-bands-page-cache.v3990_3.js';
import {
  MAJOR_BANDS_RANK_QUERY_KERNEL_VERSION,
  processMajorBandsRankWindow
} from '../_lib/major-bands-rank-query-kernel.v3990_3.js';
import {
  MAJOR_BANDS_RESULT_ORDER_VERSION,
  majorBandsSnapshotId,
  paginateMajorBandsRecords
} from '../_lib/major-bands-result-order.v3990_3.js';
import {
  MAJOR_BANDS_RESPONSE_TRANSPORT_VERSION,
  compactMajorBandsBucketCandidate,
  compactMajorBandsResponseRecord
} from '../_lib/major-bands-response-transport.v3990_3.js';
import { buildDisplayTags } from '../_lib/school-display-tags.js';
import { normalizePlatformTarget } from '../_lib/platform-upgrade-policy.js';
import {
  getBottomLineEligibility,
  normalizeBottomLineMode,
  bottomLineModeSummary
} from '../_lib/bottomline-policy.js';
import { keywordQueryWarnings } from '../_lib/keyword-query.js';
import { resolveMajorDomainQuery } from '../_lib/major-domain-runtime-adapter.v001.js';
import { buildSearchConflictAdvice } from '../_lib/search-conflict-advisor.js';
import { buildFilterConflicts } from '../_lib/filter-conflict-contract.js';
import { lookupScoreRank, getRankPopulation } from '../_lib/rank-table-provider.js';
import { resolveAdmissionSchoolQuery } from '../_lib/school-query-provider.v3969.js';
import {
  SCHOOL_QUERY_CONTRACT_VERSION,
  SCHOOL_QUERY_STATUSES,
  normalizeSchoolQueryIntent
} from '../../shared/resources/schools/school-query-contract.v3969_0.js';
import { acceptedAdmissionSchoolNames } from '../../shared/resources/schools/school-query-engine.v3969_0.js';
import {
  normalizePositionPreset,
  rankWindowsForCandidate,
  rankBandRangeText,
  resolveCanonicalPosition
} from '../../shared/algorithms/position/canonical-position.v3963_0.js';
import { ALGORITHM_ORCHESTRATION_VERSION } from '../../shared/algorithms/algorithm-registry.js';
import {
  getSchoolEntity,
  entitySourceQuery
} from '../../shared/resources/schools/school-identity-center.js';
import {
  detectSpecialProject,
  enrichSpecialProjectRecord,
  normalizeSpecialProjectMode,
  SPECIAL_PROJECT_COPY
} from '../_lib/special-project-policy.js';

assertMajorBandsRankIndex();

export const MAJOR_BANDS_ALL_BANDS_EXECUTION_MODE = 'sequential-internal-band-requests-v3990_3';
export const MAJOR_BANDS_ALL_BANDS_SHARED_PROJECTION_VERSION = 'major-bands-all-bands-shared-projection-v3990_3';
export const MAJOR_BANDS_ALL_BANDS_PAGE_LIMIT_CAP = 16;
export const MAJOR_BANDS_ALL_BANDS_EDGE_CACHE_VERSION = 'major-bands-all-bands-edge-cache-canonical-v3990_3';
const ALL_BANDS_EDGE_CACHE_TTL_SECONDS = 60;
const BAND_KEYS = Object.freeze(['upper', 'near', 'steady']);
export const MAJOR_BANDS_REQUESTED_BAND_ORDER_CACHE_VERSION = 'major-bands-requested-band-order-id-lru-v3990_3';
export const MAJOR_BANDS_REQUESTED_BAND_ORDER_EDGE_CACHE_VERSION = 'major-bands-requested-band-order-edge-cache-score-hints-v3990_3';
export const MAJOR_BANDS_REQUESTED_BAND_PAGE_SCORE_HINT_VERSION = 'major-bands-requested-band-page-score-hints-v3990_3';
const REQUESTED_BAND_ORDER_EDGE_CACHE_TTL_SECONDS = 180;
export const MAJOR_BANDS_REQUESTED_BAND_RESPONSE_EDGE_CACHE_VERSION = 'major-bands-requested-band-response-edge-cache-score-hints-v3990_3';
const REQUESTED_BAND_RESPONSE_EDGE_CACHE_TTL_SECONDS = 60;
export const MAJOR_BANDS_ORDER_PAGE_SOURCE_VERSION = 'major-bands-order-page-raw-row-reuse-v3990_3';
const REQUESTED_BAND_ORDER_CACHE_TTL_MS = 30_000;
const REQUESTED_BAND_ORDER_CACHE_MAX_IDS_PER_ENTRY = 6000;
const REQUESTED_BAND_ORDER_CACHE_MAX_CHARS_PER_ENTRY = 500_000;
const REQUESTED_BAND_ORDER_CACHE_MAX_ENTRIES = 8;
const REQUESTED_BAND_ORDER_CACHE_MAX_TOTAL_IDS = 12_000;
const REQUESTED_BAND_ORDER_CACHE_MAX_TOTAL_CHARS = 750_000;
const requestedBandOrderCache = new Map();

function pruneRequestedBandOrderCache(now = Date.now()) {
  for (const [identity, entry] of requestedBandOrderCache) {
    if (entry.expiresAt <= now) requestedBandOrderCache.delete(identity);
  }
}

function requestedBandOrderCacheTotals() {
  let ids = 0;
  let chars = 0;
  for (const entry of requestedBandOrderCache.values()) {
    ids += Number(entry.idCount || 0);
    chars += Number(entry.charCount || 0);
  }
  return { ids, chars };
}

function evictOldestRequestedBandOrderEntry() {
  const oldestIdentity = requestedBandOrderCache.keys().next().value;
  if (oldestIdentity !== undefined) requestedBandOrderCache.delete(oldestIdentity);
}

function readRequestedBandOrderSnapshot(identity, now = Date.now()) {
  pruneRequestedBandOrderCache(now);
  const entry = requestedBandOrderCache.get(identity);
  if (!entry) return null;
  try {
    const snapshot = JSON.parse(entry.serialized);
    requestedBandOrderCache.delete(identity);
    requestedBandOrderCache.set(identity, entry);
    return snapshot;
  } catch {
    requestedBandOrderCache.delete(identity);
    return null;
  }
}

function retainRequestedBandOrderSnapshot(identity, snapshot) {
  const ids = Array.isArray(snapshot?.orderedIds) ? snapshot.orderedIds : [];
  if (ids.length > REQUESTED_BAND_ORDER_CACHE_MAX_IDS_PER_ENTRY) return false;
  const serialized = JSON.stringify(snapshot);
  if (serialized.length > REQUESTED_BAND_ORDER_CACHE_MAX_CHARS_PER_ENTRY) return false;
  if (ids.length > REQUESTED_BAND_ORDER_CACHE_MAX_TOTAL_IDS) return false;
  if (serialized.length > REQUESTED_BAND_ORDER_CACHE_MAX_TOTAL_CHARS) return false;

  pruneRequestedBandOrderCache();
  requestedBandOrderCache.delete(identity);
  while (requestedBandOrderCache.size) {
    const totals = requestedBandOrderCacheTotals();
    const overEntries = requestedBandOrderCache.size >= REQUESTED_BAND_ORDER_CACHE_MAX_ENTRIES;
    const overIds = totals.ids + ids.length > REQUESTED_BAND_ORDER_CACHE_MAX_TOTAL_IDS;
    const overChars = totals.chars + serialized.length > REQUESTED_BAND_ORDER_CACHE_MAX_TOTAL_CHARS;
    if (!overEntries && !overIds && !overChars) break;
    evictOldestRequestedBandOrderEntry();
  }
  requestedBandOrderCache.set(identity, {
    serialized,
    idCount: ids.length,
    charCount: serialized.length,
    expiresAt: Date.now() + REQUESTED_BAND_ORDER_CACHE_TTL_MS
  });
  return true;
}

const MAJOR_BANDS_NON_BUSINESS_CACHE_PARAMS = Object.freeze([
  'stress',
  'deploy',
  'candidate',
  'production-resource-check'
]);

function stripMajorBandsNonBusinessCacheParams(url) {
  for (const key of MAJOR_BANDS_NON_BUSINESS_CACHE_PARAMS) url.searchParams.delete(key);
  return url;
}

function requestedBandOrderEdgeCacheRequest(request) {
  const url = new URL(request.url);
  stripMajorBandsNonBusinessCacheParams(url);
  url.searchParams.delete('offset');
  url.searchParams.delete('limit');
  url.searchParams.set('__orderEdgeCache', MAJOR_BANDS_REQUESTED_BAND_ORDER_EDGE_CACHE_VERSION);
  url.searchParams.set('__pageScoreHints', MAJOR_BANDS_REQUESTED_BAND_PAGE_SCORE_HINT_VERSION);
  url.searchParams.sort();
  return new Request(url.toString(), { method: 'GET' });
}

async function readRequestedBandOrderEdgeSnapshot(cache, request) {
  try {
    const response = await cache.match(request);
    if (!response) return null;
    const payload = await response.json();
    const snapshot = payload?.snapshot;
    const orderedIds = Array.isArray(snapshot?.orderedIds) ? snapshot.orderedIds : [];
    const orderedScores = Array.isArray(snapshot?.orderedScores) ? snapshot.orderedScores : [];
    if (payload?.version !== MAJOR_BANDS_REQUESTED_BAND_ORDER_EDGE_CACHE_VERSION) return null;
    if (snapshot?.version !== MAJOR_BANDS_REQUESTED_BAND_ORDER_CACHE_VERSION) return null;
    if (snapshot?.pageScoreHintVersion !== MAJOR_BANDS_REQUESTED_BAND_PAGE_SCORE_HINT_VERSION) return null;
    if (!snapshot?.snapshot || orderedIds.length > REQUESTED_BAND_ORDER_CACHE_MAX_IDS_PER_ENTRY) return null;
    if (orderedScores.length !== orderedIds.length || orderedScores.some(score => !Number.isFinite(Number(score)))) return null;
    return snapshot;
  } catch {
    return null;
  }
}

async function writeRequestedBandOrderEdgeSnapshot(cache, request, snapshot) {
  try {
    const payload = { version: MAJOR_BANDS_REQUESTED_BAND_ORDER_EDGE_CACHE_VERSION, snapshot };
    const body = JSON.stringify(payload);
    if (body.length > REQUESTED_BAND_ORDER_CACHE_MAX_CHARS_PER_ENTRY + 512) return false;
    await cache.put(request, new Response(body, {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': `public, max-age=${REQUESTED_BAND_ORDER_EDGE_CACHE_TTL_SECONDS}`
      }
    }));
    return true;
  } catch {
    return false;
  }
}

function orderedPageScores(records = []) {
  return (Array.isArray(records) ? records : []).map(record => {
    const score = Number(record?.score2026 ?? record?.score);
    return Number.isFinite(score) ? score : null;
  });
}

function selectRequestedBandPageBucketsByScoreHints(selectedBuckets = [], pageScores = [], pageIdCount = 0) {
  const buckets = Array.isArray(selectedBuckets) ? selectedBuckets : [];
  const scores = Array.isArray(pageScores) ? pageScores.map(Number) : [];
  if (!pageIdCount) {
    return { status: 'empty-page', buckets: [], candidateCount: buckets.length, hintedCount: 0, scoreCount: 0 };
  }
  if (scores.length !== pageIdCount || scores.some(score => !Number.isFinite(score))) {
    return { status: 'fallback-invalid-hints', buckets, candidateCount: buckets.length, hintedCount: buckets.length, scoreCount: scores.length };
  }
  const uniqueScores = [...new Set(scores)];
  const hinted = buckets.filter(bucket => uniqueScores.some(score => (
    score >= Number(bucket?.minScore) && score <= Number(bucket?.maxScore)
  )));
  const covered = uniqueScores.every(score => hinted.some(bucket => (
    score >= Number(bucket?.minScore) && score <= Number(bucket?.maxScore)
  )));
  if (!covered || !hinted.length) {
    return { status: 'fallback-uncovered-score', buckets, candidateCount: buckets.length, hintedCount: buckets.length, scoreCount: scores.length };
  }
  return { status: 'applied', buckets: hinted, candidateCount: buckets.length, hintedCount: hinted.length, scoreCount: scores.length };
}

function requestedBandOrderCacheState(identity = '') {
  pruneRequestedBandOrderCache();
  const totals = requestedBandOrderCacheTotals();
  return {
    version: MAJOR_BANDS_REQUESTED_BAND_ORDER_CACHE_VERSION,
    hit: requestedBandOrderCache.has(identity),
    entries: requestedBandOrderCache.size,
    totalIds: totals.ids,
    totalChars: totals.chars,
    maxEntries: REQUESTED_BAND_ORDER_CACHE_MAX_ENTRIES,
    maxIdsPerEntry: REQUESTED_BAND_ORDER_CACHE_MAX_IDS_PER_ENTRY,
    maxCharsPerEntry: REQUESTED_BAND_ORDER_CACHE_MAX_CHARS_PER_ENTRY,
    maxTotalIds: REQUESTED_BAND_ORDER_CACHE_MAX_TOTAL_IDS,
    maxTotalChars: REQUESTED_BAND_ORDER_CACHE_MAX_TOTAL_CHARS,
    ttlMs: REQUESTED_BAND_ORDER_CACHE_TTL_MS,
    bounded: requestedBandOrderCache.size <= REQUESTED_BAND_ORDER_CACHE_MAX_ENTRIES
      && totals.ids <= REQUESTED_BAND_ORDER_CACHE_MAX_TOTAL_IDS
      && totals.chars <= REQUESTED_BAND_ORDER_CACHE_MAX_TOTAL_CHARS,
    serializedOrderIdsOnly: true,
    retainsDecodedRows: false,
    retainsEnrichedRecords: false
  };
}

function json(payload, status = 200) {
  const body = JSON.stringify(payload);
  const cacheControl = status === 200
    ? 'public, max-age=0, s-maxage=60, stale-while-revalidate=120'
    : 'no-store';
  return new Response(body, {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': cacheControl,
      'x-gaokao-response-transport': MAJOR_BANDS_RESPONSE_TRANSPORT_VERSION,
      'x-gaokao-query-kernel': MAJOR_BANDS_RANK_QUERY_KERNEL_VERSION
    }
  });
}

function clean(value, max = 50) {
  return String(value || '').trim().slice(0, max);
}

function pageNumber(value, fallback = 0) {
  const text = String(value ?? '').trim();
  if (!text) return fallback;
  const number = Math.floor(Number(text));
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function initGrouped(bands) {
  return {
    upper: { ...bands.upper, records: [], count: 0, scanned: 0, truncated: false },
    near: { ...bands.near, records: [], count: 0, scanned: 0, truncated: false },
    steady: { ...bands.steady, records: [], count: 0, scanned: 0, truncated: false }
  };
}

function normalizeSchoolName(value) {
  return clean(value, 120)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[（【\[]/g, '(')
    .replace(/[）】\]]/g, ')')
    .replace(/[\s·•,，。；;：:'"“”‘’!！?？_—-]+/g, '');
}

function exactSchoolNames(entity, schoolKeyword) {
  if (!entity) return null;
  return new Set([
    entitySourceQuery(entity, schoolKeyword),
    entity?.displayName,
    entity?.sourceQuery,
    ...(Array.isArray(entity?.aliases) ? entity.aliases : [])
  ].map(normalizeSchoolName).filter(Boolean));
}

function rankContextForScore(score) {
  const row = lookupScoreRank({ year: 2026, region: 'ln', subject: 'physics', score });
  if (!row) return null;
  const rankStart = Number(row.rankStart);
  const rankEnd = Number(row.rankEnd ?? row.cumulative ?? row.rankForGap);
  const sameCount = Number(row.sameCount);
  return {
    score: Number(row.score ?? score),
    rankStart: Number.isFinite(rankStart) ? rankStart : null,
    rankEnd: Number.isFinite(rankEnd) ? rankEnd : null,
    rankForGap: Number.isFinite(Number(row.rankForGap))
      ? Number(row.rankForGap)
      : (Number.isFinite(rankEnd) ? rankEnd : null),
    sameCount: Number.isFinite(sameCount) ? sameCount : null,
    emptyScore: Boolean(row.emptyScore)
  };
}

function rankLabel(context) {
  if (!context?.rankEnd) return '2026 位次表无对应位置，本次返回空集合';
  if (context.emptyScore) {
    return `2026 年该分数没有同分考生，历史参考位置约在第 ${context.rankEnd.toLocaleString('zh-CN')} 位附近`;
  }
  if (context.rankStart && context.rankStart !== context.rankEnd) {
    return `按 2026 年成绩分布，历史参考位置约为 ${context.rankStart.toLocaleString('zh-CN')}—${context.rankEnd.toLocaleString('zh-CN')} 位`;
  }
  return `按 2026 年成绩分布，历史参考位置约为第 ${context.rankEnd.toLocaleString('zh-CN')} 位`;
}

function finalizeRecordForResponse(record, context = {}) {
  const canonicalPosition = resolveCanonicalPosition({
    candidateScore: context.candidateScore,
    candidateRank: context.candidateRank?.rankForGap,
    recordScore: record.score2026 ?? record.score,
    recordRank: record.rank2026 ?? record.rank,
    rangePreset: context.rangePreset
  });
  if (!canonicalPosition || canonicalPosition.bandKey !== record.bandKey) {
    throw new Error(`位次内核位置合同不一致：${record.id || `${record.school}|${record.major}`}`);
  }
  const specialProject = record.specialProject?.hasSpecialProject != null
    ? record.specialProject
    : detectSpecialProject(record);
  const expanded = {
    ...record,
    band: canonicalPosition.bandKey,
    bandKey: canonicalPosition.bandKey,
    candidateScore: context.candidateScore,
    candidateReferenceScore: context.candidateScore,
    scoreDelta2026: canonicalPosition.scoreDelta,
    scoreDelta: canonicalPosition.scoreDelta,
    rankGap2026: canonicalPosition.rankGap,
    rankGap: canonicalPosition.rankGap,
    statusKey: canonicalPosition.statusKey,
    statusLabel: canonicalPosition.statusLabel,
    position: canonicalPosition.position,
    canonicalPosition,
    matchBadges: Array.isArray(record.matchBadges) ? record.matchBadges : [],
    matchLevel: record.matchLevel || '',
    matchLabel: record.matchLabel || '',
    matchReason: record.matchReason || '',
    matchedKeyword: record.matchedKeyword || '',
    matchedTerms: Array.isArray(record.matchedTerms) ? record.matchedTerms : [],
    matchScore: Number(record.matchScore || 0),
    specialProject
  };
  if (specialProject.hasSpecialProject) {
    Object.assign(expanded, enrichSpecialProjectRecord(expanded));
    expanded.specialProjectExplicitIntent = Boolean(context.specialIntent);
  }
  const item = materializeMajorBandsStaticRecord(expanded);
  return { ...item, ...buildDisplayTags(item) };
}

function compactRankedSnapshot(records = []) {
  const ordered = [];
  let estimatedBytes = 2;
  for (const record of Array.isArray(records) ? records : []) {
    const compact = compactMajorBandsBucketCandidate(record);
    ordered.push(compact);
    estimatedBytes += JSON.stringify(compact).length + 1;
  }
  return { ordered, estimatedBytes };
}

function compactRankedPage(records = [], offset = 0, limit = 40) {
  const list = Array.isArray(records) ? records : [];
  const normalizedOffset = Math.max(0, Math.floor(Number(offset) || 0));
  const normalizedLimit = Math.max(1, Math.floor(Number(limit) || 1));
  const compact = compactRankedSnapshot(list.slice(normalizedOffset, normalizedOffset + normalizedLimit));
  const nextOffset = normalizedOffset + compact.ordered.length;
  const hasMore = nextOffset < list.length;
  return {
    ...compact,
    pagination: {
      offset: normalizedOffset,
      limit: normalizedLimit,
      returned: compact.ordered.length,
      hasMore,
      nextOffset: hasMore ? nextOffset : null
    }
  };
}

function queryIdentity({ candidateScore, rangePreset, filters, schoolNames, band, pageOffset, pageLimit }) {
  const identity = {
    version: MAJOR_BANDS_RANK_QUERY_KERNEL_VERSION,
    candidateScore,
    rangePreset,
    region: filters.region,
    schoolNames: [...schoolNames].sort((left, right) => left.localeCompare(right, 'zh-CN')),
    majorKeyword: filters.majorKeyword,
    bottomLineMode: filters.bottomLineMode,
    specialProjectMode: filters.specialProjectMode,
    platformTarget: filters.platformTarget,
    band
  };
  if (band === 'all-bands-execution') {
    identity.page = {
      offset: Math.max(0, Math.floor(Number(pageOffset) || 0)),
      limit: Math.max(1, Math.floor(Number(pageLimit) || 1))
    };
  }
  return JSON.stringify(identity);
}

function allBandsPageIdentity(input) {
  return JSON.stringify({
    version: MAJOR_BANDS_ALL_BANDS_PAGE_CACHE_VERSION,
    candidateScore: input.candidateScore,
    rangePreset: input.rangePreset,
    filters: input.filters,
    pageOffset: input.pageOffset,
    pageLimit: input.pageLimit,
    requestedPageLimit: input.requestedPageLimit
  });
}

function numericSum(payloads, path) {
  return payloads.reduce((sum, payload) => {
    let value = payload;
    for (const key of path) value = value?.[key];
    return sum + (Number(value) || 0);
  }, 0);
}

function mergeNumericTree(values = []) {
  const result = {};
  for (const value of values) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    for (const [key, item] of Object.entries(value)) {
      if (typeof item === 'number' && Number.isFinite(item)) {
        result[key] = (Number(result[key]) || 0) + item;
      } else if (item && typeof item === 'object' && !Array.isArray(item)) {
        result[key] = mergeNumericTree([result[key], item]);
      } else if (result[key] === undefined) {
        result[key] = item;
      }
    }
  }
  return result;
}

function requestForBand(request, sourceUrl, band, pageLimit) {
  const bandUrl = new URL(sourceUrl);
  bandUrl.searchParams.set('band', band);
  bandUrl.searchParams.set('limit', String(pageLimit));
  return new Request(bandUrl.toString(), {
    method: 'GET',
    headers: request.headers,
    redirect: request.redirect,
    signal: request.signal
  });
}

function allBandsEdgeCacheHandle() {
  const cache = globalThis.caches?.default;
  return cache && typeof cache.match === 'function' && typeof cache.put === 'function' ? cache : null;
}

function requestedBandResponseEdgeCacheRequest(sourceUrl) {
  const url = new URL(sourceUrl);
  stripMajorBandsNonBusinessCacheParams(url);
  url.searchParams.set('__requestedBandResponseEdgeCache', MAJOR_BANDS_REQUESTED_BAND_RESPONSE_EDGE_CACHE_VERSION);
  url.searchParams.sort();
  return new Request(url.toString(), { method: 'GET' });
}

function responseWithRequestedBandResponseEdgeCacheStatus(response, status) {
  const headers = new Headers(response.headers);
  headers.set('x-gaokao-requested-band-response-edge-cache', status);
  headers.set('x-gaokao-requested-band-response-edge-cache-version', MAJOR_BANDS_REQUESTED_BAND_RESPONSE_EDGE_CACHE_VERSION);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

async function readRequestedBandResponseEdgeCache(cache, request) {
  try {
    return await cache.match(request);
  } catch {
    return null;
  }
}

async function writeRequestedBandResponseEdgeCache(cache, request, response) {
  if (response.status !== 200) return false;
  try {
    const cached = responseWithRequestedBandResponseEdgeCacheStatus(response.clone(), 'stored');
    const headers = new Headers(cached.headers);
    headers.set('cache-control', `public, max-age=0, s-maxage=${REQUESTED_BAND_RESPONSE_EDGE_CACHE_TTL_SECONDS}, stale-while-revalidate=120`);
    await cache.put(request, new Response(cached.body, {
      status: cached.status,
      statusText: cached.statusText,
      headers
    }));
    return true;
  } catch {
    return false;
  }
}

function allBandsEdgeCacheRequest(sourceUrl, input) {
  const url = new URL(sourceUrl);
  stripMajorBandsNonBusinessCacheParams(url);
  url.searchParams.delete('band');
  url.searchParams.set('limit', String(input.pageLimit));
  url.searchParams.set('__requestedLimit', String(input.requestedPageLimit));
  url.searchParams.set('__edgeCache', MAJOR_BANDS_ALL_BANDS_EDGE_CACHE_VERSION);
  url.searchParams.sort();
  return new Request(url.toString(), { method: 'GET' });
}

function responseWithAllBandsEdgeCacheStatus(response, status) {
  const headers = new Headers(response.headers);
  headers.set('x-gaokao-all-bands-edge-cache', status);
  headers.set('x-gaokao-all-bands-edge-cache-version', MAJOR_BANDS_ALL_BANDS_EDGE_CACHE_VERSION);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

async function readAllBandsEdgeCache(cache, request) {
  try {
    return await cache.match(request);
  } catch {
    return null;
  }
}

async function writeAllBandsEdgeCache(cache, request, execution) {
  try {
    await cache.put(request, allBandsResponse(execution, 'stored'));
    return true;
  } catch {
    return false;
  }
}

function allBandsResponse(execution, edgeCacheStatus = 'unavailable') {
  const cacheControl = execution.status === 200
    ? 'public, max-age=0, s-maxage=60, stale-while-revalidate=120'
    : 'no-store';
  return new Response(execution.body, {
    status: execution.status,
    headers: {
      ...execution.headers,
      'content-type': 'application/json; charset=utf-8',
      'cache-control': cacheControl,
      'x-gaokao-response-transport': MAJOR_BANDS_RESPONSE_TRANSPORT_VERSION,
      'x-gaokao-query-kernel': MAJOR_BANDS_RANK_QUERY_KERNEL_VERSION,
      'x-gaokao-all-bands-page-cache': execution.cacheStatus,
      'x-gaokao-all-bands-edge-cache': edgeCacheStatus,
      'x-gaokao-all-bands-edge-cache-version': MAJOR_BANDS_ALL_BANDS_EDGE_CACHE_VERSION
    }
  });
}

async function executeAllBandsSequentially(context, sourceUrl, input) {
  const edgeCache = allBandsEdgeCacheHandle();
  const edgeCacheRequest = edgeCache ? allBandsEdgeCacheRequest(sourceUrl, input) : null;
  if (edgeCache && edgeCacheRequest) {
    const cached = await readAllBandsEdgeCache(edgeCache, edgeCacheRequest);
    if (cached) return responseWithAllBandsEdgeCacheStatus(cached, 'hit');
  }

  const execution = await executeMajorBandsAllBandsPageOnce(allBandsPageIdentity(input), async () => {
    const sharedProjectionEligible = !input.filters.schoolKeyword
      && !input.filters.schoolEntityId;
    let allBandsShared = null;
    if (sharedProjectionEligible) {
      const candidateRank = rankContextForScore(input.candidateScore);
      const totalRank = getRankPopulation({ year: 2026, region: 'ln', subject: 'physics', policy: 'table-total' });
      const rankWindows = rankWindowsForCandidate(candidateRank?.rankForGap, input.rangePreset, totalRank);
      const selectedBuckets = selectMajorBandsRankBuckets(rankWindows);
      const sharedProjectionUsesMinimalRows = input.filters.region === 'all'
        && !input.filters.majorKeyword
        && input.filters.bottomLineMode === 'all'
        && input.filters.specialProjectMode === 'hide_eligibility_projects';
      const loaded = await loadMajorBandsRankWindow(context, selectedBuckets, {
        projection: sharedProjectionUsesMinimalRows ? MAJOR_BANDS_RANK_ORDER_PROJECTION_VERSION : undefined,
        rawRowStorage: sharedProjectionUsesMinimalRows ? 'serialized-json' : undefined,
        predecodeRegion: input.filters.region,
        platformTarget: input.filters.platformTarget
      });
      const processed = processMajorBandsRankWindow(loaded.records, {
        candidateScore: input.candidateScore,
        candidateRank,
        rangePreset: input.rangePreset,
        region: input.filters.region,
        majorKeyword: input.filters.majorKeyword,
        bottomLineMode: input.filters.bottomLineMode,
        specialProjectMode: input.filters.specialProjectMode,
        platformTarget: input.filters.platformTarget,
        schoolFilter: false,
        acceptedSchoolNames: []
      });
      allBandsShared = {
        version: MAJOR_BANDS_ALL_BANDS_SHARED_PROJECTION_VERSION,
        candidateRank,
        totalRank,
        rankWindows,
        selectedBuckets,
        loadedStats: loaded.stats,
        processed,
        bandUses: 0,
        physicalProjectionPasses: selectedBuckets.length ? 1 : 0,
        fallbackPageRefetches: 0
      };
    }

    const payloads = [];
    for (const band of BAND_KEYS) {
      const response = await onRequest({
        ...context,
        majorBandsInternalBandRequest: true,
        majorBandsAllBandsShared: allBandsShared,
        request: requestForBand(context.request, sourceUrl, band, input.pageLimit)
      });
      if (!response.ok) return response;
      payloads.push(await response.json());
    }

    const sharedAggregate = allBandsShared?.processed?.stats || null;
    const sharedLoadedStats = allBandsShared?.loadedStats || null;
    const sharedSelectedBucketCount = Array.isArray(allBandsShared?.selectedBuckets)
      ? allBandsShared.selectedBuckets.length
      : 0;
    const sharedBandUses = Number(allBandsShared?.bandUses || 0);
    const sharedPhysicalProjectionPasses = Number(allBandsShared?.physicalProjectionPasses || 0);
    const sharedFallbackPageRefetches = Number(allBandsShared?.fallbackPageRefetches || 0);
    let sharedTransientProjectionReleased = false;
    if (allBandsShared) {
      allBandsShared.processed = null;
      allBandsShared.loadedStats = null;
      allBandsShared.selectedBuckets = null;
      sharedTransientProjectionReleased = allBandsShared.processed === null
        && allBandsShared.loadedStats === null
        && allBandsShared.selectedBuckets === null;
    }

    const byBand = Object.fromEntries(BAND_KEYS.map((band, index) => [band, payloads[index]]));
    const bands = Object.fromEntries(BAND_KEYS.map(band => [band, byBand[band].bands[band]]));
    const counts = Object.fromEntries(BAND_KEYS.map(band => [band, Number(bands[band]?.count || 0)]));
    counts.total = BAND_KEYS.reduce((sum, band) => sum + counts[band], 0);

    const keywordQuery = payloads[0].keywordQuery || {};
    const matchSummary = sharedAggregate?.matchSummary
      ? mergeNumericTree([sharedAggregate.matchSummary])
      : mergeNumericTree(payloads.map(payload => payload.matchSummary));
    const specialProjectStats = sharedAggregate?.specialProjectStats
      ? mergeNumericTree([sharedAggregate.specialProjectStats])
      : mergeNumericTree(payloads.map(payload => payload.source?.specialProjectStats));
    const bottomLineUnresolved = sharedAggregate
      ? Number(sharedAggregate.bottomLineUnresolved || 0)
      : numericSum(payloads, ['source', 'bottomLineUnresolved']);
    const specialProjectShown = sharedAggregate
      ? Number(sharedAggregate.specialProjectShown || 0)
      : numericSum(payloads, ['source', 'specialProjectShown']);
    const specialProjectHidden = sharedAggregate
      ? Number(sharedAggregate.specialProjectHidden || 0)
      : numericSum(payloads, ['source', 'specialProjectHidden']);
    const specialIntent = /公费师范|优师|定向|专项|预科|民族班|公安|警察|司法|航海|轮机/.test(input.filters.majorKeyword);
    const searchAdvices = buildSearchConflictAdvice({
      keywordQuery,
      bottomLineMode: input.filters.bottomLineMode,
      specialProjectMode: input.filters.specialProjectMode,
      resultStats: { total: counts.total }
    });
    if (bottomLineUnresolved) {
      searchAdvices.unshift({
        level: 'warn',
        message: `有 ${bottomLineUnresolved} 条记录的办学性质或费用尚未确认，已降低排序并标记待核验。`,
        explanation: '未知不等于公办普通，填报前需要核对当年招生计划和学费。'
      });
    }
    if (specialIntent && specialProjectShown) {
      searchAdvices.unshift({
        level: 'warn',
        message: '已按你的明确关键词显示特殊项目。',
        explanation: '请逐条核验资格、批次、体检、服务年限和违约责任。'
      });
    }

    const meta = {
      ...payloads[0].meta,
      pageBand: 'all',
      elapsedMs: Date.now() - input.started,
      specialProject: {
        ...payloads[0].meta?.specialProject,
        hidden: specialProjectHidden,
        shown: specialProjectShown
      }
    };
    const rankWindows = meta.rankWindows;
    const uniqueBuckets = selectMajorBandsRankBuckets(rankWindows);
    const returnedRecords = BAND_KEYS.reduce((sum, band) => sum + (bands[band]?.records?.length || 0), 0);
    const estimatedBytes = JSON.stringify(bands).length;
    const source = {
      ...payloads[0].source,
      allBandsPageLimitCap: MAJOR_BANDS_ALL_BANDS_PAGE_LIMIT_CAP,
      allBandsRequestedPageLimit: input.requestedPageLimit,
      allBandsEffectivePageLimit: input.pageLimit,
      queryExecutionCacheStatus: 'sequential-band-orchestration',
      queryExecutionJoinedInFlight: payloads.some(payload => Boolean(payload.source?.queryExecutionJoinedInFlight)),
      queryExecutionRetentionMode: 'compact-current-page-per-band',
      queryExecutionRetainedRecords: returnedRecords,
      queryExecutionEstimatedBytes: estimatedBytes,
      queryExecutionPageOffset: input.pageOffset,
      queryExecutionPageLimit: input.pageLimit,
      architecture: 'single-worker-sequential-band-pages-over-immutable-static-buckets',
      chunksRead: uniqueBuckets.length,
      chunksSkipped: MAJOR_BANDS_RANK_BUCKETS.length - uniqueBuckets.length,
      rankBucketReadsTotal: allBandsShared ? sharedSelectedBucketCount : numericSum(payloads, ['source', 'chunksRead']),
      rawScanned: sharedAggregate ? Number(sharedAggregate.rawScanned || 0) : numericSum(payloads, ['source', 'rawScanned']),
      canonicalCandidate: sharedAggregate ? Number(sharedAggregate.canonicalCandidate || 0) : numericSum(payloads, ['source', 'canonicalCandidate']),
      rawCandidate: sharedAggregate ? Number(sharedAggregate.rawCandidate || 0) : numericSum(payloads, ['source', 'rawCandidate']),
      normalized: sharedAggregate ? Number(sharedAggregate.normalized || 0) : numericSum(payloads, ['source', 'normalized']),
      staticIndexBytes: sharedLoadedStats ? Number(sharedLoadedStats.staticIndexBytes || 0) : numericSum(payloads, ['source', 'staticIndexBytes']),
      bottomLineExcluded: sharedAggregate ? Number(sharedAggregate.bottomLineExcluded || 0) : numericSum(payloads, ['source', 'bottomLineExcluded']),
      bottomLineUnresolved,
      majorKeywordExcluded: sharedAggregate ? Number(sharedAggregate.majorKeywordExcluded || 0) : numericSum(payloads, ['source', 'majorKeywordExcluded']),
      majorHitCount: sharedAggregate ? Number(sharedAggregate.majorHitCount || 0) : numericSum(payloads, ['source', 'majorHitCount']),
      projectHitCount: sharedAggregate ? Number(sharedAggregate.projectHitCount || 0) : numericSum(payloads, ['source', 'projectHitCount']),
      industryHitCount: sharedAggregate ? Number(sharedAggregate.industryHitCount || 0) : numericSum(payloads, ['source', 'industryHitCount']),
      specialProjectHidden,
      specialProjectShown,
      specialProjectStats,
      rankBucketCacheHits: sharedLoadedStats ? Number(sharedLoadedStats.cacheHits || 0) : numericSum(payloads, ['source', 'rankBucketCacheHits']),
      rankBucketCacheMisses: sharedLoadedStats ? Number(sharedLoadedStats.cacheMisses || 0) : numericSum(payloads, ['source', 'rankBucketCacheMisses']),
      rankRowFilterVersion: MAJOR_BANDS_RANK_ROW_FILTER_VERSION,
      rankRawRowCount: sharedLoadedStats ? Number(sharedLoadedStats.rawRowCount || 0) : numericSum(payloads, ['source', 'rankRawRowCount']),
      rankDecodedRowCount: sharedLoadedStats ? Number(sharedLoadedStats.decodedRowCount || 0) : numericSum(payloads, ['source', 'rankDecodedRowCount']),
      rankRowsSkipped: sharedLoadedStats ? Number(sharedLoadedStats.rankRowsSkipped || 0) : numericSum(payloads, ['source', 'rankRowsSkipped']),
      rankBucketConcurrency: sharedLoadedStats ? Number(sharedLoadedStats.peakConcurrency || 0) : Math.max(...payloads.map(payload => Number(payload.source?.rankBucketConcurrency || 0))),
      rankBucketMaxConcurrency: sharedLoadedStats ? Number(sharedLoadedStats.maxConcurrency || 0) : Math.max(...payloads.map(payload => Number(payload.source?.rankBucketMaxConcurrency || 0))),
      sortPasses: sharedAggregate ? Number(sharedAggregate.sortPasses || 0) : numericSum(payloads, ['source', 'sortPasses']),
      allBandsExecutionMode: MAJOR_BANDS_ALL_BANDS_EXECUTION_MODE,
      allBandsPageCacheVersion: MAJOR_BANDS_ALL_BANDS_PAGE_CACHE_VERSION,
      allBandsEdgeCacheVersion: MAJOR_BANDS_ALL_BANDS_EDGE_CACHE_VERSION,
      allBandsEdgeCacheCanonicalKey: true,
      allBandsEdgeCacheTtlSeconds: ALL_BANDS_EDGE_CACHE_TTL_SECONDS,
      allBandsSharedProjectionVersion: MAJOR_BANDS_ALL_BANDS_SHARED_PROJECTION_VERSION,
      allBandsPhysicalProjectionPasses: allBandsShared ? sharedPhysicalProjectionPasses : 0,
      allBandsSharedProjectionReuses: allBandsShared ? Math.max(0, sharedBandUses - 1) : 0,
      allBandsFallbackPageRefetches: allBandsShared ? sharedFallbackPageRefetches : BAND_KEYS.length,
      allBandsPhysicalAssetPasses: allBandsShared ? sharedPhysicalProjectionPasses : BAND_KEYS.length,
      allBandsTransientProjectionReleased: allBandsShared ? sharedTransientProjectionReleased : true,
      sequentialBandPasses: BAND_KEYS.length,
      mode: 'single-worker-sequential-band-query-stable-snapshot-paged'
    };

    return {
      ok: true,
      meta,
      keywordQuery,
      keywordWarnings: keywordQueryWarnings(keywordQuery),
      filterConflicts: buildFilterConflicts({
        keywordQuery,
        rawKeywordText: input.filters.majorKeyword || '',
        bottomLineMode: input.filters.bottomLineMode,
        specialProjectMode: input.filters.specialProjectMode
      }),
      searchAdvices,
      matchSummary,
      bands,
      counts,
      source
    };
  });
  const response = allBandsResponse(execution, edgeCache ? 'miss' : 'unavailable');
  if (edgeCache && edgeCacheRequest && execution.status === 200) {
    const stored = await writeAllBandsEdgeCache(edgeCache, edgeCacheRequest, execution);
    if (!stored) return responseWithAllBandsEdgeCacheStatus(response, 'write-failed');
  }
  return response;
}

async function executeRequestedBandOrderedPage(context, input) {
  const {
    candidateScore, rangePreset, filters, schoolNames, schoolFilter, requestedBand,
    pageOffset, pageLimit, executionBaseIdentity
  } = input;
  const orderIdentity = `${executionBaseIdentity}|ordered-id-snapshot`;
  const allBandsShared = context?.majorBandsAllBandsShared?.version === MAJOR_BANDS_ALL_BANDS_SHARED_PROJECTION_VERSION
    ? context.majorBandsAllBandsShared
    : null;
  const minimalOrderProjection = !schoolFilter
    && filters.specialProjectMode === 'hide_eligibility_projects';
  const orderEdgeCache = allBandsShared ? null : allBandsEdgeCacheHandle();
  const orderEdgeCacheRequest = orderEdgeCache ? requestedBandOrderEdgeCacheRequest(context.request) : null;
  const moduleOrderCacheEnabled = !orderEdgeCache;
  let retained = allBandsShared ? null : (moduleOrderCacheEnabled ? readRequestedBandOrderSnapshot(orderIdentity) : null);
  let heavyExecution = null;
  let loadedStats = null;
  let selectedBuckets = null;
  let pageRecords = null;
  let orderPageSource = 'page-id-refetch';
  let orderPageBucketHintStatus = allBandsShared ? 'shared-projection' : 'not-needed';
  let orderPageBucketHintCandidateCount = 0;
  let orderPageBucketHintedCount = 0;
  let orderPageBucketSelectedCount = 0;
  let orderPageScoreHintCount = 0;
  let orderCacheStatus = retained ? 'ordered-id-hit' : 'ordered-id-miss';
  let orderEdgeCacheStatus = allBandsShared
    ? 'shared-projection'
    : (retained ? 'module-hit' : (orderEdgeCache ? 'miss' : 'unavailable'));
  if (!retained && orderEdgeCache && orderEdgeCacheRequest) {
    retained = await readRequestedBandOrderEdgeSnapshot(orderEdgeCache, orderEdgeCacheRequest);
    if (retained) {
      if (moduleOrderCacheEnabled) retainRequestedBandOrderSnapshot(orderIdentity, retained);
      orderCacheStatus = 'ordered-id-edge-hit';
      orderEdgeCacheStatus = 'hit';
    }
  }

  if (allBandsShared?.processed) {
    const ordered = allBandsShared.processed.grouped[requestedBand].ordered;
    const identity = queryIdentity({ candidateScore, rangePreset, filters, schoolNames, band: requestedBand });
    retained = {
      version: MAJOR_BANDS_REQUESTED_BAND_ORDER_CACHE_VERSION,
      candidateRank: allBandsShared.candidateRank,
      totalRank: allBandsShared.totalRank,
      rankWindows: allBandsShared.rankWindows,
      aggregate: {
        ...allBandsShared.processed.stats,
        requestedBand,
        sortPasses: ordered.length > 1 ? 1 : 0
      },
      keywordQuery: allBandsShared.processed.keywordQuery,
      orderProjectionVersion: allBandsShared.loadedStats.projectionVersion,
      orderMinimalProjection: allBandsShared.loadedStats.minimalProjection === true,
      orderRawRowCount: allBandsShared.loadedStats.rawRowCount,
      orderDecodedRowCount: allBandsShared.loadedStats.decodedRowCount,
      orderedIds: ordered.map(record => record.id),
      orderedScores: orderedPageScores(ordered),
      pageScoreHintVersion: MAJOR_BANDS_REQUESTED_BAND_PAGE_SCORE_HINT_VERSION,
      snapshot: majorBandsSnapshotId(ordered, identity)
    };
    const orderedPage = ordered.slice(pageOffset, pageOffset + pageLimit);
    const sharedProjectionUsesRawRows = allBandsShared.loadedStats.minimalProjection === true;
    pageRecords = sharedProjectionUsesRawRows
      ? orderedPage.map(record => {
          if (!(Array.isArray(record.majorBandsRawRow) || typeof record.majorBandsRawRow === 'string') || !Array.isArray(record.majorBandsRawSchema)) {
            throw new Error(`位次共享投影缺少原始行引用：${record.id || 'unknown'}`);
          }
          return decodeMajorBandsStaticRow(record.majorBandsRawRow, record.majorBandsRawSchema);
        })
      : orderedPage;
    loadedStats = allBandsShared.loadedStats;
    selectedBuckets = allBandsShared.selectedBuckets;
    // The all-band response consumes one shared projection synchronously.
    // Do not duplicate three complete ordered-ID snapshots into module state,
    // and release each heavy ordered array immediately after its page is decoded.
    ordered.length = 0;
    orderCacheStatus = 'all-bands-shared-projection';
    orderPageSource = 'all-bands-shared-projection';
    if (!sharedProjectionUsesRawRows) {
      orderCacheStatus = 'all-bands-shared-full-record';
      orderPageSource = 'all-bands-shared-full-record';
    }
    allBandsShared.bandUses = Number(allBandsShared.bandUses || 0) + 1;
  } else if (!retained) {
    heavyExecution = await executeMajorBandsQueryOnce(orderIdentity, async () => {
      const candidateRank = rankContextForScore(candidateScore);
      const totalRank = getRankPopulation({ year: 2026, region: 'ln', subject: 'physics', policy: 'table-total' });
      const rankWindows = rankWindowsForCandidate(candidateRank?.rankForGap, rangePreset, totalRank);
      const selected = selectMajorBandsRankBuckets(rankWindows);
      const loaded = await loadMajorBandsRankWindow(context, selected, {
        projection: minimalOrderProjection ? MAJOR_BANDS_RANK_ORDER_PROJECTION_VERSION : undefined,
        rawRowStorage: minimalOrderProjection ? 'array-reference' : undefined,
        predecodeRegion: filters.region,
        platformTarget: filters.platformTarget
      });
      const processed = processMajorBandsRankWindow(loaded.records, {
        candidateScore,
        candidateRank,
        rangePreset,
        region: filters.region,
        majorKeyword: '',
        bottomLineMode: filters.bottomLineMode,
        specialProjectMode: filters.specialProjectMode,
        platformTarget: filters.platformTarget,
        schoolFilter,
        acceptedSchoolNames: schoolNames
      });
      const ordered = processed.grouped[requestedBand].ordered;
      const identity = queryIdentity({ candidateScore, rangePreset, filters, schoolNames, band: requestedBand });
      const orderSnapshot = {
        version: MAJOR_BANDS_REQUESTED_BAND_ORDER_CACHE_VERSION,
        candidateRank,
        totalRank,
        rankWindows,
        aggregate: processed.stats,
        keywordQuery: processed.keywordQuery,
        orderProjectionVersion: loaded.stats.projectionVersion,
        orderMinimalProjection: loaded.stats.minimalProjection === true,
        orderRawRowCount: loaded.stats.rawRowCount,
        orderDecodedRowCount: loaded.stats.decodedRowCount,
        orderedIds: ordered.map(record => record.id),
        orderedScores: orderedPageScores(ordered),
        pageScoreHintVersion: MAJOR_BANDS_REQUESTED_BAND_PAGE_SCORE_HINT_VERSION,
        snapshot: majorBandsSnapshotId(ordered, identity)
      };
      const rawRowReuse = loaded.stats.minimalProjection === true;
      const orderedPage = ordered.slice(pageOffset, pageOffset + pageLimit);
      const currentPageRecords = rawRowReuse
        ? orderedPage.map(record => {
            if (!(Array.isArray(record.majorBandsRawRow) || typeof record.majorBandsRawRow === 'string') || !Array.isArray(record.majorBandsRawSchema)) {
              throw new Error(`位次最小投影缺少原始行引用：${record.id || 'unknown'}`);
            }
            return decodeMajorBandsStaticRow(record.majorBandsRawRow, record.majorBandsRawSchema);
          })
        : orderedPage;
      return {
        retained: orderSnapshot,
        loadedStats: loaded.stats,
        selectedBuckets: selected,
        pageRecords: currentPageRecords,
        pageOffset,
        pageLimit,
        orderPageSource: rawRowReuse ? 'raw-row-reuse' : 'full-record-reuse'
      };
    });
    const built = heavyExecution.value;
    retained = built.retained;
    loadedStats = built.loadedStats;
    selectedBuckets = built.selectedBuckets;
    if (Number(built.pageOffset) === pageOffset && Number(built.pageLimit) === pageLimit) {
      pageRecords = built.pageRecords;
      orderPageSource = built.orderPageSource || 'raw-row-reuse';
    }
    if (moduleOrderCacheEnabled) retainRequestedBandOrderSnapshot(orderIdentity, retained);
    if (orderEdgeCache && orderEdgeCacheRequest) {
      const stored = await writeRequestedBandOrderEdgeSnapshot(orderEdgeCache, orderEdgeCacheRequest, retained);
      orderEdgeCacheStatus = stored ? 'stored' : 'write-failed';
    }
    orderCacheStatus = heavyExecution.joinedInFlight ? 'ordered-id-singleflight-hit' : 'ordered-id-miss';
  }

  const orderedIds = Array.isArray(retained.orderedIds) ? retained.orderedIds : [];
  const orderedIdCount = orderedIds.length;
  const pageIds = orderedIds.slice(pageOffset, pageOffset + pageLimit);
  if (!pageRecords) {
    selectedBuckets = selectMajorBandsRankBuckets(retained.rankWindows);
    const pageScores = Array.isArray(retained.orderedScores)
      ? retained.orderedScores.slice(pageOffset, pageOffset + pageLimit)
      : [];
    const pageBucketHints = selectRequestedBandPageBucketsByScoreHints(selectedBuckets, pageScores, pageIds.length);
    orderPageBucketHintStatus = pageBucketHints.status;
    orderPageBucketHintCandidateCount = pageBucketHints.candidateCount;
    orderPageBucketHintedCount = pageBucketHints.hintedCount;
    orderPageScoreHintCount = pageBucketHints.scoreCount;
    selectedBuckets = pageBucketHints.buckets;
    const pageLoaded = await loadMajorBandsRankWindow(context, selectedBuckets, { allowedIds: new Set(pageIds), predecodeRegion: filters.region });
    orderPageBucketSelectedCount = selectedBuckets.length;
    loadedStats = pageLoaded.stats;
    const byId = new Map(pageLoaded.records.map(record => [record.id, record]));
    pageRecords = pageIds.map(id => byId.get(id)).filter(Boolean);
    orderPageSource = 'page-id-refetch';
  }
  if (pageRecords.length !== pageIds.length) {
    throw new Error(`位次有序 ID 页记录不完整：${pageRecords.length}/${pageIds.length}`);
  }
  for (const record of pageRecords) {
      const canonicalPosition = resolveCanonicalPosition({
        candidateScore,
        candidateRank: retained.candidateRank?.rankForGap,
        recordScore: record.score2026 ?? record.score,
        recordRank: record.rank2026 ?? record.rank,
        rangePreset
      });
      const bottomLineEligibility = filters.bottomLineMode === 'all'
        ? { status: 'pass', reason: 'mode_does_not_exclude' }
        : getBottomLineEligibility(record, filters.bottomLineMode);
      Object.assign(record, {
        band: requestedBand,
        bandKey: requestedBand,
        canonicalPosition: {
          bandKey: canonicalPosition.bandKey,
          positionDistance: canonicalPosition.positionDistance,
          evidenceStrength: canonicalPosition.evidenceStrength,
          classificationBasis: canonicalPosition.classificationBasis
        },
        bottomLineEligibility: bottomLineEligibility.status,
        bottomLineEligibilityReason: bottomLineEligibility.reason,
        specialProject: record.specialProject?.hasSpecialProject != null
          ? record.specialProject
          : detectSpecialProject(record)
      });
  }

  const compactPage = pageRecords.map(record => compactMajorBandsBucketCandidate(record));
  const nextOffset = pageOffset + compactPage.length;
  const hasMore = nextOffset < orderedIdCount;
  const compactGrouped = {};
  for (const key of BAND_KEYS) {
    const identity = queryIdentity({ candidateScore, rangePreset, filters, schoolNames, band: key });
    if (key === requestedBand) {
      compactGrouped[key] = {
        ordered: compactPage,
        count: orderedIdCount,
        snapshot: retained.snapshot,
        retentionScope: 'current-requested-band-page-from-ordered-ids',
        pagination: {
          offset: pageOffset,
          limit: pageLimit,
          returned: compactPage.length,
          hasMore,
          nextOffset: hasMore ? nextOffset : null,
          order: MAJOR_BANDS_RESULT_ORDER_VERSION,
          snapshot: retained.snapshot
        }
      };
    } else {
      compactGrouped[key] = {
        ordered: [],
        count: 0,
        snapshot: majorBandsSnapshotId([], identity),
        retentionScope: 'hidden-band',
        pagination: null
      };
    }
  }
  if (allBandsShared) orderedIds.length = 0;
  return {
    value: {
      candidateRank: retained.candidateRank,
      totalRank: retained.totalRank,
      rankWindows: retained.rankWindows,
      selectedBuckets,
      loadedStats,
      aggregate: retained.aggregate,
      keywordQuery: retained.keywordQuery,
      compactGrouped,
      cacheRetention: {
        mode: 'compact-requested-band-current-page-from-ordered-ids',
        recordCount: compactPage.length,
        estimatedBytes: JSON.stringify(compactPage).length,
        requestedBand,
        pageOffset,
        pageLimit,
        retainCompleted: false
      }
    },
    cacheStatus: heavyExecution?.cacheStatus || orderCacheStatus,
    joinedInFlight: Boolean(heavyExecution?.joinedInFlight),
    waitedForExecutionSlot: Boolean(heavyExecution?.waitedForExecutionSlot),
    orderCacheStatus,
    orderEdgeCacheVersion: MAJOR_BANDS_REQUESTED_BAND_ORDER_EDGE_CACHE_VERSION,
    orderEdgeCacheStatus,
    orderEdgeCacheCanonicalKey: true,
    orderEdgeCacheTtlSeconds: REQUESTED_BAND_ORDER_EDGE_CACHE_TTL_SECONDS,
    orderCacheIdCount: orderedIdCount,
    pageDecodedRecordCount: pageRecords.length,
    orderCacheState: requestedBandOrderCacheState(orderIdentity),
    orderModuleCacheEnabled: moduleOrderCacheEnabled,
    orderPageSourceVersion: MAJOR_BANDS_ORDER_PAGE_SOURCE_VERSION,
    orderPageSource,
    orderPageScoreHintVersion: MAJOR_BANDS_REQUESTED_BAND_PAGE_SCORE_HINT_VERSION,
    orderPageBucketHintStatus,
    orderPageBucketHintCandidateCount,
    orderPageBucketHintedCount,
    orderPageBucketSelectedCount,
    orderPageScoreHintCount,
    orderColdSecondAssetPass: orderCacheStatus === 'ordered-id-miss' && orderPageSource === 'page-id-refetch',
    rawRowReferenceNonEnumerable: true,
    orderProjectionVersion: retained.orderProjectionVersion || MAJOR_BANDS_RANK_ORDER_PROJECTION_VERSION,
    orderMinimalProjection: retained.orderMinimalProjection === true,
    orderRawRowCount: Number(retained.orderRawRowCount || 0),
    orderDecodedRowCount: Number(retained.orderDecodedRowCount || 0)
  };
}

export async function onRequest(context) {
  if (context.request.method !== 'GET') return json({ ok: false, message: '只支持 GET 请求。' }, 405);
  const started = Date.now();

  try {
    const url = new URL(context.request.url);
    const candidateScore = Math.round(Number(url.searchParams.get('candidateScore') || 520));
    const rangePreset = normalizePositionPreset(clean(url.searchParams.get('rangePreset') || 'standard', 20));
    const filters = {
      region: clean(url.searchParams.get('region') || 'all', 30),
      schoolKeyword: clean(url.searchParams.get('schoolKeyword') || '', 40),
      schoolEntityId: clean(url.searchParams.get('schoolEntityId') || '', 80),
      schoolQueryIntent: normalizeSchoolQueryIntent(url.searchParams.get('schoolQueryIntent') || 'auto'),
      majorKeyword: clean(url.searchParams.get('majorKeyword') || url.searchParams.get('majorName') || url.searchParams.get('keyword') || '', 160),
      bottomLineMode: normalizeBottomLineMode(url.searchParams.get('bottomLineMode') || 'all'),
      specialProjectMode: normalizeSpecialProjectMode(url.searchParams.get('specialProjectMode') || 'hide_eligibility_projects'),
      platformTarget: normalizePlatformTarget(url.searchParams.get('platformTarget') || '')
    };
    const majorDomain = resolveMajorDomainQuery(filters.majorKeyword);
    const requestedBandRaw = clean(url.searchParams.get('band') || '', 20);
    const requestedBand = BAND_KEYS.includes(requestedBandRaw) ? requestedBandRaw : '';
    const configuredPageSize = Math.max(16, Math.min(80, pageNumber(context.env?.MAJOR_BANDS_MAX_PER_BAND, 40)));
    const requestedPageLimit = Math.max(16, Math.min(configuredPageSize, pageNumber(url.searchParams.get('limit'), 40)));
    const pageLimit = requestedBand
      ? requestedPageLimit
      : Math.min(MAJOR_BANDS_ALL_BANDS_PAGE_LIMIT_CAP, requestedPageLimit);
    const pageOffset = pageNumber(url.searchParams.get('offset'), 0);

    if (!Number.isFinite(candidateScore) || candidateScore < 1 || candidateScore > 750) {
      return json({ ok: false, message: '参考分数格式不正确。' }, 400);
    }

    const requestedBandResponseEdgeCache = requestedBand && context?.majorBandsInternalBandRequest !== true
      ? allBandsEdgeCacheHandle()
      : null;
    const requestedBandResponseCacheKey = requestedBandResponseEdgeCache
      ? requestedBandResponseEdgeCacheRequest(url)
      : null;
    if (requestedBandResponseEdgeCache && requestedBandResponseCacheKey) {
      const cached = await readRequestedBandResponseEdgeCache(
        requestedBandResponseEdgeCache,
        requestedBandResponseCacheKey
      );
      if (cached) return responseWithRequestedBandResponseEdgeCacheStatus(cached, 'hit');
    }

    const allBandsPageCacheReleasedBeforeBandQuery = requestedBand
      ? releaseMajorBandsAllBandsCompletedPage()
      : false;

    if (!requestedBand) {
      return executeAllBandsSequentially(context, url, {
        candidateScore,
        rangePreset,
        filters,
        requestedPageLimit,
        pageLimit,
        pageOffset,
        started
      });
    }

    const schoolEntity = filters.schoolEntityId ? getSchoolEntity(filters.schoolEntityId) : null;
    if (filters.schoolEntityId && !schoolEntity) {
      return json({ ok: false, message: '学校实体不存在，请重新选择学校。' }, 400);
    }
    let acceptedSchoolNames = exactSchoolNames(schoolEntity, filters.schoolKeyword);
    let schoolQueryResult = null;
    if (!schoolEntity && filters.schoolKeyword) {
      schoolQueryResult = await resolveAdmissionSchoolQuery(context.request, {
        query: filters.schoolKeyword,
        intent: filters.schoolQueryIntent,
        limit: 500
      });
      if (schoolQueryResult.status === SCHOOL_QUERY_STATUSES.RESOLVED) {
        acceptedSchoolNames = acceptedAdmissionSchoolNames(schoolQueryResult);
      } else {
        return json({
          ok: false,
          code: 'school_query_requires_choice',
          message: schoolQueryResult.status === SCHOOL_QUERY_STATUSES.AMBIGUOUS
            ? '学校条件同时可能表示地域或校名，请先确认一所准确学校；查看城市范围请使用地区条件。'
            : '学校条件没有解析为辽宁2026物理类有投档记录的唯一学校。',
          schoolQuery: schoolQueryResult,
          schoolQueryContractVersion: SCHOOL_QUERY_CONTRACT_VERSION
        }, schoolQueryResult.status === SCHOOL_QUERY_STATUSES.NOT_FOUND ? 404 : 409);
      }
    }

    const schoolNames = acceptedSchoolNames ? [...acceptedSchoolNames] : [];
    const schoolFilter = Boolean(filters.schoolKeyword || filters.schoolEntityId);
    const executionBaseIdentity = queryIdentity({
      candidateScore,
      rangePreset,
      filters,
      schoolNames,
      band: requestedBand,
      pageOffset,
      pageLimit
    });
    const executionIdentity = `${executionBaseIdentity}|current-page:${pageOffset}:${pageLimit}`;
    const canReuseAllBandsShared = Boolean(
      context?.majorBandsAllBandsShared?.version === MAJOR_BANDS_ALL_BANDS_SHARED_PROJECTION_VERSION
      && context?.majorBandsAllBandsShared?.processed
    );
    const execution = (!filters.majorKeyword || canReuseAllBandsShared)
      ? await executeRequestedBandOrderedPage(context, {
          candidateScore, rangePreset, filters, schoolNames, schoolFilter, requestedBand,
          pageOffset, pageLimit, executionBaseIdentity
        })
      : await executeMajorBandsQueryOnce(executionIdentity, async () => {
      const candidateRank = rankContextForScore(candidateScore);
      const totalRank = getRankPopulation({ year: 2026, region: 'ln', subject: 'physics', policy: 'table-total' });
      const rankWindows = rankWindowsForCandidate(candidateRank?.rankForGap, rangePreset, totalRank);
      const selectedBuckets = selectMajorBandsRankBuckets(rankWindows);
      const loaded = await loadMajorBandsRankWindow(context, selectedBuckets);
      const processed = processMajorBandsRankWindow(loaded.records, {
        candidateScore,
        candidateRank,
        rangePreset,
        region: filters.region,
        majorKeyword: filters.majorKeyword,
        bottomLineMode: filters.bottomLineMode,
        specialProjectMode: filters.specialProjectMode,
        platformTarget: filters.platformTarget,
        schoolFilter,
        acceptedSchoolNames: schoolNames
      });
      const compactGrouped = {};
      let retainedRecordCount = 0;
      let retainedEstimatedBytes = 0;
      for (const key of BAND_KEYS) {
        const ordered = processed.grouped[key].ordered;
        const identity = queryIdentity({ candidateScore, rangePreset, filters, schoolNames, band: key });
        const retainRequestedBand = requestedBand === key;
        const compact = retainRequestedBand
          ? compactRankedPage(ordered, pageOffset, pageLimit)
          : { ordered: [], estimatedBytes: 0, pagination: null };
        const snapshot = majorBandsSnapshotId(ordered, identity);
        const pagination = compact.pagination
          ? { ...compact.pagination, order: MAJOR_BANDS_RESULT_ORDER_VERSION, snapshot }
          : null;
        compactGrouped[key] = {
          ordered: compact.ordered,
          count: ordered.length,
          snapshot,
          retentionScope: retainRequestedBand
            ? 'current-requested-band-page'
            : 'hidden-band',
          pagination
        };
        retainedRecordCount += compact.ordered.length;
        retainedEstimatedBytes += compact.estimatedBytes;
      }
      return {
        candidateRank,
        totalRank,
        rankWindows,
        selectedBuckets,
        loadedStats: loaded.stats,
        aggregate: processed.stats,
        keywordQuery: processed.keywordQuery,
        compactGrouped,
        cacheRetention: {
          mode: 'compact-requested-band-current-page',
          recordCount: retainedRecordCount,
          estimatedBytes: retainedEstimatedBytes,
          requestedBand,
          pageOffset,
          pageLimit,
          retainCompleted: false
        }
      };
    });
    const {
      candidateRank,
      totalRank,
      rankWindows,
      selectedBuckets,
      loadedStats,
      aggregate,
      keywordQuery,
      compactGrouped,
      cacheRetention
    } = execution.value;

    const specialIntent = /公费师范|优师|定向|专项|预科|民族班|公安|警察|司法|航海|轮机/.test(filters.majorKeyword);
    const grouped = initGrouped(makeBands(candidateScore, rangePreset));
    for (const key of BAND_KEYS) {
      const rankRangeText = rankBandRangeText(candidateRank?.rankForGap, key, rangePreset, totalRank);
      if (rankRangeText) {
        grouped[key].rankRangeText = rankRangeText;
        grouped[key].rangeText = rankRangeText;
      }

      const compactBand = compactGrouped[key];
      const ordered = compactBand.ordered;
      const identity = queryIdentity({ candidateScore, rangePreset, filters, schoolNames, band: key });
      const hiddenByBandRequest = requestedBand !== key;
      let page;
      if (hiddenByBandRequest) {
        page = {
          records: [],
          count: compactBand.count,
          pagination: {
            offset: 0,
            limit: pageLimit,
            returned: 0,
            hasMore: false,
            nextOffset: null,
            order: MAJOR_BANDS_RESULT_ORDER_VERSION,
            snapshot: compactBand.snapshot
          }
        };
      } else if (compactBand.pagination) {
        page = {
          records: ordered,
          count: compactBand.count,
          pagination: compactBand.pagination
        };
      } else {
        page = paginateMajorBandsRecords(ordered, {
          offset: pageOffset,
          limit: pageLimit,
          queryIdentity: identity
        });
      }
      if (!hiddenByBandRequest && page.pagination.snapshot !== compactBand.snapshot) {
        throw new Error(`位次分页快照不一致：${key}`);
      }
      const records = page.records.map(record => compactMajorBandsResponseRecord(
        finalizeRecordForResponse(record, { candidateScore, candidateRank, rangePreset, specialIntent })
      ));
      grouped[key].records = records;
      grouped[key].count = page.count;
      grouped[key].scanned = page.count;
      grouped[key].displayedCount = records.length;
      grouped[key].truncated = page.pagination.hasMore;
      grouped[key].pagination = page.pagination;
    }

    const keywordWarnings = keywordQueryWarnings(keywordQuery);
    const matchSummary = aggregate.matchSummary;
    const specialProjectStats = aggregate.specialProjectStats;
    const counts = {
      upper: grouped.upper.count,
      near: grouped.near.count,
      steady: grouped.steady.count
    };
    counts.total = counts.upper + counts.near + counts.steady;
    const filterConflicts = buildFilterConflicts({
      keywordQuery,
      rawKeywordText: filters.majorKeyword || '',
      bottomLineMode: filters.bottomLineMode,
      specialProjectMode: filters.specialProjectMode
    });
    const searchAdvices = buildSearchConflictAdvice({
      keywordQuery,
      bottomLineMode: filters.bottomLineMode,
      specialProjectMode: filters.specialProjectMode,
        platformTarget: filters.platformTarget,
      resultStats: { total: counts.total }
    });
    if (aggregate.bottomLineUnresolved) {
      searchAdvices.unshift({
        level: 'warn',
        message: `有 ${aggregate.bottomLineUnresolved} 条记录的办学性质或费用尚未确认，已降低排序并标记待核验。`,
        explanation: '未知不等于公办普通，填报前需要核对当年招生计划和学费。'
      });
    }
    if (specialIntent && aggregate.specialProjectShown) {
      searchAdvices.unshift({
        level: 'warn',
        message: '已按你的明确关键词显示特殊项目。',
        explanation: '请逐条核验资格、批次、体检、服务年限和违约责任。'
      });
    }

    const response = json({
      ok: true,
      meta: {
        audienceYear: 2027,
        activeDataYear: 2026,
        rankYear: 2026,
        candidateScore,
        candidateReferenceScore: candidateScore,
        candidateReferenceRank2026: candidateRank?.rankForGap || null,
        candidateReferenceRankStart2026: candidateRank?.rankStart || null,
        candidateReferenceRankEnd2026: candidateRank?.rankEnd || null,
        candidateSameCount2026: candidateRank?.sameCount ?? null,
        candidateRankEmptyScore: Boolean(candidateRank?.emptyScore),
        candidateRankLabel: rankLabel(candidateRank),
        classificationMode: candidateRank
          ? 'canonical_rank_primary_2026_position'
          : 'rank_unavailable_empty',
        emptyReason: candidateRank ? '' : 'candidate_rank_unavailable_for_2026_reference',
        algorithmOrchestrationVersion: ALGORITHM_ORCHESTRATION_VERSION,
        rangePreset,
        schoolEntityId: schoolEntity?.entityId || '',
        schoolMatchMode: schoolEntity
          ? 'exact-entity'
          : (schoolQueryResult?.status === SCHOOL_QUERY_STATUSES.RESOLVED ? 'unified-school-query' : 'all-schools'),
        schoolQueryContractVersion: SCHOOL_QUERY_CONTRACT_VERSION,
        schoolQueryIntent: filters.schoolQueryIntent,
        bottomLineMode: filters.bottomLineMode,
        specialProjectMode: filters.specialProjectMode,
        platformTarget: filters.platformTarget,
        majorDomain,
        specialProject: {
          mode: filters.specialProjectMode,
          explicitIntent: specialIntent,
          hidden: aggregate.specialProjectHidden,
          shown: aggregate.specialProjectShown,
          copy: filters.specialProjectMode === 'show_eligibility_projects' || specialIntent
            ? SPECIAL_PROJECT_COPY.showLabel
            : SPECIAL_PROJECT_COPY.hideLabel
        },
        bottomLine: bottomLineModeSummary(filters.bottomLineMode),
        dataScope: '辽宁 2026 物理类专业投档最低分',
        dataBoundary: '面向 2027 备考家庭；输入为模考或预估参考分数，位次是 2026 历史参考位置，不是 2027 实际位次。',
        bands: makeBands(candidateScore, rangePreset),
        rankWindows,
        maxPerBand: configuredPageSize,
        pageSize: pageLimit,
        pageBand: requestedBand,
        paginationContract: 'stable-full-id-snapshot-v3990_3',
        elapsedMs: Date.now() - started
      },
      keywordQuery,
      keywordWarnings,
      filterConflicts,
      searchAdvices,
      matchSummary,
      bands: grouped,
      counts,
      source: {
        dataYear: 2026,
        manifestVersion: MAJOR_BANDS_RANK_INDEX_SOURCE,
        rankIndexVersion: MAJOR_BANDS_RANK_INDEX_VERSION,
        queryKernelVersion: MAJOR_BANDS_RANK_QUERY_KERNEL_VERSION,
        queryExecutionCacheVersion: MAJOR_BANDS_QUERY_EXECUTION_CACHE_VERSION,
        queryExecutionCacheStatus: execution.cacheStatus,
        queryExecutionJoinedInFlight: execution.joinedInFlight,
        queryExecutionRetentionMode: cacheRetention.mode,
        queryExecutionRetainedRecords: cacheRetention.recordCount,
        queryExecutionEstimatedBytes: cacheRetention.estimatedBytes,
        queryExecutionPageOffset: cacheRetention.pageOffset,
        queryExecutionPageLimit: cacheRetention.pageLimit,
        requestedBandOrderCacheVersion: MAJOR_BANDS_REQUESTED_BAND_ORDER_CACHE_VERSION,
        requestedBandOrderCacheStatus: execution.orderCacheStatus || 'keyword-bypass',
        requestedBandOrderEdgeCacheVersion: execution.orderEdgeCacheVersion || MAJOR_BANDS_REQUESTED_BAND_ORDER_EDGE_CACHE_VERSION,
        requestedBandOrderEdgeCacheStatus: execution.orderEdgeCacheStatus || 'keyword-bypass',
        requestedBandOrderEdgeCacheCanonicalKey: execution.orderEdgeCacheCanonicalKey !== false,
        requestedBandOrderEdgeCacheTtlSeconds: Number(execution.orderEdgeCacheTtlSeconds || REQUESTED_BAND_ORDER_EDGE_CACHE_TTL_SECONDS),
        requestedBandOrderPageSourceVersion: execution.orderPageSourceVersion || MAJOR_BANDS_ORDER_PAGE_SOURCE_VERSION,
        requestedBandOrderPageSource: execution.orderPageSource || 'keyword-bypass',
        requestedBandOrderPageScoreHintVersion: execution.orderPageScoreHintVersion || MAJOR_BANDS_REQUESTED_BAND_PAGE_SCORE_HINT_VERSION,
        requestedBandOrderPageBucketHintStatus: execution.orderPageBucketHintStatus || 'keyword-bypass',
        requestedBandOrderPageBucketHintCandidates: Number(execution.orderPageBucketHintCandidateCount || 0),
        requestedBandOrderPageBucketHints: Number(execution.orderPageBucketHintedCount || 0),
        requestedBandOrderPageSelectedBuckets: Number(execution.orderPageBucketSelectedCount || 0),
        requestedBandOrderPageScoreHints: Number(execution.orderPageScoreHintCount || 0),
        requestedBandOrderColdSecondAssetPass: execution.orderColdSecondAssetPass === true,
        requestedBandRawRowReferenceNonEnumerable: execution.rawRowReferenceNonEnumerable === true,
        requestedBandRawRowStorage: loadedStats.rawRowStorage || 'full-record',
        requestedBandOrderIds: Number(execution.orderCacheIdCount || 0),
        requestedBandPageDecodedRecords: Number(execution.pageDecodedRecordCount || cacheRetention.recordCount || 0),
        requestedBandOrderProjectionVersion: execution.orderProjectionVersion || MAJOR_BANDS_RANK_ORDER_PROJECTION_VERSION,
        requestedBandOrderMinimalProjection: execution.orderMinimalProjection === true,
        requestedBandOrderBuildRawRows: Number(execution.orderRawRowCount || 0),
        requestedBandOrderBuildDecodedRows: Number(execution.orderDecodedRowCount || 0),
        requestedBandOrderCacheRetainsDecodedRows: false,
        requestedBandOrderCacheRetainsEnrichedRecords: false,
        requestedBandOrderCacheEntries: Number(execution.orderCacheState?.entries || 0),
        requestedBandOrderCacheTotalIds: Number(execution.orderCacheState?.totalIds || 0),
        requestedBandOrderCacheTotalChars: Number(execution.orderCacheState?.totalChars || 0),
        requestedBandOrderCacheMaxEntries: Number(execution.orderCacheState?.maxEntries || 8),
        requestedBandOrderCacheMaxTotalIds: Number(execution.orderCacheState?.maxTotalIds || 12000),
        requestedBandOrderCacheMaxTotalChars: Number(execution.orderCacheState?.maxTotalChars || 750000),
        requestedBandOrderCacheBounded: execution.orderCacheState?.bounded !== false,
        requestedBandOrderModuleCacheEnabled: execution.orderModuleCacheEnabled !== false,
        queryMemoryMode: aggregate.memoryMode,
        rankingCandidateMode: aggregate.rankingCandidateMode,
        deferredResponseEnrichment: aggregate.deferredResponseEnrichment,
        responseEnrichedCandidates: aggregate.responseEnrichedCandidates,
        allBandsPageCacheVersion: MAJOR_BANDS_ALL_BANDS_PAGE_CACHE_VERSION,
        allBandsPageCacheReleaseMode: 'release-completed-on-requested-band-switch-v3990_3',
        allBandsPageCacheReleasedBeforeBandQuery,
        bucketLoaderVersion: MAJOR_BANDS_RANK_BUCKET_LOADER_VERSION,
        bucketCacheVersion: MAJOR_BANDS_RANK_BUCKET_CACHE_VERSION,
        resultOrderVersion: MAJOR_BANDS_RESULT_ORDER_VERSION,
        responseTransportVersion: MAJOR_BANDS_RESPONSE_TRANSPORT_VERSION,
        architecture: 'single-worker-rank-window-over-immutable-static-buckets',
        totalRecords: MAJOR_BANDS_RANK_INDEX_RECORD_COUNT,
        chunksTotal: MAJOR_BANDS_RANK_BUCKETS.length,
        chunksRead: selectedBuckets.length,
        chunksSkipped: MAJOR_BANDS_RANK_BUCKETS.length - selectedBuckets.length,
        rawScanned: aggregate.rawScanned,
        canonicalCandidate: aggregate.canonicalCandidate,
        rawCandidate: aggregate.rawCandidate,
        normalized: aggregate.normalized,
        staticIndexBytes: loadedStats.staticIndexBytes,
        bottomLineExcluded: aggregate.bottomLineExcluded,
        bottomLineUnresolved: aggregate.bottomLineUnresolved,
        majorKeywordExcluded: aggregate.majorKeywordExcluded,
        majorHitCount: aggregate.majorHitCount,
        projectHitCount: aggregate.projectHitCount,
        industryHitCount: aggregate.industryHitCount,
        specialProjectHidden: aggregate.specialProjectHidden,
        specialProjectShown: aggregate.specialProjectShown,
        specialProjectStats,
        specialProjectMode: filters.specialProjectMode,
        platformTarget: filters.platformTarget,
        rankBucketCacheHits: loadedStats.cacheHits,
        rankBucketCacheMisses: loadedStats.cacheMisses,
        rankRowFilterVersion: MAJOR_BANDS_RANK_ROW_FILTER_VERSION,
        rankRawRowCount: loadedStats.rawRowCount,
        rankDecodedRowCount: loadedStats.decodedRowCount,
        rankRowsSkipped: loadedStats.rankRowsSkipped,
        rankOnlyRowsSkipped: loadedStats.rankOnlyRowsSkipped || 0,
        regionRowsSkipped: loadedStats.regionRowsSkipped || 0,
        predecodeRegion: loadedStats.predecodeRegion || filters.region || 'all',
        predecodeRegionFilterVersion: loadedStats.predecodeRegionFilterVersion || 'major-bands-predecode-region-filter-v3990_3',
        pageIdRowsSkipped: loadedStats.pageIdRowsSkipped || 0,
        pageIdFilterCount: loadedStats.pageIdFilterCount || 0,
        pageIdFilterVersion: loadedStats.pageIdFilterVersion || 'major-bands-page-id-predecode-filter-v3990_3',
        rankBucketConcurrency: loadedStats.peakConcurrency,
        rankBucketMaxConcurrency: loadedStats.maxConcurrency,
        sortPasses: aggregate.sortPasses,
        bucketWorkerCount: 0,
        bucketWorkerTransferChars: 0,
        bucketWorkerRetries: 0,
        candidateLimit: null,
        publicHttpSelfFanout: false,
        mode: 'single-worker-canonical-rank-query-stable-snapshot-paged'
      }
    });
    if (requestedBandResponseEdgeCache && requestedBandResponseCacheKey) {
      const stored = await writeRequestedBandResponseEdgeCache(
        requestedBandResponseEdgeCache,
        requestedBandResponseCacheKey,
        response
      );
      return responseWithRequestedBandResponseEdgeCacheStatus(response, stored ? 'stored' : 'write-failed');
    }
    return responseWithRequestedBandResponseEdgeCacheStatus(response, 'unavailable');
  } catch (error) {
    return json({
      ok: false,
      retryable: false,
      message: error?.message || String(error),
      userMessage: '专业数据暂时没有读取成功。可以稍后重试，或先切回全部院校再试。',
      engineerHint: '请检查 major-bands-rank-query-kernel-v3990_3、位次索引与 Pages ASSETS 绑定；不得恢复公共 HTTP 自调用或候选截断。',
      hint: '可打开 /api/major-bands-health?probe=1 检查不可变底层数据健康。'
    }, 500);
  }
}

import { materializeMajorBandsStaticRecord } from '../_lib/major-bands-static-provider.js';
import { makeBands } from '../_lib/band-engine.js';
import {
  MAJOR_BANDS_RANK_INDEX_VERSION,
  MAJOR_BANDS_RANK_INDEX_SOURCE,
  MAJOR_BANDS_RANK_INDEX_RECORD_COUNT,
  MAJOR_BANDS_RANK_BUCKETS,
  selectMajorBandsRankBuckets,
  assertMajorBandsRankIndex
} from '../_lib/major-bands-rank-index.v3990_0.js';
import {
  MAJOR_BANDS_RANK_BUCKET_LOADER_VERSION,
  MAJOR_BANDS_RANK_BUCKET_CACHE_VERSION,
  MAJOR_BANDS_RANK_ROW_FILTER_VERSION,
  loadMajorBandsRankWindow
} from '../_lib/major-bands-rank-bucket-loader.v3990_0.js';
import {
  MAJOR_BANDS_QUERY_EXECUTION_CACHE_VERSION,
  executeMajorBandsQueryOnce
} from '../_lib/major-bands-query-execution-cache.v3990_0.js';
import {
  MAJOR_BANDS_ALL_BANDS_PAGE_CACHE_VERSION,
  executeMajorBandsAllBandsPageOnce,
  releaseMajorBandsAllBandsCompletedPage
} from '../_lib/major-bands-all-bands-page-cache.v3990_0.js';
import {
  MAJOR_BANDS_RANK_QUERY_KERNEL_VERSION,
  processMajorBandsRankWindow
} from '../_lib/major-bands-rank-query-kernel.v3990_0.js';
import {
  MAJOR_BANDS_RESULT_ORDER_VERSION,
  majorBandsSnapshotId,
  paginateMajorBandsRecords
} from '../_lib/major-bands-result-order.v3990_0.js';
import {
  MAJOR_BANDS_RESPONSE_TRANSPORT_VERSION,
  compactMajorBandsBucketCandidate,
  compactMajorBandsResponseRecord
} from '../_lib/major-bands-response-transport.v3990_0.js';
import { buildDisplayTags } from '../_lib/school-display-tags.js';
import {
  normalizeBottomLineMode,
  bottomLineModeSummary
} from '../_lib/bottomline-policy.js';
import { keywordQueryWarnings } from '../_lib/keyword-query.js';
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

export const MAJOR_BANDS_ALL_BANDS_EXECUTION_MODE = 'sequential-internal-band-requests-v3990_0';
const BAND_KEYS = Object.freeze(['upper', 'near', 'steady']);

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
    pageLimit: input.pageLimit
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

function requestForBand(request, sourceUrl, band) {
  const bandUrl = new URL(sourceUrl);
  bandUrl.searchParams.set('band', band);
  return new Request(bandUrl.toString(), {
    method: 'GET',
    headers: request.headers,
    redirect: request.redirect,
    signal: request.signal
  });
}

function allBandsResponse(execution) {
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
      'x-gaokao-all-bands-page-cache': execution.cacheStatus
    }
  });
}

async function executeAllBandsSequentially(context, sourceUrl, input) {
  const execution = await executeMajorBandsAllBandsPageOnce(allBandsPageIdentity(input), async () => {
    const payloads = [];
    for (const band of BAND_KEYS) {
      const response = await onRequest({
        ...context,
        request: requestForBand(context.request, sourceUrl, band)
      });
      if (!response.ok) return response;
      payloads.push(await response.json());
    }

    const byBand = Object.fromEntries(BAND_KEYS.map((band, index) => [band, payloads[index]]));
    const bands = Object.fromEntries(BAND_KEYS.map(band => [band, byBand[band].bands[band]]));
    const counts = Object.fromEntries(BAND_KEYS.map(band => [band, Number(bands[band]?.count || 0)]));
    counts.total = BAND_KEYS.reduce((sum, band) => sum + counts[band], 0);

    const keywordQuery = payloads[0].keywordQuery || {};
    const matchSummary = mergeNumericTree(payloads.map(payload => payload.matchSummary));
    const specialProjectStats = mergeNumericTree(payloads.map(payload => payload.source?.specialProjectStats));
    const bottomLineUnresolved = numericSum(payloads, ['source', 'bottomLineUnresolved']);
    const specialProjectShown = numericSum(payloads, ['source', 'specialProjectShown']);
    const specialProjectHidden = numericSum(payloads, ['source', 'specialProjectHidden']);
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
      rankBucketReadsTotal: numericSum(payloads, ['source', 'chunksRead']),
      rawScanned: numericSum(payloads, ['source', 'rawScanned']),
      canonicalCandidate: numericSum(payloads, ['source', 'canonicalCandidate']),
      rawCandidate: numericSum(payloads, ['source', 'rawCandidate']),
      normalized: numericSum(payloads, ['source', 'normalized']),
      staticIndexBytes: numericSum(payloads, ['source', 'staticIndexBytes']),
      bottomLineExcluded: numericSum(payloads, ['source', 'bottomLineExcluded']),
      bottomLineUnresolved,
      majorKeywordExcluded: numericSum(payloads, ['source', 'majorKeywordExcluded']),
      majorHitCount: numericSum(payloads, ['source', 'majorHitCount']),
      projectHitCount: numericSum(payloads, ['source', 'projectHitCount']),
      industryHitCount: numericSum(payloads, ['source', 'industryHitCount']),
      specialProjectHidden,
      specialProjectShown,
      specialProjectStats,
      rankBucketCacheHits: numericSum(payloads, ['source', 'rankBucketCacheHits']),
      rankBucketCacheMisses: numericSum(payloads, ['source', 'rankBucketCacheMisses']),
      rankRowFilterVersion: MAJOR_BANDS_RANK_ROW_FILTER_VERSION,
      rankRawRowCount: numericSum(payloads, ['source', 'rankRawRowCount']),
      rankDecodedRowCount: numericSum(payloads, ['source', 'rankDecodedRowCount']),
      rankRowsSkipped: numericSum(payloads, ['source', 'rankRowsSkipped']),
      rankBucketConcurrency: Math.max(...payloads.map(payload => Number(payload.source?.rankBucketConcurrency || 0))),
      rankBucketMaxConcurrency: Math.max(...payloads.map(payload => Number(payload.source?.rankBucketMaxConcurrency || 0))),
      sortPasses: numericSum(payloads, ['source', 'sortPasses']),
      allBandsExecutionMode: MAJOR_BANDS_ALL_BANDS_EXECUTION_MODE,
      allBandsPageCacheVersion: MAJOR_BANDS_ALL_BANDS_PAGE_CACHE_VERSION,
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
  return allBandsResponse(execution);
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
      specialProjectMode: normalizeSpecialProjectMode(url.searchParams.get('specialProjectMode') || 'hide_eligibility_projects')
    };
    const requestedBandRaw = clean(url.searchParams.get('band') || '', 20);
    const requestedBand = BAND_KEYS.includes(requestedBandRaw) ? requestedBandRaw : '';
    const configuredPageSize = Math.max(16, Math.min(80, pageNumber(context.env?.MAJOR_BANDS_MAX_PER_BAND, 40)));
    const pageLimit = Math.max(16, Math.min(configuredPageSize, pageNumber(url.searchParams.get('limit'), 40)));
    const pageOffset = pageNumber(url.searchParams.get('offset'), 0);

    if (!Number.isFinite(candidateScore) || candidateScore < 1 || candidateScore > 750) {
      return json({ ok: false, message: '参考分数格式不正确。' }, 400);
    }

    const allBandsPageCacheReleasedBeforeBandQuery = requestedBand
      ? releaseMajorBandsAllBandsCompletedPage()
      : false;

    if (!requestedBand) {
      return executeAllBandsSequentially(context, url, {
        candidateScore,
        rangePreset,
        filters,
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
    const execution = await executeMajorBandsQueryOnce(executionIdentity, async () => {
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

    return json({
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
        paginationContract: 'stable-full-id-snapshot-v3990_0',
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
        queryMemoryMode: aggregate.memoryMode,
        rankingCandidateMode: aggregate.rankingCandidateMode,
        deferredResponseEnrichment: aggregate.deferredResponseEnrichment,
        responseEnrichedCandidates: aggregate.responseEnrichedCandidates,
        allBandsPageCacheVersion: MAJOR_BANDS_ALL_BANDS_PAGE_CACHE_VERSION,
        allBandsPageCacheReleaseMode: 'release-completed-on-requested-band-switch-v3990_0',
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
        rankBucketCacheHits: loadedStats.cacheHits,
        rankBucketCacheMisses: loadedStats.cacheMisses,
        rankRowFilterVersion: MAJOR_BANDS_RANK_ROW_FILTER_VERSION,
        rankRawRowCount: loadedStats.rawRowCount,
        rankDecodedRowCount: loadedStats.decodedRowCount,
        rankRowsSkipped: loadedStats.rankRowsSkipped,
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
  } catch (error) {
    return json({
      ok: false,
      retryable: false,
      message: error?.message || String(error),
      userMessage: '专业数据暂时没有读取成功。可以稍后重试，或先切回全部院校再试。',
      engineerHint: '请检查 major-bands-rank-query-kernel-v3990_0、位次索引与 Pages ASSETS 绑定；不得恢复公共 HTTP 自调用或候选截断。',
      hint: '可打开 /api/major-bands-health?probe=1 检查不可变底层数据健康。'
    }, 500);
  }
}

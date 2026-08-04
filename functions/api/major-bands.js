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
  loadMajorBandsRankWindow
} from '../_lib/major-bands-rank-bucket-loader.v3990_0.js';
import {
  MAJOR_BANDS_QUERY_EXECUTION_CACHE_VERSION,
  executeMajorBandsQueryOnce
} from '../_lib/major-bands-query-execution-cache.v3990_0.js';
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
  rankBandRangeText
} from '../../shared/algorithms/position/canonical-position.v3963_0.js';
import { ALGORITHM_ORCHESTRATION_VERSION } from '../../shared/algorithms/algorithm-registry.js';
import {
  getSchoolEntity,
  entitySourceQuery
} from '../../shared/resources/schools/school-identity-center.js';
import {
  normalizeSpecialProjectMode,
  SPECIAL_PROJECT_COPY
} from '../_lib/special-project-policy.js';

assertMajorBandsRankIndex();

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
  const canonicalPosition = record.canonicalPosition;
  if (!canonicalPosition || canonicalPosition.bandKey !== record.bandKey) {
    throw new Error(`位次内核位置合同不一致：${record.id || `${record.school}|${record.major}`}`);
  }
  const item = materializeMajorBandsStaticRecord(record);
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

function queryIdentity({ candidateScore, rangePreset, filters, schoolNames, band }) {
  return JSON.stringify({
    version: MAJOR_BANDS_RANK_QUERY_KERNEL_VERSION,
    candidateScore,
    rangePreset,
    region: filters.region,
    schoolNames: [...schoolNames].sort((left, right) => left.localeCompare(right, 'zh-CN')),
    majorKeyword: filters.majorKeyword,
    bottomLineMode: filters.bottomLineMode,
    specialProjectMode: filters.specialProjectMode,
    band
  });
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
    const requestedBand = ['upper', 'near', 'steady'].includes(requestedBandRaw) ? requestedBandRaw : '';
    const configuredPageSize = Math.max(16, Math.min(80, pageNumber(context.env?.MAJOR_BANDS_MAX_PER_BAND, 40)));
    const pageLimit = Math.max(16, Math.min(configuredPageSize, pageNumber(url.searchParams.get('limit'), 40)));
    const pageOffset = pageNumber(url.searchParams.get('offset'), 0);

    if (!Number.isFinite(candidateScore) || candidateScore < 1 || candidateScore > 750) {
      return json({ ok: false, message: '参考分数格式不正确。' }, 400);
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
    const executionIdentity = queryIdentity({
      candidateScore,
      rangePreset,
      filters,
      schoolNames,
      band: requestedBand || 'all-bands-execution'
    });
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
      for (const key of ['upper', 'near', 'steady']) {
        const ordered = processed.grouped[key].ordered;
        const identity = queryIdentity({ candidateScore, rangePreset, filters, schoolNames, band: key });
        const retainRecords = !requestedBand || requestedBand === key;
        const compact = retainRecords ? compactRankedSnapshot(ordered) : { ordered: [], estimatedBytes: 0 };
        compactGrouped[key] = {
          ordered: compact.ordered,
          count: ordered.length,
          snapshot: majorBandsSnapshotId(ordered, identity)
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
          mode: 'compact-requested-band-snapshot',
          recordCount: retainedRecordCount,
          estimatedBytes: retainedEstimatedBytes,
          requestedBand: requestedBand || 'all'
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

    const grouped = initGrouped(makeBands(candidateScore, rangePreset));
    for (const key of ['upper', 'near', 'steady']) {
      const rankRangeText = rankBandRangeText(candidateRank?.rankForGap, key, rangePreset, totalRank);
      if (rankRangeText) {
        grouped[key].rankRangeText = rankRangeText;
        grouped[key].rangeText = rankRangeText;
      }

      const compactBand = compactGrouped[key];
      const ordered = compactBand.ordered;
      const identity = queryIdentity({ candidateScore, rangePreset, filters, schoolNames, band: key });
      const hiddenByBandRequest = Boolean(requestedBand && requestedBand !== key);
      const page = hiddenByBandRequest
        ? {
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
          }
        : paginateMajorBandsRecords(ordered, {
            offset: pageOffset,
            limit: pageLimit,
            queryIdentity: identity
          });
      if (!hiddenByBandRequest && page.pagination.snapshot !== compactBand.snapshot) {
        throw new Error(`位次分页快照不一致：${key}`);
      }
      const records = page.records.map(record => compactMajorBandsResponseRecord(
        finalizeRecordForResponse(record, { candidateScore, candidateRank, rangePreset })
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
    const specialIntent = /公费师范|优师|定向|专项|预科|民族班|公安|警察|司法|航海|轮机/.test(filters.majorKeyword);
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
        pageBand: requestedBand || 'all',
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

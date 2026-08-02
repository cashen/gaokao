import {
  selectMajorBandsStaticBuckets,
  materializeMajorBandsStaticRecord
} from '../_lib/major-bands-static-provider.js';
import { makeBands } from '../_lib/band-engine.js';
import {
  MAJOR_BANDS_BUCKET_ORCHESTRATION,
  MajorBandsBucketWorkerError,
  isRetryableBucketWorkerFailure,
  runMajorBandsBucketWorkers
} from '../_lib/major-bands-bucket-orchestrator.v3972_5.js';
import {
  MAJOR_BANDS_BUCKET_TRANSFER_VERSION,
  MAJOR_BANDS_RESPONSE_TRANSPORT_VERSION,
  assertCompactMajorBandsBucketCandidate,
  compactMajorBandsResponseRecord
} from '../_lib/major-bands-bucket-transfer.v3972_5.js';
import { buildDisplayTags } from '../_lib/school-display-tags.js';
import {
  normalizeBottomLineMode,
  getBottomLineSortWeight,
  bottomLineModeSummary
} from '../_lib/bottomline-policy.js';
import { buildKeywordQuery, keywordQueryWarnings } from '../_lib/keyword-query.js';
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
import { resolveCanonicalPosition, rankBandRangeText } from '../../shared/algorithms/position/canonical-position.v3963_0.js';
import { rankResultRecords } from '../../shared/algorithms/ranking/result-ranking.v3967_0.js';
import { ALGORITHM_ORCHESTRATION_VERSION } from '../../shared/algorithms/algorithm-registry.js';
import {
  getSchoolEntity,
  entitySourceQuery
} from '../../shared/resources/schools/school-identity-center.js';
import {
  normalizeSpecialProjectMode,
  createSpecialProjectStats,
  SPECIAL_PROJECT_COPY
} from '../_lib/special-project-policy.js';

const BUCKET_CONTRACT = 'major-bands-bucket-v3972_2';

function json(payload, status = 200) {
  const body = JSON.stringify(payload);
  return new Response(body, {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-gaokao-response-transport': MAJOR_BANDS_RESPONSE_TRANSPORT_VERSION
    }
  });
}

function clean(value, max = 50) {
  return String(value || '').trim().slice(0, max);
}

function pageNumber(value, fallback = 0) {
  const text = String(value ?? '').trim();
  if (!text) return fallback;
  const n = Math.floor(Number(text));
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function initGrouped(bands) {
  return {
    upper: { ...bands.upper, records: [], candidates: [], count: 0, scanned: 0, truncated: false },
    near: { ...bands.near, records: [], candidates: [], count: 0, scanned: 0, truncated: false },
    steady: { ...bands.steady, records: [], candidates: [], count: 0, scanned: 0, truncated: false }
  };
}

function minMaxScore(bands) {
  const all = [bands.upper, bands.near, bands.steady];
  return {
    min: Math.min(...all.map(band => band.minScore)),
    max: Math.max(...all.map(band => band.maxScore))
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
  if (!context?.rankEnd) return '位次待核验';
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
  const transferredBand = record.canonicalPosition?.bandKey || record.bandKey || record.band || '';
  if (transferredBand && canonicalPosition.bandKey !== transferredBand) {
    throw new Error(`分桶排序位置与父级重建不一致：${record.id || `${record.school}|${record.major}`}，${transferredBand}/${canonicalPosition.bandKey}`);
  }
  const source = {
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
    canonicalPosition
  };
  const item = materializeMajorBandsStaticRecord(source);
  return { ...item, ...buildDisplayTags(item) };
}

function mergeNumberStats(target, source, keys) {
  for (const key of keys) target[key] += Number(source?.[key] || 0);
}

function mergeSpecialProjectStats(target, source) {
  target.hidden += Number(source?.hidden || 0);
  target.shown += Number(source?.shown || 0);
  for (const key of ['upper', 'near', 'steady']) {
    target.byBand[key] += Number(source?.byBand?.[key] || 0);
  }
  for (const [label, count] of Object.entries(source?.byLabel || {})) {
    target.byLabel[label] = (target.byLabel[label] || 0) + Number(count || 0);
  }
}

function assertBucketResponse(response, text, bucketFile) {
  const lower = text.toLowerCase();
  const retryable = [429, 502, 503, 504].includes(response.status)
    || lower.includes('worker exceeded resource limits')
    || lower.includes('<title>error 1102')
    || lower.includes('error code: 1102')
    || lower.includes('http 503')
    || lower.includes('temporarily unavailable');
  if (retryable) {
    throw new MajorBandsBucketWorkerError(`分数桶 Worker 瞬态失败：${bucketFile}，HTTP ${response.status}`, {
      status: response.status,
      retryable: true,
      bucketFile
    });
  }
  if (!response.ok) {
    throw new MajorBandsBucketWorkerError(`分数桶 Worker 失败：${bucketFile}，HTTP ${response.status}，${text.slice(0, 300)}`, {
      status: response.status,
      retryable: false,
      bucketFile
    });
  }
  if (lower.includes('<!doctype html') || lower.includes('<html')) {
    throw new MajorBandsBucketWorkerError(`分数桶 Worker 返回 HTML：${bucketFile}`, {
      status: response.status,
      retryable: false,
      bucketFile
    });
  }
}

async function fetchBucketWorker(context, bucket, options) {
  const endpoint = new URL('/api/major-bands-bucket', context.request.url);
  endpoint.searchParams.set('candidateScore', String(options.candidateScore));
  endpoint.searchParams.set('rangePreset', options.rangePreset);
  endpoint.searchParams.set('bucketFile', bucket.file);
  endpoint.searchParams.set('region', options.region);
  endpoint.searchParams.set('majorKeyword', options.majorKeyword);
  endpoint.searchParams.set('bottomLineMode', options.bottomLineMode);
  endpoint.searchParams.set('specialProjectMode', options.specialProjectMode);
  endpoint.searchParams.set('schoolFilter', options.schoolFilter ? '1' : '0');
  endpoint.searchParams.set('maxCandidates', String(options.maxCandidates));
  for (const name of options.acceptedSchoolNames.slice(0, 32)) endpoint.searchParams.append('schoolName', name);
  endpoint.searchParams.set('bucketAttempt', String(options.bucketAttempt || 1));
  endpoint.searchParams.set('requestToken', `${options.requestToken}-${options.bucketAttempt || 1}`);

  let response;
  try {
    response = await fetch(endpoint.toString(), {
      headers: {
        accept: 'application/json',
        'cache-control': 'no-cache',
        pragma: 'no-cache',
        'x-gaokao-major-bands-bucket': BUCKET_CONTRACT
      },
      cf: { cacheTtl: 0, cacheEverything: false }
    });
  } catch (error) {
    throw new MajorBandsBucketWorkerError(`分数桶 Worker 网络失败：${bucket.file}`, {
      status: 0,
      retryable: true,
      bucketFile: bucket.file,
      cause: error
    });
  }
  const text = await response.text();
  assertBucketResponse(response, text, bucket.file);
  let payload;
  try {
    payload = JSON.parse(text);
  } catch (error) {
    throw new Error(`分数桶 Worker JSON 解析失败：${bucket.file}。${error?.message || String(error)}`);
  }
  if (
    !payload?.ok
    || payload?.contract !== BUCKET_CONTRACT
    || payload?.candidateTransferVersion !== MAJOR_BANDS_BUCKET_TRANSFER_VERSION
    || payload?.bucket?.file !== bucket.file
  ) {
    throw new Error(`分数桶 Worker 合同不匹配：${bucket.file}`);
  }
  for (const key of ['upper', 'near', 'steady']) {
    for (const candidate of payload.grouped?.[key]?.candidates || []) {
      assertCompactMajorBandsBucketCandidate(candidate);
    }
  }
  payload.transportChars = text.length;
  return payload;
}

export async function onRequest(context) {
  if (context.request.method !== 'GET') return json({ ok: false, message: '只支持 GET 请求。' }, 405);
  const started = Date.now();

  try {
    const url = new URL(context.request.url);
    const candidateScore = Math.round(Number(url.searchParams.get('candidateScore') || 520));
    const rangePreset = clean(url.searchParams.get('rangePreset') || 'standard', 20);
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
    const configuredPageSize = Math.max(16, Math.min(80, Number(context.env?.MAJOR_BANDS_MAX_PER_BAND || 40)));
    const pageLimit = Math.max(16, Math.min(configuredPageSize, pageNumber(url.searchParams.get('limit'), 40)));
    const pageOffset = pageNumber(url.searchParams.get('offset'), 0);

    if (!Number.isFinite(candidateScore) || candidateScore < 1 || candidateScore > 750) {
      return json({ ok: false, message: '参考分数格式不正确。' }, 400);
    }

    const schoolEntity = filters.schoolEntityId ? getSchoolEntity(filters.schoolEntityId) : null;
    if (filters.schoolEntityId && !schoolEntity) return json({ ok: false, message: '学校实体不存在，请重新选择学校。' }, 400);
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

    const bandsMeta = makeBands(candidateScore, rangePreset);
    const scoreWindow = minMaxScore(bandsMeta);
    const grouped = initGrouped(bandsMeta);
    const keywordQuery = buildKeywordQuery(filters.majorKeyword);
    const keywordWarnings = keywordQueryWarnings(keywordQuery);
    const candidateRank = rankContextForScore(candidateScore);
    for (const key of ['upper', 'near', 'steady']) {
      const rankRangeText = rankBandRangeText(
        candidateRank?.rankForGap,
        key,
        rangePreset,
        getRankPopulation({ year: 2026, region: 'ln', subject: 'physics', policy: 'table-total' })
      );
      if (rankRangeText) {
        grouped[key].rankRangeText = rankRangeText;
        grouped[key].rangeText = rankRangeText;
      }
    }

    const selected = await selectMajorBandsStaticBuckets(context.request, scoreWindow);
    if (selected.buckets.length < 1 || selected.buckets.length > 12) throw new Error(`分布式分数桶数量异常：${selected.buckets.length}`);
    const schoolNames = acceptedSchoolNames ? [...acceptedSchoolNames] : [];
    const schoolFilter = Boolean(filters.schoolKeyword || filters.schoolEntityId);
    const maxCandidates = Math.max(48, Math.min(240, pageOffset + pageLimit + 64));
    const requestToken = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const bucketExecution = await runMajorBandsBucketWorkers(
      selected.buckets,
      (bucket, execution) => fetchBucketWorker(context, bucket, {
        candidateScore,
        rangePreset,
        region: filters.region,
        majorKeyword: filters.majorKeyword,
        bottomLineMode: filters.bottomLineMode,
        specialProjectMode: filters.specialProjectMode,
        schoolFilter,
        acceptedSchoolNames: schoolNames,
        maxCandidates,
        requestToken,
        bucketAttempt: execution.attempt
      }),
      {
        concurrency: MAJOR_BANDS_BUCKET_ORCHESTRATION.maxConcurrency,
        maxAttempts: MAJOR_BANDS_BUCKET_ORCHESTRATION.maxAttempts,
        baseDelayMs: MAJOR_BANDS_BUCKET_ORCHESTRATION.baseDelayMs
      }
    );
    const bucketResults = bucketExecution.results;

    const aggregate = {
      rawScanned: 0,
      rawCandidate: 0,
      normalized: 0,
      bottomLineExcluded: 0,
      bottomLineUnresolved: 0,
      majorKeywordExcluded: 0,
      majorHitCount: 0,
      projectHitCount: 0,
      industryHitCount: 0,
      specialProjectHidden: 0,
      specialProjectShown: 0,
      staticIndexBytes: 0
    };
    const specialProjectStats = createSpecialProjectStats();
    const matchSummary = { exact: 0, related: 0, industry: 0, project: 0, weak: 0 };
    const numericKeys = [
      'rawScanned', 'rawCandidate', 'normalized', 'bottomLineExcluded', 'bottomLineUnresolved',
      'majorKeywordExcluded', 'majorHitCount', 'projectHitCount', 'industryHitCount',
      'specialProjectHidden', 'specialProjectShown'
    ];

    for (const result of bucketResults) {
      mergeNumberStats(aggregate, result.stats, numericKeys);
      aggregate.staticIndexBytes += Number(result.bucket?.bytes || 0);
      mergeSpecialProjectStats(specialProjectStats, result.stats?.specialProjectStats);
      mergeNumberStats(matchSummary, result.stats?.matchSummary, Object.keys(matchSummary));
      for (const key of ['upper', 'near', 'steady']) {
        grouped[key].count += Number(result.grouped?.[key]?.count || 0);
        grouped[key].scanned += Number(result.grouped?.[key]?.count || 0);
        grouped[key].candidates.push(...(result.grouped?.[key]?.candidates || []));
      }
    }

    for (const key of ['upper', 'near', 'steady']) {
      const group = grouped[key];
      const diversified = rankResultRecords(group.candidates, {
        intent: 'score-search',
        sortMode: 'canonical-staged',
        diversify: !filters.schoolKeyword,
        windowSize: 8,
        maxPerSchool: 2,
        getSoftPreferenceWeight: record => getBottomLineSortWeight(record, filters.bottomLineMode)
      });
      const offset = requestedBand && requestedBand !== key ? 0 : pageOffset;
      const records = requestedBand && requestedBand !== key
        ? []
        : diversified.slice(offset, offset + pageLimit).map(record => compactMajorBandsResponseRecord(
          finalizeRecordForResponse(record, { candidateScore, candidateRank, rangePreset })
        ));
      const returned = records.length;
      const hasMore = offset + returned < group.count;
      group.records = records;
      group.displayedCount = returned;
      group.truncated = hasMore;
      group.pagination = {
        offset,
        limit: pageLimit,
        returned,
        hasMore,
        nextOffset: hasMore ? offset + returned : null,
        order: 'result-ranking-v3967_0'
      };
      delete group.candidates;
    }

    const counts = { upper: grouped.upper.count, near: grouped.near.count, steady: grouped.steady.count };
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
        classificationMode: 'canonical_rank_primary_2026_position',
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
        bands: bandsMeta,
        maxPerBand: configuredPageSize,
        pageSize: pageLimit,
        pageBand: requestedBand || 'all',
        paginationContract: 'canonical-staged-ranked-paged',
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
        manifestVersion: selected.manifest.version || '',
        architecture: 'build-time-static-score-index-distributed-bucket-workers',
        totalRecords: selected.manifest.recordCount || aggregate.rawScanned,
        chunksTotal: selected.manifest.buckets?.length || 0,
        chunksRead: selected.buckets.length,
        chunksSkipped: Math.max(0, Number(selected.manifest.buckets?.length || 0) - selected.buckets.length),
        rawScanned: aggregate.rawScanned,
        rawCandidate: aggregate.rawCandidate,
        normalized: aggregate.normalized,
        staticIndexBytes: aggregate.staticIndexBytes,
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
        bucketWorkerCount: bucketResults.length,
        bucketWorkerCandidateLimit: maxCandidates,
        bucketWorkerOrchestrationVersion: bucketExecution.stats.version,
        bucketCandidateTransferVersion: MAJOR_BANDS_BUCKET_TRANSFER_VERSION,
        responseTransportVersion: MAJOR_BANDS_RESPONSE_TRANSPORT_VERSION,
        bucketWorkerTransferChars: bucketResults.reduce((sum, result) => sum + Number(result.transportChars || 0), 0),
        bucketWorkerConcurrency: bucketExecution.stats.peakConcurrency,
        bucketWorkerRetries: bucketExecution.stats.retryCount,
        bucketWorkerMaxAttempts: bucketExecution.stats.maxAttempts,
        mode: 'build-time-static-score-index-distributed-bucket-workers-canonical-staged-ranked-paged'
      }
    });
  } catch (error) {
    const retryable = isRetryableBucketWorkerFailure(error);
    return json({
      ok: false,
      retryable,
      message: error?.message || String(error),
      userMessage: retryable
        ? '专业数据遇到短暂拥堵，系统已自动重试但仍未恢复。请稍后再试。'
        : '专业数据暂时没有读取成功。可以稍后重试，或先切回全部院校再试。',
      engineerHint: '请检查 major-bands-static-v3972_2 五分桶、有界子 Worker 编排和瞬态重试记录。',
      hint: '可先打开 /api/major-bands-health?probe=1 检查底层数据健康；专业查询不再运行时扫描原始投档分片。'
    }, isRetryableBucketWorkerFailure(error) ? 503 : 500);
  }
}

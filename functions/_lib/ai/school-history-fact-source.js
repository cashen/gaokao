import { buildKeywordQuery } from '../keyword-query.js';
import { matchMajorProject } from '../major-project-matcher.js';
import { buildSearchIndex } from '../search-index-builder.js';
import { mapStandardMajor } from '../standard-major-mapper.js';
import { lookupLn2026PhysicsScore } from '../ln-2026-physics-score-rank.js';
import {
  getAdmissionSchoolDirectoryMeta,
  resolveExactAdmissionSchool
} from '../school-query-provider.v3969.js';
import {
  clearSchoolRuntimeProjectionCacheForTest,
  loadSchoolRuntimeRecords,
  SCHOOL_RUNTIME_PROJECTION_VERSION,
  schoolRuntimeProjectionCacheState
} from '../school-record-runtime-provider.vnext.js';
import {
  canonicalBandOrder,
  resolveCanonicalPosition
} from '../../../shared/algorithms/position/canonical-position.v3963_0.js';
import {
  AI_SCHOOL_HISTORY_FACT_SOURCE_VERSION,
  AI_SCHOOL_HISTORY_MAX_RECORDS,
  AI_SCHOOL_HISTORY_QUERY_CONTRACT_VERSION,
  AI_SCHOOL_HISTORY_SOURCE_CHUNK_PREFIX,
  AI_SCHOOL_HISTORY_SOURCE_INDEX_PATH,
  AI_SCHOOL_HISTORY_SOURCE_TOTAL_RECORDS
} from './school-history-fact-contract.js';

export {
  AI_SCHOOL_HISTORY_FACT_SOURCE_VERSION,
  AI_SCHOOL_HISTORY_MAX_RECORDS,
  AI_SCHOOL_HISTORY_QUERY_CONTRACT_VERSION
};

// Cache ownership is canonical in school-record-runtime-provider.vnext.js; its verified invariant remains SHARD_CACHE_MAX_ENTRIES = 4.

function clean(value, max = 160) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeMajorName(value) {
  return clean(value, 220).normalize('NFKC').toLowerCase().replace(/[\s·•・]+/g, '');
}

function boundedInteger(value, fallback, min, max) {
  const parsed = Math.floor(Number(value));
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function projectFields(raw = {}) {
  const labels = Array.isArray(raw.projectLabels) ? raw.projectLabels.map(value => clean(value, 80)).filter(Boolean) : [];
  const text = `${clean(raw.major, 220)} ${labels.join(' ')}`;
  const isSinoForeign = labels.includes('中外合作') || /中外|合作办学|中英|中美|中澳|中日|国际本科|国际班/.test(text);
  const explicitHighFee = /高收费|较高收费|收费较高|学费较高|国际项目|单列/.test(text);
  const isHighFee = isSinoForeign || explicitHighFee;
  const feeType = isSinoForeign ? 'sino_foreign' : (explicitHighFee ? 'high_fee' : 'unknown');
  const projectLabel = isHighFee ? '中外合作/高收费' : (labels.join(' / ') || '普通招生记录');
  return { labels, isSinoForeign, isHighFee, feeType, projectLabel };
}

function candidateRankForScore(candidateScore) {
  if (!Number.isFinite(candidateScore)) return null;
  const row = lookupLn2026PhysicsScore(candidateScore);
  return number(row?.rankForGap ?? row?.rankEnd ?? row?.cumulative);
}

function factRecord(raw, schoolInfo, candidateScore, candidateRank) {
  const score2026 = number(raw?.score);
  const rank2026 = number(raw?.rank);
  const project = projectFields(raw);
  const major = clean(raw?.major, 220);
  const record = {
    id: clean(raw?.uid, 220),
    school: clean(raw?.school || schoolInfo.name, 120),
    major,
    score2026,
    rank2026,
    schoolCode2026: clean(raw?.schoolCode, 40),
    majorCode2026: clean(raw?.majorCode, 40),
    displayLocation: [clean(schoolInfo?.province, 40), clean(schoolInfo?.city, 60)].filter(Boolean).join(' · '),
    province: clean(schoolInfo?.province, 40),
    city: clean(schoolInfo?.city, 60),
    projectLabel: project.projectLabel,
    isSinoForeign: project.isSinoForeign,
    isHighFee: project.isHighFee,
    feeType: project.feeType,
    standardMajor: mapStandardMajor({ majorName: major }),
    tags: project.labels,
    rawText: `${major} ${project.labels.join(' ')}`.trim()
  };
  if (Number.isFinite(candidateScore)) {
    const canonicalPosition = resolveCanonicalPosition({
      candidateScore,
      candidateRank,
      recordScore: score2026,
      recordRank: rank2026,
      rangePreset: 'standard'
    });
    Object.assign(record, {
      candidateScore,
      candidateReferenceScore: candidateScore,
      scoreDelta2026: canonicalPosition.scoreDelta,
      scoreDelta: canonicalPosition.scoreDelta,
      rankGap2026: canonicalPosition.rankGap,
      rankGap: canonicalPosition.rankGap,
      band: canonicalPosition.bandLabel,
      bandKey: canonicalPosition.bandKey,
      statusKey: canonicalPosition.statusKey,
      statusLabel: canonicalPosition.statusLabel,
      position: canonicalPosition.position,
      canonicalPosition
    });
  }
  return record;
}

function compareScore(a, b, direction) {
  const scoreA = number(a.score2026) ?? -1;
  const scoreB = number(b.score2026) ?? -1;
  const scoreDifference = direction * (scoreA - scoreB);
  if (scoreDifference) return scoreDifference;
  const rankA = number(a.rank2026) ?? Number.POSITIVE_INFINITY;
  const rankB = number(b.rank2026) ?? Number.POSITIVE_INFINITY;
  const rankDifference = -direction * (rankA - rankB);
  if (rankDifference) return rankDifference;
  return String(a.major || '').localeCompare(String(b.major || ''), 'zh-CN');
}

function comparePosition(a, b) {
  const bandDifference = canonicalBandOrder(a.bandKey) - canonicalBandOrder(b.bandKey);
  if (bandDifference) return bandDifference;
  const distanceA = number(a.canonicalPosition?.positionDistance) ?? Number.POSITIVE_INFINITY;
  const distanceB = number(b.canonicalPosition?.positionDistance) ?? Number.POSITIVE_INFINITY;
  if (distanceA !== distanceB) return distanceA - distanceB;
  return compareScore(a, b, -1);
}

function sortRecords(records, sort) {
  const copied = [...records];
  if (sort === 'score-asc') return copied.sort((a, b) => compareScore(a, b, 1));
  if (sort === 'position-near') return copied.sort(comparePosition);
  return copied.sort((a, b) => compareScore(a, b, -1));
}

function outputRecord(record = {}) {
  const {
    canonicalPosition: _canonicalPosition,
    matchBadges: _matchBadges,
    matchedTerms: _matchedTerms,
    rawText: _rawText,
    standardMajor: _standardMajor,
    tags: _tags,
    ...output
  } = record;
  return output;
}

function summarize(records, candidateScore) {
  const scores = records.map(item => number(item.score2026)).filter(Number.isFinite);
  const nearest = Number.isFinite(candidateScore) && records.length ? sortRecords(records, 'position-near')[0] : null;
  return {
    total: records.length,
    schoolCount: records.length ? 1 : 0,
    minScore: scores.length ? Math.min(...scores) : null,
    maxScore: scores.length ? Math.max(...scores) : null,
    uniqueMajorCount: new Set(records.map(item => normalizeMajorName(item.major)).filter(Boolean)).size,
    regularCount: records.filter(item => item.projectLabel === '普通招生记录').length,
    specialCount: records.filter(item => item.projectLabel !== '普通招生记录').length,
    upperCount: records.filter(item => item.bandKey === 'upper').length,
    nearCount: records.filter(item => item.bandKey === 'near').length,
    steadyCount: records.filter(item => item.bandKey === 'steady').length,
    outsideCount: records.filter(item => item.bandKey === 'outside').length,
    nearestRecord: nearest ? {
      major: nearest.major,
      score2026: nearest.score2026,
      rank2026: nearest.rank2026,
      rankGap2026: nearest.rankGap2026,
      bandKey: nearest.bandKey
    } : null
  };
}

export async function queryAiSchoolHistoryFact(context, options = {}) {
  const started = Date.now();
  const schoolInput = clean(options.school, 160);
  if (!schoolInput) return { ok: false, code: 'school_required', message: '请先明确一所学校。', status: 400 };
  const candidateScore = options.candidateScore == null || options.candidateScore === '' ? null : Math.round(Number(options.candidateScore));
  if (candidateScore !== null && (!Number.isFinite(candidateScore) || candidateScore < 1 || candidateScore > 750)) {
    return { ok: false, code: 'invalid_candidate_score', message: '参考分数格式不正确。', status: 400 };
  }
  const majorKeyword = clean(options.majorKeyword, 160);
  const sort = ['position-near', 'score-asc', 'score-desc'].includes(options.sort)
    ? options.sort
    : (candidateScore === null ? 'score-desc' : 'position-near');
  const offset = boundedInteger(options.offset, 0, 0, 10000);
  const limit = boundedInteger(options.limit, AI_SCHOOL_HISTORY_MAX_RECORDS, 20, AI_SCHOOL_HISTORY_MAX_RECORDS);
  const selection = await resolveExactAdmissionSchool(context, schoolInput);
  if (!selection) {
    return {
      ok: false,
      code: 'school_not_available',
      message: '已经识别到学校问题，但当前辽宁2026物理类投档学校目录没有这所学校的记录。',
      status: 404
    };
  }
  const exactSchoolNames2026 = [...new Set([
    ...(Array.isArray(selection.admissionNames) ? selection.admissionNames : []),
    selection.admissionName,
    selection.officialName
  ].map(value => clean(value, 160)).filter(Boolean))];
  const [runtime, directoryMeta] = await Promise.all([
    loadSchoolRuntimeRecords(context, { schoolNames: exactSchoolNames2026 }),
    getAdmissionSchoolDirectoryMeta(context)
  ]);
  const schoolInfo = Array.isArray(runtime?.matchedSchools) ? runtime.matchedSchools[0] : null;
  if (!schoolInfo || !Array.isArray(runtime.records) || !runtime.records.length) {
    return {
      ok: false,
      code: 'school_not_available',
      message: '已经识别到学校问题，但当前辽宁2026物理类投档学校目录没有这所学校的记录。',
      status: 404
    };
  }
  const index = runtime.manifest || {};
  const rawRecords = runtime.records;
  const candidateRank = candidateRankForScore(candidateScore);
  const keywordQuery = buildKeywordQuery(majorKeyword);
  const matched = [];
  for (const raw of rawRecords) {
    const record = factRecord(raw, schoolInfo, candidateScore, candidateRank);
    const match = keywordQuery.rawKeywords.length
      ? matchMajorProject(buildSearchIndex([record])[0], keywordQuery)
      : { matched: true, score: 0, badges: [], matchLevel: '', matchLabel: '', matchReason: '', matchedKeyword: '', matchedTerms: [] };
    if (!match.matched) continue;
    matched.push({
      ...record,
      matchScore: Number(match.score || 0),
      matchBadges: match.badges || [],
      matchLevel: match.matchLevel || '',
      matchLabel: match.matchLabel || '',
      matchReason: match.matchReason || match.reason || '',
      matchedKeyword: match.matchedKeyword || '',
      matchedTerms: match.matchedTerms || []
    });
  }
  const rankedAll = sortRecords(matched, sort);
  const records = rankedAll.slice(offset, offset + limit).map(outputRecord);
  const hasMore = offset + records.length < rankedAll.length;
  const shardFiles = Array.isArray(runtime.shardFiles) ? runtime.shardFiles : [];
  return {
    ok: true,
    complete: !hasMore,
    total: rankedAll.length,
    meta: {
      mode: 'ai-school-history',
      audienceYear: 2027,
      activeDataYear: 2026,
      rankYear: 2026,
      candidateScore,
      candidateReferenceRank2026: candidateRank,
      school: selection.officialName || schoolInfo.name,
      schoolQuery: schoolInput,
      schoolRecordTotal: rawRecords.length,
      filteredTotal: rankedAll.length,
      dataScope: '辽宁2026普通类本科批物理类专业投档记录',
      dataBoundary: '只展示该校在辽宁2026物理类投档表中的招生专业与项目，不代表该校全国全部本科专业，也不判断2027录取结果。',
      sort,
      keywordMode: 'any',
      keywordTerms: keywordQuery.rawKeywords,
      schoolQueryContractVersion: AI_SCHOOL_HISTORY_QUERY_CONTRACT_VERSION,
      admissionDirectoryVersion: directoryMeta.version || '',
      admissionDirectorySourceHash: directoryMeta.sourceHash || '',
      pagination: {
        offset,
        limit,
        returned: records.length,
        hasMore,
        nextOffset: hasMore ? offset + records.length : null
      },
      elapsedMs: Date.now() - started
    },
    summary: summarize(rankedAll, candidateScore),
    keywordQuery,
    records,
    source: {
      dataYear: 2026,
      manifestVersion: index.version || '',
      totalRecords: AI_SCHOOL_HISTORY_SOURCE_TOTAL_RECORDS,
      rawScanned: Number(runtime.rawScanned || rawRecords.length),
      exactSchoolRecords: rawRecords.length,
      mode: 'ai-school-history-preaggregated-school-shard',
      identityOwner: 'school-query-provider.v3969',
      runtimeOwner: 'school-runtime-projection-vnext',
      projectionVersion: runtime.projectionVersion || SCHOOL_RUNTIME_PROJECTION_VERSION,
      indexPath: AI_SCHOOL_HISTORY_SOURCE_INDEX_PATH,
      chunkPath: shardFiles.length === 1 ? `${AI_SCHOOL_HISTORY_SOURCE_CHUNK_PREFIX}${shardFiles[0]}` : '',
      shardCount: shardFiles.length,
      sourceVersion: AI_SCHOOL_HISTORY_FACT_SOURCE_VERSION,
      sameTruthSet: true
    }
  };
}

export function clearAiSchoolHistoryFactCacheForTest() {
  clearSchoolRuntimeProjectionCacheForTest();
}

export function aiSchoolHistoryFactCacheState() {
  const state = schoolRuntimeProjectionCacheState();
  return {
    ...state,
    owner: 'school-runtime-projection-vnext',
    sharedWithSchoolRuntime: true
  };
}

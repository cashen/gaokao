import { loadManifest } from '../_lib/ln-rank-manifest.js';
import { fetchFenxiJson } from '../_lib/fenxi-fetcher.js';
import { normalizeRecord, rawScore, rawSchool } from '../_lib/fenxi-normalizer.js';
import { makeBands, classifyBand } from '../_lib/band-engine.js';
import { getStatus } from '../_lib/status-engine.js';
import { matchRegion } from '../_lib/major-filter.js';
import { buildDisplayTags } from '../_lib/school-display-tags.js';
import { normalizeBottomLineMode, passBottomLineMode, getBottomLineSortWeight, bottomLineModeSummary, enrichBottomLineFields } from '../_lib/bottomline-policy.js';
import { buildKeywordQuery, keywordQueryWarnings } from '../_lib/keyword-query.js';
import { matchMajorProject } from '../_lib/major-project-matcher.js';
import { buildSearchIndex } from '../_lib/search-index-builder.js';
import { buildSearchConflictAdvice } from '../_lib/search-conflict-advisor.js';
import { buildFilterConflicts } from '../_lib/filter-conflict-contract.js';
import { normalizeFenxiCodes } from '../_lib/fenxi-code-normalizer.js';
import { mapStandardMajor } from '../_lib/standard-major-mapper.js';
import { lookupScoreRank } from '../_lib/rank-table-provider.js';
import {
  normalizeSpecialProjectMode,
  detectSpecialProject,
  enrichSpecialProjectRecord,
  shouldHideSpecialProject,
  createSpecialProjectStats,
  addSpecialProjectStat,
  SPECIAL_PROJECT_COPY
} from '../_lib/special-project-policy.js';

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
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

function rankSortValue(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : Number.MAX_SAFE_INTEGER;
}

function hasKeywordFilters(keywordQuery = {}) {
  return Boolean(keywordQuery?.hasMajorKeyword || keywordQuery?.hasProjectKeyword || keywordQuery?.hasIndustryKeyword);
}

function matchAllKeywordResult() {
  return { matched: true, score: 0, badges: [], reason: '', matchLevel: '', matchLabel: '', matchReason: '', matchedKeyword: '', matchedTerms: [] };
}

function minMaxScore(bands) {
  const all = [bands.upper, bands.near, bands.steady];
  return {
    min: Math.min(...all.map(band => band.minScore)),
    max: Math.max(...all.map(band => band.maxScore))
  };
}

function chunkFile(chunk) {
  return chunk?.file || chunk?.path || '';
}

function chunkIntersectsScoreWindow(chunk, window) {
  const min = Number(chunk?.minScore);
  const max = Number(chunk?.maxScore);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return true;
  return max >= window.min && min <= window.max;
}

function rawKeywordPass(raw, filters) {
  const schoolKeyword = clean(filters.schoolKeyword || '', 40);
  return !schoolKeyword || rawSchool(raw).includes(schoolKeyword);
}

function compareBandRecords(a, b, bottomLineMode) {
  const bottomLineWeight = getBottomLineSortWeight(b, bottomLineMode) - getBottomLineSortWeight(a, bottomLineMode);
  return bottomLineWeight
    || Number(b.matchScore || 0) - Number(a.matchScore || 0)
    || Math.abs(a.score - a.candidateScore) - Math.abs(b.score - b.candidateScore)
    || rankSortValue(a.rank) - rankSortValue(b.rank);
}

function pushRecord(grouped, band, record, candidateScore) {
  const delta = record.score - candidateScore;
  const status = getStatus(delta);
  const display = buildDisplayTags(record);
  const item = {
    ...record,
    ...display,
    band,
    bandKey: band,
    candidateScore,
    candidateReferenceScore: candidateScore,
    scoreDelta2026: delta,
    scoreDelta: delta,
    statusKey: status.key,
    statusLabel: status.label,
    position: status.position
  };
  grouped[band].count += 1;
  grouped[band].candidates.push(item);
}

async function loadChunkRecords(request, env, file) {
  const data = await fetchFenxiJson(request, env, file);
  return Array.isArray(data) ? data : (Array.isArray(data.records) ? data.records : []);
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
    rankForGap: Number.isFinite(Number(row.rankForGap)) ? Number(row.rankForGap) : (Number.isFinite(rankEnd) ? rankEnd : null),
    sameCount: Number.isFinite(sameCount) ? sameCount : null,
    emptyScore: Boolean(row.emptyScore)
  };
}

function rankLabel(context) {
  if (!context?.rankEnd) return '位次待核验';
  if (context.emptyScore) return `2026 年该分数没有同分考生，历史参考位置约在第 ${context.rankEnd.toLocaleString('zh-CN')} 位附近`;
  if (context.rankStart && context.rankStart !== context.rankEnd) {
    return `按 2026 年成绩分布，历史参考位置约为 ${context.rankStart.toLocaleString('zh-CN')}—${context.rankEnd.toLocaleString('zh-CN')} 位`;
  }
  return `按 2026 年成绩分布，历史参考位置约为第 ${context.rankEnd.toLocaleString('zh-CN')} 位`;
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

    const bandsMeta = makeBands(candidateScore, rangePreset);
    const scoreWindow = minMaxScore(bandsMeta);
    const grouped = initGrouped(bandsMeta);
    const keywordQuery = buildKeywordQuery(filters.majorKeyword);
    const keywordWarnings = keywordQueryWarnings(keywordQuery);
    const hasKeywordSearch = hasKeywordFilters(keywordQuery);
    const manifest = await loadManifest(context.request, context.env || {});
    const allChunks = Array.isArray(manifest.chunks) ? manifest.chunks : [];
    const chunks = allChunks.filter(chunk => chunkIntersectsScoreWindow(chunk, scoreWindow));
    const candidateRank = rankContextForScore(candidateScore);

    let rawTotal = 0;
    let rawCandidate = 0;
    let normalized = 0;
    let bottomLineExcluded = 0;
    let majorKeywordExcluded = 0;
    let majorHitCount = 0;
    let projectHitCount = 0;
    let industryHitCount = 0;
    const specialProjectStats = createSpecialProjectStats();
    let specialProjectHidden = 0;
    let specialProjectShown = 0;
    const matchSummary = { exact: 0, related: 0, industry: 0, project: 0, weak: 0 };
    let failedChunk = '';

    for (const chunk of chunks) {
      const file = chunkFile(chunk);
      if (!file) continue;
      let rawRecords = [];
      try {
        rawRecords = await loadChunkRecords(context.request, context.env || {}, file);
      } catch (error) {
        failedChunk = file;
        throw error;
      }
      rawTotal += rawRecords.length;

      for (const raw of rawRecords) {
        const score = rawScore(raw);
        if (!Number.isFinite(score) || score < scoreWindow.min || score > scoreWindow.max) continue;
        if (!rawKeywordPass(raw, filters)) continue;
        rawCandidate += 1;

        const record = { ...normalizeRecord(raw) };
        record.rawText = hasKeywordSearch ? JSON.stringify(raw).slice(0, 900) : '';
        record.codes = normalizeFenxiCodes(raw);
        const mappedStandardMajor = mapStandardMajor({
          majorName: record.major,
          standardMajorCode: record.codes.standardMajorCode || (record.codes.rawFenxiMajorCodeLooksStandard ? record.codes.rawFenxiMajorCode : '')
        });
        record.standardMajor = mappedStandardMajor;
        if (!record.codes.standardMajorCode && mappedStandardMajor?.code) record.codes.standardMajorCode = mappedStandardMajor.code;
        Object.assign(record, enrichBottomLineFields(record));
        if (!record.school || !record.major || !Number.isFinite(record.score)) continue;
        if (!matchRegion(record, filters.region)) continue;
        if (filters.schoolKeyword && !record.school.includes(filters.schoolKeyword)) continue;

        const match = hasKeywordSearch ? matchMajorProject(buildSearchIndex([record])[0], keywordQuery) : matchAllKeywordResult();
        if (!match.matched) {
          majorKeywordExcluded += 1;
          continue;
        }
        record.matchBadges = match.badges;
        record.matchLevel = match.matchLevel || '';
        record.matchLabel = match.matchLabel || '';
        record.matchReason = match.matchReason || match.reason || '';
        record.matchedKeyword = match.matchedKeyword || '';
        record.matchedTerms = match.matchedTerms || [];
        record.matchScore = match.score;
        if (!passBottomLineMode(record, filters.bottomLineMode)) {
          bottomLineExcluded += 1;
          continue;
        }

        const band = classifyBand(record.score, bandsMeta);
        if (!band) continue;
        const specialProject = detectSpecialProject(record);
        if (specialProject.hasSpecialProject && shouldHideSpecialProject({ ...record, specialProject }, filters.specialProjectMode)) {
          specialProjectHidden += 1;
          grouped[band].scanned += 1;
          addSpecialProjectStat(specialProjectStats, specialProject, band, 'hidden');
          continue;
        }
        if (specialProject.hasSpecialProject) {
          specialProjectShown += 1;
          addSpecialProjectStat(specialProjectStats, specialProject, band, 'shown');
          Object.assign(record, enrichSpecialProjectRecord({ ...record, specialProject }));
        } else {
          record.specialProject = specialProject;
        }

        if (candidateRank?.rankForGap && record.rank2026) {
          record.rankGap2026 = candidateRank.rankForGap - Number(record.rank2026);
          record.rankGap = record.rankGap2026;
        }
        normalized += 1;
        if (record.matchLevel && Object.prototype.hasOwnProperty.call(matchSummary, record.matchLevel)) matchSummary[record.matchLevel] += 1;
        if (record.matchLevel === 'exact' || record.matchLevel === 'related') majorHitCount += 1;
        if (record.matchLevel === 'project') projectHitCount += 1;
        if (record.matchLevel === 'industry') industryHitCount += 1;
        grouped[band].scanned += 1;
        pushRecord(grouped, band, record, candidateScore);
      }
    }

    for (const key of ['upper', 'near', 'steady']) {
      const group = grouped[key];
      const ranked = group.candidates.sort((a, b) => compareBandRecords(a, b, filters.bottomLineMode));
      const offset = requestedBand && requestedBand !== key ? 0 : pageOffset;
      const records = requestedBand && requestedBand !== key ? [] : ranked.slice(offset, offset + pageLimit);
      const returned = records.length;
      const hasMore = offset + returned < ranked.length;
      group.records = records;
      group.displayedCount = returned;
      group.truncated = hasMore;
      group.pagination = {
        offset,
        limit: pageLimit,
        returned,
        hasMore,
        nextOffset: hasMore ? offset + returned : null,
        order: 'global-ranked'
      };
      delete group.candidates;
    }

    const counts = {
      upper: grouped.upper.count,
      near: grouped.near.count,
      steady: grouped.steady.count
    };
    counts.total = counts.upper + counts.near + counts.steady;
    const filterConflicts = buildFilterConflicts({ keywordQuery, rawKeywordText: filters.majorKeyword || '', bottomLineMode: filters.bottomLineMode, specialProjectMode: filters.specialProjectMode });
    const searchAdvices = buildSearchConflictAdvice({ keywordQuery, bottomLineMode: filters.bottomLineMode, specialProjectMode: filters.specialProjectMode, resultStats: { total: counts.total } });

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
        classificationMode: 'score_delta',
        rangePreset,
        bottomLineMode: filters.bottomLineMode,
        specialProjectMode: filters.specialProjectMode,
        specialProject: {
          mode: filters.specialProjectMode,
          hidden: specialProjectHidden,
          shown: specialProjectShown,
          copy: filters.specialProjectMode === 'show_eligibility_projects' ? SPECIAL_PROJECT_COPY.showLabel : SPECIAL_PROJECT_COPY.hideLabel
        },
        bottomLine: bottomLineModeSummary(filters.bottomLineMode),
        dataScope: '辽宁 2026 物理类专业投档最低分',
        dataBoundary: '面向 2027 备考家庭；输入为模考或预估参考分数，位次是 2026 历史参考位置，不是 2027 实际位次。',
        bands: bandsMeta,
        maxPerBand: configuredPageSize,
        pageSize: pageLimit,
        pageBand: requestedBand || 'all',
        paginationContract: 'global-ranked-paged',
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
        manifestVersion: manifest.version || '',
        totalRecords: manifest.totalRecords || rawTotal,
        chunksTotal: allChunks.length,
        chunksRead: chunks.length,
        chunksSkipped: allChunks.length - chunks.length,
        rawScanned: rawTotal,
        rawCandidate,
        normalized,
        bottomLineExcluded,
        majorKeywordExcluded,
        majorHitCount,
        projectHitCount,
        industryHitCount,
        specialProjectHidden,
        specialProjectShown,
        specialProjectStats,
        specialProjectMode: filters.specialProjectMode,
        mode: 'score-window-pruned-global-ranked-paged'
      }
    });
  } catch (error) {
    return json({
      ok: false,
      message: error?.message || String(error),
      userMessage: '专业数据暂时没有读取成功。可以稍后重试，或先切回全部院校再试。',
      engineerHint: '请检查 2026 ln-rank manifest、对应分块、年份配置和当前查询参数。',
      hint: '可先打开 /api/major-bands-health?probe=1 检查数据读取；活动数据路径是 /fenxi/data/ln-rank-2026/。'
    }, 500);
  }
}

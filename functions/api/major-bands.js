import { loadManifest } from '../_lib/fenxi-manifest.js';
import { fetchFenxiJson } from '../_lib/fenxi-fetcher.js';
import { normalizeRecord, rawScore, rawSchool, rawMajor } from '../_lib/fenxi-normalizer.js';
import { makeBands, classifyBand } from '../_lib/band-engine.js';
import { getStatus } from '../_lib/status-engine.js';
import { matchRegion } from '../_lib/major-filter.js';
import { buildDisplayTags } from '../_lib/school-display-tags.js';
import { normalizeBottomLineMode, passBottomLineMode, getBottomLineSortWeight, bottomLineModeSummary, enrichBottomLineFields } from '../_lib/bottomline-policy.js';
import { buildKeywordQuery, keywordQueryWarnings } from '../_lib/keyword-query.js';
import { matchMajorProject } from '../_lib/major-project-matcher.js';
import { buildSearchIndex } from '../_lib/search-index-builder.js';
import { buildSearchConflictAdvice } from '../_lib/search-conflict-advisor.js';

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

function initGrouped(bands) {
  return {
    upper: { ...bands.upper, records: [], count: 0, scanned: 0, truncated: false },
    near: { ...bands.near, records: [], count: 0, scanned: 0, truncated: false },
    steady: { ...bands.steady, records: [], count: 0, scanned: 0, truncated: false }
  };
}


function rankSortValue(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : Number.MAX_SAFE_INTEGER;
}

function minMaxScore(bands) {
  const all = [bands.upper, bands.near, bands.steady];
  return {
    min: Math.min(...all.map(b => b.minScore)),
    max: Math.max(...all.map(b => b.maxScore))
  };
}

function chunkFile(chunk) {
  return chunk?.file || chunk?.path || '';
}

function rawKeywordPass(raw, filters) {
  const schoolKeyword = clean(filters.schoolKeyword || '', 40);
  if (schoolKeyword && !rawSchool(raw).includes(schoolKeyword)) return false;
  return true;
}

function pushRecord(grouped, band, record, candidateScore, maxPerBand) {
  const delta = record.score - candidateScore;
  const status = getStatus(delta);
  const display = buildDisplayTags(record);
  const item = {
    ...record,
    ...display,
    band,
    scoreDelta: delta,
    statusKey: status.key,
    statusLabel: status.label,
    position: status.position
  };

  grouped[band].count += 1;
  if (grouped[band].records.length < maxPerBand) {
    grouped[band].records.push(item);
  } else {
    grouped[band].truncated = true;
  }
}

async function loadChunkRecords(request, env, file) {
  const data = await fetchFenxiJson(request, env, file);
  return Array.isArray(data) ? data : (Array.isArray(data.records) ? data.records : []);
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
      bottomLineMode: normalizeBottomLineMode(url.searchParams.get('bottomLineMode') || 'all')
    };

    if (!Number.isFinite(candidateScore)) {
      return json({ ok: false, message: '考生分数格式不正确。' }, 400);
    }

    const maxPerBand = Math.max(30, Math.min(240, Number(context.env?.MAJOR_BANDS_MAX_PER_BAND || 120)));
    const bandsMeta = makeBands(candidateScore, rangePreset);
    const scoreWindow = minMaxScore(bandsMeta);
    const grouped = initGrouped(bandsMeta);
    const keywordQuery = buildKeywordQuery(filters.majorKeyword);
    const keywordWarnings = keywordQueryWarnings(keywordQuery);

    const manifest = await loadManifest(context.request, context.env || {});
    const chunks = Array.isArray(manifest.chunks) ? manifest.chunks : [];

    let rawTotal = 0;
    let rawCandidate = 0;
    let normalized = 0;
    let bottomLineExcluded = 0;
    let majorKeywordExcluded = 0;
    let majorHitCount = 0;
    let projectHitCount = 0;
    let industryHitCount = 0;
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
        if (!Number.isFinite(score)) continue;
        if (score < scoreWindow.min || score > scoreWindow.max) continue;
        if (!rawKeywordPass(raw, filters)) continue;

        rawCandidate += 1;

        const record = { ...normalizeRecord(raw), rawText: JSON.stringify(raw).slice(0, 1600) };
        Object.assign(record, enrichBottomLineFields(record));
        if (!record.school || !record.major || !Number.isFinite(record.score)) continue;
        if (!matchRegion(record, filters.region)) continue;
        if (filters.schoolKeyword && !record.school.includes(filters.schoolKeyword)) continue;

        const indexed = buildSearchIndex([record])[0];
        const match = matchMajorProject(indexed, keywordQuery);
        if (!match.matched) { majorKeywordExcluded += 1; continue; }
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

        normalized += 1;
        if (record.matchLevel && Object.prototype.hasOwnProperty.call(matchSummary, record.matchLevel)) matchSummary[record.matchLevel] += 1;
        if (record.matchLevel === 'exact' || record.matchLevel === 'related') majorHitCount += 1;
        if (record.matchLevel === 'project') projectHitCount += 1;
        if (record.matchLevel === 'industry') industryHitCount += 1;
        grouped[band].scanned += 1;
        pushRecord(grouped, band, record, candidateScore, maxPerBand);
      }
    }

    for (const key of ['upper', 'near', 'steady']) {
      grouped[key].records.sort((a, b) => {
        const bw = getBottomLineSortWeight(b, filters.bottomLineMode) - getBottomLineSortWeight(a, filters.bottomLineMode);
        return bw || (Number(b.matchScore || 0) - Number(a.matchScore || 0)) || Math.abs(a.score - candidateScore) - Math.abs(b.score - candidateScore) || rankSortValue(a.rank) - rankSortValue(b.rank);
      });
      grouped[key].displayedCount = grouped[key].records.length;
    }

    const counts = {
      upper: grouped.upper.count,
      near: grouped.near.count,
      steady: grouped.steady.count
    };
    counts.total = counts.upper + counts.near + counts.steady;
    const searchAdvices = buildSearchConflictAdvice({ keywordQuery, bottomLineMode: filters.bottomLineMode, resultStats: { total: counts.total } });

    return json({
      ok: true,
      meta: {
        candidateScore,
        rangePreset,
        bottomLineMode: filters.bottomLineMode,
        bottomLine: bottomLineModeSummary(filters.bottomLineMode),
        dataScope: '辽宁2025物理类',
        bands: bandsMeta,
        maxPerBand,
        elapsedMs: Date.now() - started
      },
      keywordQuery,
      keywordWarnings,
      searchAdvices,
      matchSummary,
      bands: grouped,
      counts,
      source: {
        manifestVersion: manifest.version || '',
        totalRecords: manifest.totalRecords || rawTotal,
        chunks: chunks.length,
        rawScanned: rawTotal,
        rawCandidate,
        normalized,
        bottomLineExcluded,
        majorKeywordExcluded,
        majorHitCount,
        projectHitCount,
        industryHitCount,
        mode: 'streaming-filtered-capped'
      }
    });
  } catch (error) {
    return json({
      ok: false,
      message: error && error.message ? error.message : String(error),
      hint: '专业池接口已改为分块筛选模式；若仍失败，请检查 /fenxi/data/manifest.json 与 chunks 路径，或打开 /api/major-bands-health 查看数据读取状态。'
    }, 500);
  }
}

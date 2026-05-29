import { loadManifest } from '../_lib/fenxi-manifest.js';
import { fetchFenxiJson } from '../_lib/fenxi-fetcher.js';
import { normalizeRecord, rawScore, rawSchool, rawMajor } from '../_lib/fenxi-normalizer.js';
import { makeBands, classifyBand } from '../_lib/band-engine.js';
import { getStatus } from '../_lib/status-engine.js';
import { matchRegion, matchKeyword } from '../_lib/major-filter.js';
import { buildDisplayTags } from '../_lib/school-display-tags.js';

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
  const majorKeyword = clean(filters.majorKeyword || '', 40);
  if (schoolKeyword && !rawSchool(raw).includes(schoolKeyword)) return false;
  if (majorKeyword && !rawMajor(raw).includes(majorKeyword)) return false;
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
      majorKeyword: clean(url.searchParams.get('majorKeyword') || '', 40)
    };

    if (!Number.isFinite(candidateScore)) {
      return json({ ok: false, message: '考生分数格式不正确。' }, 400);
    }

    const maxPerBand = Math.max(30, Math.min(240, Number(context.env?.MAJOR_BANDS_MAX_PER_BAND || 120)));
    const bandsMeta = makeBands(candidateScore, rangePreset);
    const scoreWindow = minMaxScore(bandsMeta);
    const grouped = initGrouped(bandsMeta);

    const manifest = await loadManifest(context.request, context.env || {});
    const chunks = Array.isArray(manifest.chunks) ? manifest.chunks : [];

    let rawTotal = 0;
    let rawCandidate = 0;
    let normalized = 0;
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

        const record = normalizeRecord(raw);
        if (!record.school || !record.major || !Number.isFinite(record.score)) continue;
        if (!matchRegion(record, filters.region)) continue;
        if (!matchKeyword(record, filters.schoolKeyword, filters.majorKeyword)) continue;

        const band = classifyBand(record.score, bandsMeta);
        if (!band) continue;

        normalized += 1;
        grouped[band].scanned += 1;
        pushRecord(grouped, band, record, candidateScore, maxPerBand);
      }
    }

    for (const key of ['upper', 'near', 'steady']) {
      grouped[key].records.sort(
        (a, b) => Math.abs(a.score - candidateScore) - Math.abs(b.score - candidateScore) || (a.rank || 0) - (b.rank || 0)
      );
      grouped[key].displayedCount = grouped[key].records.length;
    }

    const counts = {
      upper: grouped.upper.count,
      near: grouped.near.count,
      steady: grouped.steady.count
    };
    counts.total = counts.upper + counts.near + counts.steady;

    return json({
      ok: true,
      meta: {
        candidateScore,
        rangePreset,
        dataScope: '辽宁2025物理类',
        bands: bandsMeta,
        maxPerBand,
        elapsedMs: Date.now() - started
      },
      bands: grouped,
      counts,
      source: {
        manifestVersion: manifest.version || '',
        totalRecords: manifest.totalRecords || rawTotal,
        chunks: chunks.length,
        rawScanned: rawTotal,
        rawCandidate,
        normalized,
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

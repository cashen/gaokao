import { loadManifest } from '../_lib/fenxi-manifest.js';
import { fetchFenxiJson } from '../_lib/fenxi-fetcher.js';
import { makeBands } from '../_lib/band-engine.js';

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}

function number(value) {
  if (value == null || value === '') return null;
  const match = String(value).replace(/[,，\s]/g, '').match(/-?\d+(?:\.\d+)?/);
  const parsed = match ? Number(match[0]) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function rawScore(record = {}) {
  return number(record.score2026 ?? record.score ?? record.minScore ?? record['2026最低分'] ?? record['最低分']);
}

function chunkFile(chunk) {
  return chunk?.file || chunk?.path || '';
}

function chunkRecordCount(chunk) {
  return number(chunk?.recordCount ?? chunk?.records ?? chunk?.count) || 0;
}

function chunkScoreBounds(chunk) {
  const min = number(chunk?.minScore ?? chunk?.scoreMin ?? chunk?.minimumScore);
  const max = number(chunk?.maxScore ?? chunk?.scoreMax ?? chunk?.maximumScore);
  return { min, max };
}

function chunkIntersectsWindow(chunk, window) {
  const bounds = chunkScoreBounds(chunk);
  if (!Number.isFinite(bounds.min) || !Number.isFinite(bounds.max)) return true;
  return bounds.max >= window.min && bounds.min <= window.max;
}

function minMaxScore(bands) {
  const all = [bands.upper, bands.near, bands.steady];
  return {
    min: Math.min(...all.map(item => item.minScore)),
    max: Math.max(...all.map(item => item.maxScore))
  };
}

function shouldRunProbe(url) {
  const value = String(url.searchParams.get('probe') || '').trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes';
}

async function runBoundedProbe(request, env, chunks) {
  const definitions = [
    { candidateScore: 499, rangePreset: 'standard', bottomLineMode: 'all', label: '低分段全部院校' },
    { candidateScore: 499, rangePreset: 'standard', bottomLineMode: 'public_first', label: '低分段公办优先' },
    { candidateScore: 515, rangePreset: 'standard', bottomLineMode: 'public_first', label: '特控线边界公办优先' },
    { candidateScore: 580, rangePreset: 'standard', bottomLineMode: 'all', label: '普通主流程' },
    { candidateScore: 666, rangePreset: 'standard', bottomLineMode: 'all', label: '高分段长专业名压力' }
  ];
  const probes = definitions.map(definition => {
    const window = minMaxScore(makeBands(definition.candidateScore, definition.rangePreset));
    const intersecting = chunks.filter(chunk => chunkIntersectsWindow(chunk, window));
    return {
      ...definition,
      scoreWindow: window,
      chunksMatched: intersecting.length,
      manifestRecordCapacity: intersecting.reduce((sum, chunk) => sum + chunkRecordCount(chunk), 0),
      chunkFiles: intersecting.map(chunkFile).filter(Boolean),
      ok: intersecting.length > 0
    };
  });

  const representative = probes.find(probe => probe.candidateScore === 580 && probe.bottomLineMode === 'all') || probes[0];
  const representativeChunk = chunks.find(chunk => representative.chunkFiles.includes(chunkFile(chunk))) || null;
  let sample = null;
  let rawScanned = 0;
  const started = Date.now();

  if (representativeChunk) {
    const file = chunkFile(representativeChunk);
    const payload = await fetchFenxiJson(request, env || {}, file);
    const records = Array.isArray(payload) ? payload : (Array.isArray(payload.records) ? payload.records : []);
    rawScanned = records.length;
    let candidateCount = 0;
    for (const record of records) {
      const score = rawScore(record);
      if (Number.isFinite(score) && score >= representative.scoreWindow.min && score <= representative.scoreWindow.max) candidateCount += 1;
    }
    sample = {
      file,
      records: records.length,
      candidateScore: representative.candidateScore,
      scoreWindow: representative.scoreWindow,
      candidateCount,
      sampleKeys: records[0] ? Object.keys(records[0]).slice(0, 12) : []
    };
  }

  return {
    mode: 'bounded-manifest-plus-one-chunk',
    elapsedMs: Date.now() - started,
    rawScanned,
    chunksRead: sample ? 1 : 0,
    chunksAvailable: chunks.length,
    fullDatasetScan: false,
    resourceBudget: {
      maxChunksRead: 1,
      parsedChunkCache: false
    },
    sample,
    probes
  };
}

export async function onRequest(context) {
  try {
    const url = new URL(context.request.url);
    const manifest = await loadManifest(context.request, context.env || {});
    const chunks = Array.isArray(manifest.chunks) ? manifest.chunks : [];
    const payload = {
      ok: true,
      runtimeHealth: '/api/ln-rank-runtime-health',
      manifest: {
        version: manifest.version || '',
        totalRecords: manifest.totalRecords || '',
        chunkCount: chunks.length,
        chunks: chunks.map(chunk => ({
          file: chunkFile(chunk),
          recordCount: chunkRecordCount(chunk),
          ...chunkScoreBounds(chunk)
        }))
      },
      resourcePolicy: {
        version: 'major-bands-health-budget-v3972_2',
        fullDatasetProbeDisabled: true,
        largeChunkModuleCacheDisabled: true,
        maximumProbeChunks: 1
      },
      env: {
        hasFenxiBase: Boolean(context.env?.FENXI_DATA_BASE),
        hasSecret: Boolean(context.env?.LN_SESSION_SECRET || context.env?.ACCESS_COOKIE_SECRET || context.env?.FENXI_SESSION_SECRET)
      }
    };

    if (shouldRunProbe(url)) {
      payload.probe = await runBoundedProbe(context.request, context.env || {}, chunks);
    } else {
      payload.probeHint = '追加 ?probe=1 执行单分片受限探针；生产健康检查不会再扫描全部投档分片。';
    }

    return json(payload);
  } catch (error) {
    return json({
      ok: false,
      message: error?.message || String(error),
      engineerHint: 'major-bands-health 无法完成 manifest 或受限分片探针，请检查 /fenxi/data/manifest.json、分片路径和 Functions 授权。'
    }, 500);
  }
}

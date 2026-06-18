import { loadManifest } from '../_lib/fenxi-manifest.js';
import { fetchFenxiJson } from '../_lib/fenxi-fetcher.js';
import { makeBands } from '../_lib/band-engine.js';
import { rawScore } from '../_lib/fenxi-normalizer.js';

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}

function chunkFile(chunk) {
  return chunk?.file || chunk?.path || '';
}

function minMaxScore(bands) {
  const all = [bands.upper, bands.near, bands.steady];
  return {
    min: Math.min(...all.map(b => b.minScore)),
    max: Math.max(...all.map(b => b.maxScore))
  };
}

function shouldRunProbe(url) {
  const v = String(url.searchParams.get('probe') || '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

async function runScoreProbes(request, env, chunks) {
  const probes = [
    { candidateScore: 499, rangePreset: 'standard', bottomLineMode: 'all', label: '低分段全部院校' },
    { candidateScore: 499, rangePreset: 'standard', bottomLineMode: 'public_first', label: '低分段公办优先' },
    { candidateScore: 515, rangePreset: 'standard', bottomLineMode: 'public_first', label: '特控线边界公办优先' },
    { candidateScore: 580, rangePreset: 'standard', bottomLineMode: 'all', label: '普通主流程' },
    { candidateScore: 666, rangePreset: 'standard', bottomLineMode: 'all', label: '高分段长专业名压力' }
  ];
  const windows = probes.map(p => ({ ...p, ...minMaxScore(makeBands(p.candidateScore, p.rangePreset)) }));
  const resultMap = new Map(windows.map(p => [`${p.candidateScore}-${p.bottomLineMode}`, { ...p, candidateCount: 0, chunksChecked: 0 } ]));
  let rawScanned = 0;
  const started = Date.now();

  for (const chunk of chunks) {
    const file = chunkFile(chunk);
    if (!file) continue;
    const data = await fetchFenxiJson(request, env || {}, file);
    const records = Array.isArray(data) ? data : (Array.isArray(data.records) ? data.records : []);
    rawScanned += records.length;
    for (const probe of resultMap.values()) probe.chunksChecked += 1;
    for (const raw of records) {
      const score = rawScore(raw);
      if (!Number.isFinite(score)) continue;
      for (const probe of resultMap.values()) {
        if (score >= probe.min && score <= probe.max) probe.candidateCount += 1;
      }
    }
  }

  return {
    elapsedMs: Date.now() - started,
    rawScanned,
    probes: Array.from(resultMap.values()).map(p => ({
      label: p.label,
      candidateScore: p.candidateScore,
      rangePreset: p.rangePreset,
      bottomLineMode: p.bottomLineMode,
      scoreWindow: { min: p.min, max: p.max },
      candidateCount: p.candidateCount,
      chunksChecked: p.chunksChecked,
      ok: p.candidateCount >= 0
    }))
  };
}

export async function onRequest(context) {
  try {
    const url = new URL(context.request.url);
    const manifest = await loadManifest(context.request, context.env || {});
    const chunks = Array.isArray(manifest.chunks) ? manifest.chunks : [];
    const firstFile = chunkFile(chunks[0]);
    let firstChunk = null;

    if (firstFile) {
      const data = await fetchFenxiJson(context.request, context.env || {}, firstFile);
      const records = Array.isArray(data) ? data : (Array.isArray(data.records) ? data.records : []);
      firstChunk = { file: firstFile, records: records.length, sampleKeys: records[0] ? Object.keys(records[0]).slice(0, 12) : [] };
    }

    const payload = {
      ok: true,
      runtimeHealth: '/api/ln-rank-runtime-health',
      manifest: {
        version: manifest.version || '',
        totalRecords: manifest.totalRecords || '',
        chunkCount: chunks.length,
        firstChunk
      },
      env: {
        hasFenxiBase: Boolean(context.env?.FENXI_DATA_BASE),
        hasSecret: Boolean(context.env?.LN_SESSION_SECRET || context.env?.ACCESS_COOKIE_SECRET || context.env?.FENXI_SESSION_SECRET)
      }
    };

    if (shouldRunProbe(url)) {
      payload.probe = await runScoreProbes(context.request, context.env || {}, chunks);
    } else {
      payload.probeHint = '追加 ?probe=1 可执行 499/515/580/666 低分段与高分段读取探针。';
    }

    return json(payload);
  } catch (error) {
    return json({ ok: false, message: error?.message || String(error), engineerHint: 'major-bands-health 无法完成数据读取或探针，请优先检查 /fenxi/data/manifest.json、chunks 路径、Functions 部署位置和授权 cookie。' }, 500);
  }
}

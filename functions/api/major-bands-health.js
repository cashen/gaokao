import { loadManifest } from '../_lib/fenxi-manifest.js';
import { fetchFenxiJson } from '../_lib/fenxi-fetcher.js';

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}

function chunkFile(chunk) {
  return chunk?.file || chunk?.path || '';
}

export async function onRequest(context) {
  try {
    const manifest = await loadManifest(context.request, context.env || {});
    const chunks = Array.isArray(manifest.chunks) ? manifest.chunks : [];
    const firstFile = chunkFile(chunks[0]);
    let firstChunk = null;

    if (firstFile) {
      const data = await fetchFenxiJson(context.request, context.env || {}, firstFile);
      const records = Array.isArray(data) ? data : (Array.isArray(data.records) ? data.records : []);
      firstChunk = { file: firstFile, records: records.length, sampleKeys: records[0] ? Object.keys(records[0]).slice(0, 12) : [] };
    }

    return json({
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
    });
  } catch (error) {
    return json({ ok: false, message: error?.message || String(error) }, 500);
  }
}

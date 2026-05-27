import { loadAllRecords } from '../_lib/fenxi-manifest.js';
import { normalizeRecord } from '../_lib/fenxi-normalizer.js';
import { buildBandResult, makeBands } from '../_lib/band-engine.js';
function json(payload, status = 200) { return new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } }); }
function clean(value, max = 50) { return String(value || '').trim().slice(0, max); }
export async function onRequest(context) {
  if (context.request.method !== 'GET') return json({ ok: false, message: '只支持 GET 请求。' }, 405);
  try {
    const url = new URL(context.request.url);
    const candidateScore = Math.round(Number(url.searchParams.get('candidateScore') || 520));
    const rangePreset = clean(url.searchParams.get('rangePreset') || 'standard', 20);
    const filters = { region: clean(url.searchParams.get('region') || 'all', 30), schoolKeyword: clean(url.searchParams.get('schoolKeyword') || '', 40), majorKeyword: clean(url.searchParams.get('majorKeyword') || '', 40) };
    if (!Number.isFinite(candidateScore)) return json({ ok: false, message: '考生分数格式不正确。' }, 400);
    const { manifest, records: rawRecords } = await loadAllRecords(context.request, context.env || {});
    const records = rawRecords.map(normalizeRecord).filter(r => r.school && r.major && Number.isFinite(r.score));
    const bands = buildBandResult(records, { candidateScore, presetKey: rangePreset, filters });
    const counts = { upper: bands.upper.count, near: bands.near.count, steady: bands.steady.count };
    counts.total = counts.upper + counts.near + counts.steady;
    return json({ ok: true, meta: { candidateScore, rangePreset, dataScope: '辽宁2025物理类', bands: makeBands(candidateScore, rangePreset) }, bands, counts, source: { manifestVersion: manifest.version || '', totalRecords: manifest.totalRecords || rawRecords.length, mode: 'cloudflare-pages-function-cookie-session' } });
  } catch (error) {
    return json({ ok: false, message: error && error.message ? error.message : String(error), hint: '请先测试 /api/major-bands?candidateScore=520，并确认 functions 在根目录、/fenxi/data 路径正确、LN_SESSION_SECRET 或 ACCESS_COOKIE_SECRET 已配置。' }, 500);
  }
}

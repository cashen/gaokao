import { hasFenxiSecret } from '../_lib/fenxi-session.js';
import { loadManifest, loadAllRecords } from '../_lib/fenxi-manifest.js';
import { buildMajorWindow } from '../_lib/major-window-engine.js';
function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}
function toInt(value, fallback) { const n = Number(value); return Number.isFinite(n) ? Math.round(n) : fallback; }
function safeText(value, max = 60) { return String(value || '').slice(0, max); }
export async function onRequest(context) {
  if (context.request.method !== 'GET') return json({ ok:false, message:'只支持 GET 请求。' }, 405);
  try {
    const url = new URL(context.request.url);
    const candidateScore = toInt(url.searchParams.get('candidateScore'), 520);
    const viewScore = toInt(url.searchParams.get('viewScore'), candidateScore);
    const region = safeText(url.searchParams.get('region') || 'all', 20);
    const schoolKeyword = safeText(url.searchParams.get('schoolKeyword') || '', 50);
    const majorKeyword = safeText(url.searchParams.get('majorKeyword') || '', 50);
    if (candidateScore < 150 || candidateScore > 707 || viewScore < 150 || viewScore > 707) return json({ ok:false, message:'分数超出可用范围。' }, 400);
    if (!hasFenxiSecret(context.env || {})) {
      return json({ ok:false, message:'后端未配置 LN_SESSION_SECRET 或 ACCESS_COOKIE_SECRET，无法读取受保护的 /fenxi/data。' }, 500);
    }
    const manifest = await loadManifest(context.request, context.env || {});
    const records = await loadAllRecords(context.request, context.env || {}, manifest);
    const result = buildMajorWindow(records, { candidateScore, viewScore, region, schoolKeyword, majorKeyword });
    return json({ ok:true, ...result, source: { mode:'fenxi-cookie-session', manifestVersion: manifest.version || '', totalRecords: manifest.totalRecords || records.length } });
  } catch (error) {
    return json({ ok:false, message: error.message || String(error), hint:'请确认 functions 与 ln-rank 同级部署，且 Cloudflare Pages 配置了与 /fenxi 相同的 LN_SESSION_SECRET 或 ACCESS_COOKIE_SECRET。' }, 500);
  }
}

import { hasFenxiSecret } from '../_lib/fenxi-session.js';
import { loadAllRecords } from '../_lib/fenxi-manifest.js';
import { buildMajorWindow } from '../_lib/major-window-engine.js';

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}

function clean(value, max = 50) {
  return String(value || '').trim().slice(0, max);
}

// 兼容旧版滑轨接口。v3.9.3+ 主页面使用 /api/major-bands。
export async function onRequest(context) {
  if (context.request.method !== 'GET') return json({ ok: false, message: '只支持 GET 请求。' }, 405);

  try {
    const url = new URL(context.request.url);
    const candidateScore = Math.round(Number(url.searchParams.get('candidateScore') || 520));
    const viewScore = Math.round(Number(url.searchParams.get('viewScore') || candidateScore));
    const filters = {
      region: clean(url.searchParams.get('region') || 'all', 20),
      schoolKeyword: clean(url.searchParams.get('schoolKeyword') || '', 40),
      majorKeyword: clean(url.searchParams.get('majorKeyword') || '', 40)
    };

    if (!Number.isFinite(candidateScore) || !Number.isFinite(viewScore)) {
      return json({ ok: false, message: '分数格式不正确。' }, 400);
    }

    const { manifest, records } = await loadAllRecords(context.request, context.env || {});
    const groups = buildMajorWindow(records, { candidateScore, viewScore, filters });
    const counts = {
      upper: groups.upper.count,
      near: groups.near.count,
      lower: groups.lower.count
    };
    counts.total = counts.upper + counts.near + counts.lower;

    return json({
      ok: true,
      legacy: true,
      message: '这是旧版 /api/major-window 兼容接口。新版主页面使用 /api/major-bands。',
      meta: { candidateScore, viewScore, dataScope: '辽宁2025物理类' },
      groups,
      counts,
      source: {
        manifestVersion: manifest.version || '',
        totalRecords: manifest.totalRecords || records.length,
        mode: hasFenxiSecret(context.env || {}) ? 'server-signed-cookie' : 'no-secret-detected'
      }
    });
  } catch (error) {
    return json({
      ok: false,
      message: error && error.message ? error.message : String(error),
      hint: '请确认 functions 在根目录、/fenxi/data 路径正确、LN_SESSION_SECRET 或 ACCESS_COOKIE_SECRET 已配置。'
    }, 500);
  }
}

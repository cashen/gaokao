const STATIC_PAGE = '/ln-rank/211-mainline.html';
const STATIC_INDEX = '/ln-rank/data/211-static/211-static-index.v3972_0.json';

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=300'
    }
  });
}

export function is211ScopeRequest(request) {
  try {
    return new URL(request.url).searchParams.get('scope') === '211';
  } catch {
    return false;
  }
}

export function handle211StaticCompatibility(request) {
  if (request.method !== 'GET') {
    return json({ ok: false, message: '只支持 GET 请求。' }, 405);
  }
  const url = new URL(request.url);
  const mode = String(url.searchParams.get('mode') || 'meta').slice(0, 30);
  return json({
    ok: true,
    mode,
    scope: '211',
    migratedToStatic: true,
    architecture: 'build-time-static-index',
    staticPage: STATIC_PAGE,
    staticIndex: STATIC_INDEX,
    records: [],
    grouped: { near: [], upper: [], lower: [] },
    count: 0,
    scannedCount: 0,
    matchedCount: 0,
    dataReadOk: true,
    boundary: '211完整目录已迁移到不可变静态索引。该兼容接口不读取或扫描投档数据，不执行背景匹配、排序或聚合。'
  });
}

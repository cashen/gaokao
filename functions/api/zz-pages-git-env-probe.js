function json(payload, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

export function onRequest(context) {
  if (context.request.method !== 'GET') return json({ ok: false, message: 'GET only' }, 405);
  const env = context.env || {};
  return json({
    ok: true,
    cfPagesCommitSha: String(env.CF_PAGES_COMMIT_SHA || ''),
    cfPagesBranch: String(env.CF_PAGES_BRANCH || ''),
    cfPagesUrl: String(env.CF_PAGES_URL || ''),
    availableCfPagesKeys: Object.keys(env).filter(key => key.startsWith('CF_PAGES_')).sort()
  });
}

const SOURCE_INDEX_PATH = '/data/zy2026/school-index.json';
const TARGET_SCHOOL = '沈阳航空航天大学';

function clean(value, max = 500) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff'
    }
  });
}

function normalizeSchoolName(value) {
  return clean(value, 160)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[（【\[]/g, '(')
    .replace(/[）】\]]/g, ')')
    .replace(/[\s·•・,，。；;：:'"“”‘’!！?？_—-]+/g, '');
}

async function sha256(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function onRequest(context) {
  if (context.request.method !== 'GET') return json({ ok: false, message: 'GET only' }, 405);
  if (!context.env?.ASSETS?.fetch) return json({ ok: false, code: 'assets_binding_missing' }, 503);

  const assetUrl = new URL(SOURCE_INDEX_PATH, context.request.url);
  const response = await context.env.ASSETS.fetch(new Request(assetUrl.toString(), {
    method: 'GET',
    headers: { accept: 'application/json' }
  }));
  const text = await response.text();
  let payload = null;
  try {
    payload = JSON.parse(text);
  } catch {
    return json({
      ok: false,
      code: 'asset_not_json',
      assetStatus: response.status,
      contentType: response.headers.get('content-type') || '',
      bodyPrefix: text.slice(0, 300),
      deployment: {
        commitSha: clean(context.env?.CF_PAGES_COMMIT_SHA, 40),
        branch: clean(context.env?.CF_PAGES_BRANCH, 160),
        url: clean(context.env?.CF_PAGES_URL, 500)
      },
      requestOrigin: new URL(context.request.url).origin,
      assetUrl: assetUrl.toString()
    }, 500);
  }

  const schools = Array.isArray(payload?.schools) ? payload.schools : Object.values(payload?.schools || {});
  const needle = normalizeSchoolName(TARGET_SCHOOL);
  const exact = schools.filter(item => normalizeSchoolName(item?.name) === needle);

  return json({
    ok: response.ok,
    assetStatus: response.status,
    contentType: response.headers.get('content-type') || '',
    indexVersion: clean(payload?.version, 160),
    indexSha256: await sha256(text),
    schoolCount: schools.length,
    aviationCount: exact.length,
    aviation: exact.map(item => ({
      key: clean(item?.key, 160),
      name: clean(item?.name, 160),
      chunk: clean(item?.chunk, 80),
      projects2026: Number(item?.projects2026 ?? 0)
    })),
    deployment: {
      commitSha: clean(context.env?.CF_PAGES_COMMIT_SHA, 40),
      branch: clean(context.env?.CF_PAGES_BRANCH, 160),
      url: clean(context.env?.CF_PAGES_URL, 500)
    },
    requestOrigin: new URL(context.request.url).origin,
    assetUrl: assetUrl.toString()
  }, response.ok ? 200 : 502);
}

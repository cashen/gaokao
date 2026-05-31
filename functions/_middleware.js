import { json, verifyFenxiRequest } from './_lib/fenxi-session.js';

function isFenxiAuthApi(pathname) {
  return pathname === '/fenxi/api/login' || pathname === '/fenxi/api/session' || pathname === '/fenxi/api/logout';
}

function isFenxiProtectedData(pathname) {
  return pathname === '/fenxi/data' || pathname.startsWith('/fenxi/data/');
}

export async function onRequest(context) {
  const { request, next, env } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;

  // /ln-rank and /api/* are intentionally not touched here.
  if (!pathname.startsWith('/fenxi/')) return next();

  // Let the real login/session/logout handlers receive the request.
  if (isFenxiAuthApi(pathname)) return next();

  // Keep /fenxi page shell, assets, debug pages visible. Protect only the data JSON files.
  if (!isFenxiProtectedData(pathname)) return next();

  const authed = await verifyFenxiRequest(request, env);
  if (authed) return next();

  return json({ ok: false, authed: false, message: '请先登录后再访问 /fenxi/data。' }, { status: 401 });
}

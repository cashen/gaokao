import { checkFenxiAccessCode, clearFenxiSetCookie, createFenxiSetCookie, json } from '../../_lib/fenxi-session.js';

async function readLoginCode(request) {
  const contentType = request.headers.get('content-type') || '';
  try {
    if (contentType.includes('application/json')) {
      const body = await request.json();
      return String(body.code || body.password || body.token || body.accessCode || '').trim();
    }
    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      return String(form.get('code') || form.get('password') || form.get('token') || form.get('accessCode') || '').trim();
    }
    const text = await request.text();
    if (!text) return '';
    try {
      const body = JSON.parse(text);
      return String(body.code || body.password || body.token || body.accessCode || '').trim();
    } catch {
      return text.trim();
    }
  } catch {
    return '';
  }
}

function optionsResponse() {
  return new Response(null, {
    status: 204,
    headers: {
      allow: 'POST, OPTIONS',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
    },
  });
}

export async function onRequestOptions() {
  return optionsResponse();
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const code = await readLoginCode(request);
  if (!checkFenxiAccessCode(code, env)) {
    return json({ ok: false, authed: false, message: '访问码不正确' }, { status: 401 });
  }

  const headers = new Headers();

  // Clear possible stale cookies from older deployments first. Browsers may send
  // both Path=/fenxi and Path=/ cookies; if an old invalid cookie appears first,
  // data requests can still be rejected. v3.9.51 both clears old variants and
  // verification accepts any valid token in the Cookie header.
  headers.append('set-cookie', clearFenxiSetCookie('/'));
  headers.append('set-cookie', clearFenxiSetCookie('/fenxi'));

  const fenxiCookie = await createFenxiSetCookie(env, undefined, '/fenxi');
  const rootCookie = await createFenxiSetCookie(env, undefined, '/');
  if (fenxiCookie) headers.append('set-cookie', fenxiCookie);
  if (rootCookie) headers.append('set-cookie', rootCookie);

  return json({ ok: true, authed: true, message: '登录成功' }, { status: 200, headers });
}

export async function onRequestGet() {
  return json({ ok: false, authed: false, message: '请使用 POST 登录' }, { status: 405, headers: { allow: 'POST, OPTIONS' } });
}

import { checkFenxiAccessCode, createFenxiSetCookie, json } from '../../_lib/fenxi-session.js';

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
  const setCookie = await createFenxiSetCookie(env);
  const headers = new Headers();
  if (setCookie) headers.set('set-cookie', setCookie);
  return json({ ok: true, authed: true, message: '登录成功' }, { status: 200, headers });
}

export async function onRequestGet() {
  return json({ ok: false, authed: false, message: '请使用 POST 登录' }, { status: 405, headers: { allow: 'POST, OPTIONS' } });
}

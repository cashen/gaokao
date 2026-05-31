import { clearFenxiSetCookie, json } from '../../_lib/fenxi-session.js';

function handle() {
  const headers = new Headers();
  headers.append('set-cookie', clearFenxiSetCookie('/'));
  headers.append('set-cookie', clearFenxiSetCookie('/fenxi'));
  return json({ ok: true, authed: false, message: '已退出' }, { headers });
}

export async function onRequestGet() {
  return handle();
}

export async function onRequestPost() {
  return handle();
}

import { clearFenxiSetCookie, json } from '../../_lib/fenxi-session.js';

function handle() {
  return json({ ok: true, authed: false, message: '已退出' }, { headers: { 'set-cookie': clearFenxiSetCookie() } });
}

export async function onRequestGet() {
  return handle();
}

export async function onRequestPost() {
  return handle();
}

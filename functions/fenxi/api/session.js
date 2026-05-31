import { json, verifyFenxiRequest } from '../../_lib/fenxi-session.js';

async function handle(context) {
  const authed = await verifyFenxiRequest(context.request, context.env);
  return json({ ok: true, authed });
}

export async function onRequestGet(context) {
  return handle(context);
}

export async function onRequestPost(context) {
  return handle(context);
}

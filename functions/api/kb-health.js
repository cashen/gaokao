import { getKbStats } from '../_lib/kb/kb-retriever.js';

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}

export async function onRequest(context) {
  try {
    return json({ ok: true, stats: await getKbStats(context.request, context.env || {}) });
  } catch (error) {
    return json({ ok: false, message: error?.message || String(error) }, 500);
  }
}

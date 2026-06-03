import { getKbStats } from '../_lib/kb/kb-retriever.js';
import { KB_REGISTRY } from '../_lib/kb/kb-registry.js';

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}

export async function onRequest(context) {
  try {
    const stats = await getKbStats(context.request, context.env || {});
    const layers = Object.fromEntries(Object.keys(KB_REGISTRY.layers || {}).map(key => [key, 'ok']));
    return json({ ok: true, version: KB_REGISTRY.version, layers, stats });
  } catch (error) {
    return json({ ok: false, message: error?.message || String(error) }, 500);
  }
}

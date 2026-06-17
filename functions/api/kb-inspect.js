import { getKnowledgeContext, getKbStats } from '../_lib/kb/kb-retriever.js';

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

export async function onRequest(context) {
  if (context.request.method !== 'GET') {
    return json({ ok: false, message: '只支持 GET 请求。' }, 405);
  }

  const url = new URL(context.request.url);
  const school = String(url.searchParams.get('school') || '').trim();
  const major = String(url.searchParams.get('major') || '').trim();

  return json({
    ok: true,
    stats: await getKbStats(context.request, context.env || {}),
    query: { school, major },
    knowledgeContext: await getKnowledgeContext({ school, major }, context.request, context.env || {})
  });
}

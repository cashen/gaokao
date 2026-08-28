import { queryAiSchoolHistoryFact } from '../../_lib/ai/school-history-fact-source.js';

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

export async function onRequest(context) {
  if (context.request.method !== 'GET') return json({ ok: false, message: '只支持 GET 请求。' }, 405);
  try {
    const url = new URL(context.request.url);
    const result = await queryAiSchoolHistoryFact(context, {
      school: url.searchParams.get('school') || '',
      majorKeyword: url.searchParams.get('majorKeyword') || '',
      candidateScore: url.searchParams.get('candidateScore'),
      sort: url.searchParams.get('sort') || '',
      offset: url.searchParams.get('offset'),
      limit: url.searchParams.get('limit')
    });
    const status = Number(result?.status) || (result?.ok ? 200 : 400);
    if (Object.prototype.hasOwnProperty.call(result || {}, 'status')) {
      const { status: _status, ...payload } = result;
      return json(payload, status);
    }
    return json(result, status);
  } catch (error) {
    return json({
      ok: false,
      code: 'school_history_fact_unavailable',
      message: '学校历史事实暂时没有读取成功，请稍后只重试本项。',
      engineerHint: error?.message || String(error)
    }, 503);
  }
}

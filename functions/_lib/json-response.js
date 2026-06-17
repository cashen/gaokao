export function jsonResponse(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extraHeaders
    }
  });
}
export function jsonOk(payload = {}, status = 200) {
  return jsonResponse({ ok: true, ...payload }, status);
}
export function jsonError(message = '数据暂时没有读取成功。', status = 500, extra = {}) {
  return jsonResponse({ ok: false, message, ...extra }, status);
}

function firstChars(text, len = 180) {
  return String(text || '').replace(/\s+/g, ' ').slice(0, len);
}

function looksLikeHtml(text) {
  const s = String(text || '').trim().toLowerCase();
  return s.startsWith('<!doctype html') || s.startsWith('<html') || s.includes('<html');
}

function buildInterfaceError({ path, status, raw }) {
  const preview = firstChars(raw, 140);
  if (looksLikeHtml(raw)) {
    return new Error(`飞书自选池报告接口没有返回 JSON。请求路径：${path}；HTTP状态：${status}；返回内容像 HTML。通常表示 functions/api/feishu-create-selection-pool-report.js 没有部署到当前 Cloudflare Pages 生产环境，或请求路径未命中 Functions。返回片段：${preview}`);
  }
  return new Error(`飞书自选池报告接口返回内容不是 JSON。请求路径：${path}；HTTP状态：${status}；返回片段：${preview}`);
}

export async function createSelectionPoolFeishuReport(payload) {
  const path = '/api/feishu-create-selection-pool-report';
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    cache: 'no-store',
    body: JSON.stringify(payload || {})
  });
  const raw = await response.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw buildInterfaceError({ path, status: response.status, raw });
  }
  if (!response.ok || data.ok === false) throw new Error(data.message || data.hint || `飞书报告生成失败：${response.status}`);
  return data;
}

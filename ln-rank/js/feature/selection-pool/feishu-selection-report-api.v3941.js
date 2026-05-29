function firstChars(text, len = 180) {
  return String(text || '').replace(/\s+/g, ' ').slice(0, len);
}

function looksLikeHtml(text) {
  const s = String(text || '').trim().toLowerCase();
  return s.startsWith('<!doctype html') || s.startsWith('<html') || s.includes('<html');
}

export async function createSelectionPoolFeishuReport(payload) {
  const response = await fetch('/api/feishu-create-selection-pool-report', {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    cache: 'no-store',
    body: JSON.stringify(payload || {})
  });
  const raw = await response.text();
  if (looksLikeHtml(raw)) throw new Error('飞书接口返回了 HTML，请确认 Functions 路由已部署。');
  let data;
  try { data = JSON.parse(raw); } catch { throw new Error(`飞书接口返回内容不是 JSON：${firstChars(raw)}`); }
  if (!response.ok || data.ok === false) throw new Error(data.message || `飞书报告生成失败：${response.status}`);
  return data;
}

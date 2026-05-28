function firstChars(text, len = 180) {
  return String(text || "").replace(/\s+/g, " ").slice(0, len);
}

function looksLikeHtml(text) {
  const s = String(text || "").trim().toLowerCase();
  return s.startsWith("<!doctype html") || s.startsWith("<html") || s.includes("<html");
}

export async function createFeishuReport(payload) {
  const response = await fetch("/api/feishu-create-report", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    cache: "no-store",
    body: JSON.stringify(payload)
  });

  const raw = await response.text();

  if (looksLikeHtml(raw)) {
    throw new Error("飞书报告接口返回了 HTML，不是 JSON。请检查 functions 是否部署在 Cloudflare Pages 项目根目录。");
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`飞书报告接口返回内容不是 JSON：${firstChars(raw)}`);
  }

  if (!response.ok || data.ok === false) {
    throw new Error(data.message || data.hint || `飞书报告生成失败：${response.status}`);
  }

  return data;
}

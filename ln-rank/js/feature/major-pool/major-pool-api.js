function firstChars(text, len = 160) {
  return String(text || '').replace(/\s+/g, ' ').slice(0, len);
}

function looksLikeHtml(text) {
  const s = String(text || '').trim().toLowerCase();
  return s.startsWith('<!doctype html') || s.startsWith('<html') || s.includes('<html');
}

export async function fetchMajorWindow({ candidateScore, viewScore, filters }) {
  const params = new URLSearchParams({
    candidateScore: String(candidateScore),
    viewScore: String(viewScore),
    region: filters.region || "all",
    schoolKeyword: filters.schoolKeyword || "",
    majorKeyword: filters.majorKeyword || ""
  });

  const url = `/api/major-window?${params.toString()}`;
  const res = await fetch(url, { cache: "no-store" });
  const raw = await res.text();

  if (looksLikeHtml(raw)) {
    throw new Error(
      "专业数据接口返回了 HTML，不是 JSON。通常说明 functions 没有放在 Cloudflare Pages 根目录，或 /api/major-window 没有部署成功。请先打开 /api/major-window?candidateScore=520&viewScore=533 检查。"
    );
  }

  let data = null;
  try {
    data = JSON.parse(raw);
  } catch (error) {
    throw new Error(`专业数据接口返回内容不是 JSON：${firstChars(raw)}`);
  }

  if (!res.ok || !data || data.ok === false) {
    throw new Error((data && (data.message || data.hint)) || `接口读取失败：${res.status}`);
  }

  return data;
}

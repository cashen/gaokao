function firstChars(text, len = 160) {
  return String(text || '').replace(/\s+/g, ' ').slice(0, len);
}

function looksLikeHtml(text) {
  const s = String(text || '').trim().toLowerCase();
  return s.startsWith('<!doctype html') || s.startsWith('<html') || s.includes('<html');
}

export async function fetchMajorBands({ candidateScore, rangePreset, filters }) {
  const params = new URLSearchParams({
    candidateScore: String(candidateScore),
    rangePreset: rangePreset || "standard",
    region: filters.region || "all",
    schoolKeyword: filters.schoolKeyword || "",
    majorKeyword: filters.majorKeyword || ""
  });

  const res = await fetch(`/api/major-bands?${params.toString()}`, { cache: "no-store" });
  const raw = await res.text();

  if (looksLikeHtml(raw)) {
    throw new Error("专业数据接口返回了 HTML，不是 JSON。请检查 functions 目录是否在 Cloudflare Pages 项目根目录。");
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`专业数据接口返回内容不是 JSON：${firstChars(raw)}`);
  }

  if (!res.ok || data.ok === false) {
    throw new Error(data.message || data.hint || `接口读取失败：${res.status}`);
  }

  return data;
}

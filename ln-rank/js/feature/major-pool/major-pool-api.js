export async function fetchMajorWindow({ candidateScore, viewScore, filters }) {
  const params = new URLSearchParams({
    candidateScore: String(candidateScore),
    viewScore: String(viewScore),
    region: filters.region || "all",
    schoolKeyword: filters.schoolKeyword || "",
    majorKeyword: filters.majorKeyword || ""
  });
  const res = await fetch(`/api/major-window?${params.toString()}`, { cache: "no-store" });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data || data.ok === false) {
    throw new Error((data && (data.message || data.hint)) || `接口读取失败：${res.status}`);
  }
  return data;
}

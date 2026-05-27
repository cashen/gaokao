export function toInt(value, fallback = 0) {
  const n = Math.round(Number(String(value).replace(/[^0-9.\-]/g, '')));
  return Number.isFinite(n) ? n : fallback;
}
export function fmt(n) { return Number.isFinite(Number(n)) ? Number(n).toLocaleString('zh-CN') : '—'; }

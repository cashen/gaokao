export function toInt(value, fallback = null) {
  const raw = String(value ?? '').replace(/[^0-9.\-]/g, '');
  if (!raw) return fallback;
  const n = Math.round(Number(raw));
  return Number.isFinite(n) ? n : fallback;
}

export function fmt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('zh-CN') : '—';
}

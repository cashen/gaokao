export function toInt(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.round(n);
}
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
export function formatNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("zh-CN");
}
export function signed(value) {
  const n = Number(value) || 0;
  return n > 0 ? `+${n}` : String(n);
}
export function debounce(fn, delay = 300) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

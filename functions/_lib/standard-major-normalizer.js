export function normalizeMajorNameForMap(value) {
  return String(value || '')
    .trim()
    .replace(/[（(].*?[）)]/g, '')
    .replace(/【.*?】/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/（.*$/g, '')
    .replace(/\(.*$/g, '')
    .replace(/专业$/, '')
    .replace(/\s+/g, '')
    .replace(/[·•\-—_]/g, '')
    .toLowerCase();
}

export function normalizeMajorCode(value) {
  const s = String(value == null ? '' : value).trim();
  if (!s) return '';
  // 专业代码允许 K/T 后缀，全部按字符串保存，避免丢失后缀。
  return s.replace(/\s+/g, '').toUpperCase();
}

export function looksLikeStandardMajorCode(value) {
  const s = normalizeMajorCode(value);
  return /^\d{6}[A-Z]{0,2}$/.test(s);
}

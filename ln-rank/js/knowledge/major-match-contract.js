/* v3.9.33.12 专业/院校匹配运行时合同
 * 目标：院校专业背景只在“专业名明确命中”时前台显示；目录代码只增强证据；短别名不做 contains，避免外省院校误命中。
 */
import { normalizeCatalogCode } from './major-code-resolver.js?v=3949_0';

export function clean(value, max = 240) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, max);
}

export function stripMarks(value) {
  return clean(value, 300)
    .replace(/[（(].*?[）)]/g, '')
    .replace(/\s+/g, '')
    .trim();
}

export function normalizeSchoolName(value) {
  return clean(value, 160)
    .replace(/（.*?）/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/\s+/g, '')
    .trim();
}

export function normalizeMajorName(value) {
  return stripMarks(value);
}

function splitInnerMajorNames(value) {
  const text = clean(value, 500);
  const inner = [...text.matchAll(/[（(]([^（）()]+)[）)]/g)].map(m => m[1]).join('、');
  return inner.split(/[、，,;；/]/).map(normalizeMajorName).filter(Boolean);
}

export function candidateMajorNames(record = {}) {
  const names = new Set();
  const base = normalizeMajorName(record.majorName || record.major || record.rawMajorName || record.standardMajor?.name || '');
  if (base) names.add(base);
  for (const value of [record.majorName, record.major, record.rawMajorName]) {
    for (const name of splitInnerMajorNames(value)) names.add(name);
  }
  if (record.standardMajor?.name) names.add(normalizeMajorName(record.standardMajor.name));
  if (Array.isArray(record.standardMajor?.aliases)) {
    for (const alias of record.standardMajor.aliases) {
      const name = normalizeMajorName(alias);
      if (name) names.add(name);
    }
  }
  return names;
}

export function ensureCandidateNameSet(value) {
  if (value instanceof Set) return value;
  if (Array.isArray(value)) return new Set(value.map(normalizeMajorName).filter(Boolean));
  if (typeof value === 'string') {
    const name = normalizeMajorName(value);
    return name ? new Set([name]) : new Set();
  }
  return new Set();
}

export function matchSchoolByRule(rule = {}, schoolName = '') {
  const s = normalizeSchoolName(schoolName);
  if (!s) return false;
  const official = normalizeSchoolName(rule.school || '');
  if (official && (s === official || s.startsWith(official))) return true;
  const aliases = Array.isArray(rule.schoolAliases) ? rule.schoolAliases.map(normalizeSchoolName).filter(Boolean) : [];
  return aliases.some(alias => {
    if (alias.length <= 3) return s === alias;
    return s === alias || s.startsWith(alias);
  });
}

export function matchMajorEntry(entry = {}, candidateNames, catalogCode = '') {
  const names = ensureCandidateNameSet(candidateNames);
  const name = normalizeMajorName(entry.name);
  const code = normalizeCatalogCode(entry.catalogCode);
  const currentCatalogCode = normalizeCatalogCode(catalogCode);
  const nameHit = Boolean(name && names.has(name));
  const codeHit = Boolean(code && currentCatalogCode && code === currentCatalogCode);
  if (nameHit && codeHit) return { ...entry, matchBy: 'name+catalogCode', confidence: 'high' };
  if (nameHit) return { ...entry, matchBy: 'baseMajorName', confidence: 'ruleName' };
  // 目录代码只能增强证据，不能单独触发前台提示，避免招生专业代码/本科目录代码混用导致误判。
  return null;
}

export function matchMajorList(list = [], candidateNames, catalogCode = '') {
  const names = ensureCandidateNameSet(candidateNames);
  for (const entry of Array.isArray(list) ? list : []) {
    const hit = matchMajorEntry(entry, names, catalogCode);
    if (hit) return hit;
  }
  return null;
}

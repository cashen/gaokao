import { STANDARD_MAJOR_CATALOG, STANDARD_MAJOR_CATEGORIES } from './standard-major-catalog.js';
import { STANDARD_MAJOR_CATALOG_2026_FULL, STANDARD_MAJOR_CATEGORIES_2026_FULL } from './kb/standard-major-catalog-2026-full.generated.js';
import { normalizeMajorNameForMap, normalizeMajorCode, looksLikeStandardMajorCode } from './standard-major-normalizer.js';

let INDEX = null;

function buildIndex() {
  const byCode = new Map();
  const byName = new Map();
  const byAlias = new Map();
  const byCategoryName = new Map();
  for (const item of [...STANDARD_MAJOR_CATALOG, ...STANDARD_MAJOR_CATALOG_2026_FULL]) {
    const normalized = { ...item, code: normalizeMajorCode(item.code) };
    byCode.set(normalized.code, normalized);
    byName.set(normalizeMajorNameForMap(normalized.name), normalized);
    for (const alias of normalized.aliases || []) byAlias.set(normalizeMajorNameForMap(alias), normalized);
  }
  for (const cat of [...STANDARD_MAJOR_CATEGORIES, ...STANDARD_MAJOR_CATEGORIES_2026_FULL]) byCategoryName.set(normalizeMajorNameForMap(cat.name), cat);
  return { byCode, byName, byAlias, byCategoryName };
}

function getIndex() {
  if (!INDEX) INDEX = buildIndex();
  return INDEX;
}

function resultFrom(item, status, source, confidence = 100) {
  if (!item) return null;
  return {
    code: item.code || '',
    name: item.name || '',
    categoryCode: item.categoryCode || '',
    categoryName: item.categoryName || '',
    degreeCategory: item.degreeCategory || item.disciplineName || '',
    disciplineCode: item.disciplineCode || '',
    disciplineName: item.disciplineName || item.degreeCategory || '',
    catalogYear: item.catalogYear || 2025,
    isSpecial: Boolean(item.isSpecial),
    isNationalControlled: Boolean(item.isNationalControlled),
    note: item.note || '',
    catalogChange: item.oldCode ? { hasChange: true, oldCode: item.oldCode, note: item.note || '' } : { hasChange: false, oldCode: null, note: '' },
    aiBoundary: item.aiBoundary || [],
    directionId: item.directionId || '',
    directionLabel: item.directionLabel || '',
    mappingStatus: status,
    mappingSource: source,
    confidence
  };
}

function categoryResult(cat, source) {
  return {
    code: '',
    name: '',
    categoryCode: cat?.code || '',
    categoryName: cat?.name || '',
    degreeCategory: cat?.disciplineName || '',
    disciplineCode: cat?.disciplineCode || '',
    disciplineName: cat?.disciplineName || '',
    catalogYear: 2026,
    mappingStatus: 'category',
    mappingSource: source,
    confidence: 70
  };
}

export function mapStandardMajor(input = {}) {
  const idx = getIndex();
  const standardCode = normalizeMajorCode(input.standardMajorCode || input.eduMajorCode || input.professionCode || '');
  if (standardCode && looksLikeStandardMajorCode(standardCode) && idx.byCode.has(standardCode)) {
    return resultFrom(idx.byCode.get(standardCode), 'exact', 'code', 100);
  }
  const rawName = input.majorName || input.major || input.name || '';
  const key = normalizeMajorNameForMap(rawName);
  if (!key) return { code:'', name:'', categoryCode:'', categoryName:'', degreeCategory:'', mappingStatus:'unmapped', mappingSource:'empty', confidence:0 };

  if (idx.byName.has(key)) return resultFrom(idx.byName.get(key), 'exact', 'name_exact', 100);
  if (idx.byAlias.has(key)) return resultFrom(idx.byAlias.get(key), 'alias', 'alias_exact', 86);
  if (idx.byCategoryName.has(key)) return categoryResult(idx.byCategoryName.get(key), 'category_name');

  // 清洗后的招生名称可能包含“类”或方向备注，先匹配专业类，再做包含式标准名匹配。
  for (const [catKey, cat] of idx.byCategoryName.entries()) {
    if (key === catKey || key.includes(catKey)) return categoryResult(cat, 'category_contains');
  }
  let best = null;
  for (const [nameKey, item] of idx.byName.entries()) {
    if (nameKey && key.includes(nameKey)) {
      if (!best || nameKey.length > best.nameKey.length) best = { item, nameKey };
    }
  }
  if (best) return resultFrom(best.item, 'exact', 'name_contains', 92);
  for (const [aliasKey, item] of idx.byAlias.entries()) {
    if (aliasKey && key.includes(aliasKey)) {
      if (!best || aliasKey.length > best.nameKey.length) best = { item, nameKey: aliasKey, alias: true };
    }
  }
  if (best) return resultFrom(best.item, 'alias', 'alias_contains', 80);

  return { code:'', name:'', categoryCode:'', categoryName:'', degreeCategory:'', mappingStatus:'unmapped', mappingSource:'not_found', confidence:0 };
}

export function standardMajorSearchTerms(standardMajor = {}) {
  return [standardMajor.code, standardMajor.name, standardMajor.categoryCode, standardMajor.categoryName, standardMajor.degreeCategory, standardMajor.disciplineName].filter(Boolean);
}

import { STANDARD_MAJOR_CATALOG, STANDARD_MAJOR_CATEGORIES } from './standard-major-catalog.js';
import { STANDARD_MAJOR_CATALOG_2026_FULL, STANDARD_MAJOR_CATEGORIES_2026_FULL } from './kb/standard-major-catalog-2026-full.generated.js';
import { looksLikeStandardMajorCode } from './standard-major-normalizer.js';
import { createMajorCatalogResolver, normalizeMajorCode } from '../../shared/resources/majors/major-catalog-contract.js';

const RESOLVER = createMajorCatalogResolver(
  [...STANDARD_MAJOR_CATALOG, ...STANDARD_MAJOR_CATALOG_2026_FULL],
  [...STANDARD_MAJOR_CATEGORIES, ...STANDARD_MAJOR_CATEGORIES_2026_FULL]
);

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

function categoryResult(category, source, confidence = 70) {
  return {
    code: '',
    name: '',
    categoryCode: category?.code || '',
    categoryName: category?.name || '',
    degreeCategory: category?.disciplineName || '',
    disciplineCode: category?.disciplineCode || '',
    disciplineName: category?.disciplineName || '',
    catalogYear: 2026,
    mappingStatus: 'category',
    mappingSource: source,
    confidence
  };
}

export function mapStandardMajor(input = {}) {
  const standardCode = normalizeMajorCode(input.standardMajorCode || input.eduMajorCode || input.professionCode || '');
  if (standardCode && looksLikeStandardMajorCode(standardCode)) {
    const item = RESOLVER.findByCode(standardCode);
    if (item) return resultFrom(item, 'exact', 'code', 100);
  }

  const rawName = input.majorName || input.major || input.name || '';
  const resolved = RESOLVER.resolve(rawName);
  if (!resolved) return { code:'', name:'', categoryCode:'', categoryName:'', degreeCategory:'', mappingStatus:'unmapped', mappingSource:'not_found', confidence:0 };
  if (resolved.kind === 'category') return categoryResult(resolved.item, resolved.matchType, resolved.confidence);
  const aliasLike = /alias/.test(resolved.matchType);
  return resultFrom(
    resolved.item,
    aliasLike ? 'alias' : 'exact',
    resolved.matchType,
    resolved.confidence
  );
}

export function standardMajorSearchTerms(standardMajor = {}) {
  return [
    standardMajor.code,
    standardMajor.name,
    standardMajor.categoryCode,
    standardMajor.categoryName,
    standardMajor.degreeCategory,
    standardMajor.disciplineName
  ].filter(Boolean);
}

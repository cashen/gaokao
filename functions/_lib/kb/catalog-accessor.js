import {
  STANDARD_MAJOR_CATALOG_2026_FULL,
  STANDARD_MAJOR_CATALOG_2026_FULL_META,
  STANDARD_MAJOR_CATEGORIES_2026_FULL
} from './standard-major-catalog-2026-full.generated.js';
import { STANDARD_MAJOR_CATALOG_BRIDGE } from './standard-major-catalog-bridge.generated.js';
import { createMajorCatalogResolver } from '../../../shared/resources/majors/major-catalog-contract.js';

const RESOLVER = createMajorCatalogResolver(STANDARD_MAJOR_CATALOG_2026_FULL, STANDARD_MAJOR_CATEGORIES_2026_FULL);

export function getCatalogStats() {
  return {
    entries: RESOLVER.count,
    disciplineCount: STANDARD_MAJOR_CATALOG_2026_FULL_META?.disciplineCount || 0,
    categoryCount: RESOLVER.categoryCount || STANDARD_MAJOR_CATALOG_2026_FULL_META?.categoryCount || 0,
    majorCount: STANDARD_MAJOR_CATALOG_2026_FULL_META?.majorCount || RESOLVER.count,
    resolverVersion: RESOLVER.contract.version,
    bridgeRule: STANDARD_MAJOR_CATALOG_BRIDGE?.rule || '2026目录只用于专业代码、专业类和复核提醒，不覆盖2024/2025历史录取数据。'
  };
}

export function resolveCatalogEntity(value = '', options = {}) {
  return RESOLVER.resolve(value, options);
}

export function findCatalogMajorExact(value = '') {
  const resolved = RESOLVER.resolve(value, { allowContains: false });
  return resolved?.kind === 'major' ? resolved.item : null;
}

export function findCatalogMajorByNameOrCode(value = '') {
  const resolved = RESOLVER.resolve(value);
  return resolved?.kind === 'major' ? resolved.item : null;
}

export function buildCatalogReviewPoint(standardMajor = {}, historyMajorName = '') {
  const major = standardMajor?.code
    ? findCatalogMajorByNameOrCode(standardMajor.code)
    : findCatalogMajorByNameOrCode(standardMajor?.name || historyMajorName);
  if (!major) return '';
  if (major.disciplineCode === '14' || major.disciplineName === '交叉学科') {
    return '按2026本科专业目录，该方向属于交叉学科或新调整方向；正式填报需核验当年招生计划、培养学院、课程设置和就业路径。';
  }
  if (major.oldCode) {
    return `按2026本科专业目录，该专业涉及原专业代码迁移（原${major.oldCode}），正式填报以当年招生计划专业名称和代码为准。`;
  }
  if (major.categoryName) {
    return `按2026本科专业目录，该专业属于${major.categoryName}；正式填报仍以当年招生计划和志愿系统为准。`;
  }
  return '';
}

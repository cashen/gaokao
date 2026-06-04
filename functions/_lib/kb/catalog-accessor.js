import { STANDARD_MAJOR_CATALOG_2026_FULL, STANDARD_MAJOR_CATALOG_2026_FULL_META, findStandardMajor2026ByName, findStandardMajor2026ByCode } from './standard-major-catalog-2026-full.generated.js';
import { STANDARD_MAJOR_CATALOG_BRIDGE } from './standard-major-catalog-bridge.generated.js';

function normalize(v='') { return String(v || '').replace(/（.*?）|\(.*?\)/g, '').trim(); }

export function getCatalogStats() {
  const entries = Array.isArray(STANDARD_MAJOR_CATALOG_2026_FULL) ? STANDARD_MAJOR_CATALOG_2026_FULL : [];
  return {
    entries: entries.length,
    disciplineCount: STANDARD_MAJOR_CATALOG_2026_FULL_META?.disciplineCount || 0,
    categoryCount: STANDARD_MAJOR_CATALOG_2026_FULL_META?.categoryCount || 0,
    majorCount: STANDARD_MAJOR_CATALOG_2026_FULL_META?.majorCount || entries.length,
    bridgeRule: STANDARD_MAJOR_CATALOG_BRIDGE?.rule || '2026目录只用于专业代码、专业类和复核提醒，不覆盖2024/2025历史录取数据。'
  };
}

export function findCatalogMajorByNameOrCode(value='') {
  const s = String(value || '').trim();
  if (!s) return null;
  return findStandardMajor2026ByCode(s) || findStandardMajor2026ByName(s) || findStandardMajor2026ByName(normalize(s));
}

export function buildCatalogReviewPoint(standardMajor = {}, historyMajorName = '') {
  const major = standardMajor?.code ? findCatalogMajorByNameOrCode(standardMajor.code) : findCatalogMajorByNameOrCode(standardMajor?.name || historyMajorName);
  if (!major) return '';
  if (major.disciplineCode === '14' || major.disciplineName === '交叉学科') {
    return `按2026本科专业目录，该方向属于交叉学科或新调整方向；正式填报需核验当年招生计划、培养学院、课程设置和就业路径。`;
  }
  if (major.oldCode) {
    return `按2026本科专业目录，该专业涉及原专业代码迁移（原${major.oldCode}），正式填报以当年招生计划专业名称和代码为准。`;
  }
  if (major.categoryName) {
    return `按2026本科专业目录，该专业属于${major.categoryName}；正式填报仍以当年招生计划和志愿系统为准。`;
  }
  return '';
}

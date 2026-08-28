import { YEAR_CALIBER_KB } from './year-caliber-kb.generated.js';

export function getYearCaliber() {
  const lines = YEAR_CALIBER_KB?.lines || {};
  return {
    province: YEAR_CALIBER_KB?.province || '辽宁',
    subject: YEAR_CALIBER_KB?.subject || '物理类',
    activeDataYear: YEAR_CALIBER_KB?.activeDataYear || 2025,
    catalogYear: YEAR_CALIBER_KB?.catalogYear || 2026,
    undergraduateLine: Number(lines.undergraduateLine) || 367,
    specialControlLine: Number(lines.specialControlLine) || 515,
    reportCopy: YEAR_CALIBER_KB?.reportCopy || '基于2025年数据生成，用于家庭讨论和人工复核；正式填报以当年一分一段、招生计划和志愿系统为准。',
    pageCopy: YEAR_CALIBER_KB?.pageCopy || '当前基于辽宁2025年物理类历史数据进行初选参考。'
  };
}

export function formatYearBoundaryLine() {
  return getYearCaliber().reportCopy;
}

export function isPublicBottomLineVisibleByYearCaliber(score) {
  const n = Number(score);
  const c = getYearCaliber();
  return Number.isFinite(n) && n >= c.undergraduateLine && n <= c.specialControlLine;
}

const CONFIGS = Object.freeze({
  2025: Object.freeze({
    version: 'ln-physics-2025-v1',
    audienceYear: 2026,
    year: 2025,
    dataYear: 2025,
    region: 'ln',
    subject: 'physics',
    provinceName: '辽宁',
    subjectName: '物理类',
    specialControlScore: 515,
    undergraduateControlScore: 367,
    vocationalControlScore: 150,
    maxScore: 750,
    rankYear: 2025,
    admissionBaseYear: 2025,
    rankTablePath: 'functions/_lib/ln-2025-physics-score-rank.js',
    note: '辽宁2025物理类历史数据配置，仅用于历史对照和回退。'
  }),
  2026: Object.freeze({
    version: 'v3.9.55.0-shared-resource-center',
    audienceYear: 2027,
    year: 2026,
    dataYear: 2026,
    region: 'ln',
    subject: 'physics',
    provinceName: '辽宁',
    subjectName: '物理类',
    specialControlScore: 508,
    undergraduateControlScore: 344,
    vocationalControlScore: 150,
    maxScore: 750,
    rankYear: 2026,
    admissionBaseYear: 2026,
    rankTablePath: 'functions/_lib/ln-2026-physics-score-rank.js',
    note: '面向2027备考家庭；以辽宁2026普通类本科批物理类专业投档记录和2026一分一段为主要历史参考，2025、2024用于同口径对照。'
  })
});

export const DEFAULT_LIAONING_PHYSICS_YEAR = 2026;
export const LIAONING_PHYSICS_CONFIGS = CONFIGS;
export const LIAONING_PHYSICS_EXAM_CONFIG = CONFIGS[DEFAULT_LIAONING_PHYSICS_YEAR];

function normalizeRegion(value) {
  return String(value || 'ln').trim().toLowerCase();
}

function normalizeSubject(value) {
  return String(value || 'physics').trim().toLowerCase();
}

export function isLiaoningPhysics(region, subject) {
  const normalizedRegion = normalizeRegion(region);
  const normalizedSubject = normalizeSubject(subject);
  return ['ln', 'liaoning', '辽宁'].includes(normalizedRegion)
    && ['physics', '物理', '物理类', 'physical'].includes(normalizedSubject);
}

export function getLiaoningPhysicsConfig(year = DEFAULT_LIAONING_PHYSICS_YEAR) {
  const normalizedYear = Number(year || DEFAULT_LIAONING_PHYSICS_YEAR);
  return CONFIGS[normalizedYear] || null;
}

export function getExamResourceConfig(input = {}) {
  const year = Number(input.year || input.rankYear || input.dataYear || DEFAULT_LIAONING_PHYSICS_YEAR);
  const base = getLiaoningPhysicsConfig(year) || LIAONING_PHYSICS_EXAM_CONFIG;
  const region = input.region || base.region;
  const subject = input.subject || base.subject;
  if (isLiaoningPhysics(region, subject) && CONFIGS[year]) {
    return { ...base, region, subject, supported: true };
  }
  return {
    ...base,
    year,
    dataYear: year,
    rankYear: year,
    region,
    subject,
    supported: false,
    note: '当前只内置辽宁物理类2025、2026一分一段；其他年份或科类需要先补充官方数据。'
  };
}

export function isPublicBottomLineVisible(score, config = LIAONING_PHYSICS_EXAM_CONFIG) {
  const n = Number(score);
  return Number.isFinite(n)
    && n >= Number(config.undergraduateControlScore)
    && n <= Number(config.specialControlScore);
}

export function validateExamScore(score, config = LIAONING_PHYSICS_EXAM_CONFIG) {
  const raw = score == null ? '' : String(score).trim();
  const value = Number(raw);
  if (!raw || !Number.isFinite(value) || value <= 0) return { key: 'empty', valid: false, value: null };
  if (value > Number(config.maxScore || 750)) return { key: 'invalidHigh', valid: false, value };
  if (value < Number(config.vocationalControlScore)) return { key: 'belowVocational', valid: false, value };
  if (value < Number(config.undergraduateControlScore)) return { key: 'belowUndergraduate', valid: false, value };
  if (value < Number(config.specialControlScore)) return { key: 'underSpecial', valid: true, value };
  return { key: value >= 700 ? 'topRange' : 'normal', valid: true, value };
}

const COMMON = Object.freeze({
  region: 'ln',
  subject: 'physics',
  provinceName: '辽宁',
  subjectName: '物理类',
  vocationalControlScore: 150,
  maxScore: 750,
  comparisonPopulationPolicy: 'undergraduate-control-line-cumulative',
  rankingPolicy: '同分位次区间用于展示；同分末位累计人数用于算法比较。'
});

const CONFIGS = Object.freeze({
  2024: Object.freeze({
    ...COMMON,
    version: 'ln-physics-2024-authoritative-v3966_0',
    audienceYear: 2025,
    year: 2024,
    dataYear: 2024,
    specialControlScore: 510,
    undergraduateControlScore: 368,
    rankYear: 2024,
    admissionBaseYear: 2024,
    rankTablePath: 'functions/_lib/ln-2024-physics-score-rank.js',
    sourceName: '2024年辽宁省普通高校招生考试成绩统计表（物理学科类）',
    sourcePage: 'https://jyt.ln.gov.cn/jyt/jyzx/jyyw/2024062510394164694/index.shtml',
    note: '辽宁2024物理类官方历史数据配置，仅用于严格同口径历史对照。'
  }),
  2025: Object.freeze({
    ...COMMON,
    version: 'ln-physics-2025-authoritative-v3966_0',
    audienceYear: 2026,
    year: 2025,
    dataYear: 2025,
    specialControlScore: 515,
    undergraduateControlScore: 367,
    rankYear: 2025,
    admissionBaseYear: 2025,
    rankTablePath: 'functions/_lib/ln-2025-physics-score-rank.js',
    sourceName: '2025年辽宁省普通高校招生考试成绩统计表（物理学科类）',
    note: '辽宁2025物理类官方历史数据配置，仅用于严格同口径历史对照。'
  }),
  2026: Object.freeze({
    ...COMMON,
    version: 'ln-physics-three-year-resource-v3966_0',
    audienceYear: 2027,
    year: 2026,
    dataYear: 2026,
    specialControlScore: 508,
    undergraduateControlScore: 344,
    rankYear: 2026,
    admissionBaseYear: 2026,
    rankTablePath: 'functions/_lib/ln-2026-physics-score-rank.js',
    sourceName: '辽宁省2026年普通高校招生考试成绩统计表（物理学科类）',
    note: '面向2027备考家庭；以辽宁2026普通类本科批物理类专业投档记录为主参考，2025、2024用于严格同口径历史对照。'
  })
});

export const DEFAULT_LIAONING_PHYSICS_YEAR = 2026;
export const SUPPORTED_LIAONING_PHYSICS_YEARS = Object.freeze([2024, 2025, 2026]);
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
    note: '当前统一内置辽宁物理类2024、2025、2026一分一段；其他年份或科类需要先补充官方数据。'
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

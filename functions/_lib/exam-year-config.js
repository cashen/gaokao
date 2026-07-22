const CONFIGS = {
  2025: {
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
    rankYear: 2025,
    admissionBaseYear: 2025,
    rankTablePath: 'functions/_lib/ln-2025-physics-score-rank.js',
    note: '辽宁 2025 物理类历史数据配置，仅用于历史对照和回退。'
  },
  2026: {
    version: 'v3.9.51.0',
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
    rankYear: 2026,
    admissionBaseYear: 2026,
    rankTablePath: 'functions/_lib/ln-2026-physics-score-rank.js',
    note: '面向 2027 备考家庭；以辽宁 2026 普通类本科批物理类专业投档记录和 2026 一分一段为主要历史参考，2025、2024 用于同口径对照。'
  }
};

export const LN_PHYSICS_EXAM_CONFIG = { ...CONFIGS[2026] };

function normalizeRegion(value) {
  return String(value || 'ln').trim().toLowerCase();
}

function normalizeSubject(value) {
  return String(value || 'physics').trim().toLowerCase();
}

function isLiaoningPhysics(region, subject) {
  return ['ln', 'liaoning', '辽宁'].includes(region)
    && ['physics', '物理', '物理类', 'physical'].includes(subject);
}

export function getExamYearConfig(input = {}) {
  const year = Number(input.year || input.rankYear || input.dataYear || 2026);
  const region = normalizeRegion(input.region);
  const subject = normalizeSubject(input.subject);
  if (isLiaoningPhysics(region, subject) && CONFIGS[year]) {
    return { ...CONFIGS[year], region: input.region || CONFIGS[year].region, subject: input.subject || CONFIGS[year].subject };
  }
  return {
    ...CONFIGS[2026],
    year,
    dataYear: year,
    rankYear: year,
    region: input.region || region,
    subject: input.subject || subject,
    supported: false,
    note: '当前只内置辽宁物理类 2025、2026 一分一段；其他年份或科类需要先补充官方数据。'
  };
}

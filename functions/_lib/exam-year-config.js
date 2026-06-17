export const LN_PHYSICS_EXAM_CONFIG = {
  version: 'v3.9.5.6',
  year: 2025,
  region: 'ln',
  subject: 'physics',
  provinceName: '辽宁',
  subjectName: '物理类',
  specialControlScore: 515,
  undergraduateControlScore: null,
  rankYear: 2025,
  admissionBaseYear: 2025,
  rankTablePath: 'functions/_lib/ln-2025-physics-score-rank.js',
  note: '当前版本以辽宁2025物理类一分一段表作为演示和历史参照；2026发布后，在后台更新特控线与一分一段即可重算位次功能区。'
};

export function getExamYearConfig(input = {}) {
  const year = Number(input.year || input.rankYear || input.dataYear || LN_PHYSICS_EXAM_CONFIG.year);
  const region = String(input.region || LN_PHYSICS_EXAM_CONFIG.region).trim().toLowerCase();
  const subject = String(input.subject || LN_PHYSICS_EXAM_CONFIG.subject).trim().toLowerCase();
  if (year === 2025 && ['ln', 'liaoning', '辽宁'].includes(region) && ['physics', '物理', '物理类'].includes(subject)) {
    return { ...LN_PHYSICS_EXAM_CONFIG };
  }
  return {
    ...LN_PHYSICS_EXAM_CONFIG,
    year,
    region: input.region || region,
    subject: input.subject || subject,
    note: '当前只内置辽宁2025物理类一分一段；其他年份或科类需要先在后台补充特控线和一分一段表。'
  };
}

export const LN_PHYSICS_EXAM_CONFIG = {
  version: 'v3.9.51.0', audienceYear: 2027, year: 2026, dataYear: 2026,
  region: 'ln', subject: 'physics', provinceName: '辽宁', subjectName: '物理类',
  specialControlScore: 508, undergraduateControlScore: 344, vocationalControlScore: 150,
  rankYear: 2026, admissionBaseYear: 2026,
  rankTablePath: 'functions/_lib/ln-2026-physics-score-rank.js',
  note: '面向2027备考家庭；以辽宁2026普通类本科批物理类专业投档记录和2026一分一段为主要历史参考，2025、2024用于同口径对照。'
};
export function getExamYearConfig(input = {}) {
  const year = Number(input.year || input.rankYear || input.dataYear || LN_PHYSICS_EXAM_CONFIG.year);
  const region = String(input.region || LN_PHYSICS_EXAM_CONFIG.region).trim().toLowerCase();
  const subject = String(input.subject || LN_PHYSICS_EXAM_CONFIG.subject).trim().toLowerCase();
  const supported = [2025,2026].includes(year) && ['ln','liaoning','辽宁'].includes(region) && ['physics','物理','物理类','physical'].includes(subject);
  return {...LN_PHYSICS_EXAM_CONFIG, year, dataYear:year, rankYear:year, region:input.region||region, subject:input.subject||subject,
    note: supported ? LN_PHYSICS_EXAM_CONFIG.note : '当前只内置辽宁物理类2025、2026一分一段；其他年份或科类需要补充官方数据。'};
}

import {
  LIAONING_PHYSICS_EXAM_CONFIG,
  getLiaoningPhysicsConfig
} from '../../../../shared/resources/exam/liaoning-physics.js?v=3955_0';

export function toScore(value) {
  const n = Number(String(value == null ? '' : value).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

function toRank(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

export function buildCandidateContext(scoreLike, opts = {}) {
  const score = toScore(scoreLike);
  const year = Number(opts.year || opts.dataYear || LIAONING_PHYSICS_EXAM_CONFIG.dataYear);
  const yearConfig = getLiaoningPhysicsConfig(year) || LIAONING_PHYSICS_EXAM_CONFIG;
  const audienceYear = Number(opts.audienceYear || yearConfig.audienceYear);
  const region = opts.region || yearConfig.region;
  const subject = opts.subject || yearConfig.subject;
  const rank = toRank(opts.rank ?? opts.rankEnd ?? opts.candidateReferenceRank2026);
  const rankStart = toRank(opts.rankStart ?? opts.candidateReferenceRankStart2026);
  const rankEnd = toRank(opts.rankEnd ?? opts.candidateReferenceRankEnd2026) || rank;
  const sameCount = Number.isFinite(Number(opts.sameCount)) ? Math.max(0, Math.round(Number(opts.sameCount))) : null;
  const signature = score
    ? `${year}-${region}-${subject}-reference-score-${score}${rankEnd ? `-rank-${rankEnd}` : ''}`
    : `${year}-${region}-${subject}-reference-score-missing`;

  return {
    audienceYear,
    year,
    dataYear: year,
    rankYear: Number(opts.rankYear || yearConfig.rankYear || year),
    region,
    subject,
    score,
    rank: rankEnd,
    rankStart,
    rankEnd,
    sameCount,
    specialControlScore: Number(opts.specialControlScore ?? yearConfig.specialControlScore),
    undergraduateControlScore: Number(opts.undergraduateControlScore ?? yearConfig.undergraduateControlScore),
    vocationalControlScore: Number(opts.vocationalControlScore ?? yearConfig.vocationalControlScore),
    rankTableVersion: opts.rankTableVersion || `${year}-${region}-${subject}-official-v1`,
    signature,
    source: 'selection-pool-reference-input',
    note: score
      ? `当前计算口径：参考分数 ${score} 分，按辽宁 ${year} 物理类历史数据重新计算分差和分段。${rankEnd ? `按 ${year} 一分一段对应累计位置约 ${rankEnd.toLocaleString('zh-CN')} 位。` : '位次信息待从查询结果同步。'}这不是 ${audienceYear} 年实际位次。`
      : '当前计算口径：参考分数待填写。请先填写模考或预估分数，再进行排序、方案解读或飞书报告。'
  };
}

export function buildComputedSignature(candidateContext, orderSignature = '') {
  return `${candidateContext?.signature || 'missing-candidate'}|order:${orderSignature || ''}`;
}

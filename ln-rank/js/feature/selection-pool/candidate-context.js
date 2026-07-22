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
  const year = Number(opts.year || opts.dataYear || 2026);
  const audienceYear = Number(opts.audienceYear || 2027);
  const region = opts.region || 'ln';
  const subject = opts.subject || 'physics';
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
    rankYear: year,
    region,
    subject,
    score,
    rank: rankEnd,
    rankStart,
    rankEnd,
    sameCount,
    specialControlScore: Number(opts.specialControlScore || 508),
    undergraduateControlScore: Number(opts.undergraduateControlScore || 344),
    vocationalControlScore: Number(opts.vocationalControlScore || 150),
    rankTableVersion: opts.rankTableVersion || '2026-ln-physics-official-v1',
    signature,
    source: 'selection-pool-reference-input',
    note: score
      ? `当前计算口径：参考分数 ${score} 分，按辽宁 2026 物理类历史数据重新计算分差和分段。${rankEnd ? `按 2026 一分一段对应累计位置约 ${rankEnd.toLocaleString('zh-CN')} 位。` : '位次信息待从查询结果同步。'}这不是 2027 年实际位次。`
      : '当前计算口径：参考分数待填写。请先填写模考或预估分数，再进行排序、方案解读或飞书报告。'
  };
}

export function buildComputedSignature(candidateContext, orderSignature = '') {
  return `${candidateContext?.signature || 'missing-candidate'}|order:${orderSignature || ''}`;
}

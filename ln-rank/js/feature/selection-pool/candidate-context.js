export function toScore(value) {
  const n = Number(String(value == null ? '' : value).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

export function buildCandidateContext(scoreLike, opts = {}) {
  const score = toScore(scoreLike);
  const year = opts.year || 2025;
  const region = opts.region || 'ln';
  const subject = opts.subject || 'physics';
  const rank = Number.isFinite(Number(opts.rank)) ? Math.round(Number(opts.rank)) : null;
  const signature = score
    ? `${year}-${region}-${subject}-score-${score}${rank ? `-rank-${rank}` : ''}`
    : `${year}-${region}-${subject}-score-missing`;
  return {
    year,
    region,
    subject,
    score,
    rank,
    specialControlScore: opts.specialControlScore || 515,
    undergraduateControlScore: opts.undergraduateControlScore || 367,
    rankTableVersion: opts.rankTableVersion || '2025-ln-physics-v1',
    signature,
    source: 'selection-pool-current-input',
    note: score
      ? `当前计算口径：${year} 辽宁物理类 · 考生 ${score} 分。自选池相对分差、冲稳保标签、AI诊断和飞书报告均应按此成绩重新计算。`
      : `当前计算口径：考生分数待填写。请先填写分数，再进行排序、AI诊断或飞书报告。`
  };
}

export function buildComputedSignature(candidateContext, orderSignature = '') {
  return `${candidateContext?.signature || 'missing-candidate'}|order:${orderSignature || ''}`;
}

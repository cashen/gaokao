import { getExamYearConfig } from './exam-year-config.js';
import { getRankTableRows, lookupScoreRank } from './rank-table-provider.js';
import { getRankZonePolicy } from './rank-zone-policy.js';

function toNumber(value, fallback = null) {
  const n = Number(String(value == null ? '' : value).replace(/[,，\s名位分]/g, ''));
  return Number.isFinite(n) ? n : fallback;
}

function fmt(value) {
  const n = toNumber(value, null);
  return n == null ? '—' : Math.round(n).toLocaleString('zh-CN');
}

function sumSameCount(rows, minScore, maxScore) {
  const min = Math.min(minScore, maxScore);
  const max = Math.max(minScore, maxScore);
  return rows.reduce((sum, row) => row.score >= min && row.score <= max ? sum + Number(row.sameCount || 0) : sum, 0);
}

function densityOf({ score, year, region, subject }) {
  const s = toNumber(score, null);
  const rows = getRankTableRows({ year, region, subject });
  if (s == null || !rows.length) return { sameCount: null, up5Count: null, down5Count: null, up10Count: null, down10Count: null };
  const current = lookupScoreRank({ year, region, subject, score: s });
  return {
    sameCount: current?.sameCount ?? null,
    up5Count: sumSameCount(rows, s + 1, s + 5),
    down5Count: sumSameCount(rows, s - 5, s - 1),
    up10Count: sumSameCount(rows, s + 1, s + 10),
    down10Count: sumSameCount(rows, s - 10, s - 1)
  };
}

function decideZone({ candidateRank, specialRank, scoreOffsetFromSpecial }) {
  if (candidateRank == null || specialRank == null || scoreOffsetFromSpecial == null) return 'missing-rank-zone';
  const rankOffsetFromSpecial = candidateRank - specialRank; // 负数表示优于特控线位次。
  if (scoreOffsetFromSpecial <= 15 || rankOffsetFromSpecial >= -7600) return 'special-edge-zone';
  if (scoreOffsetFromSpecial <= 35 || rankOffsetFromSpecial >= -18000) return 'applied-tech-main-zone';
  if (scoreOffsetFromSpecial <= 55 || rankOffsetFromSpecial >= -26000) return 'industry-entry-zone';
  if (scoreOffsetFromSpecial <= 75 || rankOffsetFromSpecial >= -34500) return 'industry-platform-zone';
  return 'platform-major-balance-zone';
}

function contextNote(ctx) {
  if (!ctx.candidateRank) return '考生位次待核验，暂无法判断特控线锚点功能区。';
  const direction = ctx.scoreOffsetFromSpecial >= 0 ? `高出特控线 ${fmt(ctx.scoreOffsetFromSpecial)} 分` : `低于特控线 ${fmt(Math.abs(ctx.scoreOffsetFromSpecial))} 分`;
  const rankDirection = ctx.rankOffsetFromSpecial < 0
    ? `优于特控线约 ${fmt(Math.abs(ctx.rankOffsetFromSpecial))} 名`
    : `落后特控线约 ${fmt(ctx.rankOffsetFromSpecial)} 名`;
  return `按${ctx.config.year}辽宁物理类口径，考生${direction}，位次${rankDirection}；分数只作展示，方案诊断以位次、密度和自选专业结构为主。`;
}

export function buildRankZoneContext(input = {}) {
  const config = getExamYearConfig(input);
  const candidateScore = toNumber(input.candidateScore, null);
  const candidateRow = lookupScoreRank({ year: config.rankYear, region: config.region, subject: config.subject, score: candidateScore });
  const specialRow = lookupScoreRank({ year: config.rankYear, region: config.region, subject: config.subject, score: config.specialControlScore });
  const candidateRank = candidateRow ? Math.round(candidateRow.rankForGap) : null;
  const specialControlRank = specialRow ? Math.round(specialRow.rankForGap) : null;
  const scoreOffsetFromSpecial = candidateScore == null || config.specialControlScore == null ? null : Math.round(candidateScore - config.specialControlScore);
  const rankOffsetFromSpecial = candidateRank == null || specialControlRank == null ? null : Math.round(candidateRank - specialControlRank);
  const zoneKey = decideZone({ candidateRank, specialRank: specialControlRank, scoreOffsetFromSpecial });
  const policy = getRankZonePolicy(zoneKey);
  const density = densityOf({ score: candidateScore, year: config.rankYear, region: config.region, subject: config.subject });
  const ctx = {
    version: 'v3.9.5.5',
    config,
    candidateScore,
    candidateRank,
    candidateRankStart: candidateRow?.rankStart ?? null,
    candidateRankEnd: candidateRow?.rankEnd ?? null,
    candidateSameCount: candidateRow?.sameCount ?? null,
    candidateRankLabel: candidateRow ? (candidateRow.rankStart === candidateRow.rankEnd ? `位次 ${fmt(candidateRow.rankEnd)}` : `位次 ${fmt(candidateRow.rankStart)}–${fmt(candidateRow.rankEnd)}`) : '位次待核验',
    specialControlScore: config.specialControlScore,
    specialControlRank,
    specialControlRankLabel: specialRow ? `位次 ${fmt(specialRow.rankStart)}–${fmt(specialRow.rankEnd)}` : '位次待核验',
    scoreOffsetFromSpecial,
    rankOffsetFromSpecial,
    density,
    zoneKey,
    zoneName: policy.zoneName,
    zoneRole: policy.role,
    policySnapshot: policy,
    note: ''
  };
  ctx.note = contextNote(ctx);
  return ctx;
}

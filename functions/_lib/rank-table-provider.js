import {
  findLn2024PhysicsScoreByRank,
  getLn2024PhysicsRankRows,
  lookupLn2024PhysicsRank,
  LN_2024_PHYSICS_SCORE_RANK_META
} from './ln-2024-physics-score-rank.js';
import {
  findLn2025PhysicsScoreByRank,
  getLn2025PhysicsRankRows,
  lookupLn2025PhysicsRank,
  LN_2025_PHYSICS_SCORE_RANK_META
} from './ln-2025-physics-score-rank.js';
import {
  getLn2026PhysicsRows,
  lookupLn2026PhysicsRank,
  lookupLn2026PhysicsScore,
  LN_2026_PHYSICS_SCORE_RANK_META
} from './ln-2026-physics-score-rank.js';

export const SUPPORTED_LIAONING_PHYSICS_RANK_YEARS = Object.freeze([2024, 2025, 2026]);

const PROVIDERS = Object.freeze({
  2024: Object.freeze({ score: lookupLn2024PhysicsRank, rank: findLn2024PhysicsScoreByRank, rows: getLn2024PhysicsRankRows, meta: LN_2024_PHYSICS_SCORE_RANK_META }),
  2025: Object.freeze({ score: lookupLn2025PhysicsRank, rank: findLn2025PhysicsScoreByRank, rows: getLn2025PhysicsRankRows, meta: LN_2025_PHYSICS_SCORE_RANK_META }),
  2026: Object.freeze({ score: lookupLn2026PhysicsScore, rank: lookupLn2026PhysicsRank, rows: getLn2026PhysicsRows, meta: LN_2026_PHYSICS_SCORE_RANK_META })
});

function norm(value) {
  return String(value == null ? '' : value).trim().toLowerCase();
}

function isLnPhysics(region, subject) {
  return ['ln', 'liaoning', '辽宁'].includes(norm(region || 'ln'))
    && ['physics', '物理', '物理类', 'physical'].includes(norm(subject || 'physics'));
}

function provider(year, region, subject) {
  if (!isLnPhysics(region, subject)) return null;
  return PROVIDERS[Number(year)] || null;
}

function normalizeRow(row = {}) {
  const score = Number(row.score);
  const sameCount = Number(row.sameCount ?? 0);
  const cumulative = Number(row.cumulative ?? row.rankEnd ?? row.rankForGap);
  const previousCumulative = Number.isFinite(Number(row.previousCumulative))
    ? Number(row.previousCumulative)
    : Math.max(0, cumulative - sameCount);
  const rankStart = Number.isFinite(Number(row.rankStart))
    ? Number(row.rankStart)
    : (sameCount ? previousCumulative + 1 : cumulative);
  const rankEnd = Number.isFinite(Number(row.rankEnd)) ? Number(row.rankEnd) : cumulative;
  return {
    ...row,
    score,
    sameCount,
    previousCumulative,
    cumulative,
    rankStart,
    rankEnd,
    rankForGap: Number.isFinite(Number(row.rankForGap)) ? Number(row.rankForGap) : rankEnd
  };
}

export function lookupScoreRank({ year = 2026, region = 'ln', subject = 'physics', score } = {}) {
  const row = provider(year, region, subject)?.score(score) || null;
  return row ? normalizeRow(row) : null;
}

export function getRankTableMeta({ year = 2026, region = 'ln', subject = 'physics' } = {}) {
  const selected = provider(year, region, subject);
  return selected?.meta ? { ...selected.meta } : null;
}

export function getRankTableRows({ year = 2026, region = 'ln', subject = 'physics' } = {}) {
  const rows = provider(year, region, subject)?.rows?.();
  return Array.isArray(rows) ? rows.map(normalizeRow) : [];
}

export function findEquivalentScoreByRank({ targetYear = 2026, region = 'ln', subject = 'physics', rank } = {}) {
  const row = provider(targetYear, region, subject)?.rank(rank) || null;
  return row ? normalizeRow(row) : null;
}

export function validateScoreRank({ year = 2026, region = 'ln', subject = 'physics', score, rank } = {}) {
  const row = lookupScoreRank({ year, region, subject, score });
  const suppliedRank = Number(rank);
  if (!row) return { ok: false, status: 'rank-table-unavailable', year: Number(year), score: Number(score), suppliedRank: Number.isFinite(suppliedRank) ? suppliedRank : null, row: null };
  const rankStart = Number(row.rankStart);
  const rankEnd = Number(row.rankEnd);
  if (!Number.isFinite(suppliedRank)) return { ok: true, status: 'derived', year: Number(year), score: Number(score), suppliedRank: null, row };
  if (Number.isFinite(rankEnd) && suppliedRank === rankEnd) return { ok: true, status: 'matched', year: Number(year), score: Number(score), suppliedRank, row };
  if (Number.isFinite(rankStart) && Number.isFinite(rankEnd) && suppliedRank >= rankStart && suppliedRank <= rankEnd) return { ok: true, status: 'within-score-range', year: Number(year), score: Number(score), suppliedRank, row };
  return { ok: false, status: 'conflict', year: Number(year), score: Number(score), suppliedRank, row };
}

export function describeEquivalentRankRoadmap({ sourceYear = 2026, targetYear = 2025, region = 'ln', subject = 'physics' } = {}) {
  const sourceReady = Boolean(getRankTableMeta({ year: sourceYear, region, subject }));
  const targetReady = Boolean(getRankTableMeta({ year: targetYear, region, subject }));
  return {
    sourceYear: Number(sourceYear),
    targetYear: Number(targetYear),
    region,
    subject,
    sourceReady,
    targetReady,
    enabled: sourceReady && targetReady,
    note: sourceReady && targetReady
      ? '可按对应年度官方一分一段进行跨年等位参考；结果仍需结合当年招生计划。'
      : '对应年份一分一段尚未接入。'
  };
}

export function getRankPopulation({ year = 2026, region = 'ln', subject = 'physics', policy = 'table-total', controlScore = null } = {}) {
  const rows = getRankTableRows({ year, region, subject });
  if (!rows.length) return null;
  if (policy === 'undergraduate-control-line-cumulative') {
    const score = Number(controlScore);
    if (!Number.isFinite(score)) return null;
    return lookupScoreRank({ year, region, subject, score })?.rankEnd ?? null;
  }
  const meta = getRankTableMeta({ year, region, subject }) || {};
  const metaTotal = Number(meta.totalAt150 ?? meta.total ?? meta.totalCount);
  if (Number.isFinite(metaTotal) && metaTotal > 0) return Math.round(metaTotal);
  const totals = rows.map(row => Number(row.rankEnd ?? row.cumulative)).filter(Number.isFinite);
  return totals.length ? Math.max(...totals) : null;
}

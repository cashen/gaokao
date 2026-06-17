import {
  findLn2025PhysicsScoreByRank,
  getLn2025PhysicsRankRows,
  lookupLn2025PhysicsRank,
  LN_2025_PHYSICS_SCORE_RANK_META
} from './ln-2025-physics-score-rank.js';

function norm(value) {
  return String(value == null ? '' : value).trim().toLowerCase();
}

function isLnPhysics(region, subject) {
  const r = norm(region || 'ln');
  const s = norm(subject || 'physics');
  return ['ln', 'liaoning', '辽宁'].includes(r) && ['physics', '物理', '物理类', 'physical'].includes(s);
}

export function lookupScoreRank({ year = 2025, region = 'ln', subject = 'physics', score } = {}) {
  if (Number(year) === 2025 && isLnPhysics(region, subject)) {
    return lookupLn2025PhysicsRank(score);
  }
  return null;
}

export function getRankTableMeta({ year = 2025, region = 'ln', subject = 'physics' } = {}) {
  if (Number(year) === 2025 && isLnPhysics(region, subject)) return { ...LN_2025_PHYSICS_SCORE_RANK_META };
  return null;
}

export function getRankTableRows({ year = 2025, region = 'ln', subject = 'physics' } = {}) {
  if (Number(year) === 2025 && isLnPhysics(region, subject)) return getLn2025PhysicsRankRows();
  return [];
}

export function findEquivalentScoreByRank({ targetYear = 2025, region = 'ln', subject = 'physics', rank } = {}) {
  if (Number(targetYear) === 2025 && isLnPhysics(region, subject)) {
    return findLn2025PhysicsScoreByRank(rank);
  }
  return null;
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
      ? '可按考生当年位次换算到目标年份等位分/同位分。'
      : '当前仅内置辽宁2025物理类一分一段；2026表发布后新增数据文件即可启用等位分/同位分换算。'
  };
}

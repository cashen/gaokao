import { lookupLn2026PhysicsScore } from '../_lib/ln-2026-physics-score-rank.js';

export const SIMULATION_RANK_API_VERSION = 'simulation-rank-api-v001';

function toScore(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const score = Math.round(Number(raw));
  return Number.isFinite(score) && score >= 150 && score <= 750 ? score : null;
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': status === 200 ? 'public, max-age=300' : 'no-store'
    }
  });
}

export function onRequestGet(context) {
  const url = new URL(context.request.url);
  const score = toScore(url.searchParams.get('score'));
  if (score === null) return json({ ok: false, code: 'invalid_score', message: '请输入150—750之间的辽宁物理类分数。', apiVersion: SIMULATION_RANK_API_VERSION }, 400);

  const row = lookupLn2026PhysicsScore(score);
  if (!row?.rankForGap) return json({ ok: true, score, rank: null, rankStart: null, rankEnd: null, sameCount: null, available: false, apiVersion: SIMULATION_RANK_API_VERSION }, 200);

  return json({
    ok: true,
    score,
    rank: Number(row.rankForGap),
    rankStart: Number(row.rankStart ?? row.rankForGap),
    rankEnd: Number(row.rankEnd ?? row.rankForGap),
    sameCount: Number(row.sameCount ?? 1),
    available: true,
    source: '2026年辽宁省普通高校招生考试成绩统计表（物理学科类）',
    apiVersion: SIMULATION_RANK_API_VERSION
  });
}

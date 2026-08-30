import {
  findEquivalentScoreByRank,
  getRankTableMeta,
  lookupScoreRank
} from '../_lib/rank-table-provider.js';
import { getLiaoningPhysicsConfig } from '../../shared/resources/exam/liaoning-physics.js';

const CONTRACT_VERSION = 'score-equivalence-v3990_3';
const SOURCE_YEAR = 2026;
const TARGET_YEARS = Object.freeze([2025, 2024]);
const REGION = 'ln';
const SUBJECT = 'physics';

const JSON_HEADERS = Object.freeze({
  'content-type': 'application/json; charset=utf-8',
  'x-content-type-options': 'nosniff'
});

function json(payload, status = 200, cacheControl = 'no-store') {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...JSON_HEADERS,
      'cache-control': cacheControl
    }
  });
}

function error(status, code, message, details = {}) {
  return json({
    ok: false,
    contractVersion: CONTRACT_VERSION,
    error: { code, message, ...details }
  }, status);
}

function normalizedSource(meta = {}) {
  return {
    year: Number(meta.year),
    name: String(meta.tableName || meta.sourceName || `${meta.year || ''}年辽宁物理类一分一段表`).trim(),
    page: meta.sourcePage || meta.sourceUrl || null,
    generatedAt: meta.generatedAt || null,
    topScore: Number.isFinite(Number(meta.topScore)) ? Number(meta.topScore) : null,
    bottomScore: Number.isFinite(Number(meta.bottomScore)) ? Number(meta.bottomScore) : null,
    totalAtBottom: Number.isFinite(Number(meta.totalAt150 ?? meta.total)) ? Number(meta.totalAt150 ?? meta.total) : null
  };
}

function publicRankRow(row, year, comparisonRank = null, inputScore = null) {
  if (!row) return null;
  const score = Number(row.score);
  const rankStart = Number(row.rankStart);
  const rankEnd = Number(row.rankEnd);
  const result = {
    year: Number(year),
    score,
    sameCount: Number(row.sameCount),
    rankStart,
    rankEnd
  };
  if (Number.isFinite(Number(comparisonRank))) {
    result.containsComparisonRank = Number(comparisonRank) >= rankStart && Number(comparisonRank) <= rankEnd;
  }
  if (Number.isFinite(Number(inputScore))) {
    result.scoreDelta = score - Number(inputScore);
  }
  return result;
}

function parseScore(url) {
  const raw = new URL(url).searchParams.get('score');
  if (raw == null || raw.trim() === '') {
    return { ok: false, response: error(400, 'score-required', '请输入2026参考分数。') };
  }
  if (!/^\d+$/.test(raw.trim())) {
    return { ok: false, response: error(400, 'score-must-be-integer', '一分一段表按整数分数统计，请输入整数分数。') };
  }
  const score = Number(raw);
  if (!Number.isSafeInteger(score) || score < 150 || score > 750) {
    return { ok: false, response: error(400, 'score-out-of-range', '当前支持查询150至750分。', { minScore: 150, maxScore: 750 }) };
  }
  return { ok: true, score };
}

function buildResult(inputScore) {
  const sourceMeta = getRankTableMeta({ year: SOURCE_YEAR, region: REGION, subject: SUBJECT });
  if (!sourceMeta) return error(503, 'source-rank-table-unavailable', '2026年辽宁物理类一分一段表暂不可用。');

  const topScore = Number(sourceMeta.topScore);
  const sourceLookupScore = Number.isFinite(topScore) && inputScore > topScore ? topScore : inputScore;
  const anchorRow = lookupScoreRank({
    year: SOURCE_YEAR,
    region: REGION,
    subject: SUBJECT,
    score: sourceLookupScore
  });

  if (!anchorRow || Number(anchorRow.sameCount) <= 0) {
    return error(422, 'score-not-in-official-table', '官方一分一段表没有该分数的独立统计行，本页不进行插值或猜测。', {
      score: inputScore,
      sourceYear: SOURCE_YEAR
    });
  }

  const comparisonRank = Number(anchorRow.rankEnd);
  const equivalents = TARGET_YEARS.map(targetYear => {
    const row = findEquivalentScoreByRank({
      targetYear,
      region: REGION,
      subject: SUBJECT,
      rank: comparisonRank
    });
    return publicRankRow(row, targetYear, comparisonRank, inputScore);
  });

  if (equivalents.some(item => !item)) {
    return error(422, 'target-rank-out-of-range', '该位次超出部分历史年份的数据覆盖范围，本页不生成估算结果。', {
      comparisonRank,
      unavailableYears: TARGET_YEARS.filter((_, index) => !equivalents[index])
    });
  }

  if (equivalents.some(item => !item.containsComparisonRank)) {
    return error(500, 'equivalent-rank-contract-mismatch', '历史等位分结果未覆盖换算锚点。');
  }

  const examConfig = getLiaoningPhysicsConfig(SOURCE_YEAR);
  const belowUndergraduate = inputScore < Number(examConfig?.undergraduateControlScore);
  const belowSpecialControl = inputScore < Number(examConfig?.specialControlScore);
  const isMergedTopRange = sourceLookupScore !== inputScore;
  const sources = [SOURCE_YEAR, ...TARGET_YEARS].map(year => normalizedSource(
    getRankTableMeta({ year, region: REGION, subject: SUBJECT }) || { year }
  ));

  return json({
    ok: true,
    contractVersion: CONTRACT_VERSION,
    calculationPolicy: {
      display: '同分位次区间用于展示',
      comparison: '同分末位累计人数用于跨年比较',
      interpolation: false
    },
    scope: {
      province: '辽宁',
      subject: '物理类',
      sourceYear: SOURCE_YEAR,
      targetYears: TARGET_YEARS
    },
    input: {
      score: inputScore,
      sourceLookupScore,
      isMergedTopRange,
      scoreLabel: isMergedTopRange ? `${sourceLookupScore}分及以上` : `${inputScore}分`
    },
    anchor: {
      ...publicRankRow(anchorRow, SOURCE_YEAR),
      inputScore,
      sourceLookupScore,
      comparisonRank
    },
    equivalents,
    controls: {
      undergraduateControlScore: Number(examConfig?.undergraduateControlScore),
      specialControlScore: Number(examConfig?.specialControlScore),
      belowUndergraduate,
      belowSpecialControl
    },
    sources,
    note: '同位次历史对照只说明考生在当年一分一段表中的相对位置，不代表录取概率或院校录取结果。'
  }, 200, 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800');
}

export async function onRequest(context) {
  const request = context?.request;
  if (!request) return error(400, 'request-required', '请求无效。');
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response(null, {
      status: 405,
      headers: {
        ...JSON_HEADERS,
        allow: 'GET, HEAD',
        'cache-control': 'no-store'
      }
    });
  }
  const parsed = parseScore(request.url);
  if (!parsed.ok) return parsed.response;
  const response = buildResult(parsed.score);
  if (request.method === 'HEAD') {
    return new Response(null, { status: response.status, headers: response.headers });
  }
  return response;
}

export const SCORE_EQUIVALENCE_CONTRACT = Object.freeze({
  version: CONTRACT_VERSION,
  sourceYear: SOURCE_YEAR,
  targetYears: TARGET_YEARS,
  region: REGION,
  subject: SUBJECT,
  comparisonRankField: 'rankEnd',
  interpolation: false
});

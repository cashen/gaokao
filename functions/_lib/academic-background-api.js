import {
  clean,
  num,
  loadBackgroundMatchedRecords,
  buildCandidatePositionContext
} from './background-position-engine.js';
import {
  ACADEMIC_BACKGROUND_PROVIDER_VERSION,
  getAcademicBackgroundMeta,
  getAcademicBackgroundSchoolSummaries,
  getAcademicBackgroundMajorSummaries,
  matchAcademicBackground,
  presentAcademicBackground
} from './academic-background-provider.js';
import { normalizeAcademicBackgroundScope } from '../../shared/resources/background/academic-background-contract.v3968_0.js';

const json = (payload, status = 200) => new Response(JSON.stringify(payload), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
});

function rankDistance(record, candidateRank) {
  const rank = Number(record?.rank2026 ?? record?.rank);
  return Number.isFinite(rank) && Number.isFinite(candidateRank)
    ? Math.abs(rank - candidateRank)
    : Number.MAX_SAFE_INTEGER;
}

function scoreDistance(record, candidateScore) {
  const score = Number(record?.score2026 ?? record?.score);
  return Number.isFinite(score) && Number.isFinite(candidateScore)
    ? Math.abs(score - candidateScore)
    : Number.MAX_SAFE_INTEGER;
}

function levelWeight(record) {
  const level = record?.academicBackground?.level || record?.academicBackgroundRaw?.level || 'trajectory';
  return level === 'primary' ? 3 : level === 'secondary' ? 2 : 1;
}

function sortByUnifiedPosition(records = [], score, positionContext) {
  const candidateScore = Number(score);
  const candidateRank = Number(positionContext?.candidateRank);
  return [...records].sort((a, b) => {
    const rankGap = rankDistance(a, candidateRank) - rankDistance(b, candidateRank);
    if (rankGap) return rankGap;
    const scoreGap = scoreDistance(a, candidateScore) - scoreDistance(b, candidateScore);
    if (scoreGap) return scoreGap;
    return levelWeight(b) - levelWeight(a)
      || Number(b.score2026 || 0) - Number(a.score2026 || 0)
      || Number(a.rank2026 || Number.MAX_SAFE_INTEGER) - Number(b.rank2026 || Number.MAX_SAFE_INTEGER)
      || String(a.school || '').localeCompare(String(b.school || ''), 'zh-Hans-CN')
      || String(a.major || '').localeCompare(String(b.major || ''), 'zh-Hans-CN');
  }).map(record => ({
    ...record,
    rankingTrace: {
      owner: 'academic-background-position-v3968_0',
      primaryMetric: Number.isFinite(candidateRank) ? 'rank-distance-2026' : 'score-distance-2026',
      candidateRank: Number.isFinite(candidateRank) ? candidateRank : null,
      rankGap: Number.isFinite(candidateRank) && Number.isFinite(Number(record.rank2026))
        ? Number(record.rank2026) - candidateRank
        : null,
      scoreGap: Number.isFinite(candidateScore) && Number.isFinite(Number(record.score2026))
        ? Number(record.score2026) - candidateScore
        : null
    }
  }));
}

function groupUnifiedPosition(records = [], score, positionContext) {
  const candidate = Number(score);
  const sorted = list => sortByUnifiedPosition(list, candidate, positionContext);
  return {
    near: sorted(records.filter(record => Number(record.score2026) >= candidate - 10 && Number(record.score2026) <= candidate)),
    upper: sorted(records.filter(record => Number(record.score2026) > candidate && Number(record.score2026) <= candidate + 10)),
    lower: sorted(records.filter(record => Number(record.score2026) >= candidate - 25 && Number(record.score2026) < candidate - 10))
  };
}

async function loadRecords(context, scope, filters = {}) {
  return loadBackgroundMatchedRecords(context.request, context.env || {}, filters, {
    matchRecord: record => matchAcademicBackground(record, scope),
    presentHit: presentAcademicBackground,
    outputKey: 'academicBackground',
    rawKey: 'academicBackgroundRaw',
    sourceName: 'academic-background-provider-v3968_0'
  });
}

export async function handleAcademicBackgroundRequest(context, forcedScope = '') {
  if (context.request.method !== 'GET') return json({ ok: false, message: '只支持 GET 请求。' }, 405);
  try {
    const url = new URL(context.request.url);
    const scope = normalizeAcademicBackgroundScope(forcedScope || url.searchParams.get('scope'));
    const mode = clean(url.searchParams.get('mode') || 'meta', 30);
    const meta = getAcademicBackgroundMeta(scope);

    if (mode === 'meta') {
      return json({
        ok: true,
        mode,
        scope,
        providerVersion: ACADEMIC_BACKGROUND_PROVIDER_VERSION,
        meta,
        schools: getAcademicBackgroundSchoolSummaries(scope),
        majors: getAcademicBackgroundMajorSummaries(scope),
        boundary: meta.boundary
      });
    }

    if (mode === 'school') {
      const school = clean(url.searchParams.get('school') || '', 100);
      if (!school) return json({ ok: false, message: '请选择学校。' }, 400);
      const result = await loadRecords(context, scope, { school, max: url.searchParams.get('max') || 300 });
      return json({
        ok: true,
        mode,
        scope,
        admissionDataYear: 2026,
        historyYears: [2025, 2024],
        school,
        records: result.records,
        count: result.records.length,
        scannedCount: result.scannedCount,
        matchedCount: result.matchedCount,
        dataReadOk: result.dataReadOk,
        meta,
        boundary: meta.boundary
      });
    }

    if (mode === 'major') {
      const major = clean(url.searchParams.get('major') || '', 100);
      if (!major) return json({ ok: false, message: '请输入专业名称。' }, 400);
      const result = await loadRecords(context, scope, { major, max: url.searchParams.get('max') || 300 });
      return json({
        ok: true,
        mode,
        scope,
        admissionDataYear: 2026,
        historyYears: [2025, 2024],
        major,
        records: result.records,
        count: result.records.length,
        scannedCount: result.scannedCount,
        matchedCount: result.matchedCount,
        dataReadOk: result.dataReadOk,
        meta,
        boundary: meta.boundary
      });
    }

    if (mode === 'score' || mode === 'position') {
      const score = num(url.searchParams.get('score'));
      if (!Number.isFinite(score) || score < 344 || score > 750) {
        return json({ ok: false, message: '请输入 344—750 之间的有效参考分数。' }, 400);
      }
      const level = clean(url.searchParams.get('level') || 'primary_secondary', 30);
      const natureMode = clean(url.searchParams.get('natureMode') || 'all', 30);
      const result = await loadRecords(context, scope, {
        candidateScore: score,
        maxScore: score + 10,
        minScore: score - 25,
        level,
        natureMode,
        max: url.searchParams.get('max') || 360
      });
      const positionContext = result.positionContext || buildCandidatePositionContext(score);
      const grouped = groupUnifiedPosition(result.records, score, positionContext);
      return json({
        ok: true,
        mode: 'position',
        scope,
        audienceYear: 2027,
        admissionDataYear: 2026,
        historyYears: [2025, 2024],
        rankYear: 2026,
        score,
        level,
        natureMode,
        records: sortByUnifiedPosition(result.records, score, positionContext),
        grouped,
        count: result.records.length,
        scannedCount: result.scannedCount,
        matchedCount: result.matchedCount,
        windowCandidateCount: result.windowCandidateCount,
        normalizedCount: result.normalizedCount,
        chunksRead: result.chunksRead,
        chunksSkipped: result.chunksSkipped,
        dataReadOk: result.dataReadOk,
        positionContext,
        meta,
        humanMessage: result.records.length ? '' : '这个参考位置附近没有通过权威来源门禁的学校专业背景记录。可以按学校或专业继续查看，待核验旧线索不会混入结果。',
        boundary: positionContext.humanBoundary + ' 背景证据按自身来源年份展示，不能把2017或2022年的学科证据理解为2026新增事实。'
      });
    }

    return json({ ok: false, message: '未知查询方式。' }, 400);
  } catch (error) {
    return json({
      ok: false,
      message: '学校专业背景数据暂时没有读取成功。',
      hint: '这不影响主页面专业初选。背景证据必须通过权威来源门禁后才会显示。',
      engineerHint: error?.message || String(error)
    }, 500);
  }
}

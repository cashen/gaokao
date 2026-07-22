import { jsonOk, jsonError } from '../_lib/json-response.js';
import { get211MainlineMeta, get211SchoolSummaries, get211MajorSummaries, match211Mainline, get211MatcherIndexStats } from '../_lib/211-mainline-kb.js';
import { clean, num, includesText, loadBackgroundMatchedRecords, groupScoreRecords, buildCandidatePositionContext } from '../_lib/background-position-engine.js';

function levelFromLine(line) {
  return line?.level || 'trajectory';
}

function schoolDirections(school) {
  const lines = [...(school.primaryDirections || []), ...(school.secondaryDirections || []), ...(school.trajectoryWarnings || [])];
  return lines.map((line, index) => ({
    id: `${school.school}-${index}`,
    dataYear: 2026,
    school: school.school,
    major: (line.majors || []).join(' / '),
    mainline211: {
      label: line.displayLabel,
      direction: line.direction,
      short: `${line.displayLabel}｜${line.direction}`,
      reviewPoints: line.reviewPoints || [],
      note: line.humanNote || '',
      boundary: get211MainlineMeta().copy?.boundary || ''
    },
    mainline211Raw: { level: levelFromLine(line) },
    reviewPoints: line.reviewPoints || [],
    score2026: null,
    rank2026: null,
    score2025: null,
    rank2025: null,
    score2024: null,
    rank2024: null
  }));
}

async function loadMatched211Records(request, env, filters = {}) {
  return loadBackgroundMatchedRecords(request, env || {}, filters, {
    matchRecord: match211Mainline,
    presentHit: hit => {
      if (!hit?.matched) return null;
      return {
        label: hit.displayLabel,
        direction: hit.direction,
        short: `${hit.displayLabel}｜${hit.direction}`,
        reviewPoints: hit.reviewPoints || [],
        note: hit.humanNote || '',
        boundary: hit.boundary,
        evidenceText: hit.evidenceText || ''
      };
    },
    outputKey: 'mainline211',
    rawKey: 'mainline211Raw',
    sourceName: '211-mainline-kb'
  });
}

export async function onRequest(context) {
  if (context.request.method !== 'GET') return jsonError('只支持 GET 请求。', 405);
  try {
    const url = new URL(context.request.url);
    const mode = clean(url.searchParams.get('mode') || 'meta', 30);
    const index = get211MainlineMeta();

    if (mode === 'meta') {
      return jsonOk({
        mode,
        audienceYear: 2027,
        dataYear: 2026,
        index,
        schools: get211SchoolSummaries(),
        majors: get211MajorSummaries(),
        boundary: index.copy?.boundary || '只用于家庭复核，不代表录取判断。',
        matcherIndex: get211MatcherIndexStats()
      });
    }

    if (mode === 'school') {
      const schoolName = clean(url.searchParams.get('school') || '', 80);
      if (!schoolName) return jsonError('请选择学校。', 400);
      const school = (index.schools || []).find(item => includesText(item.school, schoolName) || (item.aliases || []).some(alias => includesText(alias, schoolName)));
      if (!school) return jsonOk({ mode, school: schoolName, records: [], count: 0, humanMessage: '当前 211 KB 没有找到这个学校的前台可触发背景。', boundary: index.copy?.boundary || '' });
      const records = school.isMilitarySpecial ? [] : schoolDirections(school);
      return jsonOk({ mode, audienceYear: 2027, dataYear: 2026, school: school.school, schoolInfo: school, records, count: records.length, boundary: '这些信息只用于家庭讨论和人工复核，不代表录取判断依据。' });
    }

    if (mode === 'major') {
      const major = clean(url.searchParams.get('major') || '', 80);
      if (!major) return jsonError('请输入专业名称。', 400);
      const matches = (get211MajorSummaries() || []).filter(item => includesText(item.major, major) || (item.schools || []).some(school => includesText(school.direction, major) || includesText(school.school, major)));
      return jsonOk({ mode, audienceYear: 2027, dataYear: 2026, major, records: matches.slice(0, 80), count: matches.length, boundary: '同名专业在不同 211 院校的培养场景可能不同，需继续核验培养方案和招生章程。' });
    }

    if (mode === 'score' || mode === 'position') {
      const score = num(url.searchParams.get('score'));
      if (!Number.isFinite(score) || score < 344 || score > 750) return jsonError('请输入 344—750 之间的有效参考分数。', 400);
      const level = clean(url.searchParams.get('level') || 'primary_secondary', 30);
      const natureMode = clean(url.searchParams.get('natureMode') || 'all', 30);
      const result = await loadMatched211Records(context.request, context.env || {}, {
        candidateScore: score,
        maxScore: score + 10,
        minScore: score - 25,
        level,
        natureMode,
        max: url.searchParams.get('max') || 300
      });
      const grouped = groupScoreRecords(result.records, score, 'mainline211Raw');
      const positionContext = result.positionContext || buildCandidatePositionContext(score);
      return jsonOk({
        mode,
        audienceYear: 2027,
        dataYear: 2026,
        rankYear: 2026,
        score,
        level,
        natureMode,
        records: result.records,
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
        dataSourceLabel: positionContext.dataSourceLabel,
        humanMessage: result.records.length ? '' : '这个参考分数附近暂时没有匹配到 211 背景记录，可以换一个分数，或按学校 / 专业入口查看。',
        boundary: positionContext.humanBoundary
      });
    }

    return jsonError('未知查询方式。', 400);
  } catch (error) {
    return jsonError('211 背景数据暂时没有读取成功。', 500, {
      hint: '这不影响主页面专业初选，也不影响按学校和按专业查看 211 背景。',
      engineerHint: error?.message || String(error)
    });
  }
}

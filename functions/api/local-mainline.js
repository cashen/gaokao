import { getLocalMainlineMeta, getSchoolSummaries, getMajorSummaries, matchLocalMainline, presentLocalMainline } from '../_lib/local-mainline-kb.js';
import { clean, num, includesText, loadBackgroundMatchedRecords, groupScoreRecords, buildCandidatePositionContext } from '../_lib/background-position-engine.js';

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}
async function loadMatchedRecords(request, env, filters = {}) {
  const result = await loadBackgroundMatchedRecords(request, env || {}, filters, {
    matchRecord: matchLocalMainline,
    presentHit: presentLocalMainline,
    outputKey: 'localMainline',
    rawKey: 'localMainlineRaw',
    sourceName: 'local-mainline-kb'
  });
  return result;
}

export async function onRequest(context) {
  if (context.request.method !== 'GET') return json({ ok: false, message: '只支持 GET 请求。' }, 405);
  try {
    const url = new URL(context.request.url);
    const mode = clean(url.searchParams.get('mode') || 'meta', 30);
    if (mode === 'meta') {
      return json({ ok: true, mode, index: getLocalMainlineMeta(), schools: getSchoolSummaries(), majors: getMajorSummaries() });
    }
    if (mode === 'school') {
      const school = clean(url.searchParams.get('school') || '', 80);
      if (!school) return json({ ok: false, message: '请选择学校。' }, 400);
      const result = await loadMatchedRecords(context.request, context.env || {}, { school, max: url.searchParams.get('max') || 240 });
      return json({ ok: true, mode, school, records: result.records, count: result.records.length, scannedCount: result.scannedCount, matchedCount: result.matchedCount, boundary: '这些信息只用于家庭讨论和人工复核，不代表录取判断依据。' });
    }
    if (mode === 'major') {
      const major = clean(url.searchParams.get('major') || '', 80);
      if (!major) return json({ ok: false, message: '请输入专业名称。' }, 400);
      const result = await loadMatchedRecords(context.request, context.env || {}, { major, max: url.searchParams.get('max') || 240 });
      return json({ ok: true, mode, major, records: result.records, count: result.records.length, scannedCount: result.scannedCount, matchedCount: result.matchedCount, boundary: '同名专业在不同学校的培养场景可能不同，需继续核验培养方案和招生章程。' });
    }
    if (mode === 'score') {
      const score = num(url.searchParams.get('score'));
      if (!Number.isFinite(score) || score <= 0) return json({ ok: false, message: '请输入有效分数。' }, 400);
      const level = clean(url.searchParams.get('level') || 'primary', 30);
      const natureMode = clean(url.searchParams.get('natureMode') || 'all', 30);
      const positionContext = buildCandidatePositionContext(score);
      const result = await loadMatchedRecords(context.request, context.env || {}, { candidateScore: score, maxScore: score + 10, minScore: score - 25, level, natureMode, max: url.searchParams.get('max') || 300 });
      const grouped = groupScoreRecords(result.records, score, 'localMainlineRaw');
      return json({
        ok: true,
        mode,
        score,
        level,
        natureMode,
        records: result.records,
        grouped,
        count: result.records.length,
        scannedCount: result.scannedCount,
        matchedCount: result.matchedCount,
        positionContext,
        dataSourceLabel: positionContext.dataSourceLabel,
        humanMessage: result.records.length ? '' : '这个当前位置附近暂时没有匹配到省内背景记录，可以换一个位置，或按学校 / 专业入口查看。',
        boundary: '这里不是录取判断。当前先按孩子输入分数对照辽宁 2025 物理类历史专业记录；2026 一分一段接入后，会先换算孩子位次，再按同一个参考窗口查看省内背景。'
      });
    }
    return json({ ok: false, message: '未知查询方式。' }, 400);
  } catch (error) {
    return json({ ok: false, message: '省内背景数据暂时没有读取成功。', hint: '这不影响主页面专业初选，也不影响稍后按学校或专业继续查看。', engineerHint: error?.message || String(error) }, 500);
  }
}

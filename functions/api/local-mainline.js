import { loadAllRecords } from '../_lib/fenxi-manifest.js';
import { normalizeRecord } from '../_lib/fenxi-normalizer.js';
import { buildDisplayTags } from '../_lib/school-display-tags.js';
import { getLocalMainlineMeta, getSchoolSummaries, getMajorSummaries, matchLocalMainline, presentLocalMainline } from '../_lib/local-mainline-kb.js';

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}
function clean(value, max = 80) { return String(value || '').trim().slice(0, max); }
function num(value) { const n = Number(value); return Number.isFinite(n) ? n : null; }
function rankSort(v) { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : Number.MAX_SAFE_INTEGER; }
function normalizeKey(v) { return String(v || '').replace(/[（(].*?[）)]/g, '').replace(/\s+/g, '').trim(); }
function includesText(a, b) { return normalizeKey(a).includes(normalizeKey(b)); }
function levelPass(level, filter) {
  if (filter === 'primary') return level === 'primary';
  if (filter === 'core') return level === 'primary';
  if (filter === 'primary_secondary') return level === 'primary' || level === 'secondary';
  return true;
}
function publicPass(record, mode) {
  if (mode !== 'public_regular_only') return true;
  const text = [record.nature, record.natureRaw, ...(record.schoolTags || []), record.rawText].filter(Boolean).join(' ');
  if (/民办|独立学院|中外|合作办学|高收费|较高收费/.test(text)) return false;
  return /公办/.test(text) || !/民办|独立学院/.test(text);
}
function shapeRecord(record, hit, candidateScore = null) {
  const display = buildDisplayTags(record);
  const score2025 = record.score2025 ?? record.score;
  const rank2025 = record.rank2025 ?? record.rank;
  const delta = Number.isFinite(Number(candidateScore)) && Number.isFinite(Number(score2025)) ? Number(score2025) - Number(candidateScore) : null;
  const evidence = presentLocalMainline(hit);
  return {
    id: record.id,
    school: record.school,
    major: record.major,
    score2025,
    rank2025,
    score2024: record.score2024 ?? null,
    rank2024: record.rank2024 ?? null,
    historyCompare: record.historyCompare || null,
    scoreDelta: delta,
    displayLocation: record.displayLocation || display.displayLocation || '',
    natureLabel: display.natureLabel || record.nature || '',
    schoolTags: display.schoolTags || [],
    localMainline: evidence,
    localMainlineRaw: hit,
    reviewPoints: evidence?.reviewPoints || []
  };
}
async function loadMatchedRecords(request, env, filters = {}) {
  const { records } = await loadAllRecords(request, env || {});
  const out = [];
  const schoolFilter = clean(filters.school || '', 80);
  const majorFilter = clean(filters.major || '', 80);
  const max = Math.max(20, Math.min(500, Number(filters.max || 180)));
  for (const raw of records) {
    const record = normalizeRecord(raw);
    if (!record.school || !record.major || !Number.isFinite(Number(record.score2025 ?? record.score))) continue;
    if (schoolFilter && !includesText(record.school, schoolFilter)) continue;
    if (majorFilter && !includesText(record.major, majorFilter)) continue;
    record.rawText = JSON.stringify(raw).slice(0, 1600);
    const hit = matchLocalMainline(record);
    if (!hit) continue;
    if (!levelPass(hit.level, filters.level || 'all')) continue;
    if (!publicPass(record, filters.natureMode || 'all')) continue;
    if (Number.isFinite(Number(filters.maxScore)) && Number(record.score2025 ?? record.score) > Number(filters.maxScore)) continue;
    if (Number.isFinite(Number(filters.minScore)) && Number(record.score2025 ?? record.score) < Number(filters.minScore)) continue;
    out.push(shapeRecord(record, hit, filters.candidateScore));
  }
  const candidate = Number(filters.candidateScore);
  out.sort((a, b) => {
    const levelWeight = (x) => x?.localMainlineRaw?.level === 'primary' ? 3 : x?.localMainlineRaw?.level === 'secondary' ? 2 : 1;
    if (Number.isFinite(candidate)) {
      const da = Math.abs(Number(a.score2025 || 0) - candidate);
      const db = Math.abs(Number(b.score2025 || 0) - candidate);
      if (da !== db) return da - db;
    }
    return levelWeight(b) - levelWeight(a) || Number(b.score2025 || 0) - Number(a.score2025 || 0) || rankSort(a.rank2025) - rankSort(b.rank2025);
  });
  return out.slice(0, max);
}
function sortByHumanScore(records, score) {
  const candidate = Number(score);
  const levelWeight = (x) => x?.localMainlineRaw?.level === 'primary' ? 3 : x?.localMainlineRaw?.level === 'secondary' ? 2 : 1;
  return [...records].sort((a, b) => {
    const da = Math.abs(Number(a.score2025 || 0) - candidate);
    const db = Math.abs(Number(b.score2025 || 0) - candidate);
    return da - db || levelWeight(b) - levelWeight(a) || rankSort(a.rank2025) - rankSort(b.rank2025);
  });
}
function groupScore(records, score) {
  const candidate = Number(score);
  return {
    near: sortByHumanScore(records.filter(r => Number(r.score2025) >= candidate - 10 && Number(r.score2025) <= candidate), score),
    upper: sortByHumanScore(records.filter(r => Number(r.score2025) > candidate && Number(r.score2025) <= candidate + 10), score),
    lower: sortByHumanScore(records.filter(r => Number(r.score2025) >= candidate - 25 && Number(r.score2025) < candidate - 10), score)
  };
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
      const records = await loadMatchedRecords(context.request, context.env || {}, { school, max: url.searchParams.get('max') || 240 });
      return json({ ok: true, mode, school, records, count: records.length, boundary: '这些信息只用于家庭讨论和人工复核，不代表录取判断依据。' });
    }
    if (mode === 'major') {
      const major = clean(url.searchParams.get('major') || '', 80);
      if (!major) return json({ ok: false, message: '请输入专业名称。' }, 400);
      const records = await loadMatchedRecords(context.request, context.env || {}, { major, max: url.searchParams.get('max') || 240 });
      return json({ ok: true, mode, major, records, count: records.length, boundary: '同名专业在不同学校的培养场景可能不同，需继续核验培养方案和招生章程。' });
    }
    if (mode === 'score') {
      const score = num(url.searchParams.get('score'));
      if (!Number.isFinite(score) || score <= 0) return json({ ok: false, message: '请输入有效分数。' }, 400);
      const level = clean(url.searchParams.get('level') || 'primary', 30);
      const natureMode = clean(url.searchParams.get('natureMode') || 'all', 30);
      const records = await loadMatchedRecords(context.request, context.env || {}, { candidateScore: score, maxScore: score + 10, minScore: score - 25, level, natureMode, max: url.searchParams.get('max') || 300 });
      const grouped = groupScore(records, score);
      return json({ ok: true, mode, score, level, natureMode, records, grouped, count: records.length, boundary: `这里不是录取判断，也不代表 2026 可以直接填。它只是按 2025 年历史最低分和省内专业背景，把接近 ${score} 分、稍高一点和低一些可讨论的专业分组列出来，方便家庭先讨论。` });
    }
    return json({ ok: false, message: '未知查询方式。' }, 400);
  } catch (error) {
    return json({ ok: false, message: error?.message || String(error), boundary: '数据暂时没有读取成功，可以稍后重试，或返回 /ln-rank/ 继续使用分数初选。' }, 500);
  }
}

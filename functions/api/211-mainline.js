import { jsonOk, jsonError } from '../_lib/json-response.js';
import { ALL_211_SCORE_INDEX } from '../_lib/211-score-index.generated.js';
import { get211MainlineMeta, get211SchoolSummaries, get211MajorSummaries, present211Mainline } from '../_lib/211-mainline-kb.js';
function clean(value, max = 80) { return String(value || '').trim().slice(0, max); }
function num(value) { const n = Number(value); return Number.isFinite(n) ? n : null; }
function norm(value) { return String(value || '').replace(/\s+/g, '').trim(); }
function includesText(a, b) { const x = norm(a); const y = norm(b); return !y || x.includes(y) || y.includes(x); }
function levelPass(level, filter) { if (filter === 'primary') return level === 'primary'; if (filter === 'primary_secondary') return level === 'primary' || level === 'secondary'; return true; }
function emptyGrouped() { return { near: [], upper: [], lower: [] }; }
function scoreValue(record) { return Number(record.score2025 ?? record.score); }
function shapeScoreRecord(raw, candidateScore = null) {
  const score2025 = raw.score2025 ?? raw.score;
  const delta = Number.isFinite(Number(candidateScore)) && Number.isFinite(Number(score2025)) ? Number(score2025) - Number(candidateScore) : null;
  const hit = raw.mainline211Raw || raw.hit || null;
  const evidence = raw.mainline211 || (hit ? present211Mainline(hit) : {
    label: raw.label || raw.frontendLabel || '背景提示',
    direction: raw.direction || raw.backgroundDirection || '',
    short: raw.backgroundText || [raw.label || raw.frontendLabel, raw.direction || raw.backgroundDirection].filter(Boolean).join('｜'),
    reviewPoints: raw.reviewPoints || ['培养方案', '招生章程'],
    boundary: ALL_211_SCORE_INDEX.boundary
  });
  return {
    id: raw.id || `${raw.school || ''}-${raw.major || ''}-${score2025 || ''}`,
    school: raw.school || raw.schoolName || '',
    major: raw.major || raw.majorName || '',
    score2025,
    rank2025: raw.rank2025 ?? raw.rank ?? null,
    score2024: raw.score2024 ?? null,
    rank2024: raw.rank2024 ?? null,
    scoreDelta: delta,
    displayLocation: raw.displayLocation || raw.city || raw.province || '',
    natureLabel: raw.natureLabel || '',
    schoolTags: raw.schoolTags || ['211'],
    mainline211: evidence,
    mainline211Raw: hit || { level: raw.level || 'trajectory' },
    reviewPoints: evidence?.reviewPoints || raw.reviewPoints || []
  };
}
function sortByDistance(records, score) {
  const candidate = Number(score);
  const weight = (x) => x?.mainline211Raw?.level === 'primary' ? 3 : x?.mainline211Raw?.level === 'secondary' ? 2 : 1;
  return [...records].sort((a, b) => {
    const da = Math.abs(Number(a.score2025 || 0) - candidate);
    const db = Math.abs(Number(b.score2025 || 0) - candidate);
    return da - db || weight(b) - weight(a) || Number(b.score2025 || 0) - Number(a.score2025 || 0);
  });
}
function groupScore(records, score) {
  const candidate = Number(score);
  return {
    near: sortByDistance(records.filter(r => Number(r.score2025) >= candidate - 10 && Number(r.score2025) <= candidate), score),
    upper: sortByDistance(records.filter(r => Number(r.score2025) > candidate && Number(r.score2025) <= candidate + 10), score),
    lower: sortByDistance(records.filter(r => Number(r.score2025) >= candidate - 25 && Number(r.score2025) < candidate - 10), score)
  };
}
function schoolDirections(school) {
  const lines = [...(school.primaryDirections || []), ...(school.secondaryDirections || []), ...(school.trajectoryWarnings || [])];
  return lines.map((line, idx) => ({
    id: `${school.school}-${idx}`,
    school: school.school,
    major: (line.majors || []).join(' / '),
    mainline211: { label: line.displayLabel, direction: line.direction, short: `${line.displayLabel}｜${line.direction}`, reviewPoints: line.reviewPoints || [], note: line.humanNote || '', boundary: get211MainlineMeta().copy?.boundary || '' },
    mainline211Raw: { level: line.level || 'trajectory' },
    reviewPoints: line.reviewPoints || [],
    score2025: null,
    rank2025: null
  }));
}
export async function onRequest(context) {
  if (context.request.method !== 'GET') return jsonError('只支持 GET 请求。', 405);
  try {
    const url = new URL(context.request.url);
    const mode = clean(url.searchParams.get('mode') || 'meta', 30);
    const index = get211MainlineMeta();
    if (mode === 'meta') return jsonOk({ mode, index, schools: get211SchoolSummaries(), majors: get211MajorSummaries(), boundary: index.copy?.boundary || '只用于家庭复核，不代表录取判断。' });
    if (mode === 'school') {
      const schoolName = clean(url.searchParams.get('school') || '', 80);
      if (!schoolName) return jsonError('请选择学校。', 400);
      const school = (index.schools || []).find(s => includesText(s.school, schoolName) || (s.aliases || []).some(a => includesText(a, schoolName)));
      if (!school) return jsonOk({ mode, school: schoolName, records: [], count: 0, humanMessage: '当前 211 KB 没有找到这个学校的前台可触发背景。', boundary: index.copy?.boundary || '' });
      const records = school.isMilitarySpecial ? [] : schoolDirections(school);
      return jsonOk({ mode, school: school.school, schoolInfo: school, records, count: records.length, boundary: '这些信息只用于家庭讨论和人工复核，不代表录取判断依据。' });
    }
    if (mode === 'major') {
      const major = clean(url.searchParams.get('major') || '', 80);
      if (!major) return jsonError('请输入专业名称。', 400);
      const matches = (get211MajorSummaries() || []).filter(m => includesText(m.major, major) || (m.schools || []).some(s => includesText(s.direction, major) || includesText(s.school, major)));
      return jsonOk({ mode, major, records: matches.slice(0, 80), count: matches.length, boundary: '同名专业在不同 211 院校的培养场景可能不同，需继续核验培养方案和招生章程。' });
    }
    if (mode === 'score') {
      const score = num(url.searchParams.get('score'));
      if (!Number.isFinite(score) || score <= 0) return jsonError('请输入有效分数。', 400);
      const level = clean(url.searchParams.get('level') || 'primary_secondary', 30);
      const rawRecords = Array.isArray(ALL_211_SCORE_INDEX.records) ? ALL_211_SCORE_INDEX.records : [];
      const records = rawRecords
        .filter(r => !r.isMilitarySpecial)
        .filter(r => Number.isFinite(scoreValue(r)))
        .filter(r => scoreValue(r) >= score - 25 && scoreValue(r) <= score + 10)
        .filter(r => levelPass(r.level || r.mainline211Raw?.level || 'trajectory', level))
        .map(r => shapeScoreRecord(r, score));
      const grouped = groupScore(records, score);
      const isEmptyIndex = rawRecords.length === 0;
      return jsonOk({
        mode, score, level, records, grouped, count: records.length, isEmptyIndex,
        humanMessage: isEmptyIndex ? '当前包内还没有内置 211 分数历史记录索引；这不影响按学校和按专业查看 211 背景。' : '这个分数附近暂时没有可显示的 211 背景记录。',
        boundary: `这里不是录取判断，也不代表 2026 可以直接填。它只是按 2025 年历史最低分和 211 院校背景，把接近 ${score} 分、稍高一点和低一些可讨论的专业分组列出来，方便家庭先讨论。`
      });
    }
    return jsonError('未知查询方式。', 400);
  } catch (error) {
    return jsonError('211 背景数据暂时没有读取成功。', 500, {
      hint: '可以稍后重试；这不影响主页面专业初选，也不影响按学校和按专业查看 211 背景。',
      engineerHint: error?.message || String(error)
    });
  }
}

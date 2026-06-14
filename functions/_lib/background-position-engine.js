import { loadAllRecords } from './fenxi-manifest.js';
import { normalizeRecord } from './fenxi-normalizer.js';
import { buildDisplayTags } from './school-display-tags.js';

export function clean(value, max = 80) {
  return String(value || '').trim().slice(0, max);
}
export function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
export function rankSort(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : Number.MAX_SAFE_INTEGER;
}
export function normalizeKey(value) {
  return String(value || '').replace(/[（(].*?[）)]/g, '').replace(/\s+/g, '').trim();
}
export function includesText(a, b) {
  const left = normalizeKey(a);
  const right = normalizeKey(b);
  return !right || left.includes(right) || right.includes(left);
}
export function levelPass(level, filter) {
  if (filter === 'primary') return level === 'primary';
  if (filter === 'core') return level === 'primary';
  if (filter === 'primary_secondary') return level === 'primary' || level === 'secondary';
  return true;
}
export function publicPass(record, mode) {
  if (mode !== 'public_regular_only') return true;
  const text = [record.nature, record.natureRaw, ...(record.schoolTags || []), record.rawText].filter(Boolean).join(' ');
  if (/民办|独立学院|中外|合作办学|高收费|较高收费/.test(text)) return false;
  return /公办/.test(text) || !/民办|独立学院/.test(text);
}
export function buildCandidatePositionContext(score, extra = {}) {
  const candidateScore = num(score);
  return {
    activeCandidateYear: extra.activeCandidateYear || 2026,
    candidateScore,
    candidateRank: extra.candidateRank ?? null,
    referenceAdmissionYear: extra.referenceAdmissionYear || 2025,
    referenceScore: extra.referenceScore ?? candidateScore,
    referenceRank: extra.referenceRank ?? null,
    positionMode: extra.positionMode || 'history_score_until_current_rank_table_ready',
    dataSourceLabel: extra.dataSourceLabel || '当前参考数据：辽宁 2025 物理类历史专业记录。2026 一分一段发布后，应统一切换为位次/等位参考窗口。',
    humanBoundary: extra.humanBoundary || '这里不是录取判断。当前先按孩子输入分数对照辽宁 2025 物理类历史专业记录；2026 一分一段接入后，应先换算孩子位次，再按同一个参考窗口查看本地属性和 211 背景。',
    referenceWindow: extra.referenceWindow || {
      near: { minDelta: -10, maxDelta: 0, label: '接近当前位置的历史记录' },
      upper: { minDelta: 1, maxDelta: 10, label: '稍高一些的历史记录' },
      lower: { minDelta: -25, maxDelta: -11, label: '低一些可讨论的历史记录' }
    }
  };
}
function levelWeightByRaw(record, rawKey) {
  const raw = rawKey ? record?.[rawKey] : null;
  const level = raw?.level || record?.level;
  return level === 'primary' ? 3 : level === 'secondary' ? 2 : level === 'trajectory' ? 1 : 0;
}
export function shapeBackgroundRecord(record, hit, filters = {}, config = {}) {
  const display = buildDisplayTags(record);
  const candidateScore = filters.candidateScore;
  const score2025 = record.score2025 ?? record.score;
  const rank2025 = record.rank2025 ?? record.rank;
  const delta = Number.isFinite(Number(candidateScore)) && Number.isFinite(Number(score2025)) ? Number(score2025) - Number(candidateScore) : null;
  const presentHit = typeof config.presentHit === 'function' ? config.presentHit : (x) => x;
  const evidence = presentHit(hit);
  const outputKey = config.outputKey || 'background';
  const rawKey = config.rawKey || 'backgroundRaw';
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
    [outputKey]: evidence,
    [rawKey]: hit,
    reviewPoints: evidence?.reviewPoints || hit?.reviewPoints || [],
    positionContext: buildCandidatePositionContext(candidateScore),
    backgroundSource: config.sourceName || 'background-kb'
  };
}
export async function loadBackgroundMatchedRecords(request, env, filters = {}, config = {}) {
  const { records, manifest } = await loadAllRecords(request, env || {});
  const out = [];
  const schoolFilter = clean(filters.school || '', 80);
  const majorFilter = clean(filters.major || '', 80);
  const max = Math.max(20, Math.min(500, Number(filters.max || 180)));
  let scannedCount = 0;
  let matchedBeforeLimit = 0;
  for (const raw of records) {
    scannedCount += 1;
    const record = normalizeRecord(raw);
    if (!record.school || !record.major || !Number.isFinite(Number(record.score2025 ?? record.score))) continue;
    if (schoolFilter && !includesText(record.school, schoolFilter)) continue;
    if (majorFilter && !includesText(record.major, majorFilter)) continue;
    record.rawText = JSON.stringify(raw).slice(0, 1600);
    const hit = config.matchRecord(record, raw);
    if (!hit) continue;
    if (!levelPass(hit.level, filters.level || 'all')) continue;
    if (!publicPass(record, filters.natureMode || 'all')) continue;
    if (Number.isFinite(Number(filters.maxScore)) && Number(record.score2025 ?? record.score) > Number(filters.maxScore)) continue;
    if (Number.isFinite(Number(filters.minScore)) && Number(record.score2025 ?? record.score) < Number(filters.minScore)) continue;
    matchedBeforeLimit += 1;
    out.push(shapeBackgroundRecord(record, hit, filters, config));
  }
  const candidate = Number(filters.candidateScore);
  const rawKey = config.rawKey || 'backgroundRaw';
  out.sort((a, b) => {
    if (Number.isFinite(candidate)) {
      const da = Math.abs(Number(a.score2025 || 0) - candidate);
      const db = Math.abs(Number(b.score2025 || 0) - candidate);
      if (da !== db) return da - db;
    }
    return levelWeightByRaw(b, rawKey) - levelWeightByRaw(a, rawKey) || Number(b.score2025 || 0) - Number(a.score2025 || 0) || rankSort(a.rank2025) - rankSort(b.rank2025);
  });
  return {
    records: out.slice(0, max),
    scannedCount,
    matchedCount: matchedBeforeLimit,
    manifest,
    positionContext: buildCandidatePositionContext(filters.candidateScore)
  };
}
export function sortByPositionDistance(records, score, rawKey = 'backgroundRaw') {
  const candidate = Number(score);
  return [...records].sort((a, b) => {
    const da = Math.abs(Number(a.score2025 || 0) - candidate);
    const db = Math.abs(Number(b.score2025 || 0) - candidate);
    return da - db || levelWeightByRaw(b, rawKey) - levelWeightByRaw(a, rawKey) || Number(b.score2025 || 0) - Number(a.score2025 || 0) || rankSort(a.rank2025) - rankSort(b.rank2025);
  });
}
export function groupScoreRecords(records, score, rawKey = 'backgroundRaw') {
  const candidate = Number(score);
  return {
    near: sortByPositionDistance(records.filter(r => Number(r.score2025) >= candidate - 10 && Number(r.score2025) <= candidate), score, rawKey),
    upper: sortByPositionDistance(records.filter(r => Number(r.score2025) > candidate && Number(r.score2025) <= candidate + 10), score, rawKey),
    lower: sortByPositionDistance(records.filter(r => Number(r.score2025) >= candidate - 25 && Number(r.score2025) < candidate - 10), score, rawKey)
  };
}

import { RANGE_PRESETS } from '../config/range-presets.v3963_1.js?v=3963_1';
import { normalizeRangePreset } from './range-policy.v3963_1.js?v=3963_1';
import { normalizeBandFocus } from './band-policy.js?v=3949_3';

export const SCORE_BAND_KEYS = ['upper', 'near', 'steady'];

export function normalizeBandKey(value, fallback = 'near') {
  const key = String(value || '').trim();
  if (key === 'up') return 'upper';
  if (key === 'main') return 'near';
  if (key === 'safe' || key === 'lower') return 'steady';
  return SCORE_BAND_KEYS.includes(key) ? key : normalizeBandFocus(fallback);
}

export function normalizeBandTitle(title, key) {
  const cleaned = String(title || '').trim();
  if (cleaned) return cleaned;
  return ({ upper: '稍高目标', near: '主要参考', steady: '低分侧补充' })[normalizeBandKey(key)] || '主要参考';
}

export function normalizeBandDesc(key, rawDesc = '') {
  const cleaned = String(rawDesc || '').trim();
  if (cleaned) return cleaned;
  return ({
    upper: '2026历史位次比孩子参考位置靠前，只适合少量放在前段核验。',
    near: '2026历史位次和孩子参考位置更接近，是专业初选时最该重点看的区间。',
    steady: '2026历史位次在孩子参考位置后侧，用来补充家庭可接受的后段选择。'
  })[normalizeBandKey(key)] || '按2026历史位次关系显示。';
}

function finiteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function rangeFromScores(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const pairs = [
    ['minScore', 'maxScore'],
    ['scoreMin', 'scoreMax'],
    ['min', 'max'],
    ['fromScore', 'toScore'],
    ['startScore', 'endScore']
  ];
  for (const [aKey, bKey] of pairs) {
    const a = finiteNumber(raw[aKey]);
    const b = finiteNumber(raw[bKey]);
    if (a !== null && b !== null) return { minScore: Math.min(a, b), maxScore: Math.max(a, b) };
  }
  return null;
}

function rangeFromText(text) {
  const s = String(text || '').trim();
  if (!s || /NaN|undefined|null|\[object Object\]/i.test(s)) return null;
  const m = s.match(/(-?\d+(?:\.\d+)?)\s*(?:-|—|–|~|至|到)\s*(-?\d+(?:\.\d+)?)/);
  if (!m) return null;
  const a = finiteNumber(m[1]);
  const b = finiteNumber(m[2]);
  if (a === null || b === null) return null;
  return { minScore: Math.min(a, b), maxScore: Math.max(a, b) };
}

function rangeFromDelta(raw, candidateScore) {
  if (!raw || typeof raw !== 'object') return null;
  const score = finiteNumber(candidateScore);
  const a = finiteNumber(raw.minDelta);
  const b = finiteNumber(raw.maxDelta);
  if (score === null || a === null || b === null) return null;
  return { minScore: Math.min(score + a, score + b), maxScore: Math.max(score + a, score + b) };
}

export function formatScoreBandRange(range, fallback = '输入分数后生成') {
  const a = finiteNumber(range?.minScore);
  const b = finiteNumber(range?.maxScore);
  if (a === null || b === null) return fallback;
  return `${Math.min(a, b)}-${Math.max(a, b)} 分`;
}

function countRecords(raw) {
  const records = Array.isArray(raw?.records) ? raw.records : [];
  const candidates = [raw?.count, raw?.total, raw?.displayedCount, records.length];
  for (const value of candidates) {
    const n = Number(value);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return 0;
}

function normalizePagination(raw = {}, records = []) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const offset = Math.max(0, Number.isFinite(Number(source.offset)) ? Math.floor(Number(source.offset)) : 0);
  const returned = Math.max(0, Number.isFinite(Number(source.returned)) ? Math.floor(Number(source.returned)) : records.length);
  const limit = Math.max(returned || 0, Number.isFinite(Number(source.limit)) ? Math.floor(Number(source.limit)) : records.length);
  const hasMore = Boolean(source.hasMore);
  const nextOffset = hasMore && Number.isFinite(Number(source.nextOffset))
    ? Math.max(offset + returned, Math.floor(Number(source.nextOffset)))
    : null;
  return { offset, limit, returned, hasMore, nextOffset, order: String(source.order || '') };
}

export function normalizeScoreBand(rawBand = {}, context = {}) {
  const raw = rawBand && typeof rawBand === 'object' ? rawBand : {};
  const key = normalizeBandKey(raw.key || context.key, context.key || 'near');
  const title = normalizeBandTitle(raw.title, key);
  const range = rangeFromScores(raw) || rangeFromText(raw.rangeText || raw.scoreRange || raw.label) || rangeFromDelta(raw, context.candidateScore);
  const records = Array.isArray(raw.records) ? raw.records : [];
  const rankRangeText = String(raw.rankRangeText || '').trim();
  const rangeText = rankRangeText || formatScoreBandRange(range);
  return {
    ...raw,
    key,
    title,
    desc: normalizeBandDesc(key, raw.desc),
    minScore: range ? range.minScore : null,
    maxScore: range ? range.maxScore : null,
    rankRangeText,
    rangeText,
    count: countRecords(raw),
    displayedCount: Number.isFinite(Number(raw.displayedCount)) ? Number(raw.displayedCount) : records.length,
    truncated: Boolean(raw.truncated),
    pagination: normalizePagination(raw.pagination, records),
    records
  };
}

function presetBands(rangePreset) {
  const presetKey = normalizeRangePreset(rangePreset || 'standard');
  return RANGE_PRESETS[presetKey]?.bands || RANGE_PRESETS.standard.bands;
}

export function normalizeScoreBandsObject(rawBands = {}, context = {}) {
  const preset = presetBands(context.rangePreset);
  const out = {};
  for (const key of SCORE_BAND_KEYS) {
    out[key] = normalizeScoreBand(rawBands?.[key] || preset[key] || {}, { ...context, key });
  }
  return out;
}

export function normalizeMajorBandsResponse(response = {}, context = {}) {
  const raw = response && typeof response === 'object' ? response : {};
  const meta = raw.meta || {};
  const candidateScore = context.candidateScore ?? meta.candidateScore;
  const rangePreset = normalizeRangePreset(context.rangePreset || meta.rangePreset || raw.rangePreset || 'standard');
  const bands = normalizeScoreBandsObject(raw.bands || meta.bands || {}, { candidateScore, rangePreset });
  const counts = {
    upper: bands.upper.count,
    near: bands.near.count,
    steady: bands.steady.count
  };
  counts.total = counts.upper + counts.near + counts.steady;
  return {
    ...raw,
    meta: { ...meta, candidateScore, rangePreset, bands },
    bands,
    counts: { ...(raw.counts || {}), ...counts }
  };
}

export function hasBadVisibleText(text) {
  return /NaN|undefined|null|\[object Object\]/.test(String(text || ''));
}

export function assertNoBadVisibleText(root = document.body) {
  const text = root?.innerText || '';
  const badWords = ['NaN', 'undefined', 'null', '[object Object]'];
  return badWords.filter(word => text.includes(word));
}

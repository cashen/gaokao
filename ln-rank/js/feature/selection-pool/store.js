import { buildKnowledgeReviewForRecord, matchLiaoningLocalStrongChain, matchLiaoningMajorTrajectory, resolveLocalContext } from '../../knowledge/index.js?v=3949_3';
import { resolveLocalStrengthMark } from '../major-pool/local-strength-view.js?v=3949_3';
import { resolveMajorUnderstanding } from '../../knowledge/major-understanding-resolver.js?v=3949_3';
const STORAGE_KEY = 'lnRank.selectionPool.physics2025.v3933_12';
const LEGACY_KEYS = [STORAGE_KEY, 'lnRank.selectionPool.physics2025.v3933_5', 'lnRank.selectionPool.physics2025.v3933_3', 'lnRank.selectionPool.physics2025.v3949', 'lnRank.selectionPool.physics2025.v3948', 'lnRank.selectionPool.physics2025.v3947', 'lnRank.selectionPool.physics2025.v3946', 'lnRank.selectionPool.physics2025.v3945', 'lnRank.selectionPool.physics2025.v3944', 'lnRank.selectionPool.physics2025.v3943', 'lnRank.selectionPool.physics2025.v3942', 'lnRank.selectionPool.physics2025.v3941', 'lnRank.selectionPool.physics2025.v3940', 'lnRankSelectionPool.v3940'];
const MAX_ITEMS = 112;

function nowIso() {
  try { return new Date().toISOString(); } catch { return ''; }
}

function cleanText(value, max = 120) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function toNum(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toRank(value, fallback = null) {
  const n = toNum(value, fallback);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function itemId(record = {}) {
  const explicit = cleanText(record.id, 180);
  if (explicit) return explicit;
  const parts = [record.school, record.major, record.score2025 ?? record.score, record.rank2025 ?? record.rank]
    .map(v => cleanText(v, 80));
  return parts.some(Boolean) ? parts.join('|') : '';
}

export function classifyPoolItem(item = {}) {
  const key = item.statusKey || '';
  const delta = toNum(item.scoreDelta, 0);

  if (['superRush', 'bigRush', 'midRush', 'smallRush'].includes(key) || delta >= 4) {
    return { group: 'rush', detail: '稍高目标', className: delta >= 16 ? 'high-rush' : 'light-rush', position: '稍高目标区' };
  }
  if (key === 'match' || key === 'steady' || (delta >= -15 && delta <= 3)) {
    return { group: 'stable', detail: '主要参考', className: delta >= -5 ? 'edge-stable' : 'stable', position: '主要参考区' };
  }
  return { group: 'safe', detail: '低分侧补充', className: delta <= -26 ? 'safe' : 'light-safe', position: '低分侧补充区' };
}

export function normalizePoolItem(record = {}, order = 1) {
  const id = itemId(record);
  const localStrongChain = record.localStrongChain?.matched ? record.localStrongChain : matchLiaoningLocalStrongChain(record);
  const trajectoryChain = record.trajectoryChain?.matched ? record.trajectoryChain : matchLiaoningMajorTrajectory(record);
  const localContext = record.localContext?.primary ? record.localContext : resolveLocalContext({ ...record, localStrongChain, trajectoryChain });
  const localStrengthMark = record.localStrengthMark?.matched ? record.localStrengthMark : resolveLocalStrengthMark({ ...record, localStrongChain, trajectoryChain, localContext });
  const majorUnderstanding = record.majorUnderstanding?.matched ? record.majorUnderstanding : resolveMajorUnderstanding(record);
  const base = {
    id,
    userOrder: order,
    addedAt: record.addedAt || nowIso(),
    locked: Boolean(record.locked),
    userNote: cleanText(record.userNote || '', 240),
    school: cleanText(record.school, 120),
    major: cleanText(record.major, 180),
    score: toNum(record.score2025 ?? record.score, null),
    score2025: toNum(record.score2025 ?? record.score, null),
    rank: toRank(record.rank2025 ?? record.rank, null),
    rank2025: toRank(record.rank2025 ?? record.rank, null),
    score2024: toNum(record.score2024, null),
    rank2024: toRank(record.rank2024, null),
    scoreDelta: toNum(record.scoreDelta, 0),
    statusKey: cleanText(record.statusKey, 40),
    statusLabel: cleanText(record.statusLabel, 40),
    position: cleanText(record.position, 60),
    band: cleanText(record.band, 40),
    displayLocation: cleanText(record.displayLocation, 80),
    geoEntity: cleanText(record.geoEntity, 120),
    natureLabel: cleanText(record.natureLabel || record.nature || '', 40),
    tuition: cleanText(record.tuition, 80),
    schoolNature: cleanText(record.schoolNature, 40),
    feeType: cleanText(record.feeType, 40),
    isPublicSchool: Boolean(record.isPublicSchool),
    isPrivateSchool: Boolean(record.isPrivateSchool),
    isSinoForeign: Boolean(record.isSinoForeign),
    isHighFee: Boolean(record.isHighFee),
    costRiskLevel: cleanText(record.costRiskLevel, 40),
    bottomLineTags: Array.isArray(record.bottomLineTags) ? record.bottomLineTags.map(x => cleanText(x, 40)).filter(Boolean).slice(0, 6) : [],
    schoolTags: Array.isArray(record.schoolTags) ? record.schoolTags.map(x => cleanText(x, 40)).filter(Boolean).slice(0, 8) : [],
    flags: Array.isArray(record.flags) ? record.flags.map(x => cleanText(x, 100)).filter(Boolean).slice(0, 10) : [],
    reviewPoints: [...new Set([...(Array.isArray(record.reviewPoints) ? record.reviewPoints : []), ...buildKnowledgeReviewForRecord({ ...record, localStrongChain }, { limit: 5 })].map(x => cleanText(x, 160)).filter(Boolean))].slice(0, 8),
    localStrongChain,
    trajectoryChain,
    localContext,
    localStrengthMark,
    majorUnderstanding,
    specialProject: record.specialProject || null,
    historyCompare: record.historyCompare || null,
    standardMajor: record.standardMajor || null,
    codes: record.codes || {},
    matchLevel: cleanText(record.matchLevel, 40),
    matchLabel: cleanText(record.matchLabel, 40),
    matchReason: cleanText(record.matchReason, 260),
    matchScore: toNum(record.matchScore, null)
  };
  return { ...base, poolBand: classifyPoolItem(base) };
}

function dedupeNormalized(items) {
  const seen = new Set();
  const out = [];
  for (const item of Array.isArray(items) ? items : []) {
    if (!item) continue;
    const normalized = normalizePoolItem(item, out.length + 1);
    if (!normalized.id || seen.has(normalized.id)) continue;
    seen.add(normalized.id);
    out.push(normalized);
    if (out.length >= MAX_ITEMS) break;
  }
  return out.map((x, index) => normalizePoolItem(x, index + 1));
}

function sortAndRepair(items) {
  const decorated = (Array.isArray(items) ? items : [])
    .map((item, index) => ({ item, index, order: Number(item && item.userOrder) }));
  decorated.sort((a, b) => {
    const ao = Number.isFinite(a.order) ? a.order : 9999 + a.index;
    const bo = Number.isFinite(b.order) ? b.order : 9999 + b.index;
    return ao - bo || a.index - b.index;
  });
  return dedupeNormalized(decorated.map(x => x.item));
}

function readRaw(key) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return { exists: false, items: [] };
    if (!raw) return { exists: true, items: [] };
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.items) ? parsed.items : []);
    return { exists: true, items };
  } catch {
    return { exists: true, items: [] };
  }
}

function normalizeInGivenOrder(items) {
  return dedupeNormalized(items);
}

export function getPoolItems() {
  const current = readRaw(STORAGE_KEY);
  if (current.exists) return sortAndRepair(current.items);

  for (const key of LEGACY_KEYS) {
    const legacy = readRaw(key);
    if (legacy.exists && legacy.items.length) {
      return savePoolItems(sortAndRepair(legacy.items));
    }
  }
  return [];
}

export function savePoolItems(items) {
  const repaired = normalizeInGivenOrder(items);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(repaired));
  window.dispatchEvent(new CustomEvent('lnrank-selection-pool-updated', { detail: { items: repaired } }));
  return repaired;
}

export function hasPoolItem(recordOrId) {
  const id = typeof recordOrId === 'string' ? recordOrId : itemId(recordOrId || {});
  return getPoolItems().some(item => item.id === id);
}

export function addPoolItem(record) {
  const items = getPoolItems();
  const id = itemId(record);
  if (!id) return { ok: false, message: '专业信息不完整，暂时无法放进报告。', items };
  if (items.some(item => item.id === id)) return { ok: false, message: '这个专业已经在报告里了。', items };
  if (items.length >= MAX_ITEMS) return { ok: false, message: `最多可以先选 ${MAX_ITEMS} 个专业放进报告。`, items };
  const next = savePoolItems([...items, normalizePoolItem(record, items.length + 1)]);
  return { ok: true, message: '已放进报告，可以继续添加，也可以生成报告。', items: next };
}

export function removePoolItem(id) {
  return savePoolItems(getPoolItems().filter(item => item.id !== id));
}

export function clearPoolItems() {
  return savePoolItems([]);
}

export function movePoolItem(id, direction) {
  const items = getPoolItems();
  const index = items.findIndex(item => item.id === id);
  if (index < 0) return items;
  const target = direction === 'up' ? index - 1 : index + 1;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return savePoolItems(next);
}

export function movePoolItemTo(id, targetIndex) {
  const items = getPoolItems();
  const index = items.findIndex(item => item.id === id);
  const bounded = Math.max(0, Math.min(items.length - 1, Number(targetIndex) || 0));
  if (index < 0 || index === bounded) return items;
  const next = [...items];
  const [item] = next.splice(index, 1);
  next.splice(bounded, 0, item);
  return savePoolItems(next);
}


export function movePoolItemByOffset(id, offset) {
  const items = getPoolItems();
  const index = items.findIndex(item => item.id === id);
  if (index < 0) return items;
  const target = Math.max(0, Math.min(items.length - 1, index + (Number(offset) || 0)));
  return movePoolItemTo(id, target);
}

export function reorderPoolItemByIndex(fromIndex, toIndex) {
  const items = getPoolItems();
  const from = Math.max(0, Math.min(items.length - 1, Number(fromIndex) || 0));
  const to = Math.max(0, Math.min(items.length - 1, Number(toIndex) || 0));
  if (!items.length || from === to) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return savePoolItems(next);
}

const BAND_ORDER = {
  '稍高目标': 10,
  '主要参考': 20,
  '低分侧补充': 30,
  '待核验': 40
};

export function sortPoolItems(mode = 'band') {
  const items = getPoolItems();
  if (mode === 'school') return savePoolItems([...items].sort((a, b) => a.school.localeCompare(b.school, 'zh-CN') || a.major.localeCompare(b.major, 'zh-CN')));
  if (mode === 'score') return savePoolItems([...items].sort((a, b) => (b.score2025 || 0) - (a.score2025 || 0)));
  return savePoolItems([...items].sort((a, b) => (BAND_ORDER[a.poolBand?.detail] || 99) - (BAND_ORDER[b.poolBand?.detail] || 99) || (b.score2025 || 0) - (a.score2025 || 0)));
}

export function getPoolOrderSignature(items = getPoolItems()) {
  return items.map((item, index) => `${index + 1}:${item.id}`).join('||');
}

export const SELECTION_POOL_MAX_ITEMS = MAX_ITEMS;

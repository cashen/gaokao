const STORAGE_KEY = 'lnRank.selectionPool.physics2025.v3941';
const LEGACY_KEYS = ['lnRank.selectionPool.physics2025.v3940', 'lnRank.selectionPool.physics2025', 'lnRankSelectionPool.v3940'];
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

export function itemId(record = {}) {
  return cleanText(record.id, 180) || [record.school, record.major, record.score2025 ?? record.score, record.rank2025 ?? record.rank]
    .map(v => cleanText(v, 80))
    .join('|');
}

export function classifyPoolItem(item = {}) {
  const key = item.statusKey || '';
  const delta = toNum(item.scoreDelta, 0);

  if (['superRush', 'bigRush'].includes(key) || delta >= 16) {
    return { group: 'rush', detail: '高冲', className: 'high-rush', position: '前段少量梦想位' };
  }
  if (['midRush', 'smallRush'].includes(key) || delta >= 4) {
    return { group: 'rush', detail: '小冲', className: 'light-rush', position: '前段冲刺区' };
  }
  if (key === 'match' || (delta >= -5 && delta <= 3)) {
    return { group: 'stable', detail: '边稳', className: 'edge-stable', position: '主体承接区' };
  }
  if (key === 'steady' || (delta >= -15 && delta <= -6)) {
    return { group: 'stable', detail: '稳妥', className: 'stable', position: '主体偏稳区' };
  }
  if (key === 'guard' || (delta >= -25 && delta <= -16)) {
    return { group: 'safe', detail: '小保', className: 'light-safe', position: '后段保底区' };
  }
  if (key === 'low' || (delta >= -40 && delta <= -26)) {
    return { group: 'safe', detail: '强保', className: 'safe', position: '后段强保区' };
  }
  return { group: 'safe', detail: '兜底', className: 'floor', position: '兜底确认区' };
}

export function normalizePoolItem(record = {}, order = 1) {
  const id = itemId(record);
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
    rank: toNum(record.rank2025 ?? record.rank, null),
    rank2025: toNum(record.rank2025 ?? record.rank, null),
    score2024: toNum(record.score2024, null),
    rank2024: toNum(record.rank2024, null),
    scoreDelta: toNum(record.scoreDelta, 0),
    statusKey: cleanText(record.statusKey, 40),
    statusLabel: cleanText(record.statusLabel, 40),
    position: cleanText(record.position, 60),
    band: cleanText(record.band, 40),
    displayLocation: cleanText(record.displayLocation, 80),
    geoEntity: cleanText(record.geoEntity, 120),
    natureLabel: cleanText(record.natureLabel || record.nature || '', 40),
    tuition: cleanText(record.tuition, 80),
    schoolTags: Array.isArray(record.schoolTags) ? record.schoolTags.map(x => cleanText(x, 40)).filter(Boolean).slice(0, 8) : [],
    flags: Array.isArray(record.flags) ? record.flags.map(x => cleanText(x, 80)).filter(Boolean).slice(0, 8) : [],
    historyCompare: record.historyCompare || null
  };
  return { ...base, poolBand: classifyPoolItem(base) };
}

function sortAndRepair(items) {
  return (Array.isArray(items) ? items : [])
    .filter(x => x && x.id)
    .sort((a, b) => (Number(a.userOrder) || 9999) - (Number(b.userOrder) || 9999))
    .slice(0, MAX_ITEMS)
    .map((x, index) => normalizePoolItem(x, index + 1));
}

function readRaw(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : (Array.isArray(parsed.items) ? parsed.items : []);
  } catch {
    return [];
  }
}

export function getPoolItems() {
  let items = readRaw(STORAGE_KEY);
  if (!items.length) {
    for (const key of LEGACY_KEYS) {
      items = readRaw(key);
      if (items.length) break;
    }
  }
  return sortAndRepair(items);
}

export function savePoolItems(items) {
  const repaired = sortAndRepair(items);
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
  if (!id) return { ok: false, message: '专业信息不完整，暂时无法加入自选池。', items };
  if (items.some(item => item.id === id)) return { ok: false, message: '该专业已在自选池中。', items };
  if (items.length >= MAX_ITEMS) return { ok: false, message: `自选池最多保留 ${MAX_ITEMS} 个专业志愿。`, items };
  const next = savePoolItems([...items, normalizePoolItem(record, items.length + 1)]);
  return { ok: true, message: '已加入自选池，可点右侧整理。', items: next };
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

export function getPoolStats(items = getPoolItems()) {
  const stats = {
    total: items.length,
    rushCount: 0,
    stableCount: 0,
    safeCount: 0,
    highRushCount: 0,
    floorCount: 0,
    byDetail: {},
    byCity: {},
    byMajorFamily: {}
  };
  for (const item of items) {
    const band = item.poolBand || classifyPoolItem(item);
    if (band.group === 'rush') stats.rushCount += 1;
    if (band.group === 'stable') stats.stableCount += 1;
    if (band.group === 'safe') stats.safeCount += 1;
    if (band.detail === '高冲') stats.highRushCount += 1;
    if (band.detail === '兜底') stats.floorCount += 1;
    stats.byDetail[band.detail] = (stats.byDetail[band.detail] || 0) + 1;
    const city = item.displayLocation || item.geoEntity || '未知地域';
    stats.byCity[city] = (stats.byCity[city] || 0) + 1;
    const family = majorFamily(item.major);
    stats.byMajorFamily[family] = (stats.byMajorFamily[family] || 0) + 1;
  }
  return stats;
}

export function majorFamily(major = '') {
  const s = String(major || '');
  if (/计算机|软件|人工智能|数据|网络|信息安全|物联网/.test(s)) return '计算机/人工智能';
  if (/电气|自动化|电子|通信|集成电路|微电子/.test(s)) return '电气电子信息';
  if (/临床|口腔|医学|药学|护理|中医/.test(s)) return '医药卫生';
  if (/会计|财务|金融|经济|工商|管理|审计/.test(s)) return '经管财经';
  if (/机械|车辆|能源|材料|土木|建筑|化工|环境/.test(s)) return '工科制造/土建化材';
  if (/法学|汉语|新闻|外语|英语|师范|教育/.test(s)) return '法学文教';
  return '其他专业';
}

export const SELECTION_POOL_MAX_ITEMS = MAX_ITEMS;

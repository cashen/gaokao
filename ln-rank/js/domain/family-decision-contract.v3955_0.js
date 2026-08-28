import { buildTongxueSchoolHref } from '../../../shared/resources/schools/school-resource-center.js?v=3955_0';

export const FAMILY_DECISION_VERSION = 'v3.9.55.0';

export const FAMILY_DECISION_STORAGE = Object.freeze({
  candidateScore: 'lnRank.selectionPool.candidateScore',
  candidateScoreVersion: 'lnRank.selectionPool.candidateScore.v3951_0',
  selectionPool: 'lnRank.selectionPool.lnPhysics.2026.v3951'
});

export const FAMILY_LANGUAGE = Object.freeze({
  selectedMajor: '已选专业',
  pendingReview: '待确认',
  addSelected: '加入已选专业',
  inspectFit: '看看是否适合',
  report: '生成家庭复核报告',
  historicalPosition: '最低投档位置',
  publicReviews: '公开评论',
  unknown2027: '2027招生计划、选科要求、学费和校区安排仍需以正式资料为准。'
});

function parseScore(value) {
  const n = Number(String(value == null ? '' : value).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

function readJson(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function readFamilyCandidateScore() {
  try {
    return parseScore(
      localStorage.getItem(FAMILY_DECISION_STORAGE.candidateScore)
      || localStorage.getItem(FAMILY_DECISION_STORAGE.candidateScoreVersion)
      || ''
    );
  } catch {
    return null;
  }
}

export function readFamilySelectionItems() {
  const parsed = readJson(FAMILY_DECISION_STORAGE.selectionPool);
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed?.items)) return parsed.items;
  return [];
}

export function familyItemNeedsReview(item = {}) {
  if (item.historicalOnly) return true;
  if (Array.isArray(item.flags) && item.flags.length) return true;
  if (item.specialProject?.hasSpecialProject) return true;
  if (item.isSinoForeign || item.isHighFee) return true;
  if (String(item.costRiskLevel || '').trim()) return true;
  const text = [
    item.school,
    item.major,
    item.geoEntity,
    item.displayLocation,
    item.tuition,
    item.matchReason,
    ...(Array.isArray(item.reviewPoints) ? item.reviewPoints : []),
    ...(Array.isArray(item.bottomLineTags) ? item.bottomLineTags : [])
  ].filter(Boolean).join(' ');
  return /中外|合作办学|高收费|较高收费|学费|费用|校区|分校|定向|专项|预科|体检|色盲|色弱|培养方式|实验班|试验班|分流|本博|本研/.test(text);
}

export function countFamilyPendingItems(items = readFamilySelectionItems()) {
  return (Array.isArray(items) ? items : []).filter(familyItemNeedsReview).length;
}

export function resolveFamilyNextAction({ score = readFamilyCandidateScore(), items = readFamilySelectionItems() } = {}) {
  const selectedCount = Array.isArray(items) ? items.length : 0;
  const pendingCount = countFamilyPendingItems(items);
  if (!score) return { key: 'score', label: '先确认孩子目前的参考分数', href: '/ln-rank/' };
  if (!selectedCount) return { key: 'select', label: '圈出一批值得继续讨论的专业', href: '/ln-rank/' };
  if (pendingCount) return { key: 'review', label: '检查已选专业中需要确认的地方', href: '/ln-rank/selection-pool.html' };
  return { key: 'report', label: '生成家庭复核报告', href: '/ln-rank/selection-pool.html' };
}

export function buildTongxueHref(input = {}) {
  return buildTongxueSchoolHref(input);
}

export function tongxueEntryCopy(entityType = '') {
  if (entityType === 'branch_school') return '看看这所分校的公开评论';
  if (entityType === 'admission_campus' || entityType === 'ordinary_campus') return '看看这个校区的公开评论';
  return '看看这所学校的公开评论';
}

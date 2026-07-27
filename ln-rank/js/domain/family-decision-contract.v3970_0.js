import { buildTongxueSchoolHref } from '../../../shared/resources/schools/school-resource-center.js?v=3955_0';

export const FAMILY_DECISION_VERSION = 'family-decision-v3970_0';

export const FAMILY_DECISION_STORAGE = Object.freeze({
  candidateScore: 'lnRank.selectionPool.candidateScore',
  candidateScoreVersion: 'lnRank.selectionPool.candidateScore.v3951_0',
  selectionPool: 'lnRank.selectionPool.lnPhysics.2026.v3951'
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

export function buildFamilyStatus({ score = readFamilyCandidateScore(), items = readFamilySelectionItems() } = {}) {
  const selectedCount = Array.isArray(items) ? items.length : 0;
  const pendingCount = countFamilyPendingItems(items);
  const next = resolveFamilyNextAction({ score, items });
  return Object.freeze({
    score,
    selectedCount,
    pendingCount,
    nextActionKey: next.key,
    nextActionHref: next.href
  });
}

export function resolveFamilyNextAction({ score = readFamilyCandidateScore(), items = readFamilySelectionItems() } = {}) {
  const selectedCount = Array.isArray(items) ? items.length : 0;
  const pendingCount = countFamilyPendingItems(items);
  if (!score) return Object.freeze({ key: 'confirm-score', href: '/ln-rank/' });
  if (!selectedCount) return Object.freeze({ key: 'build-family-plan', href: '/ln-rank/' });
  if (pendingCount) return Object.freeze({ key: 'review-family-plan', href: '/ln-rank/selection-pool.html#family-review' });
  return Object.freeze({ key: 'create-family-plan-report', href: '/ln-rank/selection-pool.html#family-review' });
}

export function buildTongxueHref(input = {}) {
  return buildTongxueSchoolHref(input);
}

export function tongxueEntryCopy(entityType = '') {
  if (entityType === 'branch_school') return '看看这所分校的公开评论';
  if (entityType === 'admission_campus' || entityType === 'ordinary_campus') return '看看这个校区的公开评论';
  return '看看这所学校的公开评论';
}

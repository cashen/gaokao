import { LIAONING_CAMPUS_MAJOR_KB } from './liaoning-campus-major-kb.generated.js';
import { resolveSchoolProfile } from '../../../shared/resources/schools/school-profile-center.js';

function textOf(item = {}) {
  return `${item.school || ''} ${item.major || ''} ${Array.isArray(item.schoolTags) ? item.schoolTags.join(' ') : ''} ${item.displayLocation || ''}`;
}
function includesAny(text, arr = []) { return arr.some(x => text.includes(x)); }
function ruleMatches(rule, item = {}) {
  const m = rule.match || {};
  const text = textOf(item);
  const major = String(item.major || '');
  if (m.allOthers) return true;
  if (m.schoolOrMajorAny && includesAny(text, m.schoolOrMajorAny)) return true;
  if (m.any && includesAny(major, m.any)) return true;
  if (m.majors && m.majors.some(x => major === x || major.includes(x))) return true;
  return false;
}
export function getCampusForItem(item = {}) {
  const schoolText = String(item.school || '');
  const profile = item.schoolProfile || resolveSchoolProfile(schoolText, item);
  const names = [
    schoolText,
    profile?.school,
    profile?.standardSchoolName,
    profile?.parentSchoolName
  ].filter(Boolean);
  const school = (LIAONING_CAMPUS_MAJOR_KB.schools || []).find(row => names.some(name => name.includes(row.school) || row.school.includes(name)));
  if (!school) return null;
  const rule = (school.rules || []).find(r => ruleMatches(r, item));
  const found = rule || school.fallback || null;
  if (!found) return null;
  return {
    school: school.school,
    schoolEntityId: profile?.entityId || '',
    schoolCanonical: profile?.standardSchoolName || profile?.school || school.school,
    schoolEntityType: profile?.entityType || 'official_school',
    defaultCity: school.defaultCity,
    campusName: found.campusName || '',
    city: found.city || '',
    displayTag: found.displayTag || '校区需核验',
    reviewSummary: found.reviewSummary || '该校存在多校区或办学地点差异，需按当年招生计划备注和招生章程核验。',
    riskLevel: school.riskLevel || 'medium',
    sourceYear: found.sourceYear || null,
    sourceLevel: found.sourceLevel || 'B'
  };
}
export function getCampusReviewSummaryForItems(items = [], { limit = 5 } = {}) {
  const seen = new Map();
  for (const item of Array.isArray(items) ? items : []) {
    const campus = getCampusForItem(item);
    if (!campus) continue;
    const key = `${campus.schoolEntityId || campus.school}|${campus.displayTag}|${campus.reviewSummary}`;
    if (!seen.has(key)) seen.set(key, { ...campus, count: 0, examples: [] });
    const entry = seen.get(key);
    entry.count += 1;
    if (entry.examples.length < 3) entry.examples.push(`${item.school || campus.school}｜${item.major || '专业待核验'}`);
  }
  return [...seen.values()].slice(0, limit);
}
export function formatCampusReviewLine(entry) {
  if (!entry) return '';
  const count = entry.count ? `${entry.count} 条` : '若干条';
  return `${entry.displayTag}：涉及 ${count}专业。${entry.reviewSummary}`;
}
export function getCampusDiagnostics() {
  return {
    ok: true,
    version: LIAONING_CAMPUS_MAJOR_KB.version,
    schoolCount: LIAONING_CAMPUS_MAJOR_KB.schools.length,
    identityOwner: 'shared/resources/schools/school-profile-center.js'
  };
}

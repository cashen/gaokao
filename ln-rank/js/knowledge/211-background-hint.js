/* v3.9.33.14 全国 211 院校背景分层提示合同
 * 只在“学校 + 本科专业 + 已核验证据”同时命中时显示。
 */
import { candidateMajorNames, normalizeMajorName } from './major-match-contract.js?v=3949_0';
import { ALL_211_SCHOOL_BACKGROUND_INDEX } from '../../kb/211-mainline/211-school-background.generated.js?v=3949_0';

function clean(value, max = 160) { return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, max); }
function normalizeSchoolStrict(value = '') { return clean(value, 160).replace(/\(/g, '（').replace(/\)/g, '）').replace(/\s+/g, ''); }
function normalizeMajorLoose(value = '') { return normalizeMajorName(value).replace(/专业类$/, '类').replace(/专业$/, ''); }
function levelRank(level) { return level === 'primary' ? 3 : level === 'secondary' ? 2 : level === 'trajectory' ? 1 : 0; }
function compact(value = '') { return clean(value, 80).replace(/方向$/, '') || '专业背景'; }
function reviewPoints(points = []) { const arr = (Array.isArray(points) ? points : []).map(x => clean(x, 30)).filter(Boolean); return (arr.length ? arr : ['培养方案','招生章程','课程方向']).slice(0,3); }
function sameSchool(school, recordSchool) {
  const target = normalizeSchoolStrict(recordSchool);
  if (!target) return false;
  const names = [school.school, ...(Array.isArray(school.aliases) ? school.aliases : [])].map(normalizeSchoolStrict).filter(Boolean);
  return names.some(n => target === n || target.startsWith(n + '（') || target.startsWith(n + '('));
}
function sameMajor(ruleMajor, candidateSet) {
  const rule = normalizeMajorLoose(ruleMajor);
  if (!rule) return false;
  for (const name of candidateSet || []) {
    const n = normalizeMajorLoose(name);
    if (!n) continue;
    if (n === rule) return true;
    if (rule.endsWith('类') && n.includes(rule.replace(/类$/, ''))) return true;
    if (n.endsWith('类') && rule.includes(n.replace(/类$/, ''))) return true;
    if (rule.length >= 4 && n.includes(rule)) return true;
    if (n.length >= 4 && rule.includes(n)) return true;
  }
  return false;
}
export function get211BackgroundHint(record = {}) {
  try {
    const schoolName = clean(record.school || record.schoolName || '', 120);
    const names = candidateMajorNames(record);
    if (!schoolName || !names.size) return { visible: false, reason: 'missing-school-or-major' };
    const school = ALL_211_SCHOOL_BACKGROUND_INDEX.schools.find(s => sameSchool(s, schoolName));
    if (!school) return { visible: false, reason: 'not-211-kb' };
    if (school.isMilitarySpecial) return { visible: false, reason: 'military-special-hidden', specialBoundary: school.specialBoundary };
    const hits = [];
    for (const line of Array.isArray(school.directions) ? school.directions : []) {
      if (!line?.canTriggerFrontend) continue;
      if ((Array.isArray(line.majors) ? line.majors : []).some(m => sameMajor(m, names))) hits.push(line);
    }
    if (!hits.length) return { visible: false, reason: 'no-major-evidence', school: school.school };
    hits.sort((a,b) => levelRank(b.level) - levelRank(a.level));
    const hit = hits[0];
    return {
      visible: true,
      source: '211-mainline-kb',
      school: school.school,
      level: hit.level || 'trajectory',
      label: hit.displayLabel || '方向提醒',
      direction: compact(hit.direction),
      text: `${hit.displayLabel || '方向提醒'}｜${compact(hit.direction)}`,
      reviewPoints: reviewPoints(hit.reviewPoints),
      canTriggerFrontend: true,
      boundary: ALL_211_SCHOOL_BACKGROUND_INDEX.copy.boundary
    };
  } catch (error) {
    console.warn('[ln-rank] 211 background hint failed', { school: record?.school, major: record?.major, message: error?.message || String(error) });
    return { visible: false, reason: 'resolver-error' };
  }
}
export function has211BackgroundHint(record = {}) { return get211BackgroundHint(record).visible === true; }

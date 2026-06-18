/* v3.9.33.12 省内专业背景分层提示合同
 * 目标：不是所有省内院校都显示背景提示，也不是有省内背景却完全空白。
 * 层级：不显示 / 方向提醒 / 本校相关 / 本校方向。
 */
import { matchLiaoningLocalStrongChain } from './liaoning-local-strong-chain.js?v=3949_0';
import { matchLiaoningMajorTrajectory } from './liaoning-major-trajectory-chain.js?v=3949_0';
import { normalizeMajorName, normalizeSchoolName, candidateMajorNames } from './major-match-contract.js?v=3949_0';
import { LIAONING_SCHOOL_MAINLINE_EVIDENCE } from '../../kb/local-mainline/school-mainline-evidence.generated.js?v=3949_0';
import { LOCAL_MAINLINE_MAJOR_ALIAS_BRIDGE } from '../../kb/local-mainline/local-mainline-major-alias-bridge.generated.js?v=3949_0';

const LIAONING_PROVINCE = '辽宁';
const OUT_OF_SCOPE_CAMPUSES = [/秦皇岛/, /威海/, /珠海/, /深圳/, /苏州/, /雄安/];
const REVIEW_FALLBACK = ['课程方向', '培养方案', '招生章程'];

function clean(value, max = 120) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, max);
}
function compactDirection(value = '') {
  return clean(value, 80).replace(/方向$/, '').replace(/与过程控制$/, '') || '专业背景';
}
function reviewPoints(points = [], max = 3) {
  const arr = (Array.isArray(points) ? points : []).map(x => clean(x, 30)).filter(Boolean);
  return (arr.length ? arr : REVIEW_FALLBACK).slice(0, max);
}
function displayLabelFromLevel(level, fallback = '') {
  if (fallback) return fallback;
  if (level === 'primary' || level === 'core') return '本校方向';
  if (level === 'secondary' || level === 'support') return '本校相关';
  return '方向提醒';
}
function kindFromLabel(label = '') {
  if (label.includes('本校方向')) return 'primary';
  if (label.includes('本校相关')) return 'secondary';
  return 'trajectory';
}
function isRecordInLiaoning(record = {}) {
  const fields = [record.province, record.schoolProvince, record.displayLocation, record.location, record.city, record.geoEntity, record.regionLabel]
    .map(x => clean(x, 80)).filter(Boolean).join(' ');
  const school = clean(record.school || record.schoolName || '', 100);
  if (OUT_OF_SCOPE_CAMPUSES.some(re => re.test(school) || re.test(fields))) return false;
  if (fields.includes(LIAONING_PROVINCE)) return true;
  const s = normalizeSchoolName(school);
  return LIAONING_SCHOOL_MAINLINE_EVIDENCE.some(x => normalizeSchoolName(x.school) === s && x.province === LIAONING_PROVINCE);
}
function sameSchool(ruleSchool, school) {
  const a = normalizeSchoolName(ruleSchool);
  const b = normalizeSchoolName(school);
  if (!a || !b) return false;
  if (OUT_OF_SCOPE_CAMPUSES.some(re => re.test(school))) return false;
  // local-mainline 前台提示要求更严：正式学校名精确匹配；校区另建显式规则，避免“东北大学秦皇岛”误用辽宁省内证据。
  return a === b;
}
function sameMajor(ruleMajor, names) {
  const target = normalizeMajorName(ruleMajor);
  return Boolean(target && names.has(target));
}
function fromStrongChain(hit = {}) {
  if (!hit?.matched) return null;
  const label = displayLabelFromLevel(hit.depth);
  const level = kindFromLabel(label);
  return {
    visible: true,
    source: 'local-strong-chain',
    level,
    label,
    direction: compactDirection(hit.chainName),
    text: `${label}｜${compactDirection(hit.chainName)}`,
    reviewPoints: reviewPoints(hit.reviewPoints),
    confidence: hit.confidence || 'ruleName',
    canTriggerFrontend: true,
    boundary: hit.boundary || '只用于家庭复核，不代表录取判断。'
  };
}
function fromTrajectory(hit = {}) {
  if (!hit?.matched) return null;
  const direction = compactDirection(hit.cardShort || hit.trajectoryName || hit.chainName);
  return {
    visible: true,
    source: 'trajectory-chain',
    level: 'trajectory',
    label: '方向提醒',
    direction,
    text: `方向提醒｜${direction}`,
    reviewPoints: reviewPoints(hit.reviewPoints),
    confidence: hit.confidence || 'trajectory',
    canTriggerFrontend: true,
    boundary: hit.boundary || '只用于家庭复核，不代表录取判断。'
  };
}
function fromKb(record = {}, names) {
  const schoolName = clean(record.school || record.schoolName || '', 100);
  const school = LIAONING_SCHOOL_MAINLINE_EVIDENCE.find(x => x.province === LIAONING_PROVINCE && sameSchool(x.school, schoolName));
  if (!school) return null;
  for (const line of Array.isArray(school.mainlines) ? school.mainlines : []) {
    if (!line?.canTriggerFrontend) continue;
    const majors = Array.isArray(line.majors) ? line.majors : [];
    if (!majors.some(m => sameMajor(m, names))) continue;
    const label = displayLabelFromLevel(line.level, line.displayLabel);
    const direction = compactDirection(line.direction);
    return {
      visible: true,
      source: 'local-mainline-kb',
      level: line.level || kindFromLabel(label),
      label,
      direction,
      text: `${label}｜${direction}`,
      reviewPoints: reviewPoints(line.reviewPoints),
      confidence: 'kb-major-exact',
      canTriggerFrontend: true,
      boundary: '只用于家庭复核，不代表录取判断。'
    };
  }
  return null;
}
function fromAliasBridge(record = {}, names) {
  const schoolName = clean(record.school || record.schoolName || '', 100);
  for (const bridge of LOCAL_MAINLINE_MAJOR_ALIAS_BRIDGE) {
    if (!bridge?.canTriggerFrontend) continue;
    if (!sameSchool(bridge.school, schoolName)) continue;
    if (!(Array.isArray(bridge.majors) ? bridge.majors : []).some(m => sameMajor(m, names))) continue;
    const label = displayLabelFromLevel(bridge.level, bridge.displayLabel);
    const direction = compactDirection(bridge.direction);
    return {
      visible: true,
      source: 'explicit-alias-bridge',
      level: bridge.level || kindFromLabel(label),
      label,
      direction,
      text: `${label}｜${direction}`,
      reviewPoints: reviewPoints(bridge.reviewPoints),
      confidence: bridge.confidence || 'explicit-alias-bridge',
      canTriggerFrontend: true,
      boundary: bridge.boundary || '只用于家庭复核，不代表录取判断。'
    };
  }
  return null;
}

export function getLocalBackgroundHint(record = {}) {
  try {
    const school = clean(record.school || record.schoolName || '', 100);
    const names = candidateMajorNames(record);
    if (!school || !names.size) return { visible: false, reason: 'missing-school-or-major' };
    if (!isRecordInLiaoning(record)) return { visible: false, reason: 'not-liaoning-school' };

    const strong = fromStrongChain(record?.localStrongChain?.matched ? record.localStrongChain : matchLiaoningLocalStrongChain(record));
    if (strong?.visible) return strong;

    const kb = fromKb(record, names);
    if (kb?.visible) return kb;

    const alias = fromAliasBridge(record, names);
    if (alias?.visible) return alias;

    const trajectory = fromTrajectory(record?.trajectoryChain?.matched ? record.trajectoryChain : matchLiaoningMajorTrajectory(record));
    if (trajectory?.visible) return trajectory;

    return { visible: false, reason: 'no-front-evidence' };
  } catch (error) {
    console.warn('[ln-rank] local background hint failed', { school: record?.school, major: record?.major, message: error?.message || String(error) });
    return { visible: false, reason: 'resolver-error' };
  }
}

export function hasLocalBackgroundHint(record = {}) {
  return getLocalBackgroundHint(record).visible === true;
}

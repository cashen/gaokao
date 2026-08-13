import { YEAR_CALIBER_KB, isPublicBottomLineVisible } from './kb/year-caliber-kb.generated.js';
import { resolveSchoolProfile } from '../../shared/resources/schools/school-profile-center.js';

function text(value) { return String(value == null ? '' : value).trim(); }
function numFromText(value) {
  const m = text(value).replace(/,/g, '').match(/\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

export const BOTTOMLINE_MODES = {
  all: {
    label: '全部院校',
    help: '不过滤办学性质和费用类型，用于先看全貌。'
  },
  public_first: {
    label: '公办优先',
    help: '优先展示已确认的公办普通收费项目，不隐藏其他候选。'
  },
  public_regular_only: {
    label: '只看公办普通',
    help: '只保留已确认的公办普通收费项目；办学性质或费用未知的记录进入待确认，不冒充普通收费。'
  },
  exclude_sino: {
    label: '排除中外/高收费',
    help: '只移除中外合作和高收费项目，保留其他办学性质，避免把“取消中外”误解成“只看公办”。'
  },
  public_include_sino: {
    label: '公办含中外/高收费',
    help: '只保留已确认的公办学校项目，允许中外合作或高收费专业；费用和培养模式仍需核验。'
  }
};

export function normalizeBottomLineMode(value) {
  const key = text(value);
  return Object.prototype.hasOwnProperty.call(BOTTOMLINE_MODES, key) ? key : 'all';
}

export function inferSchoolNature(record = {}) {
  const profile = record.schoolProfile || resolveSchoolProfile(record.school || record.schoolName || '', record);
  if (profile?.natureType === 'private') return 'private';
  if (profile?.natureType === 'public' || profile?.natureType === 'cooperative') return 'public';

  const explicit = text(record.natureType || record.schoolNature);
  if (explicit === 'private') return 'private';
  if (explicit === 'public' || explicit === 'cooperative') return 'public';

  const s = [record.schoolNature, record.natureLabel, record.nature, record.natureRaw, record.schoolTags, record.flags]
    .flat()
    .map(text)
    .join(' ');
  if (/民办|独立学院|独立|民办\/独立/.test(s)) return 'private';
  if (/公办/.test(s)) return 'public';
  return 'unknown';
}

export function inferFeeType(record = {}) {
  const s = [record.feeType, record.cooperationType, record.major, record.majorName, record.school, record.schoolName, record.tuition, record.tuitionText, record.flags, record.schoolTags]
    .flat()
    .map(text)
    .join(' ');
  if (/中外|合作办学|中英|中美|中澳|中日|国际本科|国际班/.test(s)) return 'sino_foreign';
  if (/高收费|国际项目|较高收费|学费较高|单列/.test(s)) return 'high_fee';
  const fee = numFromText(record.tuition || record.tuitionText || '');
  if (fee != null && fee >= 18000) return 'high_fee';
  if (fee != null && fee > 0) return 'normal';
  return 'unknown';
}

export function enrichBottomLineFields(record = {}) {
  const schoolNature = inferSchoolNature(record);
  const feeType = inferFeeType(record);
  const isPublicSchool = schoolNature === 'public';
  const isPrivateSchool = schoolNature === 'private';
  const isSinoForeign = feeType === 'sino_foreign';
  const isHighFee = feeType === 'high_fee' || feeType === 'sino_foreign';
  const costRiskLevel = feeType === 'normal' ? 'normal' : (isHighFee ? 'high' : 'unknown');
  const bottomLineTags = [];
  if (schoolNature === 'public' && feeType === 'normal') bottomLineTags.push('公办普通');
  if (schoolNature === 'public' && feeType === 'sino_foreign') bottomLineTags.push('公办中外');
  if (schoolNature === 'public' && feeType === 'high_fee') bottomLineTags.push('公办高收费');
  if (schoolNature === 'private') bottomLineTags.push('民办/独立');
  if (schoolNature === 'unknown') bottomLineTags.push('办学性质待核验');
  if (feeType === 'unknown') bottomLineTags.push('费用待核验');
  return {
    schoolNature,
    feeType,
    isPublicSchool,
    isPrivateSchool,
    isSinoForeign,
    isHighFee,
    costRiskLevel,
    bottomLineTags
  };
}

export function getBottomLineEligibility(record = {}, mode = 'all') {
  const m = normalizeBottomLineMode(mode);
  const b = record.schoolNature && record.feeType ? record : { ...record, ...enrichBottomLineFields(record) };
  if (m === 'all' || m === 'public_first') return { status: 'pass', reason: 'mode_does_not_exclude', record: b };
  if (m === 'exclude_sino') {
    return ['sino_foreign', 'high_fee'].includes(b.feeType)
      ? { status: 'fail', reason: 'sino_or_high_fee_excluded', record: b }
      : { status: 'pass', reason: 'sino_or_high_fee_only_filter', record: b };
  }
  if (m === 'public_regular_only') {
    if (b.schoolNature === 'private' || b.feeType === 'sino_foreign' || b.feeType === 'high_fee') {
      return { status: 'fail', reason: 'not_confirmed_public_regular', record: b };
    }
    if (b.schoolNature === 'unknown' || b.feeType === 'unknown') {
      return { status: 'unresolved', reason: 'nature_or_fee_unknown', record: b };
    }
    return { status: b.schoolNature === 'public' && b.feeType === 'normal' ? 'pass' : 'fail', reason: 'confirmed_public_regular', record: b };
  }
  if (m === 'public_include_sino') {
    if (b.schoolNature === 'private') return { status: 'fail', reason: 'private_school', record: b };
    if (b.schoolNature === 'unknown') return { status: 'unresolved', reason: 'school_nature_unknown', record: b };
    return { status: b.schoolNature === 'public' ? 'pass' : 'fail', reason: 'confirmed_public_school', record: b };
  }
  return { status: 'pass', reason: 'fallback', record: b };
}

export function passBottomLineMode(record = {}, mode = 'all') {
  return getBottomLineEligibility(record, mode).status === 'pass';
}

export function getBottomLineSortWeight(record = {}, mode = 'all') {
  const m = normalizeBottomLineMode(mode);
  if (m !== 'public_first') return 0;
  const b = record.schoolNature && record.feeType ? record : { ...record, ...enrichBottomLineFields(record) };
  if (b.schoolNature === 'public' && b.feeType === 'normal') return 30;
  if (b.schoolNature === 'public') return 15;
  if (b.schoolNature === 'unknown') return 3;
  return 0;
}

export function shouldShowBottomLineControls(candidateScore) {
  return isPublicBottomLineVisible(candidateScore);
}

export function getBottomLineYearPolicy() {
  return YEAR_CALIBER_KB.publicBottomLinePolicy;
}

export function bottomLineModeSummary(mode) {
  const m = normalizeBottomLineMode(mode);
  return { mode: m, ...(BOTTOMLINE_MODES[m] || BOTTOMLINE_MODES.all), yearPolicy: YEAR_CALIBER_KB.publicBottomLinePolicy };
}

export function summarizeBottomLine(items = [], mode = 'all') {
  const summary = {
    mode: normalizeBottomLineMode(mode),
    modeLabel: bottomLineModeSummary(mode).label,
    total: 0,
    publicRegularCount: 0,
    publicSinoOrHighFeeCount: 0,
    privateLikeCount: 0,
    unknownCount: 0,
    filteredOutCount: 0,
    unresolvedCount: 0
  };
  for (const raw of Array.isArray(items) ? items : []) {
    const item = raw.schoolNature && raw.feeType ? raw : { ...raw, ...enrichBottomLineFields(raw) };
    summary.total += 1;
    if (item.schoolNature === 'public' && item.feeType === 'normal') summary.publicRegularCount += 1;
    else if (item.schoolNature === 'public' && ['sino_foreign', 'high_fee'].includes(item.feeType)) summary.publicSinoOrHighFeeCount += 1;
    else if (item.schoolNature === 'private') summary.privateLikeCount += 1;
    else summary.unknownCount += 1;
    const eligibility = getBottomLineEligibility(item, mode);
    if (eligibility.status === 'fail') summary.filteredOutCount += 1;
    if (eligibility.status === 'unresolved') summary.unresolvedCount += 1;
  }
  return summary;
}

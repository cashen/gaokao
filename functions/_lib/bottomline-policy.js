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
    help: '优先展示公办普通收费项目，不隐藏其他候选。'
  },
  public_regular_only: {
    label: '只看公办普通',
    help: '只保留公办普通收费项目，排除民办、独立学院、公办中外合作和高收费。'
  },
  public_include_sino: {
    label: '公办含中外/高收费',
    help: '只保留公办学校项目，但允许公办中外合作或高收费专业，需核验费用与培养模式。'
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

export function passBottomLineMode(record = {}, mode = 'all') {
  const m = normalizeBottomLineMode(mode);
  if (m === 'all' || m === 'public_first') return true;
  const b = record.schoolNature && record.feeType ? record : { ...record, ...enrichBottomLineFields(record) };
  if (m === 'public_regular_only') return b.schoolNature === 'public' && b.feeType !== 'sino_foreign' && b.feeType !== 'high_fee';
  if (m === 'public_include_sino') return b.schoolNature === 'public';
  return true;
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
    filteredOutCount: 0
  };
  for (const raw of Array.isArray(items) ? items : []) {
    const item = raw.schoolNature && raw.feeType ? raw : { ...raw, ...enrichBottomLineFields(raw) };
    summary.total += 1;
    if (item.schoolNature === 'public' && item.feeType === 'normal') summary.publicRegularCount += 1;
    else if (item.schoolNature === 'public') summary.publicSinoOrHighFeeCount += 1;
    else if (item.schoolNature === 'private') summary.privateLikeCount += 1;
    else summary.unknownCount += 1;
    if (!passBottomLineMode(item, mode)) summary.filteredOutCount += 1;
  }
  return summary;
}

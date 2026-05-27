function text(value) { return String(value == null ? '' : value).trim(); }
function num(value) { const n = Number(value); return Number.isFinite(n) ? n : null; }
export function normalizeRecord(raw) {
  return {
    id: text(raw.id) || `${text(raw.school)}-${text(raw.major)}-${raw.score2025}-${raw.rank2025}`,
    school: text(raw.school || raw.schoolName || raw['院校名称'] || raw['学校名称']),
    major: text(raw.major || raw.majorName || raw['专业名称']),
    score: num(raw.score2025 ?? raw.minScore ?? raw.score ?? raw['最低分']),
    rank: num(raw.rank2025 ?? raw.minRank ?? raw.rank ?? raw['最低位次']),
    lnArea: text(raw.lnArea || ''),
    region: text(raw.lnArea || ''),
    province: text(raw.schoolProvince || raw.province || raw['省份']),
    city: text(raw.schoolCity || raw.city || raw['城市']),
    nature: text(raw.schoolNatureLabel || raw.nature || ''),
    natureRaw: text(raw.schoolNatureLabel || raw.nature || ''),
    tuition: text(raw.tuition2025 || raw.tuition || ''),
    flags: Array.isArray(raw.riskFlags) ? raw.riskFlags.slice(0, 4) : []
  };
}
export function rawScore(record) { return num(record?.score2025 ?? record?.minScore ?? record?.score ?? record?.['最低分']); }
export function rawLnArea(record) { return text(record?.lnArea ?? record?.schoolProvince ?? record?.province ?? record?.['省份']); }
export function rawSchool(record) { return text(record?.school ?? record?.schoolName ?? record?.['院校名称'] ?? record?.['学校名称']); }
export function rawMajor(record) { return text(record?.major ?? record?.majorName ?? record?.['专业名称']); }

import { extractYearScore, extractYearRank, buildHistoryScore } from './history-score-engine.js';
import { normalizeLocation } from './location-normalizer.js';

function text(value) { return String(value == null ? '' : value).trim(); }
function num(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const s = String(value).replace(/,/g, '').replace(/，/g, '').replace(/\s+/g, '');
  const matched = s.match(/-?\d+(?:\.\d+)?/);
  if (!matched) return null;
  const n = Number(matched[0]);
  return Number.isFinite(n) ? n : null;
}

function score2025(raw) {
  return extractYearScore(raw, 2025) ?? num(raw.score2025 ?? raw.minScore ?? raw.score ?? raw['最低分']);
}

function positiveRank(value) {
  const n = num(value);
  return n != null && n > 0 ? n : null;
}

function rank2025(raw) {
  const y = extractYearRank(raw, 2025);
  if (y != null && y > 0) return y;
  return positiveRank(raw.rank2025 ?? raw.minRank ?? raw.rank ?? raw['最低位次']);
}

export function normalizeRecord(raw) {
  const school = text(raw.school || raw.schoolName || raw['院校名称'] || raw['学校名称']);
  const major = text(raw.major || raw.majorName || raw['专业名称']);
  const s2025 = score2025(raw);
  const r2025 = rank2025(raw);
  const s2024 = extractYearScore(raw, 2024);
  const rawR2024 = extractYearRank(raw, 2024);
  const r2024 = rawR2024 != null && rawR2024 > 0 ? rawR2024 : null;
  const location = normalizeLocation(raw, school, major);
  const historyCompare = buildHistoryScore({
    score2025: s2025,
    rank2025: r2025,
    score2024: s2024,
    rank2024: r2024
  });

  return {
    id: text(raw.id) || `${school}-${major}-${s2025}-${r2025}`,
    school,
    major,

    score: s2025,
    rank: r2025,
    score2025: s2025,
    rank2025: r2025,
    score2024: s2024,
    rank2024: r2024 != null && r2024 > 0 ? r2024 : null,
    historyCompare,

    lnArea: location.lnArea,
    region: location.lnArea,
    province: location.province,
    city: location.city,
    displayLocation: location.displayLocation,
    locationSource: location.locationSource,
    locationConfidence: location.locationConfidence,
    locationWarning: location.locationWarning,
    geoEntity: location.geoEntity || '',
    schoolCanonical: location.schoolCanonical || '',
    regionGroups: location.regionGroups || [],
    geoSourceMethod: location.geoSourceMethod || '',
    geoSourceName: location.geoSourceName || '',
    geoSourceUrl: location.geoSourceUrl || '',
    geoSourceYear: location.geoSourceYear || '',
    geoMatchNote: location.geoMatchNote || '',
    schoolIdentifier: location.schoolIdentifier || '',

    nature: text(raw.schoolNatureLabel || raw.nature || location.natureHint || ''),
    natureRaw: text(raw.schoolNatureLabel || raw.nature || location.natureHint || ''),
    tuition: text(raw.tuition2025 || raw.tuition || ''),
    flags: Array.isArray(raw.riskFlags) ? raw.riskFlags.slice(0, 4) : []
  };
}

export function rawScore(record) { return num(record?.score2025 ?? record?.minScore ?? record?.score ?? record?.['最低分']); }
export function rawLnArea(record) { return text(record?.lnArea ?? record?.schoolProvince ?? record?.province ?? record?.['省份']); }
export function rawSchool(record) { return text(record?.school ?? record?.schoolName ?? record?.['院校名称'] ?? record?.['学校名称']); }
export function rawMajor(record) { return text(record?.major ?? record?.majorName ?? record?.['专业名称']); }

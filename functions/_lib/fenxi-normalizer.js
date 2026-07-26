import { extractYearScore, extractYearRank, buildHistoryScore } from './history-score-engine.js';
import { buildHistoricalScoreRankEvidence } from './historical-score-rank-evidence.js';
import { normalizeLocation } from './location-normalizer.js';

function text(value) {
  return String(value == null ? '' : value).trim();
}

function num(value) {
  if (value == null || value === '') return null;
  const match = String(value).replace(/[,，\s]/g, '').match(/-?\d+(?:\.\d+)?/);
  return match && Number.isFinite(Number(match[0])) ? Number(match[0]) : null;
}

function rank(value) {
  const parsed = num(value);
  return parsed != null && parsed > 0 ? parsed : null;
}

export function normalizeRecord(raw = {}) {
  const school = text(raw.school || raw.schoolName || raw['院校名称'] || raw['学校名称']);
  const major = text(raw.major || raw.majorName || raw['专业名称']);
  const score2026 = extractYearScore(raw, 2026) ?? num(raw.score);
  const rank2026 = extractYearRank(raw, 2026) ?? rank(raw.rank);
  const score2025 = extractYearScore(raw, 2025);
  const rank2025 = rank(extractYearRank(raw, 2025));
  const score2024 = extractYearScore(raw, 2024);
  const rank2024 = rank(extractYearRank(raw, 2024));
  const location = normalizeLocation(raw, school, major);
  const historyCompare = buildHistoryScore({ score2026, rank2026, score2025, rank2025, score2024, rank2024 });
  const normalized = {
    ...raw,
    id: text(raw.id) || `${school}-${major}-${score2026}-${rank2026}`,
    school,
    major,
    dataYear: 2026,
    primaryYear: 2026,
    score: score2026,
    rank: rank2026,
    score2026,
    rank2026,
    rankStart2026: rank(raw.rankStart2026),
    rankEnd2026: rank(raw.rankEnd2026) || rank2026,
    sameCount2026: num(raw.sameCount2026),
    score2025,
    rank2025,
    score2024,
    rank2024,
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
    tuition: text(raw.tuition2026 || raw.tuition || raw.tuition2025 || ''),
    tuitionSourceYear: raw.tuition2026 ? 2026 : (raw.tuition || raw.tuition2025 ? 2025 : null),
    flags: Array.isArray(raw.riskFlags) ? raw.riskFlags.slice(0, 6) : []
  };
  const historyEvidence = buildHistoricalScoreRankEvidence(normalized);
  return {
    ...normalized,
    historyEvidence,
    rank2026Source: historyEvidence.years[2026].rankSource,
    rank2025Source: historyEvidence.years[2025].rankSource,
    rank2024Source: historyEvidence.years[2024].rankSource
  };
}

export function rawScore(record) {
  return num(record?.score2026 ?? record?.score ?? record?.minScore);
}

export function rawLnArea(record) {
  return text(record?.lnArea ?? record?.schoolProvince ?? record?.province);
}

export function rawSchool(record) {
  return text(record?.school ?? record?.schoolName ?? record?.['院校名称']);
}

export function rawMajor(record) {
  return text(record?.major ?? record?.majorName ?? record?.['专业名称']);
}

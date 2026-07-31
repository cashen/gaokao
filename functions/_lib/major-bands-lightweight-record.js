import { normalizeRecord, rawScore, rawSchool } from './fenxi-normalizer.js';

function text(value) {
  return String(value == null ? '' : value).trim();
}

function number(value) {
  if (value == null || value === '') return null;
  const match = String(value).replace(/[,，\s]/g, '').match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function rawMajor(raw = {}) {
  return text(raw.major || raw.majorName || raw['专业名称']);
}

function rawRank(raw = {}) {
  return number(raw.rank2026 ?? raw.rank ?? raw.minRank ?? raw['最低位次'] ?? raw['位次']);
}

function copiedArray(value, limit = 8) {
  return Array.isArray(value) ? value.slice(0, limit) : [];
}

/**
 * Build only the fields required by filtering, canonical positioning and
 * staged ranking. The complete source row is retained by reference and is
 * normalized only after pagination selects a record for the response.
 */
export function buildLightweightMajorBandRecord(raw = {}) {
  const school = rawSchool(raw);
  const major = rawMajor(raw);
  const score2026 = rawScore(raw);
  const rank2026 = rawRank(raw);
  return {
    __majorBandsRaw: raw,
    __majorBandsLightweight: true,
    id: text(raw.id) || `${school}-${major}-${score2026}-${rank2026}`,
    school,
    schoolName: school,
    major,
    majorName: major,
    score: score2026,
    score2026,
    rank: rank2026,
    rank2026,
    rankStart2026: number(raw.rankStart2026),
    rankEnd2026: number(raw.rankEnd2026) || rank2026,
    sameCount2026: number(raw.sameCount2026),
    natureType: text(raw.natureType),
    schoolNature: text(raw.schoolNature),
    schoolNatureLabel: text(raw.schoolNatureLabel),
    natureLabel: text(raw.natureLabel),
    nature: text(raw.nature),
    natureRaw: text(raw.natureRaw),
    feeType: text(raw.feeType),
    cooperationType: text(raw.cooperationType),
    tuition: text(raw.tuition2026 || raw.tuition || raw.tuition2025),
    tuitionText: text(raw.tuitionText),
    remark: text(raw.remark),
    notes: text(raw.notes),
    projectType: text(raw.projectType),
    batch: text(raw.batch),
    planType: text(raw.planType),
    flags: copiedArray(raw.riskFlags || raw.flags, 6),
    schoolTags: copiedArray(raw.schoolTags, 8)
  };
}

/** Restore the full public response contract for one paginated result. */
export function materializeMajorBandRecord(record = {}) {
  if (!record.__majorBandsLightweight || !record.__majorBandsRaw) return { ...record };
  const raw = record.__majorBandsRaw;
  const full = normalizeRecord(raw);
  const derived = { ...record };
  delete derived.__majorBandsRaw;
  delete derived.__majorBandsLightweight;
  return { ...full, ...derived };
}

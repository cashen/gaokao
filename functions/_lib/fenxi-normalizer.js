import { getStatus } from './status-engine.js';
function text(v) { return String(v == null ? '' : v).trim(); }
function num(v) { const n = Number(v); return Number.isFinite(n) ? n : null; }
function getScore(record) { return num(record.score2025 ?? record.minScore ?? record.score ?? record['最低分']); }
function getRank(record) { return num(record.rank2025 ?? record.minRank ?? record.rank ?? record['最低位次']); }
function getSchool(record) { return text(record.school ?? record.schoolName ?? record['院校名称'] ?? record['学校名称']); }
function getMajor(record) { return text(record.major ?? record.majorName ?? record['专业名称']); }
function regionText(record) { return [record.lnArea, record.schoolProvince, record.schoolCity].map(text).filter(Boolean).join(' · ') || '地区待核验'; }
function classifyByView(score, viewScore) {
  const delta = score - viewScore;
  if (delta >= 1 && delta <= 10) return 'upper';
  if (delta <= 0 && delta >= -10) return 'near';
  if (delta <= -11 && delta >= -25) return 'lower';
  return 'outside';
}
export function normalizeRecord(raw, { candidateScore, viewScore }) {
  const score = getScore(raw);
  const rank = getRank(raw);
  const deltaCandidate = Number.isFinite(score) ? score - candidateScore : null;
  const deltaView = Number.isFinite(score) ? score - viewScore : null;
  const status = getStatus(deltaCandidate);
  return {
    id: text(raw.id) || `${getSchool(raw)}-${getMajor(raw)}-${score}-${rank}`,
    school: getSchool(raw),
    major: getMajor(raw),
    score,
    rank,
    scoreDeltaFromCandidate: deltaCandidate,
    scoreDeltaFromView: deltaView,
    group: Number.isFinite(score) ? classifyByView(score, viewScore) : 'outside',
    statusKey: status.key,
    statusLabel: status.label,
    position: status.position,
    region: regionText(raw),
    nature: text(raw.schoolNatureLabel),
    tuition: text(raw.tuition2025),
    flags: Array.isArray(raw.riskFlags) ? raw.riskFlags.slice(0, 4) : []
  };
}
export function rawScore(record) { return getScore(record); }
export function rawLnArea(record) { return text(record.lnArea); }
export function rawSchool(record) { return getSchool(record); }
export function rawMajor(record) { return getMajor(record); }

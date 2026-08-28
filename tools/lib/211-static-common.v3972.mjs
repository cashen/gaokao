import crypto from 'node:crypto';
import fs from 'node:fs';
import { resolveSchoolProfile, SCHOOL_PROFILE_SPECIALS } from '../../shared/resources/schools/school-profile-center.js';
import { SCHOOL_PROFILE_ROWS } from '../../shared/resources/schools/school-profile-data.20260617-v3957.js';

export const clean = (value, max = 180) => String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, max);
export const num = value => Number.isFinite(Number(value)) ? Number(value) : null;
export const normalizeName = value => clean(value, 180).normalize('NFKC').replace(/[（[]/g, '(').replace(/[）\]]/g, ')').replace(/\s+/g, '');
export const sha256File = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

export function projectTags(record = {}) {
  const text = [record.major, record.rawText].filter(Boolean).join(' ');
  const tags = [];
  if (/中外合作|合作办学|国际合作|联合培养/.test(text)) tags.push('中外合作');
  if (/高收费|较高收费/.test(text)) tags.push('高收费');
  if (/专项|定向|公费师范|优师|免费医学/.test(text)) tags.push('资格或服务条件');
  if (/预科|民族班/.test(text)) tags.push('特殊资格');
  if (/试验班|实验班|拔尖|卓越|本博|八年制|九年制|创新班/.test(text)) tags.push('特殊培养');
  if (/校区|分校|办学地点/.test(text)) tags.push('校区项目');
  return [...new Set(tags)];
}

export function stableId(record = {}) {
  return [clean(record.id || '', 120), normalizeName(record.school), clean(record.schoolCode2026 || record.schoolCode || '', 24), clean(record.majorCode2026 || record.majorCode || '', 24), clean(record.major, 220), record.score2026 ?? record.score ?? ''].join('__');
}
function rankValue(record = {}) { const rank = num(record.rank2026 ?? record.rankEnd2026 ?? record.rank); return rank && rank > 0 ? rank : Number.MAX_SAFE_INTEGER; }
export function sortRecords(records = []) { return [...records].sort((a, b) => Number(b.score2026 || 0) - Number(a.score2026 || 0) || rankValue(a) - rankValue(b) || String(a.school || '').localeCompare(String(b.school || ''), 'zh-CN') || String(a.major || '').localeCompare(String(b.major || ''), 'zh-CN')); }

export function buildScoreBands(records, desiredCount = 8) {
  const grouped = new Map();
  for (const record of records) { const score = Number(record.score2026); if (!Number.isFinite(score)) continue; if (!grouped.has(score)) grouped.set(score, []); grouped.get(score).push(record); }
  const groups = [...grouped].map(([score, rows]) => ({ score, rows })).sort((a, b) => b.score - a.score);
  if (!groups.length) return [];
  const bandCount = Math.min(desiredCount, groups.length); const target = records.length / bandCount; const partitions = []; let current = []; let count = 0;
  for (let index = 0; index < groups.length; index += 1) { const group = groups[index]; current.push(group); count += group.rows.length; const remainingGroups = groups.length - index - 1; const remainingBands = bandCount - partitions.length - 1; if (partitions.length < bandCount - 1 && count >= target && remainingGroups >= remainingBands) { partitions.push(current); current = []; count = 0; } }
  if (current.length) partitions.push(current);
  return partitions.map((partition, index) => { const max = partition[0].score; const min = partition[partition.length - 1].score; const rows = partition.flatMap(item => item.rows); const ranks = rows.flatMap(item => [item.rankStart2026, item.rankEnd2026, item.rank2026]).filter(Number.isFinite); const evidenceRecordCount = rows.filter(item => item.background.status === 'verified').length; return { key: `band-${index + 1}`, label: index === 0 ? `${min}分及以上` : index === partitions.length - 1 ? `${max}分及以下` : `${min}—${max}分`, min, max, minRank: ranks.length ? Math.min(...ranks) : null, maxRank: ranks.length ? Math.max(...ranks) : null, admissionRecordCount: rows.length, evidenceRecordCount, noEvidenceRecordCount: rows.length - evidenceRecordCount, schoolCount: new Set(rows.map(item => item.schoolIdentity)).size }; });
}

export function listAll211Profiles() {
  const profiles = []; const seen = new Set();
  for (const row of SCHOOL_PROFILE_ROWS) { if (!Boolean(row[8] || row[9])) continue; const profile = resolveSchoolProfile(row[0]); if (!profile?.is211) continue; const key = normalizeName(profile.standardSchoolName || profile.school); if (!key || seen.has(key)) continue; seen.add(key); profiles.push(profile); }
  for (const profile of SCHOOL_PROFILE_SPECIALS) { if (!profile?.is211) continue; const key = normalizeName(profile.standardSchoolName || profile.school); if (!key || seen.has(key)) continue; seen.add(key); profiles.push(profile); }
  return profiles;
}

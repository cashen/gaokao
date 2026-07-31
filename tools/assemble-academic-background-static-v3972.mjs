import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCHOOL_PROFILE_SOURCE_META } from '../shared/resources/schools/school-profile-data.20260617-v3957.js';
import { DOUBLE_FIRST_CLASS_2022_SOURCE, DOUBLE_FIRST_CLASS_2022_VERSION } from '../shared/resources/background/double-first-class-disciplines.2022.js';
import { buildScoreBands, sha256File } from './lib/211-static-common.v3972.mjs';
import { build211Records } from './lib/211-static-records.v3972.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VERSION = 'all-211-static-v3972_0';
const INDEX_PATH = path.join(ROOT, 'ln-rank/data/211-static/211-static-index.v3972_0.json');
const AUDIT_PATH = path.join(ROOT, 'ln-rank/data/211-static/211-static-audit.v3972_0.json');
const MANIFEST_PATH = path.join(ROOT, 'fenxi/data/ln-rank-2026/manifest.json');
const RANK_PATH = path.join(ROOT, 'fenxi/data/rank_2026_physics.json');
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));

function main() {
  const manifest = readJson(MANIFEST_PATH); const rankMap = readJson(RANK_PATH);
  if (Number(manifest.dataYear) !== 2026) throw new Error('manifest dataYear is not 2026');
  const rawRecords = [];
  for (const chunk of manifest.chunks || []) { const relative = chunk.file || chunk.path; if (!relative) continue; const file = path.join(ROOT, 'fenxi', relative.replace(/^\/+/, '')); const data = readJson(file); rawRecords.push(...(Array.isArray(data) ? data : Array.isArray(data.records) ? data.records : [])); }
  if (rawRecords.length !== Number(manifest.totalRecords)) throw new Error(`manifest total mismatch: expected ${manifest.totalRecords}, got ${rawRecords.length}`);

  const built = build211Records(rawRecords, rankMap); const records = built.records; const schools = built.schools; const scoreBands = buildScoreBands(records, 8);
  const evidenceRecordCount = records.filter(item => item.background.status === 'verified').length; const scoreValues = records.map(item => item.score2026).filter(Number.isFinite); const bandCoveredRecordCount = scoreBands.reduce((sum, item) => sum + item.admissionRecordCount, 0); const directionCounts = new Map();
  for (const record of records) { if (record.background.status !== 'verified' || !record.background.direction) continue; directionCounts.set(record.background.direction, (directionCounts.get(record.background.direction) || 0) + 1); }
  const directions = [...directionCounts].map(([direction, count]) => ({ direction, count })).sort((a, b) => b.count - a.count || a.direction.localeCompare(b.direction, 'zh-CN'));
  const meta = { audienceYear: 2027, dataYear: 2026, totalAdmissionRecordCount: Number(manifest.totalRecords || rawRecords.length), all211SchoolCount: schools.length, admission211SchoolCount: schools.filter(item => item.admissionRecordCount > 0).length, admission211RecordCount: records.length, evaluatedRecordCount: built.evaluatedRecordCount, evidenceRecordCount, noEvidenceRecordCount: records.length - evidenceRecordCount, unresolved211RecordCount: built.unresolved211RecordCount, duplicateAdmissionRecordCount: built.duplicateAdmissionRecordCount, scoreMin: scoreValues.length ? Math.min(...scoreValues) : null, scoreMax: scoreValues.length ? Math.max(...scoreValues) : null, bandCount: scoreBands.length, bandCoveredRecordCount, completeEvaluation: built.evaluatedRecordCount === records.length && built.unresolved211RecordCount === 0 && built.duplicateAdmissionRecordCount === 0, boundary: '覆盖辽宁2026物理类全部已识别211院校投档专业。211身份与具体专业背景分开核验；证据不足的记录仍进入完整投档目录并明确标注。' };
  if (!meta.completeEvaluation) throw new Error(`coverage incomplete: ${JSON.stringify(meta)}`);
  if (meta.all211SchoolCount < 110) throw new Error(`211 school profile count too low: ${meta.all211SchoolCount}`);
  if (meta.admission211SchoolCount < 50) throw new Error(`211 admission school count too low: ${meta.admission211SchoolCount}`);
  if (records.length < 300) throw new Error(`211 admission record count too low: ${records.length}`);
  if (scoreBands.length !== 8 || bandCoveredRecordCount !== records.length) throw new Error('score band coverage');
  for (let i = 1; i < scoreBands.length; i += 1) if (scoreBands[i - 1].min <= scoreBands[i].max) throw new Error('score bands overlap');

  const source = { manifestSha256: sha256File(MANIFEST_PATH), rankSha256: sha256File(RANK_PATH), admissionDataSha256: manifest.source?.admissionSha256 || '', schoolIdentity: { title: SCHOOL_PROFILE_SOURCE_META.source.publisher, url: SCHOOL_PROFILE_SOURCE_META.source.source211Url, asOfDate: SCHOOL_PROFILE_SOURCE_META.asOfDate }, disciplineEvidence: DOUBLE_FIRST_CLASS_2022_SOURCE };
  const index = { version: VERSION, generatedAt: manifest.generatedAt, manifestVersion: manifest.version, schoolProfileVersion: SCHOOL_PROFILE_SOURCE_META.version, disciplineSourceVersion: DOUBLE_FIRST_CLASS_2022_VERSION, source, meta, scoreBands, candidateRankByScore: rankMap, schools, directions, records };
  const audit = { version: `${VERSION}-audit`, generatedAt: manifest.generatedAt, source, meta, scoreBands, schoolStatusCounts: schools.reduce((result, item) => { result[item.status] = (result[item.status] || 0) + 1; return result; }, {}), assertions: { all211RecordsEvaluated: built.evaluatedRecordCount === records.length, noUnresolved211Records: built.unresolved211RecordCount === 0, noDuplicateAdmissionRecords: built.duplicateAdmissionRecordCount === 0, eightScoreBands: scoreBands.length === 8, allRecordsCoveredByBands: bandCoveredRecordCount === records.length, sortedDescending: records.every((record, indexValue) => indexValue === 0 || Number(records[indexValue - 1].score2026) >= Number(record.score2026)), schoolIdentityCount: schools.length }, schools };
  fs.mkdirSync(path.dirname(INDEX_PATH), { recursive: true }); fs.writeFileSync(INDEX_PATH, `${JSON.stringify(index)}\n`); fs.writeFileSync(AUDIT_PATH, `${JSON.stringify(audit, null, 2)}\n`);
  console.log(JSON.stringify({ index: path.relative(ROOT, INDEX_PATH), audit: path.relative(ROOT, AUDIT_PATH), indexBytes: fs.statSync(INDEX_PATH).size, meta, scoreBands }, null, 2));
}
main();

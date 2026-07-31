import fs from 'node:fs';
const index = JSON.parse(fs.readFileSync('ln-rank/data/211-static/211-static-index.v3972_0.json', 'utf8'));
const audit = JSON.parse(fs.readFileSync('ln-rank/data/211-static/211-static-audit.v3972_0.json', 'utf8'));
const errors = [];
const check = (condition, message) => { if (!condition) errors.push(message); };
check(index.version === 'all-211-static-v3972_0', 'index version');
check(index.meta?.completeEvaluation === true, 'complete evaluation');
check(index.meta?.evaluatedRecordCount === index.meta?.admission211RecordCount, 'evaluated record count');
check(index.meta?.unresolved211RecordCount === 0, 'unresolved records');
check(index.meta?.duplicateAdmissionRecordCount === 0, 'duplicate records');
check(index.records?.length === index.meta?.admission211RecordCount, 'record count');
check(index.meta?.evidenceRecordCount + index.meta?.noEvidenceRecordCount === index.meta?.admission211RecordCount, 'evidence coverage');
check(index.records.filter(item => item.background?.status === 'verified').length === index.meta?.evidenceRecordCount, 'verified evidence count');
check(index.scoreBands?.length === 8, 'score band count');
check(index.scoreBands.reduce((sum, item) => sum + Number(item.admissionRecordCount || 0), 0) === index.records.length, 'band coverage');
check(new Set(index.records.map(item => item.id)).size === index.records.length, 'record ids unique');
check(index.records.every(item => item.background?.status && item.schoolIdentity && Number.isFinite(Number(item.score2026))), 'record contract');
check(index.records.every((item, i) => i === 0 || Number(index.records[i - 1].score2026) >= Number(item.score2026)), 'score sort');
check(Math.min(...index.records.map(item => Number(item.score2026))) === index.meta?.scoreMin, 'minimum score');
check(Math.max(...index.records.map(item => Number(item.score2026))) === index.meta?.scoreMax, 'maximum score');
check(index.schools?.length >= 110, '211 school identities');
check(index.meta?.admission211SchoolCount >= 50, '211 admission schools');
check(index.meta?.admission211RecordCount >= 300, '211 admission records');
check(index.source?.disciplineEvidence?.sourceId === 'MOE_DOUBLE_FIRST_CLASS_2022', 'official discipline source');
check(audit.assertions?.allRecordsCoveredByBands === true, 'audit band assertion');
for (let i = 1; i < index.scoreBands.length; i += 1) check(Number(index.scoreBands[i - 1].min) > Number(index.scoreBands[i].max), `band overlap ${i}`);
for (const band of index.scoreBands) {
  const rows = index.records.filter(item => Number(item.score2026) >= Number(band.min) && Number(item.score2026) <= Number(band.max));
  check(rows.length === Number(band.admissionRecordCount), `band count ${band.key}`);
  check(rows.filter(item => item.background?.status === 'verified').length === Number(band.evidenceRecordCount), `band evidence count ${band.key}`);
}
if (errors.length) { console.error(JSON.stringify({ ok: false, errors }, null, 2)); process.exit(1); }
console.log(JSON.stringify({ ok: true, version: index.version, indexBytes: fs.statSync('ln-rank/data/211-static/211-static-index.v3972_0.json').size, meta: index.meta, scoreBands: index.scoreBands }, null, 2));

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'ln-rank/data/local-strength/local-strength-index.v3971_2.json');
const index = JSON.parse(fs.readFileSync(FILE, 'utf8'));

function cleanEvidence(item = {}) {
  return {
    disciplineName: item.disciplineName || '',
    detail: item.detail || '',
    grade: item.grade || '',
    evidenceYear: item.evidenceYear || ''
  };
}

function cleanSource(item = {}) {
  return {
    title: item.title || item.sourceTitle || item.authority || '公开来源',
    url: item.url || item.sourceUrl || '',
    authority: item.authority || '',
    year: item.year || item.evidenceYear || ''
  };
}

index.records = (index.records || []).map(record => {
  const background = record.background || {};
  return {
    id: record.id,
    school: record.school,
    schoolCode2026: record.schoolCode2026 || '',
    major: record.major,
    majorCode2026: record.majorCode2026 || '',
    score2026: record.score2026,
    rank2026: record.rank2026,
    score2025: record.score2025,
    rank2025: record.rank2025,
    score2024: record.score2024,
    rank2024: record.rank2024,
    city: record.city || '',
    displayLocation: record.displayLocation || '',
    natureLabel: record.natureLabel || '',
    schoolTags: record.schoolTags || [],
    projectTags: record.projectTags || [],
    background: {
      direction: background.direction || '',
      evidenceLabel: background.evidenceLabel || '背景提示',
      note: background.note || '',
      reviewPoints: background.reviewPoints || [],
      boundary: background.boundary || '',
      sourceKinds: background.sourceKinds || [],
      evidence: (background.evidence || []).map(cleanEvidence),
      sources: (background.sources || []).map(cleanSource)
    }
  };
});

delete index.academicBackgroundMeta;
fs.writeFileSync(FILE, `${JSON.stringify(index)}\n`);
const size = fs.statSync(FILE).size;
if (size > 800_000) throw new Error(`compact index still too large: ${size}`);
console.log(JSON.stringify({ file: path.relative(ROOT, FILE), size, records: index.records.length }, null, 2));

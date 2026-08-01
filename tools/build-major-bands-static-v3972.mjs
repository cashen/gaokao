import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { normalizeRecord, rawScore } from '../functions/_lib/fenxi-normalizer.js';
import { normalizeFenxiCodes } from '../functions/_lib/fenxi-code-normalizer.js';
import { mapStandardMajor } from '../functions/_lib/standard-major-mapper.js';
import { enrichBottomLineFields } from '../functions/_lib/bottomline-policy.js';
import { detectSpecialProject } from '../functions/_lib/special-project-policy.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_MANIFEST = path.join(ROOT, 'fenxi/data/ln-rank-2026/manifest.json');
const OUTPUT_DIR = path.join(ROOT, 'ln-rank/data/major-bands-static-v3972_2');
const VERSION = 'major-bands-static-v3972_2';
const BUCKET_SIZE = 5;

const RECORD_SCHEMA = Object.freeze([
  'id', 'school', 'major', 'score2026', 'rank2026', 'rankStart2026', 'rankEnd2026', 'sameCount2026',
  'score2025', 'rank2025', 'score2024', 'rank2024',
  'lnArea', 'province', 'city', 'displayLocation', 'schoolCanonical',
  'nature', 'natureRaw', 'natureType', 'schoolNature', 'feeType', 'isPublicSchool', 'isPrivateSchool',
  'isSinoForeign', 'isHighFee', 'costRiskLevel', 'bottomLineTags', 'tuition', 'tuitionText',
  'flags', 'schoolTags', 'remark', 'majorRemark', 'enrollRemark', 'projectType', 'planType', 'batch',
  'cooperationType', 'majorCategory', 'majorFamily', 'majorGroup', 'majorTags', 'industryTag',
  'schoolIndustry', 'majorIndustry', 'industryTags', 'rawText',
  'rawFenxiMajorCode', 'standardMajorCode', 'rawFenxiMajorCodeLooksStandard',
  'standardMajorName', 'standardMajorCategoryCode', 'standardMajorCategoryName',
  'specialHas', 'specialKeys', 'specialLabels', 'specialPrimaryLabel', 'specialReviewPoints',
  'schoolCode2026', 'majorCode2026', 'preferenceOrder', 'majorDirectionId', 'majorDirectionLabel',
  'sourceType', 'sourceYear'
]);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value));
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

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

function bucketStart(score) {
  return Math.floor(Number(score) / BUCKET_SIZE) * BUCKET_SIZE;
}

function sourcePath(file) {
  const clean = String(file || '').replace(/^\/+/, '').replace(/^data\//, '');
  return path.join(ROOT, 'fenxi/data', clean);
}

function recordId(raw, normalized) {
  const existing = text(raw.id || normalized.id);
  if (existing) return existing;
  return [
    text(raw.schoolCode2026 || raw.schoolCode),
    text(raw.majorCode2026 || raw.majorCode),
    normalized.school,
    normalized.major,
    normalized.score2026,
    normalized.rank2026
  ].join('|');
}

function standardMajorFor(raw, normalized, codes) {
  return mapStandardMajor({
    majorName: normalized.major,
    standardMajorCode: codes.standardMajorCode || (codes.rawFenxiMajorCodeLooksStandard ? codes.rawFenxiMajorCode : '')
  });
}

function staticRecord(raw, normalized, codes, standardMajor, bottomLine, specialProject) {
  const rawText = [
    raw.remark,
    raw.majorRemark,
    raw.enrollRemark,
    raw.projectType,
    raw.planType,
    raw.batch,
    raw.tags,
    raw.industryTag,
    raw.schoolIndustry,
    raw.majorIndustry,
    raw.industryTags
  ].flat().filter(Boolean).join(' ').slice(0, 420);
  return {
    id: recordId(raw, normalized),
    school: normalized.school,
    major: normalized.major,
    score2026: normalized.score2026,
    rank2026: normalized.rank2026,
    rankStart2026: normalized.rankStart2026,
    rankEnd2026: normalized.rankEnd2026,
    sameCount2026: normalized.sameCount2026,
    score2025: normalized.score2025,
    rank2025: normalized.rank2025,
    score2024: normalized.score2024,
    rank2024: normalized.rank2024,
    lnArea: normalized.lnArea,
    province: normalized.province,
    city: normalized.city,
    displayLocation: normalized.displayLocation,
    schoolCanonical: normalized.schoolCanonical,
    nature: normalized.nature,
    natureRaw: normalized.natureRaw,
    natureType: text(raw.natureType),
    schoolNature: bottomLine.schoolNature,
    feeType: bottomLine.feeType,
    isPublicSchool: bottomLine.isPublicSchool,
    isPrivateSchool: bottomLine.isPrivateSchool,
    isSinoForeign: bottomLine.isSinoForeign,
    isHighFee: bottomLine.isHighFee,
    costRiskLevel: bottomLine.costRiskLevel,
    bottomLineTags: bottomLine.bottomLineTags,
    tuition: normalized.tuition,
    tuitionText: text(raw.tuitionText),
    flags: Array.isArray(normalized.flags) ? normalized.flags.slice(0, 6) : [],
    schoolTags: Array.isArray(raw.schoolTags) ? raw.schoolTags.slice(0, 8) : [],
    remark: text(raw.remark),
    majorRemark: text(raw.majorRemark),
    enrollRemark: text(raw.enrollRemark),
    projectType: text(raw.projectType),
    planType: text(raw.planType),
    batch: text(raw.batch),
    cooperationType: text(raw.cooperationType),
    majorCategory: text(raw.majorCategory),
    majorFamily: text(raw.majorFamily),
    majorGroup: text(raw.majorGroup),
    majorTags: Array.isArray(raw.majorTags) ? raw.majorTags.slice(0, 8) : [],
    industryTag: text(raw.industryTag),
    schoolIndustry: text(raw.schoolIndustry),
    majorIndustry: text(raw.majorIndustry),
    industryTags: Array.isArray(raw.industryTags) ? raw.industryTags.slice(0, 8) : [],
    rawText,
    rawFenxiMajorCode: text(codes.rawFenxiMajorCode),
    standardMajorCode: text(codes.standardMajorCode || standardMajor?.code),
    rawFenxiMajorCodeLooksStandard: Boolean(codes.rawFenxiMajorCodeLooksStandard),
    standardMajorName: text(standardMajor?.name),
    standardMajorCategoryCode: text(standardMajor?.categoryCode),
    standardMajorCategoryName: text(standardMajor?.categoryName),
    specialHas: Boolean(specialProject.hasSpecialProject),
    specialKeys: Array.isArray(specialProject.keys) ? specialProject.keys : [],
    specialLabels: Array.isArray(specialProject.labels) ? specialProject.labels : [],
    specialPrimaryLabel: text(specialProject.primaryLabel),
    specialReviewPoints: Array.isArray(specialProject.reviewPoints) ? specialProject.reviewPoints : [],
    schoolCode2026: text(raw.schoolCode2026 || raw.schoolCode),
    majorCode2026: text(raw.majorCode2026 || raw.majorCode),
    preferenceOrder: number(raw.preferenceOrder),
    majorDirectionId: text(raw.majorDirectionId),
    majorDirectionLabel: text(raw.majorDirectionLabel),
    sourceType: text(raw.sourceType),
    sourceYear: number(raw.sourceYear) || 2026
  };
}

function rowFromRecord(record) {
  return RECORD_SCHEMA.map(key => record[key] ?? null);
}

function writeBuckets(groups) {
  const entries = [];
  for (const start of [...groups.keys()].sort((a, b) => b - a)) {
    const records = groups.get(start).sort((a, b) =>
      Number(b.score2026) - Number(a.score2026)
      || Number(a.rank2026 || Number.MAX_SAFE_INTEGER) - Number(b.rank2026 || Number.MAX_SAFE_INTEGER)
      || String(a.school).localeCompare(String(b.school), 'zh-Hans-CN')
      || String(a.major).localeCompare(String(b.major), 'zh-Hans-CN')
      || String(a.id).localeCompare(String(b.id), 'zh-Hans-CN')
    );
    const relative = `buckets/score_${start}_${start + BUCKET_SIZE - 1}.json`;
    const file = path.join(OUTPUT_DIR, relative);
    writeJson(file, {
      version: VERSION,
      minScore: start,
      maxScore: start + BUCKET_SIZE - 1,
      rows: records.map(rowFromRecord)
    });
    entries.push({
      minScore: start,
      maxScore: start + BUCKET_SIZE - 1,
      recordCount: records.length,
      file: `/ln-rank/data/major-bands-static-v3972_2/${relative}`,
      bytes: fs.statSync(file).size,
      sha256: sha256(file)
    });
  }
  return entries;
}

const sourceManifest = readJson(SOURCE_MANIFEST);
const groups = new Map();
const ids = new Set();
let total = 0;
let duplicateIdCount = 0;
let unresolvedCount = 0;

fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

for (const chunk of sourceManifest.chunks || []) {
  const payload = readJson(sourcePath(chunk.file || chunk.path));
  for (const raw of payload.records || []) {
    const score = rawScore(raw);
    if (!Number.isFinite(score)) {
      unresolvedCount += 1;
      continue;
    }
    const normalized = normalizeRecord(raw);
    const codes = normalizeFenxiCodes(raw);
    const standardMajor = standardMajorFor(raw, normalized, codes);
    if (!codes.standardMajorCode && standardMajor?.code) codes.standardMajorCode = standardMajor.code;
    const bottomLine = enrichBottomLineFields(normalized);
    const specialProject = detectSpecialProject(normalized);
    const record = staticRecord(raw, normalized, codes, standardMajor, bottomLine, specialProject);
    if (!record.id || !record.school || !record.major || !Number.isFinite(record.score2026)) {
      unresolvedCount += 1;
      continue;
    }
    if (ids.has(record.id)) duplicateIdCount += 1;
    ids.add(record.id);
    const start = bucketStart(score);
    if (!groups.has(start)) groups.set(start, []);
    groups.get(start).push(record);
    total += 1;
  }
}

if (total !== Number(sourceManifest.totalRecords || 11628)) {
  throw new Error(`static major-bands record count mismatch ${total}/${sourceManifest.totalRecords}`);
}
if (duplicateIdCount !== 0 || unresolvedCount !== 0) {
  throw new Error(`static major-bands integrity duplicate=${duplicateIdCount} unresolved=${unresolvedCount}`);
}

const buckets = writeBuckets(groups);
const manifest = {
  version: VERSION,
  architecture: 'build-time-static-score-index',
  encoding: 'schema-row-array-atomic-v2',
  sourceManifestVersion: sourceManifest.version,
  dataYear: 2026,
  audienceYear: 2027,
  recordCount: total,
  bucketSize: BUCKET_SIZE,
  recordSchema: RECORD_SCHEMA,
  buckets,
  integrity: {
    completeEvaluation: true,
    evaluatedRecordCount: total,
    duplicateRecordCount: duplicateIdCount,
    unresolvedRecordCount: unresolvedCount
  }
};
writeJson(path.join(OUTPUT_DIR, 'manifest.json'), manifest);
writeJson(path.join(OUTPUT_DIR, 'audit.json'), {
  version: VERSION,
  encoding: manifest.encoding,
  recordCount: total,
  bucketCount: buckets.length,
  indexBytes: buckets.reduce((sum, item) => sum + item.bytes, 0),
  ...manifest.integrity
});

console.log(JSON.stringify(readJson(path.join(OUTPUT_DIR, 'audit.json')), null, 2));

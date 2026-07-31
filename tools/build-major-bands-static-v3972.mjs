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
const CANDIDATE_BUCKET_SIZE = 10;
const DETAIL_BUCKET_SIZE = 5;

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

function bucketStart(score, size) {
  return Math.floor(Number(score) / size) * size;
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

function compactCandidate(raw, normalized, codes, standardMajor, bottomLine, specialProject) {
  const id = recordId(raw, normalized);
  const flags = Array.isArray(normalized.flags) ? normalized.flags.slice(0, 6) : [];
  const schoolTags = Array.isArray(raw.schoolTags) ? raw.schoolTags.slice(0, 10) : [];
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
  ].flat().filter(Boolean).join(' ').slice(0, 900);
  return {
    id,
    school: normalized.school,
    schoolName: normalized.school,
    major: normalized.major,
    majorName: normalized.major,
    score: normalized.score2026,
    score2026: normalized.score2026,
    rank: normalized.rank2026,
    rank2026: normalized.rank2026,
    rankStart2026: normalized.rankStart2026,
    rankEnd2026: normalized.rankEnd2026,
    sameCount2026: normalized.sameCount2026,
    score2025: normalized.score2025,
    rank2025: normalized.rank2025,
    score2024: normalized.score2024,
    rank2024: normalized.rank2024,
    lnArea: normalized.lnArea,
    region: normalized.region,
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
    flags,
    schoolTags,
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
    majorTags: Array.isArray(raw.majorTags) ? raw.majorTags.slice(0, 10) : [],
    industryTag: text(raw.industryTag),
    schoolIndustry: text(raw.schoolIndustry),
    majorIndustry: text(raw.majorIndustry),
    industryTags: Array.isArray(raw.industryTags) ? raw.industryTags.slice(0, 10) : [],
    rawText,
    codes,
    standardMajor,
    specialProject,
    schoolCode2026: text(raw.schoolCode2026 || raw.schoolCode),
    majorCode2026: text(raw.majorCode2026 || raw.majorCode),
    preferenceOrder: number(raw.preferenceOrder),
    majorDirectionId: text(raw.majorDirectionId),
    majorDirectionLabel: text(raw.majorDirectionLabel)
  };
}

function detailRecord(raw, normalized, codes, standardMajor, bottomLine, specialProject) {
  return {
    ...normalized,
    id: recordId(raw, normalized),
    codes,
    standardMajor,
    ...bottomLine,
    specialProject
  };
}

function bucketFile(prefix, start, size) {
  const end = start + size - 1;
  return `${prefix}/score_${start}_${end}.json`;
}

function writeBuckets(groups, prefix, size) {
  const entries = [];
  for (const start of [...groups.keys()].sort((a, b) => b - a)) {
    const records = groups.get(start).sort((a, b) =>
      Number(b.score2026) - Number(a.score2026)
      || Number(a.rank2026 || Number.MAX_SAFE_INTEGER) - Number(b.rank2026 || Number.MAX_SAFE_INTEGER)
      || String(a.school).localeCompare(String(b.school), 'zh-Hans-CN')
      || String(a.major).localeCompare(String(b.major), 'zh-Hans-CN')
      || String(a.id).localeCompare(String(b.id), 'zh-Hans-CN')
    );
    const relative = bucketFile(prefix, start, size);
    const file = path.join(OUTPUT_DIR, relative);
    writeJson(file, { version: VERSION, minScore: start, maxScore: start + size - 1, records });
    entries.push({
      minScore: start,
      maxScore: start + size - 1,
      recordCount: records.length,
      file: `/ln-rank/data/major-bands-static-v3972_2/${relative}`,
      bytes: fs.statSync(file).size,
      sha256: sha256(file)
    });
  }
  return entries;
}

const sourceManifest = readJson(SOURCE_MANIFEST);
const candidateGroups = new Map();
const detailGroups = new Map();
const ids = new Set();
let total = 0;
let duplicateIdCount = 0;
let unresolvedCount = 0;

fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

for (const chunk of sourceManifest.chunks || []) {
  const file = sourcePath(chunk.file || chunk.path);
  const payload = readJson(file);
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
    const candidate = compactCandidate(raw, normalized, codes, standardMajor, bottomLine, specialProject);
    const detail = detailRecord(raw, normalized, codes, standardMajor, bottomLine, specialProject);
    if (!candidate.id || !candidate.school || !candidate.major || !Number.isFinite(candidate.score2026)) {
      unresolvedCount += 1;
      continue;
    }
    if (ids.has(candidate.id)) duplicateIdCount += 1;
    ids.add(candidate.id);
    const candidateStart = bucketStart(score, CANDIDATE_BUCKET_SIZE);
    const detailStart = bucketStart(score, DETAIL_BUCKET_SIZE);
    if (!candidateGroups.has(candidateStart)) candidateGroups.set(candidateStart, []);
    if (!detailGroups.has(detailStart)) detailGroups.set(detailStart, []);
    candidateGroups.get(candidateStart).push(candidate);
    detailGroups.get(detailStart).push(detail);
    total += 1;
  }
}

if (total !== Number(sourceManifest.totalRecords || 11628)) {
  throw new Error(`static major-bands record count mismatch ${total}/${sourceManifest.totalRecords}`);
}
if (duplicateIdCount !== 0 || unresolvedCount !== 0) {
  throw new Error(`static major-bands integrity duplicate=${duplicateIdCount} unresolved=${unresolvedCount}`);
}

const candidateBuckets = writeBuckets(candidateGroups, 'candidates', CANDIDATE_BUCKET_SIZE);
const detailBuckets = writeBuckets(detailGroups, 'details', DETAIL_BUCKET_SIZE);
const manifest = {
  version: VERSION,
  architecture: 'build-time-static-score-index',
  sourceManifestVersion: sourceManifest.version,
  dataYear: 2026,
  audienceYear: 2027,
  recordCount: total,
  candidateBucketSize: CANDIDATE_BUCKET_SIZE,
  detailBucketSize: DETAIL_BUCKET_SIZE,
  candidateBuckets,
  detailBuckets,
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
  recordCount: total,
  candidateBucketCount: candidateBuckets.length,
  detailBucketCount: detailBuckets.length,
  candidateBytes: candidateBuckets.reduce((sum, item) => sum + item.bytes, 0),
  detailBytes: detailBuckets.reduce((sum, item) => sum + item.bytes, 0),
  ...manifest.integrity
});

console.log(JSON.stringify(readJson(path.join(OUTPUT_DIR, 'audit.json')), null, 2));

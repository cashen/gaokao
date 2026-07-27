import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  createSchoolNameResolver,
  extractSchoolRecords
} from '../tongxue/data/school-name-resolver-v150.js';
import {
  createEntityAwareResolver,
  findSchoolEntityByName,
  publicSchoolEntity
} from '../shared/resources/schools/school-identity-center.js';
import { rawSchool } from '../functions/_lib/fenxi-normalizer.js';
import { normalizeFenxiCodes } from '../functions/_lib/fenxi-code-normalizer.js';
import { normalizeUnifiedSchoolName } from '../shared/resources/schools/school-query-engine.v3969_0.js';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const MANIFEST_PATH = path.join(ROOT, 'fenxi/data/ln-rank-2026/manifest.json');
const DIRECTORY_PATH = path.join(ROOT, 'tongxue/data/school-search-index.20260617-v150.json');
const OUTPUT_PATH = path.join(ROOT, 'shared/resources/schools/liaoning-2026-admission-school-directory.v3969_0.json');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function fileHash(file) {
  return sha256(fs.readFileSync(file));
}

function sorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), 'zh-CN'));
}

const manifest = readJson(MANIFEST_PATH);
const directoryPayload = readJson(DIRECTORY_PATH);
const schoolRows = extractSchoolRecords(directoryPayload);
const baseResolver = createSchoolNameResolver(schoolRows);
const resolver = createEntityAwareResolver(baseResolver, baseResolver.metadata);
const sourceFiles = [MANIFEST_PATH, DIRECTORY_PATH];
const records = [];

for (const chunk of manifest.chunks || []) {
  const file = path.join(ROOT, 'fenxi', chunk.file || chunk.path || '');
  if (!fs.existsSync(file)) throw new Error(`missing admission chunk: ${file}`);
  sourceFiles.push(file);
  const payload = readJson(file);
  const rows = Array.isArray(payload) ? payload : (Array.isArray(payload.records) ? payload.records : []);
  records.push(...rows);
}

const map = new Map();
for (const raw of records) {
  const admissionName = String(rawSchool(raw) || '').trim();
  if (!admissionName) continue;
  const resolution = resolver.resolve(admissionName, { limit: 64 });
  const officialName = resolution.status === 'resolved' && resolution.resolvedName
    ? resolution.resolvedName
    : admissionName;
  const entity = findSchoolEntityByName(officialName);
  const publicEntity = publicSchoolEntity(entity);
  const metadata = resolver.getMetadata(officialName) || resolver.getMetadata(admissionName) || {};
  const key = publicEntity?.entityId || normalizeUnifiedSchoolName(officialName);
  const current = map.get(key) || {
    officialName,
    admissionNames: new Set(),
    searchNames: new Set(),
    schoolCodes: new Set(),
    entityId: publicEntity?.entityId || '',
    entityType: publicEntity?.entityType || 'official_school',
    parentEntityId: publicEntity?.parentEntityId || '',
    province: publicEntity?.province || metadata.province || '',
    city: publicEntity?.city || metadata.city || '',
    level: metadata.level || '',
    recordCount2026: 0
  };
  current.admissionNames.add(admissionName);
  current.searchNames.add(officialName);
  current.searchNames.add(admissionName);
  const codes = normalizeFenxiCodes(raw);
  const schoolCode = String(codes.schoolCode2026 || raw.schoolCode || raw.school_code || '').trim();
  if (schoolCode) current.schoolCodes.add(schoolCode);
  current.recordCount2026 += 1;
  map.set(key, current);
}

const schools = [...map.values()].map(row => ({
  officialName: row.officialName,
  admissionNames: sorted([...row.admissionNames]),
  searchNames: sorted([...row.searchNames]),
  schoolCodes: sorted([...row.schoolCodes]),
  entityId: row.entityId,
  entityType: row.entityType,
  parentEntityId: row.parentEntityId,
  province: row.province,
  city: row.city,
  level: row.level,
  recordCount2026: row.recordCount2026,
  hasLiaoningPhysics2026Records: true
})).sort((a, b) => a.officialName.localeCompare(b.officialName, 'zh-CN'));

const sourceHash = sha256(sourceFiles.sort().map(file => `${path.relative(ROOT, file)}:${fileHash(file)}`).join('\n'));
const output = {
  version: 'liaoning-2026-admission-school-directory-v3969_0',
  contractVersion: 'school-query-contract-v3969_0',
  generatedAt: new Date().toISOString(),
  dataYear: 2026,
  audienceYear: 2027,
  region: '辽宁',
  subject: '物理类',
  sourceDirectoryBuildId: directoryPayload.buildId || '',
  sourceManifestVersion: manifest.version || '',
  sourceHash,
  schoolCount: schools.length,
  admissionRecordCount: records.length,
  schools
};

if (output.schoolCount < 900) throw new Error(`admission school directory unexpectedly small: ${output.schoolCount}`);
if (output.admissionRecordCount !== Number(manifest.totalRecords || records.length)) throw new Error('admission record count mismatch');
if (!schools.some(row => row.officialName === '沈阳化工大学')) throw new Error('沈阳化工大学 missing from admission directory');

fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, output: path.relative(ROOT, OUTPUT_PATH), schoolCount: output.schoolCount, admissionRecordCount: output.admissionRecordCount, sourceHash }, null, 2));

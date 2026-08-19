import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveMajorUnderstanding } from '../ln-rank/js/knowledge/major-understanding-resolver.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOCAL_PATH = path.join(ROOT, 'ln-rank/data/local-strength/local-strength-index.v3971_2.json');
const ALL211_PATH = path.join(ROOT, 'ln-rank/data/211-static/211-static-index.v3972_0.json');
const OUTPUT_DIR = path.join(ROOT, 'ln-rank/data/background-context');
const INDEX_PATH = path.join(OUTPUT_DIR, 'background-context-index.v001.json');
const AUDIT_PATH = path.join(OUTPUT_DIR, 'background-context-audit.v001.json');

export const BACKGROUND_CONTEXT_STATIC_VERSION = 'academic-background-context-static-v0.01';
const ALLOWED_MATCH_TYPES = new Set(['name_exact', 'admission_suffix_clean', 'alias_exact', 'standardMajor', 'code']);
const LEVEL_WEIGHT = Object.freeze({ primary: 3, secondary: 2, trajectory: 1 });

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const clean = (value, max = 500) => String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, max);
const norm = value => clean(value, 300).normalize('NFKC').toLowerCase().replace(/[（【\[]/g, '(').replace(/[）】\]]/g, ')').replace(/[\s·•,，。；;：:'"“”‘’!！?？_—-]+/g, '');
const unique = values => [...new Set((Array.isArray(values) ? values : []).map(value => clean(value)).filter(Boolean))];

function canonicalMajor(record = {}) {
  const info = resolveMajorUnderstanding({ major: record.major || '', standardMajor: record.standardMajor || null });
  if (!info?.matched || info.isClassLevel || !info.code || !info.name || info.confidence !== 'high') return null;
  if (String(info.matchType || '').includes('contains')) return null;
  if (!ALLOWED_MATCH_TYPES.has(String(info.matchType || ''))) return null;
  return Object.freeze({ code: info.code, name: info.name, matchType: info.matchType, confidence: info.confidence });
}

function normalizeSource(source = {}, fallback = {}) {
  const sourceId = clean(source.sourceId || fallback.sourceId, 100);
  const title = clean(source.title || source.sourceTitle || fallback.title || fallback.sourceTitle, 220);
  const url = clean(source.url || source.sourceUrl || source.noticeUrl || source.attachmentUrl || fallback.url || fallback.sourceUrl || fallback.noticeUrl || fallback.attachmentUrl, 500);
  const year = clean(source.year || source.sourceYear || fallback.year || fallback.sourceYear, 20);
  const authority = clean(source.authority || source.publisher || fallback.authority || fallback.publisher, 160);
  if (!sourceId && !title && !url) return null;
  return { sourceId, title, url, year, authority };
}

function sourceKey(source = {}) {
  return [source.sourceId, source.url, source.year].map(value => clean(value, 500)).join('|');
}

function normalizeLocalEvidence(record = {}) {
  const background = record.background || {};
  const sources = new Map();
  for (const source of background.sources || []) {
    const normalized = normalizeSource(source);
    if (normalized) sources.set(sourceKey(normalized), normalized);
  }
  const evidence = [];
  for (const item of background.evidence || []) {
    if (item?.canTriggerFrontend === false) continue;
    const embeddedSource = normalizeSource(item.source || {}, item);
    if (embeddedSource) sources.set(sourceKey(embeddedSource), embeddedSource);
    evidence.push({
      evidenceId: clean(item.evidenceId || `liaoning:${record.id}:${evidence.length}`, 180),
      evidenceType: clean(item.evidenceType || 'academic-background', 100),
      disciplineCode: clean(item.disciplineCode, 40),
      disciplineName: clean(item.disciplineName || background.direction, 160),
      grade: clean(item.grade, 30),
      detail: clean(item.detail || item.disciplineName || background.direction, 500),
      evidenceYear: clean(item.evidenceYear || embeddedSource?.year, 20),
      sourceId: clean(item.sourceId || embeddedSource?.sourceId, 100),
      sourceTitle: clean(embeddedSource?.title, 220),
      sourceUrl: clean(embeddedSource?.url, 500),
      authority: clean(embeddedSource?.authority, 160)
    });
  }
  return { evidence, sources: [...sources.values()] };
}

function normalize211Evidence(index = {}, record = {}) {
  const background = record.background || {};
  if (background.status !== 'verified') return { evidence: [], sources: [] };
  const source = normalizeSource(index.source?.disciplineEvidence || {}, {
    sourceId: background.sourceId,
    sourceYear: background.evidenceYear
  });
  const evidence = [{
    evidenceId: clean(`211:${record.id}:${background.sourceId || source?.sourceId || 'source'}:${background.direction || background.disciplineName || ''}`, 180),
    evidenceType: 'double-first-class-discipline-map',
    disciplineCode: '',
    disciplineName: clean(background.disciplineName || background.direction, 160),
    grade: '',
    detail: clean(background.note || background.direction || background.disciplineName, 500),
    evidenceYear: clean(background.evidenceYear || source?.year || '2022', 20),
    sourceId: clean(background.sourceId || source?.sourceId, 100),
    sourceTitle: clean(source?.title, 220),
    sourceUrl: clean(source?.url, 500),
    authority: clean(source?.authority, 160)
  }];
  return { evidence, sources: source ? [source] : [] };
}

function evidenceKey(item = {}) {
  return [item.sourceId, item.evidenceType, item.disciplineCode, item.disciplineName, item.grade, item.evidenceYear, item.detail]
    .map(value => clean(value, 500)).join('|');
}

function groupKey(scope, record, major) {
  return `${scope}|${norm(record.schoolIdentity || record.school)}|${major.code}`;
}

function newGroup(scope, record, major) {
  return {
    scope,
    school: clean(record.school, 140),
    schoolIdentity: clean(record.schoolIdentity || record.school, 140),
    province: clean(record.province, 80),
    city: clean(record.city, 80),
    displayLocation: clean(record.displayLocation || record.city || record.province, 120),
    canonicalMajor: { code: major.code, name: major.name },
    mappingTypes: new Set([major.matchType]),
    admissionMajors: new Set(),
    sourceRecordIds: new Set(),
    directions: new Set(),
    level: 'trajectory',
    evidenceLabel: '',
    note: '',
    reviewPoints: new Set(),
    boundary: '',
    evidence: new Map(),
    sources: new Map()
  };
}

function mergeGroup(group, record, major, normalized) {
  group.mappingTypes.add(major.matchType);
  group.admissionMajors.add(clean(record.major, 180));
  group.sourceRecordIds.add(clean(record.id, 180));
  const background = record.background || {};
  if (background.direction) group.directions.add(clean(background.direction, 160));
  const currentWeight = LEVEL_WEIGHT[group.level] || 0;
  const nextLevel = ['primary', 'secondary', 'trajectory'].includes(background.level) ? background.level : 'trajectory';
  const nextWeight = LEVEL_WEIGHT[nextLevel] || 0;
  if (nextWeight > currentWeight || !group.evidenceLabel) {
    group.level = nextLevel;
    group.evidenceLabel = clean(background.evidenceLabel || background.label || '', 100);
    group.note = clean(background.note || '', 360);
  }
  for (const point of background.reviewPoints || []) group.reviewPoints.add(clean(point, 80));
  if (!group.boundary && background.boundary) group.boundary = clean(background.boundary, 360);
  for (const item of normalized.evidence || []) group.evidence.set(evidenceKey(item), item);
  for (const source of normalized.sources || []) group.sources.set(sourceKey(source), source);
}

function finalizeGroup(group) {
  return Object.freeze({
    scope: group.scope,
    school: group.school,
    schoolIdentity: group.schoolIdentity,
    province: group.province,
    city: group.city,
    displayLocation: group.displayLocation,
    canonicalMajor: group.canonicalMajor,
    mappingTypes: [...group.mappingTypes].sort(),
    admissionMajors: [...group.admissionMajors].filter(Boolean).sort((a, b) => a.localeCompare(b, 'zh-CN')),
    sourceRecordIds: [...group.sourceRecordIds].filter(Boolean).sort(),
    directions: [...group.directions].filter(Boolean).sort((a, b) => a.localeCompare(b, 'zh-CN')),
    level: group.level,
    evidenceLabel: group.evidenceLabel || (group.scope === '211' ? '211专业背景证据' : '省内专业背景证据'),
    note: group.note,
    reviewPoints: [...group.reviewPoints].filter(Boolean).slice(0, 8),
    boundary: group.boundary || '背景证据只用于学校×专业方向复核，不代表录取判断、专业排名或就业承诺。',
    evidence: [...group.evidence.values()],
    sources: [...group.sources.values()]
  });
}

function collect(scope, index, records, groups, audit) {
  for (const record of records) {
    audit.sourceRecordCount[scope] += 1;
    const major = canonicalMajor(record);
    if (!major) {
      audit.unresolvedCanonical.push({ scope, school: clean(record.school, 120), admissionMajor: clean(record.major, 180), id: clean(record.id, 120) });
      continue;
    }
    const normalized = scope === '211' ? normalize211Evidence(index, record) : normalizeLocalEvidence(record);
    if (!normalized.evidence.length) {
      audit.missingEvidence.push({ scope, school: clean(record.school, 120), major: major.name, id: clean(record.id, 120) });
      continue;
    }
    const key = groupKey(scope, record, major);
    if (!groups.has(key)) groups.set(key, newGroup(scope, record, major));
    mergeGroup(groups.get(key), record, major, normalized);
    audit.mappedRecordCount[scope] += 1;
  }
}

function main() {
  const local = readJson(LOCAL_PATH);
  const all211 = readJson(ALL211_PATH);
  if (local.version !== 'local-strength-static-v3971_2') throw new Error(`local source version mismatch: ${local.version}`);
  if (all211.version !== 'all-211-static-v3972_0') throw new Error(`211 source version mismatch: ${all211.version}`);
  if (!local.meta?.completeEvaluation || !all211.meta?.completeEvaluation) throw new Error('source coverage audit incomplete');

  const groups = new Map();
  const auditState = {
    sourceRecordCount: { liaoning: 0, '211': 0 },
    mappedRecordCount: { liaoning: 0, '211': 0 },
    unresolvedCanonical: [],
    missingEvidence: []
  };
  collect('liaoning', local, local.records || [], groups, auditState);
  collect('211', all211, (all211.records || []).filter(record => record.background?.status === 'verified'), groups, auditState);

  const records = [...groups.values()].map(finalizeGroup).sort((a, b) =>
    a.scope.localeCompare(b.scope)
    || a.schoolIdentity.localeCompare(b.schoolIdentity, 'zh-CN')
    || a.canonicalMajor.code.localeCompare(b.canonicalMajor.code)
  );
  const duplicateGroupCount = records.length - new Set(records.map(item => `${item.scope}|${norm(item.schoolIdentity)}|${item.canonicalMajor.code}`)).size;
  const duplicateEvidenceCount = records.reduce((sum, item) => sum + item.evidence.length - new Set(item.evidence.map(evidenceKey)).size, 0);
  const emptyEvidenceGroups = records.filter(item => !item.evidence.length).length;
  const generatedAt = [local.generatedAt, all211.generatedAt].filter(Boolean).sort().at(-1) || '';

  const index = {
    version: BACKGROUND_CONTEXT_STATIC_VERSION,
    generatedAt,
    source: {
      liaoning: { version: local.version, path: '/ln-rank/data/local-strength/local-strength-index.v3971_2.json', generatedAt: local.generatedAt || '' },
      '211': { version: all211.version, path: '/ln-rank/data/211-static/211-static-index.v3972_0.json', generatedAt: all211.generatedAt || '' }
    },
    meta: {
      executionRole: 'derived-evidence-index-only',
      dataYear: 2026,
      sourceScopes: ['liaoning', '211'],
      recordCount: records.length,
      schoolCount: new Set(records.map(item => norm(item.schoolIdentity))).size,
      canonicalMajorCount: new Set(records.map(item => item.canonicalMajor.code)).size,
      scopeCounts: {
        liaoning: records.filter(item => item.scope === 'liaoning').length,
        '211': records.filter(item => item.scope === '211').length
      },
      sourceRecordCount: auditState.sourceRecordCount,
      mappedRecordCount: auditState.mappedRecordCount,
      unresolvedCanonicalCount: auditState.unresolvedCanonical.length,
      missingEvidenceCount: auditState.missingEvidence.length,
      boundary: '只投影两个既有静态资源中已通过证据门禁、且能高置信映射到2026 canonical本科专业的学校×专业背景。分数、位次、录取和推荐仍由原 owner 负责。'
    },
    records
  };

  const audit = {
    version: `${BACKGROUND_CONTEXT_STATIC_VERSION}-audit`,
    generatedAt,
    source: index.source,
    meta: index.meta,
    assertions: {
      sourceCoverageComplete: local.meta.completeEvaluation === true && all211.meta.completeEvaluation === true,
      noDuplicateGroups: duplicateGroupCount === 0,
      noDuplicateEvidenceWithinGroup: duplicateEvidenceCount === 0,
      noEmptyEvidenceGroups: emptyEvidenceGroups === 0,
      onlyConcreteCanonicalMajors: records.every(item => Boolean(item.canonicalMajor?.code && item.canonicalMajor?.name)),
      onlyDeclaredScopes: records.every(item => ['liaoning', '211'].includes(item.scope)),
      noAdmissionsScoreOwnership: records.every(item => item.score2026 === undefined && item.rank2026 === undefined),
      sourceRecordIdsRetained: records.every(item => item.sourceRecordIds.length > 0)
    },
    unresolvedCanonical: auditState.unresolvedCanonical,
    missingEvidence: auditState.missingEvidence,
    samples: records.filter(item => ['东北大学', '沈阳工业大学', '大连理工大学'].includes(item.schoolIdentity)).slice(0, 20)
  };

  if (duplicateGroupCount || duplicateEvidenceCount || emptyEvidenceGroups) throw new Error(`context index integrity failure: ${JSON.stringify(audit.assertions)}`);
  if (!records.length || !records.some(item => item.scope === 'liaoning') || !records.some(item => item.scope === '211')) throw new Error('context index missing required scope records');
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(INDEX_PATH, `${JSON.stringify(index)}\n`);
  fs.writeFileSync(AUDIT_PATH, `${JSON.stringify(audit, null, 2)}\n`);
  const indexBytes = fs.statSync(INDEX_PATH).size;
  if (indexBytes > 900_000) throw new Error(`context index exceeds lightweight budget: ${indexBytes}`);
  console.log(JSON.stringify({ index: path.relative(ROOT, INDEX_PATH), audit: path.relative(ROOT, AUDIT_PATH), indexBytes, meta: index.meta, assertions: audit.assertions }, null, 2));
}

main();

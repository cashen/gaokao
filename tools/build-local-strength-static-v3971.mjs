import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { normalizeRecord, rawSchool } from '../functions/_lib/fenxi-normalizer.js';
import { buildDisplayTags } from '../functions/_lib/school-display-tags.js';
import { getHistoryScoreRankEvidence } from '../shared/resources/exam/historical-score-rank-contract.js';
import { normalizeUnifiedSchoolName } from '../shared/resources/schools/school-query-engine.v3969_0.js';
import {
  ACADEMIC_BACKGROUND_PROVIDER_VERSION,
  getAcademicBackgroundMeta,
  matchAcademicBackground,
  presentAcademicBackground
} from '../functions/_lib/academic-background-provider.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VERSION = 'local-strength-static-v3971_2';
const INDEX_PATH = path.join(ROOT, 'ln-rank/data/local-strength/local-strength-index.v3971_2.json');
const AUDIT_PATH = path.join(ROOT, 'ln-rank/data/local-strength/local-strength-audit.v3971_2.json');
const MANIFEST_PATH = path.join(ROOT, 'fenxi/data/ln-rank-2026/manifest.json');
const DIRECTORY_PATH = path.join(ROOT, 'shared/resources/schools/liaoning-2026-admission-school-directory.v3969_0.json');
const OUT_OF_SCOPE_CAMPUSES = [/秦皇岛/, /威海/, /珠海/, /深圳/, /苏州/, /雄安/];
const SCORE_BANDS = Object.freeze([
  { key: '650-plus', label: '650分及以上', min: 650, max: 750 },
  { key: '620-649', label: '620—649分', min: 620, max: 649 },
  { key: '590-619', label: '590—619分', min: 590, max: 619 },
  { key: '560-589', label: '560—589分', min: 560, max: 589 },
  { key: '530-559', label: '530—559分', min: 530, max: 559 },
  { key: '500-529', label: '500—529分', min: 500, max: 529 },
  { key: '470-499', label: '470—499分', min: 470, max: 499 },
  { key: '344-469', label: '本科线—469分', min: 344, max: 469 }
]);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function clean(value, max = 160) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, max);
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeSchool(value) {
  return normalizeUnifiedSchoolName(clean(value, 120));
}

function levelWeight(level) {
  return level === 'primary' ? 40 : level === 'secondary' ? 30 : level === 'trajectory' ? 10 : 0;
}

function sourceWeight(scope) {
  return scope === 'liaoning' ? 4 : scope === '211' ? 2 : 0;
}

function chooseBackground(matches = []) {
  return [...matches].sort((a, b) =>
    levelWeight(b.level) - levelWeight(a.level)
    || sourceWeight(b.scope) - sourceWeight(a.scope)
    || String(a.direction || '').localeCompare(String(b.direction || ''), 'zh-CN')
  )[0] || null;
}

function projectTags(record = {}) {
  const text = [record.major, record.rawText].filter(Boolean).join(' ');
  const tags = [];
  if (/中外合作|合作办学|国际合作|学术互认|联合培养|境外/.test(text)) tags.push('中外合作');
  if (/高收费|较高收费|学费.*万/.test(text)) tags.push('高收费');
  if (/专项|定向|公费师范|优师|免费医学|订单定向|乡村医生/.test(text)) tags.push('资格或服务条件');
  if (/预科|民族班|边防军人子女/.test(text)) tags.push('特殊资格');
  if (/试验班|实验班|拔尖|英才|卓越|本博|八年制|九年制|长学制|创新班/.test(text)) tags.push('特殊培养');
  if (/校区|分校|办学地点/.test(text)) tags.push('校区项目');
  return tags;
}

function stableId(record = {}) {
  return [
    normalizeSchool(record.school),
    clean(record.schoolCode2026 || record.schoolCode || '', 24),
    clean(record.majorCode2026 || record.majorCode || '', 24),
    clean(record.major, 180),
    record.score2026 ?? record.score ?? ''
  ].join('__');
}

function rankValue(record = {}) {
  const rank = num(record.rank2026 ?? record.rankEnd2026 ?? record.rank);
  return rank && rank > 0 ? rank : Number.MAX_SAFE_INTEGER;
}

function shapeRecord(record, matches, primary) {
  const display = buildDisplayTags(record);
  const background = presentAcademicBackground(primary) || {};
  const allBackgrounds = matches.map(hit => presentAcademicBackground(hit)).filter(Boolean);
  const score2026 = num(record.score2026 ?? record.score);
  const rank2026 = num(record.rank2026 ?? record.rankEnd2026 ?? record.rank);
  return {
    id: stableId(record),
    dataYear: 2026,
    school: record.school,
    schoolCode2026: clean(record.schoolCode2026 || record.schoolCode || '', 24),
    schoolEntityId: clean(record.schoolEntityId || record.entityId || '', 100),
    major: record.major,
    majorCode2026: clean(record.majorCode2026 || record.majorCode || '', 24),
    score2026,
    rank2026,
    rankStart2026: num(record.rankStart2026),
    rankEnd2026: num(record.rankEnd2026 ?? rank2026),
    score2025: num(record.score2025),
    rank2025: num(record.rank2025),
    score2024: num(record.score2024),
    rank2024: num(record.rank2024),
    historyEvidence: getHistoryScoreRankEvidence(record),
    city: clean(record.city || display.city || '', 50),
    province: '辽宁',
    displayLocation: clean(record.displayLocation || display.displayLocation || '', 80),
    natureLabel: clean(display.natureLabel || record.nature || '', 60),
    schoolTags: Array.isArray(display.schoolTags) ? display.schoolTags : [],
    projectTags: projectTags(record),
    background: {
      ...background,
      sourceKinds: [...new Set(allBackgrounds.map(item => item.scope === '211' ? '211背景' : '省内背景'))],
      evidenceLabel: background.level === 'primary' ? '学校主线' : background.level === 'secondary' ? '学校相关' : '方向线索'
    },
    allBackgrounds
  };
}

function sortRecords(records = []) {
  return [...records].sort((a, b) =>
    Number(b.score2026 || 0) - Number(a.score2026 || 0)
    || rankValue(a) - rankValue(b)
    || String(a.school || '').localeCompare(String(b.school || ''), 'zh-CN')
    || String(a.major || '').localeCompare(String(b.major || ''), 'zh-CN')
    || String(a.majorCode2026 || '').localeCompare(String(b.majorCode2026 || ''))
  );
}

function sha256File(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function main() {
  const manifest = readJson(MANIFEST_PATH);
  const directory = readJson(DIRECTORY_PATH);
  if (Number(manifest.dataYear) !== 2026) throw new Error('manifest dataYear is not 2026');

  const directorySchools = (Array.isArray(directory.schools) ? directory.schools : []).filter(item => {
    const province = clean(item.province || '', 40);
    const names = [item.officialName, ...(item.admissionNames || []), ...(item.searchNames || [])].join(' ');
    return /辽宁/.test(province) && !OUT_OF_SCOPE_CAMPUSES.some(pattern => pattern.test(names));
  });
  const accepted = new Map();
  for (const school of directorySchools) {
    for (const name of [school.officialName, ...(school.admissionNames || []), ...(school.searchNames || [])]) {
      const key = normalizeSchool(name);
      if (key) accepted.set(key, school);
    }
  }

  const rawRecords = [];
  for (const chunk of manifest.chunks || []) {
    const relative = chunk.file || chunk.path;
    if (!relative) continue;
    const file = path.join(ROOT, 'fenxi', relative.replace(/^\/+/, ''));
    const data = readJson(file);
    rawRecords.push(...(Array.isArray(data) ? data : Array.isArray(data.records) ? data.records : []));
  }
  if (rawRecords.length !== Number(manifest.totalRecords)) {
    throw new Error(`manifest total mismatch: expected ${manifest.totalRecords}, got ${rawRecords.length}`);
  }

  const schoolCoverage = new Map();
  for (const school of directorySchools) {
    schoolCoverage.set(normalizeSchool(school.officialName), {
      officialName: school.officialName,
      admissionNames: school.admissionNames || [],
      searchNames: school.searchNames || [],
      city: clean(school.city || '', 50),
      province: clean(school.province || '辽宁', 40),
      nature: clean(school.nature || '', 50),
      recordCount2026: 0,
      evaluatedRecordCount: 0,
      matchedRecordCount: 0,
      noEvidenceCount: 0,
      directions: new Set(),
      scoreMin: null,
      scoreMax: null
    });
  }

  const publicRecords = [];
  const seen = new Set();
  let evaluatedRecordCount = 0;
  let duplicatePublicRecordCount = 0;
  let unresolvedLocalRecordCount = 0;

  for (const raw of rawRecords) {
    const directorySchool = accepted.get(normalizeSchool(rawSchool(raw)));
    if (!directorySchool) continue;
    const record = normalizeRecord(raw);
    if (!record.school || !record.major || !Number.isFinite(Number(record.score2026 ?? record.score))) {
      unresolvedLocalRecordCount += 1;
      continue;
    }
    record.rawText = JSON.stringify(raw).slice(0, 1800);
    evaluatedRecordCount += 1;

    const schoolKey = normalizeSchool(directorySchool.officialName || record.school);
    const school = schoolCoverage.get(schoolKey);
    if (!school) throw new Error(`school coverage missing: ${directorySchool.officialName}`);
    school.recordCount2026 += 1;
    school.evaluatedRecordCount += 1;
    const score = num(record.score2026 ?? record.score);
    school.scoreMin = school.scoreMin == null ? score : Math.min(school.scoreMin, score);
    school.scoreMax = school.scoreMax == null ? score : Math.max(school.scoreMax, score);

    const matches = [
      matchAcademicBackground(record, 'liaoning'),
      matchAcademicBackground(record, '211')
    ].filter(Boolean);
    const primary = chooseBackground(matches);
    if (!primary) {
      school.noEvidenceCount += 1;
      continue;
    }

    const shaped = shapeRecord(record, matches, primary);
    if (seen.has(shaped.id)) {
      duplicatePublicRecordCount += 1;
      continue;
    }
    seen.add(shaped.id);
    publicRecords.push(shaped);
    school.matchedRecordCount += 1;
    if (shaped.background?.direction) school.directions.add(shaped.background.direction);
  }

  const records = sortRecords(publicRecords);
  const schools = [...schoolCoverage.values()].map(item => ({
    ...item,
    directions: [...item.directions].sort((a, b) => a.localeCompare(b, 'zh-CN')),
    directionCount: item.directions.size,
    status: item.matchedRecordCount > 0 ? 'matched' : item.recordCount2026 > 0 ? 'no-evidence' : 'no-admission-record'
  })).sort((a, b) =>
    b.matchedRecordCount - a.matchedRecordCount
    || b.recordCount2026 - a.recordCount2026
    || a.officialName.localeCompare(b.officialName, 'zh-CN')
  );

  const directionCounts = new Map();
  for (const record of records) {
    const direction = record.background?.direction;
    if (direction) directionCounts.set(direction, (directionCounts.get(direction) || 0) + 1);
  }
  const directions = [...directionCounts].map(([direction, count]) => ({ direction, count }))
    .sort((a, b) => b.count - a.count || a.direction.localeCompare(b.direction, 'zh-CN'));

  const localAdmissionSchoolCount = schools.filter(item => item.recordCount2026 > 0).length;
  const localAdmissionRecordCount = schools.reduce((sum, item) => sum + item.recordCount2026, 0);
  const matchedSchoolCount = schools.filter(item => item.matchedRecordCount > 0).length;
  const noEvidenceSchoolCount = schools.filter(item => item.recordCount2026 > 0 && item.matchedRecordCount === 0).length;
  const scoreValues = records.map(item => item.score2026).filter(Number.isFinite);
  const meta = {
    audienceYear: 2027,
    dataYear: 2026,
    totalAdmissionRecordCount: Number(manifest.totalRecords || rawRecords.length),
    localAdmissionSchoolCount,
    localAdmissionRecordCount,
    evaluatedRecordCount,
    matchedSchoolCount,
    matchedRecordCount: records.length,
    noEvidenceSchoolCount,
    duplicatePublicRecordCount,
    unresolvedLocalRecordCount,
    scoreMin: scoreValues.length ? Math.min(...scoreValues) : null,
    scoreMax: scoreValues.length ? Math.max(...scoreValues) : null,
    completeEvaluation: evaluatedRecordCount === localAdmissionRecordCount && unresolvedLocalRecordCount === 0,
    boundary: '覆盖全部已识别的辽宁省内2026物理类投档专业记录；只有通过当前背景证据门禁的专业进入公开目录。未显示不代表学校没有优势专业。'
  };

  if (!meta.completeEvaluation) throw new Error(`coverage incomplete: ${JSON.stringify(meta)}`);
  if (duplicatePublicRecordCount !== 0) throw new Error(`duplicate public records: ${duplicatePublicRecordCount}`);
  if (localAdmissionSchoolCount < 50) throw new Error(`local school count too low: ${localAdmissionSchoolCount}`);
  if (records.length < 200) throw new Error(`matched record count too low: ${records.length}`);
  const liaoningUst = schools.find(item => item.officialName === '辽宁科技大学');
  if (!liaoningUst || liaoningUst.matchedRecordCount < 1) throw new Error('辽宁科技大学背景专业缺失');

  const index = {
    version: VERSION,
    providerVersion: ACADEMIC_BACKGROUND_PROVIDER_VERSION,
    generatedAt: manifest.generatedAt,
    manifestVersion: manifest.version,
    admissionDirectoryVersion: directory.version || '',
    source: {
      manifestSha256: sha256File(MANIFEST_PATH),
      admissionDirectorySha256: sha256File(DIRECTORY_PATH),
      admissionDataSha256: manifest.source?.admissionSha256 || ''
    },
    meta,
    scoreBands: SCORE_BANDS,
    schools,
    directions,
    academicBackgroundMeta: getAcademicBackgroundMeta('liaoning'),
    records
  };

  const audit = {
    version: `${VERSION}-audit`,
    generatedAt: manifest.generatedAt,
    source: index.source,
    meta,
    schools,
    assertions: {
      allLocalRecordsEvaluated: evaluatedRecordCount === localAdmissionRecordCount,
      noUnresolvedLocalRecords: unresolvedLocalRecordCount === 0,
      noDuplicatePublicRecords: duplicatePublicRecordCount === 0,
      sortedDescending: records.every((record, indexValue) => indexValue === 0 || Number(records[indexValue - 1].score2026) >= Number(record.score2026)),
      liaoningUniversityOfScienceAndTechnologyMatched: liaoningUst.matchedRecordCount
    }
  };

  fs.mkdirSync(path.dirname(INDEX_PATH), { recursive: true });
  fs.writeFileSync(INDEX_PATH, `${JSON.stringify(index)}\n`);
  fs.writeFileSync(AUDIT_PATH, `${JSON.stringify(audit, null, 2)}\n`);
  console.log(JSON.stringify({ index: path.relative(ROOT, INDEX_PATH), audit: path.relative(ROOT, AUDIT_PATH), meta, liaoningUst: liaoningUst.matchedRecordCount }, null, 2));
}

main();

import { normalizeRecord, rawSchool } from '../../functions/_lib/fenxi-normalizer.js';
import { buildDisplayTags } from '../../functions/_lib/school-display-tags.js';
import { getHistoryScoreRankEvidence } from '../../shared/resources/exam/historical-score-rank-contract.js';
import { resolveSchoolProfile } from '../../shared/resources/schools/school-profile-center.js';
import { getDoubleFirstClassDisciplines, DOUBLE_FIRST_CLASS_2022_SOURCE } from '../../shared/resources/background/double-first-class-disciplines.2022.js';
import { clean, num, normalizeName, projectTags, stableId, sortRecords, listAll211Profiles } from './211-static-common.v3972.mjs';
import { match211StaticEvidence, present211StaticEvidence } from './211-static-evidence.v3972.mjs';

function compactBackground(record, profile) {
  const presented = present211StaticEvidence(match211StaticEvidence(record));
  const official = getDoubleFirstClassDisciplines(profile.standardSchoolName || profile.school || record.school)
    || getDoubleFirstClassDisciplines(profile.parentSchoolName || '');
  if (!presented) {
    return {
      status: official?.selfDetermined ? 'self-determined-not-enumerated' : official ? 'no-explicit-major-discipline-map' : 'no-official-discipline-entry',
      evidenceLabel: '当前证据不足',
      level: '',
      direction: '',
      disciplineName: '',
      evidenceYear: '',
      sourceId: '',
      note: official?.selfDetermined
        ? '学校自主确定并公布建设学科；当前静态索引不据此推断具体本科专业。'
        : '211身份已核验，但当前没有足够的官方学科—本科专业映射证据。',
      reviewPoints: ['本科培养方案', '2026招生章程', '专业所属学院']
    };
  }
  const evidence = Array.isArray(presented.evidence)
    ? presented.evidence.find(item => item.canTriggerFrontend !== false) || presented.evidence[0]
    : null;
  return {
    status: 'verified',
    evidenceLabel: presented.level === 'primary' ? '学校主线' : presented.level === 'secondary' ? '学校相关' : '方向线索',
    level: presented.level || '',
    direction: clean(presented.direction || evidence?.disciplineName || '', 100),
    disciplineName: clean(evidence?.disciplineName || presented.direction || '', 100),
    evidenceYear: clean(evidence?.evidenceYear || '2022', 12),
    sourceId: clean(evidence?.source?.sourceId || evidence?.sourceId || DOUBLE_FIRST_CLASS_2022_SOURCE.sourceId, 80),
    note: clean(presented.note || '该专业与学校官方建设学科存在明确映射，仍需核验本科培养方案。', 240),
    reviewPoints: (presented.reviewPoints || ['本科培养方案', '2026招生章程', '专业所属学院']).slice(0, 4),
    boundary: clean(presented.boundary || '学科背景不等同于专业排名、就业结果或录取承诺。', 240)
  };
}

function newSchool(profile, identity) {
  return {
    officialName: identity,
    province: profile.province || '',
    city: profile.city || '',
    displayLocation: profile.displayLocation || '',
    is985: Boolean(profile.is985),
    admissionRecordCount: 0,
    evidenceRecordCount: 0,
    noEvidenceRecordCount: 0,
    scoreMin: null,
    scoreMax: null,
    directions: new Set(),
    admissionNames: new Set()
  };
}

export function build211Records(rawRecords, rankMap) {
  const schoolCoverage = new Map();
  for (const profile of listAll211Profiles()) {
    const identity = profile.standardSchoolName || profile.school;
    schoolCoverage.set(normalizeName(identity), newSchool(profile, identity));
  }

  const records = [];
  const seen = new Set();
  let evaluatedRecordCount = 0;
  let unresolved211RecordCount = 0;
  let duplicateAdmissionRecordCount = 0;

  for (const raw of rawRecords) {
    const profile = resolveSchoolProfile(rawSchool(raw));
    if (!profile?.is211) continue;
    const record = normalizeRecord(raw);
    if (!record.school || !record.major || !Number.isFinite(Number(record.score2026 ?? record.score))) {
      unresolved211RecordCount += 1;
      continue;
    }
    evaluatedRecordCount += 1;
    record.rawText = JSON.stringify(raw).slice(0, 1800);

    const identity = profile.standardSchoolName || profile.parentSchoolName || profile.school || record.school;
    const key = normalizeName(identity);
    if (!schoolCoverage.has(key)) schoolCoverage.set(key, newSchool(profile, identity));
    const school = schoolCoverage.get(key);
    const display = buildDisplayTags(record);
    const background = compactBackground(record, profile);
    const score2026 = num(record.score2026 ?? record.score);
    const rank2026 = num(record.rank2026 ?? record.rankEnd2026 ?? record.rank ?? rankMap[String(score2026)]);
    const id = stableId(record);
    if (seen.has(id)) {
      duplicateAdmissionRecordCount += 1;
      continue;
    }
    seen.add(id);
    const history = getHistoryScoreRankEvidence(record);

    records.push({
      id,
      dataYear: 2026,
      school: record.school,
      schoolIdentity: identity,
      schoolCode2026: clean(record.schoolCode2026 || record.schoolCode || '', 24),
      major: record.major,
      majorCode2026: clean(record.majorCode2026 || record.majorCode || '', 24),
      score2026,
      rank2026,
      rankStart2026: num(record.rankStart2026),
      rankEnd2026: num(record.rankEnd2026 ?? rank2026),
      score2025: num(record.score2025 ?? history?.years?.[2025]?.score),
      rank2025: num(record.rank2025 ?? history?.years?.[2025]?.rank),
      score2024: num(record.score2024 ?? history?.years?.[2024]?.score),
      rank2024: num(record.rank2024 ?? history?.years?.[2024]?.rank),
      province: profile.province || '',
      city: profile.city || '',
      displayLocation: record.displayLocation || display.displayLocation || profile.displayLocation || '',
      natureLabel: display.natureLabel || profile.natureLabel || '',
      is985: Boolean(profile.is985),
      entityType: profile.entityType || '',
      projectTags: projectTags(record),
      background
    });

    school.admissionRecordCount += 1;
    school.admissionNames.add(record.school);
    school.scoreMin = school.scoreMin == null ? score2026 : Math.min(school.scoreMin, score2026);
    school.scoreMax = school.scoreMax == null ? score2026 : Math.max(school.scoreMax, score2026);
    if (background.status === 'verified') {
      school.evidenceRecordCount += 1;
      if (background.direction) school.directions.add(background.direction);
    } else {
      school.noEvidenceRecordCount += 1;
    }
  }

  const sortedRecords = sortRecords(records);
  const schools = [...schoolCoverage.values()].map(item => ({
    ...item,
    admissionNames: [...item.admissionNames].sort((a, b) => a.localeCompare(b, 'zh-CN')),
    directions: [...item.directions].sort((a, b) => a.localeCompare(b, 'zh-CN')),
    directionCount: item.directions.size,
    status: item.admissionRecordCount === 0
      ? 'no-admission-record'
      : item.evidenceRecordCount > 0
        ? 'partially-evidenced'
        : 'no-major-evidence'
  })).sort((a, b) =>
    b.admissionRecordCount - a.admissionRecordCount
    || b.evidenceRecordCount - a.evidenceRecordCount
    || a.officialName.localeCompare(b.officialName, 'zh-CN')
  );

  return {
    records: sortedRecords,
    schools,
    evaluatedRecordCount,
    unresolved211RecordCount,
    duplicateAdmissionRecordCount
  };
}

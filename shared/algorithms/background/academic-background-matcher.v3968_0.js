import {
  ACADEMIC_BACKGROUND_CONTRACT_VERSION,
  createAcademicBackgroundMatch,
  normalizeAcademicBackgroundScope
} from '../../resources/background/academic-background-contract.v3968_0.js';
import { getAcademicBackgroundSource } from '../../resources/background/academic-background-source-registry.v3968_0.js';

export const ACADEMIC_BACKGROUND_MATCHER_VERSION = 'academic-background-matcher-v3968_0';

const clean = (value, max = 180) => String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, max);
const lower = value => clean(value, 300).toLowerCase();
const sourceFor = id => getAcademicBackgroundSource(id) || {};

function evidenceId(scope, school, direction, type, index) {
  return [scope, school, direction, type, index].map(value => clean(value, 80).replace(/\W+/g, '-')).join(':');
}

function sourceEvidence({ scope, school, direction, type, detail, disciplineName, disciplineCode, grade, sourceId, index = 0, mappingType = 'legacy-reviewed' }) {
  const source = sourceFor(sourceId);
  return {
    evidenceId: evidenceId(scope, school, direction, type, index),
    evidenceType: type,
    disciplineName,
    disciplineCode,
    grade,
    detail,
    evidenceYear: source.sourceYear || '',
    source,
    verificationStatus: source.official ? 'verified-source-derived-mapping' : 'needs-source-review',
    canTriggerFrontend: source.official === true && source.canSupportDisciplineEvidence === true,
    mappingType,
    mappingVersion: ACADEMIC_BACKGROUND_MATCHER_VERSION
  };
}

function normalizeLocalEvidence(hit = {}) {
  const evidence = [];
  const evaluations = Array.isArray(hit.evidence?.disciplineEvaluation) ? hit.evidence.disciplineEvaluation : [];
  evaluations.forEach((item, index) => evidence.push(sourceEvidence({
    scope: 'liaoning',
    school: hit.school,
    direction: hit.direction,
    type: 'discipline-evaluation-fourth-round',
    detail: `${clean(item.disciplineName || hit.direction)}${item.grade ? ` ${item.grade}` : ''}`,
    disciplineName: clean(item.disciplineName || hit.direction),
    disciplineCode: clean(item.disciplineCode),
    grade: clean(item.grade),
    sourceId: 'MOE_FOURTH_DISCIPLINE_2017',
    index,
    mappingType: 'explicit-legacy-major-to-official-discipline'
  })));

  const doctoral = Array.isArray(hit.evidence?.doctoral) ? hit.evidence.doctoral : [];
  doctoral.forEach((item, index) => evidence.push(sourceEvidence({
    scope: 'liaoning',
    school: hit.school,
    direction: hit.direction,
    type: 'doctoral-authorization-legacy-unresolved',
    detail: clean(item.disciplineName || hit.direction),
    disciplineName: clean(item.disciplineName || hit.direction),
    sourceId: 'LEGACY_LOCAL_MAINLINE_INPUT',
    index,
    mappingType: 'legacy-unresolved'
  })));

  const other = Array.isArray(hit.evidence?.other) ? hit.evidence.other : [];
  other.forEach((item, index) => evidence.push(sourceEvidence({
    scope: 'liaoning',
    school: hit.school,
    direction: hit.direction,
    type: 'legacy-background-line',
    detail: clean(typeof item === 'string' ? item : JSON.stringify(item)),
    disciplineName: clean(hit.direction),
    sourceId: 'LEGACY_LOCAL_MAINLINE_INPUT',
    index,
    mappingType: 'legacy-unresolved'
  })));
  return evidence;
}

function normalize211Evidence(hit = {}) {
  const evidence = [];
  const text = clean(hit.evidenceText || hit.direction, 500);
  const normalized = lower(text);

  if (/第四轮|学科评估/.test(text)) {
    evidence.push(sourceEvidence({
      scope: '211',
      school: hit.school,
      direction: hit.direction,
      type: 'discipline-evaluation-fourth-round',
      detail: text,
      disciplineName: clean(hit.direction),
      sourceId: 'MOE_FOURTH_DISCIPLINE_2017',
      mappingType: 'explicit-legacy-major-to-official-discipline'
    }));
  }
  if (/双一流|一流学科/.test(text)) {
    evidence.push(sourceEvidence({
      scope: '211',
      school: hit.school,
      direction: hit.direction,
      type: 'double-first-class-discipline',
      detail: text,
      disciplineName: clean(hit.direction),
      sourceId: 'MOE_DOUBLE_FIRST_CLASS_2022',
      mappingType: 'explicit-legacy-major-to-official-discipline'
    }));
  }

  if (!evidence.length) {
    evidence.push(sourceEvidence({
      scope: '211',
      school: hit.school,
      direction: hit.direction,
      type: normalized.includes('博士') ? 'doctoral-authorization-legacy-unresolved' : 'legacy-background-line',
      detail: text,
      disciplineName: clean(hit.direction),
      sourceId: 'LEGACY_211_MAINLINE_INPUT',
      mappingType: 'legacy-unresolved'
    }));
  }
  return evidence;
}

export function normalizeLegacyAcademicBackgroundMatch(hit = {}, { scope = 'liaoning', record = {} } = {}) {
  const normalizedScope = normalizeAcademicBackgroundScope(scope);
  if (!hit?.matched) return createAcademicBackgroundMatch({ matched: false, scope: normalizedScope });
  const evidence = normalizedScope === '211' ? normalize211Evidence(hit) : normalizeLocalEvidence(hit);
  const eligible = evidence.some(item => item.canTriggerFrontend === true);
  const requestedLevel = ['primary', 'secondary', 'trajectory'].includes(hit.level) ? hit.level : 'trajectory';
  return createAcademicBackgroundMatch({
    matched: true,
    frontendEligible: eligible,
    scope: normalizedScope,
    school: hit.school || record.school,
    schoolEntityId: record.schoolEntityId || record.schoolId || '',
    canonicalMajorId: record.canonicalMajorId || record.majorId || '',
    matchedMajor: hit.matchedMajor || record.major,
    level: requestedLevel,
    direction: hit.direction,
    note: hit.humanNote || '',
    reviewPoints: hit.reviewPoints || [],
    evidence,
    mappingTrace: [
      `scope:${normalizedScope}`,
      `legacy-input:${normalizedScope === '211' ? 'v3933_14-v3933_16' : 'v3933_12'}`,
      `matcher:${ACADEMIC_BACKGROUND_MATCHER_VERSION}`,
      eligible ? 'source-gate:passed' : 'source-gate:blocked'
    ],
    legacyInput: {
      source: normalizedScope === '211' ? '211-mainline-kb' : 'local-mainline-kb',
      originalLevel: requestedLevel,
      contractVersion: ACADEMIC_BACKGROUND_CONTRACT_VERSION
    }
  });
}

export function academicBackgroundMatchCanRender(match = {}) {
  return match.matched === true && match.frontendEligible === true && Array.isArray(match.verifiedEvidence) && match.verifiedEvidence.length > 0;
}

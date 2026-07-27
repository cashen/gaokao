export const ACADEMIC_BACKGROUND_CONTRACT_VERSION = 'academic-background-v3968_0';
export const ACADEMIC_BACKGROUND_ASSET_VERSION = 'v3968_0';

export const ACADEMIC_BACKGROUND_SCOPES = Object.freeze(['liaoning', '211']);
export const ACADEMIC_BACKGROUND_LEVELS = Object.freeze(['primary', 'secondary', 'trajectory']);
export const ACADEMIC_BACKGROUND_VERIFICATION = Object.freeze([
  'verified',
  'verified-source-derived-mapping',
  'partial',
  'needs-source-review',
  'conflict'
]);

const LEVEL_LABELS = Object.freeze({
  primary: '本校方向',
  secondary: '本校相关',
  trajectory: '方向提醒'
});

export function normalizeAcademicBackgroundScope(value) {
  return String(value || '').toLowerCase() === '211' ? '211' : 'liaoning';
}

export function academicBackgroundLevelLabel(level) {
  return LEVEL_LABELS[level] || LEVEL_LABELS.trajectory;
}

export function createAcademicBackgroundEvidence(input = {}) {
  const source = input.source || {};
  return Object.freeze({
    evidenceId: String(input.evidenceId || ''),
    evidenceType: String(input.evidenceType || 'legacy-background-line'),
    disciplineCode: String(input.disciplineCode || ''),
    disciplineName: String(input.disciplineName || input.direction || ''),
    grade: String(input.grade || ''),
    detail: String(input.detail || ''),
    evidenceYear: String(input.evidenceYear || source.sourceYear || ''),
    effectiveAsOf: String(input.effectiveAsOf || ''),
    sourceId: String(source.sourceId || input.sourceId || ''),
    sourceTitle: String(source.sourceTitle || input.sourceTitle || ''),
    sourceUrl: String(source.sourceUrl || input.sourceUrl || ''),
    authority: String(source.authority || input.authority || ''),
    retrievedAt: String(source.retrievedAt || input.retrievedAt || ''),
    sourceHash: String(source.sourceHash || input.sourceHash || ''),
    verificationStatus: String(input.verificationStatus || 'needs-source-review'),
    canTriggerFrontend: input.canTriggerFrontend === true,
    mappingType: String(input.mappingType || 'legacy-reviewed'),
    mappingVersion: String(input.mappingVersion || ACADEMIC_BACKGROUND_CONTRACT_VERSION)
  });
}

export function isFrontendEligibleBackgroundEvidence(evidence = {}) {
  return evidence.canTriggerFrontend === true
    && Boolean(evidence.sourceId)
    && Boolean(evidence.sourceTitle)
    && Boolean(evidence.sourceUrl)
    && Boolean(evidence.evidenceYear)
    && ['verified', 'verified-source-derived-mapping'].includes(evidence.verificationStatus);
}

export function summarizeAcademicBackgroundSources(evidence = []) {
  const seen = new Set();
  return (Array.isArray(evidence) ? evidence : []).filter(isFrontendEligibleBackgroundEvidence).map(item => {
    const key = `${item.sourceId}|${item.evidenceYear}`;
    if (seen.has(key)) return null;
    seen.add(key);
    return Object.freeze({
      sourceId: item.sourceId,
      title: item.sourceTitle,
      url: item.sourceUrl,
      year: item.evidenceYear,
      authority: item.authority,
      retrievedAt: item.retrievedAt,
      sourceHash: item.sourceHash
    });
  }).filter(Boolean);
}

export function createAcademicBackgroundMatch(input = {}) {
  const evidence = Object.freeze((Array.isArray(input.evidence) ? input.evidence : []).map(createAcademicBackgroundEvidence));
  const verifiedEvidence = Object.freeze(evidence.filter(isFrontendEligibleBackgroundEvidence));
  const requestedLevel = ACADEMIC_BACKGROUND_LEVELS.includes(input.level) ? input.level : 'trajectory';
  const frontendEligible = verifiedEvidence.length > 0 && input.frontendEligible !== false;
  const level = frontendEligible ? requestedLevel : 'trajectory';
  return Object.freeze({
    matched: input.matched === true,
    frontendEligible,
    scope: normalizeAcademicBackgroundScope(input.scope),
    school: String(input.school || ''),
    schoolEntityId: String(input.schoolEntityId || ''),
    canonicalMajorId: String(input.canonicalMajorId || ''),
    matchedMajor: String(input.matchedMajor || ''),
    level,
    label: frontendEligible ? academicBackgroundLevelLabel(level) : '待核验线索',
    direction: String(input.direction || '专业背景'),
    note: String(input.note || ''),
    reviewPoints: Object.freeze((Array.isArray(input.reviewPoints) ? input.reviewPoints : []).filter(Boolean).slice(0, 4)),
    evidence,
    verifiedEvidence,
    sources: Object.freeze(summarizeAcademicBackgroundSources(verifiedEvidence)),
    verificationStatus: frontendEligible ? 'verified-source-derived-mapping' : 'needs-source-review',
    mappingTrace: Object.freeze((Array.isArray(input.mappingTrace) ? input.mappingTrace : []).filter(Boolean)),
    legacyInput: input.legacyInput ? Object.freeze({ ...input.legacyInput }) : null,
    boundary: '投档年份与背景证据年份分别说明；背景证据只用于学校专业方向复核，不代表录取判断或专业推荐。'
  });
}

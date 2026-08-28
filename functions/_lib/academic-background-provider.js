import {
  getLocalMainlineMeta,
  getSchoolSummaries as getLocalSchoolSummaries,
  getMajorSummaries as getLocalMajorSummaries,
  matchLocalMainline
} from './local-mainline-kb.js';
import {
  get211MainlineMeta,
  get211SchoolSummaries,
  get211MajorSummaries,
  match211Mainline
} from './211-mainline-kb.js';
import {
  normalizeAcademicBackgroundScope,
  summarizeAcademicBackgroundSources
} from '../../shared/resources/background/academic-background-contract.v3968_0.js';
import {
  ACADEMIC_BACKGROUND_SOURCE_REGISTRY_VERSION,
  listAcademicBackgroundSources
} from '../../shared/resources/background/academic-background-source-registry.v3968_0.js';
import {
  ACADEMIC_BACKGROUND_MATCHER_VERSION,
  academicBackgroundMatchCanRender,
  normalizeLegacyAcademicBackgroundMatch
} from '../../shared/algorithms/background/academic-background-matcher.v3968_0.js';

export const ACADEMIC_BACKGROUND_PROVIDER_VERSION = 'academic-background-provider-v3968_0';

function legacyMeta(scope) {
  return scope === '211' ? get211MainlineMeta() : getLocalMainlineMeta();
}

function normalizeSchoolSummary(item = {}, scope) {
  const name = item.school || item.name || '';
  return {
    school: name,
    name,
    scope,
    province: item.province || (scope === 'liaoning' ? '辽宁' : ''),
    city: item.city || '',
    overview: item.overview || item.summaryForParent || '',
    primaryCount: Number(item.primaryCount || item.primaryDirections?.length || 0),
    secondaryCount: Number(item.secondaryCount || item.secondaryDirections?.length || 0),
    trajectoryCount: Number(item.trajectoryCount || item.trajectoryWarnings?.length || 0),
    isMilitarySpecial: Boolean(item.isMilitarySpecial),
    specialBoundary: item.specialBoundary || ''
  };
}

function normalizeMajorSummary(item = {}, scope) {
  return {
    major: item.major || item.name || '',
    scope,
    schoolCount: Number(item.schoolCount || item.schools?.length || 0),
    primaryCount: Number(item.primaryCount || item.schools?.filter?.(entry => entry.level === 'primary')?.length || 0),
    secondaryCount: Number(item.secondaryCount || item.schools?.filter?.(entry => entry.level === 'secondary')?.length || 0),
    trajectoryCount: Number(item.trajectoryCount || item.schools?.filter?.(entry => entry.level === 'trajectory')?.length || 0),
    schools: Array.isArray(item.schools) ? item.schools : []
  };
}

export function getAcademicBackgroundMeta(scopeValue = 'liaoning') {
  const scope = normalizeAcademicBackgroundScope(scopeValue);
  const legacy = legacyMeta(scope) || {};
  return {
    providerVersion: ACADEMIC_BACKGROUND_PROVIDER_VERSION,
    matcherVersion: ACADEMIC_BACKGROUND_MATCHER_VERSION,
    sourceRegistryVersion: ACADEMIC_BACKGROUND_SOURCE_REGISTRY_VERSION,
    scope,
    audienceYear: 2027,
    admissionDataYear: 2026,
    historyYears: [2025, 2024],
    rankYear: 2026,
    backgroundEvidenceUsesOwnYear: true,
    legacyInput: {
      version: legacy.meta?.version || '',
      assetVersion: legacy.meta?.assetVersion || '',
      generatedAt: legacy.meta?.generatedAt || '',
      executionRole: 'migration-input-only'
    },
    officialSources: listAcademicBackgroundSources({ officialOnly: true }),
    boundary: '2026、2025、2024是投档与位次年份；学校背景证据按各自来源年份展示。旧KB只作为迁移输入，缺少权威来源的描述不允许触发附近专业结果。'
  };
}

export function getAcademicBackgroundSchoolSummaries(scopeValue = 'liaoning') {
  const scope = normalizeAcademicBackgroundScope(scopeValue);
  const source = scope === '211' ? get211SchoolSummaries() : getLocalSchoolSummaries();
  return (Array.isArray(source) ? source : []).map(item => normalizeSchoolSummary(item, scope));
}

export function getAcademicBackgroundMajorSummaries(scopeValue = 'liaoning') {
  const scope = normalizeAcademicBackgroundScope(scopeValue);
  const source = scope === '211' ? get211MajorSummaries() : getLocalMajorSummaries();
  return (Array.isArray(source) ? source : []).map(item => normalizeMajorSummary(item, scope));
}

export function matchAcademicBackground(record = {}, scopeValue = 'liaoning', options = {}) {
  const scope = normalizeAcademicBackgroundScope(scopeValue);
  const legacyHit = scope === '211' ? match211Mainline(record) : matchLocalMainline(record);
  const normalized = normalizeLegacyAcademicBackgroundMatch(legacyHit, { scope, record });
  if (options.includePending === true) return normalized;
  return academicBackgroundMatchCanRender(normalized) ? normalized : null;
}

export function presentAcademicBackground(match = {}) {
  if (!match?.matched) return null;
  return {
    contract: 'academic-background-v3968_0',
    scope: match.scope,
    label: match.label,
    level: match.level,
    direction: match.direction,
    matchedMajor: match.matchedMajor,
    verificationStatus: match.verificationStatus,
    evidence: match.verifiedEvidence || [],
    sources: summarizeAcademicBackgroundSources(match.verifiedEvidence || []),
    reviewPoints: match.reviewPoints || [],
    note: match.note || '',
    mappingTrace: match.mappingTrace || [],
    boundary: match.boundary
  };
}

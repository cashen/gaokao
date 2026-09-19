// Shared resolver facade for source-derived school social labels.
// The alias table below is explicit source-name normalization, not fuzzy matching.
import {
  SCHOOL_SOCIAL_LABEL_SOURCE_VERSION as RAW_SOURCE_VERSION,
  SCHOOL_SOCIAL_LABEL_SOURCE_META as RAW_SOURCE_META,
  SCHOOL_SOCIAL_LABELS,
  getSchoolSocialLabels as getRawSchoolSocialLabels,
  getSchoolSocialLabelsForNames as getRawSchoolSocialLabelsForNames,
  getSchoolSocialLabelSchools as getRawSchoolSocialLabelSchools,
  hasSchoolSocialLabel as hasRawSchoolSocialLabel
} from './school-social-labels.v002_1.js';

export const SCHOOL_SOCIAL_LABEL_SHARED_VERSION = 'school-social-label-shared-v001';
export const SCHOOL_SOCIAL_LABEL_SOURCE_VERSION = RAW_SOURCE_VERSION;
export const SCHOOL_SOCIAL_LABEL_SOURCE_META = Object.freeze({
  ...RAW_SOURCE_META,
  sharedResolverVersion: SCHOOL_SOCIAL_LABEL_SHARED_VERSION,
  relationCount: Number(RAW_SOURCE_META.sourceRelationCount ?? RAW_SOURCE_META.relationCount ?? 0),
  explicitSourceNameAliases: 1,
  fuzzyMatching: false,
  inferredRelations: false
});
export { SCHOOL_SOCIAL_LABELS };

const SOURCE_NAME_ALIASES = Object.freeze({
  '江西现代职业学院': '江西现代职业技术学院'
});

function normalizeSourceName(name) {
  const clean = String(name ?? '').replace(/\s+/g, ' ').trim();
  return SOURCE_NAME_ALIASES[clean] || clean;
}

export function getSchoolSocialLabels(name) {
  return getRawSchoolSocialLabels(normalizeSourceName(name));
}

export function getSchoolSocialLabelsForNames(names = []) {
  const values = Array.isArray(names) ? names : [names];
  return getRawSchoolSocialLabelsForNames(values.map(normalizeSourceName));
}

export function getSchoolSocialLabelSchools(label) {
  return getRawSchoolSocialLabelSchools(label);
}

export function hasSchoolSocialLabel(name, label) {
  return hasRawSchoolSocialLabel(normalizeSourceName(name), label);
}
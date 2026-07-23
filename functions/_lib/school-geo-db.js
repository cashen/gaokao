import { SCHOOL_GEO_REFERENCE, SCHOOL_GEO_SOURCE_META } from './school-geo-reference.generated.js';
import { SCHOOL_GEO_CAMPUS_OVERRIDES } from './school-geo-campus-overrides.js';
import { deriveRegionGroups } from '../../shared/resources/geo/china-region-catalog.js';

function unique(arr) {
  const out = [];
  for (const item of arr || []) if (item && !out.includes(item)) out.push(item);
  return out;
}

function groupsFor(province, city, original = []) {
  return unique([...(original || []), ...deriveRegionGroups({ province, city })]);
}

function applyOverride(item) {
  const patch = SCHOOL_GEO_CAMPUS_OVERRIDES[item.canonical];
  if (!patch) return {
    ...item,
    groups: groupsFor(item.province, item.city, item.groups)
  };
  return {
    ...item,
    ...patch,
    confidence: patch.confidence || item.confidence || 'high',
    groups: groupsFor(patch.province || item.province, patch.city || item.city, item.groups),
    locationWarning: patch.locationWarning || item.locationWarning || ''
  };
}

export const SCHOOL_GEO_DB = SCHOOL_GEO_REFERENCE.map(applyOverride);
export { SCHOOL_GEO_SOURCE_META };

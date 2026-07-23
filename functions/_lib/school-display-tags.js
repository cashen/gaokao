import { resolveSchoolProfile, getSchoolProfileDisplayTags } from '../../shared/resources/schools/school-profile-center.js';
import { enrichBottomLineFields } from './bottomline-policy.js';

function text(value) { return String(value || '').trim(); }
function fallbackNature(record = {}) {
  const value = [record.natureType, record.schoolNature, record.natureLabel, record.nature, record.natureRaw].map(text).join(' ');
  if (/民办|独立/.test(value)) return { natureType: 'private', natureLabel: '民办' };
  if (/合作办学/.test(value)) return { natureType: 'cooperative', natureLabel: '合作办学' };
  if (/公办/.test(value)) return { natureType: 'public', natureLabel: '公办' };
  return { natureType: 'unknown', natureLabel: '性质待核验' };
}

export function makeDisplayLocation(record = {}) {
  const profile = record.schoolProfile || resolveSchoolProfile(record.school, record);
  if (profile?.displayLocation) return profile.displayLocation;
  if (record.displayLocation) return record.displayLocation;
  const province = text(record.province);
  const city = text(record.city);
  return province && city ? `${province} · ${city}` : (city || province || text(record.lnArea || record.region) || '地域待核验');
}

export function buildDisplayTags(record = {}) {
  const profile = record.schoolProfile || resolveSchoolProfile(record.school, record);
  const nature = profile ? { natureType: profile.natureType, natureLabel: profile.natureLabel } : fallbackNature(record);
  const displayLocation = makeDisplayLocation({ ...record, schoolProfile: profile });
  const schoolTierTags = profile?.schoolTierTags ? [...profile.schoolTierTags] : (Array.isArray(record.schoolTierTags) ? record.schoolTierTags : []);
  const schoolTags = schoolTierTags.length ? schoolTierTags : (profile?.isNon985211 ? ['双非（非985/211）'] : []);
  const bottomLine = enrichBottomLineFields({ ...record, natureLabel: nature.natureLabel, natureType: nature.natureType, schoolTags });
  return {
    schoolProfile: profile || null,
    schoolTags,
    schoolTierTags: schoolTags,
    natureLabel: nature.natureLabel,
    natureType: nature.natureType,
    is985: Boolean(profile?.is985),
    is211: Boolean(profile?.is211),
    isNon985211: Boolean(profile?.isNon985211),
    schoolEntityType: profile?.entityType || 'official_school',
    schoolEntityTypeLabel: profile?.entityTypeLabel || '',
    parentSchoolName: profile?.parentSchoolName || '',
    schoolProfileDisplayTags: profile ? getSchoolProfileDisplayTags(profile) : [...new Set([...schoolTags, nature.natureLabel, displayLocation].filter(Boolean))],
    schoolProfileSource: profile?.sourceName || '',
    schoolProfileSourceUrl: profile?.sourceUrl || '',
    schoolProfileAsOfDate: profile?.sourceAsOfDate || '',
    doubleNonDefinition: profile?.doubleNonDefinition || '非985且非211；不等同于非双一流',
    ...bottomLine,
    displayLocation,
    province: profile?.province?.replace(/省$|市$|自治区$/g, '') || record.province || '',
    city: profile?.city?.replace(/市$|地区$|自治州$/g, '') || record.city || '',
    locationSource: profile ? 'school-profile-center' : (record.locationSource || ''),
    locationConfidence: profile?.confidence || record.locationConfidence || '',
    locationWarning: record.locationWarning || '',
    geoEntity: profile?.school || record.geoEntity || '',
    schoolCanonical: profile?.standardSchoolName || record.schoolCanonical || '',
    regionGroups: profile?.regionGroups || record.regionGroups || [],
    geoSourceMethod: profile ? 'official-2026-school-profile' : (record.geoSourceMethod || ''),
    geoSourceName: profile?.sourceName || record.geoSourceName || '',
    geoSourceUrl: profile?.sourceUrl || record.geoSourceUrl || '',
    geoSourceYear: profile ? 2026 : (record.geoSourceYear || ''),
    geoMatchNote: profile?.matchNote || record.geoMatchNote || '',
    schoolIdentifier: profile?.schoolIdentifier || record.schoolIdentifier || ''
  };
}

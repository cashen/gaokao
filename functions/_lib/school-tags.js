import { resolveSchoolProfile } from '../../shared/resources/schools/school-profile-center.js';

export function getSchoolTags(school) {
  const profile = resolveSchoolProfile(school);
  return profile?.schoolTierTags ? [...profile.schoolTierTags] : [];
}

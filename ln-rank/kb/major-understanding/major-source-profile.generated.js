// PR194 source-backed major interpretation profiles generated from eo.srgaoxiao.cn.
// The source is an additive knowledge layer; canonical identity remains the 2026 catalog.
import { MAJOR_SOURCE_PROFILE_CHUNK_01 } from './major-source-profile-01.generated.js?v=pr194';
import { MAJOR_SOURCE_PROFILE_CHUNK_02 } from './major-source-profile-02.generated.js?v=pr194';
import { MAJOR_SOURCE_PROFILE_CHUNK_03 } from './major-source-profile-03.generated.js?v=pr194';
import { MAJOR_SOURCE_PROFILE_CHUNK_04 } from './major-source-profile-04.generated.js?v=pr194';
import { MAJOR_SOURCE_PROFILE_CHUNK_05 } from './major-source-profile-05.generated.js?v=pr194';
import { MAJOR_SOURCE_PROFILE_CHUNK_06 } from './major-source-profile-06.generated.js?v=pr194';
import { MAJOR_SOURCE_PROFILE_CHUNK_07 } from './major-source-profile-07.generated.js?v=pr194';
import { MAJOR_SOURCE_PROFILE_CHUNK_08 } from './major-source-profile-08.generated.js?v=pr194';
import { MAJOR_SOURCE_PROFILE_CHUNK_09 } from './major-source-profile-09.generated.js?v=pr194';
import { MAJOR_SOURCE_PROFILE_CHUNK_10 } from './major-source-profile-10.generated.js?v=pr194';
import { MAJOR_SOURCE_PROFILE_CHUNK_11 } from './major-source-profile-11.generated.js?v=pr194';
import { MAJOR_SOURCE_PROFILE_CHUNK_12 } from './major-source-profile-12.generated.js?v=pr194';
import { MAJOR_SOURCE_PROFILE_CHUNK_13 } from './major-source-profile-13.generated.js?v=pr194-flow002';

const PROFILE_LIST = Object.freeze([MAJOR_SOURCE_PROFILE_CHUNK_01, MAJOR_SOURCE_PROFILE_CHUNK_02, MAJOR_SOURCE_PROFILE_CHUNK_03, MAJOR_SOURCE_PROFILE_CHUNK_04, MAJOR_SOURCE_PROFILE_CHUNK_05, MAJOR_SOURCE_PROFILE_CHUNK_06, MAJOR_SOURCE_PROFILE_CHUNK_07, MAJOR_SOURCE_PROFILE_CHUNK_08, MAJOR_SOURCE_PROFILE_CHUNK_09, MAJOR_SOURCE_PROFILE_CHUNK_10, MAJOR_SOURCE_PROFILE_CHUNK_11, MAJOR_SOURCE_PROFILE_CHUNK_12, MAJOR_SOURCE_PROFILE_CHUNK_13].flat());
const PROFILE_BY_CODE = Object.freeze(Object.fromEntries(PROFILE_LIST.map(item => [String(item.code), Object.freeze(item)])));

export const MAJOR_SOURCE_PROFILE_META = Object.freeze({
  version: 'pr194-major-source-profile-v001',
  source: 'eo.srgaoxiao.cn',
  sourceApi: '/api/specialties/{slug}',
  retrievedAt: '2026-08-24',
  canonicalCount: 883,
  verifiedCount: PROFILE_LIST.length,
  missingCount: 883 - PROFILE_LIST.length,
  fields: Object.freeze(['whatIs', 'whatLearn', 'whatDo', 'careerPath']),
  fallbackPolicy: 'official-first; student-voice-is-separate'
});

export function getMajorSourceProfile(code = '') {
  const key = String(code || '').trim();
  return key ? PROFILE_BY_CODE[key] || null : null;
}

export function majorSourceInterpretation(code = '') {
  const profile = getMajorSourceProfile(code);
  if (!profile) return Object.freeze({ available: false, status: 'missing', source: null, fields: Object.freeze({}) });
  const fields = Object.freeze({
    whatIs: String(profile.whatIs || '').trim(),
    whatLearn: String(profile.whatLearn || '').trim(),
    whatDo: String(profile.whatDo || '').trim(),
    careerPath: String(profile.careerPath || '').trim()
  });
  return Object.freeze({
    available: Object.values(fields).some(Boolean),
    status: profile.sourceStatus || 'verified',
    source: Object.freeze({ site: 'eo.srgaoxiao.cn', url: profile.sourceUrl || '', retrievedAt: profile.retrievedAt || '', reviewCount: Number(profile.sourceReviewCount || 0) }),
    fields
  });
}

export { PROFILE_LIST as MAJOR_SOURCE_PROFILE_LIST };

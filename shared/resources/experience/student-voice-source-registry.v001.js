export const STUDENT_VOICE_SOURCE_REGISTRY_VERSION = 'student-voice-source-registry-v0.01';

const PUBLISHED_MIRRORS = Object.freeze([
  'https://eo.srgaoxiao.cn',
  'https://eo.srgaoxiao.com',
  'https://srgaoxiao.cn',
  'https://srgaoxiao.com'
]);
const VERIFIED_API_HOSTS = Object.freeze([
  'https://eo.srgaoxiao.cn',
  'https://eo.srgaoxiao.com',
  'https://srgaoxiao.cn'
]);

export const STUDENT_VOICE_SOURCE = Object.freeze({
  id: 'srgaoxiao',
  name: '神人高校网',
  pageOrigin: 'https://eo.srgaoxiao.cn',
  mirrors: PUBLISHED_MIRRORS,
  apiHosts: VERIFIED_API_HOSTS,
  observedAt: '2026-08-21',
  observedBoundary: 'GitHub Actions live probe: eo.srgaoxiao.cn / eo.srgaoxiao.com / srgaoxiao.cn returned usable public API responses; srgaoxiao.com returned an edge 403 from the probe origin, so it remains a published mirror but is not in the active API failover list.',
  capabilities: Object.freeze({
    school: true,
    major: true,
    schoolMajor: false,
    majorReviewSchoolBinding: false
  }),
  schema: Object.freeze({
    schoolDetailRequired: Object.freeze(['id']),
    schoolReviewRequired: Object.freeze(['content']),
    specialtyListRequired: Object.freeze(['id', 'name', 'code', 'slug']),
    specialtyReviewRequired: Object.freeze(['id', 'content', 'specialty_id'])
  })
});

export function studentVoiceSourceHosts() {
  return [...STUDENT_VOICE_SOURCE.apiHosts];
}

export function studentVoicePublishedMirrors() {
  return [...STUDENT_VOICE_SOURCE.mirrors];
}

export function studentVoiceSourceCapability(scope = 'school') {
  if (scope === 'major') return STUDENT_VOICE_SOURCE.capabilities.major;
  if (scope === 'school_major') return STUDENT_VOICE_SOURCE.capabilities.schoolMajor;
  return STUDENT_VOICE_SOURCE.capabilities.school;
}

export function studentVoiceSourcePage(path = '/') {
  const cleanPath = String(path || '/').startsWith('/') ? String(path || '/') : `/${path}`;
  return `${STUDENT_VOICE_SOURCE.pageOrigin}${cleanPath}`;
}
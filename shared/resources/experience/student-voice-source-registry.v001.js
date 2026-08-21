export const STUDENT_VOICE_SOURCE_REGISTRY_VERSION = 'student-voice-source-registry-v0.01';

export const STUDENT_VOICE_SOURCE = Object.freeze({
  id: 'srgaoxiao',
  name: '神人高校网',
  pageOrigin: 'https://eo.srgaoxiao.cn',
  mirrors: Object.freeze([
    'https://eo.srgaoxiao.cn',
    'https://eo.srgaoxiao.com',
    'https://srgaoxiao.cn',
    'https://srgaoxiao.com'
  ]),
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

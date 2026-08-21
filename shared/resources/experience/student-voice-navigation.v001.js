export const STUDENT_VOICE_NAVIGATION_VERSION = 'student-voice-navigation-v0.01';
export const STUDENT_VOICE_NAVIGATION_META = Object.freeze({
  version:STUDENT_VOICE_NAVIGATION_VERSION,
  targetPath:'/tongxue/',
  scope:'major'
});

function clean(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function cleanCode(value = '') {
  const code = clean(value).toUpperCase();
  return /^[0-9A-Z]{4,10}$/.test(code) ? code : '';
}

function cleanReturnTo(value = '') {
  const text = String(value || '').trim();
  if (!text.startsWith('/') || text.startsWith('//')) return '';
  try {
    const parsed = new URL(text, 'https://same-origin.invalid');
    if (parsed.origin !== 'https://same-origin.invalid') return '';
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return '';
  }
}

export function buildStudentVoiceMajorHref({ majorCode='', canonicalName='', topic='general', returnTo='' } = {}) {
  const code = cleanCode(majorCode);
  const name = clean(canonicalName);
  if (!code || !name) return '';
  const params = new URLSearchParams({ scope:'major', majorCode:code, major:name });
  const normalizedTopic = clean(topic);
  if (normalizedTopic && normalizedTopic !== 'general' && /^[a-z_]{1,40}$/.test(normalizedTopic)) params.set('topic', normalizedTopic);
  const returnTarget = cleanReturnTo(returnTo);
  if (returnTarget) params.set('returnTo', returnTarget);
  return `${STUDENT_VOICE_NAVIGATION_META.targetPath}?${params.toString()}`;
}

export function readStudentVoiceMajorContext(locationLike = globalThis.location) {
  const href = locationLike?.href || String(locationLike || '');
  let url;
  try { url = new URL(href, 'https://same-origin.invalid'); } catch { return Object.freeze({ scope:'', majorCode:'', major:'', topic:'general', returnTo:'' }); }
  const scope = url.searchParams.get('scope') === 'major' ? 'major' : '';
  return Object.freeze({
    scope,
    majorCode:scope ? cleanCode(url.searchParams.get('majorCode')) : '',
    major:scope ? clean(url.searchParams.get('major')) : '',
    topic:scope && /^[a-z_]{1,40}$/.test(clean(url.searchParams.get('topic'))) ? clean(url.searchParams.get('topic')) : 'general',
    returnTo:scope ? cleanReturnTo(url.searchParams.get('returnTo')) : ''
  });
}

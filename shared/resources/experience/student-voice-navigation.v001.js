import {
  DECISION_CONTEXT_QUERY_KEY,
  decodeDecisionContext,
  encodeDecisionContext,
  validateDecisionContext
} from '../../decision-context/decision-context.v001.js';

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

function cleanContext(value = '') {
  const text = clean(value);
  return text === 'school' ? 'school' : (text === 'score' ? 'score' : '');
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

export function buildStudentVoiceMajorHref({ majorCode='', canonicalName='', topic='general', sourceKey='', context='', returnTo='', decisionContext=null } = {}) {
  const code = cleanCode(majorCode);
  const name = clean(canonicalName);
  if (!code || !name) return '';
  const params = new URLSearchParams({ scope:'major', majorCode:code, major:name });
  const normalizedTopic = clean(topic);
  if (normalizedTopic && normalizedTopic !== 'general' && /^[a-z_]{1,40}$/.test(normalizedTopic)) params.set('topic', normalizedTopic);
  const key = clean(sourceKey).slice(0, 160);
  if (key) params.set('sourceKey', key);
  const sourceContext = cleanContext(context);
  if (sourceContext) params.set('context', sourceContext);
  const returnTarget = cleanReturnTo(returnTo);
  if (returnTarget) params.set('returnTo', returnTarget);
  const normalizedContext = decisionContext ? validateDecisionContext(decisionContext) : null;
  const encodedContext = normalizedContext ? encodeDecisionContext(normalizedContext) : '';
  if (encodedContext) params.set(DECISION_CONTEXT_QUERY_KEY, encodedContext);
  return `${STUDENT_VOICE_NAVIGATION_META.targetPath}?${params.toString()}`;
}

export function readStudentVoiceMajorContext(locationLike = globalThis.location) {
  const href = locationLike?.href || String(locationLike || '');
  let url;
  try { url = new URL(href, 'https://same-origin.invalid'); } catch { return Object.freeze({ scope:'', majorCode:'', major:'', topic:'general', sourceKey:'', context:'', returnTo:'' }); }
  const scope = url.searchParams.get('scope') === 'major' ? 'major' : '';
  const decisionContext = decodeDecisionContext(url.searchParams.get(DECISION_CONTEXT_QUERY_KEY));
  return Object.freeze({
    scope,
    majorCode:scope ? cleanCode(url.searchParams.get('majorCode')) : '',
    major:scope ? clean(url.searchParams.get('major')) : '',
    topic:scope && /^[a-z_]{1,40}$/.test(clean(url.searchParams.get('topic'))) ? clean(url.searchParams.get('topic')) : 'general',
    sourceKey:scope ? clean(url.searchParams.get('sourceKey')).slice(0, 160) : '',
    context:scope ? cleanContext(url.searchParams.get('context')) : '',
    returnTo:scope ? cleanReturnTo(url.searchParams.get('returnTo')) : '',
    decisionContext:scope ? decisionContext : null
  });
}

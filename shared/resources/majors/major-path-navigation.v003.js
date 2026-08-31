import {
  DECISION_CONTEXT_QUERY_KEY,
  decodeDecisionContext,
  encodeDecisionContext,
  validateDecisionContext
} from '../../decision-context/decision-context.v001.js';

export const MAJOR_PATH_NAVIGATION_META = Object.freeze({
  version: 'major-path-navigation-v0.03',
  targetPath: '/major-path/',
  sourcePath: '/ln-rank/',
  policy: 'canonical-major-code-direct-entry-same-origin-return-only',
  maxUrlLength: 1800
});

function text(value = '') {
  return String(value || '').trim();
}

function allowedReturnPath(pathname = '') {
  return ['/ln-rank/', '/tongxue/'].some(prefix => pathname.startsWith(prefix));
}

export function sanitizeMajorPathReturnTarget(value, { origin = 'https://gaokao.powers.org.cn' } = {}) {
  const raw = text(value);
  if (!raw) return '/ln-rank/';
  let url;
  try {
    url = new URL(raw, origin);
  } catch {
    return '/ln-rank/';
  }
  const expectedOrigin = new URL(origin).origin;
  if (url.origin !== expectedOrigin || !allowedReturnPath(url.pathname)) return '/ln-rank/';
  return `${url.pathname}${url.search}${url.hash}`;
}

export function buildMajorPathHref({
  majorCode,
  canonicalName = '',
  context = 'score',
  sourceKey = '',
  sourceMajor = '',
  school = '',
  sourceSurface = '',
  returnTo = '/ln-rank/',
  decisionContext = null
} = {}) {
  const code = text(majorCode).toUpperCase();
  if (!code) return '';
  const surface = text(sourceSurface);
  const params = new URLSearchParams({
    majorCode: code,
    from: surface === 'tongxue' ? 'tongxue' : 'ln-rank',
    context: context === 'school' ? 'school' : 'score'
  });
  if (canonicalName) params.set('canonicalName', text(canonicalName));
  if (sourceKey) params.set('sourceKey', text(sourceKey));
  if (sourceMajor) params.set('sourceMajor', text(sourceMajor));
  if (school) params.set('school', text(school));
  if (surface) params.set('sourceSurface', surface);
  params.set('returnTo', sanitizeMajorPathReturnTarget(returnTo));
  const normalizedContext = decisionContext ? validateDecisionContext(decisionContext) : null;
  const encodedContext = normalizedContext ? encodeDecisionContext(normalizedContext) : '';
  if (encodedContext) {
    params.set(DECISION_CONTEXT_QUERY_KEY, encodedContext);
    if (`${MAJOR_PATH_NAVIGATION_META.targetPath}?${params.toString()}`.length > MAJOR_PATH_NAVIGATION_META.maxUrlLength) {
      params.delete(DECISION_CONTEXT_QUERY_KEY);
    }
  }
  return `${MAJOR_PATH_NAVIGATION_META.targetPath}?${params.toString()}`;
}

export function readMajorPathSourceContext(locationLike = globalThis.location) {
  const url = new URL(locationLike?.href || String(locationLike || ''), 'https://gaokao.powers.org.cn');
  const majorCode = text(url.searchParams.get('majorCode')).toUpperCase();
  const decisionContext = decodeDecisionContext(url.searchParams.get(DECISION_CONTEXT_QUERY_KEY));
  const fromLnRank = url.searchParams.get('from') === 'ln-rank';
  const fromTongxue = url.searchParams.get('from') === 'tongxue';
  return Object.freeze({
    majorCode,
    fromLnRank,
    fromTongxue,
    context: url.searchParams.get('context') === 'school' ? 'school' : 'score',
    sourceKey: text(url.searchParams.get('sourceKey')),
    sourceMajor: text(url.searchParams.get('sourceMajor')),
    sourceSurface: text(url.searchParams.get('sourceSurface')),
    canonicalName: text(url.searchParams.get('canonicalName')),
    school: text(url.searchParams.get('school')),
    returnTo: sanitizeMajorPathReturnTarget(url.searchParams.get('returnTo') || '/ln-rank/', { origin: url.origin }),
    decisionContext
  });
}

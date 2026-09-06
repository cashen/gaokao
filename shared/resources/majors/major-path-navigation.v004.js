import {
  DECISION_CONTEXT_QUERY_KEY,
  decodeDecisionContext,
  encodeDecisionContext,
  validateDecisionContext
} from '../../decision-context/decision-context.v001.js';

export const MAJOR_PATH_NAVIGATION_META = Object.freeze({
  version: 'major-path-navigation-v0.04',
  targetPath: '/major-path/',
  sourcePath: '/ln-rank/',
  policy: 'canonical-major-code-explicit-source-safe-return-only',
  sourceSurfaces: Object.freeze([
    'ln-rank-score', 'ln-rank-school', 'ln-rank-major', 'tongxue-major',
    'academic-background', 'aiplus', 'direct', 'share', 'major-path'
  ]),
  maxUrlLength: 1800
});

function text(value = '') {
  return String(value || '').trim();
}

function allowedReturnPath(pathname = '') {
  return ['/ln-rank/', '/tongxue/', '/aiplus/'].some(prefix => pathname.startsWith(prefix));
}

function inspectReturnTarget(value, { origin = 'https://gaokao.powers.org.cn' } = {}) {
  const raw = text(value);
  if (!raw) return Object.freeze({ target: '', state: 'missing' });
  let url;
  try {
    url = new URL(raw, origin);
  } catch {
    return Object.freeze({ target: '/ln-rank/', state: 'invalid' });
  }
  const expectedOrigin = new URL(origin).origin;
  if (url.origin !== expectedOrigin || !allowedReturnPath(url.pathname)) {
    return Object.freeze({ target: '/ln-rank/', state: 'invalid' });
  }
  return Object.freeze({ target: `${url.pathname}${url.search}${url.hash}`, state: 'available' });
}

export function inspectMajorPathReturnTarget(value, options = {}) {
  return inspectReturnTarget(value, options);
}

export function sanitizeMajorPathReturnTarget(value, { origin = 'https://gaokao.powers.org.cn' } = {}) {
  return inspectReturnTarget(value, { origin }).target || '/ln-rank/';
}

export function buildMajorPathHref({
  majorCode,
  canonicalName = '',
  context = 'score',
  sourceKey = '',
  sourceMajor = '',
  school = '',
  sourceSurface = '',
  returnTo = '',
  decisionContext = null
} = {}) {
  const code = text(majorCode).toUpperCase();
  if (!code) return '';
  const surface = text(sourceSurface);
  const sourceType = surface === 'tongxue-major' || surface === 'tongxue' ? 'tongxue' :
    surface === 'direct' || surface === 'share' ? surface : 'ln-rank';
  const returnInfo = inspectReturnTarget(returnTo);
  const params = new URLSearchParams({
    majorCode: code,
    from: sourceType,
    context: context === 'school' ? 'school' : 'score'
  });
  if (canonicalName) params.set('canonicalName', text(canonicalName));
  if (sourceKey) params.set('sourceKey', text(sourceKey));
  if (sourceMajor) params.set('sourceMajor', text(sourceMajor));
  if (school) params.set('school', text(school));
  if (surface) params.set('sourceSurface', surface);
  params.set('returnTo', returnInfo.target || '/ln-rank/');
  params.set('returnState', returnInfo.state);
  const normalizedContext = decisionContext ? validateDecisionContext(decisionContext) : null;
  const encodedContext = normalizedContext ? encodeDecisionContext(normalizedContext) : '';
  if (encodedContext) {
    params.set(DECISION_CONTEXT_QUERY_KEY, encodedContext);
    if (`${MAJOR_PATH_NAVIGATION_META.targetPath}?${params.toString()}`.length > MAJOR_PATH_NAVIGATION_META.maxUrlLength) {
      params.delete(DECISION_CONTEXT_QUERY_KEY);
      params.set('contextState', 'omitted');
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
  const sourceSurface = text(url.searchParams.get('sourceSurface'));
  const returnInfo = inspectReturnTarget(url.searchParams.get('returnTo'), { origin: url.origin });
  return Object.freeze({
    majorCode,
    fromLnRank,
    fromTongxue,
    context: url.searchParams.get('context') === 'school' ? 'school' : 'score',
    sourceKey: text(url.searchParams.get('sourceKey')),
    sourceMajor: text(url.searchParams.get('sourceMajor')),
    sourceSurface,
    sourceType: sourceSurface || (fromTongxue ? 'tongxue-major' : fromLnRank ? 'ln-rank-major' : 'direct'),
    canonicalName: text(url.searchParams.get('canonicalName')),
    school: text(url.searchParams.get('school')),
    returnTo: returnInfo.target || '/ln-rank/',
    returnState: url.searchParams.get('returnState') || returnInfo.state,
    contextState: url.searchParams.get('contextState') === 'omitted' ? 'omitted' : decisionContext ? 'available' : 'none',
    decisionContext
  });
}

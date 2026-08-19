import { normalizeBackgroundScope } from './academic-background-context.v001.js';
import { buildMajorPathHref } from '../majors/major-path-navigation.v003.js?v=003_0';

export const ACADEMIC_BACKGROUND_NAVIGATION_VERSION = 'academic-background-navigation-v0.01';
export const ACADEMIC_BACKGROUND_PATHS = Object.freeze({
  liaoning: '/ln-rank/local-mainline.html',
  '211': '/ln-rank/211-mainline.html'
});

function text(value = '') {
  return String(value || '').trim();
}

function safeReturnPath(pathname = '') {
  return pathname.startsWith('/ln-rank/') || pathname.startsWith('/major-path/') || pathname.startsWith('/aiplus/');
}

export function sanitizeAcademicBackgroundReturnTarget(value, { origin = 'https://gaokao.powers.org.cn' } = {}) {
  const raw = text(value);
  if (!raw) return '/major-path/';
  let url;
  try { url = new URL(raw, origin); } catch { return '/major-path/'; }
  const expectedOrigin = new URL(origin).origin;
  if (url.origin !== expectedOrigin || !safeReturnPath(url.pathname)) return '/major-path/';
  return `${url.pathname}${url.search}${url.hash}`;
}

export function buildAcademicBackgroundHref({
  scope = 'liaoning', majorCode = '', canonicalName = '', school = '', from = 'major-path', returnTo = '/major-path/'
} = {}) {
  const normalizedScope = normalizeBackgroundScope(scope);
  if (normalizedScope === 'auto') return '';
  const path = ACADEMIC_BACKGROUND_PATHS[normalizedScope];
  if (!path) return '';
  const params = new URLSearchParams();
  params.set('view', school ? 'school' : (normalizedScope === '211' ? 'major' : 'list_all'));
  const code = text(majorCode).toUpperCase();
  if (code) params.set('majorCode', code);
  if (canonicalName) {
    params.set('canonicalName', text(canonicalName));
    params.set('major', text(canonicalName));
  }
  if (school) params.set('school', text(school));
  if (from) params.set('from', text(from));
  params.set('returnTo', sanitizeAcademicBackgroundReturnTarget(returnTo));
  return `${path}?${params.toString()}`;
}

export function readAcademicBackgroundNavigationContext(locationLike = globalThis.location) {
  const url = new URL(locationLike?.href || String(locationLike || ''), 'https://gaokao.powers.org.cn');
  const scope = url.pathname.includes('211-mainline') ? '211' : 'liaoning';
  return Object.freeze({
    scope,
    majorCode: text(url.searchParams.get('majorCode')).toUpperCase(),
    canonicalName: text(url.searchParams.get('canonicalName') || url.searchParams.get('major')),
    school: text(url.searchParams.get('school')),
    from: text(url.searchParams.get('from')),
    returnTo: sanitizeAcademicBackgroundReturnTarget(url.searchParams.get('returnTo') || '/major-path/', { origin: url.origin })
  });
}

export function buildMajorPathFromAcademicBackgroundHref({
  majorCode = '', canonicalName = '', school = '', sourceMajor = '', returnTo = '/ln-rank/'
} = {}) {
  const href = buildMajorPathHref({
    majorCode, canonicalName, context: school ? 'school' : 'score', sourceMajor: sourceMajor || canonicalName, school, returnTo
  });
  if (!href) return '';
  const url = new URL(href, 'https://gaokao.powers.org.cn');
  url.searchParams.set('sourceSurface', 'academic-background');
  return `${url.pathname}${url.search}${url.hash}`;
}

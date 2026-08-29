import { buildSchoolAllHref } from '../schools/school-resource-center.js';

export const MIN_SCORE_NAVIGATION_META = Object.freeze({
  version: 'min-score-navigation-v001',
  owner: 'ln-rank',
  dataBoundary: '2026 辽宁物理类最低投档分',
  policy: 'navigation-only-canonical-ln-rank-owner'
});

const ORIGIN = 'https://gaokao.powers.org.cn';
const ALLOWED_RETURN_PATHS = Object.freeze(['/major-path/', '/tongxue/', '/ln-rank/']);

function text(value = '') {
  return String(value || '').trim();
}

function allowedPath(pathname = '') {
  return ALLOWED_RETURN_PATHS.some(prefix => pathname.startsWith(prefix));
}

export function sanitizeMinScoreReturnTarget(value, { origin = ORIGIN, fallback = '/ln-rank/' } = {}) {
  const raw = text(value);
  if (!raw) return fallback;
  let url;
  try {
    url = new URL(raw, origin);
  } catch {
    return fallback;
  }
  if (url.origin !== new URL(origin).origin || !allowedPath(url.pathname)) return fallback;
  return `${url.pathname}${url.search}${url.hash}`;
}

function addCommonParams(url, { returnTo = '', sourceSurface = '' } = {}) {
  url.searchParams.set('autoQuery', '1');
  url.searchParams.set('returnTo', sanitizeMinScoreReturnTarget(returnTo));
  const source = text(sourceSurface);
  if (source) url.searchParams.set('sourceSurface', source);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function buildMajorMinScoreHref({ majorCode = '', majorName = '', returnTo = '/major-path/', sourceSurface = '' } = {}) {
  const code = text(majorCode).toUpperCase();
  const name = text(majorName);
  const query = name || code;
  if (!query) return '';
  const url = new URL('/ln-rank/', ORIGIN);
  url.searchParams.set('mode', 'major-all');
  url.searchParams.set('majorKeyword', query);
  if (code) url.searchParams.set('majorCode', code);
  return addCommonParams(url, { returnTo, sourceSurface });
}

export function buildSchoolMinScoreHref({ school = '', entityId = '', returnTo = '/tongxue/', sourceSurface = '' } = {}) {
  const name = text(school);
  if (!name) return '';
  const href = buildSchoolAllHref({ school: name, entityId });
  if (!href) return '';
  return addCommonParams(new URL(href, ORIGIN), { returnTo, sourceSurface });
}

export function buildMinScoreEntryModel({ kind = '', school = '', entityId = '', majorCode = '', majorName = '', returnTo = '', sourceSurface = '' } = {}) {
  if (kind === 'major') {
    const href = buildMajorMinScoreHref({ majorCode, majorName, returnTo, sourceSurface });
    return Object.freeze(href ? {
      kind, href,
      label: '查这个专业在辽宁各校的最低分',
      description: '查看 2026 辽宁物理类投档记录、最低投档分和对应位次。'
    } : { kind, href: '', label: '', description: '' });
  }
  if (kind === 'school') {
    const href = buildSchoolMinScoreHref({ school, entityId, returnTo, sourceSurface });
    return Object.freeze(href ? {
      kind, href,
      label: '查这所学校在辽宁各专业的最低分',
      description: '查看该校在辽宁各专业的 2026 物理类最低投档分。'
    } : { kind, href: '', label: '', description: '' });
  }
  return Object.freeze({ kind: '', href: '', label: '', description: '' });
}

import {
  createSchoolNameResolver,
  extractSchoolRecords
} from '../../tongxue/data/school-name-resolver-v150.js';
import { createEntityAwareResolver } from '../../shared/resources/schools/school-identity-center.js';
import {
  resolveUnifiedSchoolQuery,
  acceptedAdmissionSchoolNames,
  normalizeUnifiedSchoolName
} from '../../shared/resources/schools/school-query-engine.v3969_0.js';
import { SCHOOL_QUERY_POLICY } from '../../shared/resources/schools/school-query-contract.v3969_0.js';

const CACHE_TTL = 5 * 60 * 1000;
const cacheByOrigin = new Map();
const admissionDirectoryCacheByOrigin = new Map();

function requestOf(source) {
  const request = source instanceof Request ? source : source?.request;
  if (!(request instanceof Request)) throw new Error('school query provider requires a Request or Cloudflare context');
  return request;
}

function baseUrl(source) {
  const url = new URL(requestOf(source).url);
  return `${url.protocol}//${url.host}`;
}

function cacheKey(source) {
  const owner = source?.env?.ASSETS?.fetch ? 'deployment-assets' : 'origin-fetch';
  return `${owner}:${baseUrl(source)}`;
}

async function fetchJson(source, pathname) {
  const request = requestOf(source);
  const url = new URL(pathname, request.url);
  let response;
  if (source?.env?.ASSETS?.fetch) {
    response = await source.env.ASSETS.fetch(new Request(url.toString(), {
      method: 'GET',
      headers: { accept: 'application/json' }
    }));
  } else {
    response = await fetch(url.toString(), {
      headers: { accept: 'application/json' },
      cf: { cacheTtl: 300, cacheEverything: true }
    });
  }
  if (!response.ok) throw new Error(`school query resource fetch failed ${response.status}: ${pathname}`);
  const type = String(response.headers.get('content-type') || '').toLowerCase();
  if (type.includes('text/html')) throw new Error(`school query resource returned HTML: ${pathname}`);
  return response.json();
}

async function loadAdmissionDirectory(source) {
  const key = cacheKey(source);
  const cached = admissionDirectoryCacheByOrigin.get(key);
  if (cached && Date.now() - cached.time < CACHE_TTL) return cached.value;
  const admissionDirectory = await fetchJson(source, '/shared/resources/schools/liaoning-2026-admission-school-directory.v3969_0.json');
  if (admissionDirectory?.contractVersion !== 'school-query-contract-v3969_0') {
    throw new Error('school admission directory contract mismatch');
  }
  admissionDirectoryCacheByOrigin.set(key, { time: Date.now(), value: admissionDirectory });
  return admissionDirectory;
}

async function loadResources(source) {
  const key = cacheKey(source);
  const cached = cacheByOrigin.get(key);
  if (cached && Date.now() - cached.time < CACHE_TTL) return cached.value;
  const [directoryPayload, admissionDirectory] = await Promise.all([
    fetchJson(source, '/tongxue/data/school-search-index.20260617-v150.json'),
    loadAdmissionDirectory(source)
  ]);
  const records = extractSchoolRecords(directoryPayload);
  const baseResolver = createSchoolNameResolver(records);
  const resolver = createEntityAwareResolver(baseResolver, baseResolver.metadata);
  const value = Object.freeze({ resolver, directoryPayload, admissionDirectory });
  cacheByOrigin.set(key, { time: Date.now(), value });
  return value;
}

export async function resolveAdmissionSchoolQuery(source, {
  query,
  intent = 'auto',
  offset = 0,
  limit = SCHOOL_QUERY_POLICY.defaultCandidateLimit
} = {}) {
  const resources = await loadResources(source);
  return resolveUnifiedSchoolQuery({
    query,
    intent,
    offset,
    limit,
    resolver: resources.resolver,
    admissionDirectory: resources.admissionDirectory
  });
}

export async function resolveAdmissionSchoolFilter(source, options = {}) {
  const queryResult = await resolveAdmissionSchoolQuery(source, options);
  return Object.freeze({
    queryResult,
    acceptedNames: acceptedAdmissionSchoolNames(queryResult),
    matchSchool(value) {
      if (!queryResult?.input) return true;
      return acceptedAdmissionSchoolNames(queryResult).has(normalizeUnifiedSchoolName(value));
    }
  });
}

export async function resolveExactAdmissionSchool(source, school) {
  const needle = normalizeUnifiedSchoolName(school);
  if (!needle) return null;
  const directory = await loadAdmissionDirectory(source);
  const matches = (Array.isArray(directory?.schools) ? directory.schools : []).filter(item => {
    const names = [item?.officialName, ...(Array.isArray(item?.admissionNames) ? item.admissionNames : []), ...(Array.isArray(item?.searchNames) ? item.searchNames : [])];
    return names.some(name => normalizeUnifiedSchoolName(name) === needle);
  });
  if (matches.length !== 1) return null;
  const item = matches[0];
  const admissionNames = Array.isArray(item.admissionNames) ? item.admissionNames.filter(Boolean) : [];
  return Object.freeze({
    officialName: item.officialName || admissionNames[0] || school,
    admissionName: admissionNames[0] || item.officialName || school,
    admissionNames,
    entityId: item.entityId || '',
    entityType: item.entityType || 'official_school',
    province: item.province || '',
    city: item.city || '',
    recordCount2026: Number(item.recordCount2026 || 0),
    chunkFiles2026: Object.freeze(Array.isArray(item.chunkFiles2026) ? item.chunkFiles2026.filter(Boolean) : [])
  });
}

export async function getAdmissionSchoolDirectoryMeta(source) {
  const directory = await loadAdmissionDirectory(source);
  return Object.freeze({
    version: directory.version,
    contractVersion: directory.contractVersion,
    sourceHash: directory.sourceHash,
    schoolCount: directory.schoolCount,
    admissionRecordCount: directory.admissionRecordCount,
    sourceDirectoryBuildId: directory.sourceDirectoryBuildId,
    sourceManifestVersion: directory.sourceManifestVersion
  });
}

export function releaseSchoolQueryProviderCache() {
  cacheByOrigin.clear();
  admissionDirectoryCacheByOrigin.clear();
}

export function clearSchoolQueryProviderCacheForTest() {
  releaseSchoolQueryProviderCache();
}

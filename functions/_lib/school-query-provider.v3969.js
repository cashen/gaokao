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

function baseUrl(request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

async function fetchJson(request, pathname) {
  const response = await fetch(`${baseUrl(request)}${pathname}`, {
    headers: { accept: 'application/json' },
    cf: { cacheTtl: 300, cacheEverything: true }
  });
  if (!response.ok) throw new Error(`school query resource fetch failed ${response.status}: ${pathname}`);
  return response.json();
}

async function loadAdmissionDirectory(request) {
  const origin = baseUrl(request);
  const cached = admissionDirectoryCacheByOrigin.get(origin);
  if (cached && Date.now() - cached.time < CACHE_TTL) return cached.value;
  const admissionDirectory = await fetchJson(request, '/shared/resources/schools/liaoning-2026-admission-school-directory.v3969_0.json');
  if (admissionDirectory?.contractVersion !== 'school-query-contract-v3969_0') {
    throw new Error('school admission directory contract mismatch');
  }
  admissionDirectoryCacheByOrigin.set(origin, { time: Date.now(), value: admissionDirectory });
  return admissionDirectory;
}

async function loadResources(request) {
  const origin = baseUrl(request);
  const cached = cacheByOrigin.get(origin);
  if (cached && Date.now() - cached.time < CACHE_TTL) return cached.value;
  const [directoryPayload, admissionDirectory] = await Promise.all([
    fetchJson(request, '/tongxue/data/school-search-index.20260617-v150.json'),
    loadAdmissionDirectory(request)
  ]);
  const records = extractSchoolRecords(directoryPayload);
  const baseResolver = createSchoolNameResolver(records);
  const resolver = createEntityAwareResolver(baseResolver, baseResolver.metadata);
  const value = Object.freeze({ resolver, directoryPayload, admissionDirectory });
  cacheByOrigin.set(origin, { time: Date.now(), value });
  return value;
}

export async function resolveAdmissionSchoolQuery(request, {
  query,
  intent = 'auto',
  offset = 0,
  limit = SCHOOL_QUERY_POLICY.defaultCandidateLimit
} = {}) {
  const resources = await loadResources(request);
  return resolveUnifiedSchoolQuery({
    query,
    intent,
    offset,
    limit,
    resolver: resources.resolver,
    admissionDirectory: resources.admissionDirectory
  });
}

export async function resolveAdmissionSchoolFilter(request, options = {}) {
  const queryResult = await resolveAdmissionSchoolQuery(request, options);
  return Object.freeze({
    queryResult,
    acceptedNames: acceptedAdmissionSchoolNames(queryResult),
    matchSchool(value) {
      if (!queryResult?.input) return true;
      return acceptedAdmissionSchoolNames(queryResult).has(normalizeUnifiedSchoolName(value));
    }
  });
}

export async function resolveExactAdmissionSchool(request, school) {
  const needle = normalizeUnifiedSchoolName(school);
  if (!needle) return null;
  const directory = await loadAdmissionDirectory(request);
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
    recordCount2026: Number(item.recordCount2026 || 0)
  });
}

export async function getAdmissionSchoolDirectoryMeta(request) {
  const directory = await loadAdmissionDirectory(request);
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

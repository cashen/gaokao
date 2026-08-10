from pathlib import Path

p=Path('functions/_lib/school-query-provider.v3969.js')
s=p.read_text()
s=s.replace("const cacheByOrigin = new Map();\n","const cacheByOrigin = new Map();\nconst admissionDirectoryCacheByOrigin = new Map();\n",1)
anchor="""async function loadResources(request) {\n  const origin = baseUrl(request);\n  const cached = cacheByOrigin.get(origin);\n  if (cached && Date.now() - cached.time < CACHE_TTL) return cached.value;\n  const [directoryPayload, admissionDirectory] = await Promise.all([\n    fetchJson(request, '/tongxue/data/school-search-index.20260617-v150.json'),\n    fetchJson(request, '/shared/resources/schools/liaoning-2026-admission-school-directory.v3969_0.json')\n  ]);\n  if (admissionDirectory?.contractVersion !== 'school-query-contract-v3969_0') {\n    throw new Error('school admission directory contract mismatch');\n  }\n"""
replacement="""async function loadAdmissionDirectory(request) {\n  const origin = baseUrl(request);\n  const cached = admissionDirectoryCacheByOrigin.get(origin);\n  if (cached && Date.now() - cached.time < CACHE_TTL) return cached.value;\n  const admissionDirectory = await fetchJson(request, '/shared/resources/schools/liaoning-2026-admission-school-directory.v3969_0.json');\n  if (admissionDirectory?.contractVersion !== 'school-query-contract-v3969_0') {\n    throw new Error('school admission directory contract mismatch');\n  }\n  admissionDirectoryCacheByOrigin.set(origin, { time: Date.now(), value: admissionDirectory });\n  return admissionDirectory;\n}\n\nasync function loadResources(request) {\n  const origin = baseUrl(request);\n  const cached = cacheByOrigin.get(origin);\n  if (cached && Date.now() - cached.time < CACHE_TTL) return cached.value;\n  const [directoryPayload, admissionDirectory] = await Promise.all([\n    fetchJson(request, '/tongxue/data/school-search-index.20260617-v150.json'),\n    loadAdmissionDirectory(request)\n  ]);\n"""
if anchor not in s: raise SystemExit('loadResources anchor missing')
s=s.replace(anchor,replacement,1)
anchor="""export async function getAdmissionSchoolDirectoryMeta(request) {\n  const resources = await loadResources(request);\n  const directory = resources.admissionDirectory;\n"""
replacement="""export async function resolveExactAdmissionSchool(request, school) {\n  const needle = normalizeUnifiedSchoolName(school);\n  if (!needle) return null;\n  const directory = await loadAdmissionDirectory(request);\n  const matches = (Array.isArray(directory?.schools) ? directory.schools : []).filter(item => {\n    const names = [item?.officialName, ...(Array.isArray(item?.admissionNames) ? item.admissionNames : []), ...(Array.isArray(item?.searchNames) ? item.searchNames : [])];\n    return names.some(name => normalizeUnifiedSchoolName(name) === needle);\n  });\n  if (matches.length !== 1) return null;\n  const item = matches[0];\n  const admissionNames = Array.isArray(item.admissionNames) ? item.admissionNames.filter(Boolean) : [];\n  return Object.freeze({\n    officialName: item.officialName || admissionNames[0] || school,\n    admissionName: admissionNames[0] || item.officialName || school,\n    admissionNames,\n    entityId: item.entityId || '',\n    entityType: item.entityType || 'official_school',\n    province: item.province || '',\n    city: item.city || '',\n    recordCount2026: Number(item.recordCount2026 || 0)\n  });\n}\n\nexport async function getAdmissionSchoolDirectoryMeta(request) {\n  const directory = await loadAdmissionDirectory(request);\n"""
if anchor not in s: raise SystemExit('meta anchor missing')
s=s.replace(anchor,replacement,1)
s=s.replace("export function releaseSchoolQueryProviderCache() {\n  cacheByOrigin.clear();\n}","export function releaseSchoolQueryProviderCache() {\n  cacheByOrigin.clear();\n  admissionDirectoryCacheByOrigin.clear();\n}",1)
p.write_text(s)

p=Path('functions/api/school-majors.js')
s=p.read_text()
old="""  resolveAdmissionSchoolQuery,\n  getAdmissionSchoolDirectoryMeta\n} from '../_lib/school-query-provider.v3969.js';"""
new="""  resolveAdmissionSchoolQuery,\n  resolveExactAdmissionSchool,\n  getAdmissionSchoolDirectoryMeta\n} from '../_lib/school-query-provider.v3969.js';"""
if old not in s: raise SystemExit('school provider import anchor missing')
s=s.replace(old,new,1)
old="""    } else {\n      queryResult = await resolveAdmissionSchoolQuery(context.request, {\n        query: schoolInput,\n        intent: schoolIntent,\n        offset: candidateOffset,\n        limit: candidateLimit\n      });\n      if (queryResult.status !== SCHOOL_QUERY_STATUSES.RESOLVED || !queryResult.resolvedSchool) {\n        const status = queryResult.status === SCHOOL_QUERY_STATUSES.NOT_FOUND ? 404 : 409;\n        return json(unresolvedPayload(queryResult, directoryMeta), status);\n      }\n      selection = queryResult.resolvedSchool;\n      entity = selection.entityId ? getSchoolEntity(selection.entityId) : null;\n    }\n"""
new="""    } else {\n      const exactSelection = schoolIntent === 'school'\n        ? await resolveExactAdmissionSchool(context.request, schoolInput)\n        : null;\n      if (exactSelection) {\n        selection = exactSelection;\n        entity = selection.entityId ? getSchoolEntity(selection.entityId) : null;\n      } else {\n        queryResult = await resolveAdmissionSchoolQuery(context.request, {\n          query: schoolInput,\n          intent: schoolIntent,\n          offset: candidateOffset,\n          limit: candidateLimit\n        });\n        if (queryResult.status !== SCHOOL_QUERY_STATUSES.RESOLVED || !queryResult.resolvedSchool) {\n          const status = queryResult.status === SCHOOL_QUERY_STATUSES.NOT_FOUND ? 404 : 409;\n          return json(unresolvedPayload(queryResult, directoryMeta), status);\n        }\n        selection = queryResult.resolvedSchool;\n        entity = selection.entityId ? getSchoolEntity(selection.entityId) : null;\n      }\n    }\n"""
if old not in s: raise SystemExit('school resolution block missing')
s=s.replace(old,new,1)
p.write_text(s)

p=Path('tools/verify-ai-workspace-v3990_1.mjs')
s=p.read_text()
needle="function testAiSchoolQueryCacheReleaseBoundary(){"
idx=s.find(needle)
if idx<0: raise SystemExit('test insertion anchor missing')
newtest="function testExactSchoolQueryLightPath(){const api=read('functions/api/school-majors.js'),provider=read('functions/_lib/school-query-provider.v3969.js');assert.ok(api.includes('resolveExactAdmissionSchool'));assert.ok(api.indexOf('resolveExactAdmissionSchool')<api.indexOf('resolveAdmissionSchoolQuery(context.request'),'exact school path must precede fuzzy resolver');assert.ok(provider.includes('async function loadAdmissionDirectory'));assert.ok(provider.includes('export async function resolveExactAdmissionSchool'));const metaStart=provider.indexOf('export async function getAdmissionSchoolDirectoryMeta');const metaEnd=provider.indexOf('export function releaseSchoolQueryProviderCache');assert.ok(metaStart>=0&&metaEnd>metaStart);assert.equal(provider.slice(metaStart,metaEnd).includes('loadResources(request)'),false,'directory metadata must not build 2952-school resolver');}\n"
s=s[:idx]+newtest+s[idx:]
call="testAiSchoolQueryCacheReleaseBoundary();"
if call not in s: raise SystemExit('test call anchor missing')
s=s.replace(call,"testExactSchoolQueryLightPath();\n"+call,1)
p.write_text(s)

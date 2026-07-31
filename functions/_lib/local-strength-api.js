import { loadAllRecords } from './ln-rank-manifest.js';
import { normalizeRecord, rawSchool } from './fenxi-normalizer.js';
import { buildDisplayTags } from './school-display-tags.js';
import { getHistoryScoreRankEvidence } from '../../shared/resources/exam/historical-score-rank-contract.js';
import { normalizeUnifiedSchoolName } from '../../shared/resources/schools/school-query-engine.v3969_0.js';
import {
  ACADEMIC_BACKGROUND_PROVIDER_VERSION,
  getAcademicBackgroundMeta,
  matchAcademicBackground,
  presentAcademicBackground
} from './academic-background-provider.js';

export const LOCAL_STRENGTH_API_VERSION = 'local-strength-api-v3971_0';
export const LOCAL_STRENGTH_INDEX_VERSION = 'local-strength-index-v3971_0';

const CACHE_TTL = 5 * 60 * 1000;
const cacheByOrigin = new Map();
const OUT_OF_SCOPE_CAMPUSES = [/秦皇岛/, /威海/, /珠海/, /深圳/, /苏州/, /雄安/];
const SCORE_BANDS = Object.freeze([
  { key: '650-plus', label: '650分及以上', min: 650, max: 750 },
  { key: '620-649', label: '620—649分', min: 620, max: 649 },
  { key: '590-619', label: '590—619分', min: 590, max: 619 },
  { key: '560-589', label: '560—589分', min: 560, max: 589 },
  { key: '530-559', label: '530—559分', min: 530, max: 559 },
  { key: '500-529', label: '500—529分', min: 500, max: 529 },
  { key: '470-499', label: '470—499分', min: 470, max: 499 },
  { key: '344-469', label: '本科线—469分', min: 344, max: 469 }
]);

const json = (payload, status = 200) => new Response(JSON.stringify(payload), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': status === 200 ? 'public, max-age=120, s-maxage=300' : 'no-store'
  }
});

function clean(value, max = 120) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, max);
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function clamp(value, min, max, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.trunc(n))) : fallback;
}

function originOf(request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

async function fetchJson(request, pathname) {
  const response = await fetch(`${originOf(request)}${pathname}`, {
    headers: { accept: 'application/json' },
    cf: { cacheTtl: 300, cacheEverything: true }
  });
  if (!response.ok) throw new Error(`local strength resource fetch failed ${response.status}: ${pathname}`);
  return response.json();
}

function normalizeSchool(value) {
  return normalizeUnifiedSchoolName(clean(value, 120));
}

function levelWeight(level) {
  return level === 'primary' ? 40 : level === 'secondary' ? 30 : level === 'trajectory' ? 10 : 0;
}

function sourceWeight(scope) {
  return scope === 'liaoning' ? 4 : scope === '211' ? 2 : 0;
}

function chooseBackground(matches = []) {
  return [...matches].sort((a, b) =>
    levelWeight(b.level) - levelWeight(a.level)
    || sourceWeight(b.scope) - sourceWeight(a.scope)
    || String(a.direction || '').localeCompare(String(b.direction || ''), 'zh-CN')
  )[0] || null;
}

function projectTags(record = {}) {
  const text = [record.major, record.rawText].filter(Boolean).join(' ');
  const tags = [];
  if (/中外合作|合作办学|国际合作|学术互认|联合培养|境外/.test(text)) tags.push('中外合作');
  if (/高收费|较高收费|学费.*万/.test(text)) tags.push('高收费');
  if (/专项|定向|公费师范|优师|免费医学|订单定向|乡村医生/.test(text)) tags.push('资格或服务条件');
  if (/预科|民族班|边防军人子女/.test(text)) tags.push('特殊资格');
  if (/试验班|实验班|拔尖|英才|卓越|本博|八年制|九年制|长学制|创新班/.test(text)) tags.push('特殊培养');
  if (/校区|分校|办学地点/.test(text)) tags.push('校区项目');
  return tags;
}

function stableId(record = {}) {
  return [
    normalizeSchool(record.school),
    clean(record.schoolCode2026 || record.schoolCode || '', 24),
    clean(record.majorCode2026 || record.majorCode || '', 24),
    clean(record.major, 180),
    record.score2026 ?? record.score ?? ''
  ].join('__');
}

function rankValue(record = {}) {
  const rank = num(record.rank2026 ?? record.rankEnd2026 ?? record.rank);
  return rank && rank > 0 ? rank : Number.MAX_SAFE_INTEGER;
}

function shapeRecord(record, matches, primary) {
  const display = buildDisplayTags(record);
  const background = presentAcademicBackground(primary) || {};
  const allBackgrounds = matches.map(hit => presentAcademicBackground(hit)).filter(Boolean);
  const score2026 = num(record.score2026 ?? record.score);
  const rank2026 = num(record.rank2026 ?? record.rankEnd2026 ?? record.rank);
  return {
    id: stableId(record),
    dataYear: 2026,
    school: record.school,
    schoolCode2026: clean(record.schoolCode2026 || record.schoolCode || '', 24),
    schoolEntityId: clean(record.schoolEntityId || record.entityId || '', 100),
    major: record.major,
    majorCode2026: clean(record.majorCode2026 || record.majorCode || '', 24),
    score2026,
    rank2026,
    rankStart2026: num(record.rankStart2026),
    rankEnd2026: num(record.rankEnd2026 ?? rank2026),
    score2025: num(record.score2025),
    rank2025: num(record.rank2025),
    score2024: num(record.score2024),
    rank2024: num(record.rank2024),
    historyEvidence: getHistoryScoreRankEvidence(record),
    city: clean(record.city || display.city || '', 50),
    province: '辽宁',
    displayLocation: clean(record.displayLocation || display.displayLocation || '', 80),
    natureLabel: clean(display.natureLabel || record.nature || '', 60),
    schoolTags: Array.isArray(display.schoolTags) ? display.schoolTags : [],
    projectTags: projectTags(record),
    background: {
      ...background,
      sourceKinds: [...new Set(allBackgrounds.map(item => item.scope === '211' ? '211背景' : '省内背景'))],
      evidenceLabel: background.level === 'primary' ? '学校主线' : background.level === 'secondary' ? '学校相关' : '方向线索'
    },
    allBackgrounds
  };
}

function sortRecords(records = []) {
  return [...records].sort((a, b) =>
    Number(b.score2026 || 0) - Number(a.score2026 || 0)
    || rankValue(a) - rankValue(b)
    || String(a.school || '').localeCompare(String(b.school || ''), 'zh-CN')
    || String(a.major || '').localeCompare(String(b.major || ''), 'zh-CN')
    || String(a.majorCode2026 || '').localeCompare(String(b.majorCode2026 || ''))
  );
}

async function loadLiaoningAdmissionScope(request) {
  const directory = await fetchJson(request, '/shared/resources/schools/liaoning-2026-admission-school-directory.v3969_0.json');
  const schools = (Array.isArray(directory.schools) ? directory.schools : []).filter(item => {
    const province = clean(item.province || '', 40);
    const names = [item.officialName, ...(item.admissionNames || []), ...(item.searchNames || [])].join(' ');
    return /辽宁/.test(province) && !OUT_OF_SCOPE_CAMPUSES.some(pattern => pattern.test(names));
  });
  const accepted = new Map();
  for (const school of schools) {
    const names = [school.officialName, ...(school.admissionNames || []), ...(school.searchNames || [])];
    for (const name of names) {
      const key = normalizeSchool(name);
      if (key) accepted.set(key, school);
    }
  }
  return {
    directoryVersion: directory.version || '',
    sourceHash: directory.sourceHash || '',
    schools,
    accepted,
    find(value) { return accepted.get(normalizeSchool(value)) || null; }
  };
}

async function buildIndex(request, env = {}) {
  const origin = originOf(request);
  const cached = cacheByOrigin.get(origin);
  if (cached && Date.now() - cached.time < CACHE_TTL) return cached.value;

  const [loaded, localScope] = await Promise.all([
    loadAllRecords(request, env),
    loadLiaoningAdmissionScope(request)
  ]);
  const schoolCoverage = new Map();
  const publicRecords = [];
  const seen = new Set();
  let evaluatedRecordCount = 0;
  let duplicatePublicRecordCount = 0;

  for (const school of localScope.schools) {
    schoolCoverage.set(normalizeSchool(school.officialName), {
      officialName: school.officialName,
      admissionNames: school.admissionNames || [],
      searchNames: school.searchNames || [],
      city: clean(school.city || '', 50),
      province: clean(school.province || '辽宁', 40),
      nature: clean(school.nature || '', 50),
      recordCount2026: 0,
      evaluatedRecordCount: 0,
      matchedRecordCount: 0,
      noEvidenceCount: 0,
      directions: new Set(),
      scoreMin: null,
      scoreMax: null
    });
  }

  for (const raw of loaded.records || []) {
    const directorySchool = localScope.find(rawSchool(raw));
    if (!directorySchool) continue;
    const record = normalizeRecord(raw);
    if (!record.school || !record.major || !Number.isFinite(Number(record.score2026 ?? record.score))) continue;
    record.rawText = JSON.stringify(raw).slice(0, 1800);
    evaluatedRecordCount += 1;

    const schoolKey = normalizeSchool(directorySchool.officialName || record.school);
    const school = schoolCoverage.get(schoolKey) || {
      officialName: directorySchool.officialName || record.school,
      admissionNames: directorySchool.admissionNames || [],
      searchNames: directorySchool.searchNames || [],
      city: clean(directorySchool.city || '', 50),
      province: '辽宁',
      nature: '',
      recordCount2026: 0,
      evaluatedRecordCount: 0,
      matchedRecordCount: 0,
      noEvidenceCount: 0,
      directions: new Set(),
      scoreMin: null,
      scoreMax: null
    };
    school.recordCount2026 += 1;
    school.evaluatedRecordCount += 1;
    const score = num(record.score2026 ?? record.score);
    school.scoreMin = school.scoreMin == null ? score : Math.min(school.scoreMin, score);
    school.scoreMax = school.scoreMax == null ? score : Math.max(school.scoreMax, score);

    const matches = [
      matchAcademicBackground(record, 'liaoning'),
      matchAcademicBackground(record, '211')
    ].filter(Boolean);
    const primary = chooseBackground(matches);
    if (!primary) {
      school.noEvidenceCount += 1;
      schoolCoverage.set(schoolKey, school);
      continue;
    }

    const shaped = shapeRecord(record, matches, primary);
    if (seen.has(shaped.id)) {
      duplicatePublicRecordCount += 1;
      schoolCoverage.set(schoolKey, school);
      continue;
    }
    seen.add(shaped.id);
    publicRecords.push(shaped);
    school.matchedRecordCount += 1;
    if (shaped.background?.direction) school.directions.add(shaped.background.direction);
    schoolCoverage.set(schoolKey, school);
  }

  const records = sortRecords(publicRecords);
  const schools = [...schoolCoverage.values()].map(item => ({
    ...item,
    directions: [...item.directions].sort((a, b) => a.localeCompare(b, 'zh-CN')),
    directionCount: item.directions.size,
    status: item.matchedRecordCount > 0 ? 'matched' : item.recordCount2026 > 0 ? 'no-evidence' : 'no-admission-record'
  })).sort((a, b) =>
    b.matchedRecordCount - a.matchedRecordCount
    || b.recordCount2026 - a.recordCount2026
    || a.officialName.localeCompare(b.officialName, 'zh-CN')
  );

  const directionCounts = new Map();
  for (const record of records) {
    const direction = record.background?.direction;
    if (direction) directionCounts.set(direction, (directionCounts.get(direction) || 0) + 1);
  }
  const directions = [...directionCounts].map(([direction, count]) => ({ direction, count }))
    .sort((a, b) => b.count - a.count || a.direction.localeCompare(b.direction, 'zh-CN'));

  const value = Object.freeze({
    version: LOCAL_STRENGTH_INDEX_VERSION,
    providerVersion: ACADEMIC_BACKGROUND_PROVIDER_VERSION,
    generatedAt: new Date().toISOString(),
    manifestVersion: loaded.manifest?.version || '',
    admissionDirectoryVersion: localScope.directoryVersion,
    sourceHash: localScope.sourceHash,
    totalAdmissionRecordCount: Number(loaded.manifest?.totalRecords || loaded.records?.length || 0),
    localAdmissionSchoolCount: schools.filter(item => item.recordCount2026 > 0).length,
    localAdmissionRecordCount: schools.reduce((sum, item) => sum + item.recordCount2026, 0),
    evaluatedRecordCount,
    matchedSchoolCount: schools.filter(item => item.matchedRecordCount > 0).length,
    matchedRecordCount: records.length,
    noEvidenceSchoolCount: schools.filter(item => item.recordCount2026 > 0 && item.matchedRecordCount === 0).length,
    duplicatePublicRecordCount,
    scoreMin: records.length ? Math.min(...records.map(item => item.score2026).filter(Number.isFinite)) : null,
    scoreMax: records.length ? Math.max(...records.map(item => item.score2026).filter(Number.isFinite)) : null,
    schools,
    directions,
    records
  });
  cacheByOrigin.set(origin, { time: Date.now(), value });
  return value;
}

function matchesQuery(record, query) {
  const q = clean(query, 100).toLowerCase();
  if (!q) return true;
  const hay = [
    record.school,
    record.major,
    record.city,
    record.displayLocation,
    record.background?.direction,
    record.background?.evidenceLabel,
    ...(record.schoolTags || []),
    ...(record.projectTags || [])
  ].join(' ').toLowerCase();
  return hay.includes(q);
}

function filterRecords(index, params) {
  const q = params.get('q') || '';
  const school = normalizeSchool(params.get('school') || '');
  const direction = clean(params.get('direction') || '', 100);
  const evidence = clean(params.get('evidence') || '', 50);
  const city = clean(params.get('city') || '', 50);
  const projectMode = clean(params.get('projectMode') || 'all', 30);
  const minScore = num(params.get('minScore'));
  const maxScore = num(params.get('maxScore'));

  return index.records.filter(record => {
    if (!matchesQuery(record, q)) return false;
    if (school && normalizeSchool(record.school) !== school) return false;
    if (direction && record.background?.direction !== direction) return false;
    if (evidence && record.background?.evidenceLabel !== evidence) return false;
    if (city && !String(record.displayLocation || record.city || '').includes(city)) return false;
    if (minScore != null && Number(record.score2026) < minScore) return false;
    if (maxScore != null && Number(record.score2026) > maxScore) return false;
    if (projectMode === 'regular' && record.projectTags?.length) return false;
    if (projectMode === 'special' && !record.projectTags?.length) return false;
    return true;
  });
}

function pagination(total, pageValue, pageSizeValue) {
  const pageSize = clamp(pageSizeValue, 8, 50, 20);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = clamp(pageValue, 1, pageCount, 1);
  const offset = (page - 1) * pageSize;
  return {
    page,
    pageSize,
    pageCount,
    total,
    offset,
    hasPrevious: page > 1,
    hasNext: page < pageCount
  };
}

function publicMeta(index) {
  return {
    version: index.version,
    providerVersion: index.providerVersion,
    generatedAt: index.generatedAt,
    audienceYear: 2027,
    dataYear: 2026,
    totalAdmissionRecordCount: index.totalAdmissionRecordCount,
    localAdmissionSchoolCount: index.localAdmissionSchoolCount,
    localAdmissionRecordCount: index.localAdmissionRecordCount,
    evaluatedRecordCount: index.evaluatedRecordCount,
    matchedSchoolCount: index.matchedSchoolCount,
    matchedRecordCount: index.matchedRecordCount,
    noEvidenceSchoolCount: index.noEvidenceSchoolCount,
    duplicatePublicRecordCount: index.duplicatePublicRecordCount,
    scoreMin: index.scoreMin,
    scoreMax: index.scoreMax,
    completeEvaluation: index.evaluatedRecordCount === index.localAdmissionRecordCount,
    boundary: '覆盖全部已识别的辽宁省内2026物理类投档专业记录；只有通过当前背景证据门禁的专业进入公开目录。未显示不代表学校没有优势专业。'
  };
}

export async function handleLocalStrengthRequest(context) {
  if (context.request.method !== 'GET') return json({ ok: false, message: '只支持 GET 请求。' }, 405);
  try {
    const url = new URL(context.request.url);
    const mode = clean(url.searchParams.get('mode') || 'meta', 30);
    const index = await buildIndex(context.request, context.env || {});
    const meta = publicMeta(index);

    if (mode === 'meta') {
      return json({
        ok: true,
        mode,
        apiVersion: LOCAL_STRENGTH_API_VERSION,
        meta,
        scoreBands: SCORE_BANDS,
        schools: index.schools,
        directions: index.directions,
        academicBackgroundMeta: getAcademicBackgroundMeta('liaoning')
      });
    }

    if (mode === 'coverage') {
      return json({
        ok: true,
        mode,
        apiVersion: LOCAL_STRENGTH_API_VERSION,
        meta,
        schools: index.schools
      });
    }

    if (mode === 'list' || mode === 'list_all' || mode === 'school' || mode === 'score') {
      if (mode === 'school' && !url.searchParams.get('school')) {
        return json({ ok: false, message: '请输入学校名称。' }, 400);
      }
      const filtered = filterRecords(index, url.searchParams);
      const page = pagination(filtered.length, url.searchParams.get('page'), url.searchParams.get('pageSize'));
      const records = filtered.slice(page.offset, page.offset + page.pageSize);
      const schoolQuery = normalizeSchool(url.searchParams.get('school') || '');
      const schoolStatus = schoolQuery
        ? index.schools.find(item => normalizeSchool(item.officialName) === schoolQuery || (item.searchNames || []).some(name => normalizeSchool(name) === schoolQuery)) || null
        : null;
      return json({
        ok: true,
        mode: mode === 'list' ? 'list_all' : mode,
        apiVersion: LOCAL_STRENGTH_API_VERSION,
        meta,
        filters: Object.fromEntries(url.searchParams.entries()),
        page,
        records,
        schoolStatus,
        boundary: meta.boundary
      });
    }

    return json({ ok: false, message: '未知查询方式。' }, 400);
  } catch (error) {
    return json({
      ok: false,
      message: '辽宁省内院校背景专业目录暂时没有读取成功。',
      hint: '主页面专业初选不受影响。请稍后重试。',
      engineerHint: error?.message || String(error)
    }, 500);
  }
}

export function clearLocalStrengthCacheForTest() {
  cacheByOrigin.clear();
}

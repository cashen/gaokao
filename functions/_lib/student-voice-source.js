import { mapStandardMajor } from './standard-major-mapper.js';
import {
  STUDENT_VOICE_CONTRACT_VERSION,
  normalizeStudentVoiceScope,
  normalizeStudentVoiceTopic,
  studentVoiceTextMatchesTopic,
  studentVoiceSampleLevel
} from '../../shared/resources/experience/student-voice-contract.v001.js';
import {
  STUDENT_VOICE_SOURCE,
  STUDENT_VOICE_SOURCE_REGISTRY_VERSION,
  studentVoiceSourceHosts,
  studentVoiceSourcePage
} from '../../shared/resources/experience/student-voice-source-registry.v001.js';
import { selectStudentVoiceEvidence } from '../../shared/resources/experience/student-voice-evidence-selector.v001.js';

export const STUDENT_VOICE_SOURCE_GATEWAY_VERSION = 'student-voice-source-gateway-v0.02';
const API_VERSION = 'v1.4.0';
const TOTAL_REQUEST_BUDGET_MS = 8_000;
const PER_REQUEST_TIMEOUT_MS = 4_500;
const SUMMARY_REQUEST_TIMEOUT_MS = 2_000;
const MAX_RESPONSE_BYTES = 2_000_000;
const SCHOOL_REVIEW_PAGE_SIZE = 6;
const MAJOR_REVIEW_PAGE_SIZE = 10;
const MAX_USER_PAGE = 50;
const MAX_TOPIC_SCAN_PAGES = 3;
const MAX_TOPIC_MATCHES = 8;
const MAX_REVIEW_CONTENT_LENGTH = 4_000;
const CACHE_TTL = Object.freeze({
  ai_summary: 1800,
  recent_reviews_first: 180,
  recent_reviews_next: 600,
  topic_reviews: 300,
  no_content: 180,
  major_reviews: 300
});
const SCHOOL_RATING_DIMENSIONS = Object.freeze([
  ['dormitory', 0.2], ['cafeteria', 0.1], ['faculty', 0.1], ['environment', 0.1],
  ['culture', 0.2], ['employment', 0.2], ['safety', 0.1]
]);
const MAJOR_RATING_DIMENSIONS = Object.freeze(['employment', 'stability', 'difficulty', 'work_env']);

export async function onRequest(context) {
  if (context.request.method !== 'GET') return json({ ok:false, error:'method_not_allowed', message:'只支持 GET 请求。', version:API_VERSION }, 405);
  const url = new URL(context.request.url);
  const inferredScope = (url.searchParams.get('major') || url.searchParams.get('majorCode')) ? 'major' : 'school';
  const scope = normalizeStudentVoiceScope(url.searchParams.get('scope') || inferredScope);
  const topic = normalizeStudentVoiceTopic(url.searchParams.get('topic') || 'general', { scope });
  const page = clampInteger(url.searchParams.get('page'), 1, MAX_USER_PAGE, 1);
  const forceRefresh = url.searchParams.get('refresh') === '1';

  if (scope === 'school_major') {
    return json({
      ok:false,
      mode:'scope_unsupported',
      error:'school_major_source_binding_unavailable',
      message:'当前来源的专业评论没有学校身份字段，本站不会把跨学校专业评论冒充某所学校的专业体验。',
      scope,
      topic,
      source:publicSourceMeta(),
      evidence:buildEvidenceMeta({ scope, topic, matched:0, scanned:0, pages:0, exhaustive:false }),
      version:API_VERSION
    }, 422);
  }

  const cacheRequest = buildCacheRequest(context.request, { scope, topic, page });
  const edgeCache = globalThis.caches?.default || null;
  if (!forceRefresh && edgeCache) {
    const cached = await edgeCache.match(cacheRequest);
    if (cached) return withResponseHeaders(cached, { 'x-tongxue-cache':'HIT' });
  }

  const startedAt = Date.now();
  const deadline = startedAt + TOTAL_REQUEST_BUDGET_MS;
  const result = scope === 'major'
    ? await fetchMajorVoice({ url, topic, page, deadline })
    : await fetchSchoolVoice({ url, topic, page, deadline });

  const payload = {
    ...result.payload,
    scope,
    topic,
    contractVersion:STUDENT_VOICE_CONTRACT_VERSION,
    sourceRegistryVersion:STUDENT_VOICE_SOURCE_REGISTRY_VERSION,
    sourceGatewayVersion:STUDENT_VOICE_SOURCE_GATEWAY_VERSION,
    version:API_VERSION
  };
  const response = json(payload, result.status, {
    ttl:result.status === 200 ? cacheTtlFor(payload.mode, page) : 0,
    cacheStatus:forceRefresh ? 'REFRESH' : 'MISS',
    serverTiming:buildServerTiming(result.timings || [], startedAt)
  });
  if (result.status === 200) await storeInEdgeCache(context, edgeCache, cacheRequest, response, cacheTtlFor(payload.mode, page));
  return response;
}

async function fetchSchoolVoice({ url, topic, page, deadline }) {
  const schoolInput = normalizeSchool(url.searchParams.get('school'));
  if (!schoolInput) return fail(400, 'missing_school', '请输入学校名称。', { mode:'invalid_request', school:schoolInput, topic });
  if (!isValidSchoolName(schoolInput)) return fail(400, 'invalid_school', '学校名称格式不正确。', { mode:'invalid_request', school:schoolInput, topic });

  const attempts = [], timings = [], diagnostics = [];
  for (const host of studentVoiceSourceHosts()) {
    if (Date.now() >= deadline) break;
    const attempt = await fetchSchoolFromHost({ host, schoolInput, topic, page, deadline, timings, diagnostics });
    attempts.push(attempt);
    if (attempt.kind === 'success') return { status:200, payload:attempt.payload, timings };
  }
  const lastMatched = [...attempts].reverse().find((item) => item.schoolMeta);
  const allNotFound = attempts.length > 0 && attempts.every((item) => item.kind === 'not_found');
  if (allNotFound) return { status:404, payload:{ ok:false, mode:'school_not_found', error:'school_not_found', message:'来源站没有找到这个学校，请输入学校正式全名。', school:schoolInput, diagnostics, source:publicSourceMeta() }, timings };
  return { status:502, payload:{ ok:false, mode:'source_unavailable', error:'source_api_unavailable', message:lastMatched?'学校已找到，但来源公开评论接口本次没有形成可验证内容。':'来源站接口本次没有形成可验证内容。', school:lastMatched?.schoolMeta?.name||schoolInput, schoolMeta:lastMatched?.schoolMeta||null, diagnostics, source:publicSourceMeta() }, timings };
}

async function fetchSchoolFromHost({ host, schoolInput, topic, page, deadline, timings, diagnostics }) {
  const detailResult = await timedFetchJson('school-detail', `${host}/api/schools/${encodeURIComponent(schoolInput)}`, host, deadline, timings);
  diagnostics.push(toDiagnostic('school-detail', host, detailResult));
  if (detailResult.status === 404) return { kind:'not_found', host };
  if (!detailResult.ok || !isObject(detailResult.data)) return { kind:'unavailable', stage:'school-detail', host };
  const detail = unwrapData(detailResult.data);
  if (!hasRequired(detail, STUDENT_VOICE_SOURCE.schema.schoolDetailRequired)) {
    diagnostics.push({ stage:'school-detail-schema', host, error:'schema_drift' });
    return { kind:'unavailable', stage:'school-detail-schema', host };
  }
  const schoolId = pickSchoolId(detail);
  if (schoolId === null) return { kind:'unavailable', stage:'school-detail-shape', host };
  const schoolMeta = normalizeSchoolMeta(detail, schoolInput, schoolId);
  const source = { ...publicSourceMeta(), url:studentVoiceSourcePage(`/school/${encodeURIComponent(schoolMeta.slug || schoolMeta.name)}`) };

  const summaryResult = await timedFetchJson('ai-summary', `${host}/api/schools/${encodeURIComponent(String(schoolId))}/ai-summary`, host, deadline, timings, SUMMARY_REQUEST_TIMEOUT_MS);
  diagnostics.push(toDiagnostic('ai-summary', host, summaryResult, { schoolId }));
  let summaryKnownEmpty = false;
  if (summaryResult.ok && isObject(summaryResult.data)) {
    const summaryPayload = unwrapData(summaryResult.data);
    const summary = pickSummary(summaryPayload);
    if (summary && (topic === 'general' || studentVoiceTextMatchesTopic(summary, topic, { scope:'school' }))) {
      const reviewResult = await fetchSchoolReviewPage({ host, schoolId, page:1, deadline, timings });
      diagnostics.push(toDiagnostic('summary-evidence-reviews', host, reviewResult, { schoolId, page:1, pageSize:SCHOOL_REVIEW_PAGE_SIZE }));
      let studentEvidence = [];
      let scannedCount = null;
      let exhaustive = false;
      if (reviewResult.ok && isObject(reviewResult.data)) {
        const normalized = normalizeSchoolReviewPage(reviewResult.data, schoolMeta, source);
        const evidenceCandidates = topic === 'general'
          ? normalized.reviews
          : normalized.reviews.filter((review) => studentVoiceTextMatchesTopic(review.content, topic, { scope:'school' }));
        studentEvidence = selectStudentVoiceEvidence(evidenceCandidates, 5);
        scannedCount = normalized.reviews.length;
        exhaustive = !normalized.pagination.hasMore;
      }
      return { kind:'success', schoolMeta, payload:{
        ok:true, mode:'ai_summary', school:schoolMeta.name, summary, reviews:[], studentEvidence, reviewPagination:null, schoolMeta, source,
        fetchedAt:new Date().toISOString(), transport:transportLabel(host, studentEvidence.length ? '来源评论摘要 + 学生证据' : '来源评论摘要'),
        evidence:buildEvidenceMeta({ scope:'school', topic, matched:studentEvidence.length, scanned:scannedCount, pages:scannedCount === null ? 0 : 1, exhaustive, sourceSummary:true }),
        diagnostics
      }};
    }
    summaryKnownEmpty = hasKnownSummaryField(summaryPayload);
  }

  if (topic === 'general') {
    const reviewResult = await fetchSchoolReviewPage({ host, schoolId, page, deadline, timings });
    diagnostics.push(toDiagnostic('recent-reviews', host, reviewResult, { schoolId, page, pageSize:SCHOOL_REVIEW_PAGE_SIZE }));
    if (!reviewResult.ok || !isObject(reviewResult.data)) return { kind:'unavailable', stage:'recent-reviews', host, schoolMeta };
    const normalized = normalizeSchoolReviewPage(reviewResult.data, schoolMeta, source);
    if (normalized.reviews.length) return { kind:'success', schoolMeta, payload:{
      ok:true, mode:'recent_reviews', school:schoolMeta.name, summary:null, reviews:normalized.reviews,
      reviewPagination:normalized.pagination, schoolMeta, source, fetchedAt:new Date().toISOString(),
      transport:transportLabel(host, '近期公开评论'),
      evidence:buildEvidenceMeta({ scope:'school', topic, matched:normalized.reviews.length, scanned:normalized.reviews.length, pages:1, exhaustive:!normalized.pagination.hasMore })
    }};
    if (!summaryKnownEmpty && !summaryResult.ok) return { kind:'unavailable', stage:'ai-summary', host, schoolMeta };
    return { kind:'success', schoolMeta, payload:{
      ok:true, mode:'no_content', school:schoolMeta.name, summary:null, reviews:[], reviewPagination:normalized.pagination,
      schoolMeta, source, fetchedAt:new Date().toISOString(), transport:transportLabel(host, '内容状态'),
      evidence:buildEvidenceMeta({ scope:'school', topic, matched:0, scanned:0, pages:1, exhaustive:true })
    }};
  }

  const scan = await scanTopicPages({
    fetchPage:(scanPage) => fetchSchoolReviewPage({ host, schoolId, page:scanPage, deadline, timings }),
    normalizePage:(payload) => normalizeSchoolReviewPage(payload, schoolMeta, source),
    topic,
    scope:'school',
    deadline,
    startPage:1
  });
  diagnostics.push(...scan.diagnostics.map((item) => ({ ...item, host, schoolId })));
  if (scan.error) return { kind:'unavailable', stage:'topic-reviews', host, schoolMeta };
  return { kind:'success', schoolMeta, payload:topicScanPayload({ scan, scope:'school', topic, school:schoolMeta.name, schoolMeta, source, host }) };
}

async function fetchMajorVoice({ url, topic, page, deadline }) {
  const rawMajor = cleanShortText(url.searchParams.get('major') || '', 120);
  const rawCode = cleanShortText(url.searchParams.get('majorCode') || '', 16).toUpperCase();
  const resolved = resolveCanonicalMajor(rawMajor, rawCode);
  if (!resolved.ok) return { status:400, payload:{ ok:false, mode:'major_identity_unresolved', error:resolved.error, message:resolved.message, majorInput:rawMajor, majorCodeInput:rawCode, source:publicSourceMeta() }, timings:[] };

  const attempts = [], timings = [], diagnostics = [];
  for (const host of studentVoiceSourceHosts()) {
    if (Date.now() >= deadline) break;
    const attempt = await fetchMajorFromHost({ host, canonicalMajor:resolved.major, topic, page, deadline, timings, diagnostics });
    attempts.push(attempt);
    if (attempt.kind === 'success') return { status:200, payload:attempt.payload, timings };
  }
  const allNotFound = attempts.length > 0 && attempts.every((item) => item.kind === 'not_found');
  if (allNotFound) return { status:404, payload:{ ok:false, mode:'major_source_not_found', error:'major_source_not_found', message:'已识别这个国家本科专业，但当前大学生声音来源没有找到对应专业记录。', major:resolved.major, diagnostics, source:publicSourceMeta() }, timings };
  return { status:502, payload:{ ok:false, mode:'source_unavailable', error:'major_source_api_unavailable', message:'专业身份已经确认，但大学生声音来源本次没有形成可验证内容。', major:resolved.major, diagnostics, source:publicSourceMeta() }, timings };
}

async function fetchMajorFromHost({ host, canonicalMajor, topic, page, deadline, timings, diagnostics }) {
  const query = new URLSearchParams({ keyword:canonicalMajor.name, sort:'reviews', page:'1', pageSize:'20' });
  const listResult = await timedFetchJson('specialty-list', `${host}/api/specialties?${query}`, host, deadline, timings);
  diagnostics.push(toDiagnostic('specialty-list', host, listResult, { majorCode:canonicalMajor.code }));
  if (!listResult.ok || !isObject(listResult.data)) return { kind:'unavailable', stage:'specialty-list', host };
  const rows = Array.isArray(listResult.data.data) ? listResult.data.data : [];
  const sourceMajor = rows.find((row) => isObject(row) && String(row.code || '').trim().toUpperCase() === canonicalMajor.code)
    || rows.find((row) => isObject(row) && normalizeText(row.name) === normalizeText(canonicalMajor.name));
  if (!sourceMajor) return { kind:'not_found', host };
  if (!hasRequired(sourceMajor, STUDENT_VOICE_SOURCE.schema.specialtyListRequired)) {
    diagnostics.push({ stage:'specialty-list-schema', host, error:'schema_drift' });
    return { kind:'unavailable', stage:'specialty-list-schema', host };
  }
  if (String(sourceMajor.code || '').trim().toUpperCase() !== canonicalMajor.code) return { kind:'not_found', host };
  const sourceId = sourceMajor.id;
  const sourceSlug = cleanShortText(sourceMajor.slug || sourceMajor.name, 120);
  const major = Object.freeze({
    code:canonicalMajor.code,
    name:canonicalMajor.name,
    categoryCode:canonicalMajor.categoryCode || '',
    categoryName:canonicalMajor.categoryName || '',
    disciplineCode:canonicalMajor.disciplineCode || '',
    disciplineName:canonicalMajor.disciplineName || '',
    sourceId,
    sourceSlug,
    sourceReviewCount:toNullableNumber(sourceMajor.review_count)
  });
  const source = { ...publicSourceMeta(), url:studentVoiceSourcePage(`/specialty/${encodeURIComponent(sourceSlug)}`) };

  if (topic === 'general') {
    const reviewResult = await fetchMajorReviewPage({ host, sourceId, page, deadline, timings });
    diagnostics.push(toDiagnostic('specialty-reviews', host, reviewResult, { sourceId, page }));
    if (!reviewResult.ok || !isObject(reviewResult.data)) return { kind:'unavailable', stage:'specialty-reviews', host };
    const normalized = normalizeMajorReviewPage(reviewResult.data, major, source);
    return { kind:'success', payload:{
      ok:true,
      mode:normalized.reviews.length ? 'major_reviews' : 'no_content',
      major,
      summary:null,
      reviews:normalized.reviews,
      reviewPagination:normalized.pagination,
      source,
      fetchedAt:new Date().toISOString(),
      transport:transportLabel(host, '专业公开评论'),
      evidence:buildEvidenceMeta({ scope:'major', topic, matched:normalized.reviews.length, scanned:normalized.reviews.length, pages:1, exhaustive:!normalized.pagination.hasMore }),
      diagnostics
    }};
  }

  const scan = await scanTopicPages({
    fetchPage:(scanPage) => fetchMajorReviewPage({ host, sourceId, page:scanPage, deadline, timings }),
    normalizePage:(payload) => normalizeMajorReviewPage(payload, major, source),
    topic,
    scope:'major',
    deadline,
    startPage:1
  });
  diagnostics.push(...scan.diagnostics.map((item) => ({ ...item, host, sourceId })));
  if (scan.error) return { kind:'unavailable', stage:'specialty-topic-reviews', host };
  return { kind:'success', payload:{ ...topicScanPayload({ scan, scope:'major', topic, major, source, host }), diagnostics } };
}

async function scanTopicPages({ fetchPage, normalizePage, topic, scope, deadline, startPage = 1 }) {
  const matches = [], seen = new Set(), diagnostics = [];
  let scanned = 0, pages = 0, lastPagination = null, exhaustive = false;
  for (let current = startPage; current < startPage + MAX_TOPIC_SCAN_PAGES; current += 1) {
    if (Date.now() >= deadline) break;
    const result = await fetchPage(current);
    diagnostics.push({ stage:'topic-page', page:current, status:result.status, parseError:result.parseError || '' });
    if (!result.ok || !isObject(result.data)) return { error:'source_unavailable', matches, scanned, pages, exhaustive:false, pagination:lastPagination, diagnostics };
    const normalized = normalizePage(result.data);
    pages += 1;
    lastPagination = normalized.pagination;
    scanned += normalized.reviews.length;
    for (const review of normalized.reviews) {
      const key = reviewIdentityKey(review);
      if (seen.has(key)) continue;
      seen.add(key);
      if (studentVoiceTextMatchesTopic(review.content, topic, { scope })) matches.push(review);
      if (matches.length >= MAX_TOPIC_MATCHES) break;
    }
    if (matches.length >= MAX_TOPIC_MATCHES) break;
    if (!normalized.pagination.hasMore) { exhaustive = true; break; }
  }
  return { error:'', matches:matches.slice(0, MAX_TOPIC_MATCHES), scanned, pages, exhaustive, pagination:lastPagination, diagnostics };
}

function topicScanPayload({ scan, scope, topic, school = '', schoolMeta = null, major = null, source, host }) {
  const matched = scan.matches.length;
  const mode = matched ? 'topic_reviews' : (scan.exhaustive ? 'topic_no_content' : 'topic_not_found_within_budget');
  const message = matched ? '' : scan.exhaustive
    ? '已检查当前来源可达的相关评论，没有找到与这个话题直接匹配的学生声音。'
    : '在固定抓取预算内暂未找到直接匹配内容；来源仍有更多评论，因此不能据此判断“没有人讨论”。';
  return {
    ok:true,
    mode,
    ...(school ? { school, schoolMeta } : {}),
    ...(major ? { major } : {}),
    summary:null,
    reviews:scan.matches,
    reviewPagination:scan.pagination,
    source,
    message,
    fetchedAt:new Date().toISOString(),
    transport:transportLabel(host, '话题定向公开评论'),
    evidence:buildEvidenceMeta({ scope, topic, matched, scanned:scan.scanned, pages:scan.pages, exhaustive:scan.exhaustive })
  };
}

function resolveCanonicalMajor(rawMajor, rawCode) {
  const byCode = rawCode ? mapStandardMajor({ standardMajorCode:rawCode }) : null;
  const byName = rawMajor ? mapStandardMajor({ majorName:rawMajor }) : null;
  const valid = (item) => item && ['exact','alias'].includes(item.mappingStatus) && item.code && item.name;
  if (rawCode && !valid(byCode)) return { ok:false, error:'invalid_major_code', message:'这个专业代码没有匹配到当前2026本科专业目录。' };
  if (rawMajor && !valid(byName)) return { ok:false, error:'major_not_canonical', message:'这个输入还不能唯一对应到一个本科专业；专业类、试验班或模糊名称不会被强行映射。' };
  if (valid(byCode) && valid(byName) && byCode.code !== byName.code) return { ok:false, error:'major_identity_conflict', message:'专业名称与专业代码指向不同专业，已停止查询以避免串专业。' };
  const item = valid(byCode) ? byCode : byName;
  if (!valid(item)) return { ok:false, error:'missing_major', message:'请输入一个可唯一识别的本科专业。' };
  return { ok:true, major:{
    code:item.code,
    name:item.name,
    categoryCode:item.categoryCode || '',
    categoryName:item.categoryName || '',
    disciplineCode:item.disciplineCode || '',
    disciplineName:item.disciplineName || '',
    mappingStatus:item.mappingStatus,
    mappingSource:item.mappingSource,
    confidence:item.confidence
  }};
}

async function fetchSchoolReviewPage({ host, schoolId, page, deadline, timings }) {
  const url = `${host}/api/reviews/school/${encodeURIComponent(String(schoolId))}?sort=time&page=${page}&pageSize=${SCHOOL_REVIEW_PAGE_SIZE}`;
  return timedFetchJson('school-reviews', url, host, deadline, timings);
}

async function fetchMajorReviewPage({ host, sourceId, page, deadline, timings }) {
  const query = new URLSearchParams({ sort:'new', page:String(page), pageSize:String(MAJOR_REVIEW_PAGE_SIZE) });
  return timedFetchJson('specialty-reviews', `${host}/api/specialties/${encodeURIComponent(String(sourceId))}/reviews?${query}`, host, deadline, timings);
}

async function timedFetchJson(stage, url, refererOrigin, deadline, timings, requestTimeoutMs = PER_REQUEST_TIMEOUT_MS) {
  const started = Date.now();
  const result = await fetchJson(url, refererOrigin, deadline, requestTimeoutMs);
  timings.push({ name:stage, duration:Date.now() - started });
  return result;
}

async function fetchJson(url, refererOrigin, deadline, requestTimeoutMs = PER_REQUEST_TIMEOUT_MS) {
  const remaining = deadline - Date.now();
  if (remaining <= 0) return { ok:false, status:0, contentType:'', length:0, parseError:'total_timeout', data:null };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(1, Math.min(requestTimeoutMs, remaining)));
  try {
    const response = await fetch(url, { signal:controller.signal, redirect:'follow', headers:{ accept:'application/json,text/plain,*/*', 'accept-language':'zh-CN,zh;q=0.9', referer:`${refererOrigin}/` } });
    const declaredLength = Number(response.headers.get('content-length') || 0);
    if (declaredLength > MAX_RESPONSE_BYTES) return { ok:false, status:response.status, contentType:response.headers.get('content-type') || '', length:declaredLength, parseError:'response_too_large', data:null };
    const raw = (await response.text()).slice(0, MAX_RESPONSE_BYTES);
    let data = null, parseError = '';
    try { data = JSON.parse(raw); } catch (error) { parseError = error instanceof Error ? error.message : String(error); }
    return { ok:response.ok && data !== null, status:response.status, contentType:response.headers.get('content-type') || '', length:raw.length, parseError, data };
  } catch (error) {
    return { ok:false, status:0, contentType:'', length:0, parseError:error instanceof Error ? error.message : String(error), data:null };
  } finally { clearTimeout(timeout); }
}

function normalizeSchoolReviewPage(payload, schoolMeta, source) {
  const container = isObject(payload?.data) && Array.isArray(payload.data.data) ? payload.data : payload;
  const rows = Array.isArray(container?.data) ? container.data : (Array.isArray(container?.reviews) ? container.reviews : []);
  const reviews = dedupe(rows.map((row) => normalizeSchoolReview(row, schoolMeta, source)).filter(Boolean));
  reviews.sort((a, b) => reviewTimestamp(b.createdAt) - reviewTimestamp(a.createdAt));
  return { reviews:reviews.slice(0, SCHOOL_REVIEW_PAGE_SIZE), pagination:normalizePagination(container, reviews.length, SCHOOL_REVIEW_PAGE_SIZE) };
}

function normalizeMajorReviewPage(payload, major, source) {
  const container = isObject(payload?.data) && Array.isArray(payload.data.data) ? payload.data : payload;
  const rows = Array.isArray(container?.data) ? container.data : [];
  const reviews = dedupe(rows.map((row) => normalizeMajorReview(row, major, source)).filter(Boolean));
  reviews.sort((a, b) => reviewTimestamp(b.createdAt) - reviewTimestamp(a.createdAt));
  return { reviews:reviews.slice(0, MAJOR_REVIEW_PAGE_SIZE), pagination:normalizePagination(container, reviews.length, MAJOR_REVIEW_PAGE_SIZE) };
}

function normalizeSchoolReview(row, schoolMeta, source) {
  if (!isObject(row) || !hasRequired(row, STUDENT_VOICE_SOURCE.schema.schoolReviewRequired)) return null;
  const content = cleanReviewContent(row.content ?? row.text ?? row.body ?? '');
  if (content.length < 2) return null;
  const id = normalizeReviewId(row.id ?? row.review_id ?? row.reviewId);
  const isAnonymous = Boolean(row.isAnonymous ?? row.is_anonymous);
  const isVerified = Boolean(row.isVerified ?? row.is_verified);
  return {
    id,
    content,
    authorLabel:cleanShortText(isAnonymous ? row.display_name || row.displayName || row.nickname || '匿名同学' : row.nickname || row.display_name || row.displayName || '同学', 40) || (isAnonymous ? '匿名同学' : '同学'),
    isAnonymous,
    isVerified,
    verificationWeight:'none',
    campus:cleanShortText(row.campus_name ?? row.campusName ?? '', 80),
    createdAt:normalizeSourceDate(row.created_at ?? row.createdAt ?? row.updated_at ?? row.updatedAt),
    likes:Math.max(0, toInteger(row.like_count ?? row.likeCount ?? row.likes, 0)),
    replies:Math.max(0, toInteger(row.reply_count ?? row.replyCount ?? row.replies, 0)),
    isQuestion:Boolean(row.is_question ?? row.isQuestion),
    rating:normalizeSchoolRating(row.rating),
    sourceUrl:`${source.url}${id !== null ? `?review=${encodeURIComponent(String(id))}` : ''}`,
    evidenceScope:'school',
    schoolSourceId:schoolMeta.id
  };
}

function normalizeMajorReview(row, major, source) {
  if (!isObject(row) || !hasRequired(row, STUDENT_VOICE_SOURCE.schema.specialtyReviewRequired)) return null;
  if (String(row.specialty_id ?? row.specialtyId ?? '') !== String(major.sourceId)) return null;
  const content = cleanReviewContent(row.content ?? row.text ?? row.body ?? '');
  if (content.length < 2) return null;
  const id = normalizeReviewId(row.id ?? row.review_id ?? row.reviewId);
  const isAnonymous = Boolean(row.isAnonymous ?? row.is_anonymous);
  const isVerified = Boolean(row.isVerified ?? row.is_verified);
  return {
    id,
    content,
    authorLabel:cleanShortText(isAnonymous ? row.nickname || '匿名同学' : row.nickname || '同学', 40) || (isAnonymous ? '匿名同学' : '同学'),
    isAnonymous,
    isVerified,
    verificationWeight:'none',
    campus:'',
    createdAt:normalizeSourceDate(row.created_at ?? row.createdAt),
    likes:Math.max(0, toInteger(row.like_count ?? row.likeCount ?? row.likes, 0)),
    replies:Math.max(0, toInteger(row.reply_count ?? row.replyCount ?? row.replies, 0)),
    isQuestion:false,
    rating:normalizeMajorRating(row.rating),
    sourceUrl:source.url,
    evidenceScope:'major',
    majorCode:major.code,
    sourceSpecialtyId:major.sourceId
  };
}

function normalizePagination(container, actualCount, fallbackPageSize) {
  const page = clampInteger(container?.page, 1, MAX_USER_PAGE, 1);
  const pageSize = clampInteger(container?.pageSize ?? container?.page_size, 1, 100, fallbackPageSize);
  const total = Math.max(0, toInteger(container?.total, actualCount));
  const totalPages = Math.max(0, toInteger(container?.totalPages ?? container?.total_pages, Math.ceil(total / Math.max(1, pageSize))));
  return { page, pageSize, total, totalPages, hasMore:totalPages > page };
}

function buildEvidenceMeta({ scope, topic, matched, scanned, pages, exhaustive, sourceSummary = false }) {
  const matchCount = matched === null || matched === undefined ? null : Math.max(0, Number(matched) || 0);
  return Object.freeze({
    type:'student_voice',
    scope,
    topic,
    matchCount,
    sampleLevel:sourceSummary ? 'source_summary' : studentVoiceSampleLevel(matchCount || 0),
    scannedCount:scanned === null || scanned === undefined ? null : Math.max(0, Number(scanned) || 0),
    scannedPages:Math.max(0, Number(pages) || 0),
    exhaustive:Boolean(exhaustive),
    sourceSummary:Boolean(sourceSummary),
    officialFact:false,
    rankingInput:false,
    recommendationScoreInput:false,
    verificationWeight:'none',
    disagreementPolicy:'preserve_not_average'
  });
}

function buildCacheRequest(request, { scope, topic, page }) {
  const source = new URL(request.url), url = new URL(source.origin + source.pathname);
  url.searchParams.set('scope', scope);
  if (scope === 'school') {
    url.searchParams.set('school', normalizeSchool(source.searchParams.get('school')));
  } else {
    const majorCode = cleanShortText(source.searchParams.get('majorCode') || '', 16).toUpperCase();
    const major = cleanShortText(source.searchParams.get('major') || '', 120);
    if (majorCode) url.searchParams.set('majorCode', majorCode);
    if (major) url.searchParams.set('major', major);
  }
  url.searchParams.set('topic', topic);
  url.searchParams.set('page', String(page));
  return new Request(url.toString(), { method:'GET', headers:{ accept:'application/json' } });
}

function cacheTtlFor(mode, page) {
  if (mode === 'ai_summary') return CACHE_TTL.ai_summary;
  if (mode === 'recent_reviews') return page === 1 ? CACHE_TTL.recent_reviews_first : CACHE_TTL.recent_reviews_next;
  if (mode === 'major_reviews') return CACHE_TTL.major_reviews;
  if (mode === 'topic_reviews' || mode === 'topic_not_found_within_budget') return CACHE_TTL.topic_reviews;
  if (mode === 'no_content' || mode === 'topic_no_content') return CACHE_TTL.no_content;
  return 0;
}

async function storeInEdgeCache(context, edgeCache, cacheRequest, response, ttl) {
  if (!edgeCache || !ttl || response.status !== 200) return;
  const operation = edgeCache.put(cacheRequest, response.clone());
  if (typeof context.waitUntil === 'function') context.waitUntil(operation); else await operation;
}

function publicSourceMeta() { return { id:STUDENT_VOICE_SOURCE.id, name:STUDENT_VOICE_SOURCE.name, url:STUDENT_VOICE_SOURCE.pageOrigin }; }
function normalizeSchool(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function isValidSchoolName(value) { return value.length <= 40 && !/[\/?#@:&=<>]/.test(value); }
function normalizeText(value) { return String(value || '').normalize('NFKC').replace(/\s+/g, '').trim().toLowerCase(); }
function isObject(value) { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function unwrapData(payload) { return isObject(payload?.data) ? payload.data : payload; }
function hasRequired(value, keys) { return isObject(value) && keys.every((key) => value[key] !== undefined && value[key] !== null); }
function pickSchoolId(detail) { const value = [detail?.id, detail?.school_id, detail?.schoolId, detail?.school?.id].find((item) => item !== undefined && item !== null && String(item).trim()); return value === undefined ? null : value; }
function pickSummary(payload) { if (typeof payload === 'string') return cleanSummary(payload); if (!isObject(payload)) return ''; for (const value of [payload.summary,payload.aiSummary,payload.ai_summary,payload.summaryText,payload.aiSummaryText]) { const cleaned = typeof value === 'string' ? cleanSummary(value) : ''; if (cleaned) return cleaned; } return ''; }
function hasKnownSummaryField(payload) { return isObject(payload) && ['summary','aiSummary','ai_summary','summaryText','aiSummaryText'].some((key) => Object.prototype.hasOwnProperty.call(payload, key)); }
function cleanSummary(value) { const text = String(value || '').replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\s*([，。！？；：、])\s*/g, '$1').replace(/\n{3,}/g, '\n\n').trim(); return text.length >= 20 && text.length <= 5000 ? text : ''; }
function normalizeSchoolMeta(detail, fallbackName, schoolId) { return { id:schoolId, name:normalizeSchool(detail.name || detail.school_name || fallbackName), slug:normalizeSchool(detail.slug || detail.name || fallbackName), type:normalizeSchool(detail.type || ''), province:normalizeSchool(detail.province || ''), city:normalizeSchool(detail.city || ''), rating:toNullableNumber(detail.rating), reviewCount:toNullableNumber(detail.review_count ?? detail.reviewCount), tags:normalizeSchool(detail.full_tags || detail.tags || '') }; }
function normalizeReviewId(value) { if (value === null || value === undefined || value === '') return null; const number = Number(value); if (Number.isSafeInteger(number) && number >= 0) return number; const text = String(value).trim(); return /^[A-Za-z0-9_-]{1,80}$/.test(text) ? text : null; }
function cleanReviewContent(value) { return decodeEntities(String(value || '')).replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n[ \t]+/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, MAX_REVIEW_CONTENT_LENGTH); }
function cleanShortText(value, maxLength) { return decodeEntities(String(value || '')).replace(/<[^>]+>/g, ' ').replace(/[\u0000-\u001F\u007F]/g, '').replace(/\s+/g, ' ').trim().slice(0, maxLength); }
function normalizeSchoolRating(value) { if (!isObject(value)) return null; const dimensions = {}; let total = 0, used = 0; for (const [key, weight] of SCHOOL_RATING_DIMENSIONS) { const number = toNullableNumber(value[key]); if (number === null || number < 0 || number > 5) continue; dimensions[key] = number; total += number * weight; used += weight; } return Object.keys(dimensions).length ? { overall:used ? roundOne(total / used) : null, dimensions } : null; }
function normalizeMajorRating(value) { if (!isObject(value)) return null; const dimensions = {}; for (const key of MAJOR_RATING_DIMENSIONS) { const number = toNullableNumber(value[key]); if (number !== null && number >= 0 && number <= 5) dimensions[key] = number; } return Object.keys(dimensions).length ? { overall:null, dimensions, sourceDefined:true } : null; }
function normalizeSourceDate(value) { const text = String(value || '').trim(); if (!text) return ''; const chinaLocal = text.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})$/); if (chinaLocal) return `${chinaLocal[1]}T${chinaLocal[2]}+08:00`; const date = new Date(text); return Number.isNaN(date.getTime()) ? text.slice(0, 40) : date.toISOString(); }
function reviewTimestamp(value) { const date = new Date(value || 0); return Number.isNaN(date.getTime()) ? 0 : date.getTime(); }
function reviewIdentityKey(review) { return `${review.evidenceScope || ''}:${review.id ?? ''}:${String(review.content || '').replace(/\s+/g,'').slice(0,160)}`; }
function dedupe(reviews) { const seen = new Set(), out = []; for (const review of reviews) { const key = reviewIdentityKey(review); if (seen.has(key)) continue; seen.add(key); out.push(review); } return out; }
function decodeEntities(value) { const named = { '&nbsp;':' ', '&quot;':'"', '&#39;':"'", '&amp;':'&', '&lt;':'<', '&gt;':'>' }; return String(value || '').replace(/&(nbsp|quot|amp|lt|gt);|&#39;/g, (match) => named[match] || match).replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code))).replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCodePoint(parseInt(code, 16))); }
function toNullableNumber(value) { if (value === null || value === undefined || value === '') return null; const number = Number(value); return Number.isFinite(number) ? number : null; }
function toInteger(value, fallback = 0) { const number = Number(value); return Number.isFinite(number) ? Math.trunc(number) : fallback; }
function clampInteger(value, min, max, fallback) { return Math.min(max, Math.max(min, toInteger(value, fallback))); }
function roundOne(value) { return Math.round(value * 10) / 10; }
function transportLabel(host, contentType) { const mirrorIndex = studentVoiceSourceHosts().indexOf(host) + 1; return `${contentType} · ${STUDENT_VOICE_SOURCE.name}镜像 ${Math.max(1, mirrorIndex)}`; }
function toDiagnostic(stage, host, result, extra = {}) { return { stage, host, status:result.status, contentType:result.contentType, length:result.length, parseError:result.parseError || '', ...extra }; }
function buildServerTiming(timings, startedAt) { const parts = timings.map((item, index) => `${String(item.name || 'stage').replace(/[^A-Za-z0-9_-]/g, '_')}${index};dur=${Math.max(0, item.duration)}`); parts.push(`total;dur=${Math.max(0, Date.now() - startedAt)}`); return parts.join(', '); }
function fail(status, error, message, extra = {}) { return { status, payload:{ ok:false, error, message, ...extra, source:publicSourceMeta() }, timings:[] }; }
function json(payload, status = 200, options = {}) { const ttl = Math.max(0, Number(options.ttl || 0)); const headers = new Headers({ 'content-type':'application/json; charset=utf-8', 'x-tongxue-version':API_VERSION, 'x-student-voice-contract':STUDENT_VOICE_CONTRACT_VERSION, 'x-tongxue-cache':String(options.cacheStatus || 'BYPASS') }); headers.set('cache-control', ttl > 0 ? `public, max-age=0, s-maxage=${ttl}, stale-while-revalidate=${Math.max(60, ttl * 2)}` : 'no-store, max-age=0'); if (options.serverTiming) headers.set('server-timing', options.serverTiming); return new Response(JSON.stringify(payload), { status, headers }); }
function withResponseHeaders(response, additions) { const headers = new Headers(response.headers); for (const [key, value] of Object.entries(additions)) headers.set(key, value); return new Response(response.body, { status:response.status, statusText:response.statusText, headers }); }

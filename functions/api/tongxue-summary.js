const API_VERSION = 'v1.1.2';
const SOURCE_PAGE_ORIGIN = 'https://srgaoxiao.com';
const API_HOSTS = ['https://eo.srgaoxiao.com', 'https://srgaoxiao.com'];
const TOTAL_REQUEST_BUDGET_MS = 8_000;
const PER_REQUEST_TIMEOUT_MS = 5_000;
const MAX_RESPONSE_BYTES = 2_000_000;
const REVIEW_PAGE_SIZE = 6;
const MAX_REVIEW_PAGE = 50;
const MAX_REVIEW_CONTENT_LENGTH = 4_000;

const CACHE_TTL = Object.freeze({ ai_summary: 1800, recent_reviews_first: 180, recent_reviews_next: 600, no_content: 180 });
const REVIEW_DIMENSIONS = [
  { key: 'dormitory', weight: 0.2 }, { key: 'cafeteria', weight: 0.1 },
  { key: 'faculty', weight: 0.1 }, { key: 'environment', weight: 0.1 },
  { key: 'culture', weight: 0.2 }, { key: 'employment', weight: 0.2 },
  { key: 'safety', weight: 0.1 }
];

export async function onRequest(context) {
  if (context.request.method !== 'GET') return json({ ok:false, error:'method_not_allowed', message:'只支持 GET 请求。', version:API_VERSION }, 405);

  const requestUrl = new URL(context.request.url);
  const schoolInput = normalizeSchool(requestUrl.searchParams.get('school'));
  const reviewPage = clampInteger(requestUrl.searchParams.get('page'), 1, MAX_REVIEW_PAGE, 1);
  const forceRefresh = requestUrl.searchParams.get('refresh') === '1';
  if (!schoolInput) return json({ ok:false, error:'missing_school', message:'请输入学校名称。', version:API_VERSION }, 400);
  if (!isValidSchoolName(schoolInput)) return json({ ok:false, error:'invalid_school', message:'学校名称格式不正确。', version:API_VERSION }, 400);

  const edgeCache = globalThis.caches?.default || null;
  const cacheRequest = buildCacheRequest(context.request, schoolInput, reviewPage);
  if (!forceRefresh && edgeCache) {
    const cached = await edgeCache.match(cacheRequest);
    if (cached) return withResponseHeaders(cached, { 'x-tongxue-cache':'HIT' });
  }

  const startedAt = Date.now();
  const deadline = startedAt + TOTAL_REQUEST_BUDGET_MS;
  const diagnostics = [];
  const timings = [];
  const attempts = [];

  for (const host of API_HOSTS) {
    if (Date.now() >= deadline) break;
    const attempt = await fetchExperienceFromHost({ host, schoolInput, reviewPage, deadline, diagnostics, timings });
    attempts.push(attempt);
    if (attempt.kind === 'success') {
      const payload = {
        ok:true, mode:attempt.mode, school:attempt.school, summary:attempt.summary,
        reviews:attempt.reviews, reviewPagination:attempt.reviewPagination,
        schoolMeta:attempt.schoolMeta, source:attempt.source, fetchedAt:new Date().toISOString(),
        transport:transportLabel(host, attempt.transportType), version:API_VERSION
      };
      const ttl = cacheTtlFor(attempt.mode, reviewPage);
      const response = json(payload, 200, {
        ttl,
        cacheStatus:forceRefresh ? 'REFRESH' : 'MISS',
        serverTiming:buildServerTiming(timings, startedAt)
      });
      await storeInEdgeCache(context, edgeCache, cacheRequest, response, ttl);
      return response;
    }
    if (attempt.kind !== 'not_found' && attempt.kind !== 'unavailable') break;
  }

  const lastMatched = [...attempts].reverse().find((attempt) => attempt.schoolMeta);
  const allNotFound = attempts.length === API_HOSTS.length && attempts.every((attempt) => attempt.kind === 'not_found');
  const failure = allNotFound ? {
    status:404,
    payload:{ ok:false, mode:'school_not_found', error:'school_not_found', message:'来源站没有找到这个学校，请输入学校正式全名。', school:schoolInput, version:API_VERSION, diagnostics }
  } : buildUnavailableFailure(lastMatched, schoolInput, diagnostics);

  return json(failure.payload, failure.status, {
    cacheStatus:forceRefresh ? 'REFRESH' : 'MISS',
    serverTiming:buildServerTiming(timings, startedAt)
  });
}

async function fetchExperienceFromHost({ host, schoolInput, reviewPage, deadline, diagnostics, timings }) {
  const detailResult = await timedFetchJson('school-detail', `${host}/api/schools/${encodeURIComponent(schoolInput)}`, host, deadline, timings);
  diagnostics.push(toDiagnostic('school-detail', host, detailResult));
  if (detailResult.status === 404) return { kind:'not_found', host };
  if (!detailResult.ok || !isObject(detailResult.data)) return { kind:'unavailable', stage:'school-detail', host };

  const detail = unwrapData(detailResult.data);
  const schoolId = pickSchoolId(detail);
  if (schoolId === null) return { kind:'unavailable', stage:'school-detail-shape', host };
  const schoolMeta = normalizeSchoolMeta(detail, schoolInput, schoolId);
  const canonicalName = schoolMeta.name || schoolInput;
  const source = { name:'srgaoxiao.com', url:buildSourcePageUrl(detail, canonicalName) };

  const summaryResult = await timedFetchJson('ai-summary', `${host}/api/schools/${encodeURIComponent(String(schoolId))}/ai-summary`, host, deadline, timings);
  diagnostics.push(toDiagnostic('ai-summary', host, summaryResult, { schoolId }));
  if (!summaryResult.ok || !isObject(summaryResult.data)) return { kind:'unavailable', stage:'ai-summary', host, schoolMeta, source };

  const summaryPayload = unwrapData(summaryResult.data);
  const summary = pickSummary(summaryPayload);
  if (summary) return {
    kind:'success', mode:'ai_summary', school:canonicalName, summary, reviews:[], reviewPagination:null,
    schoolMeta, source, transportType:'AI 摘要'
  };
  if (!hasKnownSummaryField(summaryPayload)) return { kind:'unavailable', stage:'ai-summary-shape', host, schoolMeta, source };

  const reviewUrl = `${host}/api/reviews/school/${encodeURIComponent(String(schoolId))}?sort=time&page=${reviewPage}&pageSize=${REVIEW_PAGE_SIZE}`;
  const reviewResult = await timedFetchJson('recent-reviews', reviewUrl, host, deadline, timings);
  diagnostics.push(toDiagnostic('recent-reviews', host, reviewResult, { schoolId, page:reviewPage, pageSize:REVIEW_PAGE_SIZE }));
  if (!reviewResult.ok || !isObject(reviewResult.data)) return { kind:'unavailable', stage:'recent-reviews', host, schoolMeta, source };

  const normalized = normalizeReviewPage(reviewResult.data, schoolMeta);
  if (normalized.reviews.length) return {
    kind:'success', mode:'recent_reviews', school:canonicalName, summary:null,
    reviews:normalized.reviews, reviewPagination:normalized.pagination, schoolMeta, source, transportType:'近期评论'
  };
  return {
    kind:'success', mode:'no_content', school:canonicalName, summary:null,
    reviews:[], reviewPagination:normalized.pagination, schoolMeta, source, transportType:'内容状态'
  };
}

async function timedFetchJson(stage, url, refererOrigin, deadline, timings) {
  const started = Date.now();
  const result = await fetchJson(url, refererOrigin, deadline);
  timings.push({ name:stage, duration:Date.now() - started });
  return result;
}

async function fetchJson(url, refererOrigin, deadline) {
  const remaining = deadline - Date.now();
  if (remaining <= 0) return { ok:false, status:0, contentType:'', length:0, parseError:'total_timeout', data:null };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(1, Math.min(PER_REQUEST_TIMEOUT_MS, remaining)));
  try {
    const response = await fetch(url, {
      signal:controller.signal,
      redirect:'follow',
      headers:{ accept:'application/json,text/plain,*/*', 'accept-language':'zh-CN,zh;q=0.9', referer:`${refererOrigin}/` }
    });
    const declaredLength = Number(response.headers.get('content-length') || 0);
    if (declaredLength > MAX_RESPONSE_BYTES) return { ok:false, status:response.status, contentType:response.headers.get('content-type') || '', length:declaredLength, parseError:'response_too_large', data:null };
    const raw = (await response.text()).slice(0, MAX_RESPONSE_BYTES);
    let data = null;
    let parseError = '';
    try { data = JSON.parse(raw); } catch (error) { parseError = error instanceof Error ? error.message : String(error); }
    return { ok:response.ok && data !== null, status:response.status, contentType:response.headers.get('content-type') || '', length:raw.length, parseError, data };
  } catch (error) {
    return { ok:false, status:0, contentType:'', length:0, parseError:error instanceof Error ? error.message : String(error), data:null };
  } finally { clearTimeout(timeout); }
}

function buildUnavailableFailure(attempt, schoolInput, diagnostics) {
  const schoolMeta = attempt?.schoolMeta || null;
  const reviewFailure = attempt?.stage === 'recent-reviews';
  return {
    status:502,
    payload:{
      ok:false,
      mode:reviewFailure ? 'reviews_unavailable' : 'source_unavailable',
      error:reviewFailure ? 'reviews_api_unavailable' : (schoolMeta ? 'summary_api_unavailable' : 'source_api_unavailable'),
      message:reviewFailure ? '学校已找到且 AI 摘要为空，但来源站近期评论接口本次没有返回有效 JSON。' : (schoolMeta ? '学校详情已找到，但来源站 AI 摘要接口本次没有返回有效 JSON。' : '来源站学校接口暂时没有返回有效 JSON。'),
      school:schoolMeta?.name || schoolInput,
      schoolMeta,
      source:attempt?.source,
      version:API_VERSION,
      diagnostics
    }
  };
}

function buildCacheRequest(request, school, page) {
  const url = new URL(request.url);
  url.search = '';
  url.searchParams.set('school', school);
  url.searchParams.set('page', String(page));
  return new Request(url.toString(), { method:'GET', headers:{ accept:'application/json' } });
}

async function storeInEdgeCache(context, edgeCache, cacheRequest, response, ttl) {
  if (!edgeCache || !ttl || response.status !== 200) return;
  const operation = edgeCache.put(cacheRequest, response.clone());
  if (typeof context.waitUntil === 'function') context.waitUntil(operation);
  else await operation;
}

function cacheTtlFor(mode, page) {
  if (mode === 'ai_summary') return CACHE_TTL.ai_summary;
  if (mode === 'recent_reviews') return page === 1 ? CACHE_TTL.recent_reviews_first : CACHE_TTL.recent_reviews_next;
  if (mode === 'no_content') return CACHE_TTL.no_content;
  return 0;
}

function json(payload, status = 200, options = {}) {
  const ttl = Math.max(0, Number(options.ttl || 0));
  const headers = new Headers({
    'content-type':'application/json; charset=utf-8',
    'x-tongxue-version':API_VERSION,
    'x-tongxue-cache':String(options.cacheStatus || 'BYPASS')
  });
  headers.set('cache-control', ttl > 0 ? `public, max-age=0, s-maxage=${ttl}, stale-while-revalidate=${Math.max(60, ttl * 2)}` : 'no-store, max-age=0');
  if (options.serverTiming) headers.set('server-timing', options.serverTiming);
  return new Response(JSON.stringify(payload), { status, headers });
}

function withResponseHeaders(response, additions) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(additions)) headers.set(key, value);
  return new Response(response.body, { status:response.status, statusText:response.statusText, headers });
}

function buildServerTiming(timings, startedAt) {
  const parts = timings.map((item, index) => `${String(item.name || 'stage').replace(/[^A-Za-z0-9_-]/g, '_')}${index};dur=${Math.max(0, item.duration)}`);
  parts.push(`total;dur=${Math.max(0, Date.now() - startedAt)}`);
  return parts.join(', ');
}

function normalizeSchool(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function isValidSchoolName(value) { return value.length <= 40 && !/[\/?#@:&=<>]/.test(value); }
function isObject(value) { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function unwrapData(payload) { return isObject(payload?.data) ? payload.data : payload; }
function pickSchoolId(detail) {
  if (!isObject(detail)) return null;
  const value = [detail.id, detail.school_id, detail.schoolId, detail.school?.id].find((item) => item !== undefined && item !== null && String(item).trim());
  return value === undefined ? null : value;
}
function pickSummary(payload) {
  if (typeof payload === 'string') return cleanSummary(payload);
  if (!isObject(payload)) return '';
  for (const candidate of [payload.summary, payload.aiSummary, payload.ai_summary, payload.summaryText, payload.aiSummaryText]) {
    if (typeof candidate === 'string') {
      const cleaned = cleanSummary(candidate);
      if (cleaned) return cleaned;
    }
  }
  return '';
}
function hasKnownSummaryField(payload) {
  return isObject(payload) && ['summary','aiSummary','ai_summary','summaryText','aiSummaryText'].some((key) => Object.prototype.hasOwnProperty.call(payload, key));
}
function cleanSummary(value) {
  const text = String(value || '').replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\s*([，。！？；：、])\s*/g, '$1').replace(/\n{3,}/g, '\n\n').trim();
  return text.length >= 20 && text.length <= 5000 ? text : '';
}

function normalizeReviewPage(payload, schoolMeta) {
  const container = isObject(payload?.data) && Array.isArray(payload.data.data) ? payload.data : payload;
  const rows = Array.isArray(container?.data) ? container.data : (Array.isArray(container?.reviews) ? container.reviews : []);
  const seenIds = new Set();
  const seenContent = new Set();
  const reviews = [];
  for (const row of rows) {
    const review = normalizeReview(row, schoolMeta);
    if (!review) continue;
    const idKey = String(review.id ?? '');
    const contentKey = review.content.replace(/\s+/g, '').slice(0, 500);
    if ((idKey && seenIds.has(idKey)) || seenContent.has(contentKey)) continue;
    if (idKey) seenIds.add(idKey);
    seenContent.add(contentKey);
    reviews.push(review);
  }
  reviews.sort((a, b) => reviewTimestamp(b.createdAt) - reviewTimestamp(a.createdAt));
  const page = clampInteger(container?.page, 1, MAX_REVIEW_PAGE, 1);
  const pageSize = clampInteger(container?.pageSize ?? container?.page_size, 1, 100, REVIEW_PAGE_SIZE);
  const total = Math.max(0, toInteger(container?.total, reviews.length));
  const totalPages = Math.max(0, toInteger(container?.totalPages ?? container?.total_pages, Math.ceil(total / pageSize)));
  return { reviews:reviews.slice(0, REVIEW_PAGE_SIZE), pagination:{ page, pageSize:REVIEW_PAGE_SIZE, total, totalPages, hasMore:totalPages > page } };
}

function normalizeReview(row, schoolMeta) {
  if (!isObject(row)) return null;
  const content = cleanReviewContent(row.content ?? row.text ?? row.body ?? '');
  if (content.length < 2) return null;
  const isAnonymous = Boolean(row.isAnonymous ?? row.is_anonymous);
  const isVerified = Boolean(row.isVerified ?? row.is_verified);
  const id = normalizeReviewId(row.id ?? row.review_id ?? row.reviewId);
  const authorLabel = cleanShortText(isAnonymous ? row.display_name || row.displayName || row.nickname || '匿名同学' : row.nickname || row.display_name || row.displayName || '同学', 40) || (isAnonymous ? '匿名同学' : '同学');
  const campus = cleanShortText(row.campus_name ?? row.campusName ?? '', 80);
  const createdAt = normalizeSourceDate(row.created_at ?? row.createdAt ?? row.updated_at ?? row.updatedAt);
  const rating = normalizeRating(row.rating);
  const sourceUrl = `${SOURCE_PAGE_ORIGIN}/school/${encodeURIComponent(schoolMeta.slug || schoolMeta.name)}` + (id !== null ? `?review=${encodeURIComponent(String(id))}` : '');
  return {
    id, content, authorLabel, isAnonymous, isVerified, campus, createdAt,
    likes:Math.max(0, toInteger(row.like_count ?? row.likeCount ?? row.likes, 0)),
    replies:Math.max(0, toInteger(row.reply_count ?? row.replyCount ?? row.replies, 0)),
    isQuestion:Boolean(row.is_question ?? row.isQuestion), rating, sourceUrl
  };
}
function normalizeReviewId(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  if (Number.isSafeInteger(number) && number >= 0) return number;
  const text = String(value).trim();
  return /^[A-Za-z0-9_-]{1,80}$/.test(text) ? text : null;
}
function cleanReviewContent(value) {
  return decodeEntities(String(value || '')).replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n[ \t]+/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, MAX_REVIEW_CONTENT_LENGTH);
}
function cleanShortText(value, maxLength) {
  return decodeEntities(String(value || '')).replace(/<[^>]+>/g, ' ').replace(/[\u0000-\u001F\u007F]/g, '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}
function normalizeRating(value) {
  if (!isObject(value)) return null;
  const dimensions = {};
  let weightedTotal = 0;
  let usedWeight = 0;
  for (const dimension of REVIEW_DIMENSIONS) {
    const number = toNullableNumber(value[dimension.key]);
    if (number === null || number < 0 || number > 5) continue;
    dimensions[dimension.key] = number;
    weightedTotal += number * dimension.weight;
    usedWeight += dimension.weight;
  }
  if (!Object.keys(dimensions).length) return null;
  return { overall:usedWeight > 0 ? roundOne(weightedTotal / usedWeight) : null, dimensions };
}
function normalizeSourceDate(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  const chinaLocal = text.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})$/);
  if (chinaLocal) return `${chinaLocal[1]}T${chinaLocal[2]}+08:00`;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? text.slice(0, 40) : date.toISOString();
}
function reviewTimestamp(value) {
  const date = new Date(value || 0);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}
function decodeEntities(value) {
  const named = { '&nbsp;':' ', '&quot;':'"', '&#39;':"'", '&amp;':'&', '&lt;':'<', '&gt;':'>' };
  return String(value || '').replace(/&(nbsp|quot|amp|lt|gt);|&#39;/g, (match) => named[match] || match).replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code))).replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}
function normalizeSchoolMeta(detail, fallbackName, schoolId) {
  return { id:schoolId, name:normalizeSchool(detail.name || detail.school_name || fallbackName), slug:normalizeSchool(detail.slug || detail.name || fallbackName), type:normalizeSchool(detail.type || ''), province:normalizeSchool(detail.province || ''), city:normalizeSchool(detail.city || ''), rating:toNullableNumber(detail.rating), reviewCount:toNullableNumber(detail.review_count ?? detail.reviewCount), tags:normalizeSchool(detail.full_tags || detail.tags || '') };
}
function toNullableNumber(value) { if (value === null || value === undefined || value === '') return null; const number = Number(value); return Number.isFinite(number) ? number : null; }
function toInteger(value, fallback = 0) { const number = Number(value); return Number.isFinite(number) ? Math.trunc(number) : fallback; }
function clampInteger(value, min, max, fallback) { return Math.min(max, Math.max(min, toInteger(value, fallback))); }
function roundOne(value) { return Math.round(value * 10) / 10; }
function buildSourcePageUrl(detail, fallbackName) { return `${SOURCE_PAGE_ORIGIN}/school/${encodeURIComponent(normalizeSchool(detail?.slug || detail?.name || fallbackName))}`; }
function transportLabel(host, contentType) { return `${contentType} · ${host.includes('eo.') ? '来源公开 API（备用域）' : '来源公开 API（主域）'}`; }
function toDiagnostic(stage, host, result, extra = {}) { return { stage, host, status:result.status, contentType:result.contentType, length:result.length, parseError:result.parseError || '', ...extra }; }

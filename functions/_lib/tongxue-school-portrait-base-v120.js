import { buildSchoolPortrait, normalizeTags } from './tongxue-school-portrait-core.js';

const API_VERSION = 'v1.2.0';
const API_HOSTS = ['https://eo.srgaoxiao.com', 'https://srgaoxiao.com'];
const SOURCE_ORIGIN = 'https://srgaoxiao.com';
const TOTAL_REQUEST_BUDGET_MS = 10_000;
const PER_REQUEST_TIMEOUT_MS = 4_500;
const MAX_RESPONSE_BYTES = 2_000_000;
const PAGE_SIZE = 30;
const MAX_PAGES = 2;
const CACHE_TTL = 900;
const DIMENSION_KEYS = ['dormitory','cafeteria','faculty','environment','culture','employment','safety'];

export async function onRequest(context) {
  if (context.request.method !== 'GET') return json({ ok:false, error:'method_not_allowed', message:'只支持 GET 请求。', version:API_VERSION }, 405);
  const url = new URL(context.request.url);
  const school = normalizeSchool(url.searchParams.get('school'));
  const refresh = url.searchParams.get('refresh') === '1';
  if (!school) return json({ ok:false, error:'missing_school', message:'请输入学校名称。', version:API_VERSION }, 400);
  if (!isValidSchoolName(school)) return json({ ok:false, error:'invalid_school', message:'学校名称格式不正确。', version:API_VERSION }, 400);

  const cache = globalThis.caches?.default || null;
  const cacheRequest = buildCacheRequest(context.request, school);
  if (!refresh && cache) {
    const cached = await cache.match(cacheRequest);
    if (cached) return withHeaders(cached, { 'x-tongxue-portrait-cache':'HIT' });
  }

  const startedAt = Date.now();
  const deadline = startedAt + TOTAL_REQUEST_BUDGET_MS;
  const diagnostics = [];
  for (const host of API_HOSTS) {
    if (Date.now() >= deadline) break;
    const result = await fetchPortraitFromHost({ host, school, deadline, diagnostics });
    if (result.kind === 'success') {
      const payload = {
        ...buildSchoolPortrait({
          schoolMeta: result.schoolMeta,
          reviews: result.reviews,
          source: result.source,
          fetchedAt: new Date().toISOString(),
          partial: result.partial
        }),
        version: API_VERSION,
        diagnostics: result.partial ? diagnostics : undefined
      };
      const response = json(payload, 200, {
        ttl:CACHE_TTL,
        cacheStatus:refresh ? 'REFRESH' : 'MISS',
        serverTiming:`total;dur=${Date.now()-startedAt}`
      });
      await putCache(context, cache, cacheRequest, response);
      return response;
    }
    if (result.kind !== 'not_found' && result.kind !== 'unavailable') break;
  }

  const detailDiagnostics = diagnostics.filter((item) => item.stage === 'school-detail');
  const allNotFound = detailDiagnostics.length === API_HOSTS.length && detailDiagnostics.every((item) => item.status === 404);
  return json({
    ok:false,
    error:allNotFound ? 'school_not_found' : 'portrait_unavailable',
    message:allNotFound ? '来源站没有找到这个学校。' : '学校体验画像暂时没有加载完成。',
    school,
    version:API_VERSION,
    diagnostics
  }, allNotFound ? 404 : 502, { cacheStatus:refresh ? 'REFRESH' : 'MISS', serverTiming:`total;dur=${Date.now()-startedAt}` });
}

async function fetchPortraitFromHost({ host, school, deadline, diagnostics }) {
  const detailResult = await fetchJson(`${host}/api/schools/${encodeURIComponent(school)}`, host, deadline);
  diagnostics.push(toDiagnostic('school-detail', host, detailResult));
  if (detailResult.status === 404) return { kind:'not_found' };
  if (!detailResult.ok || !isObject(detailResult.data)) return { kind:'unavailable' };
  const detail = unwrap(detailResult.data);
  const schoolId = pickSchoolId(detail);
  if (schoolId === null) return { kind:'unavailable' };
  const schoolMeta = normalizeSchoolMeta(detail, school, schoolId);
  const source = { name:'srgaoxiao.com', url:`${SOURCE_ORIGIN}/school/${encodeURIComponent(schoolMeta.slug || schoolMeta.name)}` };

  let reviews = [];
  let partial = false;
  let expectedTotal = Math.max(0, toInteger(schoolMeta.reviewCount, 0));
  for (let page = 1; page <= MAX_PAGES && Date.now() < deadline; page += 1) {
    const result = await fetchJson(`${host}/api/reviews/school/${encodeURIComponent(String(schoolId))}?sort=time&page=${page}&pageSize=${PAGE_SIZE}`, host, deadline);
    diagnostics.push(toDiagnostic('reviews', host, result, { page, pageSize:PAGE_SIZE }));
    if (!result.ok || !isObject(result.data)) {
      if (page === 1) return { kind:'unavailable' };
      partial = true;
      break;
    }
    const pageData = normalizeReviewPage(result.data, schoolMeta);
    reviews.push(...pageData.reviews);
    expectedTotal = Math.max(expectedTotal, pageData.total);
    if (!pageData.hasMore || !pageData.reviews.length || reviews.length >= expectedTotal) break;
  }
  reviews = dedupe(reviews);
  if (expectedTotal > reviews.length && reviews.length >= PAGE_SIZE * MAX_PAGES) partial = true;
  return { kind:'success', schoolMeta, source, reviews, partial };
}

function normalizeReviewPage(payload, schoolMeta) {
  const container = isObject(payload?.data) && Array.isArray(payload.data.data) ? payload.data : unwrap(payload);
  const rows = Array.isArray(container?.data) ? container.data : Array.isArray(container?.reviews) ? container.reviews : [];
  const reviews = rows.map((row) => normalizeReview(row, schoolMeta)).filter(Boolean);
  const page = Math.max(1, toInteger(container?.page, 1));
  const pageSize = Math.max(1, toInteger(container?.pageSize ?? container?.page_size, PAGE_SIZE));
  const total = Math.max(reviews.length, toInteger(container?.total, reviews.length));
  const totalPages = Math.max(1, toInteger(container?.totalPages ?? container?.total_pages, Math.ceil(total / pageSize)));
  return { reviews, total, hasMore:page < totalPages || page * pageSize < total };
}

function normalizeReview(row, schoolMeta) {
  if (!isObject(row)) return null;
  const content = cleanText(row.content ?? row.text ?? row.body ?? '', 4000);
  if (content.length < 2) return null;
  const id = normalizeId(row.id ?? row.review_id ?? row.reviewId);
  return {
    id,
    content,
    isAnonymous:Boolean(row.isAnonymous ?? row.is_anonymous),
    isVerified:Boolean(row.isVerified ?? row.is_verified),
    campus:cleanText(row.campus_name ?? row.campusName ?? '', 80),
    createdAt:normalizeDate(row.created_at ?? row.createdAt ?? row.updated_at ?? row.updatedAt),
    likes:Math.max(0, toInteger(row.like_count ?? row.likeCount ?? row.likes, 0)),
    replies:Math.max(0, toInteger(row.reply_count ?? row.replyCount ?? row.replies, 0)),
    isQuestion:Boolean(row.is_question ?? row.isQuestion),
    rating:normalizeRating(row.rating),
    sourceUrl:`${SOURCE_ORIGIN}/school/${encodeURIComponent(schoolMeta.slug || schoolMeta.name)}` + (id !== null ? `?review=${encodeURIComponent(String(id))}` : '')
  };
}

function normalizeRating(value) {
  if (!isObject(value)) return null;
  const dimensions = {};
  for (const key of DIMENSION_KEYS) {
    const number = Number(value[key]);
    if (Number.isFinite(number) && number >= 0 && number <= 5) dimensions[key] = number;
  }
  return Object.keys(dimensions).length ? { dimensions } : null;
}

async function fetchJson(url, refererOrigin, deadline) {
  const remaining = deadline - Date.now();
  if (remaining <= 0) return { ok:false, status:0, parseError:'total_timeout', data:null, length:0, contentType:'' };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(1, Math.min(PER_REQUEST_TIMEOUT_MS, remaining)));
  try {
    const response = await fetch(url, { signal:controller.signal, redirect:'follow', headers:{ accept:'application/json,text/plain,*/*', 'accept-language':'zh-CN,zh;q=0.9', referer:`${refererOrigin}/` } });
    const declaredLength = Number(response.headers.get('content-length') || 0);
    if (declaredLength > MAX_RESPONSE_BYTES) return { ok:false, status:response.status, parseError:'response_too_large', data:null, length:declaredLength, contentType:response.headers.get('content-type') || '' };
    const raw = (await response.text()).slice(0, MAX_RESPONSE_BYTES);
    let data = null;
    let parseError = '';
    try { data = JSON.parse(raw); } catch (error) { parseError = error instanceof Error ? error.message : String(error); }
    return { ok:response.ok && data !== null, status:response.status, parseError, data, length:raw.length, contentType:response.headers.get('content-type') || '' };
  } catch (error) {
    return { ok:false, status:0, parseError:error instanceof Error ? error.message : String(error), data:null, length:0, contentType:'' };
  } finally { clearTimeout(timeout); }
}

function normalizeSchoolMeta(detail, fallbackName, id) {
  return {
    id,
    name:normalizeSchool(detail.name || detail.school_name || fallbackName),
    slug:normalizeSchool(detail.slug || detail.name || fallbackName),
    type:normalizeSchool(detail.type || ''),
    province:normalizeSchool(detail.province || ''),
    city:normalizeSchool(detail.city || ''),
    reviewCount:toNullableNumber(detail.review_count ?? detail.reviewCount),
    tags:normalizeTags(detail.full_tags ?? detail.tags ?? [])
  };
}

function dedupe(reviews) {
  const seen = new Set();
  return reviews.filter((review) => {
    const key = review.id !== null ? `id:${review.id}` : `content:${review.content.replace(/\s+/g,'').slice(0,500)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeId(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  if (Number.isSafeInteger(number) && number >= 0) return number;
  const text = String(value).trim();
  return /^[A-Za-z0-9_-]{1,80}$/.test(text) ? text : null;
}

function normalizeDate(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  const local = text.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})$/);
  if (local) return `${local[1]}T${local[2]}+08:00`;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? text.slice(0,40) : date.toISOString();
}

function cleanText(value, maxLength) {
  return decodeEntities(String(value || '')).replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]+>/g,' ').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,'').replace(/\r\n?/g,'\n').replace(/[ \t]+/g,' ').replace(/\n[ \t]+/g,'\n').replace(/\n{3,}/g,'\n\n').trim().slice(0,maxLength);
}

function decodeEntities(value) {
  const named = { '&nbsp;':' ', '&quot;':'"', '&#39;':"'", '&amp;':'&', '&lt;':'<', '&gt;':'>' };
  return String(value).replace(/&(nbsp|quot|amp|lt|gt);|&#39;/g, (match) => named[match] || match).replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code))).replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCodePoint(parseInt(code,16)));
}

function buildCacheRequest(request, school) {
  const url = new URL(request.url);
  url.search = '';
  url.searchParams.set('school', school);
  return new Request(url.toString(), { method:'GET', headers:{ accept:'application/json' } });
}

async function putCache(context, cache, key, response) {
  if (!cache || response.status !== 200) return;
  const op = cache.put(key, response.clone());
  if (typeof context.waitUntil === 'function') context.waitUntil(op); else await op;
}

function json(payload, status = 200, options = {}) {
  const ttl = Math.max(0, Number(options.ttl || 0));
  const headers = new Headers({
    'content-type':'application/json; charset=utf-8',
    'x-tongxue-portrait-version':API_VERSION,
    'x-tongxue-portrait-cache':String(options.cacheStatus || 'BYPASS'),
    'cache-control':ttl ? `public, max-age=0, s-maxage=${ttl}, stale-while-revalidate=${ttl*4}` : 'no-store, max-age=0'
  });
  if (options.serverTiming) headers.set('server-timing', options.serverTiming);
  return new Response(JSON.stringify(payload), { status, headers });
}

function withHeaders(response, additions) {
  const headers = new Headers(response.headers);
  for (const [key,value] of Object.entries(additions)) headers.set(key,value);
  return new Response(response.body, { status:response.status, statusText:response.statusText, headers });
}

function toDiagnostic(stage, host, result, extra = {}) { return { stage, host, status:result.status, contentType:result.contentType, length:result.length, parseError:result.parseError || '', ...extra }; }
function normalizeSchool(value) { return String(value || '').replace(/\s+/g,' ').trim(); }
function isValidSchoolName(value) { return value.length <= 40 && !/[\/?#@:&=<>]/.test(value); }
function isObject(value) { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function unwrap(payload) { return isObject(payload?.data) ? payload.data : payload; }
function pickSchoolId(detail) { const value = [detail?.id,detail?.school_id,detail?.schoolId,detail?.school?.id].find((item) => item !== undefined && item !== null && String(item).trim()); return value === undefined ? null : value; }
function toInteger(value, fallback=0) { const number = Number(value); return Number.isFinite(number) ? Math.trunc(number) : fallback; }
function toNullableNumber(value) { if (value === null || value === undefined || value === '') return null; const number = Number(value); return Number.isFinite(number) ? number : null; }

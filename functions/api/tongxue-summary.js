const API_VERSION = 'v1.1.0';
const SOURCE_PAGE_ORIGIN = 'https://srgaoxiao.com';
const API_HOSTS = ['https://eo.srgaoxiao.com', 'https://srgaoxiao.com'];
const REQUEST_TIMEOUT_MS = 12_000;
const MAX_RESPONSE_BYTES = 2_000_000;
const REVIEW_PAGE_SIZE = 6;
const MAX_REVIEW_PAGE = 50;
const MAX_REVIEW_CONTENT_LENGTH = 4_000;

const REVIEW_DIMENSIONS = [
  { key: 'dormitory', label: '宿舍', weight: 0.2 },
  { key: 'cafeteria', label: '食堂', weight: 0.1 },
  { key: 'faculty', label: '师资', weight: 0.1 },
  { key: 'environment', label: '环境', weight: 0.1 },
  { key: 'culture', label: '氛围', weight: 0.2 },
  { key: 'employment', label: '就业', weight: 0.2 },
  { key: 'safety', label: '安全', weight: 0.1 }
];

export async function onRequest(context) {
  if (context.request.method !== 'GET') {
    return json({
      ok: false,
      error: 'method_not_allowed',
      message: '只支持 GET 请求。',
      version: API_VERSION
    }, 405);
  }

  const requestUrl = new URL(context.request.url);
  const schoolInput = normalizeSchool(requestUrl.searchParams.get('school'));
  const reviewPage = clampInteger(requestUrl.searchParams.get('page'), 1, MAX_REVIEW_PAGE, 1);

  if (!schoolInput) {
    return json({
      ok: false,
      error: 'missing_school',
      message: '请输入学校名称。',
      version: API_VERSION
    }, 400);
  }

  if (!isValidSchoolName(schoolInput)) {
    return json({
      ok: false,
      error: 'invalid_school',
      message: '学校名称格式不正确。',
      version: API_VERSION
    }, 400);
  }

  const diagnostics = [];
  const summaryNullCandidates = [];
  let matchedSchool = null;
  let matchedHost = '';
  let detailNotFoundCount = 0;
  let detailSuccessCount = 0;
  let summaryRequestFailed = false;

  // 第一阶段只判断 AI 摘要。任一公开域存在摘要时，摘要优先于评论回退。
  for (const host of API_HOSTS) {
    const detailUrl = `${host}/api/schools/${encodeURIComponent(schoolInput)}`;
    const detailResult = await fetchJson(detailUrl, host);

    diagnostics.push(toDiagnostic('school-detail', host, detailResult));

    if (detailResult.status === 404) {
      detailNotFoundCount += 1;
      continue;
    }
    if (!detailResult.ok || !isObject(detailResult.data)) continue;

    const detail = unwrapData(detailResult.data);
    const schoolId = pickSchoolId(detail);
    if (schoolId === null) continue;

    detailSuccessCount += 1;
    const schoolMeta = normalizeSchoolMeta(detail, schoolInput, schoolId);
    matchedSchool = matchedSchool || schoolMeta;
    matchedHost = matchedHost || host;

    const summaryUrl = `${host}/api/schools/${encodeURIComponent(String(schoolId))}/ai-summary`;
    const summaryResult = await fetchJson(summaryUrl, host);

    diagnostics.push(toDiagnostic('ai-summary', host, summaryResult, { schoolId }));

    if (!summaryResult.ok || !isObject(summaryResult.data)) {
      summaryRequestFailed = true;
      continue;
    }

    const summaryPayload = unwrapData(summaryResult.data);
    const summary = pickSummary(summaryPayload);

    if (summary) {
      const canonicalName = schoolMeta.name || schoolInput;
      return json({
        ok: true,
        mode: 'ai_summary',
        school: canonicalName,
        summary,
        reviews: [],
        reviewPagination: null,
        schoolMeta,
        source: {
          name: 'srgaoxiao.com',
          url: buildSourcePageUrl(detail, canonicalName)
        },
        fetchedAt: new Date().toISOString(),
        transport: transportLabel(host, 'AI 摘要'),
        version: API_VERSION
      });
    }

    if (hasKnownSummaryField(summaryPayload)) {
      summaryNullCandidates.push({ host, detail, schoolMeta, schoolId });
    }
  }

  // 第二阶段仅在来源明确返回 summary:null 时，读取学校页正在使用的“最新”评论接口。
  if (summaryNullCandidates.length) {
    let reviewEmptySeen = false;
    let reviewRequestFailed = false;
    let emptyPagination = null;
    let fallbackCandidate = summaryNullCandidates[0];

    for (const candidate of summaryNullCandidates) {
      fallbackCandidate = candidate;
      const reviewUrl = `${candidate.host}/api/reviews/school/${encodeURIComponent(String(candidate.schoolId))}`
        + `?sort=time&page=${reviewPage}&pageSize=${REVIEW_PAGE_SIZE}`;
      const reviewResult = await fetchJson(reviewUrl, candidate.host);

      diagnostics.push(toDiagnostic('recent-reviews', candidate.host, reviewResult, {
        schoolId: candidate.schoolId,
        page: reviewPage,
        pageSize: REVIEW_PAGE_SIZE
      }));

      if (!reviewResult.ok || !isObject(reviewResult.data)) {
        reviewRequestFailed = true;
        continue;
      }

      const normalized = normalizeReviewPage(reviewResult.data, candidate.schoolMeta);
      emptyPagination = normalized.pagination;

      if (normalized.reviews.length) {
        const canonicalName = candidate.schoolMeta.name || schoolInput;
        return json({
          ok: true,
          mode: 'recent_reviews',
          school: canonicalName,
          summary: null,
          reviews: normalized.reviews,
          reviewPagination: normalized.pagination,
          schoolMeta: candidate.schoolMeta,
          source: {
            name: 'srgaoxiao.com',
            url: buildSourcePageUrl(candidate.detail, canonicalName)
          },
          fetchedAt: new Date().toISOString(),
          transport: transportLabel(candidate.host, '近期评论'),
          version: API_VERSION
        });
      }

      reviewEmptySeen = true;
    }

    const canonicalName = fallbackCandidate.schoolMeta.name || schoolInput;
    const basePayload = {
      school: canonicalName,
      summary: null,
      reviews: [],
      reviewPagination: emptyPagination || {
        page: reviewPage,
        pageSize: REVIEW_PAGE_SIZE,
        total: 0,
        totalPages: 0,
        hasMore: false
      },
      schoolMeta: fallbackCandidate.schoolMeta,
      source: {
        name: 'srgaoxiao.com',
        url: buildSourcePageUrl(fallbackCandidate.detail, canonicalName)
      },
      fetchedAt: new Date().toISOString(),
      version: API_VERSION,
      diagnostics
    };

    if (reviewEmptySeen) {
      return json({
        ok: true,
        mode: 'no_content',
        message: '学校已找到，但来源站目前既没有 AI 摘要，也没有可展示的公开评论。',
        transport: transportLabel(fallbackCandidate.host, '内容状态'),
        ...basePayload
      });
    }

    if (reviewRequestFailed) {
      return json({
        ok: false,
        mode: 'reviews_unavailable',
        error: 'reviews_api_unavailable',
        message: '学校已找到且 AI 摘要为空，但来源站近期评论接口本次没有返回有效 JSON。',
        transport: transportLabel(fallbackCandidate.host, '评论接口'),
        ...basePayload
      }, 502);
    }
  }

  if (matchedSchool && summaryRequestFailed) {
    return json({
      ok: false,
      mode: 'summary_unavailable',
      error: 'summary_api_unavailable',
      message: '学校详情已找到，但来源站 AI 摘要接口本次没有返回有效 JSON。',
      school: matchedSchool.name || schoolInput,
      schoolMeta: matchedSchool,
      source: {
        name: 'srgaoxiao.com',
        url: buildSourcePageUrl(matchedSchool, matchedSchool.name || schoolInput)
      },
      version: API_VERSION,
      diagnostics
    }, 502);
  }

  if (detailNotFoundCount === API_HOSTS.length) {
    return json({
      ok: false,
      mode: 'school_not_found',
      error: 'school_not_found',
      message: '来源站没有找到这个学校，请输入学校正式全名。',
      school: schoolInput,
      version: API_VERSION,
      diagnostics
    }, 404);
  }

  return json({
    ok: false,
    mode: 'source_unavailable',
    error: detailSuccessCount > 0 ? 'summary_not_recognized' : 'source_api_unavailable',
    message: detailSuccessCount > 0
      ? '学校详情已找到，但来源摘要响应结构与预期不一致。'
      : '来源站学校接口暂时没有返回有效 JSON。',
    school: matchedSchool?.name || schoolInput,
    schoolMeta: matchedSchool,
    source: matchedSchool ? {
      name: 'srgaoxiao.com',
      url: buildSourcePageUrl(matchedSchool, matchedSchool.name || schoolInput)
    } : undefined,
    transport: matchedHost ? transportLabel(matchedHost, '来源接口') : '',
    version: API_VERSION,
    diagnostics
  }, 502);
}

async function fetchJson(url, refererOrigin) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        accept: 'application/json,text/plain,*/*',
        'accept-language': 'zh-CN,zh;q=0.9',
        'cache-control': 'no-cache',
        referer: `${refererOrigin}/`
      }
    });

    const declaredLength = Number(response.headers.get('content-length') || 0);
    if (declaredLength > MAX_RESPONSE_BYTES) {
      return {
        ok: false,
        status: response.status,
        contentType: response.headers.get('content-type') || '',
        length: declaredLength,
        parseError: 'response_too_large',
        data: null
      };
    }

    const raw = (await response.text()).slice(0, MAX_RESPONSE_BYTES);
    let data = null;
    let parseError = '';

    try {
      data = JSON.parse(raw);
    } catch (error) {
      parseError = error instanceof Error ? error.message : String(error);
    }

    return {
      ok: response.ok && data !== null,
      status: response.status,
      contentType: response.headers.get('content-type') || '',
      length: raw.length,
      parseError,
      data
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      contentType: '',
      length: 0,
      parseError: error instanceof Error ? error.message : String(error),
      data: null
    };
  } finally {
    clearTimeout(timeout);
  }
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store, max-age=0',
      'x-tongxue-version': API_VERSION
    }
  });
}

function normalizeSchool(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function isValidSchoolName(value) {
  return value.length <= 40 && !/[\/?#@:&=<>]/.test(value);
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function unwrapData(payload) {
  if (isObject(payload?.data)) return payload.data;
  return payload;
}

function pickSchoolId(detail) {
  if (!isObject(detail)) return null;
  const candidates = [detail.id, detail.school_id, detail.schoolId, detail.school?.id];
  const value = candidates.find((item) => item !== undefined && item !== null && String(item).trim());
  return value === undefined ? null : value;
}

function pickSummary(payload) {
  if (typeof payload === 'string') return cleanSummary(payload);
  if (!isObject(payload)) return '';

  const candidates = [
    payload.summary,
    payload.aiSummary,
    payload.ai_summary,
    payload.summaryText,
    payload.aiSummaryText
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const cleaned = cleanSummary(candidate);
    if (cleaned) return cleaned;
  }
  return '';
}

function hasKnownSummaryField(payload) {
  if (!isObject(payload)) return false;
  return ['summary', 'aiSummary', 'ai_summary', 'summaryText', 'aiSummaryText']
    .some((key) => Object.prototype.hasOwnProperty.call(payload, key));
}

function cleanSummary(value) {
  const text = String(value || '')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*([，。！？；：、])\s*/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (text.length < 20 || text.length > 5000) return '';
  return text;
}

function normalizeReviewPage(payload, schoolMeta) {
  const container = isObject(payload?.data) && Array.isArray(payload.data.data)
    ? payload.data
    : payload;
  const rows = Array.isArray(container?.data)
    ? container.data
    : Array.isArray(container?.reviews)
      ? container.reviews
      : [];

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

  return {
    reviews: reviews.slice(0, REVIEW_PAGE_SIZE),
    pagination: {
      page,
      pageSize: REVIEW_PAGE_SIZE,
      total,
      totalPages,
      hasMore: totalPages > page
    }
  };
}

function normalizeReview(row, schoolMeta) {
  if (!isObject(row)) return null;

  const content = cleanReviewContent(row.content ?? row.text ?? row.body ?? '');
  if (content.length < 2) return null;

  const isAnonymous = Boolean(row.isAnonymous ?? row.is_anonymous);
  const isVerified = Boolean(row.isVerified ?? row.is_verified);
  const id = normalizeReviewId(row.id ?? row.review_id ?? row.reviewId);
  const authorLabel = cleanShortText(
    isAnonymous
      ? row.display_name || row.displayName || row.nickname || '匿名同学'
      : row.nickname || row.display_name || row.displayName || '同学',
    40
  ) || (isAnonymous ? '匿名同学' : '同学');
  const campus = cleanShortText(row.campus_name ?? row.campusName ?? '', 80);
  const createdAt = normalizeSourceDate(row.created_at ?? row.createdAt ?? row.updated_at ?? row.updatedAt);
  const rating = normalizeRating(row.rating);
  const sourceUrl = `${SOURCE_PAGE_ORIGIN}/school/${encodeURIComponent(schoolMeta.slug || schoolMeta.name)}`
    + (id !== null ? `?review=${encodeURIComponent(String(id))}` : '');

  return {
    id,
    content,
    authorLabel,
    isAnonymous,
    isVerified,
    campus,
    createdAt,
    likes: Math.max(0, toInteger(row.like_count ?? row.likeCount ?? row.likes, 0)),
    replies: Math.max(0, toInteger(row.reply_count ?? row.replyCount ?? row.replies, 0)),
    isQuestion: Boolean(row.is_question ?? row.isQuestion),
    rating,
    sourceUrl
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
  return decodeEntities(String(value || ''))
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_REVIEW_CONTENT_LENGTH);
}

function cleanShortText(value, maxLength) {
  return decodeEntities(String(value || ''))
    .replace(/<[^>]+>/g, ' ')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
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

  return {
    overall: usedWeight > 0 ? roundOne(weightedTotal / usedWeight) : null,
    dimensions
  };
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
  const named = {
    '&nbsp;': ' ',
    '&quot;': '"',
    '&#39;': "'",
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>'
  };
  return String(value || '')
    .replace(/&(nbsp|quot|amp|lt|gt);|&#39;/g, (match) => named[match] || match)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

function normalizeSchoolMeta(detail, fallbackName, schoolId) {
  return {
    id: schoolId,
    name: normalizeSchool(detail.name || detail.school_name || fallbackName),
    slug: normalizeSchool(detail.slug || detail.name || fallbackName),
    type: normalizeSchool(detail.type || ''),
    province: normalizeSchool(detail.province || ''),
    city: normalizeSchool(detail.city || ''),
    rating: toNullableNumber(detail.rating),
    reviewCount: toNullableNumber(detail.review_count ?? detail.reviewCount),
    tags: normalizeSchool(detail.full_tags || detail.tags || '')
  };
}

function toNullableNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function toInteger(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : fallback;
}

function clampInteger(value, min, max, fallback) {
  const number = toInteger(value, fallback);
  return Math.min(max, Math.max(min, number));
}

function roundOne(value) {
  return Math.round(value * 10) / 10;
}

function buildSourcePageUrl(detail, fallbackName) {
  const slug = normalizeSchool(detail?.slug || detail?.name || fallbackName);
  return `${SOURCE_PAGE_ORIGIN}/school/${encodeURIComponent(slug)}`;
}

function transportLabel(host, contentType) {
  return `${contentType} · ${host.includes('eo.') ? '来源公开 API（备用域）' : '来源公开 API（主域）'}`;
}

function toDiagnostic(stage, host, result, extra = {}) {
  return {
    stage,
    host,
    status: result.status,
    contentType: result.contentType,
    length: result.length,
    parseError: result.parseError || '',
    ...extra
  };
}

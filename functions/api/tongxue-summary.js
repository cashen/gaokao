const API_VERSION = 'v1.0.8';
const SOURCE_PAGE_ORIGIN = 'https://srgaoxiao.com';
const API_HOSTS = ['https://eo.srgaoxiao.com', 'https://srgaoxiao.com'];
const REQUEST_TIMEOUT_MS = 12_000;
const MAX_RESPONSE_BYTES = 2_000_000;

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
  let matchedSchool = null;
  let matchedHost = '';
  let summaryNullSeen = false;
  let detailNotFoundCount = 0;
  let detailSuccessCount = 0;
  let summaryRequestFailed = false;

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
    matchedSchool = normalizeSchoolMeta(detail, schoolInput, schoolId);
    matchedHost = host;

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
      const canonicalName = matchedSchool.name || schoolInput;
      return json({
        ok: true,
        school: canonicalName,
        summary,
        schoolMeta: matchedSchool,
        source: {
          name: 'srgaoxiao.com',
          url: buildSourcePageUrl(detail, canonicalName)
        },
        fetchedAt: new Date().toISOString(),
        transport: host.includes('eo.') ? '来源公开 API（备用域）' : '来源公开 API（主域）',
        version: API_VERSION
      });
    }

    if (Object.prototype.hasOwnProperty.call(summaryPayload, 'summary') && summaryPayload.summary == null) {
      summaryNullSeen = true;
    } else if (hasKnownSummaryField(summaryPayload)) {
      summaryNullSeen = true;
    }
  }

  if (matchedSchool && summaryNullSeen) {
    return json({
      ok: false,
      error: 'summary_not_available',
      message: '学校已找到，但来源站 AI 摘要接口当前返回空值（summary: null）。',
      school: matchedSchool.name || schoolInput,
      schoolMeta: matchedSchool,
      source: {
        name: 'srgaoxiao.com',
        url: buildSourcePageUrl(matchedSchool, matchedSchool.name || schoolInput)
      },
      fetchedAt: new Date().toISOString(),
      transport: matchedHost.includes('eo.') ? '来源公开 API（备用域）' : '来源公开 API（主域）',
      version: API_VERSION,
      diagnostics
    }, 404);
  }

  if (matchedSchool && summaryRequestFailed) {
    return json({
      ok: false,
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
      error: 'school_not_found',
      message: '来源站没有找到这个学校，请输入学校正式全名。',
      school: schoolInput,
      version: API_VERSION,
      diagnostics
    }, 404);
  }

  return json({
    ok: false,
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

function buildSourcePageUrl(detail, fallbackName) {
  const slug = normalizeSchool(detail?.slug || detail?.name || fallbackName);
  return `${SOURCE_PAGE_ORIGIN}/school/${encodeURIComponent(slug)}`;
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

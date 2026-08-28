function firstChars(text, len = 220) {
  return String(text || '').replace(/\s+/g, ' ').slice(0, len);
}

function looksLikeHtml(text) {
  const s = String(text || '').trim().toLowerCase();
  return s.startsWith('<!doctype html') || s.startsWith('<html') || s.includes('<html');
}

export class ApiClientError extends Error {
  constructor(message, detail = {}) {
    super(message);
    this.name = 'ApiClientError';
    this.type = detail.type || 'api_error';
    this.status = detail.status || 0;
    this.url = detail.url || '';
    this.bodyStart = detail.bodyStart || '';
    this.userMessage = detail.userMessage || message;
    this.engineerHint = detail.engineerHint || '';
    this.apiMessage = detail.apiMessage || '';
  }
}

export function isApiClientError(error) {
  return error && error.name === 'ApiClientError';
}

function defaultUserMessage(status) {
  if (status === 503) return '专业数据暂时没有读取成功。可以稍后重试。';
  if (status === 404) return '专业数据接口暂时不可用。可以稍后重试。';
  return '数据暂时没有读取成功。可以稍后重试。';
}

export function formatApiErrorForHuman(error, fallback = '数据暂时没有读取成功。可以稍后重试。') {
  if (isApiClientError(error)) return error.userMessage || fallback;
  return error?.message || fallback;
}

export function formatApiErrorForEngineer(error) {
  if (!isApiClientError(error)) return error?.message || String(error || '未知错误');
  const parts = [];
  if (error.type) parts.push(`类型：${error.type}`);
  if (error.status) parts.push(`HTTP：${error.status}`);
  if (error.url) parts.push(`接口：${error.url}`);
  if (error.engineerHint) parts.push(error.engineerHint);
  if (error.bodyStart) parts.push(`返回开头：${error.bodyStart}`);
  return parts.join('｜');
}

export async function fetchApiJson(url, options = {}) {
  let response;
  const userMessageForNetwork = options.userMessage || '专业数据暂时没有读取成功。可以稍后重试，或先切回全部院校再试。';
  try {
    response = await fetch(url, {
      cache: 'no-store',
      headers: { accept: 'application/json', ...(options.headers || {}) },
      ...options.fetchOptions
    });
  } catch (error) {
    throw new ApiClientError(userMessageForNetwork, {
      type: 'network_fetch_failed',
      status: 0,
      url,
      userMessage: userMessageForNetwork,
      apiMessage: error?.message || String(error || ''),
      engineerHint: `浏览器没有拿到接口 JSON 响应：${error?.message || String(error || 'Failed to fetch')}。请先测 /api/ln-rank-runtime-health 和 /api/major-bands-health?probe=1；如果 health 正常，重点检查 /api/major-bands 低分段查询是否超时或被平台中断。`
    });
  }
  const raw = await response.text();
  const bodyStart = firstChars(raw);
  const userMessage = options.userMessage || defaultUserMessage(response.status);
  if (looksLikeHtml(raw)) {
    throw new ApiClientError(userMessage, {
      type: 'html_response',
      status: response.status,
      url,
      bodyStart,
      userMessage,
      engineerHint: '接口返回了 HTML，不是 JSON。请先打开 /api/ln-rank-runtime-health 和 /api/major-bands-health；如果 health 也返回 HTML/503，优先检查 Cloudflare Pages 是否把 functions 目录部署在项目根目录。'
    });
  }
  let data;
  try {
    data = JSON.parse(raw || '{}');
  } catch (error) {
    throw new ApiClientError(userMessage, {
      type: 'json_parse_error',
      status: response.status,
      url,
      bodyStart,
      userMessage,
      engineerHint: '接口响应不是可解析 JSON。请检查函数是否返回 Response(JSON.stringify(...))，以及数据源是否把错误页透传到接口。'
    });
  }
  if (!response.ok || data?.ok === false) {
    throw new ApiClientError(options.apiUserMessage || data?.userMessage || data?.message || userMessage, {
      type: response.ok ? 'api_error' : 'http_error',
      status: response.status,
      url,
      bodyStart,
      userMessage: options.apiUserMessage || data?.userMessage || data?.message || userMessage,
      apiMessage: data?.message || '',
      engineerHint: data?.hint || data?.engineerHint || '接口返回业务错误。请查看 JSON 中的 message/hint，并用 runtime health 先判断是 Functions 层、数据源层还是接口逻辑层。'
    });
  }
  return data;
}

export function apiErrorDiagnosticHtml(error, escapeHtml) {
  const esc = typeof escapeHtml === 'function' ? escapeHtml : (v) => String(v == null ? '' : v);
  if (!isApiClientError(error)) return '';
  const hint = formatApiErrorForEngineer(error);
  return `<details class="api-diagnostic-note"><summary>查看诊断信息</summary><div><b>工程诊断：</b>${esc(hint)}<br><span>先测 /api/ln-rank-runtime-health，再测 /api/major-bands-health?probe=1。若 health 也返回 HTML/503，优先检查 Cloudflare Pages Functions 部署位置。</span></div></details>`;
}

export const safeFetchJson = fetchApiJson;
